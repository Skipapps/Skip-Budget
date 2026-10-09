import { monthShort } from '@/i18n/calendar';
import { getLocaleSnapshot } from '@/i18n/store';
import { toIsoDate } from '@/lib/date';

/**
 * A card's bill comes round on a day of the month. These mirror the reminder scheduler
 * (`next_month_day` and `due_on - lead_days = today` in the reminders_due migration), so the dates
 * a form promises are the dates the reminder is sent.
 */

/** A yyyy-mm-dd day as a local Date at midnight, not UTC (which would move it a day west of it). */
export const dayDate = (iso: string) => new Date(`${iso}T00:00:00`);

/** The day in a month, clamped to the month's length: the 31st is the 30th in April. */
function dayIn(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

/** yyyy-mm-dd of the next time `day` comes round, today included. */
export function nextDueOn(day: number, today: string): string {
  const from = dayDate(today);
  const thisMonth = day >= from.getDate();
  return toIsoDate(dayIn(from.getFullYear(), from.getMonth() + (thisMonth ? 0 : 1), day));
}

/** yyyy-mm-dd the next reminder is sent: the first due date, less the lead, that is not past. */
export function nextReminderOn(day: number, leadDays: number, today: string): string {
  const from = dayDate(today);
  // The first due date that can still be reminded about is at most two months out.
  for (let ahead = 0; ahead < 3; ahead += 1) {
    const due = dayIn(from.getFullYear(), from.getMonth() + ahead, day);
    const remind = new Date(due.getFullYear(), due.getMonth(), due.getDate() - leadDays);
    if (remind >= from) return toIsoDate(remind);
  }
  return toIsoDate(from);
}

/** "22nd" in English; the day itself in Spanish, and "1er" for the first in French. */
export function dayOrdinal(day: number): string {
  const { language } = getLocaleSnapshot();
  if (language === 'fr') return day === 1 ? '1er' : String(day);
  if (language === 'es') return String(day);
  const teen = day % 100 >= 11 && day % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10];
  return `${day}${suffix ?? 'th'}`;
}

/** The last days of a month that some months do not have. */
export const LATE_DAYS = 29;

/** "19 Oct": a day close enough that its year goes without saying. */
export function shortDay(iso: string): string {
  const date = dayDate(iso);
  return `${date.getDate()} ${monthShort(date.getMonth())}`;
}
