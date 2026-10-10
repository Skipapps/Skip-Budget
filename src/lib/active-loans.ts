export type LoanBill = {
  id: string;
  name: string;
  next_due_on: string | null;
  ends_on?: string | null;
};

export type ActiveLoan = { billId: string; name: string };

/**
 * Whether a loan's bill has stopped running: it has no next date, or its end date (the last
 * payment's, set when the loan was saved) has come.
 */
export function loanBillEnded(
  bill: Pick<LoanBill, 'next_due_on' | 'ends_on'>,
  today: string,
): boolean {
  return !bill.next_due_on || Boolean(bill.ends_on && bill.ends_on <= today);
}

/**
 * Whether a loan is finished: its last payment is dated on or before today, as the schedule counts
 * a payment made, or its bill has stopped running. The Cards tab's count and the Loans page both ask
 * this, so a loan never reads paid off in one and active in the other. Without the schedule's last
 * date, the bill's end date stands for it.
 */
export function loanFinished(
  bill: Pick<LoanBill, 'next_due_on' | 'ends_on'>,
  today: string,
  lastPaymentOn?: string | null,
): boolean {
  return loanBillEnded(bill, today) || Boolean(lastPaymentOn && lastPaymentOn <= today);
}

/** The loans still being paid, read off the bills they live behind, in the bills' order. */
export function activeLoans(
  bills: readonly LoanBill[],
  loanBillIds: readonly string[],
  today: string,
): ActiveLoan[] {
  const loans = new Set(loanBillIds);
  return bills
    .filter((bill) => loans.has(bill.id) && !loanFinished(bill, today))
    .map((bill) => ({ billId: bill.id, name: bill.name }));
}
