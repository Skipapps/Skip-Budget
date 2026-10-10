import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import {
  FREE_LIMITS,
  PRO_MONTHLY_LABEL,
  PRO_YEARLY_LABEL,
  proMonthlyLabel,
  proYearlyLabel,
} from '@/lib/wall';

/** The fallback Pro prices, written in the language on screen; and what the free plan counts. */

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('the free plan', () => {
  it('keeps one card and one account, and counts no pay at all', () => {
    expect(FREE_LIMITS).toEqual({
      cards: 1,
      bankAccounts: 1,
      scansPerMonth: 15,
      uploadsPerMonth: 15,
    });
    expect(Object.keys(FREE_LIMITS).some((key) => /income|salary|pay/i.test(key))).toBe(false);
  });
});

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

  it('say US dollars out loud when the app shows another currency', () => {
    setCurrency('GBP');
    expect(proMonthlyLabel()).toBe('US$1.99/mo');
    expect(proYearlyLabel()).toBe('US$19.99/yr');

    setCurrency('MXN');
    setLanguage('es');
    expect(proMonthlyLabel()).toBe('US$1.99/mes');

    setCurrency('CAD');
    setLanguage('fr');
    expect(proMonthlyLabel()).toBe('1,99\u00A0$\u00A0US/mois');
    expect(proYearlyLabel()).toBe('19,99\u00A0$\u00A0US/an');
  });

  it('stay a plain dollar price in US dollars', () => {
    setCurrency('USD');
    expect(proMonthlyLabel()).toBe('$1.99/mo');
  });

  it('leave the old constants in English', () => {
    setLanguage('fr');
    expect(PRO_MONTHLY_LABEL).toBe('$1.99/mo');
    expect(PRO_YEARLY_LABEL).toBe('$19.99/yr');
  });
});
