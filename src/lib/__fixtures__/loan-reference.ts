/**
 * An amortiser for tests that shares no money arithmetic with `@/lib/loan`: balances are integer
 * cents and every posting is a BigInt fraction rounded half up, written from the conventions'
 * definitions rather than from the engine:
 *
 *     actual/365   interest¢ = balance¢ × rate × days / 365
 *     actual/360   interest¢ = balance¢ × rate × days / 360
 *     30/360       interest¢ = balance¢ × rate × days₃₀ / 360
 *     monthly      interest¢ = balance¢ × rate / 12, and on the opening period
 *                  balance¢ × rate × (months / 12 + odd days / 365)
 *
 * The rate comes as whole units of a stated fraction of a percent (7.5% is 7500 thousandths, 7.4995%
 * is 74995 ten-thousandths), so it is exact. Only the calendar (due dates, day counts) is borrowed from the engine, which tests it on its own.
 *
 * Changed payments follow the documented rule: taken unless below both the period's interest and
 * the level payment; the term's last payment settles what is left; a payment above what is owed
 * is cut to it.
 */

import { daysBetween, monthsAndDaysBetween, paymentDates, type AccrualBasis } from '@/lib/loan';

export type ReferenceLoan = {
  principalCents: number;
  /** The rate as `rateUnits / unitsPerPercent` percent. */
  rateUnits: number;
  unitsPerPercent: number;
  months: number;
  fundedOn: Date;
  firstPaymentOn: Date;
  basis: AccrualBasis;
  paymentCents: number;
  changes?: Record<number, number>;
};

export type ReferenceRow = {
  number: number;
  interest: number;
  paid: number;
  balance: number;
  changed: boolean;
};

const big = (value: number) => BigInt(value);

/** n / d rounded half up, for n ≥ 0 and d > 0. */
function halfUp(numerator: bigint, denominator: bigint): number {
  return Number((big(2) * numerator + denominator) / (big(2) * denominator));
}

function interestCents(
  balance: number,
  rate: number,
  unitsPerPercent: number,
  from: Date,
  to: Date,
  basis: AccrualBasis,
  opening: boolean,
): number {
  if (balance <= 0 || rate <= 0) return 0;
  const scale = big(100) * big(unitsPerPercent);
  const b = big(balance) * big(rate);
  switch (basis) {
    case 'actual/365':
      return halfUp(b * big(Math.max(0, daysBetween(from, to))), scale * big(365));
    case 'actual/360':
      return halfUp(b * big(Math.max(0, daysBetween(from, to))), scale * big(360));
    case '30/360':
      return halfUp(b * big(Math.max(0, daysBetween(from, to, '30/360'))), scale * big(360));
    case 'monthly': {
      if (!opening) return halfUp(b, scale * big(12));
      const { months, days } = monthsAndDaysBetween(from, to);
      // months/12 + days/365 over one denominator: (365·months + 12·days) / 4380.
      return halfUp(b * big(365 * months + 12 * days), scale * big(4380));
    }
  }
}

export function referenceSchedule(loan: ReferenceLoan): ReferenceRow[] {
  const dates = paymentDates(loan.firstPaymentOn, loan.months);
  const rows: ReferenceRow[] = [];
  let balance = loan.principalCents;
  let previous = loan.fundedOn;

  for (let index = 0; index < dates.length; index += 1) {
    const number = index + 1;
    const interest = interestCents(
      balance,
      loan.rateUnits,
      loan.unitsPerPercent,
      previous,
      dates[index],
      loan.basis,
      index === 0,
    );
    const last = number === loan.months;
    const asked = loan.changes?.[number];
    const changed =
      asked !== undefined && !last && asked > 0 && asked >= Math.min(interest, loan.paymentCents);
    let principal = (changed ? (asked as number) : loan.paymentCents) - interest;
    if (last || principal > balance) principal = balance;
    balance -= principal;
    rows.push({ number, interest, paid: interest + principal, balance, changed });
    previous = dates[index];
    if (balance <= 0) break;
  }

  return rows;
}

/** The engine's rows in the reference's shape, in cents, to compare whole schedules at once. */
export function inCents(
  rows: readonly {
    number: number;
    interest: number;
    payment: number;
    balance: number;
    overridden: boolean;
  }[],
): ReferenceRow[] {
  return rows.map((row) => ({
    number: row.number,
    interest: Math.round(row.interest * 100),
    paid: Math.round(row.payment * 100),
    balance: Math.round(row.balance * 100),
    changed: row.overridden,
  }));
}
