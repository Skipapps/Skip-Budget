import { planKey } from '@/lib/card-ledger';
import { toIsoDate } from '@/lib/date';
import { FREE_HISTORY_DAYS, FREE_LIMITS, PRO_HISTORY_YEARS } from '@/lib/wall';

/**
 * The free plan's allowances, worked out from rows already on the phone. Pure: the plan and the day
 * are arguments. The database applies the same rules on save; these exist so the app can say so
 * before somebody spends the effort.
 */

/** The two ways of reading a receipt that free counts, each with its own monthly allowance. */
export type CaptureKind = 'scan' | 'upload';

export type CaptureAllowance = {
  /** Null on Pro: there is nothing to count down from. */
  limit: number | null;
  /** This calendar month's receipts read this way. */
  used: number;
  /** Null on Pro; never below zero. */
  left: number | null;
  /** Whether another receipt may be read this way now. */
  allowed: boolean;
};

const MONTHLY: Record<CaptureKind, number> = {
  scan: FREE_LIMITS.scansPerMonth,
  upload: FREE_LIMITS.uploadsPerMonth,
};

type CountedReceipt = { source: string; created_at?: string | null };

/**
 * Receipts read this way in today's calendar month, by when they were saved, not the day printed on
 * them: last month's receipt scanned today counts today. A row not back from the server yet has no
 * saved time and counts as now.
 */
export function capturesThisMonth(
  receipts: readonly CountedReceipt[],
  kind: CaptureKind,
  today: Date,
): number {
  const year = today.getFullYear();
  const month = today.getMonth();
  let count = 0;
  for (const receipt of receipts) {
    if (receipt.source !== kind) continue;
    if (!receipt.created_at) {
      count += 1;
      continue;
    }
    const saved = new Date(receipt.created_at);
    if (saved.getFullYear() === year && saved.getMonth() === month) count += 1;
  }
  return count;
}

export function captureAllowance(
  receipts: readonly CountedReceipt[],
  kind: CaptureKind,
  pro: boolean,
  today: Date,
): CaptureAllowance {
  const used = capturesThisMonth(receipts, kind, today);
  if (pro) return { limit: null, used, left: null, allowed: true };
  const limit = MONTHLY[kind];
  const left = Math.max(0, limit - used);
  return { limit, used, left, allowed: left > 0 };
}

/**
 * The earliest day each plan sees, as yyyy-mm-dd: seven years back on Pro, and on free the 90 days
 * ending today (today is the 90th). Only for what is listed; balances always walk the whole history.
 */
export function historyFloor(pro: boolean, today: Date): string {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  return toIsoDate(
    pro
      ? new Date(year - PRO_HISTORY_YEARS, month, day)
      : new Date(year, month, day - (FREE_HISTORY_DAYS - 1)),
  );
}

/** Whether a day is inside what the plan shows. */
export function isWithinHistory(date: string, floor: string): boolean {
  return date >= floor;
}

/** What a plan's window left out of a ledger. */
export type HiddenHistory = {
  receipts: boolean;
  /** planKey of every bill or subscription with a charge from before the window. */
  plans: ReadonlySet<string>;
  /** Paydays from before the window. */
  income?: boolean;
};

export const NOTHING_HIDDEN: HiddenHistory = { receipts: false, plans: new Set() };

/**
 * Whether the window hid anything at all, anything of one kind, or anything of one plan. Missing
 * (a ledger that never cuts) is nothing hidden.
 */
export function hidOlder(
  hidden: HiddenHistory | undefined,
  kind?: 'receipt' | 'bill' | 'subscription',
  planId?: string,
): boolean {
  if (!hidden) return false;
  if (kind === 'receipt') return hidden.receipts;
  if (kind && planId) return hidden.plans.has(planKey(kind, planId));
  if (kind) return [...hidden.plans].some((key) => key.startsWith(`${kind}-`));
  return hidden.receipts || hidden.plans.size > 0 || Boolean(hidden.income);
}
