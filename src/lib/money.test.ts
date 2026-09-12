import { fromCents, roundMoney, sumMoney, toCents } from '@/lib/money';

describe('toCents', () => {
  it('rounds half away from zero, which is how a lender posts', () => {
    expect(toCents(0.005)).toBe(1);
    expect(toCents(0.015)).toBe(2);
    expect(toCents(2.345)).toBe(235);
    expect(toCents(-0.005)).toBe(-1);
  });

  it('decides the half on the decimal, not on the float', () => {
    // `Math.round(1.005 * 100)` is 100, because the product is
    // 100.49999999999999. A lender posts $1.01. This is the whole reason the
    // helper exists rather than the one-liner.
    expect(1.005 * 100).toBeLessThan(100.5);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(1.015)).toBe(102);
    expect(toCents(1.045)).toBe(105);
    expect(toCents(8.865)).toBe(887);
  });

  it('is exact on the largest figure the app allows', () => {
    // The loan calculator's ceiling is $1,000,000.
    expect(toCents(1_000_000)).toBe(100_000_000);
    expect(toCents(999_999.99)).toBe(99_999_999);
  });

  it('does not round a figure that is already below half', () => {
    expect(toCents(89.6011280547)).toBe(8960);
    expect(toCents(0.004999)).toBe(0);
  });

  it('turns anything that is not a number into nothing', () => {
    // A NaN balance would poison every later row of a schedule.
    expect(toCents(Number.NaN)).toBe(0);
    expect(toCents(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('fromCents', () => {
  it('round-trips every cent of a realistic loan balance', () => {
    // Collected rather than asserted in the loop: 500,000 expect() calls cost
    // seconds, and the failure list is what you want to read anyway.
    const broken: number[] = [];
    for (let cents = 0; cents <= 5_000_000; cents += 137) {
      if (toCents(fromCents(cents)) !== cents) broken.push(cents);
    }
    expect(broken).toEqual([]);
    expect(toCents(fromCents(3_139_433))).toBe(3_139_433);
  });
});

describe('roundMoney', () => {
  it('snaps to the cent', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(100 / 3)).toBe(33.33);
  });
});

describe('sumMoney', () => {
  it('adds without the float drift a running total collects', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in binary floating point.
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);

    const tenths = Array.from({ length: 1000 }, () => 0.1);
    expect(sumMoney(tenths)).toBe(100);
  });
});
