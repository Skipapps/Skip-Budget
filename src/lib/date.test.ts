import {
  formatClock,
  formatDateRange,
  getDaysInMonth,
  getNextPayday,
  parseClock,
  paydaysInRange,
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

describe('toIsoDate', () => {
  it('uses the device day rather than the UTC one', () => {
    // Late evening west of Greenwich is already tomorrow in UTC.
    expect(toIsoDate(new Date(2026, 7, 28, 23, 30))).toBe('2026-08-28');
    expect(toIsoDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
});

describe('getNextPayday', () => {
  afterEach(() => jest.useRealTimers());

  it('lands today or later, however stale the last one', () => {
    const next = getNextPayday(on(2020, 1, 15), 'monthly');
    const now = new Date();
    expect(next.getTime()).toBeGreaterThanOrEqual(
      on(now.getFullYear(), now.getMonth() + 1, now.getDate()).getTime(),
    );
  });

  it('counts a payday that is today, as the reminder scheduler does', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 9, 10, 30) });
    expect(getNextPayday(on(2026, 10, 2), 'weekly')).toEqual(on(2026, 10, 9));
    expect(getNextPayday(on(2026, 9, 9), 'monthly')).toEqual(on(2026, 10, 9));
  });

  it('keeps monthly pay on its own day after a short month, as the scheduler does', () => {
    jest.useFakeTimers({ now: new Date(2026, 2, 5) });
    // Paid on the 31st: February's is the 28th, and March's the 31st again, not the 28th.
    expect(getNextPayday(on(2026, 1, 31), 'monthly')).toEqual(on(2026, 3, 31));
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

describe('a pay just this time', () => {
  it('has its own day as its only payday', () => {
    expect(getNextPayday(on(2026, 8, 14), 'once')).toEqual(on(2026, 8, 14));
  });

  it('lands once, on its day, when the window holds it', () => {
    expect(paydaysInRange(on(2026, 8, 14), 'once', '2026-08-01', '2026-08-31')).toEqual([
      '2026-08-14',
    ]);
    expect(paydaysInRange(on(2026, 8, 14), 'once', '2026-08-14', '2026-08-14')).toEqual([
      '2026-08-14',
    ]);
  });

  it('lands nowhere outside it, however long the window', () => {
    expect(paydaysInRange(on(2026, 8, 14), 'once', '2026-09-01', '2027-09-01')).toEqual([]);
    expect(paydaysInRange(on(2026, 8, 14), 'once', '2025-01-01', '2026-08-13')).toEqual([]);
  });
});
