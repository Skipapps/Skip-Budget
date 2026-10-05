/**
 * Receipt, bill or subscription. Salary is out of scope: "got paid" and "paycheck" are not
 * keywords, so such a sentence falls back to an unsure receipt.
 *
 * The order, first match wins:
 *  1. A subscription word (subscription, renew, membership) makes a subscription.
 *  2. A strong bill word (rent, mortgage, electric, insurance, "phone bill") makes a bill.
 *  3. "bill"/"utilities" makes a bill, unless the merchant is a subscription ("my Netflix bill").
 *  4. A spoken cycle means it recurs: a bill when the merchant is a biller or a bill word or "due"
 *     is there, a subscription otherwise ("gym 40 a month").
 *  5. A purchase word (bought, spent, groceries, coffee, "at <store>") makes a receipt. It beats
 *     the weaker hints below ("bought water", "bought a phone at Verizon").
 *  6. A weak bill word (water, phone, cable, trash) makes a bill.
 *  7. "due" makes a bill, or a subscription for a subscription merchant.
 *  8. The merchant decides: streaming, software, news, meal-kit brands and subscription products
 *     (iCloud, Amazon Prime) are subscriptions; utilities, phone/internet, insurers and banks are
 *     bills; shops, restaurants and gas stations are receipts. Gyms, delivery apps and warehouse
 *     clubs say nothing: people pay them both ways.
 *  9. Nothing said it: a receipt, with `kindSure` false.
 */
import type { Signal } from './bill-category';
import type { Token } from './clean';
import type { VoiceKind } from './types';

const SUBSCRIPTION_WORDS = [
  'subscription',
  'subscriptions',
  'subscribe',
  'subscribed',
  'renew',
  'renews',
  'renewal',
  'renewed',
  'renewing',
  'autorenew',
  'auto renew',
  'auto renewal',
  'membership',
  'memberships',
];

/** Products sold under a non-subscription brand: Apple is electronics, Amazon is shopping. */
const SUBSCRIPTION_PRODUCTS = [
  'icloud',
  'icloud plus',
  'apple music',
  'apple tv',
  'apple tv plus',
  'apple one',
  'apple arcade',
  'apple news plus',
  'apple fitness plus',
  'amazon prime',
  'prime video',
  'prime membership',
  'amazon music',
  'kindle unlimited',
  'walmart plus',
  'uber one',
  'dashpass',
  'instacart plus',
  'grubhub plus',
  'spotify premium',
  'youtube premium',
];

const BILL_WORDS = ['bill', 'bills', 'utility', 'utilities', 'invoice'];

const RECEIPT_WORDS = [
  'receipt',
  'bought',
  'buy',
  'buying',
  'spent',
  'spend',
  'spending',
  'grabbed',
  'grab',
  'ordered',
  'order',
  'purchased',
  'purchase',
  'picked up',
  'groceries',
  'grocery',
  'lunch',
  'dinner',
  'breakfast',
  'brunch',
  'coffee',
  'takeout',
  'take out',
  'snacks',
  'snack',
  'drinks',
  'gas',
  'fuel',
  'filled up',
  'fill up',
  'tip',
  'meal',
  'food',
  'shopping',
];

/**
 * Every word the kind rules read, so the merchant rules never take one for a name. Subscription
 * products are left out on purpose: "apple" and "amazon" are merchants too.
 */
export const KIND_WORDS = new Set(
  [...SUBSCRIPTION_WORDS, ...BILL_WORDS, ...RECEIPT_WORDS, 'due'].flatMap((phrase) =>
    phrase.split(' '),
  ),
);

const SUBSCRIPTION_CATEGORIES = new Set(['entertainment', 'software', 'news', 'meals']);
const BILL_CATEGORIES = new Set(['utilities', 'telecom', 'insurance', 'finance']);
const RECEIPT_CATEGORIES = new Set([
  'groceries',
  'dining',
  'fuel',
  'pharmacy',
  'shopping',
  'clothing',
  'electronics',
  'home',
  'beauty',
  'pets',
  'transport',
]);

export type BrandLean = VoiceKind | null;

/** What a merchant's spend category says about kind; null for gyms, delivery apps, unknowns. */
export function leanOfCategory(categoryId: string | null): BrandLean {
  if (categoryId === null) return null;
  if (SUBSCRIPTION_CATEGORIES.has(categoryId)) return 'subscription';
  if (BILL_CATEGORIES.has(categoryId)) return 'bill';
  if (RECEIPT_CATEGORIES.has(categoryId)) return 'receipt';
  return null;
}

function phraseAt(tokens: readonly Token[], index: number, phrase: string): number {
  const words = phrase.split(' ');
  return words.every((word, offset) => tokens[index + offset]?.key === word) ? words.length : 0;
}

function findPhrases(
  tokens: readonly Token[],
  phrases: readonly string[],
  skip: (index: number) => boolean,
): boolean {
  for (let index = 0; index < tokens.length; index += 1) {
    if (skip(index)) continue;
    if (phrases.some((phrase) => phraseAt(tokens, index, phrase) > 0)) return true;
  }
  return false;
}

export type KindEvidence = {
  /** Category words that survived corrections, with their strength. */
  categorySignals: readonly Signal[];
  /** A cycle phrase was said, even one the app cannot store ("every two weeks"). */
  recurring: boolean;
  brandLean: BrandLean;
  atMerchant: boolean;
  /** Tokens already read as a category phrase, so "gas" in "gas bill" is not fuel. */
  inCategoryPhrase: (index: number) => boolean;
};

export type KindResult = { kind: VoiceKind; sure: boolean };

export function decideKind(tokens: readonly Token[], evidence: KindEvidence): KindResult {
  const never = () => false;
  const subscriptionWord = findPhrases(tokens, SUBSCRIPTION_WORDS, never);
  const product = findPhrases(tokens, SUBSCRIPTION_PRODUCTS, never);
  const billWord = findPhrases(tokens, BILL_WORDS, evidence.inCategoryPhrase);
  const due = findPhrases(tokens, ['due'], never);
  const purchase =
    findPhrases(tokens, RECEIPT_WORDS, evidence.inCategoryPhrase) || evidence.atMerchant;
  const strong = evidence.categorySignals.includes('strong');
  const weak = evidence.categorySignals.includes('weak');

  const subscriptionMerchant = product || evidence.brandLean === 'subscription';
  const billMerchant = evidence.brandLean === 'bill';

  if (subscriptionWord) return { kind: 'subscription', sure: true };
  if (strong) return { kind: 'bill', sure: true };
  if (billWord) return { kind: subscriptionMerchant ? 'subscription' : 'bill', sure: true };
  if (evidence.recurring) {
    if (subscriptionMerchant) return { kind: 'subscription', sure: true };
    return { kind: billMerchant || weak || due ? 'bill' : 'subscription', sure: true };
  }
  if (purchase) return { kind: 'receipt', sure: true };
  if (weak) return { kind: 'bill', sure: true };
  if (due) return { kind: subscriptionMerchant ? 'subscription' : 'bill', sure: true };
  if (subscriptionMerchant) return { kind: 'subscription', sure: true };
  if (billMerchant) return { kind: 'bill', sure: true };
  if (evidence.brandLean === 'receipt') return { kind: 'receipt', sure: true };
  return { kind: 'receipt', sure: false };
}
