import { NO_DATE, groupByDate, sortByDateAscending } from '@/lib/group';

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

describe('groupByDate, run forwards', () => {
  // The Founder's rule for every dated list: oldest at the top, today at the
  // bottom. "asc works" is not the same assertion — this one pins where today
  // lands, which is the thing somebody would notice if it regressed.
  it('puts today last, after every older day', () => {
    const withToday: Row[] = [
      { id: 'x', on: '2026-09-12', amount: -3 },
      ...rows,
      { id: 'y', on: '2026-09-11', amount: -4 },
    ];

    const groups = groupByDate(withToday, (row) => row.on, { direction: 'asc' });
    const dated = groups.filter((group) => group.date !== NO_DATE);

    expect(dated.map((group) => group.date)).toEqual([
      '2026-08-27',
      '2026-08-28',
      '2026-09-11',
      '2026-09-12',
    ]);
    expect(dated[dated.length - 1].date).toBe('2026-09-12');
  });

  it('leaves the rows inside a day alone', () => {
    const sameDay: Row[] = [
      { id: 'c', on: '2026-08-27', amount: -5 },
      { id: 'a', on: '2026-08-27', amount: -10 },
      { id: 'b', on: '2026-08-27', amount: -20 },
    ];

    const forwards = groupByDate(sameDay, (row) => row.on, { direction: 'asc' });
    const backwards = groupByDate(sameDay, (row) => row.on, { direction: 'desc' });

    expect(forwards[0].items.map((row) => row.id)).toEqual(['c', 'a', 'b']);
    expect(backwards[0].items.map((row) => row.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('sortByDateAscending', () => {
  const dateOf = (row: Row) => row.on;
  const idOf = (row: Row) => row.id;

  it('runs oldest to newest', () => {
    const sorted = sortByDateAscending(rows, dateOf, idOf);
    expect(sorted.map((row) => row.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('breaks a shared day by id, ascending', () => {
    const sameDay: Row[] = [
      { id: 'c', on: '2026-08-27', amount: -5 },
      { id: 'a', on: '2026-08-27', amount: -10 },
    ];
    expect(sortByDateAscending(sameDay, dateOf, idOf).map((row) => row.id)).toEqual(['a', 'c']);
  });

  it('trails undated rows, in id order among themselves', () => {
    const undated: Row[] = [
      { id: 'z', on: null, amount: -1 },
      { id: 'b', on: '2026-08-28', amount: -20 },
      { id: 'm', on: null, amount: -2 },
    ];
    expect(sortByDateAscending(undated, dateOf, idOf).map((row) => row.id)).toEqual([
      'b',
      'm',
      'z',
    ]);
  });

  it('does not mutate what it was given', () => {
    const input: Row[] = [
      { id: 'b', on: '2026-08-28', amount: -20 },
      { id: 'a', on: '2026-08-27', amount: -10 },
    ];
    sortByDateAscending(input, dateOf, idOf);
    expect(input.map((row) => row.id)).toEqual(['b', 'a']);
  });

  it('returns nothing for an empty list', () => {
    expect(sortByDateAscending([], dateOf, idOf)).toEqual([]);
  });
});
