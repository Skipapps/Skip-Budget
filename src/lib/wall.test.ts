import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { PRO_MONTHLY_LABEL, PRO_YEARLY_LABEL, proMonthlyLabel, proYearlyLabel } from '@/lib/wall';

/** The fallback Pro prices, written in the language on screen. */

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('the Pro price labels', () => {
  it('match the old English constants', () => {
    expect(proMonthlyLabel()).toBe(PRO_MONTHLY_LABEL);
    expect(proYearlyLabel()).toBe(PRO_YEARLY_LABEL);
  });

  it('name the period in Spanish and French, with each language’s figures', () => {
    setLanguage('es');
    expect(proMonthlyLabel()).toBe('$1.99/mes');
    expect(proYearlyLabel()).toBe('$19.99/año');

    setLanguage('fr');
    expect(proMonthlyLabel()).toBe('1,99 $/mois');
    expect(proYearlyLabel()).toBe('19,99 $/an');
  });

  it('stay a dollar price whatever currency the app shows', () => {
    setCurrency('GBP');
    expect(proMonthlyLabel()).toBe('$1.99/mo');
  });

  it('leave the old constants in English', () => {
    setLanguage('fr');
    expect(PRO_MONTHLY_LABEL).toBe('$1.99/mo');
    expect(PRO_YEARLY_LABEL).toBe('$19.99/yr');
  });
});
