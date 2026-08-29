/**
 * The two tiles under Money on the cards screen.
 *
 * Definitions only — a label and which artwork to draw. The figures beside
 * them are the real ones, read from salary sources and savings pots by the
 * screen itself. There used to be sample amounts here as well, and leaving
 * them was an invitation to render an invented balance in a budgeting app.
 */
import type { ArtworkName } from '@/theme/artwork';

export type MoneyBucket = {
  id: string;
  label: string;
  /** Looked up in the artwork registry, which knows the light and dark pair. */
  artwork: ArtworkName;
};

export const moneyBuckets: MoneyBucket[] = [
  { id: 'salary', label: 'Salary', artwork: 'tileSalary' },
  { id: 'savings', label: 'Savings', artwork: 'tileSavings' },
];
