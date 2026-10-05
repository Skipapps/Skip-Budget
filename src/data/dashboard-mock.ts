export type SpendingCategory = {
  id: string;
  label: string;
};

/**
 * Tile definitions only: figures beside a tile are computed from the real tables, and the two
 * calculators carry none because they open a tool.
 */
export const spendingCategories: SpendingCategory[] = [
  { id: 'monthly-bills', label: 'Monthly Bills' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'loan-calculator', label: 'Loan Calculator' },
  { id: 'split-calculator', label: 'Split Manager' },
];
