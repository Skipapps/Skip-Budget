/**
 * Stopping a bill (or the bill a loan lives behind) today while keeping what it already charged:
 * "Keep past" on a delete. Pure: no clock, no queries. A subscription stops with `active: false`
 * and needs nothing from here.
 */

/** The dates a stop reads off the bill as stored. */
export type StoppableBill = {
  starts_on?: string | null;
  ends_on?: string | null;
  next_due_on: string | null;
};

/** What a stop writes. Nothing else on the bill changes. */
export type StopBillValues =
  { ends_on: string } | { starts_on: string; ends_on: string; next_due_on: null };

/**
 * Whether a bill has stopped running: it has no next date, or its end date has come. The same rule
 * `loanBillEnded` gives a loan's bill, so a stopped loan and a stopped bill read alike. A bill
 * stopped today is stopped already, though today's due is still recorded (see `stopBillValues`).
 */
export function billStopped(bill: StoppableBill, today: string): boolean {
  return !bill.next_due_on || Boolean(bill.ends_on && bill.ends_on <= today);
}

/**
 * The values that stop a bill at the end of `today` (yyyy-mm-dd), inclusive: a payment due today
 * is still recorded, nothing after it is recorded, projected or reminded.
 *
 * - Already ended on or before today: the end it has. Moving it to today would reopen the days
 *   between and the recorders would fill them in.
 * - Counting from a day after today (an edit can move the start past the cycle already charged):
 *   ends_on = today alone would come before starts_on, which bills_period_order refuses. Nothing
 *   was due before that start, so the bill stops with no next date, and both recorders skip it.
 * - Otherwise ends_on = today, and the next date stays, so today's due is written whether the
 *   server or the phone gets there first.
 */
export function stopBillValues(bill: StoppableBill, today: string): StopBillValues {
  if (bill.ends_on && bill.ends_on <= today) return { ends_on: bill.ends_on };
  if (bill.starts_on && bill.starts_on > today) {
    return { starts_on: today, ends_on: today, next_due_on: null };
  }
  return { ends_on: today };
}
