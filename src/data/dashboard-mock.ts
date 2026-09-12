/**
 * The dashboard tiles, as definitions.
 *
 * The file is still named for the sample data it held while the screen was
 * being designed. What is left is not sample data: it is the list of tiles the
 * dashboard and the tile-order screen both read, with no figure attached —
 * every amount beside a tile is computed from the real tables.
 *
 * The invented ones are gone (2026-09-12): `account`, `transactions`,
 * `initialDate`, `dayTotal` and the `Transaction` type were imported by
 * nothing, and an exported `balance: 31495` sitting in the data folder of a
 * budgeting app is one careless import away from being on screen.
 */

export type SpendingCategory = {
  id: string;
  label: string;
};

/**
 * Tile definitions only — id and label.
 *
 * The figures used to live here and were invented. They are computed from the
 * real tables now, and the two calculators carry no figure at all: they open a
 * tool rather than report spending, so a number beside them meant nothing.
 */
export const spendingCategories: SpendingCategory[] = [
  { id: 'monthly-bills', label: 'Monthly Bills' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'loan-calculator', label: 'Loan calculator' },
  { id: 'split-calculator', label: 'Split manager' },
];
