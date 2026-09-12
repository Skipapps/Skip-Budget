/**
 * Cent-exact money arithmetic.
 *
 * Every currency figure in the app is carried as an integer number of cents and
 * only turned back into a decimal at the edge, because binary floating point
 * cannot hold a tenth: `0.1 + 0.2` is `0.30000000000000004`, and a schedule
 * that adds 360 of those lands dollars away from the statement it is meant to
 * reproduce.
 *
 * ## The rounding rule
 *
 * **Round half away from zero** — the everyday "round half up" on a positive
 * amount, so $0.005 posts as $0.01. This is the rule US and UK lenders apply
 * when they post interest to an account (Reg Z §1026.2(a) leaves the mechanics
 * to the creditor, and half-up is the near-universal house rule; the IRS and
 * HMRC both state amounts to the nearer cent/penny with the half going up).
 * It is deliberately NOT banker's rounding (half-to-even): half-to-even is the
 * right choice for long chains of independent measurements, but a lender's
 * statement is not a measurement — it is a posted figure, and posting $0.005 as
 * $0.00 in the lender's favour is not a convention anyone ships.
 *
 * ## Why not `Math.round(value * 100)`
 *
 * Because the multiply lands on the wrong side of the half. `1.005 * 100` is
 * `100.49999999999999`, so the naive form posts $1.00 where a lender posts
 * $1.01. `toCents` clips the product back to 12 significant digits first, which
 * is far more precision than any money figure this app handles ($1,000,000.00
 * is 9 digits) and far less than the ~17 digits where the representation error
 * lives, so the half is decided on the number the arithmetic meant rather than
 * on the number the hardware could store.
 */

/** Significant digits kept before the half is decided. See the module comment. */
const HALF_DECIDING_PRECISION = 12;

/**
 * A decimal amount as whole cents, rounded half away from zero.
 *
 * Anything that is not a finite number becomes 0 rather than NaN: a NaN in a
 * balance poisons every later row, and there is no figure to show for it.
 */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;

  const scaled = amount * 100;
  const corrected = Number(scaled.toPrecision(HALF_DECIDING_PRECISION));
  return corrected < 0 ? -Math.round(-corrected) : Math.round(corrected);
}

/** Whole cents back to a decimal amount, for display and for storage. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** A decimal amount snapped to the cent, half away from zero. */
export function roundMoney(amount: number): number {
  return fromCents(toCents(amount));
}

/** Adds decimal amounts through cents, so the total is exact. */
export function sumMoney(amounts: readonly number[]): number {
  return fromCents(amounts.reduce((total, amount) => total + toCents(amount), 0));
}
