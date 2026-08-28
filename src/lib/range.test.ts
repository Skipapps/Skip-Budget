import { occurrencesInRange } from '@/lib/card-ledger';
import { bucketKey, bucketsIn, bucketFor, rangeFor } from '@/lib/range';

// A Thursday, so the week boundaries are not accidentally symmetric.
const THURSDAY = new Date(2026, 7, 27);

describe('rangeFor', () => {
  it('today is a single day', () => {
    expect(rangeFor('today', THURSDAY)).toEqual({ from: '2026-08-27', to: '2026-08-27' });
  });

  it('week runs Sunday to Saturday around the date', () => {
    expect(rangeFor('week', THURSDAY)).toEqual({ from: '2026-08-23', to: '2026-08-29' });
  });

  it('a Sunday is the start of its own week, not the end of the last', () => {
    expect(rangeFor('week', new Date(2026, 7, 23))).toEqual({
      from: '2026-08-23',
      to: '2026-08-29',
    });
  });

  it('a Saturday closes its week', () => {
    expect(rangeFor('week', new Date(2026, 7, 29))).toEqual({
      from: '2026-08-23',
      to: '2026-08-29',
    });
  });

  it('month covers the whole calendar month', () => {
    expect(rangeFor('month', THURSDAY)).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('handles a 30-day month', () => {
    expect(rangeFor('month', new Date(2026, 8, 15))).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
  });

  it('handles February in a leap year', () => {
    expect(rangeFor('month', new Date(2028, 1, 10))).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
  });

  it('year covers January to December', () => {
    expect(rangeFor('year', THURSDAY)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
});

describe('bucketFor', () => {
  it('chops a year by month and a week by day', () => {
    expect(bucketFor('year')).toBe('month');
    expect(bucketFor('month')).toBe('week');
    expect(bucketFor('week')).toBe('day');
    expect(bucketFor('today')).toBe('day');
  });
});

describe('bucketKey', () => {
  it('snaps to the first of the month', () => {
    expect(bucketKey('2026-08-27', 'month')).toBe('2026-08-01');
  });

  it('snaps to the containing Sunday', () => {
    expect(bucketKey('2026-08-27', 'week')).toBe('2026-08-23');
    expect(bucketKey('2026-08-23', 'week')).toBe('2026-08-23');
  });

  it('leaves a day alone', () => {
    expect(bucketKey('2026-08-27', 'day')).toBe('2026-08-27');
  });
});

describe('bucketsIn', () => {
  it('gives seven days for a week, including empty ones', () => {
    expect(bucketsIn(rangeFor('week', THURSDAY), 'day')).toHaveLength(7);
  });

  it('gives twelve months for a year', () => {
    const months = bucketsIn(rangeFor('year', THURSDAY), 'month');
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2026-01-01');
    expect(months[11]).toBe('2026-12-01');
  });

  it('gives one bucket for a single day', () => {
    expect(bucketsIn(rangeFor('today', THURSDAY), 'day')).toEqual(['2026-08-27']);
  });
});

describe('occurrencesInRange — forward projection', () => {
  it('projects a monthly charge into the future', () => {
    // The dashboard asks what is coming, not only what has happened.
    expect(occurrencesInRange('2026-09-04', 'monthly', '2026-09-01', '2026-12-31')).toEqual([
      '2026-12-04',
      '2026-11-04',
      '2026-10-04',
      '2026-09-04',
    ]);
  });

  it('reaches both directions from the anchor', () => {
    expect(occurrencesInRange('2026-08-15', 'monthly', '2026-07-01', '2026-09-30')).toEqual([
      '2026-09-15',
      '2026-08-15',
      '2026-07-15',
    ]);
  });

  it('clamps a 31st anchor forward into short months', () => {
    expect(occurrencesInRange('2026-08-31', 'monthly', '2026-08-01', '2026-11-30')).toEqual([
      '2026-11-30',
      '2026-10-31',
      '2026-09-30',
      '2026-08-31',
    ]);
  });

  it('projects a yearly charge across a decade window', () => {
    expect(occurrencesInRange('2026-03-01', 'yearly', '2025-01-01', '2028-12-31')).toEqual([
      '2028-03-01',
      '2027-03-01',
      '2026-03-01',
      '2025-03-01',
    ]);
  });

  it('never repeats a date', () => {
    const dates = occurrencesInRange('2026-08-15', 'weekly', '2026-06-01', '2026-10-31');
    expect(new Set(dates).size).toBe(dates.length);
  });
});
