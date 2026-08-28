/**
 * Placeholder transaction history. Sample data only — replaced once
 * transactions come from the database.
 */
export const TRANSACTION_KINDS = [
  { value: 'bill', label: 'Monthly Bills' },
  { value: 'receipt', label: 'Receipts' },
  { value: 'subscription', label: 'Subscriptions' },
  { value: 'loan', label: 'Loan repayment' },
] as const;

export type TransactionKind = (typeof TRANSACTION_KINDS)[number]['value'];

export type LedgerEntry = {
  id: string;
  label: string;
  /** Negative is money out. */
  amount: number;
  /** ISO yyyy-mm-dd so entries sort and group without parsing. */
  date: string;
  kind: TransactionKind;
  /** Id of the card or bank account it was paid from. */
  sourceId: string;
};
