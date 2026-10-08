import type { PayFrequency } from '@/lib/date';
import { roundMoney } from '@/lib/money';

/** Each schedule as a share of a month, so pays on different cycles add up; one-off pays are no schedule. */
export const PER_MONTH: Record<PayFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
  once: 0,
};

export type PayLine = { amount: number; frequency: PayFrequency; payday: string | null };

/** What the schedules bring in a month, one-off pays left out. */
export function scheduledPerMonth(pays: PayLine[]): number {
  return roundMoney(pays.reduce((sum, pay) => sum + pay.amount * PER_MONTH[pay.frequency], 0));
}

/** The one-off pays dated in the month holding `day` (yyyy-mm-dd). */
export function oneOffsInMonth(pays: PayLine[], day: string): PayLine[] {
  const month = day.slice(0, 7);
  return pays.filter((pay) => pay.frequency === 'once' && pay.payday?.slice(0, 7) === month);
}

/**
 * What the month holding `day` earns: the schedules plus that month's one-off pays. The same sum
 * the server keeps for the savings record (public.income_for_month).
 */
export function incomeForMonth(pays: PayLine[], day: string): number {
  const once = oneOffsInMonth(pays, day).reduce((sum, pay) => sum + pay.amount, 0);
  return roundMoney(scheduledPerMonth(pays) + once);
}
