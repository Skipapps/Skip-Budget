import { fromCents, MAX_MONEY_CENTS, roundMoney, sumMoney, toCents, wholeCents } from '@/lib/money';

describe('toCents', () => {
  it('rounds half away from zero, which is how a lender posts', () => {
    expect(toCents(0.005)).toBe(1);
    expect(toCents(0.015)).toBe(2);
    expect(toCents(2.345)).toBe(235);
    expect(toCents(-0.005)).toBe(-1);
  });

  it('decides the half on the decimal, not on the float', () => {
    // `Math.round(1.005 * 100)` is 100 (the product is 100.49999999999999); a lender posts $1.01.
    expect(1.005 * 100).toBeLessThan(100.5);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(1.015)).toBe(102);
    expect(toCents(1.045)).toBe(105);
    expect(toCents(8.865)).toBe(887);
  });

  it('is exact on the largest figure the app allows', () => {
    expect(toCents(1_000_000)).toBe(100_000_000);
    expect(toCents(999_999.99)).toBe(99_999_999);
  });

  it('does not round a figure that is already below half', () => {
    expect(toCents(89.6011280547)).toBe(8960);
    expect(toCents(0.004999)).toBe(0);
  });

  it('turns anything that is not a number into nothing', () => {
    expect(toCents(Number.NaN)).toBe(0);
    expect(toCents(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('fromCents', () => {
  it('round-trips every cent of a realistic loan balance', () => {
    // Collected rather than asserted in the loop: 500,000 expect() calls cost seconds.
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
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);

    const tenths = Array.from({ length: 1000 }, () => 0.1);
    expect(sumMoney(tenths)).toBe(100);
  });
});

describe('wholeCents', () => {
  it('reads a typed amount as its cents, through float noise', () => {
    expect(wholeCents(554.23)).toBe(55_423); // 554.23 × 100 is 55422.99999999999
    expect(wholeCents(0.1 + 0.2)).toBe(30); // 0.30000000000000004
    expect(wholeCents(0.07)).toBe(7); // 7.000000000000001
    expect(wholeCents(1.005)).toBeNull(); // a real half cent, not noise
    expect(wholeCents(0)).toBe(0);
    expect(wholeCents(-12.34)).toBe(-1234);
  });

  it('refuses a fraction of a cent rather than rounding it away', () => {
    expect(wholeCents(554.235)).toBeNull();
    expect(wholeCents(600.001)).toBeNull();
    expect(wholeCents(0.001)).toBeNull();
  });

  it('keeps the cents of a figure in the billions, which 12 significant digits would lose', () => {
    expect(wholeCents(1_234_567_890.12)).toBe(123_456_789_012);
    expect(wholeCents(1_234_567_890.123)).toBeNull();
    expect(wholeCents(999_999_999_999.99)).toBe(MAX_MONEY_CENTS);
  });

  it('refuses what no money column can hold, and what is not a number', () => {
    expect(wholeCents(1_000_000_000_000)).toBeNull();
    expect(wholeCents(-1_000_000_000_000)).toBeNull();
    expect(wholeCents(Number.NaN)).toBeNull();
    expect(wholeCents(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
