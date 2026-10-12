/**
 * Paying a saved loan off, in full or in part, on a day the person chooses. The money maths is
 * the engine's (`runSchedule` in `@/lib/loan`): on the payoff's day the interest built up since
 * the last payment or payoff posts, rounded half up once, and the payoff pays that interest first
 * and then principal, whether it is full or partial. A full payoff ends the schedule that day. A
 * partial one keeps the monthly payment, so the loan finishes sooner and its last payment takes up
 * the difference.
 *
 * Interest runs on the loan's own day count (actual/365 by default). A monthly-rests loan is
 * charged per diem on actual/365 on both sides of a payoff, as a lender's payoff figure is.
 *
 * Dates are yyyy-mm-dd, as `useToday` gives them. What can be paid, and when:
 * - any whole-cent amount above zero, up to what clears the loan that day (`payoffQuote`);
 * - from the day the loan started to today;
 * - in full only on or after the day of the last payment already made, and not before a payoff
 *   already recorded, so no payment or payoff that has counted lands after the loan ended. On a
 *   payment day the payment posts first and the payoff clears what it leaves, so the instalment
 *   is counted once, on the bill's last day;
 * - in part only so far as it leaves every payment and payoff already made as it was;
 * - nothing once the loan is paid off.
 */

import { toIsoDate } from '@/lib/date';
import {
  amortise,
  payoffQuote,
  type Amortisation,
  type LoanTerms,
  type PayoffPosting,
} from '@/lib/loan';
import { loanStatus } from '@/lib/loan-status';
import { fromCents, toCents, wholeCents } from '@/lib/money';

export { payoffQuote, readStoredPayoffs } from '@/lib/loan';
export type { LoanPayoff, PayoffPosting, PayoffQuote, StoredPayoff } from '@/lib/loan';

/** A payoff to be made: yyyy-mm-dd and the amount. */
export type PayoffRequest = { on: string; amount: number };

export type PayoffRefusal =
  /** The loan is paid off already. */
  | { reason: 'finished' }
  /** Not a finite amount in whole cents. */
  | { reason: 'not-an-amount' }
  /** Zero or less. */
  | { reason: 'zero' }
  /** Not a real yyyy-mm-dd. */
  | { reason: 'not-a-date' }
  /** After today, the latest day it can be. */
  | { reason: 'future'; latest: string }
  /** Before the loan started (`earliest`). */
  | { reason: 'before-start'; earliest: string }
  /** More than clears the loan that day, which is `quote` ("Pay it all"). */
  | { reason: 'more-than-owed'; quote: number }
  /** Paid in full before a payment already made (`lastPaymentOn`), which is also `earliest`. */
  | { reason: 'before-last-payment'; lastPaymentOn: string; earliest: string }
  /** Paid in full before a payoff already recorded (`lastPayoffOn`), which is also `earliest`. */
  | { reason: 'before-last-payoff'; lastPayoffOn: string; earliest: string }
  /**
   * Dated before payments or payoffs already made, and so much that the loan would be paid off
   * before them: `most` is the most that leaves them as they were (0 when nothing does).
   */
  | { reason: 'overtakes-later'; most: number };

export type PayoffAccepted = {
  ok: true;
  /** It clears the loan (it is the quote) or it does not. */
  kind: 'full' | 'partial';
  /** What clears the loan that day. */
  quote: number;
  /** How it is applied: the interest built up since the last payment or payoff first… */
  interest: number;
  /** …then the rest off the balance. */
  principal: number;
  /** Principal still owed after it. */
  balance: number;
  /** The loan with this payoff added: read every figure from these once it is saved. */
  terms: LoanTerms;
  /**
   * yyyy-mm-dd the loan now ends: this day when it is paid in full, else its new last payment.
   * What the bill ends on (`record_loan_payoff`'s `p_last_payment_on`).
   */
  endsOn: string;
  /** Payments still to come after today once it is paid; 0 when paid in full. */
  paymentsLeft: number;
  /** The same without it. */
  paymentsLeftBefore: number;
  /** Interest it saves over the rest of the loan. */
  interestSaved: number;
};

export type PayoffCheck = PayoffAccepted | { ok: false; refusal: PayoffRefusal };

/** The days a payoff can be dated, both inclusive, yyyy-mm-dd. */
export type PayoffDays = {
  /** The day the loan started. */
  earliest: string;
  /** Today. */
  latest: string;
  /** The first day it can be paid in full: the last payment made or payoff recorded, or start. */
  earliestFull: string;
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const dayOf = (iso: string) => new Date(`${iso}T00:00:00`);
const isDay = (iso: string) => ISO_DAY.test(iso) && toIsoDate(dayOf(iso)) === iso;

const lastWhere = <T>(items: readonly T[], keep: (item: T) => boolean): T | undefined => {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (keep(items[index])) return items[index];
  }
  return undefined;
};

const appliedCents = (posting: PayoffPosting) =>
  toCents(posting.interest) + toCents(posting.principal);

/** yyyy-mm-dd a payoff cleared the loan, or null; the third argument of `loanPricingDay`. */
export function paidOffOn(terms: LoanTerms): string | null {
  if (!terms.payoffs || terms.payoffs.length === 0) return null;
  return amortise(terms).payoffs.find((payoff) => payoff.full)?.on ?? null;
}

/**
 * The days a payoff can be dated on `today`; null when there are none: the loan is paid off, or
 * has not started.
 */
export function payoffDays(terms: LoanTerms, today: string): PayoffDays | null {
  const schedule = amortise(terms);
  const earliest = toIsoDate(schedule.fundedOn);
  if (earliest > today || loanStatus(terms, today).paidOff) return null;
  return { earliest, latest: today, earliestFull: earliestFull(schedule, today, earliest) };
}

function earliestFull(schedule: Amortisation, today: string, start: string): string {
  const lastPayment = lastWhere(schedule.rows, (row) => row.date <= today);
  const lastPayoff = schedule.payoffs[schedule.payoffs.length - 1];
  let earliest = start;
  if (lastPayment && lastPayment.date > earliest) earliest = lastPayment.date;
  if (lastPayoff && lastPayoff.on > earliest) earliest = lastPayoff.on;
  return earliest;
}

const withPayoff = (terms: LoanTerms, on: string, cents: number): LoanTerms => ({
  ...terms,
  payoffs: [...(terms.payoffs ?? []), { on: dayOf(on), amount: fromCents(cents) }],
});

/**
 * Whether paying `cents` on `on` leaves every payment and payoff already made as it was: each
 * payoff posts as much as before, and the loan is not paid off before the last payment made.
 */
function leavesMadeAlone(
  terms: LoanTerms,
  before: Amortisation,
  on: string,
  cents: number,
  lastPaymentOn: string | undefined,
): boolean {
  const after = amortise(withPayoff(terms, on, cents));
  if (lastPaymentOn && after.payoffOn !== null && after.payoffOn < lastPaymentOn) return false;
  // The new payoff posts after any already paid that day, so the others keep their order.
  const added = newIndex(after, on);
  const others = after.payoffs.filter((_, index) => index !== added);
  return (
    others.length === before.payoffs.length &&
    others.every((posting, index) => appliedCents(posting) === appliedCents(before.payoffs[index]))
  );
}

/** The new payoff's place among the postings: the last one dated `on`. */
function newIndex(schedule: Amortisation, on: string): number {
  for (let index = schedule.payoffs.length - 1; index >= 0; index -= 1) {
    if (schedule.payoffs[index].on === on) return index;
  }
  return -1;
}

/**
 * Whether a payoff can be made, and what it does. `today` is yyyy-mm-dd (`useToday`); it bounds the
 * date and decides which payments are already made.
 */
export function checkPayoff(terms: LoanTerms, payoff: PayoffRequest, today: string): PayoffCheck {
  const refuse = (refusal: PayoffRefusal): PayoffCheck => ({ ok: false, refusal });
  const before = amortise(terms);
  const status = loanStatus(terms, today);
  if (status.paidOff) return refuse({ reason: 'finished' });

  const cents = wholeCents(payoff.amount);
  if (cents === null) return refuse({ reason: 'not-an-amount' });
  if (cents <= 0) return refuse({ reason: 'zero' });

  const { on } = payoff;
  if (!isDay(on)) return refuse({ reason: 'not-a-date' });
  if (on > today) return refuse({ reason: 'future', latest: today });
  const start = toIsoDate(before.fundedOn);
  if (on < start) return refuse({ reason: 'before-start', earliest: start });

  const quoteCents = toCents(payoffQuote(terms, on).payoff);
  if (quoteCents <= 0) return refuse({ reason: 'finished' });
  if (cents > quoteCents) return refuse({ reason: 'more-than-owed', quote: fromCents(quoteCents) });

  const kind = cents === quoteCents ? 'full' : 'partial';
  const lastPayment = lastWhere(before.rows, (row) => row.date <= today);
  if (kind === 'full') {
    if (lastPayment && on < lastPayment.date) {
      return refuse({
        reason: 'before-last-payment',
        lastPaymentOn: lastPayment.date,
        earliest: lastPayment.date,
      });
    }
    const lastPayoff = before.payoffs[before.payoffs.length - 1];
    if (lastPayoff && on < lastPayoff.on) {
      return refuse({
        reason: 'before-last-payoff',
        lastPayoffOn: lastPayoff.on,
        earliest: lastPayoff.on,
      });
    }
  } else if (!leavesMadeAlone(terms, before, on, cents, lastPayment?.date)) {
    // Less money leaves more owed later, so the most allowed is found by bisection.
    let low = 0;
    let high = cents;
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (leavesMadeAlone(terms, before, on, middle, lastPayment?.date)) low = middle;
      else high = middle;
    }
    return refuse({ reason: 'overtakes-later', most: fromCents(low) });
  }

  const next = withPayoff(terms, on, cents);
  const after = amortise(next);
  const posting = after.payoffs[newIndex(after, on)];
  if (!posting) return refuse({ reason: 'finished' });

  return {
    ok: true,
    kind,
    quote: fromCents(quoteCents),
    interest: posting.interest,
    principal: posting.principal,
    balance: posting.balance,
    terms: next,
    endsOn: after.payoffOn ?? on,
    paymentsLeft: loanStatus(next, today).paymentsLeft,
    paymentsLeftBefore: status.paymentsLeft,
    interestSaved: fromCents(toCents(before.totalInterest) - toCents(after.totalInterest)),
  };
}

/**
 * The loan with one recorded payoff taken back out, and the day it then ends: what the bill
 * ends on again (`delete_loan_payoff`'s `p_last_payment_on`). Null when no payoff has that id.
 * Later payoffs stay as paid, so one that cleared the loan may now leave a little owing.
 */
export function withoutPayoff(
  terms: LoanTerms,
  id: string,
): { terms: LoanTerms; endsOn: string | null } | null {
  const payoffs = terms.payoffs ?? [];
  if (!payoffs.some((payoff) => payoff.id === id)) return null;
  const left = payoffs.filter((payoff) => payoff.id !== id);
  const next = { ...terms, payoffs: left.length > 0 ? left : undefined };
  return { terms: next, endsOn: amortise(next).payoffOn };
}
