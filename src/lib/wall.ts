/**
 * The wall between Free and Pro, in one place.
 *
 * Every gate in the app reads this map rather than knowing the tiers itself,
 * so moving a feature between them after real conversion data is a one-line
 * change here — and nowhere else.
 *
 * The wall gates verbs, never nouns (Founder's call, 2026-09-28): Pro is
 * about what an account can *start* from today, never about what it owns.
 * Everything ever created stays fully usable on any tier; only creation is
 * counted, winding down (settling, paying off, closing) is always free, and
 * the pure tools below are the whole of what a lapse switches off. Splitting
 * is deliberately absent: joining, spending and settling in a group are free
 * for everyone, and the only Pro part is opening a group beyond the count.
 */
export const WALL = {
  loanCalculator: 'pro',
  insights: 'pro',
  receiptScan: 'pro',
  /** Adding a receipt, bill or subscription by speaking it. Gate id `voice`. */
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
