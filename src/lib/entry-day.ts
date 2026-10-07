import { t } from '@/i18n';
import { monthShort, weekdayShort } from '@/i18n/calendar';
import { addDays, toIsoDate } from '@/lib/date';
import { toCents } from '@/lib/money';

/** Which of the date chips a day is, if any. */
export type DayChoice = 'today' | 'yesterday' | 'other';

/** Compared as calendar days, so a time of day cannot decide it. */
export function dayChoice(date: Date, today: Date): DayChoice {
  const key = toIsoDate(date);
  if (key === toIsoDate(today)) return 'today';
  if (key === toIsoDate(addDays(today, -1))) return 'yesterday';
  return 'other';
}

/** The day a chip stands for. Midnight, the way every form holds its dates. */
export function dayFor(choice: Exclude<DayChoice, 'other'>, today: Date): Date {
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return choice === 'today' ? midnight : addDays(midnight, -1);
}

/**
 * "Yesterday, Tue Oct 6": the relative word when there is one, then the day, in the language on
 * screen and in its own order ("mar 6 oct" in Spanish).
 */
export function formatEntryDay(date: Date, today: Date): string {
  const day = t('entry.day', {
    weekday: weekdayShort(date.getDay()),
    month: monthShort(date.getMonth()),
    day: String(date.getDate()),
  });
  const choice = dayChoice(date, today);
  if (choice === 'other') return day;
  return t('entry.dayRelative', {
    relative: t(choice === 'today' ? 'dates.today' : 'dates.yesterday'),
    day,
  });
}

/**
 * A typed amount as the page draws it: whole cents, two decimals, no commas ("12.5" is "12.50").
 * Null for anything that is not a positive amount, so an unset amount is never drawn as $0.
 */
export function amountForDisplay(raw: string): string | null {
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value <= 0) return null;
  const cents = toCents(value);
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
