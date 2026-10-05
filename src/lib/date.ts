/** Date labels without Intl, which Hermes ships inconsistently across platforms. */
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

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const pad = (value: number) => String(value).padStart(2, '0');

/** "Mon" / "04.05" for the day stepper. */
export function formatDayLabel(date: Date): { weekday: string; date: string } {
  return {
    weekday: WEEKDAYS_SHORT[date.getDay()],
    date: `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`,
  };
}

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
 * Next payday strictly after today, walking forward from the last one, so a stale last-pay-day
 * still produces a future date.
 */
export function getNextPayday(lastPayday: Date, frequency: PayFrequency): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let next = advanceOneCycle(lastPayday, frequency);
  for (let guard = 0; next <= today && guard < 400; guard += 1) {
    next = advanceOneCycle(next, frequency);
  }
  return next;
}

/**
 * yyyy-mm-dd in the device's own timezone. toISOString() converts to UTC first, which moves a
 * late-evening purchase to the next day for anyone west of Greenwich.
 */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Every payday inside a window (inclusive, yyyy-mm-dd). Pay cycles do not map onto bill
 * recurrences, so income is projected with its own walker built on advanceOneCycle.
 */
export function paydaysInRange(
  lastPayday: Date,
  frequency: PayFrequency,
  from: string,
  to: string,
): string[] {
  const found: string[] = [];
  let cursor = new Date(lastPayday);

  // Walk back to the window, then forward across it. Bounded so a stale date cannot spin.
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

/** "Today" / "Yesterday" / "Tomorrow", otherwise the full date. */
export function formatRelativeDay(iso: string, today: string): string {
  if (!iso) return 'No date yet';
  if (iso === today) return 'Today';

  const date = new Date(`${iso}T00:00:00`);
  const reference = new Date(`${today}T00:00:00`);
  const days = Math.round((date.getTime() - reference.getTime()) / 86_400_000);

  if (days === -1) return 'Yesterday';
  if (days === 1) return 'Tomorrow';
  return formatFullDate(date);
}

/**
 * Whole days left in the month after today. getDaysInMonth takes a zero-based month, so
 * getMonth() goes straight through; adding one would measure the next month.
 */
export function daysLeftInMonth(today: Date): number {
  return getDaysInMonth(today.getFullYear(), today.getMonth()) - today.getDate();
}

/** Collapses what the two ends share: "22 – 28 Aug 2026", not "22 Aug 2026 – 28 Aug 2026". */
export function formatDateRange(from: Date, to: Date): string {
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();

  if (sameMonth) {
    return `${from.getDate()} – ${to.getDate()} ${MONTHS_SHORT[to.getMonth()]} ${to.getFullYear()}`;
  }
  if (sameYear) {
    return (
      `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]} – ` +
      `${to.getDate()} ${MONTHS_SHORT[to.getMonth()]} ${to.getFullYear()}`
    );
  }
  return `${formatFullDate(from)} – ${formatFullDate(to)}`;
}

/**
 * Parses a Postgres `time` ("09:00:00") into hours and minutes. Times of day stay plain values,
 * not Dates: attaching one to a date invites a timezone conversion that would move it.
 */
export function parseClock(value: string | null | undefined): { hour: number; minute: number } {
  const [rawHour, rawMinute] = (value ?? '09:00').split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  return {
    hour: Number.isFinite(hour) ? Math.min(Math.max(hour, 0), 23) : 9,
    minute: Number.isFinite(minute) ? Math.min(Math.max(minute, 0), 59) : 0,
  };
}

/** "09:00" — what goes back into the column. */
export function toClockValue(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

/** "9:00 AM" — how a time is read out loud. */
export function formatClock(hour: number, minute: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  // 0 and 12 both show as 12: midnight and midday.
  const shown = hour % 12 === 0 ? 12 : hour % 12;
  return `${shown}:${pad(minute)} ${period}`;
}
