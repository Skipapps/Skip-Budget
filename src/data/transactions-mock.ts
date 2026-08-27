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

export const ledger: LedgerEntry[] = [
  {
    id: 'e1',
    label: 'Netflix',
    amount: -15.99,
    date: '2026-08-26',
    kind: 'subscription',
    sourceId: 'card-1',
  },
  {
    id: 'e2',
    label: 'Supermarket',
    amount: -64.2,
    date: '2026-08-26',
    kind: 'receipt',
    sourceId: 'card-2',
  },
  {
    id: 'e3',
    label: 'Electricity',
    amount: -128.4,
    date: '2026-08-26',
    kind: 'bill',
    sourceId: 'acct-1',
  },
  {
    id: 'e4',
    label: 'Car loan',
    amount: -412.0,
    date: '2026-08-25',
    kind: 'loan',
    sourceId: 'acct-1',
  },
  {
    id: 'e5',
    label: 'Spotify',
    amount: -11.99,
    date: '2026-08-25',
    kind: 'subscription',
    sourceId: 'card-1',
  },
  {
    id: 'e6',
    label: 'Pharmacy',
    amount: -32.15,
    date: '2026-08-25',
    kind: 'receipt',
    sourceId: 'card-3',
  },
  {
    id: 'e7',
    label: 'Internet',
    amount: -59.0,
    date: '2026-08-24',
    kind: 'bill',
    sourceId: 'acct-1',
  },
  {
    id: 'e8',
    label: 'Coffee shop',
    amount: -6.4,
    date: '2026-08-24',
    kind: 'receipt',
    sourceId: 'card-2',
  },
  {
    id: 'e9',
    label: 'iCloud storage',
    amount: -2.99,
    date: '2026-08-23',
    kind: 'subscription',
    sourceId: 'card-1',
  },
  {
    id: 'e10',
    label: 'Water',
    amount: -41.8,
    date: '2026-08-23',
    kind: 'bill',
    sourceId: 'acct-2',
  },
  {
    id: 'e11',
    label: 'Hardware store',
    amount: -88.05,
    date: '2026-08-22',
    kind: 'receipt',
    sourceId: 'card-1',
  },
  {
    id: 'e12',
    label: 'Student loan',
    amount: -260.0,
    date: '2026-08-21',
    kind: 'loan',
    sourceId: 'acct-1',
  },
  {
    id: 'e13',
    label: 'Gym',
    amount: -29.0,
    date: '2026-08-21',
    kind: 'subscription',
    sourceId: 'card-2',
  },
  {
    id: 'e14',
    label: 'Phone bill',
    amount: -45.5,
    date: '2026-08-20',
    kind: 'bill',
    sourceId: 'acct-1',
  },
  {
    id: 'e15',
    label: 'Bookshop',
    amount: -23.75,
    date: '2026-08-20',
    kind: 'receipt',
    sourceId: 'card-3',
  },
];
