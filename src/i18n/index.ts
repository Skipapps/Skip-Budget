import { CURRENCY_SYMBOL } from '@/i18n/config';
import { MESSAGES, type MessageKey } from '@/i18n/messages';
import {
  formatCompactMoney,
  formatMoney,
  formatNumber,
  formatPercent,
  numberStyle,
} from '@/i18n/number';
import { getLocaleSnapshot } from '@/i18n/store';
import { translate, type MessageParams } from '@/i18n/translate';

export type { MessageKey } from '@/i18n/messages';
export type { MessageParams } from '@/i18n/translate';
export { defineMessages } from '@/i18n/translate';
export { useLocale } from '@/i18n/store';

/**
 * A line in the language on screen. Call it while rendering, never at module scope: a constant
 * built at import would be frozen in whatever language the app opened in.
 */
export function t(key: MessageKey, params?: MessageParams): string {
  return translate(getLocaleSnapshot().language, MESSAGES, key, params);
}

export function money(amount: number, options?: { cents?: boolean }): string {
  const { language, currency } = getLocaleSnapshot();
  return formatMoney(amount, language, currency, options);
}

export function compactMoney(amount: number): string {
  const { language, currency } = getLocaleSnapshot();
  return formatCompactMoney(amount, language, currency);
}

export function percent(value: number, decimals?: number): string {
  return formatPercent(value, getLocaleSnapshot().language, decimals);
}

export function plainNumber(value: number, maxDecimals?: number): string {
  return formatNumber(value, getLocaleSnapshot().language, maxDecimals);
}

/** The mark and which side of the figure it sits on, for screens that draw the mark apart from the digits. */
export function currencyMark(): { symbol: string; after: boolean } {
  const { language, currency } = getLocaleSnapshot();
  return { symbol: CURRENCY_SYMBOL[currency], after: numberStyle(language).symbolAfter };
}

/** The decimal and grouping characters of the language on screen, for typed amounts. */
export function numberMarks(): { decimal: string; group: string } {
  const { decimal, group } = numberStyle(getLocaleSnapshot().language);
  return { decimal, group };
}
