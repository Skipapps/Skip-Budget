import { t } from '@/i18n';
import { formatMoney, NBSP } from '@/i18n/number';
import { getLocaleSnapshot } from '@/i18n/store';

/**
 * The wall between Free and Pro, in one place: every gate reads this map, so moving a feature
 * between tiers is a one-line change here.
 *
 * The wall gates verbs, never nouns: Pro is about what an account can *start*, not what it owns.
 * Everything already created stays fully usable on any tier; only creation is counted, winding
 * down (paying off, closing) is always free, and the tools below are all a lapse switches off.
 */
export const WALL = {
  loanCalculator: 'pro',
  insights: 'pro',
  /** Adding a receipt, bill or subscription by speaking it. */
  voice: 'pro',
  /** Free draws a store's initials where Pro draws its logo. */
  brandLogos: 'pro',
} as const;

export type WalledFeature = keyof typeof WALL;

/** What the free plan keeps of each countable thing. */
export const FREE_LIMITS = {
  cards: 1,
  bankAccounts: 1,
  incomeSources: 1,
  /** Receipts read by the camera, per calendar month. */
  scansPerMonth: 15,
  /** Receipts read from a photo or a file, per calendar month, counted apart from scans. */
  uploadsPerMonth: 15,
} as const;

/**
 * How far back each plan sees its own history. Only the view is shortened: older entries stay
 * stored, keep counting in every balance, and come back the day the account has Pro again.
 */
export const FREE_HISTORY_DAYS = 90;
export const PRO_HISTORY_YEARS = 7;

/** English only, frozen at import; proMonthlyLabel() and proYearlyLabel() follow the language. */
export const PRO_MONTHLY_LABEL = '$1.99/mo';
export const PRO_YEARLY_LABEL = '$19.99/yr';

/**
 * The prices Skip Pro is set at in US dollars, the fallback when the store has not answered.
 * Apple prices each storefront itself, so these figures are never written as another currency's:
 * when the app shows pesos or pounds they carry "US" ("US$1.99", "1,99 $ US"), or a bare "$"
 * would read as a local price nobody is charged.
 */
const PRO_MONTHLY_USD = 1.99;
const PRO_YEARLY_USD = 19.99;

export function usdText(amount: number): string {
  const { language, currency } = getLocaleSnapshot();
  const plain = formatMoney(amount, language, 'USD');
  if (currency === 'USD') return plain;
  return language === 'fr' ? `${plain}${NBSP}US` : `US${plain}`;
}

/** The fallback price alone, for sentences that word the period themselves. */
export const proMonthlyAmount = () => usdText(PRO_MONTHLY_USD);
export const proYearlyAmount = () => usdText(PRO_YEARLY_USD);

export function proMonthlyLabel(): string {
  return t('pro.price.monthly', { price: proMonthlyAmount() });
}

export function proYearlyLabel(): string {
  return t('pro.price.yearly', { price: proYearlyAmount() });
}
