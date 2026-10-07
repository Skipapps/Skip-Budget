import { detectCurrency, detectLanguage, type PhoneLocale } from '@/i18n/detect';

const phone = (languageCode: string, regionCode: string, extra: Partial<PhoneLocale> = {}) => ({
  languageCode,
  regionCode,
  languageRegionCode: regionCode,
  currencyCode: null,
  ...extra,
});

describe('a phone implies a language and a currency', () => {
  it.each([
    ['a Spanish phone in Mexico', [phone('es', 'MX')], 'es', 'MXN'],
    ['a French phone in Canada', [phone('fr', 'CA')], 'fr', 'CAD'],
    ['an English phone in Canada', [phone('en', 'CA')], 'en', 'CAD'],
    ['an English phone in the UK', [phone('en', 'GB')], 'en', 'GBP'],
    ['an English phone in Australia', [phone('en', 'AU')], 'en', 'AUD'],
    ['an English phone in the US', [phone('en', 'US')], 'en', 'USD'],
    ['a Spanish phone in the US', [phone('es', 'US')], 'es', 'USD'],
    ['a French phone in the US', [phone('fr', 'US')], 'fr', 'USD'],
    ['an English phone set to Mexico', [phone('en', 'MX')], 'en', 'MXN'],
  ] as const)('%s', (_name, locales, language, currency) => {
    expect(detectLanguage(locales)).toBe(language);
    expect(detectCurrency(locales)).toBe(currency);
  });
});

describe('detectLanguage', () => {
  it('takes the first language on the list that the app speaks', () => {
    expect(detectLanguage([phone('de', 'DE'), phone('fr', 'DE')])).toBe('fr');
    expect(detectLanguage([phone('en', 'DE'), phone('fr', 'DE')])).toBe('en');
  });

  it('falls back to English for a language the app does not speak', () => {
    expect(detectLanguage([phone('de', 'DE')])).toBe('en');
    expect(detectLanguage([])).toBe('en');
    expect(detectLanguage([{ languageCode: null }])).toBe('en');
  });

  it('ignores case', () => {
    expect(detectLanguage([{ languageCode: 'ES' }])).toBe('es');
  });
});

describe('detectCurrency', () => {
  it('lets the Region setting win over the language', () => {
    expect(detectCurrency([phone('fr', 'US')])).toBe('USD');
    expect(detectCurrency([phone('es', 'AU')])).toBe('AUD');
  });

  it('uses the currency the phone reports when the region is not one of the five', () => {
    expect(detectCurrency([phone('en', 'PR', { currencyCode: 'USD' })])).toBe('USD');
    expect(detectCurrency([phone('en', 'IM', { currencyCode: 'GBP' })])).toBe('GBP');
    expect(detectCurrency([{ regionCode: null, currencyCode: 'cad' }])).toBe('CAD');
  });

  it('then uses the region inside the language, such as English (Australia)', () => {
    const locales = [phone('en', 'DE', { languageRegionCode: 'AU', currencyCode: 'EUR' })];
    expect(detectCurrency(locales)).toBe('AUD');
  });

  it('ends at dollars for anywhere else', () => {
    expect(detectCurrency([phone('de', 'DE', { currencyCode: 'EUR' })])).toBe('USD');
    expect(detectCurrency([])).toBe('USD');
  });
});
