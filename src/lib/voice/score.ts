/**
 * How sure, and what is still needed.
 *
 * ## Score
 * amount heard 40 · kind decided by a keyword 25 · merchant found 20 · a date spoken 15. The best
 * alternative wins on score; a tie goes to the earlier one (the recogniser's own ranking). An
 * ambiguous amount still scores 40: the score ranks alternatives, it does not say the draft is
 * complete. `missing` and `confidence` say that.
 *
 * ## Confidence
 * - low: no amount, or a score under 40;
 * - medium: 40-74;
 * - high: 75 and up and nothing missing, so `high` always means every field is filled. A draft with
 *   an amount to pick or a category to choose cannot be one-tap-saved, however high it scored.
 *
 * ## Missing, per kind (mirrors what each add form refuses to save without)
 * - amount: not heard, or heard two ways;
 * - merchant: receipts (store) and subscriptions (service); a bill is named from its category or
 *   company, as add-bill does;
 * - date: bills (the first due date); a receipt defaults to today and a renewal date is optional;
 * - cycle: bills and subscriptions, when not said. The forms default to monthly, but monthly vs
 *   yearly is a money question, so it is asked;
 * - category: bills.
 */
import type { VoiceDraft, VoiceMissing } from './types';

export const WEIGHTS = { amount: 40, kind: 25, merchant: 20, date: 15 } as const;

type Scored = Pick<
  VoiceDraft,
  | 'kind'
  | 'kindSure'
  | 'amount'
  | 'amountChoices'
  | 'merchant'
  | 'date'
  | 'cycle'
  | 'billCategoryId'
>;

export function scoreOf(draft: Scored): number {
  return (
    (draft.amount !== null ? WEIGHTS.amount : 0) +
    (draft.kindSure ? WEIGHTS.kind : 0) +
    (draft.merchant !== null ? WEIGHTS.merchant : 0) +
    (draft.date !== null ? WEIGHTS.date : 0)
  );
}

export function missingOf(draft: Scored): VoiceMissing[] {
  const missing: VoiceMissing[] = [];
  if (draft.amount === null || draft.amountChoices.length > 1) missing.push('amount');
  if (draft.kind !== 'bill' && draft.merchant === null) missing.push('merchant');
  if (draft.kind === 'bill' && draft.date === null) missing.push('date');
  if (draft.kind !== 'receipt' && draft.cycle === null) missing.push('cycle');
  if (draft.kind === 'bill' && draft.billCategoryId === null) missing.push('category');
  return missing;
}

export function confidenceOf(
  score: number,
  amount: number | null,
  missing: readonly VoiceMissing[],
): VoiceDraft['confidence'] {
  if (amount === null || score < 40) return 'low';
  if (score < 75 || missing.length > 0) return 'medium';
  return 'high';
}
