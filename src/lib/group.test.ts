import { NO_DATE, groupByDate } from '@/lib/group';

type Row = { id: string; on: string | null; amount: number };

const rows: Row[] = [
  { id: 'a', on: '2026-08-27', amount: -10 },
  { id: 'b', on: '2026-08-28', amount: -20 },
  { id: 'c', on: '2026-08-27', amount: -5 },
  { id: 'd', on: null, amount: -1 },
];

describe('groupByDate', () => {
  it('collects rows sharing a date and sums them', () => {
    const groups = groupByDate(rows, (row) => row.on, { amountOf: (row) => row.amount });
    const aug27 = groups.find((group) => group.date === '2026-08-27');

    expect(aug27?.items.map((row) => row.id)).toEqual(['a', 'c']);
    expect(aug27?.total).toBe(-15);
  });

  it('puts the newest day first by default', () => {
    const groups = groupByDate(rows, (row) => row.on);
    expect(groups[0].date).toBe('2026-08-28');
  });

  it('puts the soonest day first when asked to run forwards', () => {
    const groups = groupByDate(rows, (row) => row.on, { direction: 'asc' });
    expect(groups[0].date).toBe('2026-08-27');
  });

  it('keeps undated rows, and sorts them last either way', () => {
    for (const direction of ['asc', 'desc'] as const) {
      const groups = groupByDate(rows, (row) => row.on, { direction });
      expect(groups[groups.length - 1].date).toBe(NO_DATE);
      expect(groups[groups.length - 1].items.map((row) => row.id)).toEqual(['d']);
    }
  });

  it('returns nothing for an empty list', () => {
    expect(groupByDate([], () => null)).toEqual([]);
  });
});
