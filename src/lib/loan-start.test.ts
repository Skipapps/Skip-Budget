import type { StoredLoan } from '@/lib/loan';
import { loanTermsForBill } from '@/lib/loan-start';

/** Where a saved loan's schedule starts, the same on the bill page and the Loans page. */

const LOAN: StoredLoan = {
  principal: 18000,
  annual_rate: 6.25,
  term_months: 48,
  monthly_payment: 424.81,
  first_payment_on: '2024-07-15',
  funded_on: '2024-06-15',
  day_count_basis: 'actual/365',
  statement_on: null,
  statement_principal: null,
};

const BILL = { starts_on: '2025-01-20', next_due_on: '2026-10-20' };

describe('loanTermsForBill', () => {
  it('keeps the loan’s own first payment date', () => {
    expect(loanTermsForBill(LOAN, BILL)?.firstPaymentOn).toEqual(new Date(2024, 6, 15));
  });

  it('counts a loan without one from the bill’s first due date, never its next', () => {
    const terms = loanTermsForBill({ ...LOAN, first_payment_on: null }, BILL);
    expect(terms?.firstPaymentOn).toEqual(new Date(2025, 0, 20));
  });

  it('has no schedule when neither date is known', () => {
    expect(loanTermsForBill({ ...LOAN, first_payment_on: null }, { starts_on: null })).toBeNull();
    expect(loanTermsForBill({ ...LOAN, first_payment_on: null }, null)).toBeNull();
  });
});
