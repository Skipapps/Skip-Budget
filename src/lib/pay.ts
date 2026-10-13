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

export type PaySchedule = { frequency: PayFrequency; lastPayday: string | null };

/**
 * A salary's pay on the record: every `paid_on` day, or only the newest. Both give the same paydays,
 * since every payday worked out is after the newest, so only its month can already be paid.
 */
export type RecordedPay = readonly string[] | string | null;

function recordedDays(recorded: RecordedPay): readonly string[] {
  if (recorded === null) return [];
  return typeof recorded === 'string' ? [recorded] : recorded;
}

/**
 * The paydays inside a window (inclusive, yyyy-mm-dd) that the record does not hold: the schedule
 * from `payProjectionStart` on. Monthly pay comes once a month, so a month that already has a pay
 * on the record gets no second one on any day. A pay written on a shortened day (the 28th) stands
 * for its month when the schedule says the 30th, and a payday moved later into a month already
 * paid first counts the month after.
 */
export function projectedPaydays(
  pay: PaySchedule,
  recorded: RecordedPay,
  from: string,
  to: string,
): string[] {
  const days = recordedDays(recorded);
  const latest = days.reduce<string | null>((max, day) => (max && max >= day ? max : day), null);
  const projected = payProjectionStart(pay.lastPayday, latest);
  if (!projected || !pay.lastPayday) return [];
  const start = projected > from ? projected : from;
  if (start > to) return [];

  const paydays = paydaysInRange(new Date(`${pay.lastPayday}T00:00:00`), pay.frequency, start, to);
  if (pay.frequency !== 'monthly') return paydays;
  const paidMonths = new Set(days.map((day) => day.slice(0, 7)));
  return paydays.filter((day) => !paidMonths.has(day.slice(0, 7)));
}

/**
 * Paydays due by today that are not written down yet, oldest first, none before `floor`. The same
 * days the ledger projects up to today, so what is written down is what was shown.
 */
export function unrecordedPaydays(
  pay: PaySchedule,
  recorded: RecordedPay,
  floor: string,
  today: string,
): string[] {
  return projectedPaydays(pay, recorded, floor, today);
}

/** The account a pay lands in: the first of its linked accounts in the person's own account order. */
export function landingAccount(
  accountIds: readonly string[],
  accountOrder: readonly string[],
): string | null {
  return accountOrder.find((id) => accountIds.includes(id)) ?? null;
}
