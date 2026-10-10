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

/** The most a money column holds, numeric(14,2): $999,999,999,999.99. */
export const MAX_MONEY_CENTS = 99_999_999_999_999;

/** Float noise in a product is a few units in the last place; a real fraction of a cent is far more. */
const NOISE_ULPS = 4;

/**
 * The amount in cents when it is a whole number of cents (554.23 is, 554.235 is not) that a money
 * column can hold, else null. Typed figures are checked with this rather than rounded, so a stray
 * third decimal is refused instead of quietly moving a cent. The test is the distance to the
 * nearest cent against float noise, not 12 significant digits, which would round away the cents
 * of a billion-dollar figure.
 */
export function wholeCents(amount: number): number | null {
  if (!Number.isFinite(amount)) return null;
  const scaled = amount * 100;
  const cents = Math.round(scaled);
  if (Math.abs(scaled - cents) > Math.abs(scaled) * NOISE_ULPS * Number.EPSILON) return null;
  return Math.abs(cents) <= MAX_MONEY_CENTS ? cents : null;
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
