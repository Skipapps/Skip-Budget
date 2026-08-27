/**
 * Placeholder money buckets shown on the cards screen. Sample data only.
 */
import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import SalaryArt from '@/assets/illustrations/tile-salary.svg';
import SavingsArt from '@/assets/illustrations/tile-savings.svg';

export type MoneyBucket = {
  id: string;
  label: string;
  amount: number;
  artwork: FC<SvgProps>;
};

export const moneyBuckets: MoneyBucket[] = [
  { id: 'salary', label: 'Salary', amount: 5600, artwork: SalaryArt },
  { id: 'savings', label: 'Savings', amount: 12850, artwork: SavingsArt },
];
