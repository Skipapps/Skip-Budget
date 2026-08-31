/**
 * The wall between Free and Pro, in one place.
 *
 * Every gate in the app reads this map rather than knowing the tiers itself,
 * so moving a feature between them after real conversion data is a one-line
 * change here — and nowhere else.
 */
export const WALL = {
  loanCalculator: 'pro',
  splitManager: 'pro',
  insights: 'pro',
  receiptScan: 'pro',
  theming: 'pro',
} as const;

export type WalledFeature = keyof typeof WALL;

/** What the free plan keeps of each countable thing. */
export const FREE_LIMITS = {
  cards: 1,
  bankAccounts: 1,
  incomeSources: 1,
} as const;

export const PRO_MONTHLY_LABEL = '$1.99/mo';
export const PRO_YEARLY_LABEL = '$19.99/yr';
