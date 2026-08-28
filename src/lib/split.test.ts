import { splitBill, type Participant } from '@/lib/split';

const people = (...paid: number[]): Participant[] =>
  paid.map((amount, index) => ({ id: `p${index}`, name: `P${index}`, paid: amount }));

/** Cents, so assertions never trip over float representation. */
const cents = (value: number) => Math.round(value * 100);

describe('splitBill — shares', () => {
  it('divides evenly when it can', () => {
    const result = splitBill(people(0, 0, 0, 0), 100);
    expect(result.shareMin).toBe(25);
    expect(result.shareMax).toBe(25);
    expect(result.roundedUpCount).toBe(0);
  });

  it('never loses a cent to rounding', () => {
    // The case named in the module: $500 across 6 is $83.33 each, which is two
    // cents short. Two people carry the extra cent instead.
    const result = splitBill(people(0, 0, 0, 0, 0, 0), 500);
    expect(result.shareMin).toBe(83.33);
    expect(result.shareMax).toBe(83.34);
    expect(result.roundedUpCount).toBe(2);

    const summed = result.balances.reduce((sum, person) => sum + cents(person.share), 0);
    expect(summed).toBe(cents(500));
  });

  it('always sums back to the exact total, whatever the split', () => {
    for (let count = 1; count <= 9; count += 1) {
      for (const total of [0.01, 1, 10, 33.33, 99.99, 500, 1234.56]) {
        const result = splitBill(people(...Array(count).fill(0)), total);
        const summed = result.balances.reduce((sum, person) => sum + cents(person.share), 0);
        expect(summed).toBe(cents(total));
      }
    }
  });

  it('gives one person the whole bill', () => {
    const result = splitBill(people(0), 42.5);
    expect(result.shareMin).toBe(42.5);
    expect(result.balances[0].balance).toBe(-42.5);
  });
});

describe('splitBill — settling up', () => {
  it('says nothing to do when everyone paid their share', () => {
    expect(splitBill(people(25, 25, 25, 25), 100).settlements).toEqual([]);
  });

  it('routes one payer being owed by the rest', () => {
    const result = splitBill(people(90, 0, 0), 90);
    expect(result.settlements).toHaveLength(2);
    for (const settlement of result.settlements) {
      expect(settlement.to).toBe('P0');
      expect(settlement.amount).toBe(30);
    }
  });

  it('leaves everyone square once the settlements are applied', () => {
    const cases: number[][] = [
      [100, 0, 0],
      [50, 30, 20],
      [500, 0, 0, 0, 0, 0],
      [10.01, 3.33, 0],
      [0, 0, 75.5],
    ];

    for (const paid of cases) {
      const total = paid.reduce((sum, amount) => sum + amount, 0);
      const result = splitBill(people(...paid), total);

      const net = new Map(result.balances.map((p) => [p.name, cents(p.balance)]));
      for (const s of result.settlements) {
        net.set(s.from, net.get(s.from)! + cents(s.amount));
        net.set(s.to, net.get(s.to)! - cents(s.amount));
      }
      for (const [, remaining] of net) expect(remaining).toBe(0);
    }
  });

  it('never emits a settlement for nothing', () => {
    const result = splitBill(people(120, 5, 0, 0), 125);
    for (const s of result.settlements) {
      expect(s.amount).toBeGreaterThan(0);
      expect(s.from).not.toBe(s.to);
    }
  });
});

describe('splitBill — edges', () => {
  it('survives an empty list rather than dividing by zero', () => {
    const result = splitBill([], 100);
    expect(Number.isFinite(result.shareMin)).toBe(true);
    expect(result.balances).toEqual([]);
    expect(result.settlements).toEqual([]);
  });

  it('treats a negative total as nothing owed', () => {
    const result = splitBill(people(0, 0), -50);
    expect(result.shareMin).toBe(0);
    expect(result.shareMax).toBe(0);
  });

  it('reports what was actually put in', () => {
    expect(splitBill(people(10.1, 20.2, 0.7), 31).paidTotal).toBe(31);
  });
});
