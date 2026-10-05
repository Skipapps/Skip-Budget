/**
 * Step 10: one transaction, or several in one breath?
 *
 * The voice page saves one thing at a time. When a sentence clearly holds two
 * or more ("Netflix 15.99 and Spotify 11.99", "rent 1800 and electric bill
 * 85"), it says so and asks for one at a time instead of offering a review.
 *
 * Conservative on purpose: a false "several" blocks an entry that was fine,
 * while a missed one still lands on the review page, which asks which amount.
 *
 * ## The rule
 * Count the amounts that stand on their own, after corrections, the
 * payment-method filter and the other amount rules have run. Left out:
 * - an add-on: "plus $5", "$5 tip", "$1.60 tax", "a $3 fee", "$10 off";
 * - a unit price: "$3.45 a gallon", "$20 each", "$150 a night";
 * - a count: "3 coffees", "300 megabits".
 *
 * With two or more of those, it is several when any of these holds:
 * 1. two or more different merchants ("$12 at Starbucks and $40 at Target");
 * 2. two or more different bill categories ("rent 1800 and electric bill 85");
 * 3. a merchant and a bill word that are different kinds ("Netflix 15.99 and
 *    rent 1800": a subscription and a bill). A biller with its own bill word
 *    ("Progressive insurance 140 a month, 1680 a year") is one kind, so one.
 *
 * Never several: one merchant or one bill with two figures (the amount
 * choices ask), a correction ("Netflix, actually Hulu, 7.99"), a card it was
 * paid with ("at Target on my Amex"), "twelve fifty", dates and cycles.
 */
import { isUnitPrice, type AmountCandidate } from './amount';
import type { CategorySpan } from './bill-category';
import type { Token } from './clean';
import { leanOfCategory } from './kind';
import type { MerchantSpan } from './merchant';

/** Words that make a figure part of another one's bill. */
const ADD_ONS = new Set([
  'tip',
  'tips',
  'gratuity',
  'tax',
  'taxes',
  'fee',
  'fees',
  'surcharge',
  'shipping',
  'delivery',
  'deposit',
  'discount',
  'off',
  'cashback',
  'change',
  'interest',
]);

const FILLER = new Set(['a', 'an', 'the', 'of', 'was', 'is', 'in', 'for']);

function keyAt(tokens: readonly Token[], index: number): string {
  return tokens[index]?.key ?? '';
}

/** "$5 tip", "$1.60 in tax", "$3 late fee", "tip of $5", "plus $5". */
function isAddOn(tokens: readonly Token[], amount: AmountCandidate): boolean {
  // One word may sit between the figure and what it is: "in tax", "late fee".
  if (ADD_ONS.has(keyAt(tokens, amount.end)) || ADD_ONS.has(keyAt(tokens, amount.end + 1))) {
    return true;
  }
  let before = amount.start - 1;
  while (before >= 0 && FILLER.has(keyAt(tokens, before))) before -= 1;
  const lead = keyAt(tokens, before);
  return lead === 'plus' || ADD_ONS.has(lead);
}

export type SeveralEvidence = {
  tokens: readonly Token[];
  /** Merchants that survived corrections and the payment-method filter. */
  merchants: readonly MerchantSpan[];
  /** Bill category words that survived corrections. */
  categories: readonly CategorySpan[];
  /** Amount candidates that survived corrections. */
  amounts: readonly AmountCandidate[];
  /** Whether the word at an index is a noun a bare number could be counting. */
  isCount: (index: number) => boolean;
};

/** See the module comment. */
export function describesSeveral(evidence: SeveralEvidence): boolean {
  const { tokens } = evidence;
  const own = evidence.amounts.filter(
    (amount) =>
      !isAddOn(tokens, amount) &&
      !isUnitPrice(tokens, amount) &&
      !(amount.bare && evidence.isCount(amount.end)),
  );
  if (own.length < 2) return false;

  const merchants = new Set(evidence.merchants.map((span) => span.merchant.name.toLowerCase()));
  if (merchants.size >= 2) return true;

  const categories = new Set(evidence.categories.map((span) => span.category));
  if (categories.size >= 2) return true;

  // A merchant and a bill word of different kinds. A name the catalog does
  // not know came after "at", which is how purchases are said.
  const kinds = new Set<string>();
  for (const span of evidence.merchants) {
    const lean = span.source === 'heard' ? 'receipt' : leanOfCategory(span.brandCategory);
    if (lean) kinds.add(lean);
  }
  if (evidence.categories.length > 0) kinds.add('bill');
  return kinds.size >= 2;
}
