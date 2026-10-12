/**
 * The View loan page's lists, read off the same schedule as `loanStatus` (`amortise` on the terms
 * `termsFromStored` builds), so the payment day, changed payments, payoffs and the last payment's
 * difference are all the schedule's own. A payment or payoff dated on or before `today` is made, as
 * on the Loans page, so the History card ends where the Payment schedule card begins.
 *
 * Every row is the schedule's posting: interest first, the rest off the balance, so principal +
 * interest is the payment to the cent.
 */

import { toIsoDate } from '@/lib/date';
import { amortise, type LoanTerms, type PayoffPosting, type ScheduleRow } from '@/lib/loan';
import { overrideParams, payoffParams, type LoanRouteParams } from '@/lib/loan-route';

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

/** A payoff on the History card: "Paid off $X" when `full`, else "Partial payoff". */
export type LoanPayoffEntry = {
  kind: 'payoff';
  /** The stored payoff's id, for removing it; null for one not on file. */
  id: string | null;
  /** yyyy-mm-dd */
  on: string;
  /** What was paid. */
  amount: number;
  /** The interest built up since the last payment or payoff, which it paid first. */
  interest: number;
  /** What came off the balance. */
  principal: number;
  /** Principal still owed after it. */
  balance: number;
  /** It cleared the loan. */
  full: boolean;
};

/** A row of the History card; read rows by `kind`. */
export type LoanHistoryEntry = ({ kind: 'payment' } & LoanPayment) | LoanPayoffEntry;

export type LoanHistory = {
  /** Newest first, at most the count asked for. */
  entries: LoanHistoryEntry[];
  /** Every entry there is, payments and payoffs, so the page knows whether to offer "See all". */
  total: number;
  /** yyyy-mm-dd of the schedule's first payment, for "Your first payment is on …"; null with none. */
  firstPaymentOn: string | null;
};

const payoffOf = (posting: PayoffPosting): LoanPayoffEntry => ({
  kind: 'payoff',
  id: posting.id,
  on: posting.on,
  amount: posting.amount,
  interest: posting.interest,
  principal: posting.principal,
  balance: posting.balance,
  full: posting.full,
});

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
 * The payments and payoffs already made by `today` (yyyy-mm-dd, `useToday`), newest first: `count`
 * of them, or all when no count is given. On a day with both, the payoff came after the payment.
 */
export function loanHistory(terms: LoanTerms, today: string, count?: number): LoanHistory {
  const { rows, payoffs } = amortise(terms);
  const made = paymentsMade(rows, today);

  // Oldest first, in posting order; everything dated on or before today is a prefix of it.
  const posted: LoanHistoryEntry[] = [];
  let payoff = 0;
  for (let index = 0; index <= made; index += 1) {
    while (
      payoff < payoffs.length &&
      payoffs[payoff].afterPayments <= index &&
      payoffs[payoff].on <= today
    ) {
      posted.push(payoffOf(payoffs[payoff]));
      payoff += 1;
    }
    if (index < made) posted.push({ kind: 'payment', ...paymentOf(rows[index]) });
  }

  const shown = count === undefined ? posted.length : Math.min(posted.length, atMost(count));
  return {
    entries: posted.slice(posted.length - shown).reverse(),
    total: posted.length,
    firstPaymentOn: rows[0]?.date ?? null,
  };
}

/**
 * Opens `/loan-schedule` on exactly a saved loan's schedule (`termsFromStored`, which has no
 * extras): the stored payment, not a re-solved one, its payoffs, and the payment day, without
 * which a loan first due on a clamped day (28 Feb for the 31st) shows later payments on the wrong
 * day.
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
    ...payoffParams(terms.payoffs),
  };
  if (terms.paymentDay !== undefined) params.day = String(terms.paymentDay);
  if (terms.fundedOn) params.funded = toIsoDate(terms.fundedOn);
  if (terms.payment !== undefined) params.payment = String(terms.payment);
  return params;
}
