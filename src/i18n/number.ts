import { CURRENCY_SYMBOL, type CurrencyCode, type Language } from '@/i18n/config';
import { toCents } from '@/lib/money';

/** A no-break space: French groups thousands and detaches the sign with one, and neither may wrap. */
export const NBSP = ' ';

export type NumberStyle = {
  group: string;
  decimal: string;
  /** French writes the mark after the figure ("1 234,56 $"); English and Spanish write it before. */
  symbolAfter: boolean;
  /** French sets "%" apart from the figure ("8,14 %"). */
  percentSpace: boolean;
};

/**
 * Hand-rolled because Hermes ships Intl inconsistently across platforms. Spanish follows Mexico and
 * the US (comma groups, point decimal), the only Spanish-speaking markets here; French follows
 * Canada.
 */
const STYLES: Record<Language, NumberStyle> = {
  en: { group: ',', decimal: '.', symbolAfter: false, percentSpace: false },
  es: { group: ',', decimal: '.', symbolAfter: false, percentSpace: false },
  fr: { group: NBSP, decimal: ',', symbolAfter: true, percentSpace: true },
};

export function numberStyle(language: Language): NumberStyle {
  return STYLES[language];
}

export function groupDigits(whole: string, separator: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export type MoneyOptions = { cents?: boolean };

/**
 * Cents are rounded the way src/lib/money.ts posts them, so a figure shown is the figure stored.
 * Exact to the cent up to 9,999,999,999.99, the 12 significant digits toCents decides the half on.
 */
export function formatMoney(
  amount: number,
  language: Language,
  currency: CurrencyCode,
  options?: MoneyOptions,
): string {
  const showCents = options?.cents ?? true;

  // Without this the concatenation below yields "$NaN.undefined", which reads as a corrupted balance.
  if (!Number.isFinite(amount)) return '—';

  const style = STYLES[language];

  // Built from whole cents (half away from zero). toFixed(2) would round the binary value, so
  // 10.075 (stored as 10.07499…) would show 10.07 where every other figure says 10.08.
  const cents = Math.abs(toCents(amount));
  const whole = String(Math.floor(cents / 100));
  const fraction = String(cents % 100).padStart(2, '0');

  // The sign is decided after rounding: minus a third of a cent is zero, and a minus there
  // would read as a debt and be drawn in the money-out colour.
  const shown = showCents ? Number(whole) + Number(fraction) : Number(whole);
  const sign = amount < 0 && shown > 0 ? '-' : '';

  const body = `${groupDigits(whole, style.group)}${showCents ? `${style.decimal}${fraction}` : ''}`;
  const symbol = CURRENCY_SYMBOL[currency];

  return style.symbolAfter ? `${sign}${body}${NBSP}${symbol}` : `${sign}${symbol}${body}`;
}

/** A plain figure with the language's separators: "1,234.5" in English, "1 234,5" in French. */
export function formatNumber(value: number, language: Language, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return '—';

  const style = STYLES[language];
  const fixed = Math.abs(value).toFixed(maxDecimals);
  const [whole, fraction = ''] = fixed.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  const sign = value < 0 && Number(fixed) !== 0 ? '-' : '';

  return `${sign}${groupDigits(whole, style.group)}${trimmed ? `${style.decimal}${trimmed}` : ''}`;
}

/** A rate to a fixed number of decimals: "8.14%" in English, "8,14 %" in French. */
export function formatPercent(value: number, language: Language, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';

  const style = STYLES[language];
  // As with money, the sign is decided after rounding: -0.001 at two decimals is a plain 0.00.
  const rounded = value.toFixed(decimals);
  const fixed = Number(rounded) === 0 ? rounded.replace('-', '') : rounded;
  const [whole, fraction] = fixed.split('.');
  const figure = fraction === undefined ? whole : `${whole}${style.decimal}${fraction}`;

  return `${figure}${style.percentSpace ? NBSP : ''}%`;
}

/**
 * A figure short enough to sit on a chart bar: "$1.5k" in English, "1,5k $" in French, whole
 * units below a thousand. Rounds rather than truncates, and is only for labels where precision is
 * not the point; every balance goes through formatMoney.
 */
export function formatCompactMoney(
  amount: number,
  language: Language,
  currency: CurrencyCode,
): string {
  if (!Number.isFinite(amount)) return '—';

  const style = STYLES[language];
  const symbol = CURRENCY_SYMBOL[currency];
  const abs = Math.abs(amount);

  let body: string;
  if (Math.round(abs) >= 1000) {
    const thousands = abs / 1000;
    // 9,999 is "10k", not "10.0k": the tenths are rounded first and 10 or more drops them.
    const tenths = Math.round(thousands * 10) / 10;
    body = `${tenths >= 10 ? Math.round(thousands) : tenths.toFixed(1).replace('.', style.decimal)}k`;
  } else {
    body = String(Math.round(abs));
  }

  const sign = amount < 0 && body !== '0' ? '-' : '';
  return style.symbolAfter ? `${sign}${body}${NBSP}${symbol}` : `${sign}${symbol}${body}`;
}
