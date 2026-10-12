import { isPaymentDay } from '@/lib/loan';

/**
 * The first payment of a loan added by hand: the payment day of the month after the start date when
 * that day is on or after the start's day, else of the month after that, so the first period is
 * never a few days long. 27 Dec with day 27 is first due 27 Jan; 28 Dec with day 2 waits for 2 Feb.
 *
 * The comparison is on the day asked for, not the day it clamps to: start 31 Jan with day 31 is
 * first due 28 Feb (29 Feb in a leap year), while day 30 is earlier than the 31st and waits for
 * 30 Mar. Null when the start is not a date or the day is not 1–31.
 */
export function firstPaymentOn(startDate: Date, paymentDay: number): Date | null {
  if (!isPaymentDay(paymentDay) || Number.isNaN(startDate.getTime())) return null;

  const monthsAhead = paymentDay >= startDate.getDate() ? 1 : 2;
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + monthsAhead;
  const lastOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(paymentDay, lastOfMonth));
}
