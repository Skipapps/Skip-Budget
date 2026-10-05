/**
 * The wall between Free and Pro, in one place: every gate reads this map, so moving a feature
 * between tiers is a one-line change here.
 *
 * The wall gates verbs, never nouns: Pro is about what an account can *start*, not what it owns.
 * Everything already created stays fully usable on any tier; only creation is counted, winding
 * down (settling, paying off, closing) is always free, and the tools below are all a lapse
 * switches off. Splitting is deliberately absent: joining, spending and settling in a group are
 * free for everyone, and the only Pro part is opening a group beyond `FREE_LIMITS.openGroups`.
 */
export const WALL = {
  loanCalculator: 'pro',
  insights: 'pro',
  receiptScan: 'pro',
  /** Adding a receipt, bill or subscription by speaking it. */
  voice: 'pro',
} as const;

export type WalledFeature = keyof typeof WALL;

/** What the free plan keeps of each countable thing. */
export const FREE_LIMITS = {
  cards: 1,
  bankAccounts: 1,
  incomeSources: 1,
  /** Open groups this account created; closed groups free the slot. */
  openGroups: 1,
} as const;

export const PRO_MONTHLY_LABEL = '$1.99/mo';
export const PRO_YEARLY_LABEL = '$19.99/yr';
