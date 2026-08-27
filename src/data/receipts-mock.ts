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

export const receipts: Receipt[] = [
  { id: 'r1', merchant: 'Walmart', amount: -86.42, date: '2026-08-26', sourceId: 'card-1' },
  { id: 'r2', merchant: 'Kroger', amount: -54.19, date: '2026-08-26', sourceId: 'card-2' },
  { id: 'r3', merchant: 'CVS Pharmacy', amount: -18.3, date: '2026-08-25', sourceId: 'card-3' },
  { id: 'r4', merchant: 'Costco', amount: -212.6, date: '2026-08-25', sourceId: 'acct-1' },
  { id: 'r5', merchant: 'Target', amount: -32.75, date: '2026-08-24', sourceId: 'card-1' },
  { id: 'r6', merchant: "Trader Joe's", amount: -47.88, date: '2026-08-24', sourceId: 'card-2' },
  { id: 'r7', merchant: 'Home Depot', amount: -139.95, date: '2026-08-23', sourceId: 'card-1' },
  { id: 'r8', merchant: 'Whole Foods', amount: -62.14, date: '2026-08-22', sourceId: 'acct-1' },
  { id: 'r9', merchant: 'Walgreens', amount: -24.6, date: '2026-08-22', sourceId: 'card-3' },
  { id: 'r10', merchant: 'Aldi', amount: -38.2, date: '2026-08-21', sourceId: 'card-2' },
  { id: 'r11', merchant: 'Safeway', amount: -71.05, date: '2026-08-20', sourceId: 'acct-2' },
  { id: 'r12', merchant: 'Best Buy', amount: -249.99, date: '2026-08-19', sourceId: 'card-1' },
];
