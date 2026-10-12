/**
 * The Pay off page's door to the loan engine (`@/lib/loan-payoff`): what clears the loan on a day,
 * and whether an amount can be paid then and what it does. Every figure and every refusal is the
 * engine's; nothing here adds up money.
 */

import { toIsoDate } from '@/lib/date';
import type { LoanTerms } from '@/lib/loan';
import { payoffQuote, type PayoffRefusal } from '@/lib/loan-payoff';

export {
  checkPayoff,
  payoffDays,
  type PayoffCheck,
  type PayoffDays,
  type PayoffRefusal,
} from '@/lib/loan-payoff';

/** What clears the loan on one day ("Pay it all"), and the interest that is part of it. */
export type PayoffQuoteOn = {
  /** yyyy-mm-dd */
  on: string;
  payoff: number;
  /** The interest in `payoff`, built up since `since`. */
  interest: number;
  /** yyyy-mm-dd of the last payment or payoff, or the day the loan started. */
  since: string;
};

export function quoteOn(terms: LoanTerms, on: string): PayoffQuoteOn {
  const quote = payoffQuote(terms, on);
  return {
    on,
    payoff: quote.payoff,
    interest: quote.accruedInterest,
    since: toIsoDate(quote.accruedSince),
  };
}

/**
 * Whether a refusal is about the day alone, and a day the calendar offers would do: it is put
 * right on the page with the day, not on the keypad.
 */
export function dayCanFix(refusal: PayoffRefusal, today: string): boolean {
  switch (refusal.reason) {
    case 'future':
    case 'before-start':
      return true;
    case 'before-last-payment':
    case 'before-last-payoff':
      return refusal.earliest <= today;
    default:
      return false;
  }
}
