import { toCents } from '@/lib/money';

/** What the picker reads of a receipt. */
export type ChoosableReceipt = {
  id: string;
  amount: number;
  /** yyyy-mm-dd */
  purchased_on: string;
  created_at?: string | null;
  habit_id?: string | null;
};

/** Receipts within a quarter of the goal's money either way are offered first. */
const NEAR_PARTS = 4;
const NEAR_MAX = 20;
const RECENT_MAX = 50;

const newestFirst = (a: ChoosableReceipt, b: ChoosableReceipt) =>
  b.purchased_on.localeCompare(a.purchased_on) ||
  (b.created_at ?? '').localeCompare(a.created_at ?? '') ||
  a.id.localeCompare(b.id);

/**
 * The receipts "I already added it" offers, newest first: those near what the goal held, then the
 * most recent of the rest. Left out: a receipt another goal already names, a habit's day, and
 * anything before the plan's history floor (what Receipts lists).
 *
 *   near = |amount − held| × 4 ≤ held, in cents
 */
export function receiptChoices<R extends ChoosableReceipt>(args: {
  receipts: readonly R[];
  /** Receipt ids spent goals already name. */
  linked: ReadonlySet<string>;
  /** What the goal holds. */
  held: number;
  /** yyyy-mm-dd: the earliest day the plan lists. */
  floor: string;
}): { near: R[]; recent: R[] } {
  const heldCents = Math.max(0, toCents(args.held));
  const open = args.receipts
    .filter(
      (receipt) =>
        !args.linked.has(receipt.id) && !receipt.habit_id && receipt.purchased_on >= args.floor,
    )
    .sort(newestFirst);
  const isNear = (receipt: R) =>
    heldCents > 0 &&
    Math.abs(Math.abs(toCents(Number(receipt.amount))) - heldCents) * NEAR_PARTS <= heldCents;
  const near = open.filter(isNear).slice(0, NEAR_MAX);
  const shown = new Set(near.map((receipt) => receipt.id));
  const recent = open.filter((receipt) => !shown.has(receipt.id)).slice(0, RECENT_MAX);
  return { near, recent };
}
