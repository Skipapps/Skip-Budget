/**
 * Works out what a card or bank account is actually at.
 *
 * A card is a running total, not a stored number. The user states a balance,
 * and from that moment everything charged to the card pushes it up and every
 * payment brings it down — the same arithmetic a real statement does, except
 * nothing here is automated: every figure comes from a row the user entered.
 *
 * Pure on purpose. No dates read from the clock, no queries — everything is an
 * argument, so the whole thing is testable and produces the same answer twice.
 */

export type SourceKind = 'card' | 'account';

export type Recurrence = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'period';

/** A single dated charge against a source. Amount is a positive magnitude. */
export type Charge = {
  id: string;
  label: string;
  amount: number;
  /** yyyy-mm-dd */
  date: string;
  kind: 'receipt' | 'bill' | 'subscription';
  domain?: string | null;
};

/** What a bill needs to draw its icon, since it has no brand to look up. */
export type BillMarkFields = {
  categoryId?: string | null;
  iconId?: string | null;
};

/** Something that charges again and again, described by its NEXT date. */
export type RecurringCharge = {
  id: string;
  label: string;
  amount: number;
  /** yyyy-mm-dd of the next time it lands. */
  nextDate: string;
  recurrence: Recurrence;
  kind: 'bill' | 'subscription';
  domain?: string | null;
  /** yyyy-mm-dd the charge began, when known. Nothing lands before it. */
  startsOn?: string | null;
  /** When the row was made, as the floor of last resort. */
  createdAt?: string | null;
  /** yyyy-mm-dd it stopped, when known. Nothing lands after it. */
  endsOn?: string | null;
  /** Where it charges NOW. What it charged before is on the charge itself. */
  cardId?: string | null;
  accountId?: string | null;
} & BillMarkFields;

export type Payment = {
  id: string;
  amount: number;
  /** yyyy-mm-dd */
  date: string;
  note?: string | null;
};

export type LedgerEntry = {
  id: string;
  label: string;
  date: string;
  /** Signed for display: negative is money out of pocket. */
  amount: number;
  kind: 'receipt' | 'bill' | 'subscription' | 'payment';
  domain?: string | null;
} & BillMarkFields;

export type Ledger = {
  /** Newest first. */
  entries: LedgerEntry[];
  /** Charges that landed inside the window, summed. */
  charged: number;
  /** Payments made inside the window, summed. */
  paid: number;
  /** What the source is at now. */
  balance: number;
};

const STEP_MONTHS: Partial<Record<Recurrence, number>> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

function parts(iso: string): [number, number, number] {
  const [year, month, day] = iso.split('-').map(Number);
  return [year, month, day];
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Steps a date by whole cycles. Positive steps go back, negative go forward.
 *
 * Month arithmetic is done on the calendar rather than in milliseconds, and the
 * day is clamped to the month's length — a bill due on the 31st charges on the
 * 30th in a 30-day month rather than skidding into the next one.
 */
function stepBy(date: string, recurrence: Recurrence, steps: number): string {
  const [year, month, day] = parts(date);

  if (recurrence === 'weekly') {
    const shifted = new Date(Date.UTC(year, month - 1, day - 7 * steps));
    return iso(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
  }

  const months = STEP_MONTHS[recurrence];
  if (!months) return date;

  const total = year * 12 + (month - 1) - months * steps;
  const targetYear = Math.floor(total / 12);
  const targetMonth = (total % 12) + 1;
  return iso(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/**
 * Every time a recurring charge landed inside a window.
 *
 * Walks backwards from the next due date, because that is the only date the
 * schema stores. A "period" bill does not repeat, so it contributes at most its
 * one date.
 */
export function occurrencesInRange(
  anchor: string,
  recurrence: Recurrence,
  from: string | null,
  to: string,
): string[] {
  if (!anchor) return [];

  if (recurrence === 'period') {
    return anchor <= to && (!from || anchor >= from) ? [anchor] : [];
  }

  const found: string[] = [];
  // Hard stops, so a corrupt date or an unknown recurrence cannot spin here.
  const GUARD = 600;

  // Backwards from the anchor, including the anchor itself.
  for (let step = 0; step < GUARD; step += 1) {
    const date = stepBy(anchor, recurrence, step);
    if (from && date < from) break;
    if (date <= to) found.push(date);
    // With no lower bound there is nothing to stop the walk but the guard.
    if (!from && found.length > 240) break;
  }

  // Forwards from the anchor, for ranges that reach into the future.
  for (let step = 1; step < GUARD; step += 1) {
    const date = stepBy(anchor, recurrence, -step);
    if (date > to) break;
    if (!from || date >= from) found.push(date);
  }

  return found.sort((a, b) => b.localeCompare(a));
}

/**
 * The first occurrence on or after a given day.
 *
 * A stored "next due" goes stale the moment its date passes — the bill is
 * still monthly, but the app would keep calling a date in the past the next
 * one. Walking forward from the original anchor rather than from today keeps
 * the day-of-month the user chose, so a rent bill set to the 1st stays on the
 * 1st however long the app went unopened.
 *
 * History is unaffected: occurrences are derived by walking back from the
 * anchor, so moving it forward cannot erase what already happened.
 */
export function nextOccurrenceFrom(anchor: string, recurrence: Recurrence, from: string): string {
  // A one-off has no next: it happens on its date and never again.
  if (!anchor || recurrence === 'period') return anchor;

  let date = anchor;
  for (let step = 1; date < from && step < 600; step += 1) {
    date = stepBy(anchor, recurrence, -step);
  }
  return date;
}

/**
 * How the ledger names a plan.
 *
 * Bills and subscriptions are separate tables with their own ids, so the
 * ledger holds them apart by kind. Charges have to be filed under the same
 * name or a plan's history simply never matches it — and it would fail
 * quietly, by projecting, which looks exactly like working.
 */
export function planKey(kind: 'bill' | 'subscription', id: string): string {
  return `${kind}-${id}`;
}

/** The same name, worked out from a charge row. */
export function chargePlanKey(row: {
  bill_id: string | null;
  subscription_id: string | null;
}): string {
  return row.bill_id
    ? planKey('bill', row.bill_id)
    : planKey('subscription', row.subscription_id as string);
}

/** The next calendar day. */
function dayAfter(date: string): string {
  const [year, month, day] = parts(date);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return iso(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

/** The later of two lower bounds, where null means "no bound at all". */
function laterOf(bound: string | null, floor: string): string {
  return bound && bound > floor ? bound : floor;
}

/** One occurrence as it was written down, narrowed to what a ledger draws. */
export type RecordedCharge = {
  id: string;
  /** The bill or subscription it came from. */
  planId: string;
  label: string;
  amount: number;
  /** yyyy-mm-dd */
  date: string;
  /** Where it actually came out of, copied when it landed. */
  cardId: string | null;
  accountId: string | null;
};

/** One time a plan landed — read from the record where there is one. */
export type PlanOccurrence = {
  /** The charge's own id, or the plan and the date, so keys stay stable. */
  id: string;
  label: string;
  amount: number;
  date: string;
  cardId: string | null;
  accountId: string | null;
  /** False when this has not happened yet and is only a forecast. */
  recorded: boolean;
};

/**
 * Every time a plan landed or is going to, inside a window.
 *
 * The past and the future are answered by different things, and that split is
 * the whole point. What already went out is read from the charges written down
 * at the time, carrying the label, amount and source they had then — so
 * putting rent up next month leaves last month at the old figure, and moving a
 * bill to a different card leaves March on the card that actually paid it.
 * Only what has not happened yet is projected from the plan, because a
 * forecast is the one thing the plan is still the authority on.
 *
 * `isRecorded` says whether this plan has ever been written down — anywhere,
 * not just inside this window. When it has not, the projection carries the
 * past as well, which is what keeps the screens working before the recorder
 * has caught up, or when it cannot run at all. A plan on the record does not
 * get that fallback: its history is exactly what was recorded, and filling
 * gaps from the plan would put back the very rewriting this replaces.
 */
export function planOccurrences(input: {
  plan: RecurringCharge;
  /** This plan's charges. Already narrowed to the source being asked about. */
  charges: readonly RecordedCharge[];
  /** Whether the plan has any charge at all, in any scope. */
  isRecorded: boolean;
  from: string | null;
  to: string;
  /** yyyy-mm-dd. Nothing after it has happened. */
  today: string;
}): PlanOccurrence[] {
  const { plan, charges, isRecorded, from, to, today } = input;

  // Bounded by the window asked about and nothing else. A charge is not
  // clipped to the plan's lifetime: it is on the record because it happened,
  // and shortening a bill afterwards does not unspend the money.
  const found: PlanOccurrence[] = charges
    .filter((charge) => charge.date <= to && (!from || charge.date >= from))
    .map((charge) => ({
      id: charge.id,
      label: charge.label,
      amount: charge.amount,
      date: charge.date,
      cardId: charge.cardId,
      accountId: charge.accountId,
      recorded: true,
    }));

  const window = billWindow(
    { starts_on: plan.startsOn, ends_on: plan.endsOn, created_at: plan.createdAt },
    isRecorded ? laterOf(from, dayAfter(today)) : from,
    to,
  );

  if (!window.from || window.from <= window.to) {
    // Anything already on the record wins the day it falls on, so a clock
    // skewed a day forward cannot have it counted twice.
    const taken = new Set(found.map((occurrence) => occurrence.date));

    for (const date of occurrencesInRange(plan.nextDate, plan.recurrence, window.from, window.to)) {
      if (taken.has(date)) continue;
      found.push({
        id: `${plan.id}@${date}`,
        label: plan.label,
        amount: plan.amount,
        date,
        cardId: plan.cardId ?? null,
        accountId: plan.accountId ?? null,
        recorded: false,
      });
    }
  }

  return found.sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date),
  );
}

/**
 * Turns everything charged to one source into a ledger and a balance.
 *
 * `statedBalance` is what the user typed and `balanceAsOf` is when it was true.
 * Charges before that date are assumed to be baked into the figure already, so
 * counting them again would double them. When no balance was ever stated, every
 * charge counts — a backdated receipt on a fresh card still has to appear.
 *
 * A card only ever shows what has already happened, so once its bills are on
 * the record the balance is built entirely from `recorded` and the plans are
 * left to describe the future nobody is asking about here.
 */
export function buildLedger(input: {
  kind: SourceKind;
  statedBalance: number;
  /** yyyy-mm-dd, or null when no balance was ever stated. */
  balanceAsOf: string | null;
  charges: Charge[];
  recurring: RecurringCharge[];
  payments: Payment[];
  /** Charges written down against THIS source, whichever plan they came from. */
  recorded?: readonly RecordedCharge[];
  /** Every plan with a charge anywhere. Absent means nothing is recorded yet. */
  recordedPlans?: ReadonlySet<string>;
  /** yyyy-mm-dd. Nothing dated after it has happened yet. */
  today: string;
}): Ledger {
  const { kind, statedBalance, balanceAsOf, charges, recurring, payments, today } = input;
  const recorded = input.recorded ?? [];
  const recordedPlans = input.recordedPlans ?? new Set<string>();

  const inWindow = (date: string) => date <= today && (!balanceAsOf || date >= balanceAsOf);

  const entries: LedgerEntry[] = [];

  for (const charge of charges) {
    if (!inWindow(charge.date)) continue;
    entries.push({
      id: charge.id,
      label: charge.label,
      date: charge.date,
      amount: -Math.abs(charge.amount),
      kind: charge.kind,
      domain: charge.domain,
    });
  }

  const byPlan = new Map<string, RecordedCharge[]>();
  for (const charge of recorded) {
    const rows = byPlan.get(charge.planId);
    if (rows) rows.push(charge);
    else byPlan.set(charge.planId, [charge]);
  }

  for (const item of recurring) {
    // Recorded where it is recorded, projected only where it is not. The
    // lifetime bounds live in there too: without them a bill added today would
    // back-date itself onto the card.
    for (const occurrence of planOccurrences({
      plan: item,
      charges: byPlan.get(item.id) ?? [],
      isRecorded: recordedPlans.has(item.id),
      from: balanceAsOf,
      to: today,
      today,
    })) {
      entries.push({
        id: occurrence.id,
        label: occurrence.label,
        date: occurrence.date,
        amount: -Math.abs(occurrence.amount),
        kind: item.kind,
        domain: item.domain,
        categoryId: item.categoryId,
        iconId: item.iconId,
      });
    }
  }

  for (const payment of payments) {
    if (!inWindow(payment.date)) continue;
    entries.push({
      id: payment.id,
      label: payment.note?.trim() || 'Payment',
      date: payment.date,
      amount: Math.abs(payment.amount),
      kind: 'payment',
    });
  }

  entries.sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date),
  );

  const charged = entries
    .filter((entry) => entry.kind !== 'payment')
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  const paid = entries
    .filter((entry) => entry.kind === 'payment')
    .reduce((sum, entry) => sum + entry.amount, 0);

  // A card balance is debt, so spending raises it and paying lowers it. An
  // account balance is money held, so the same two events do the opposite.
  const balance = kind === 'card' ? statedBalance + charged - paid : statedBalance - charged + paid;

  return { entries, charged, paid, balance };
}

/**
 * The earliest day a plan could honestly have charged.
 *
 * Occurrences are walked outwards from the stored next date, which on its own
 * reaches back forever: a monthly bill added today fills every month before it
 * with charges nobody made. `startsOn` is the real answer when it is known,
 * and the day the row was created is the honest fallback — the app cannot have
 * recorded anything before it was told about it.
 */
export function planFloor(
  startsOn: string | null | undefined,
  createdAt: string | null | undefined,
): string | null {
  if (startsOn) return startsOn;
  return createdAt ? createdAt.slice(0, 10) : null;
}

/**
 * Narrows a window to the stretch a bill was actually running.
 *
 * Occurrences are derived by walking outwards from the stored next date, which
 * on its own reaches back before the bill existed — add a monthly bill today
 * and last spring fills with charges that were never paid. `starts_on` and
 * `ends_on` are the bill's own bounds, so the walk is held inside them.
 *
 * A row saved before those dates were captured falls back to when it was
 * created, which is the last honest bound available: the app cannot have
 * charged anything before it was told the plan existed.
 */
export function billWindow(
  bill: {
    starts_on?: string | null;
    ends_on?: string | null;
    created_at?: string | null;
  },
  from: string | null,
  to: string,
): { from: string | null; to: string } {
  const floor = planFloor(bill.starts_on, bill.created_at);
  const start = floor && (!from || floor > from) ? floor : from;
  const end = bill.ends_on && bill.ends_on < to ? bill.ends_on : to;
  return { from: start, to: end };
}
