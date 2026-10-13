/**
 * Whole-month steps for schedules that keep a day of the month: monthly, quarterly and yearly pay,
 * bills and subscriptions. Days are yyyy-mm-dd strings and the arithmetic is on the calendar, so no
 * timezone or DST change can move one.
 */

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * `iso` moved by whole months (back when negative), on `day` clamped to the month it lands in. The
 * day is passed in, never read off `iso`: stepping on from a date already shortened (the 28th of
 * February) would otherwise hold every later month to the 28th.
 */
export function shiftMonths(iso: string, months: number, day: number): string {
  const [year, month] = iso.split('-').map(Number);
  const index = year * 12 + (month - 1) + months;
  const toYear = Math.floor(index / 12);
  const toMonth = index - toYear * 12 + 1;
  return `${pad(toYear, 4)}-${pad(toMonth)}-${pad(Math.min(day, daysInMonth(toYear, toMonth)))}`;
}

/**
 * The day of the month a schedule keeps: its own anchor day, else the day of `iso`. A schedule
 * saved before it had an anchor day falls back to the day it was always walked from.
 */
export function anchorDayOf(iso: string, anchorDay?: number | null): number {
  if (
    typeof anchorDay === 'number' &&
    Number.isInteger(anchorDay) &&
    anchorDay >= 1 &&
    anchorDay <= 31
  ) {
    return anchorDay;
  }
  return Number(iso.slice(8, 10));
}
