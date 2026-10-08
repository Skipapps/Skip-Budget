/**
 * Works out what a card or bank account is at: a running total from a user-stated balance, with
 * every charge pushing it up and every payment bringing it down. Pure: no clock, no queries.
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
  /** The owner chose letters: no logo, not even one found by name. Display only. */
  logoHidden?: boolean | null;
};

/** What a bill needs to draw its icon, since it has no brand to look up. */
type BillMarkFields = {
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
  /** The owner chose letters: no logo, not even one found by name. Display only. */
  logoHidden?: boolean | null;
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
  /** The owner chose letters: no logo, not even one found by name. Display only. */
  logoHidden?: boolean | null;
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
 * Steps a date by whole cycles. Positive steps go back, negative go forward. Month arithmetic is on
 * the calendar, with the day clamped to the month's length (a bill due on the 31st charges on the
 * 30th in a 30-day month).
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
 * Every time a recurring charge landed inside a window, newest first. Walks outwards from the next
 * due date, the only date the schema stores. A "period" bill contributes at most its one date.
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
  // Hard stops, so a corrupt date or an unknown recurrence cannot spin.
  const GUARD = 600;

  for (let step = 0; step < GUARD; step += 1) {
    const date = stepBy(anchor, recurrence, step);
    if (from && date < from) break;
    if (date <= to) found.push(date);
    if (!from && found.length > 240) break;
  }

  for (let step = 1; step < GUARD; step += 1) {
    const date = stepBy(anchor, recurrence, -step);
    if (date > to) break;
    if (!from || date >= from) found.push(date);
  }

  return found.sort((a, b) => b.localeCompare(a));
}

/**
 * The first occurrence on or after a given day. A stored "next due" goes stale once its date passes;
 * walking forward from the original anchor rather than from today keeps the user's day-of-month
 * (rent on the 1st stays on the 1st). History is unaffected, as it is derived by walking back.
 */
export function nextOccurrenceFrom(anchor: string, recurrence: Recurrence, from: string): string {
  if (!anchor || recurrence === 'period') return anchor;

  let date = anchor;
  for (let step = 1; date < from && step < 600; step += 1) {
    date = stepBy(anchor, recurrence, -step);
  }
  return date;
}

/**
 * How the ledger names a plan: bills and subscriptions are separate tables, so ids are held apart by
 * kind. Charges must be filed under the same name or a plan's history never matches, which fails
 * quietly (it projects instead).
 */
export function planKey(kind: 'bill' | 'subscription', id: string): string {
  return `${kind}-${id}`;
}

export function chargePlanKey(row: {
  bill_id: string | null;
  subscription_id: string | null;
}): string {
  return row.bill_id
    ? planKey('bill', row.bill_id)
    : planKey('subscription', row.subscription_id as string);
}

export function dayAfter(date: string): string {
  const [year, month, day] = parts(date);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return iso(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function laterOf(bound: string | null, floor: string): string {
  return bound && bound > floor ? bound : floor;
}

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
 * Every time a plan landed or is going to, inside a window. The past is read from the charges
 * written down at the time (their label, amount and source then, so a rent rise or a card change
 * leaves earlier months alone); only what has not happened yet is projected from the plan.
 *
 * `isRecorded` is whether the plan has ever been written down, in any window. When it has not, the
 * projection carries the past too. A plan on the record gets no such fallback: gaps stay gaps.
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

  // A charge is bounded by the window only, not the plan's lifetime: it happened, and shortening a
  // bill afterwards does not unspend the money.
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
    // A recorded charge wins its day, so a clock skewed a day forward cannot count it twice.
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
 * `statedBalance` is what the user typed and `balanceAsOf` is when it was true. Charges before that
 * date are already baked into the figure; with no stated balance every charge counts. Only what has
 * already happened is shown, so once bills are on the record the balance comes from `recorded`.
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
      logoHidden: charge.logoHidden,
    });
  }

  const byPlan = new Map<string, RecordedCharge[]>();
  for (const charge of recorded) {
    const rows = byPlan.get(charge.planId);
    if (rows) rows.push(charge);
    else byPlan.set(charge.planId, [charge]);
  }

  for (const item of recurring) {
    // Recorded where it is recorded, projected only where it is not. The lifetime bounds live in
    // there too, or a bill added today would back-date itself onto the card.
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
        logoHidden: item.logoHidden,
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

  // A card balance is debt (spending raises it); an account balance is money held (the opposite).
  const balance = kind === 'card' ? statedBalance + charged - paid : statedBalance - charged + paid;

  return { entries, charged, paid, balance };
}

/**
 * The earliest day a plan could honestly have charged: `startsOn`, else the day the row was created.
 * Walking outwards from the stored next date alone reaches back forever and would fill every month
 * before a newly added bill with charges nobody made.
 */
export function planFloor(
  startsOn: string | null | undefined,
  createdAt: string | null | undefined,
): string | null {
  if (startsOn) return startsOn;
  return createdAt ? createdAt.slice(0, 10) : null;
}

/** Narrows a window to the stretch a bill was running: `starts_on` (see `planFloor`) to `ends_on`. */
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
