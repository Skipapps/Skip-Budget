import type { PayFrequency } from '@/lib/date';
import { roundMoney } from '@/lib/money';

/**
 * Hourly pay, turned into the per-paycheck amount the rest of the app runs on.
 *
 * Every salary source stores one figure — what lands each payday — and the
 * balances, Left this month and Insights all read that. An hourly source is
 * only a different way of arriving at it: rate × hours, plus any overtime,
 * spread over the pay period, less what is taken out before it lands.
 */

/**
 * Weeks of work each paycheck covers. Twice-a-month and monthly pay do not
 * line up with weeks, so they take the year's average: 52 weeks over 24 or
 * 12 paychecks. That keeps the monthly total on the Salary page identical to
 * the one the fixed sources produce for the same yearly pay.
 */
export const WEEKS_PER_PAYCHECK: Record<PayFrequency, number> = {
  weekly: 1,
  biweekly: 2,
  semimonthly: 52 / 24,
  monthly: 52 / 12,
};

/** The two overtime rates US hourly work actually uses. */
export const OVERTIME_RATES = [
  { value: '1.5', label: 'Time and a half (1.5×)' },
  { value: '2', label: 'Double time (2×)' },
] as const;

export type HourlyPay = {
  /** Pay per hour, before tax. */
  rate: number;
  /** Regular hours in a typical week. */
  hoursPerWeek: number;
  /** Overtime hours in a typical week; 0 for none. */
  overtimeHoursPerWeek: number;
  /** What overtime pays per hour, as a multiple of the rate. */
  overtimeMultiplier: number;
  /** Tax and deductions taken out before it lands, 0–100. */
  deductionPercent: number;
  frequency: PayFrequency;
};

export type HourlyEstimate = {
  /** Before tax, for one typical week. */
  grossPerWeek: number;
  /** Before tax, for one paycheck. */
  grossPerPaycheck: number;
  /** What lands each payday — the amount the source stores. */
  takeHomePerPaycheck: number;
};

/** The most hours a week holds. Anything above is a typo, not a job. */
export const HOURS_IN_A_WEEK = 168;

/**
 * Why the hourly inputs cannot be turned into pay yet, or null when they can.
 * Worded for the person filling the form in.
 */
export function hourlyProblem(pay: HourlyPay): string | null {
  if (!(pay.rate > 0)) return 'Enter what you earn per hour.';
  if (!(pay.hoursPerWeek > 0)) return 'Enter how many hours you work in a typical week.';
  if (pay.overtimeHoursPerWeek < 0) return 'Overtime hours cannot be negative.';
  if (pay.hoursPerWeek + pay.overtimeHoursPerWeek > HOURS_IN_A_WEEK) {
    return `A week only has ${HOURS_IN_A_WEEK} hours — check the hours you entered.`;
  }
  if (pay.deductionPercent < 0 || pay.deductionPercent >= 100) {
    return 'Tax and deductions should be a percentage under 100.';
  }
  return null;
}

/**
 * The paycheck an hourly week adds up to, to the cent.
 *
 * Rounded once per figure shown, half away from zero (the same rule as every
 * other amount in the app), and the take-home is worked from the rounded
 * gross so the two numbers on screen always agree with each other.
 */
export function estimateHourlyPay(pay: HourlyPay): HourlyEstimate {
  const overtime = pay.overtimeHoursPerWeek > 0 ? pay.overtimeHoursPerWeek : 0;
  const weekly = pay.rate * pay.hoursPerWeek + pay.rate * pay.overtimeMultiplier * overtime;

  const grossPerWeek = roundMoney(weekly);
  const grossPerPaycheck = roundMoney(weekly * WEEKS_PER_PAYCHECK[pay.frequency]);
  const takeHomePerPaycheck = roundMoney(grossPerPaycheck * (1 - pay.deductionPercent / 100));

  return { grossPerWeek, grossPerPaycheck, takeHomePerPaycheck };
}
