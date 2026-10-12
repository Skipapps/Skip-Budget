import { loanRateText } from '@/components/calculators/schedule-card';
import { t } from '@/i18n';
import { monthShort } from '@/i18n/calendar';

/** yyyy-mm-dd as a local date, never shifted a day by the time zone. */
export function localDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day || 1);
}

/** "4 yrs", "2 yrs 6 mos", "9 mos": a term shortened to sit on a line under a loan's name. */
export function loanTermShortText(months: number): string {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (years === 0) return t('loan.term.monthsShort', { count: remainder });
  if (remainder === 0) return t('loan.term.yearsShort', { count: years });
  return t('loan.term.yearsMonths', {
    years: t('loan.term.yearsShort', { count: years }),
    months: t('loan.term.monthsShort', { count: remainder }),
  });
}

/**
 * "Dec 2024": the month a loan started, drawn and read out alike, in the short month every date
 * VoiceOver reads on the page uses ("27 Oct 2026").
 */
export function startedMonthText(iso: string): string {
  const date = localDate(iso);
  return t('ui.calendar.monthYearShort', {
    month: monthShort(date.getMonth()),
    year: date.getFullYear(),
  });
}

export type RateRange = { min: number; max: number };

/** "6.25% – 7.50%", or the one rate when every loan has the same. */
export function rateRangeText(range: RateRange): string {
  if (range.min === range.max) return loanRateText(range.min);
  return t('loan.list.rateRange', { min: loanRateText(range.min), max: loanRateText(range.max) });
}

/** The rate or rates, as a sentence for VoiceOver. */
export function rateRangeSpoken(range: RateRange): string {
  if (range.min === range.max) return t('loan.list.rateA11y', { rate: loanRateText(range.min) });
  return t('loan.list.ratesA11y', {
    min: loanRateText(range.min),
    max: loanRateText(range.max),
  });
}
