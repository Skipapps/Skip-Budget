/**
 * An amortiser with payoffs for tests that shares no money arithmetic with `@/lib/loan`, written
 * from the rules in `loan-payoff-reference.ts` (which the Python reference pins): integer cents,
 * and every posting a BigInt fraction rounded half up. Only the calendar (due dates, day counts)
 * is borrowed from the engine, which tests it on its own.
 */

import { daysBetween, monthsAndDaysBetween, paymentDates, type AccrualBasis } from '@/lib/loan';
import type {
  PayoffPostingTuple,
  PayoffReference,
  PayoffRowTuple,
} from '@/lib/__fixtures__/loan-payoff-reference';

const big = (value: number) => BigInt(value);

/** n / d rounded half up, for n ≥ 0 and d > 0. */
const halfUp = (numerator: bigint, denominator: bigint) =>
  Number((big(2) * numerator + denominator) / (big(2) * denominator));

const day = (iso: string) => new Date(`${iso}T00:00:00`);

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** A year's share as weight / per, so a posting is balance × rate × weight / (100 × units × per). */
type Share = { weight: number; per: number };

function scheduled(from: Date, to: Date, basis: AccrualBasis, opening: boolean): Share {
  switch (basis) {
    case 'actual/365':
      return { weight: Math.max(0, daysBetween(from, to)), per: 365 };
    case 'actual/360':
      return { weight: Math.max(0, daysBetween(from, to)), per: 360 };
    case '30/360':
      return { weight: Math.max(0, daysBetween(from, to, '30/360')), per: 360 };
    case 'monthly': {
      if (!opening) return { weight: 1, per: 12 };
      const { months, days } = monthsAndDaysBetween(from, to);
      return { weight: 365 * months + 12 * days, per: 4380 };
    }
  }
}

/** Per diem for a piece of a split period: actual/365 on monthly rests. */
function perDiem(from: Date, to: Date, basis: AccrualBasis): Share {
  if (basis === '30/360') return { weight: Math.max(0, daysBetween(from, to, '30/360')), per: 360 };
  return {
    weight: Math.max(0, daysBetween(from, to)),
    per: basis === 'actual/360' ? 360 : 365,
  };
}

/** The rate as whole units over a power of ten, so it is exact. */
function rateOf(percent: string): { units: bigint; scale: bigint } {
  const [whole, fraction = ''] = percent.split('.');
  return { units: BigInt(whole + fraction), scale: big(100) * big(10) ** big(fraction.length) };
}

export type PayoffReferenceLoan = Omit<
  PayoffReference,
  'rows' | 'posts' | 'interestCents' | 'paidCents' | 'quotes'
>;

export function referencePayoffs(loan: PayoffReferenceLoan): {
  rows: PayoffRowTuple[];
  posts: PayoffPostingTuple[];
} {
  const { units, scale } = rateOf(loan.rate);
  const first = day(loan.firstPayment);
  const dates = paymentDates(first, loan.months, loan.paymentDay);
  const anchor = loan.paymentDay ?? first.getDate();
  const funded = loan.fundedOn
    ? day(loan.fundedOn)
    : new Date(
        first.getFullYear(),
        first.getMonth() - 1,
        Math.min(anchor, new Date(first.getFullYear(), first.getMonth(), 0).getDate()),
      );
  // Same-day payoffs keep their order: a stable sort on the day alone.
  const payoffs = [...loan.payoffs].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const rows: PayoffRowTuple[] = [];
  const posts: PayoffPostingTuple[] = [];
  let balance = loan.principalCents;
  let previous = funded;
  let next = 0;

  // Σ balance × weight since the last posting, kept per denominator (a period mixes none, but a
  // split monthly-rest period is all per diem).
  const post = (weighted: bigint, per: number) => halfUp(weighted * units, scale * big(per));

  for (let index = 0; index < dates.length; index += 1) {
    const due = dates[index];
    let weighted = big(0);
    let per = 1;
    let cursor = previous;
    let carried = 0;
    let split = false;

    while (next < payoffs.length && day(payoffs[next][0]) < due) {
      const [on, amount] = payoffs[next];
      next += 1;
      const at = day(on) < previous ? previous : day(on);
      const share = perDiem(cursor, at, loan.basis);
      weighted += big(balance) * big(share.weight);
      per = share.per;
      cursor = at;
      split = true;
      const owed = carried + post(weighted, per);
      weighted = big(0);
      const interest = Math.min(amount, owed);
      const principal = Math.min(amount - interest, balance);
      carried = owed - interest;
      balance -= principal;
      posts.push([on, amount, interest, principal, balance, balance === 0, rows.length]);
      if (balance === 0) return { rows, posts };
    }

    const share = split
      ? perDiem(cursor, due, loan.basis)
      : scheduled(previous, due, loan.basis, index === 0);
    weighted += big(balance) * big(share.weight);
    per = share.per;
    const interest = carried + post(weighted, per);

    const number = index + 1;
    const last = number === loan.months;
    const asked = loan.changes?.[number];
    const taken = asked !== undefined && !last && asked >= Math.min(interest, loan.paymentCents);
    let principal = (taken ? asked : loan.paymentCents) - interest;
    if (last || principal > balance) principal = balance;
    balance -= principal;

    rows.push([
      iso(due),
      daysBetween(previous, due, loan.basis === '30/360' ? '30/360' : 'actual/365'),
      interest,
      interest + principal,
      balance,
    ]);
    previous = due;
    if (balance <= 0) break;
  }

  return { rows, posts };
}
