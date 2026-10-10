/**
 * Why the database refused to save a loan, when it is something the form can say in its own words
 * rather than the house failure line. Read off the refusal's code and words, so a network failure or
 * any other check never reads as one of these:
 *
 *   'payments'     a changed payment the overrides check refuses (a payment number outside
 *                  1…term − 1, an amount not a positive number of whole cents): 23514 naming
 *                  loans_payment_overrides_valid
 *   'rate'         a rate outside 0–100%: 23514 naming loans_annual_rate_check
 *   'lastPayment'  a payoff date outside the term: save_loan's P0001 "the last payment must fall
 *                  within the term"
 */
export type LoanSaveRefusal = 'payments' | 'rate' | 'lastPayment';

export function refusedLoanSave(thrown: unknown): LoanSaveRefusal | null {
  if (!thrown || typeof thrown !== 'object') return null;
  const { code, message } = thrown as { code?: unknown; message?: unknown };
  if (typeof message !== 'string') return null;

  if (code === '23514') {
    if (message.includes('loans_payment_overrides_valid')) return 'payments';
    if (message.includes('loans_annual_rate_check')) return 'rate';
    return null;
  }
  if (code === 'P0001' && message.includes('the last payment must fall within the term')) {
    return 'lastPayment';
  }
  return null;
}
