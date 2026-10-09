import { clockText, monthShort, weekdayShort } from '@/i18n/calendar';
import { t } from '@/i18n';

// Date labels without Intl, which Hermes ships inconsistently across platforms.

const pad = (value: number) => String(value).padStart(2, '0');

/** "Mon" / "04.05" for the day stepper. */
export function formatDayLabel(date: Date): { weekday: string; date: string } {
  return {
    weekday: weekdayShort(date.getDay()),
    date: `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`,
  };
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

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
  return `${date.getDate()} ${monthShort(date.getMonth())} ${date.getFullYear()}`;
}

/** Labels are read when drawn, never at import, so they follow the language on screen. */
export const PAY_FREQUENCIES = [
  {
    value: 'weekly',
    get label() {
      return t('dates.weekly');
    },
    get caption() {
      return t('dates.weeklyCaption');
    },
  },
  {
    value: 'biweekly',
    get label() {
      return t('dates.biweekly');
    },
    get caption() {
      return t('dates.biweeklyCaption');
    },
  },
  {
    value: 'semimonthly',
    get label() {
      return t('dates.semimonthly');
    },
    get caption() {
      return t('dates.semimonthlyCaption');
    },
  },
  {
    value: 'monthly',
    get label() {
      return t('dates.monthly');
    },
    get caption() {
      return t('dates.monthlyCaption');
    },
  },
  {
    // Not a schedule: one pay on one day, for work that pays differently each time.
    value: 'once',
    get label() {
      return t('dates.once');
    },
    get caption() {
      return t('dates.onceCaption');
    },
  },
] as const;

export type PayFrequency = (typeof PAY_FREQUENCIES)[number]['value'];

/** The cycles a pay can repeat on: every choice but a one-off pay, for pages that set up a schedule. */
export const PAY_SCHEDULES = PAY_FREQUENCIES.filter((option) => option.value !== 'once');

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
    case 'once':
      // No cycle: a one-off pay is its own day, which the callers below return before walking.
      return date;
  }
}

/**
 * Next payday strictly after today, walking forward from the last one, so a stale last-pay-day
 * still produces a future date.
 */
export function getNextPayday(lastPayday: Date, frequency: PayFrequency): Date {
  // A one-off pay's only payday is its own.
  if (frequency === 'once') return lastPayday;
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
  if (frequency === 'once') {
    const day = toIsoDate(lastPayday);
    return day >= from && day <= to ? [day] : [];
  }

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
  if (!iso) return t('dates.noDate');
  if (iso === today) return t('dates.today');

  const date = new Date(`${iso}T00:00:00`);
  const reference = new Date(`${today}T00:00:00`);
  const days = Math.round((date.getTime() - reference.getTime()) / 86_400_000);

  if (days === -1) return t('dates.yesterday');
  if (days === 1) return t('dates.tomorrow');
  return formatFullDate(date);
}

/** Collapses what the two ends share: "22 – 28 Aug 2026", not "22 Aug 2026 – 28 Aug 2026". */
export function formatDateRange(from: Date, to: Date): string {
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();

  if (sameMonth) {
    return `${from.getDate()} – ${to.getDate()} ${monthShort(to.getMonth())} ${to.getFullYear()}`;
  }
  if (sameYear) {
    return (
      `${from.getDate()} ${monthShort(from.getMonth())} – ` +
      `${to.getDate()} ${monthShort(to.getMonth())} ${to.getFullYear()}`
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

/** "9:00 AM", "9:00 a. m.", "9 h 00" — how a time is read out loud. */
export function formatClock(hour: number, minute: number): string {
  return clockText(hour, minute);
}
