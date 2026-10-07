import { CURRENCIES, LANGUAGES } from '@/i18n/config';
import { formatCompactMoney, formatMoney, formatNumber, formatPercent, NBSP } from '@/i18n/number';

describe('formatMoney', () => {
  it('writes each currency the way its readers expect', () => {
    expect(formatMoney(1234.56, 'en', 'USD')).toBe('$1,234.56');
    expect(formatMoney(1234.56, 'en', 'GBP')).toBe('£1,234.56');
    expect(formatMoney(1234.56, 'en', 'CAD')).toBe('$1,234.56');
    expect(formatMoney(1234.56, 'es', 'MXN')).toBe('$1,234.56');
    expect(formatMoney(1234.56, 'en', 'AUD')).toBe('$1,234.56');
  });

  it('writes French with a space between groups, a comma, and the mark after', () => {
    expect(formatMoney(1234.56, 'fr', 'CAD')).toBe(`1${NBSP}234,56${NBSP}$`);
    expect(formatMoney(1234567.5, 'fr', 'GBP')).toBe(`1${NBSP}234${NBSP}567,50${NBSP}£`);
    expect(formatMoney(-1234.56, 'fr', 'CAD')).toBe(`-1${NBSP}234,56${NBSP}$`);
    expect(formatMoney(1234.56, 'fr', 'MXN', { cents: false })).toBe(`1${NBSP}234${NBSP}$`);
  });

  it('writes Spanish the way Mexico and the US do', () => {
    expect(formatMoney(1234567.89, 'es', 'USD')).toBe('$1,234,567.89');
    expect(formatMoney(-0.5, 'es', 'MXN')).toBe('-$0.50');
  });

  it('keeps the cent rules in every language and currency', () => {
    for (const language of LANGUAGES) {
      for (const currency of CURRENCIES) {
        const plain = (amount: number, options?: { cents?: boolean }) =>
          formatMoney(amount, language, currency, options).replace(/[^\d,.\-]/g, '');

        // Half a cent posts away from zero, decided on the decimal meant, not the binary value.
        expect(plain(10.075)).toMatch(/^10[.,]08$/);
        expect(plain(-2.675)).toMatch(/^-2[.,]68$/);
        expect(plain(1.005)).toMatch(/^1[.,]01$/);
        // Never a minus in front of zero.
        expect(plain(-0.004)).toMatch(/^0[.,]00$/);
        expect(plain(-0)).toMatch(/^0[.,]00$/);
        expect(plain(-0.6, { cents: false })).toBe('0');
        // Dropping cents truncates; overstating a balance is the worse mistake.
        expect(plain(999.99, { cents: false })).toBe('999');
        // A broken figure is a dash, never "NaN".
        expect(formatMoney(NaN, language, currency)).toBe('—');
        expect(formatMoney(Infinity, language, currency)).toBe('—');
      }
    }
  });

  it('stays exact on large figures', () => {
    expect(formatMoney(9999999999.99, 'en', 'USD')).toBe('$9,999,999,999.99');
    expect(formatMoney(9999999999.99, 'fr', 'CAD')).toBe(
      `9${NBSP}999${NBSP}999${NBSP}999,99${NBSP}$`,
    );
  });
});

describe('formatNumber', () => {
  it('uses the language separators and trims trailing zeros', () => {
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5');
    expect(formatNumber(1234.5, 'fr')).toBe(`1${NBSP}234,5`);
    expect(formatNumber(1000, 'es')).toBe('1,000');
    expect(formatNumber(0.1, 'en')).toBe('0.1');
  });

  it('never shows a minus in front of zero', () => {
    expect(formatNumber(-0.001, 'en')).toBe('0');
    expect(formatNumber(-1.5, 'en')).toBe('-1.5');
    expect(formatNumber(NaN, 'en')).toBe('—');
  });
});

describe('formatPercent', () => {
  it('sets French apart from the figure and nobody else', () => {
    expect(formatPercent(8.14, 'en')).toBe('8.14%');
    expect(formatPercent(8.14, 'es')).toBe('8.14%');
    expect(formatPercent(8.14, 'fr')).toBe(`8,14${NBSP}%`);
    expect(formatPercent(8, 'en', 0)).toBe('8%');
    expect(formatPercent(0, 'fr')).toBe(`0,00${NBSP}%`);
    expect(formatPercent(NaN, 'en')).toBe('—');
  });

  it('never shows a minus in front of a rate that rounds to zero', () => {
    expect(formatPercent(-0.001, 'en')).toBe('0.00%');
    expect(formatPercent(-0.004, 'fr')).toBe(`0,00${NBSP}%`);
    expect(formatPercent(-0.5, 'en', 0)).toBe('-1%');
    expect(formatPercent(-1.25, 'en')).toBe('-1.25%');
  });
});

describe('formatCompactMoney', () => {
  it('collapses thousands for chart bars', () => {
    expect(formatCompactMoney(1500, 'en', 'USD')).toBe('$1.5k');
    expect(formatCompactMoney(12500, 'en', 'GBP')).toBe('£13k');
    expect(formatCompactMoney(1000, 'es', 'MXN')).toBe('$1.0k');
    expect(formatCompactMoney(1500, 'fr', 'CAD')).toBe(`1,5k${NBSP}$`);
  });

  it('rounds whole units below a thousand', () => {
    expect(formatCompactMoney(950.4, 'en', 'USD')).toBe('$950');
    expect(formatCompactMoney(999.5, 'en', 'USD')).toBe('$1.0k');
    expect(formatCompactMoney(9999, 'en', 'USD')).toBe('$10k');
    expect(formatCompactMoney(9949, 'en', 'USD')).toBe('$9.9k');
    expect(formatCompactMoney(10500, 'en', 'USD')).toBe('$11k');
    expect(formatCompactMoney(0, 'en', 'USD')).toBe('$0');
    expect(formatCompactMoney(-0.2, 'en', 'USD')).toBe('$0');
    expect(formatCompactMoney(NaN, 'en', 'USD')).toBe('—');
  });
});
