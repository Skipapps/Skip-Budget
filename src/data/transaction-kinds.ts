export const TRANSACTION_KINDS = [
  { value: 'income', label: 'Income' },
  { value: 'bill', label: 'Monthly Bills' },
  { value: 'receipt', label: 'Receipts' },
  { value: 'subscription', label: 'Subscriptions' },
] as const;

export type TransactionKind = (typeof TRANSACTION_KINDS)[number]['value'];
