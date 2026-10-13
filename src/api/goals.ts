import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { lacksSavings, moneyArg, useGoalMoves, useInvalidateSavings } from '@/api/savings';
import { withTimeout } from '@/lib/deadline';
import { goalProgress, goalsSummary, type GoalRow, type GoalView } from '@/lib/goals';
import { anyRefreshFailed, failedEmpty } from '@/lib/query-state';
import { supabase } from '@/lib/supabase';
import { useToday } from '@/lib/use-today';
import { useUserId } from '@/providers/session-provider';

/**
 * Goals. Every write is a database function that re-checks the money rules
 * (20261011100001_savings_goals.sql); the tables cannot be written directly. Sending money to a
 * goal and taking it back are savings writes: `useSendToGoals` and `useTakeFromGoal` in
 * src/api/savings.ts.
 */

const QUERY_TIMEOUT_MS = 12_000;

const GOAL_COLUMNS = 'id, name, icon_id, target, target_date, start_amount, created_at, closed_at';

type RawGoal = Omit<GoalRow, 'target' | 'start_amount'> & {
  target: number | string;
  start_amount: number | string | null;
};

function readGoal(raw: RawGoal): GoalRow {
  return {
    id: raw.id,
    name: raw.name,
    icon_id: raw.icon_id,
    target: Number(raw.target),
    target_date: raw.target_date ?? null,
    start_amount: Number(raw.start_amount ?? 0),
    created_at: raw.created_at,
    closed_at: raw.closed_at ?? null,
  };
}

/**
 * The person's open goals, oldest first. A closed goal ("I spent it") is left out of every list;
 * its moves are not, so its money stays out of savings.
 */
function useOpenGoals() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['goals', userId, 'list'],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async (): Promise<GoalRow[]> => {
          const { data, error } = await supabase
            .from('goals')
            .select(GOAL_COLUMNS)
            .is('closed_at', null)
            .order('created_at', { ascending: true });
          if (lacksSavings(error)) return [];
          if (error) throw error;
          return ((data ?? []) as unknown as RawGoal[]).map(readGoal);
        })(),
        QUERY_TIMEOUT_MS,
        'Could not load your goals. Check your connection and try again.',
      ),
  });
}

/**
 * Goals with their progress worked out (`goalsSummary`): the headline over active goals, active in
 * the order made, completed with the most recently reached first. `goals` is the open goals as
 * stored.
 */
export function useGoals() {
  const { today } = useToday();
  const goals = useOpenGoals();
  const moves = useGoalMoves();

  const summary = useMemo(
    () => goalsSummary(goals.data ?? [], moves.data ?? [], today),
    [goals.data, moves.data, today],
  );

  return {
    goals: goals.data ?? [],
    moves: moves.data ?? [],
    summary,
    isPending: goals.isPending || moves.isPending,
    isError: goals.isError || moves.isError,
    /** The figures show, from a reload that failed behind them (RefreshNote). */
    refreshFailed: !failedEmpty(goals) && !failedEmpty(moves) && anyRefreshFailed([goals, moves]),
    refetch: () => {
      void goals.refetch();
      void moves.refetch();
    },
  };
}

/**
 * One goal with its progress, and its own moves newest first. `goal` is null once loaded when there
 * is no such open goal (deleted or closed, here or on another phone).
 */
export function useGoal(id: string | undefined) {
  const { today } = useToday();
  const goals = useOpenGoals();
  const moves = useGoalMoves();

  const goal = useMemo<GoalView | null>(() => {
    const row = (goals.data ?? []).find((candidate) => candidate.id === id);
    return row ? goalProgress(row, moves.data ?? [], today) : null;
  }, [goals.data, moves.data, id, today]);

  const own = useMemo(
    () =>
      (moves.data ?? [])
        .filter((move) => move.goal_id === id)
        .sort((a, b) =>
          a.created_at === b.created_at
            ? b.id.localeCompare(a.id)
            : b.created_at.localeCompare(a.created_at),
        ),
    [moves.data, id],
  );

  return {
    goal,
    moves: own,
    isPending: goals.isPending || moves.isPending,
    isError: goals.isError || moves.isError,
    /** The figures show, from a reload that failed behind them (RefreshNote). */
    refreshFailed: !failedEmpty(goals) && !failedEmpty(moves) && anyRefreshFailed([goals, moves]),
    refetch: () => {
      void goals.refetch();
      void moves.refetch();
    },
  };
}

export type GoalValues = {
  name: string;
  /** A goal type id from src/data/goal-types.ts. */
  icon_id: string;
  target: number;
  /** yyyy-mm-dd, the last day of the month picked; null for no date. */
  target_date: string | null;
  /** What was already saved toward it before Skip; 0 for none. */
  start_amount: number;
};

/** Creates a goal (no id) or saves an open one. Resolves to its id. */
export function useSaveGoal() {
  const invalidate = useInvalidateSavings();
  return useMutation({
    mutationFn: async ({
      id,
      newId,
      values,
    }: {
      id?: string | null;
      /** The visit's own id for a new goal: saving again after a lost answer creates it once. */
      newId?: string | null;
      values: GoalValues;
    }) => {
      const { data, error } = await supabase.rpc('save_goal', {
        p_id: id ?? null,
        p_name: values.name.trim(),
        p_icon_id: values.icon_id,
        p_target: moneyArg(values.target),
        p_target_date: values.target_date,
        p_start_amount: moneyArg(values.start_amount),
        ...(newId && !id ? { p_new_id: newId } : {}),
      });
      if (error) throw error;
      return { id: data as string };
    },
    onSuccess: invalidate,
  });
}

/**
 * Ends an open goal. `returnMoney` true deletes it and what came from savings
 * (`GoalView.fromSavings`) goes back to its pots; false is "I spent it": the goal closes and that
 * money stays spent. A goal already closed or deleted (another phone) is refused as 'gone'
 * (`savingsRefusal`): either way it is no longer there.
 */
export function useDeleteGoal() {
  const invalidate = useInvalidateSavings();
  return useMutation({
    mutationFn: async ({ id, returnMoney }: { id: string; returnMoney: boolean }) => {
      const { error } = await supabase.rpc('delete_goal', { p_id: id, p_return: returnMoney });
      if (error) throw error;
      return { id, returnMoney };
    },
    onSuccess: invalidate,
  });
}

export type GoalReceiptValues = {
  /** The receipt's id, made once per visit: a retry after a lost answer files nothing twice. */
  receiptId: string;
  merchant: string;
  /** yyyy-mm-dd */
  purchasedOn: string;
  cardId: string | null;
  bankAccountId: string | null;
  /** The receipt book; null is General. */
  bookId: string | null;
};

/**
 * "I spent it", with what was bought filed as a receipt in the same step (`spend_goal`,
 * 20261013700001_spend_goal.sql): the goal closes as `useDeleteGoal` closes it, and the receipt is
 * for everything the goal held, worked out by the server. The goal names the receipt, so the month
 * it is dated in does not count it again (`paidFromGoals`). Refused as 'gone' like a delete.
 */
export function useSpendGoal() {
  const client = useQueryClient();
  const invalidate = useInvalidateSavings();
  return useMutation({
    mutationFn: async ({ id, receipt }: { id: string; receipt: GoalReceiptValues }) => {
      const { data, error } = await supabase.rpc('spend_goal', {
        p_id: id,
        p_receipt: receipt.receiptId,
        p_merchant: receipt.merchant.trim(),
        p_purchased_on: receipt.purchasedOn,
        p_card_id: receipt.cardId,
        p_bank_account_id: receipt.bankAccountId,
        p_book_id: receipt.bookId,
      });
      if (error) throw error;
      return { id, receiptId: data as string };
    },
    onSuccess: () => {
      // A new receipt moves every balance and spending figure, as one added from Receipts does.
      void client.invalidateQueries({ queryKey: ['receipts'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
      return invalidate();
    },
  });
}

/**
 * "I spent it" for a purchase already added from Receipts: the goal closes as `useDeleteGoal`
 * closes it and names that receipt (`link_goal_receipt`, 20261013700002_link_goal_receipt.sql),
 * which stays as it is. Its month leaves out what the goal paid (`paidFromGoals`). Refused as
 * 'gone' like a delete.
 */
export function useLinkGoalReceipt() {
  const invalidate = useInvalidateSavings();
  return useMutation({
    mutationFn: async ({ id, receiptId }: { id: string; receiptId: string }) => {
      const { error } = await supabase.rpc('link_goal_receipt', {
        p_id: id,
        p_receipt: receiptId,
      });
      if (error) throw error;
      return { id, receiptId };
    },
    onSuccess: invalidate,
  });
}
