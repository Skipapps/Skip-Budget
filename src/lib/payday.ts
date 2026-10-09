import type { PayFrequency } from '@/lib/date';

/**
 * Paydays as the reminder scheduler counts them. `nextPaydayOn` is `public.next_payday`, and
 * `paydayReminderOn` is reminders_due's rule for an account (the next payday on or after today, less
 * the lead, equals today), so the dates a form promises are the dates the push is sent. Days are
 * local calendar dates, yyyy-mm-dd.
 */

/** Postgres's walk gives up after this many cycles and answers with where it got to. */
const GUARD = 800;

function parts(iso: string): [number, number, number] {
  const [year, month, day] = iso.split('-').map(Number);
  return [year, month - 1, day];
}

/** Any year, month and day, overflow included ("October 35th"), as yyyy-mm-dd. */
function isoOf(year: number, month: number, day: number): string {
  const date = new Date(year, month, day);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function daysIn(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function shift(iso: string, days: number): string {
  const [year, month, day] = parts(iso);
  return isoOf(year, month, day + days);
}

/** One step of next_payday's loop. Monthly keeps the last payday's own day, clamped. */
function advance(iso: string, frequency: Exclude<PayFrequency, 'once'>, anchorDay: number): string {
  const [year, month, day] = parts(iso);
  switch (frequency) {
    case 'weekly':
      return isoOf(year, month, day + 7);
    case 'biweekly':
      return isoOf(year, month, day + 14);
    case 'monthly':
      return isoOf(year, month + 1, Math.min(anchorDay, daysIn(year, month + 1)));
    case 'semimonthly': {
      // Paid on the 15th and the last day of the month.
      const last = daysIn(year, month);
      if (day < 15) return isoOf(year, month, 15);
      if (day < last) return isoOf(year, month, last);
      return isoOf(year, month + 1, 15);
    }
  }
}

/**
 * The first payday on or after `from`, walking from the last one: a payday that is `from` itself
 * counts. A one-off pay has only its own day, so none once that has passed.
 */
export function nextPaydayOn(
  lastPayday: string,
  frequency: PayFrequency,
  from: string,
): string | null {
  if (frequency === 'once') return lastPayday >= from ? lastPayday : null;
  const anchorDay = parts(lastPayday)[2];
  let payday = lastPayday;
  for (let guard = 0; payday < from && guard < GUARD; guard += 1) {
    payday = advance(payday, frequency, anchorDay);
  }
  return payday;
}

/**
 * The day the next pay reminder is sent, `lead` days before a payday, or null when it never is.
 * On a given day the scheduler only looks at the next payday from then, so a reminder day that is
 * itself a payday, or comes before one, reminds about that nearer pay instead: weekly pay with a
 * week's lead never fires.
 */
export function paydayReminderOn(
  lastPayday: string,
  frequency: PayFrequency,
  lead: number,
  today: string,
): string | null {
  let previous: string | null = null;
  let payday = nextPaydayOn(lastPayday, frequency, today);
  // Every lead that can fire does so for one of the first two paydays.
  for (let step = 0; payday !== null && step < 3; step += 1) {
    const remind = shift(payday, -lead);
    if (remind >= today && (previous === null || remind > previous)) return remind;
    previous = payday;
    const next = nextPaydayOn(lastPayday, frequency, shift(payday, 1));
    if (next === null || next <= payday) return null;
    payday = next;
  }
  return null;
}

/**
 * The fewest days between two paydays, which a lead must stay under to ever fire. February puts 13
 * days between the 15th and its last day.
 */
const SHORTEST_GAP: Record<PayFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  semimonthly: 13,
  monthly: 28,
  once: Number.POSITIVE_INFINITY,
};

/**
 * Whether a reminder `lead` days before pay is sent for every payday when pay comes on all of these.
 * When it is not, it is sent at most once, before a last payday still to come, and never again.
 */
export function leadCanFire(lead: number, frequencies: readonly PayFrequency[]): boolean {
  return frequencies.every((frequency) => lead < SHORTEST_GAP[frequency]);
}
