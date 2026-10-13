import type { Href } from 'expo-router';

import type { ChargeRow } from '@/api/charges';
import type { BillRow, LedgerEntry, SubscriptionRow } from '@/api/queries';
import { countsInSpending } from '@/lib/bill-spending';
import {
  billWindow,
  chargePlanKey,
  dayAfter,
  occurrencesInRange,
  planFloor,
  planKey,
  type Recurrence,
} from '@/lib/card-ledger';
import { cycleStart } from '@/lib/charges';
import { billPageHref, isLoanBill } from '@/lib/ledger-link';
import { logoDomainOf } from '@/lib/logo-domain';
import { fromCents, toCents } from '@/lib/money';
import { billStopped } from '@/lib/plan-stop';

/**
 * One month of bills or subscriptions, as the Monthly bills and Subscriptions pages show it: what is
 * due in the picked month (each plan's real dates in it), what of that is paid, and what is still to
 * come. Pure: dates are yyyy-mm-dd strings compared as strings, day counts are Date.UTC differences,
 * so no timezone or DST shift can move a day. Money is summed in whole cents.
 *
 * A date on or before today is paid: the recorders write a due on its own day, and loans count
 * today's instalment as made.
 */

export type PlanKind = 'bill' | 'subscription';

/** '2026-10-12' → '2026-10'. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

function utcDay(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function isoOf(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return isoOf(Date.UTC(year, month - 1, day + days));
}

/** The first and last day of a month: '2026-02' → 2026-02-01..2026-02-28 (29 in a leap year). */
export function monthBounds(month: string): { from: string; to: string } {
  const [year, number] = month.split('-').map(Number);
  return {
    from: isoOf(Date.UTC(year, number - 1, 1)),
    to: isoOf(Date.UTC(year, number, 0)),
  };
}

/** Months counted from year 0, so stepping is integer arithmetic. */
function monthIndex(month: string): number {
  const [year, number] = month.split('-').map(Number);
  return year * 12 + (number - 1);
}

function monthAt(index: number): string {
  const year = Math.floor(index / 12);
  return `${String(year).padStart(4, '0')}-${String(index - year * 12 + 1).padStart(2, '0')}`;
}

export function addMonths(month: string, n: number): string {
  return monthAt(monthIndex(month) + n);
}

/** The months the picker offers, newest first: `ahead` months past today's back to the floor's. */
export function monthChoices(today: string, floor: string, ahead = 12): string[] {
  const current = monthIndex(today);
  const first = Math.min(monthIndex(floor), current);
  const months: string[] = [];
  // A malformed date gives NaN, which ends the loop before it starts.
  for (let index = current + ahead; index >= first; index -= 1) months.push(monthAt(index));
  return months;
}

/** Whole days from today to a date; negative once it has passed. Midnight UTC on both: DST-proof. */
export function daysUntil(date: string, today: string): number {
  return Math.round((utcDay(date) - utcDay(today)) / 86_400_000);
}

/** How far ahead a plan's next date is looked for: a yearly one is always inside it. */
const LOOK_AHEAD_DAYS = 400;

export type PlanSchedule = {
  /** The stored next date the schedule is walked from (`next_due_on` / `next_renewal_on`). */
  anchor: string | null;
  recurrence: Recurrence;
  /** The day of the month it keeps (`anchor_day`); none is the stored date's own day. */
  anchorDay?: number | null;
  startsOn?: string | null;
  createdAt?: string | null;
  endsOn?: string | null;
};

/**
 * The first date after today that a plan is due on, inside its running window (`billWindow`, the
 * ledger's own), or null. The ledger projects from the same day after today, so the two agree.
 */
export function nextDueAfter(plan: PlanSchedule, today: string): string | null {
  if (!plan.anchor) return null;
  const window = billWindow(
    { starts_on: plan.startsOn, ends_on: plan.endsOn, created_at: plan.createdAt },
    dayAfter(today),
    addDays(today, LOOK_AHEAD_DAYS),
  );
  if (window.from && window.from > window.to) return null;
  const dates = occurrencesInRange(
    plan.anchor,
    plan.recurrence,
    window.from,
    window.to,
    plan.anchorDay,
  );
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

export type MonthOccurrence = {
  id: string;
  planId: string;
  date: string;
  /** Positive: money out. */
  amount: number;
  /** '' when it has no card or account. */
  sourceId: string;
  /** As recorded, or the plan's name for a date still to come. */
  label: string;
  /** On or before today. */
  paid: boolean;
};

export type MonthStatus =
  | { kind: 'paid' }
  | { kind: 'next'; date: string; inMonth: boolean }
  | { kind: 'ends'; date: string }
  | { kind: 'none' };

export type MonthPlanRow = {
  planId: string;
  kind: PlanKind;
  name: string;
  /** As stored ('monthly'); `recurrenceLabel` / `cycleLabel` read it. */
  recurrence: string;
  /** Due in the month: its dates there, summed. Not due: one payment. */
  amount: number;
  /** Where it charges now; '' when not set ("Add a card"). */
  sourceId: string;
  categoryId: string | null;
  iconId: string | null;
  domain: string | null;
  logoHidden: boolean;
  /** Its page: `billPageHref` (a loan's opens the loan) or the subscription's. */
  href: Href;
  /** Where "Add a card" goes: the form the page's pencil opens. */
  editHref: Href;
  /** Oldest first; none when it is not due in the month. */
  occurrences: MonthOccurrence[];
  status: MonthStatus;
};

/**
 * A stopped bill or cancelled subscription. One charged in the month keeps those charges here,
 * counted in the month's figure and as paid; otherwise `occurrences` is empty and `amount` is one
 * payment.
 */
export type StoppedPlanRow = Omit<MonthPlanRow, 'status' | 'editHref'> & {
  /** A bill's end date. */
  stoppedOn: string | null;
  /** The newest charge it ever had, in any month. */
  lastCharged: string | null;
};

export type PlanMonth = {
  month: string;
  when: 'past' | 'current' | 'future';
  /** Every date due in the month, summed in cents. */
  total: number;
  /** Plans with a date in the month (n). */
  planCount: number;
  /** Of those, every date paid (p). */
  paidCount: number;
  /** Of those, one still to come (c = n − p). */
  comingCount: number;
  /** The earliest date still to come in the month. */
  next: MonthOccurrence | null;
  /** Every date still to come in the month: date, then name, then id. */
  comingUp: MonthOccurrence[];
  /** Running plans: those due by their first date in the month, then the rest by their next date. */
  rows: MonthPlanRow[];
  /** Stopped or cancelled plans, newest stop first. */
  stopped: StoppedPlanRow[];
  /** Loan payoffs in the month; null with none, and always for subscriptions. */
  extras: MonthExtras | null;
};

/**
 * Money paid off loans in the month beyond their instalments. Never due, so never in `total` or
 * the counts; Home's Monthly bills tile counts it, so the card says it beside the due figure.
 */
export type MonthExtras = {
  total: number;
  /** Payoffs. */
  count: number;
  /** Loans they were paid on. */
  loans: number;
  /** The loan's name when every payoff is on one loan. */
  name: string | null;
  /** `total` of the month and of the payoffs together: Home's Monthly bills figure. */
  inAll: number;
};

export type PlanMonthEntry = Pick<
  LedgerEntry,
  'id' | 'date' | 'amount' | 'kind' | 'planId' | 'sourceId' | 'label' | 'payoff'
>;

export type PlanMonthInput = {
  kind: PlanKind;
  /** yyyy-mm */
  month: string;
  /** yyyy-mm-dd, the device's own day (`useToday`). */
  today: string;
  /** The ledger over the month (`useLedger(monthBounds(month), today).allEntries`). */
  entries: readonly PlanMonthEntry[];
  bills: readonly BillRow[];
  subscriptions: readonly SubscriptionRow[];
  /** `lastChargedBy(charges)`: newest charge date by `planKey`. */
  lastCharged: ReadonlyMap<string, string>;
};

/** A plan as this page reads it, whichever table it came from. */
type Plan = {
  id: string;
  key: string;
  name: string;
  recurrence: string;
  amountCents: number;
  sourceId: string;
  categoryId: string | null;
  iconId: string | null;
  domain: string | null;
  logoHidden: boolean;
  href: Href;
  editHref: Href;
  schedule: PlanSchedule;
  /** A stopped bill (`billStopped`) or a cancelled subscription. */
  stopped: boolean;
  /** Listed under All bills / All subscriptions even with nothing due in the month. */
  running: boolean;
  /** Listed under Stopped / Cancelled even with nothing charged in the month. */
  listedStopped: boolean;
  /** The recorders write its dues (`recordDueCharges`): what may be missing until they run. */
  recorderWrites: boolean;
  stoppedOn: string | null;
};

function billPlan(row: BillRow, today: string): Plan {
  const stopped = billStopped(row, today);
  const counts = countsInSpending(row);
  return {
    id: row.id,
    key: planKey('bill', row.id),
    name: row.name,
    recurrence: row.recurrence,
    amountCents: Math.abs(toCents(row.amount)),
    sourceId: row.card_id ?? row.bank_account_id ?? '',
    categoryId: row.category_id ?? null,
    iconId: row.icon_id ?? null,
    domain: logoDomainOf(row),
    logoHidden: Boolean(row.logo_hidden),
    href: billPageHref(row.id, row.category_id),
    editHref: isLoanBill(row.category_id)
      ? { pathname: '/add-loan', params: { id: row.id } }
      : { pathname: '/add-bill', params: { id: row.id } },
    schedule: {
      anchor: row.next_due_on,
      recurrence: row.recurrence,
      anchorDay: row.anchor_day ?? null,
      startsOn: row.starts_on,
      createdAt: row.created_at,
      endsOn: row.ends_on,
    },
    stopped,
    // A loan kept out of monthly bills is not a bill here, running or stopped, bar what it was
    // charged in the month while it still was one.
    running: counts && !stopped,
    listedStopped: counts && stopped,
    recorderWrites: counts && Boolean(row.next_due_on),
    stoppedOn: row.ends_on ?? null,
  };
}

function subscriptionPlan(row: SubscriptionRow): Plan {
  return {
    id: row.id,
    key: planKey('subscription', row.id),
    name: row.name,
    recurrence: row.cycle,
    amountCents: Math.abs(toCents(row.amount)),
    sourceId: row.card_id ?? row.bank_account_id ?? '',
    categoryId: row.category_id ?? null,
    iconId: null,
    domain: logoDomainOf(row),
    logoHidden: Boolean(row.logo_hidden),
    href: { pathname: '/subscription/[id]', params: { id: row.id } },
    editHref: { pathname: '/add-subscription', params: { id: row.id } },
    schedule: {
      anchor: row.next_renewal_on,
      recurrence: row.cycle,
      anchorDay: row.anchor_day ?? null,
      startsOn: row.started_on,
      createdAt: row.created_at,
      endsOn: null,
    },
    stopped: !row.active,
    // An active one with no renewal date is not cancelled: it stays listed, with no date.
    running: row.active,
    listedStopped: !row.active,
    recorderWrites: row.active && Boolean(row.next_renewal_on),
    stoppedOn: null,
  };
}

type Occurrence = Omit<MonthOccurrence, 'amount'> & { cents: number };

/**
 * Dues the recorders owe but have not written yet. The ledger projects a plan that has a charge
 * only from tomorrow, so between midnight and the next sweep (or with the app left open across
 * midnight) today's due is in no list. These are the dates `unrecordedDates` will write: inside the
 * plan's window up to today, in a cycle after its newest charge, which no charge can hold, since a
 * plan is charged once per cycle. A plan never charged needs none: the ledger projects its past.
 */
function owedDates(
  plan: Plan,
  lastCharged: string | undefined,
  month: { from: string; to: string },
  today: string,
): string[] {
  const { anchor, recurrence, anchorDay, startsOn, createdAt, endsOn } = plan.schedule;
  if (!plan.recorderWrites || !anchor || !lastCharged) return [];

  const floor = planFloor(startsOn, createdAt) ?? today;
  const window = billWindow({ starts_on: floor, ends_on: endsOn ?? null }, floor, today);
  const from = window.from && window.from > month.from ? window.from : month.from;
  const to = window.to < month.to ? window.to : month.to;
  if (from > to) return [];

  const charged = cycleStart(lastCharged, recurrence);
  return occurrencesInRange(anchor, recurrence, from, to, anchorDay).filter(
    (date) => cycleStart(date, recurrence) > charged,
  );
}

const byDateThenId = (a: Occurrence, b: Occurrence) =>
  a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date);

function byNameThenId(a: { name: string; planId: string }, b: { name: string; planId: string }) {
  return a.name === b.name ? a.planId.localeCompare(b.planId) : a.name.localeCompare(b.name);
}

function sumCents(occurrences: readonly Occurrence[]): number {
  return occurrences.reduce((total, occurrence) => total + occurrence.cents, 0);
}

function shown({ cents, ...rest }: Occurrence): MonthOccurrence {
  return { ...rest, amount: fromCents(cents) };
}

/** A running plan with nothing due in the month: its next date after today, else its end. */
function notDueStatus(plan: Plan, month: string, today: string): MonthStatus {
  const next = nextDueAfter(plan.schedule, today);
  if (next) return { kind: 'next', date: next, inMonth: monthOf(next) === month };
  return plan.stoppedOn ? { kind: 'ends', date: plan.stoppedOn } : { kind: 'none' };
}

function statusDate(status: MonthStatus): string | null {
  return status.kind === 'next' || status.kind === 'ends' ? status.date : null;
}

/**
 * The month's figure, counts and lists. A plan's dates in the month are the ledger's (recorded
 * charges as they were charged, projections at today's amount), plus any due the recorders still
 * owe (`owedDates`). Counts are plans, not dates: a weekly bill due four times is one bill.
 */
export function planMonth(input: PlanMonthInput): PlanMonth {
  const { kind, month, today, entries, bills, subscriptions, lastCharged } = input;
  const bounds = monthBounds(month);

  const plans =
    kind === 'bill'
      ? bills.map((row) => billPlan(row, today))
      : subscriptions.map((row) => subscriptionPlan(row));
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  const byPlan = new Map<string, Occurrence[]>();
  let extraCents = 0;
  let extraCount = 0;
  const extraLoans = new Map<string, string>();
  for (const entry of entries) {
    if (entry.kind !== kind) continue;
    if (entry.date < bounds.from || entry.date > bounds.to) continue;
    // A payoff is paid toward a loan beyond its instalments: counted as extra, never as due. The
    // ledger has already left out one made while its loan did not count, as Home's tile does.
    if (entry.payoff) {
      extraCents += Math.abs(toCents(entry.amount));
      extraCount += 1;
      const loan = entry.planId ?? entry.id;
      extraLoans.set(loan, planById.get(loan)?.name ?? entry.label);
      continue;
    }
    if (!entry.planId) continue;
    // The ledger lists a plan's dates only from its row; without one there is nothing to draw.
    if (!planById.has(entry.planId)) continue;
    const found = byPlan.get(entry.planId) ?? [];
    found.push({
      id: entry.id,
      planId: entry.planId,
      date: entry.date,
      cents: Math.abs(toCents(entry.amount)),
      sourceId: entry.sourceId,
      label: entry.label,
      paid: entry.date <= today,
    });
    byPlan.set(entry.planId, found);
  }

  for (const plan of plans) {
    const found = byPlan.get(plan.id) ?? [];
    const recurrence = plan.schedule.recurrence;
    const cycles = new Set(found.map((occurrence) => cycleStart(occurrence.date, recurrence)));
    for (const date of owedDates(plan, lastCharged.get(plan.key), bounds, today)) {
      if (cycles.has(cycleStart(date, recurrence))) continue;
      cycles.add(cycleStart(date, recurrence));
      // The id a projected date has, so `ledgerHref` reads the plan from it.
      found.push({
        id: `${plan.key}@${date}`,
        planId: plan.id,
        date,
        cents: plan.amountCents,
        sourceId: plan.sourceId,
        label: plan.name,
        paid: true,
      });
    }
    if (found.length > 0) byPlan.set(plan.id, found.sort(byDateThenId));
  }

  const due: MonthPlanRow[] = [];
  const notDue: MonthPlanRow[] = [];
  const stopped: StoppedPlanRow[] = [];
  const coming: Occurrence[] = [];
  let totalCents = 0;
  let planCount = 0;
  let paidCount = 0;

  for (const plan of plans) {
    const found = byPlan.get(plan.id) ?? [];
    const monthCents = sumCents(found);
    const firstUnpaid = found.find((occurrence) => !occurrence.paid);
    if (found.length > 0) {
      totalCents += monthCents;
      planCount += 1;
      if (!firstUnpaid) paidCount += 1;
      coming.push(...found.filter((occurrence) => !occurrence.paid));
    }

    const row = {
      planId: plan.id,
      kind,
      name: plan.name,
      recurrence: plan.recurrence,
      amount: fromCents(found.length > 0 ? monthCents : plan.amountCents),
      sourceId: plan.sourceId,
      categoryId: plan.categoryId,
      iconId: plan.iconId,
      domain: plan.domain,
      logoHidden: plan.logoHidden,
      href: plan.href,
      occurrences: found.map(shown),
    };

    // Stopped after a charge this month: that charge is counted and paid, and the plan is listed
    // with the stopped ones, never with the running.
    if (plan.stopped && (found.length > 0 || plan.listedStopped)) {
      stopped.push({
        ...row,
        stoppedOn: plan.stoppedOn,
        lastCharged: lastCharged.get(plan.key) ?? null,
      });
    } else if (found.length > 0) {
      due.push({
        ...row,
        editHref: plan.editHref,
        status: firstUnpaid
          ? { kind: 'next', date: firstUnpaid.date, inMonth: true }
          : { kind: 'paid' },
      });
    } else if (plan.running) {
      notDue.push({ ...row, editHref: plan.editHref, status: notDueStatus(plan, month, today) });
    }
  }

  due.sort((a, b) => {
    const first = a.occurrences[0].date.localeCompare(b.occurrences[0].date);
    return first !== 0 ? first : byNameThenId(a, b);
  });
  notDue.sort((a, b) => {
    const left = statusDate(a.status);
    const right = statusDate(b.status);
    if (left !== right) {
      if (left === null) return 1;
      if (right === null) return -1;
      return left.localeCompare(right);
    }
    return byNameThenId(a, b);
  });
  stopped.sort((a, b) => {
    const left = a.stoppedOn ?? a.lastCharged;
    const right = b.stoppedOn ?? b.lastCharged;
    if (left !== right) {
      if (left === null) return 1;
      if (right === null) return -1;
      return right.localeCompare(left);
    }
    return byNameThenId(a, b);
  });

  const comingUp = coming
    .sort((a, b) =>
      a.date !== b.date
        ? a.date.localeCompare(b.date)
        : a.label !== b.label
          ? a.label.localeCompare(b.label)
          : a.id.localeCompare(b.id),
    )
    .map(shown);

  const current = monthOf(today);
  return {
    month,
    when: month < current ? 'past' : month === current ? 'current' : 'future',
    total: fromCents(totalCents),
    planCount,
    paidCount,
    comingCount: planCount - paidCount,
    next: comingUp[0] ?? null,
    comingUp,
    rows: [...due, ...notDue],
    stopped,
    extras:
      extraCount > 0
        ? {
            total: fromCents(extraCents),
            count: extraCount,
            loans: extraLoans.size,
            name: extraLoans.size === 1 ? [...extraLoans.values()][0] : null,
            inAll: fromCents(totalCents + extraCents),
          }
        : null,
  };
}

/** The newest charge date of every plan that has one, keyed by `planKey` as the ledger keys them. */
export function lastChargedBy(
  charges: readonly Pick<ChargeRow, 'bill_id' | 'subscription_id' | 'charged_on'>[],
): Map<string, string> {
  const newest = new Map<string, string>();
  for (const charge of charges) {
    if (!charge.bill_id && !charge.subscription_id) continue;
    const key = chargePlanKey(charge);
    const held = newest.get(key);
    if (!held || charge.charged_on > held) newest.set(key, charge.charged_on);
  }
  return newest;
}
