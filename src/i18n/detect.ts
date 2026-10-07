import {
  currencyForRegion,
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  isCurrency,
  isLanguage,
  type CurrencyCode,
  type Language,
} from '@/i18n/config';

/** The part of expo-localization's Locale this needs, so tests need not build the whole object. */
export type PhoneLocale = {
  languageCode?: string | null;
  regionCode?: string | null;
  languageRegionCode?: string | null;
  currencyCode?: string | null;
};

/**
 * The first language on the phone's preference list that the app speaks. The list is in the order
 * the person ranked it, so a phone set to German then French opens in French, not English.
 */
export function detectLanguage(locales: readonly PhoneLocale[]): Language {
  for (const locale of locales) {
    const code = locale.languageCode?.toLowerCase();
    if (isLanguage(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * The phone's Region setting decides, not its language: an English phone set to Mexico is paid
 * in pesos, and a French phone set to the US is paid in dollars. Where the region is not one of
 * the five, the currency the phone reports is tried, then the region baked into the language
 * ("en-AU"), then dollars.
 */
export function detectCurrency(locales: readonly PhoneLocale[]): CurrencyCode {
  const first = locales[0];
  if (!first) return DEFAULT_CURRENCY;

  const byRegion = currencyForRegion(first.regionCode);
  if (byRegion) return byRegion;

  const reported = first.currencyCode?.toUpperCase();
  if (isCurrency(reported)) return reported;

  for (const locale of locales) {
    const byLanguageRegion = currencyForRegion(locale.languageRegionCode);
    if (byLanguageRegion) return byLanguageRegion;
  }

  return DEFAULT_CURRENCY;
}
