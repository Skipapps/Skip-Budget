export const LANGUAGES = ['en', 'es', 'fr'] as const;
export type Language = (typeof LANGUAGES)[number];

export const CURRENCIES = ['USD', 'GBP', 'CAD', 'MXN', 'AUD'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const COUNTRIES = ['US', 'GB', 'CA', 'MX', 'AU'] as const;
export type Country = (typeof COUNTRIES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';
export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

/** Each language in its own words, whatever language the app is showing, so a wrong pick can be undone. */
export const LANGUAGE_NATIVE_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
};

export const CURRENCY_COUNTRY: Record<CurrencyCode, Country> = {
  USD: 'US',
  GBP: 'GB',
  CAD: 'CA',
  MXN: 'MX',
  AUD: 'AU',
};

/**
 * The mark each currency is written with at home. Four of the five are a bare "$": the figure on
 * screen is always the chosen currency, so a prefix like "CA$" would only add noise. The pickers
 * show the ISO code beside the mark where the dollars must be told apart.
 */
export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  USD: '$',
  GBP: '£',
  CAD: '$',
  MXN: '$',
  AUD: '$',
};

const COUNTRY_CURRENCY: Record<Country, CurrencyCode> = {
  US: 'USD',
  GB: 'GBP',
  CA: 'CAD',
  MX: 'MXN',
  AU: 'AUD',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

/** The currency of a region code ("MX" to MXN), or null for a country the app has no currency for. */
export function currencyForRegion(region: string | null | undefined): CurrencyCode | null {
  const key = region?.toUpperCase();
  return key && key in COUNTRY_CURRENCY ? COUNTRY_CURRENCY[key as Country] : null;
}
