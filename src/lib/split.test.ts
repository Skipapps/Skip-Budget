import {
  equalShares,
  exactRemainder,
  simplifyDebts,
  splitBill,
  type Participant,
} from '@/lib/split';

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

describe('simplifyDebts', () => {
  it('clears everyone to zero', () => {
    const settlements = simplifyDebts([
      { id: 'a', balance: -30 },
      { id: 'b', balance: 10 },
      { id: 'c', balance: 20 },
    ]);

    const net = new Map<string, number>();
    for (const payment of settlements) {
      net.set(payment.from, (net.get(payment.from) ?? 0) + cents(payment.amount));
      net.set(payment.to, (net.get(payment.to) ?? 0) - cents(payment.amount));
    }
    expect(net.get('a')).toBe(cents(30));
    expect(net.get('b')).toBe(cents(-10));
    expect(net.get('c')).toBe(cents(-20));
  });

  it('never needs more payments than there are people, less one', () => {
    // The guarantee the greedy pass actually makes.
    const balances = [
      { id: 'a', balance: -55.55 },
      { id: 'b', balance: -14.45 },
      { id: 'c', balance: 30 },
      { id: 'd', balance: 20 },
      { id: 'e', balance: 20 },
    ];
    expect(simplifyDebts(balances).length).toBeLessThanOrEqual(balances.length - 1);
  });

  it('ignores people who are square', () => {
    const settlements = simplifyDebts([
      { id: 'a', balance: 0 },
      { id: 'b', balance: -5 },
      { id: 'c', balance: 5 },
    ]);
    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toEqual({ from: 'b', to: 'c', amount: 5 });
  });

  it('says nothing when nobody owes anybody', () => {
    expect(
      simplifyDebts([
        { id: 'a', balance: 0 },
        { id: 'b', balance: 0 },
      ]),
    ).toEqual([]);
    expect(simplifyDebts([])).toEqual([]);
  });

  it('does not leak a cent through a chain of payments', () => {
    // Awkward thirds: the case where a naive float pass ends a cent out.
    const settlements = simplifyDebts([
      { id: 'a', balance: -33.33 },
      { id: 'b', balance: -33.33 },
      { id: 'c', balance: -33.34 },
      { id: 'd', balance: 100 },
    ]);
    const paid = settlements.reduce((sum, payment) => sum + cents(payment.amount), 0);
    expect(paid).toBe(cents(100));
  });
});

describe('equalShares', () => {
  it('sums to the exact total however it divides', () => {
    for (const count of [1, 2, 3, 6, 7, 11]) {
      for (const total of [0.01, 10, 100, 500, 33.33, 1234.56]) {
        const ids = Array.from({ length: count }, (_, index) => `m${index}`);
        const shares = equalShares(ids, total);
        const summed = shares.reduce((sum, entry) => sum + cents(entry.share), 0);
        expect(summed).toBe(cents(total));
      }
    }
  });

  it('spreads the leftover cents one each, not all onto one person', () => {
    const shares = equalShares(['a', 'b', 'c', 'd', 'e', 'f'], 500);
    expect(shares.map((entry) => entry.share)).toEqual([83.34, 83.34, 83.33, 83.33, 83.33, 83.33]);
  });

  it('keeps the same person carrying the cent when an expense is edited', () => {
    // If this rotated, correcting a typo would quietly move a cent between two
    // people and neither would know why their balance changed.
    const first = equalShares(['a', 'b', 'c'], 10);
    const again = equalShares(['a', 'b', 'c'], 10);
    expect(first).toEqual(again);
  });

  it('handles nobody', () => {
    expect(equalShares([], 50)).toEqual([]);
  });
});

describe('exactRemainder', () => {
  it('reports what is still unassigned', () => {
    expect(exactRemainder([{ memberId: 'a', share: 30 }], 100)).toBe(70);
  });

  it('goes negative when the shares overshoot', () => {
    expect(
      exactRemainder(
        [
          { memberId: 'a', share: 60 },
          { memberId: 'b', share: 60 },
        ],
        100,
      ),
    ).toBe(-20);
  });

  it('is exactly zero when it balances, with no float dust', () => {
    const shares = [
      { memberId: 'a', share: 33.33 },
      { memberId: 'b', share: 33.33 },
      { memberId: 'c', share: 33.34 },
    ];
    expect(exactRemainder(shares, 100)).toBe(0);
  });
});
