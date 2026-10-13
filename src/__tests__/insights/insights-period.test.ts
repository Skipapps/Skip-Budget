import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import {
  CURRENT_PERIOD,
  insightsBuckets,
  insightsRange,
  isCurrentPeriod,
  percentOfCents,
  periodChoices,
  shownMonth,
  shownYear,
  wholePercent,
  yearHighlight,
  type InsightsPeriod,
} from '@/lib/insights';
import { paymentFloor } from '@/lib/payment-years';

/**
 * The period maths behind What goes out, Choose month and Choose year, seen on 12 Oct 2026 as the
 * design is, plus the percent every Insights line rounds with.
 */

const TODAY = '2026-10-12';

const month = (picked: string | null): InsightsPeriod => ({
  mode: 'month',
  month: picked,
  year: null,
});
const year = (picked: number | null, pickedMonth: string | null = null): InsightsPeriod => ({
  mode: 'year',
  month: pickedMonth,
  year: picked,
});

const span = (buckets: { from: string; to: string }[]) =>
  buckets.map((bucket) => `${bucket.from}..${bucket.to}`);

beforeEach(() => resetLocaleForTests());

describe('F1 the window each period reads', () => {
  it('reads this month from the 1st to today, and this year from 1 Jan to today', () => {
    expect(insightsRange(CURRENT_PERIOD, TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-12' });
    expect(insightsRange(year(null), TODAY)).toEqual({ from: '2026-01-01', to: '2026-10-12' });
  });

  it('reads a month or a year gone by whole', () => {
    expect(insightsRange(month('2026-09'), TODAY)).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(insightsRange(month('2025-12'), TODAY)).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
    expect(insightsRange(year(2025), TODAY)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
  });

  it('ends February on the 29th in a leap year and the 28th otherwise, centuries included', () => {
    expect(insightsRange(month('2024-02'), TODAY).to).toBe('2024-02-29');
    expect(insightsRange(month('2026-02'), TODAY).to).toBe('2026-02-28');
    expect(insightsRange(month('2000-02'), TODAY).to).toBe('2000-02-29');
    expect(insightsRange(month('2100-02'), '2100-03-01').to).toBe('2100-02-28');
    // Today is the leap day itself.
    expect(insightsRange(CURRENT_PERIOD, '2028-02-29')).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
  });

  it('holds at the edges of a month and a year', () => {
    expect(insightsRange(CURRENT_PERIOD, '2026-10-01')).toEqual({
      from: '2026-10-01',
      to: '2026-10-01',
    });
    expect(insightsRange(CURRENT_PERIOD, '2026-10-31')).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(insightsRange(year(null), '2026-01-01')).toEqual({
      from: '2026-01-01',
      to: '2026-01-01',
    });
    expect(insightsRange(year(null), '2026-12-31')).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
    // 31 Dec is still last year's: a year read on 1 Jan is whole.
    expect(insightsRange(year(2025), '2026-01-01')).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
    });
  });

  it('reads a malformed pick as the current period', () => {
    for (const bad of ['2026-13', '2026-1', 'October', '']) {
      expect([bad, shownMonth(month(bad), TODAY)]).toEqual([bad, '2026-10']);
    }
    for (const bad of [Number.NaN, 2026.5, 99, 10_000]) {
      expect([bad, shownYear(year(bad), TODAY)]).toEqual([bad, 2026]);
    }
  });

  it('gives an empty window, never a projection, for a period after today', () => {
    // Choose month never offers one; a stale link could. The ledger reads nothing when from > to.
    const range = insightsRange(month('2026-11'), TODAY);
    expect(range.from > range.to).toBe(true);
  });

  it('names the current period as current, and only it', () => {
    expect(isCurrentPeriod(CURRENT_PERIOD, TODAY)).toBe(true);
    expect(isCurrentPeriod(month('2026-10'), TODAY)).toBe(true);
    expect(isCurrentPeriod(month('2026-09'), TODAY)).toBe(false);
    expect(isCurrentPeriod(year(null), TODAY)).toBe(true);
    expect(isCurrentPeriod(year(2026, '2026-03'), TODAY)).toBe(true);
    expect(isCurrentPeriod(year(2025), TODAY)).toBe(false);
  });
});

describe('F2 the chart bars', () => {
  it('splits October 2026 into the calendar weeks the design draws, the whole month long', () => {
    const buckets = insightsBuckets(CURRENT_PERIOD, TODAY);
    expect(buckets.map((bucket) => bucket.label)).toEqual([
      '1–3',
      '4–10',
      '11–17',
      '18–24',
      '25–31',
    ]);
    expect(span(buckets)).toEqual([
      '2026-10-01..2026-10-03',
      '2026-10-04..2026-10-10',
      '2026-10-11..2026-10-17',
      '2026-10-18..2026-10-24',
      '2026-10-25..2026-10-31',
    ]);
  });

  it('ends a leap February on the 29th, and a February starting on Sunday in four whole weeks', () => {
    expect(span(insightsBuckets(month('2024-02'), TODAY))).toEqual([
      '2024-02-01..2024-02-03',
      '2024-02-04..2024-02-10',
      '2024-02-11..2024-02-17',
      '2024-02-18..2024-02-24',
      '2024-02-25..2024-02-29',
    ]);
    expect(insightsBuckets(month('2026-02'), TODAY).map((bucket) => bucket.label)).toEqual([
      '1–7',
      '8–14',
      '15–21',
      '22–28',
    ]);
  });

  it('gives a month that starts on Saturday six bars, the first one day long', () => {
    expect(insightsBuckets(month('2026-08'), TODAY).map((bucket) => bucket.label)).toEqual([
      '1–1',
      '2–8',
      '9–15',
      '16–22',
      '23–29',
      '30–31',
    ]);
  });

  it('tiles every day of the month exactly once', () => {
    for (const picked of ['2024-02', '2026-02', '2026-08', '2026-10', '2026-12']) {
      const buckets = insightsBuckets(month(picked), TODAY);
      const { from, to } = insightsRange(month(picked), '2099-01-01');
      expect(buckets[0].from).toBe(from);
      expect(buckets[buckets.length - 1].to).toBe(to);
      for (let index = 1; index < buckets.length; index += 1) {
        const before = new Date(`${buckets[index - 1].to}T12:00:00Z`);
        before.setUTCDate(before.getUTCDate() + 1);
        expect([picked, index, before.toISOString().slice(0, 10)]).toEqual([
          picked,
          index,
          buckets[index].from,
        ]);
      }
    }
  });

  it('labels a year by month initials, J to D, and E to D in Spanish', () => {
    const buckets = insightsBuckets(year(null), TODAY);
    expect(buckets.map((bucket) => bucket.label).join('')).toBe('JFMAMJJASOND');
    expect(buckets[0]).toMatchObject({ from: '2026-01-01', to: '2026-01-31' });
    expect(buckets[11]).toMatchObject({ from: '2026-12-01', to: '2026-12-31' });

    setLanguage('es');
    expect(
      insightsBuckets(year(null), TODAY)
        .map((bucket) => bucket.label)
        .join(''),
    ).toBe('EFMAMJJASOND');
  });

  it('ends February on the 29th in a leap year bar', () => {
    expect(insightsBuckets(year(2024), TODAY)[1]).toMatchObject({
      from: '2024-02-01',
      to: '2024-02-29',
    });
  });
});

describe('F9 the months and years Choose month and Choose year offer', () => {
  const FLOOR = paymentFloor(TODAY);

  it('lists the design’s months, newest first under their years, with this month on top', () => {
    const dates = [
      '2026-09-14', // a receipt
      '2026-08-01', // a charge
      '2026-07-31', // pay
      '2025-12-05',
      '2025-11-30',
      '2025-10-01', // a payoff
      '2026-09-02', // a second date in a month lists it once
    ];
    expect(periodChoices(dates, TODAY, FLOOR)).toEqual({
      months: ['2026-10', '2026-09', '2026-08', '2026-07', '2025-12', '2025-11', '2025-10'],
      years: [2026, 2025],
      monthsByYear: [
        { year: 2026, months: ['2026-10', '2026-09', '2026-08', '2026-07'] },
        { year: 2025, months: ['2025-12', '2025-11', '2025-10'] },
      ],
    });
  });

  it('offers this month and this year with nothing on record', () => {
    expect(periodChoices([], TODAY, FLOOR)).toEqual({
      months: ['2026-10'],
      years: [2026],
      monthsByYear: [{ year: 2026, months: ['2026-10'] }],
    });
    // 1 Jan: the new year is there before anything is spent in it.
    expect(periodChoices(['2025-12-31'], '2027-01-01', paymentFloor('2027-01-01')).years).toEqual([
      2027, 2025,
    ]);
  });

  it('offers nothing after today or before the floor, and skips what is not a date', () => {
    expect(FLOOR).toBe('2020-01-01');
    const dates = [
      '2026-10-13',
      '2027-01-01',
      '2019-12-31',
      '2020-01-01',
      'garbage',
      '2026-3-05',
      // A timestamp's first ten characters are its UTC day: west of Greenwich, 1 Mar is still Feb.
      '2026-03-01T03:00:00Z',
    ];
    expect(periodChoices(dates, TODAY, FLOOR).months).toEqual(['2026-10', '2020-01']);
  });

  it('keeps a date dated today', () => {
    expect(periodChoices(['2026-10-12'], TODAY, FLOOR).months).toEqual(['2026-10']);
  });
});

describe('F10 the month drawn dark in Year mode', () => {
  it('is this month in this year', () => {
    expect(yearHighlight(year(null), TODAY)).toBe(9);
    expect(yearHighlight(year(2026), TODAY)).toBe(9);
  });

  it('is the picked month when it falls in the year shown', () => {
    expect(yearHighlight(year(null, '2026-09'), TODAY)).toBe(8);
    expect(yearHighlight(year(2025, '2025-03'), TODAY)).toBe(2);
    expect(yearHighlight(year(2025, '2025-12'), TODAY)).toBe(11);
  });

  it('is none for another year with no month picked in it', () => {
    expect(yearHighlight(year(2025), TODAY)).toBeNull();
    expect(yearHighlight(year(2025, '2026-09'), TODAY)).toBeNull();
  });

  it('falls back to this month when the pick is in another year than the one shown', () => {
    expect(yearHighlight(year(null, '2025-03'), TODAY)).toBe(9);
  });

  it('is January on 1 Jan and December on 31 Dec', () => {
    expect(yearHighlight(year(null), '2026-01-01')).toBe(0);
    expect(yearHighlight(year(null), '2026-12-31')).toBe(11);
  });
});

describe('F16 whole percents', () => {
  it('rounds the design’s 1,599.99 of 10,000.00 to 16, and 500 of 10,000 to 5', () => {
    expect(wholePercent(1599.99, 10_000)).toBe(16);
    expect(wholePercent(500, 10_000)).toBe(5);
  });

  it('rounds a half up and anything under it down', () => {
    expect(wholePercent(125, 1000)).toBe(13); // 12.5
    expect(wholePercent(124.99, 1000)).toBe(12); // 12.499
    expect(wholePercent(5, 1000)).toBe(1); // 0.5
    expect(wholePercent(4.99, 1000)).toBe(0); // 0.499
    expect(wholePercent(1, 3)).toBe(33);
    expect(wholePercent(2, 3)).toBe(67);
  });

  it('keeps a share past 100, since spending can pass income', () => {
    expect(wholePercent(10_000, 10_000)).toBe(100);
    expect(wholePercent(12_000, 10_000)).toBe(120);
    expect(wholePercent(1599.99, 1000)).toBe(160);
  });

  it('has no percent of nothing, and nothing of something is 0', () => {
    expect(wholePercent(100, 0)).toBeNull();
    expect(wholePercent(100, -5)).toBeNull();
    expect(wholePercent(0, 100)).toBe(0);
    expect(wholePercent(-20, 100)).toBe(0);
    expect(wholePercent(Number.NaN, 100)).toBe(0);
    expect(wholePercent(100, Number.NaN)).toBeNull();
  });

  it('reads the cents a sum meant, not the float it stored', () => {
    // 0.1 + 0.2 is 0.30000000000000004: 30 cents, 30%.
    expect(wholePercent(0.1 + 0.2, 1)).toBe(30);
  });

  it('decides a near-half on integers where a float tips it the wrong way', () => {
    const whole = 80_831_943_037_751;
    const part = 61_028_116_993_502;
    // 75.4999…% exactly; both float roundings say 76.
    expect(Math.round((100 * part) / whole)).toBe(76);
    expect(percentOfCents(part, whole)).toBe(75);
  });
});
