/**
 * Placeholder subscriptions. Sample data only — replaced once subscriptions
 * come from the database.
 *
 * No icon field yet: what sits in the row's leading circle is still undecided.
 */
export const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export type BillingCycle = (typeof BILLING_CYCLES)[number]['value'];

export type Subscription = {
  id: string;
  name: string;
  /** Negative is money out. */
  amount: number;
  cycle: BillingCycle;
  /** ISO yyyy-mm-dd of the next renewal. */
  renewsOn: string;
  /** Card or bank account it is charged to. */
  sourceId: string;
};
