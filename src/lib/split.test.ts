import { equalShares, exactRemainder, simplifyDebts } from '@/lib/split';

/** Cents, so assertions never trip over float representation. */
const cents = (value: number) => Math.round(value * 100);

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
