import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { withTimeout } from '@/lib/deadline';
import { paidFromGoals, type GoalPurchase, type MoveRow } from '@/lib/savings';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Spent goals that filed their receipt in the same step ("I spent it", `spend_goal` in
 * 20261013700001_spend_goal.sql), and what each goal paid toward its receipt (`paidFromGoals`).
 * Savings leaves that much of the receipt out of the month it is dated in: it left savings when
 * the goal closed.
 */

const QUERY_TIMEOUT_MS = 12_000;
const PAGE = 1000;

type ReadFailure = { code?: string; message?: string; details?: string } | null;

type RawPurchase = {
  id: string;
  receipt_id?: string | null;
  start_amount: number | string | null;
};

/** No goals table yet, or no goals.receipt_id yet: no goal was spent this way. */
function lacksPurchases(error: ReadFailure): boolean {
  if (error?.code === 'PGRST205' || error?.code === '42P01') return true;
  return error?.code === '42703' && /goal/.test(`${error.message ?? ''} ${error.details ?? ''}`);
}

/** Every goal that names a receipt, page by page in id order. */
export async function readGoalPurchases(): Promise<GoalPurchase[]> {
  const purchases: GoalPurchase[] = [];
  let total: number | null = null;
  let seen = 0;
  let last: string | null = null;
  for (;;) {
    let query = supabase
      .from('goals')
      .select('id, start_amount, receipt_id', last ? undefined : { count: 'exact' })
      .not('receipt_id', 'is', null);
    if (last) query = query.gt('id', last);
    const { data, error, count } = await withTimeout(
      Promise.resolve(query.order('id', { ascending: true }).limit(PAGE)),
      QUERY_TIMEOUT_MS,
      'Could not load your goals. Check your connection and try again.',
    );
    if (lacksPurchases(error)) return [];
    if (error) throw error;
    if (last === null) total = count ?? null;
    const page = (data ?? []) as unknown as RawPurchase[];
    if (page.length === 0) return purchases;
    for (const row of page) {
      if (typeof row.receipt_id === 'string' && row.receipt_id) {
        purchases.push({
          goal_id: row.id,
          receipt_id: row.receipt_id,
          start_amount: Number(row.start_amount ?? 0),
        });
      }
    }
    seen += page.length;
    last = page[page.length - 1].id;
    // A server that caps rows below PAGE answers a short page before the end, so the count decides.
    if (total !== null ? seen >= total : page.length < PAGE) return purchases;
  }
}

/**
 * For closing a month: what each spent goal paid, from fresh reads of the goals and of every move
 * (`readMoves`, read alongside). Throws as any read does.
 */
export async function readPaidByGoals(
  readMoves: () => Promise<readonly MoveRow[]>,
): Promise<Map<string, number>> {
  const [purchases, moves] = await Promise.all([readGoalPurchases(), readMoves()]);
  return paidFromGoals(purchases, moves);
}

/** Spent goals and the receipts they name; under 'goals', so every savings write refreshes it. */
export function useGoalPurchases() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['goals', userId, 'purchases'],
    enabled: Boolean(userId),
    queryFn: readGoalPurchases,
  });
}

/**
 * What each spent goal paid, by receipt ledger id, from `moves` as read (every goal's, closed ones
 * included; undefined until a read has landed). `byReceipt` is null until the purchases and the
 * moves are both in: a goal's receipt must never be counted as the month's spending for want of
 * them, and a failed first read of the moves is not "no moves".
 */
export function usePaidByGoals(moves: readonly MoveRow[] | undefined) {
  const purchases = useGoalPurchases();
  const byReceipt = useMemo(
    () => (purchases.data && moves ? paidFromGoals(purchases.data, moves) : null),
    [purchases.data, moves],
  );
  return {
    byReceipt,
    isPending: purchases.isPending,
    isError: purchases.isError,
    refetch: () => void purchases.refetch(),
  };
}
