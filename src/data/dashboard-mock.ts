/**
 * Placeholder dashboard content.
 *
 * Everything here is sample data so the screen can be designed and reviewed
 * before the database exists. Replace wholesale once queries are wired up.
 */
import { Coffee, Gem, ShoppingCart, type LucideIcon } from 'lucide-react-native';

import type { ArtworkName } from '@/theme/artwork';

export type SpendingCategory = {
  id: string;
  label: string;
  /** Looked up in the artwork registry, which knows the light and dark pair. */
  artwork: ArtworkName;
};

export type Transaction = {
  id: string;
  label: string;
  amount: number;
  icon: LucideIcon;
};

export const account = {
  name: 'Alex',
  balance: 31495,
  /** Next incoming pay. */
  payday: 4200,
  /** Spent so far this month. */
  expenses: -1865.75,
};

/**
 * Tile definitions only — label and artwork.
 *
 * The figures used to live here and were invented. They are computed from the
 * real tables now, and the two calculators carry no figure at all: they open a
 * tool rather than report spending, so a number beside them meant nothing.
 */
export const spendingCategories: SpendingCategory[] = [
  { id: 'monthly-bills', label: 'Monthly Bills', artwork: 'tileMonthlyBills' },
  { id: 'receipts', label: 'Receipts', artwork: 'tileReceipts' },
  { id: 'subscriptions', label: 'Subscriptions', artwork: 'tileSubscriptions' },
  { id: 'loan-calculator', label: 'Loan calculator', artwork: 'tileLoanRepayment' },
  { id: 'split-calculator', label: 'Splits', artwork: 'tileSplitCalculator' },
];

/** Day the dashboard opens on. */
export const initialDate = new Date(2026, 4, 4);

export const transactions: Transaction[] = [
  { id: 'txn-1', label: 'Supermarket', amount: -35, icon: ShoppingCart },
  { id: 'txn-2', label: 'Jewellery', amount: -120, icon: Gem },
  { id: 'txn-3', label: 'Supermarket', amount: -30, icon: ShoppingCart },
  { id: 'txn-4', label: 'Coffee shop', amount: -4.75, icon: Coffee },
];

/** Derived so the header total can never drift from the list below it. */
export const dayTotal = transactions.reduce((sum, txn) => sum + txn.amount, 0);
