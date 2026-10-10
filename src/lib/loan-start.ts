import { termsFromStored, type LoanTerms, type StoredLoan } from '@/lib/loan';

/**
 * The terms a saved loan's schedule is built from, the same on the bill page and the Loans page. A
 * loan saved without its own first payment date counts from its bill's first due date (`starts_on`):
 * the next due date would restart the schedule today and show no payments made.
 */
export function loanTermsForBill(
  loan: StoredLoan,
  bill: { starts_on?: string | null } | null | undefined,
): LoanTerms | null {
  return termsFromStored(loan, bill?.starts_on ?? undefined);
}
