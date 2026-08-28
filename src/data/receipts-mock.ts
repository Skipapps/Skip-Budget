/**
 * Placeholder receipts. Sample data only — replaced once receipts come from
 * the database.
 *
 * No category or icon field yet: what sits in the row's leading circle is
 * still undecided, so nothing here pretends to know.
 */
export type Receipt = {
  id: string;
  /** Where the purchase was made. */
  merchant: string;
  /** Negative is money out. */
  amount: number;
  /** ISO yyyy-mm-dd so entries sort without parsing. */
  date: string;
  /** Card or bank account it was paid from. */
  sourceId: string;
};
