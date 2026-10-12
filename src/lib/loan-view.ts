/**
 * The View loan page's lists, read off the same schedule as `loanStatus` (`amortise` on the terms
 * `termsFromStored` builds), so the payment day, changed payments and the last payment's
 * difference are all the schedule's own. A payment dated on or before `today` is made, as on the
 * Loans page, so the History card ends where the Payment schedule card begins.
 *
 * Every row is the schedule's posting: interest first, the rest off the balance, so principal +
 * interest is the payment to the cent.
 */

import { toIsoDate } from '@/lib/date';
import { amortise, type LoanTerms, type ScheduleRow } from '@/lib/loan';
import { overrideParams, type LoanRouteParams } from '@/lib/loan-route';

/** One scheduled payment. */
export type LoanPayment = {
  /** 1-based payment number. */
  number: number;
  /** yyyy-mm-dd */
  date: string;
  /** Everything paid that day: principal + interest. */
  payment: number;
  /** What came off the balance. */
  principal: number;
  /** The interest that payment covered. */
  interest: number;
};

/**
 * A row of the History card. Payoffs join this union as their own kind, so read rows by `kind`
 * and the payment rows never change shape.
 */
export type LoanHistoryEntry = { kind: 'payment' } & LoanPayment;

export type LoanHistory = {
  /** Newest first, at most the count asked for. */
  entries: LoanHistoryEntry[];
  /** Every entry there is, so the page knows whether to offer "See all". */
  total: number;
  /** yyyy-mm-dd of the schedule's first payment, for "Your first payment is on …"; null with none. */
  firstPaymentOn: string | null;
};

const paymentOf = (row: ScheduleRow): LoanPayment => ({
  number: row.number,
  date: row.date,
  payment: row.payment,
  principal: row.principal,
  interest: row.interest,
});

// A negative count would make `slice` drop rows from the end instead of taking none.
const atMost = (count: number) => (count > 0 ? Math.floor(count) : 0);

function paymentsMade(rows: readonly ScheduleRow[], today: string): number {
  const next = rows.findIndex((row) => row.date > today);
  return next === -1 ? rows.length : next;
}

/** The next `count` payments after `today` (yyyy-mm-dd, `useToday`), soonest first. */
export function upcomingPayments(terms: LoanTerms, today: string, count: number): LoanPayment[] {
  const { rows } = amortise(terms);
  const made = paymentsMade(rows, today);
  return rows.slice(made, made + atMost(count)).map(paymentOf);
}

/**
 * The payments already made by `today` (yyyy-mm-dd, `useToday`), newest first: `count` of them, or
 * all when no count is given.
 */
export function loanHistory(terms: LoanTerms, today: string, count?: number): LoanHistory {
  const { rows } = amortise(terms);
  const made = paymentsMade(rows, today);
  const shown = count === undefined ? made : Math.min(made, atMost(count));

  const entries: LoanHistoryEntry[] = [];
  for (let index = made - 1; index >= made - shown; index -= 1) {
    entries.push({ kind: 'payment', ...paymentOf(rows[index]) });
  }

  return { entries, total: made, firstPaymentOn: rows[0]?.date ?? null };
}

/**
 * Opens `/loan-schedule` on exactly a saved loan's schedule (`termsFromStored`, which has no
 * extras): the stored payment, not a re-solved one, and the payment day, without which a loan
 * first due on a clamped day (28 Feb for the 31st) shows every later payment on the wrong day.
 * Null for a loan pinned to a statement balance, which the route cannot carry, so its schedule
 * page would not be this one.
 */
export function loanScheduleParams(terms: LoanTerms): LoanRouteParams | null {
  if (terms.statement) return null;

  const params: LoanRouteParams = {
    amount: String(terms.principal),
    rate: String(terms.annualRatePercent),
    months: String(terms.months),
    start: toIsoDate(terms.firstPaymentOn),
    basis: terms.basis ?? 'actual/365',
    ...overrideParams({ payments: terms.paymentOverrides }),
  };
  if (terms.paymentDay !== undefined) params.day = String(terms.paymentDay);
  if (terms.fundedOn) params.funded = toIsoDate(terms.fundedOn);
  if (terms.payment !== undefined) params.payment = String(terms.payment);
  return params;
}
