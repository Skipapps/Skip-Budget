import {
  daysLeftInMonth,
  formatClock,
  formatDateRange,
  getDaysInMonth,
  getNextPayday,
  parseClock,
  toClockValue,
  toIsoDate,
} from '@/lib/date';

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

describe('formatDateRange', () => {
  it('names the month once when both ends share it', () => {
    expect(formatDateRange(on(2026, 8, 22), on(2026, 8, 28))).toBe('22 – 28 Aug 2026');
  });

  it('names both months when the span crosses one', () => {
    expect(formatDateRange(on(2026, 8, 29), on(2026, 9, 4))).toBe('29 Aug – 4 Sep 2026');
  });

  it('spells both ends out when the span crosses a year', () => {
    expect(formatDateRange(on(2026, 12, 28), on(2027, 1, 3))).toBe('28 Dec 2026 – 3 Jan 2027');
  });

  it('handles a single day at both ends', () => {
    expect(formatDateRange(on(2026, 8, 28), on(2026, 8, 28))).toBe('28 – 28 Aug 2026');
  });
});

describe('clock times', () => {
  it('reads what Postgres hands back', () => {
    expect(parseClock('09:00:00')).toEqual({ hour: 9, minute: 0 });
    expect(parseClock('21:30')).toEqual({ hour: 21, minute: 30 });
  });

  it('falls back to nine in the morning when there is nothing to read', () => {
    expect(parseClock(null)).toEqual({ hour: 9, minute: 0 });
    expect(parseClock('nonsense')).toEqual({ hour: 9, minute: 0 });
  });

  it('clamps a value outside the day', () => {
    expect(parseClock('99:99')).toEqual({ hour: 23, minute: 59 });
  });

  it('writes back the shape the column wants', () => {
    expect(toClockValue(9, 0)).toBe('09:00');
    expect(toClockValue(21, 5)).toBe('21:05');
  });

  it('says midnight and midday as twelve, not zero', () => {
    expect(formatClock(0, 0)).toBe('12:00 AM');
    expect(formatClock(12, 0)).toBe('12:00 PM');
    expect(formatClock(13, 30)).toBe('1:30 PM');
    expect(formatClock(9, 5)).toBe('9:05 AM');
  });
});
