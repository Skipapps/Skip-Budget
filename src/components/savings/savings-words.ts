import { dayMonth } from '@/components/loans/day-month';
import { numberMarks, t } from '@/i18n';
import { monthLong, monthShort } from '@/i18n/calendar';
import { formatCurrency } from '@/lib/format';
import { toCents } from '@/lib/money';

/** An amount in whole units unless it has cents, so $3,060.47 is never drawn as $3,060. */
export function shortMoney(amount: number): string {
  return formatCurrency(amount, { cents: toCents(amount) % 100 !== 0 });
}

/**
 * The amount with its cents apart, for figures that draw the cents smaller: "$850" and ".00", or
 * "850" and ",00 $" in French. Split at the language's decimal mark, so the two always read back as
 * the whole figure.
 */
export function splitMoney(amount: number): { whole: string; cents: string } {
  const text = formatCurrency(amount);
  const at = text.lastIndexOf(numberMarks().decimal);
  if (at < 0) return { whole: text, cents: '' };
  return { whole: text.slice(0, at), cents: text.slice(at) };
}

/** The first letter upper-cased: Spanish and French months are lower-case inside a sentence only. */
export function capitalised(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** yyyy-mm-dd (or yyyy-mm) as a local date, never shifted a day by the time zone. */
function localDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day || 1);
}

/** "September", "Septiembre": a month on its own, as a row's name. */
export function monthName(iso: string): string {
  return capitalised(monthLong(localDate(iso).getMonth()));
}

/** "September", "septiembre": a month inside a sentence, in the case the language writes it there. */
export function monthInSentence(iso: string): string {
  return monthLong(localDate(iso).getMonth());
}

/** "September 2026", "Septiembre de 2026": a month page's title. */
export function monthTitle(iso: string): string {
  const date = localDate(iso);
  return capitalised(
    t('ui.calendar.monthYear', { month: monthLong(date.getMonth()), year: date.getFullYear() }),
  );
}

/** "Mar 2027", "mars 2027": a month inside a line, as goal dates are written. */
export function shortMonthYear(iso: string): string {
  const date = localDate(iso);
  return t('ui.calendar.monthYearShort', {
    month: monthShort(date.getMonth()),
    year: date.getFullYear(),
  });
}

/** "1 Nov": a day close enough that its year goes without saying. */
export function dayMonthText(iso: string): string {
  return dayMonth(localDate(iso));
}

/**
 * How a month's pay split between spending and what was left, in whole percent that add up to 100.
 * Worked in cents. A share that is there is never shown as 0%, and neither side reads 100% while
 * the other has something. Spending past the pay reads past 100% and leaves nothing. Null when
 * nothing was earned, since there is no whole to share.
 */
export function wentShares(earned: number, spent: number): { spent: number; left: number } | null {
  const pay = toCents(earned);
  const out = Math.max(0, toCents(spent));
  if (pay <= 0) return null;
  if (out >= pay) return { spent: Math.round((out * 100) / pay), left: 0 };
  let share = Math.round((out * 100) / pay);
  if (out > 0 && share === 0) share = 1;
  if (share === 100) share = 99;
  return { spent: share, left: 100 - share };
}

/** yyyy-mm-dd of the last day of a yyyy-mm: a goal "by Mar 2027" is due 2027-03-31. */
export function lastDayOfMonth(month: string): string {
  const [year, number] = month.split('-').map(Number);
  // Day 0 of the next month is the last of this one; UTC so no daylight-saving hour moves it.
  const day = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return `${month.slice(0, 7)}-${String(day).padStart(2, '0')}`;
}

/** yyyy-mm a number of months after a yyyy-mm. */
export function monthsAfter(month: string, count: number): string {
  const [year, number] = month.split('-').map(Number);
  const index = year * 12 + (number - 1) + count;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}
