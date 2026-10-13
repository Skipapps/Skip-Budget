import { loanTermsOf, type LoanListRow } from '@/api/loans';
import type { LoanCardData } from '@/components/loans/loan-list-card';
import { loanEnding, type LoanEnding } from '@/components/loans/loan-ending';
import type { LoansSummaryData } from '@/components/loans/loans-summary-card';
import { loanPricingDay } from '@/lib/active-loans';
import { paidOffOn } from '@/lib/loan-payoff';
import { loanStatus, loansSummary, type LoanStatus } from '@/lib/loan-status';

/**
 * The Loans page's figures, shared with Insights so the two pages can never disagree by a cent.
 */

export type PricedLoan = {
  row: LoanListRow;
  status: LoanStatus;
  ending: LoanEnding;
  endedOn: string | null;
};

/**
 * Where each saved loan stands, from its own schedule with its payoffs, and whether it is
 * finished. A loan paid off, or whose bill stopped early, is read as of that day (`loanPricingDay`).
 */
export function priceLoans(rows: readonly LoanListRow[], today: string): PricedLoan[] {
  const priced: PricedLoan[] = [];
  for (const row of rows) {
    const terms = loanTermsOf(row);
    if (!terms) continue;
    const status = loanStatus(terms, loanPricingDay(row.bill, today, paidOffOn(terms)));
    priced.push({ row, status, ...loanEnding(row.bill, status, today) });
  }
  return priced;
}

export function cardOf({ row, status, ending, endedOn }: PricedLoan): LoanCardData {
  return {
    billId: row.bill.id,
    name: row.bill.name,
    iconId: row.bill.icon_id,
    principal: status.borrowed,
    annualRate: status.annualRate,
    termMonths: row.term_months,
    startedOn: status.startedOn,
    monthly: status.monthlyPayment,
    paymentsLeft: status.paymentsLeft,
    paymentCount: status.paymentCount,
    nextOn: status.nextPayment?.date ?? null,
    left: status.amountLeft,
    paidPercent: status.percentPaid,
    ending,
    endedOn,
  };
}

/** The open loans' totals, as the Loans page's summary card shows them. */
export function loansPageSummary(priced: readonly PricedLoan[]): LoansSummaryData {
  // Every finished loan leaves the sums, the stopped ones as well as the paid off.
  const totals = loansSummary(
    priced.map((loan) => ({
      ...loan,
      status: { ...loan.status, paidOff: loan.ending !== null },
    })),
  );
  return {
    owed: totals.totalOwed,
    monthly: totals.monthlyPayments,
    borrowed: totals.totalBorrowed,
    paid: totals.totalPaid,
    percentPaid: totals.percentPaid,
    rateRange: totals.rateRange,
    count: totals.openCount,
  };
}
