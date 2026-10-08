/**
 * The two tiles under Money on the cards screen. Label and artwork only: the screen reads the
 * figures from salary sources and savings pots.
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
