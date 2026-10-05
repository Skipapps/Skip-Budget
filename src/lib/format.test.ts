import { formatCurrency } from '@/lib/format';

describe('formatCurrency', () => {
  it('formats the ordinary cases', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(7.5)).toBe('$7.50');
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
  });

  it('groups thousands however large the figure', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    expect(formatCurrency(1234567890.12)).toBe('$1,234,567,890.12');
  });

  it('drops the cents when asked, which the card faces rely on', () => {
    expect(formatCurrency(1234.56, { cents: false })).toBe('$1,234');
    expect(formatCurrency(-950, { cents: false })).toBe('-$950');
    // Deliberately truncates rather than rounds: $999.99 reads as $999, never
    // as $1,000. Overstating a balance is the worse of the two mistakes.
    expect(formatCurrency(999.99, { cents: false })).toBe('$999');
  });

  it('never shows a minus in front of zero', () => {
    // A third of a cent below zero displays as $0.00; a minus sign there reads
    // as a debt that is not there, and colours it as money going out.
    expect(formatCurrency(-0.004)).toBe('$0.00');
    expect(formatCurrency(-0)).toBe('$0.00');
    expect(formatCurrency(-0.6, { cents: false })).toBe('$0');
  });

  it('still signs anything that rounds away from zero', () => {
    expect(formatCurrency(-0.01)).toBe('-$0.01');
    expect(formatCurrency(-0.006)).toBe('-$0.01');
  });

  // Half a cent posts the way money.ts posts it: away from zero, decided on the
  // decimal the arithmetic meant. toFixed(2) used to decide it on the binary
  // value, so 10.075 (stored as 10.07499…) showed as $10.07. Hand-rounded.
  it('rounds half a cent away from zero, as money.ts does', () => {
    expect(formatCurrency(1.005)).toBe('$1.01');
    expect(formatCurrency(10.075)).toBe('$10.08');
    expect(formatCurrency(2.675)).toBe('$2.68');
    expect(formatCurrency(0.005)).toBe('$0.01');
    expect(formatCurrency(1.004)).toBe('$1.00');
  });

  it('rounds a negative half away from zero too, minus sign kept', () => {
    expect(formatCurrency(-1.005)).toBe('-$1.01');
    expect(formatCurrency(-10.075)).toBe('-$10.08');
    expect(formatCurrency(-2.675)).toBe('-$2.68');
    expect(formatCurrency(-0.005)).toBe('-$0.01');
  });

  it('shows zero and minus zero the same way, with or without cents', () => {
    expect(formatCurrency(-0)).toBe('$0.00');
    expect(formatCurrency(-0, { cents: false })).toBe('$0');
    expect(formatCurrency(0.004)).toBe('$0.00');
    expect(formatCurrency(-0.0049)).toBe('$0.00');
  });

  it('stays exact on large figures', () => {
    expect(formatCurrency(1000000.0)).toBe('$1,000,000.00');
    expect(formatCurrency(-1000000.01)).toBe('-$1,000,000.01');
    expect(formatCurrency(999999.995)).toBe('$1,000,000.00');
    expect(formatCurrency(9999999999.99)).toBe('$9,999,999,999.99');
    expect(formatCurrency(1000000, { cents: false })).toBe('$1,000,000');
  });

  it('posts the cents first, then truncates them when they are dropped', () => {
    expect(formatCurrency(10.075, { cents: false })).toBe('$10');
    // −999.995 posts as −$1,000.00, so the face shows −$1,000, not −$999.
    expect(formatCurrency(-999.995, { cents: false })).toBe('-$1,000');
  });

  it('refuses to render a figure that is not a number', () => {
    // "$NaN.undefined" on a balance looks like corrupted data rather than a
    // calculation that failed.
    expect(formatCurrency(NaN)).toBe('—');
    expect(formatCurrency(Infinity)).toBe('—');
    expect(formatCurrency(-Infinity)).toBe('—');
  });
});
