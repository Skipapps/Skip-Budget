import { isPaymentDay } from '@/lib/loan';

/**
 * The first payment of a loan added by hand, which the person picks as a date. Until they do, it is
 * a month after the start date on the start date's own day, clamped to the month's end: 27 Dec is
 * first due 27 Jan; 31 Jan is first due 28 Feb (29 Feb in a leap year) and stays a loan paid on the
 * 31st. Null when the start is not a date.
 */
export function defaultFirstPayment(startDate: Date): Date | null {
  if (Number.isNaN(startDate.getTime())) return null;
  return onDayOfMonth(startDate, 1, startDate.getDate());
}

/**
 * How far after the start a first payment can be picked. A year covers a lender's deferred first
 * payment (90 days, six months, "nothing to pay for a year") while catching a slip of the year in
 * the calendar.
 */
export const FIRST_PAYMENT_MONTHS_MAX = 12;

/** The last first payment the page takes: the start's day, a year on, clamped (29 Feb → 28 Feb). */
export function latestFirstPayment(startDate: Date): Date | null {
  if (Number.isNaN(startDate.getTime())) return null;
  return onDayOfMonth(startDate, FIRST_PAYMENT_MONTHS_MAX, startDate.getDate());
}

/** The earliest first payment: the day after the start, as the engine needs some days of interest. */
export function earliestFirstPayment(startDate: Date): Date | null {
  if (Number.isNaN(startDate.getTime())) return null;
  return new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1);
}

export type FirstPaymentProblem = 'not-after-start' | 'too-late';

/** Whether a first payment fits its start: after it, and no more than a year after it. */
export function firstPaymentProblem(startDate: Date, first: Date): FirstPaymentProblem | null {
  const earliest = earliestFirstPayment(startDate);
  const latest = latestFirstPayment(startDate);
  if (!earliest || !latest || Number.isNaN(first.getTime())) return null;
  const on = dayNumber(first);
  if (on < dayNumber(earliest)) return 'not-after-start';
  if (on > dayNumber(latest)) return 'too-late';
  return null;
}

/**
 * The last day of a month shorter than 31 days (28 or 29 Feb, 30 Apr): a first payment there does
 * not say on its own whether the loan is paid on that day or at every month's end.
 */
export function isShortMonthEnd(date: Date): boolean {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return last < 31 && date.getDate() === last;
}

/**
 * Whether later payments can fall on `paymentDay` after this first payment, as `paymentDates`
 * clamps it: the first payment's own day, or on a short month's last day a later day it stands for
 * (28 Feb can be the 28th, 29th, 30th or 31st, which is every month's end).
 */
export function paymentDayFits(first: Date, paymentDay: number): boolean {
  if (!isPaymentDay(paymentDay) || Number.isNaN(first.getTime())) return false;
  return paymentDay === first.getDate() || (isShortMonthEnd(first) && paymentDay > first.getDate());
}

/**
 * The payment days offered for a first payment on a short month's last day, in order: its own day,
 * the day it was set for when that is another (a 30 Jan start, first due 28 Feb, is a loan paid on
 * the 30th), and 31 for the last day of each month. Null when the date says the day on its own.
 */
export function paymentDayChoices(first: Date, setFor: number): number[] | null {
  if (Number.isNaN(first.getTime()) || !isShortMonthEnd(first)) return null;
  const own = first.getDate();
  const days = [own];
  if (paymentDayFits(first, setFor) && setFor !== own && setFor !== 31) days.push(setFor);
  days.push(31);
  return days;
}

/** A local day as a whole number, so a time of day or a clock change cannot decide a comparison. */
const dayNumber = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;

/** `date` moved by whole months, on `day` clamped to that month's end, at local midnight. */
function onDayOfMonth(date: Date, months: number, day: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const lastOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastOfMonth));
}
