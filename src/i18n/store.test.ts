import { money, t } from '@/i18n';
import {
  getLocaleSnapshot,
  hydrateLocale,
  refreshPhoneLocale,
  resetLocaleForTests,
  setCurrency,
  setLanguage,
  subscribeLocale,
} from '@/i18n/store';
import { formatCurrency } from '@/lib/format';

const mexico = [{ languageCode: 'es', regionCode: 'MX', languageRegionCode: 'MX' }];
const canadaFrench = [{ languageCode: 'fr', regionCode: 'CA', languageRegionCode: 'CA' }];

beforeEach(() => {
  resetLocaleForTests(mexico);
});

describe('defaults come from the phone', () => {
  it('opens a Spanish phone in Mexico in Spanish and pesos', () => {
    expect(getLocaleSnapshot()).toMatchObject({
      language: 'es',
      currency: 'MXN',
      chosenLanguage: null,
      chosenCurrency: null,
    });
  });

  it('opens a French phone in Canada in French and Canadian dollars', () => {
    resetLocaleForTests(canadaFrench);
    expect(getLocaleSnapshot()).toMatchObject({ language: 'fr', currency: 'CAD' });
    expect(t('locale.language.title')).toBe('Langue');
    expect(money(1234.5)).toBe('1 234,50 $');
  });
});

describe('a choice wins over the phone', () => {
  it('shows each choice at once, in words and in money', () => {
    setLanguage('en');
    setCurrency('GBP');

    expect(getLocaleSnapshot()).toMatchObject({ language: 'en', currency: 'GBP' });
    expect(t('locale.language.title')).toBe('Language');
    expect(formatCurrency(5)).toBe('£5.00');
  });

  it('takes a stored choice when hydrated, and is then ready', () => {
    expect(getLocaleSnapshot().ready).toBe(false);

    hydrateLocale({ language: 'fr', currency: 'AUD' });

    expect(getLocaleSnapshot()).toMatchObject({ language: 'fr', currency: 'AUD', ready: true });
  });

  it('is ready with nothing stored, and the phone decides', () => {
    hydrateLocale({ language: null, currency: null });
    expect(getLocaleSnapshot()).toMatchObject({ language: 'es', currency: 'MXN', ready: true });
  });

  it('goes back to following the phone when the choice is cleared', () => {
    setLanguage('en');
    setCurrency('USD');
    setLanguage(null);
    setCurrency(null);

    expect(getLocaleSnapshot()).toMatchObject({ language: 'es', currency: 'MXN' });
  });
});

describe('listeners', () => {
  it('hear a change once, and not a repeat of the same choice', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeLocale(listener);

    setCurrency('CAD');
    setCurrency('CAD');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setCurrency('GBP');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('see a new snapshot object only when something changed', () => {
    // The test phone reports en-US, so re-reading it must change nothing.
    resetLocaleForTests();
    const before = getLocaleSnapshot();
    refreshPhoneLocale();
    expect(getLocaleSnapshot()).toBe(before);

    setLanguage('fr');
    expect(getLocaleSnapshot()).not.toBe(before);
  });
});
