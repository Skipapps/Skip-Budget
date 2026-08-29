/**
 * Placeholder money buckets shown on the cards screen. Sample data only.
 */
import type { ArtworkName } from '@/theme/artwork';

export type MoneyBucket = {
  id: string;
  label: string;
  amount: number;
  /** Looked up in the artwork registry, which knows the light and dark pair. */
  artwork: ArtworkName;
};

export const moneyBuckets: MoneyBucket[] = [
  { id: 'salary', label: 'Salary', amount: 5600, artwork: 'tileSalary' },
  { id: 'savings', label: 'Savings', amount: 12850, artwork: 'tileSavings' },
];
