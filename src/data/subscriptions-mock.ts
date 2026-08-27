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

export const subscriptions: Subscription[] = [
  {
    id: 's1',
    name: 'Netflix',
    amount: -15.99,
    cycle: 'monthly',
    renewsOn: '2026-09-02',
    sourceId: 'card-1',
  },
  {
    id: 's2',
    name: 'Spotify',
    amount: -11.99,
    cycle: 'monthly',
    renewsOn: '2026-09-05',
    sourceId: 'card-1',
  },
  {
    id: 's3',
    name: 'iCloud storage',
    amount: -2.99,
    cycle: 'monthly',
    renewsOn: '2026-09-07',
    sourceId: 'card-1',
  },
  {
    id: 's4',
    name: 'Gym',
    amount: -29,
    cycle: 'monthly',
    renewsOn: '2026-09-09',
    sourceId: 'card-2',
  },
  {
    id: 's5',
    name: 'Amazon Prime',
    amount: -139,
    cycle: 'yearly',
    renewsOn: '2027-02-14',
    sourceId: 'card-2',
  },
  {
    id: 's6',
    name: 'Adobe Creative Cloud',
    amount: -59.99,
    cycle: 'monthly',
    renewsOn: '2026-09-11',
    sourceId: 'card-1',
  },
  {
    id: 's7',
    name: 'YouTube Premium',
    amount: -13.99,
    cycle: 'monthly',
    renewsOn: '2026-09-14',
    sourceId: 'card-3',
  },
  {
    id: 's8',
    name: 'Disney+',
    amount: -10.99,
    cycle: 'monthly',
    renewsOn: '2026-09-16',
    sourceId: 'card-3',
  },
  {
    id: 's9',
    name: 'Dropbox',
    amount: -119.88,
    cycle: 'yearly',
    renewsOn: '2027-01-08',
    sourceId: 'acct-1',
  },
  {
    id: 's10',
    name: 'New York Times',
    amount: -4,
    cycle: 'monthly',
    renewsOn: '2026-09-19',
    sourceId: 'card-2',
  },
  {
    id: 's11',
    name: 'Xbox Game Pass',
    amount: -16.99,
    cycle: 'monthly',
    renewsOn: '2026-09-21',
    sourceId: 'card-3',
  },
  {
    id: 's12',
    name: 'iCloud+ Family',
    amount: -9.99,
    cycle: 'monthly',
    renewsOn: '2026-09-24',
    sourceId: 'acct-1',
  },
];
