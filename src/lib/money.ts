/**
 * Cent-exact money arithmetic: every figure is an integer number of cents, turned back into a
 * decimal only at the edge (`0.1 + 0.2` is `0.30000000000000004`).
 *
 * Rounding is half away from zero, so $0.005 posts as $0.01, as a lender posts interest. It is
 * deliberately not banker's rounding.
 *
 * `Math.round(value * 100)` is wrong: `1.005 * 100` is `100.49999999999999`, so it posts $1.00 where
 * a lender posts $1.01. `toCents` clips the product to 12 significant digits first, which decides
 * the half on the number the arithmetic meant, not the one the hardware stored.
 */

/** Significant digits kept before the half is decided. */
const HALF_DECIDING_PRECISION = 12;

/** A decimal amount as whole cents, rounded half away from zero. A non-finite number becomes 0, not NaN. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;

  const scaled = amount * 100;
  const corrected = Number(scaled.toPrecision(HALF_DECIDING_PRECISION));
  return corrected < 0 ? -Math.round(-corrected) : Math.round(corrected);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function roundMoney(amount: number): number {
  return fromCents(toCents(amount));
}

export function sumMoney(amounts: readonly number[]): number {
  return fromCents(amounts.reduce((total, amount) => total + toCents(amount), 0));
}
