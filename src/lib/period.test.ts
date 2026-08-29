import {
  PERIODS,
  isEarliestPeriod,
  isLatestPeriod,
  periodBuckets,
  periodLabel,
  periodRange,
  stepPeriod,
} from '@/lib/period';

const on = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe('periodRange', () => {
  it('runs a week Sunday to Saturday whatever day you are on', () => {
    // 28 Aug 2026 is a Friday; its week is 23–29.
    for (const day of [23, 25, 28, 29]) {
      expect(periodRange('week', on(2026, 8, day))).toEqual({
        from: '2026-08-23',
        to: '2026-08-29',
      });
    }
  });

  it('runs a month from the first to the last, short months included', () => {
    expect(periodRange('month', on(2026, 8, 28))).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(periodRange('month', on(2026, 2, 10))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(periodRange('month', on(2028, 2, 10))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('runs a year January to December', () => {
    expect(periodRange('year', on(2026, 8, 28))).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
});

describe('stepPeriod', () => {
  it('moves a week at a time', () => {
    expect(periodRange('week', stepPeriod('week', on(2026, 8, 28), -1)).from).toBe('2026-08-16');
    expect(periodRange('week', stepPeriod('week', on(2026, 8, 28), 1)).from).toBe('2026-08-30');
  });

  it('moves a month without skidding off a short one', () => {
    // From the 31st, stepping back must land in February, not March.
    expect(periodRange('month', stepPeriod('month', on(2026, 3, 31), -1)).from).toBe('2026-02-01');
  });

  it('moves a year', () => {
    expect(periodLabel('year', stepPeriod('year', on(2026, 8, 28), -1))).toBe('2025');
  });
});

describe('periodBuckets', () => {
  it('reads a week as its seven days', () => {
    const buckets = periodBuckets('week', on(2026, 8, 28));
    expect(buckets).toHaveLength(7);
    expect(buckets[0].label).toBe('23 Sun');
    expect(buckets[6].label).toBe('29 Sat');
    expect(buckets[0].from).toBe('2026-08-23');
  });

  it('reads a month as its weeks, clipped to the month', () => {
    const buckets = periodBuckets('month', on(2026, 8, 28));
    // Never borrows days from the neighbouring months.
    expect(buckets[0].from).toBe('2026-08-01');
    expect(buckets[buckets.length - 1].to).toBe('2026-08-31');
    for (const bucket of buckets) {
      expect(bucket.from >= '2026-08-01').toBe(true);
      expect(bucket.to <= '2026-08-31').toBe(true);
    }
  });

  it('reads a year as twelve months', () => {
    const buckets = periodBuckets('year', on(2026, 8, 28));
    expect(buckets).toHaveLength(12);
    expect(buckets[0].label).toBe('Jan');
    expect(buckets[11].label).toBe('Dec');
    expect(buckets[11].to).toBe('2026-12-31');
  });

  it('covers the whole period with no day left out or counted twice', () => {
    // Every period there is, so adding one cannot skip this check.
    for (const key of PERIODS.map((period) => period.value)) {
      const buckets = periodBuckets(key, on(2026, 8, 28));
      const range = periodRange(key, on(2026, 8, 28));
      expect(buckets[0].from).toBe(range.from);
      expect(buckets[buckets.length - 1].to).toBe(range.to);
      for (let i = 1; i < buckets.length; i += 1) {
        expect(buckets[i - 1].to < buckets[i].from).toBe(true);
      }
    }
  });
});

describe('stepping bounds', () => {
  const today = on(2026, 8, 28);

  it('stops going forward at the period holding today', () => {
    expect(isLatestPeriod('week', today, today)).toBe(true);
    expect(isLatestPeriod('week', stepPeriod('week', today, -1), today)).toBe(false);
    expect(isLatestPeriod('year', today, today)).toBe(true);
  });

  it('stops going back at the end of the kept history', () => {
    expect(isEarliestPeriod('year', today, today)).toBe(false);
    // Seven years back is the floor.
    expect(isEarliestPeriod('year', on(2019, 8, 28), today)).toBe(true);
  });
});

describe('periodLabel', () => {
  it('names each period the way it would be said', () => {
    expect(periodLabel('week', on(2026, 8, 28))).toBe('23 – 29 Aug');
    expect(periodLabel('month', on(2026, 8, 28))).toBe('Aug 2026');
    expect(periodLabel('year', on(2026, 8, 28))).toBe('2026');
  });

  it('names both months when a week straddles them', () => {
    expect(periodLabel('week', on(2026, 9, 1))).toBe('30 Aug – 5 Sep');
  });
});

describe('the All period', () => {
  const today = on(2026, 8, 28);

  it('reaches back exactly as far as the app keeps anything', () => {
    const range = periodRange('all', today);
    expect(range).toEqual({ from: '2020-01-01', to: '2026-12-31' });
  });

  it('reads as one bar a year', () => {
    const buckets = periodBuckets('all', today);
    expect(buckets.map((bucket) => bucket.label)).toEqual([
      '2020',
      '2021',
      '2022',
      '2023',
      '2024',
      '2025',
      '2026',
    ]);
  });

  it('names the span it covers', () => {
    expect(periodLabel('all', today)).toBe('2020 – 2026');
  });

  it('does not step, and says so at both ends', () => {
    // Both arrows read as disabled, rather than looking live and doing nothing.
    expect(stepPeriod('all', today, -1)).toBe(today);
    expect(stepPeriod('all', today, 1)).toBe(today);
    expect(isEarliestPeriod('all', today, today)).toBe(true);
    expect(isLatestPeriod('all', today, today)).toBe(true);
  });
});
