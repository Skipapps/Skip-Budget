import { t } from '@/i18n';
import type { PayFrequency } from '@/lib/date';
import { roundMoney } from '@/lib/money';

/**
 * Weeks of work each paycheck covers. Twice-a-month and monthly pay take the year's average
 * (52 weeks over 24 or 12 paychecks), matching the monthly total fixed sources give for the same
 * yearly pay.
 */
export const WEEKS_PER_PAYCHECK: Record<PayFrequency, number> = {
  weekly: 1,
  biweekly: 2,
  semimonthly: 52 / 24,
  monthly: 52 / 12,
  // A one-off pay covers exactly the hours given for it.
  once: 1,
};

/** Labels are read when drawn, never at import, so they follow the language on screen. */
export const OVERTIME_RATES = [
  {
    value: '1.5',
    get label() {
      return t('lib.hourly.timeAndAHalf');
    },
  },
  {
    value: '2',
    get label() {
      return t('lib.hourly.doubleTime');
    },
  },
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

/** Why the hourly inputs cannot be turned into pay yet (worded for the form), or null when they can. */
export function hourlyProblem(pay: HourlyPay): string | null {
  if (!(pay.rate > 0)) return t('lib.hourly.enterRate');
  if (!(pay.hoursPerWeek > 0)) return t('lib.hourly.enterHours');
  if (pay.overtimeHoursPerWeek < 0) return t('lib.hourly.negativeOvertime');
  if (pay.hoursPerWeek + pay.overtimeHoursPerWeek > HOURS_IN_A_WEEK) {
    return t('lib.hourly.tooManyHours', { hours: HOURS_IN_A_WEEK });
  }
  if (pay.deductionPercent < 0 || pay.deductionPercent >= 100) {
    return t('lib.hourly.deductions');
  }
  return null;
}

/**
 * The paycheck an hourly week adds up to. Each figure is rounded once, half away from zero, and
 * take-home is worked from the rounded gross so the two on screen agree.
 */
export function estimateHourlyPay(pay: HourlyPay): HourlyEstimate {
  const overtime = pay.overtimeHoursPerWeek > 0 ? pay.overtimeHoursPerWeek : 0;
  const weekly = pay.rate * pay.hoursPerWeek + pay.rate * pay.overtimeMultiplier * overtime;

  const grossPerWeek = roundMoney(weekly);
  const grossPerPaycheck = roundMoney(weekly * WEEKS_PER_PAYCHECK[pay.frequency]);
  const takeHomePerPaycheck = roundMoney(grossPerPaycheck * (1 - pay.deductionPercent / 100));

  return { grossPerWeek, grossPerPaycheck, takeHomePerPaycheck };
}
