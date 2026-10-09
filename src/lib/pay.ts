import { dayAfter } from '@/lib/card-ledger';
import { paydaysInRange, type PayFrequency } from '@/lib/date';
import { roundMoney } from '@/lib/money';

/** Each schedule as a share of a month, so pays on different cycles add up; one-off pays are no schedule. */
const PER_MONTH: Record<PayFrequency, number> = {
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

/**
 * Where a salary's paydays are still worked out from its schedule rather than read off the record:
 * its last payday, or the day after the last pay written down, whichever is later. A pay on the
 * record keeps the amount it landed with, so a raise only changes what comes after it.
 */
export function payProjectionStart(
  lastPayday: string | null,
  lastRecorded: string | null,
): string | null {
  if (!lastPayday) return null;
  const after = lastRecorded ? dayAfter(lastRecorded) : null;
  return after && after > lastPayday ? after : lastPayday;
}

/** Paydays due by today that are not written down yet, oldest first, none before `floor`. */
export function unrecordedPaydays(
  pay: { frequency: PayFrequency; lastPayday: string | null },
  lastRecorded: string | null,
  floor: string,
  today: string,
): string[] {
  const projected = payProjectionStart(pay.lastPayday, lastRecorded);
  if (!projected || !pay.lastPayday) return [];
  const start = projected > floor ? projected : floor;
  if (start > today) return [];
  return paydaysInRange(new Date(`${pay.lastPayday}T00:00:00`), pay.frequency, start, today);
}

/** The account a pay lands in: the first of its linked accounts in the person's own account order. */
export function landingAccount(
  accountIds: readonly string[],
  accountOrder: readonly string[],
): string | null {
  return accountOrder.find((id) => accountIds.includes(id)) ?? null;
}
