import { useMemo } from 'react';

import { loanTermsOf, useLoans } from '@/api/loans';
import { endingOfTerms, type LoanEnding } from '@/components/loans/loan-ending';

export type LoanEndingByBill = ReadonlyMap<string, { ending: LoanEnding; endedOn: string | null }>;

/**
 * How each saved loan stands, by its bill's id, for lists of bills that must say "Paid off" or
 * "Stopped" as the Loans page does. Empty until the loans are read.
 */
export function useLoanEndings(today: string): LoanEndingByBill {
  const { loans } = useLoans(today);
  return useMemo(() => {
    const endings = new Map<string, { ending: LoanEnding; endedOn: string | null }>();
    for (const row of loans) {
      const terms = loanTermsOf(row);
      if (terms) endings.set(row.bill.id, endingOfTerms(terms, row.bill, today));
    }
    return endings;
  }, [loans, today]);
}
