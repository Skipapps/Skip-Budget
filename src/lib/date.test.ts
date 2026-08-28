import { daysLeftInMonth, getDaysInMonth, getNextPayday, toIsoDate } from '@/lib/date';

/** Local-time construction, matching how the app builds dates from a picker. */
const on = (year: number, month: number, day: number) => new Date(year, month - 1, day);

describe('getDaysInMonth', () => {
  it('takes a zero-based month, the way Date does', () => {
    expect(getDaysInMonth(2026, 0)).toBe(31); // January
    expect(getDaysInMonth(2026, 1)).toBe(28); // February, common year
    expect(getDaysInMonth(2026, 7)).toBe(31); // August
    expect(getDaysInMonth(2026, 8)).toBe(30); // September
  });

  it('knows a leap February', () => {
    expect(getDaysInMonth(2028, 1)).toBe(29);
  });
});

describe('daysLeftInMonth', () => {
  it('counts to the end of the month it is actually in', () => {
    // The bug this guards: passing a one-based month measured September's
    // length from an August date, and reported two days left instead of three.
    expect(daysLeftInMonth(on(2026, 8, 28))).toBe(3);
  });

  it('is zero on the last day', () => {
    expect(daysLeftInMonth(on(2026, 8, 31))).toBe(0);
    expect(daysLeftInMonth(on(2026, 9, 30))).toBe(0);
  });

  it('handles short and leap months', () => {
    expect(daysLeftInMonth(on(2026, 2, 20))).toBe(8); // 28-day February
    expect(daysLeftInMonth(on(2028, 2, 20))).toBe(9); // leap February
  });

  it('never goes negative', () => {
    for (let month = 1; month <= 12; month += 1) {
      const last = getDaysInMonth(2026, month - 1);
      expect(daysLeftInMonth(on(2026, month, last))).toBe(0);
      expect(daysLeftInMonth(on(2026, month, 1))).toBe(last - 1);
    }
  });
});

describe('toIsoDate', () => {
  it('uses the device day rather than the UTC one', () => {
    // Late evening west of Greenwich is already tomorrow in UTC; a receipt
    // bought tonight must not be filed under tomorrow.
    expect(toIsoDate(new Date(2026, 7, 28, 23, 30))).toBe('2026-08-28');
    expect(toIsoDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
});

describe('getNextPayday', () => {
  it('always lands in the future, however stale the last one', () => {
    const next = getNextPayday(on(2020, 1, 15), 'monthly');
    expect(next.getTime()).toBeGreaterThan(Date.now());
  });
});
