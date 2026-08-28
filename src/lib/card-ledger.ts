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
  /** yyyy-mm-dd it stopped, when known. Nothing lands after it. */
  endsOn?: string | null;
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

/** Backwards-only, which is what a card balance needs. */
export function occurrencesBetween(
  nextDate: string,
  recurrence: Recurrence,
  from: string | null,
  to: string,
): string[] {
  return occurrencesInRange(nextDate, recurrence, from, to);
}

/**
 * Turns everything charged to one source into a ledger and a balance.
 *
 * `statedBalance` is what the user typed and `balanceAsOf` is when it was true.
 * Charges before that date are assumed to be baked into the figure already, so
 * counting them again would double them. When no balance was ever stated, every
 * charge counts — a backdated receipt on a fresh card still has to appear.
 */
export function buildLedger(input: {
  kind: SourceKind;
  statedBalance: number;
  /** yyyy-mm-dd, or null when no balance was ever stated. */
  balanceAsOf: string | null;
  charges: Charge[];
  recurring: RecurringCharge[];
  payments: Payment[];
  /** yyyy-mm-dd. Nothing dated after it has happened yet. */
  today: string;
}): Ledger {
  const { kind, statedBalance, balanceAsOf, charges, recurring, payments, today } = input;

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

  for (const item of recurring) {
    // The charge's own lifetime, narrowed by the window being asked about.
    // Without this a bill added today would back-date itself onto the card.
    const from =
      item.startsOn && (!balanceAsOf || item.startsOn > balanceAsOf) ? item.startsOn : balanceAsOf;
    const to = item.endsOn && item.endsOn < today ? item.endsOn : today;
    if (from && from > to) continue;

    for (const date of occurrencesBetween(item.nextDate, item.recurrence, from, to)) {
      entries.push({
        // Unique per occurrence, so React keys stay stable across renders.
        id: `${item.id}@${date}`,
        label: item.label,
        date,
        amount: -Math.abs(item.amount),
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
 * Narrows a window to the stretch a bill was actually running.
 *
 * Occurrences are derived by walking outwards from the stored next date, which
 * on its own reaches back before the bill existed — add a monthly bill today
 * and last spring fills with charges that were never paid. `starts_on` and
 * `ends_on` are the bill's own bounds, so the walk is held inside them.
 *
 * Rows saved before those dates were captured have neither, and are left
 * unbounded: guessing a start would erase real history.
 */
export function billWindow(
  bill: { starts_on?: string | null; ends_on?: string | null },
  from: string | null,
  to: string,
): { from: string | null; to: string } {
  const start = bill.starts_on && (!from || bill.starts_on > from) ? bill.starts_on : from;
  const end = bill.ends_on && bill.ends_on < to ? bill.ends_on : to;
  return { from: start, to: end };
}
