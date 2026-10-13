import { receiptChoices, type ChoosableReceipt } from '@/lib/goal-receipts';

/** Which receipts "I already added it" offers, and in what order. */

const r = (
  id: string,
  amount: number,
  purchasedOn: string,
  extra: Partial<ChoosableReceipt> = {},
): ChoosableReceipt => ({
  id,
  amount,
  purchased_on: purchasedOn,
  created_at: `${purchasedOn}T12:00:00Z`,
  ...extra,
});

const ids = (rows: readonly ChoosableReceipt[]) => rows.map((row) => row.id);

const choose = (
  receipts: ChoosableReceipt[],
  held = 400,
  linked: string[] = [],
  floor = '2026-07-11',
) => receiptChoices({ receipts, linked: new Set(linked), held, floor });

describe('receiptChoices', () => {
  it('is near within a quarter of what the goal held either way, to the cent', () => {
    const { near, recent } = choose([
      r('low-in', 300, '2026-10-01'),
      r('low-out', 299.99, '2026-10-02'),
      r('high-in', 500, '2026-10-03'),
      r('high-out', 500.01, '2026-10-04'),
      r('exact', 400, '2026-10-05'),
    ]);
    expect(ids(near)).toEqual(['exact', 'high-in', 'low-in']);
    expect(ids(recent)).toEqual(['high-out', 'low-out']);
  });

  it('has nothing near a goal that holds nothing', () => {
    const { near, recent } = choose([r('a', 0, '2026-10-01'), r('b', 5, '2026-10-02')], 0);
    expect(near).toEqual([]);
    expect(ids(recent)).toEqual(['b', 'a']);
  });

  it('lists newest first: by day, then when saved, then by id', () => {
    const { recent } = choose(
      [
        r('b', 10, '2026-10-01', { created_at: '2026-10-01T08:00:00Z' }),
        r('a', 10, '2026-10-01', { created_at: '2026-10-01T08:00:00Z' }),
        r('late', 10, '2026-10-01', { created_at: '2026-10-01T20:00:00Z' }),
        r('newer', 10, '2026-10-02'),
      ],
      1000,
    );
    expect(ids(recent)).toEqual(['newer', 'late', 'a', 'b']);
  });

  it('leaves out receipts another goal names, a habit’s days and anything before the floor', () => {
    const { near, recent } = choose(
      [
        r('linked', 400, '2026-10-01'),
        r('habit', 4.5, '2026-10-02', { habit_id: 'coffee' }),
        r('old', 400, '2026-07-10'),
        r('floor', 400, '2026-07-11'),
      ],
      400,
      ['linked'],
    );
    expect(ids(near)).toEqual(['floor']);
    expect(recent).toEqual([]);
  });

  it('shows at most 20 near and 50 recent, never one in both', () => {
    const many = Array.from({ length: 80 }, (_, index) =>
      r(
        `r${String(index).padStart(2, '0')}`,
        index % 2 === 0 ? 400 : 5,
        `2026-09-${String((index % 28) + 1).padStart(2, '0')}`,
      ),
    );
    const { near, recent } = choose(many);
    expect(near).toHaveLength(20);
    expect(recent).toHaveLength(50);
    const nearIds = new Set(ids(near));
    expect(recent.some((row) => nearIds.has(row.id))).toBe(false);
  });

  it('reads amounts that arrive as text', () => {
    const { near } = choose([r('text', '400.00' as unknown as number, '2026-10-01')]);
    expect(ids(near)).toEqual(['text']);
  });
});
