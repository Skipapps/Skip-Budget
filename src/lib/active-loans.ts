export type LoanBill = {
  id: string;
  name: string;
  next_due_on: string | null;
  ends_on?: string | null;
};

export type ActiveLoan = { billId: string; name: string };

/**
 * The loans still being paid, read off the bills they live behind, in the bills' order. A loan's
 * bill stops running when it has no next date, or once its end date (set from the term when the
 * loan was saved) has passed.
 */
export function activeLoans(
  bills: readonly LoanBill[],
  loanBillIds: readonly string[],
  today: string,
): ActiveLoan[] {
  const loans = new Set(loanBillIds);
  return bills
    .filter(
      (bill) =>
        loans.has(bill.id) && Boolean(bill.next_due_on) && !(bill.ends_on && bill.ends_on < today),
    )
    .map((bill) => ({ billId: bill.id, name: bill.name }));
}
