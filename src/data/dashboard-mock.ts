export type SpendingCategory = {
  id: string;
  label: string;
};

/**
 * Tile definitions only: figures beside a tile are computed from the real tables, and the loan
 * calculator carries none because it opens a tool.
 */
export const spendingCategories: SpendingCategory[] = [
  { id: 'monthly-bills', label: 'Monthly Bills' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'loan-calculator', label: 'Loan Calculator' },
];
