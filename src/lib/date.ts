/**
 * Date labels without Intl.
 *
 * Same reasoning as the currency formatter: Hermes ships Intl inconsistently
 * across platforms, and a date that renders differently on iOS and Android is
 * a support problem. These are the only two vocabularies the UI needs.
 */
export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const pad = (value: number) => String(value).padStart(2, '0');

/** "Mon" / "04.05" for the day stepper. */
export function formatDayLabel(date: Date): { weekday: string; date: string } {
  return {
    weekday: WEEKDAYS_SHORT[date.getDay()],
    date: `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`,
  };
}

/** Shifts by whole days, leaving month/year rollover to the Date constructor. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** Days in a month — day 0 of the next month is the last day of this one. */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Weekday index (0 = Sunday) the month starts on, for grid padding. */
export function getFirstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** "4 May 2026" — for read-only date fields. */
export function formatFullDate(date: Date): string {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', caption: 'Each week' },
  { value: 'biweekly', label: 'Every 2 weeks', caption: 'Every 2 weeks' },
  { value: 'semimonthly', label: 'Twice a month', caption: 'Twice a month' },
  { value: 'monthly', label: 'Monthly', caption: 'Each month' },
] as const;

export type PayFrequency = (typeof PAY_FREQUENCIES)[number]['value'];

/** One pay cycle forward from `date`. */
function advanceOneCycle(date: Date, frequency: PayFrequency): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  switch (frequency) {
    case 'weekly':
      return addDays(date, 7);
    case 'biweekly':
      return addDays(date, 14);
    case 'semimonthly': {
      // Paid on the 15th and the last day of the month.
      const lastDay = getDaysInMonth(year, month);
      if (day < 15) return new Date(year, month, 15);
      if (day < lastDay) return new Date(year, month, lastDay);
      return new Date(year, month + 1, 15);
    }
    case 'monthly': {
      // Clamp so the 31st does not roll past a short month.
      const nextMonthDays = getDaysInMonth(year, month + 1);
      return new Date(year, month + 1, Math.min(day, nextMonthDays));
    }
  }
}

/**
 * Next payday strictly after today, walking forward from the last one. Rolling
 * forward rather than adding a single cycle means a stale last-pay-day still
 * produces a future date.
 */
export function getNextPayday(lastPayday: Date, frequency: PayFrequency): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let next = advanceOneCycle(lastPayday, frequency);
  // Bounded so a bad input cannot spin forever.
  for (let guard = 0; next <= today && guard < 400; guard += 1) {
    next = advanceOneCycle(next, frequency);
  }
  return next;
}

/**
 * yyyy-mm-dd in the device's own timezone.
 *
 * toISOString() would convert to UTC first, which silently moves a late-evening
 * purchase to the next day for anyone west of Greenwich.
 */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Every payday inside a window.
 *
 * Pay cycles do not match bill recurrences — "every 2 weeks" and "twice a
 * month" have no equivalent there — so income is projected with its own walker
 * rather than bent into the bill shape. Reuses advanceOneCycle, which already
 * knows that semimonthly means the 15th and the last day, and that monthly
 * clamps rather than rolling past a short month.
 */
export function paydaysInRange(
  lastPayday: Date,
  frequency: PayFrequency,
  from: string,
  to: string,
): string[] {
  const found: string[] = [];
  let cursor = new Date(lastPayday);

  // Walk back to the window, then forward across it. Bounded so a stale date
  // far in the past cannot spin.
  for (let guard = 0; guard < 500 && toIsoDate(cursor) > from; guard += 1) {
    const previous = new Date(cursor);
    switch (frequency) {
      case 'weekly':
        previous.setDate(previous.getDate() - 7);
        break;
      case 'biweekly':
        previous.setDate(previous.getDate() - 14);
        break;
      case 'semimonthly':
        previous.setDate(previous.getDate() < 16 ? 0 : 15);
        break;
      case 'monthly':
        previous.setMonth(previous.getMonth() - 1);
        break;
    }
    cursor = previous;
  }

  for (let guard = 0; guard < 500; guard += 1) {
    const key = toIsoDate(cursor);
    if (key > to) break;
    if (key >= from) found.push(key);
    cursor = advanceOneCycle(cursor, frequency);
  }

  return found;
}
