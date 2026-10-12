import { loanFinished, type LoanBill } from '@/lib/active-loans';
import type { LoanStatus } from '@/lib/loan-status';

/**
 * Null while the loan is being paid. 'paid' once the schedule's last payment has come; 'stopped'
 * when its bill stopped running with money still owed.
 */
export type LoanEnding = 'paid' | 'stopped' | null;

/**
 * Whether a loan is finished and how, by the rule the Cards tab counts by (`loanFinished`), so the
 * Loans page and the loan's own page never disagree. `endedOn` is the last payment's date, or the
 * bill's end date for a stopped loan (null when it has none).
 */
export function loanEnding(
  bill: Pick<LoanBill, 'next_due_on' | 'ends_on'>,
  status: Pick<LoanStatus, 'paidOff' | 'lastPaymentOn'>,
  today: string,
): { ending: LoanEnding; endedOn: string | null } {
  if (!loanFinished(bill, today, status.lastPaymentOn)) return { ending: null, endedOn: null };
  return status.paidOff
    ? { ending: 'paid', endedOn: status.lastPaymentOn }
    : { ending: 'stopped', endedOn: bill.ends_on ?? null };
}
