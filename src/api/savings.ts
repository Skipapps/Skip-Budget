import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { ChargeRow } from '@/api/charges';
import type { PayRow } from '@/api/pay';
import {
  bookFlows,
  ledgerEntries,
  useBookFlows,
  type BillRow,
  type ReceiptRow,
  type SalaryDetailRow,
  type SubscriptionRow,
} from '@/api/queries';
import { countsInSpending, withSpendingFlag } from '@/lib/bill-spending';
import type { Recurrence } from '@/lib/card-ledger';
import { unrecordedDates } from '@/lib/charges';
import type { PayFrequency } from '@/lib/date';
import { withTimeout } from '@/lib/deadline';
import { fromCents, toCents, wholeCents } from '@/lib/money';
import {
  allocateBatch,
  allocateTakeBack,
  localDayOf,
  monthTotals,
  monthUpdate,
  monthsToClose,
  movesToSavingsOn,
  savingsFlows,
  savingsSummary,
  type FlowEntry,
  type MoveRow,
  type PotRow,
  type PotView,
} from '@/lib/savings';
import type { BookIncome, BookSpend } from '@/lib/money-book';
import { supabase } from '@/lib/supabase';
import { useToday } from '@/lib/use-today';
import { useUserId } from '@/providers/session-provider';

/**
 * Savings: a pot for each finished month's left over, and money the person adds; and the moves
 * that take a pot's money to a goal and back. Read here, worked out by src/lib/savings.ts, written
 * only through the database's functions (20261011100001_savings_goals.sql), which re-check every
 * money rule.
 */

const QUERY_TIMEOUT_MS = 12_000;
const LOAD_FAILED = 'Could not load your savings. Check your connection and try again.';

/** PostgREST's row cap per request; anything that can pass it is read in pages. */
const PAGE = 1000;

type ReadFailure = { code?: string; message?: string; details?: string } | null;

/**
 * A database without savings and goals yet: PostgREST has no such table (PGRST205), Postgres no
 * such table (42P01), or savings_pots is still the older table without these columns (42703). Such
 * a database has no savings and no goals, which is what it reads as: never an error page.
 */
export function lacksSavings(error: ReadFailure): boolean {
  if (error?.code === 'PGRST205' || error?.code === '42P01') return true;
  return (
    error?.code === '42703' &&
    /savings_pots|goal/.test(`${error.message ?? ''} ${error.details ?? ''}`)
  );
}

/** Every row a filter matches, page by page in id order, each page with its own deadline. */
async function readAll<T extends { id: string }>(
  table: string,
  columns: string,
  window?: { column: string; from: string; before: string },
): Promise<{ rows: T[]; error: ReadFailure }> {
  const rows = new Map<string, T>();
  let total: number | null = null;
  let last: string | null = null;
  for (;;) {
    let query = supabase.from(table).select(columns, last ? undefined : { count: 'exact' });
    if (window) query = query.gte(window.column, window.from).lt(window.column, window.before);
    if (last) query = query.gt('id', last);
    const { data, error, count } = await withTimeout(
      Promise.resolve(query.order('id', { ascending: true }).limit(PAGE)),
      QUERY_TIMEOUT_MS,
      LOAD_FAILED,
    );
    if (error) return { rows: [], error };
    if (last === null) total = count ?? null;
    const page = (data ?? []) as unknown as T[];
    if (page.length === 0) break;
    for (const row of page) rows.set(row.id, row);
    last = page[page.length - 1].id;
    // A server that caps rows below PAGE answers a short page before the end, so the count decides.
    if (total !== null ? rows.size >= total : page.length < PAGE) break;
  }
  return { rows: [...rows.values()], error: null };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const POT_COLUMNS =
  'id, kind, month, label, earned, spent, amount, added_on, note, wrap_up_seen_at, removed_at, created_at';
const MOVE_COLUMNS = 'id, goal_id, pot_id, amount, batch_id, created_at';

type RawPot = Omit<PotRow, 'amount' | 'earned' | 'spent'> & {
  amount: number | string;
  earned: number | string | null;
  spent: number | string | null;
};

type RawMove = Omit<MoveRow, 'amount'> & { amount: number | string };

const numberOrNull = (value: number | string | null | undefined) =>
  value === null || value === undefined ? null : Number(value);

/** A pot as the maths reads it; a kind this build does not know is left out, not guessed at. */
function readPot(raw: RawPot): PotRow | null {
  if (raw.kind !== 'month' && raw.kind !== 'added') return null;
  return {
    id: raw.id,
    kind: raw.kind,
    month: raw.month ?? null,
    label: raw.label ?? null,
    earned: numberOrNull(raw.earned),
    spent: numberOrNull(raw.spent),
    amount: Number(raw.amount),
    added_on: raw.added_on,
    note: raw.note ?? null,
    wrap_up_seen_at: raw.wrap_up_seen_at ?? null,
    removed_at: raw.removed_at ?? null,
    created_at: raw.created_at,
  };
}

function readMove(raw: RawMove): MoveRow {
  return {
    id: raw.id,
    goal_id: raw.goal_id,
    pot_id: raw.pot_id ?? null,
    amount: Number(raw.amount),
    batch_id: raw.batch_id ?? null,
    created_at: raw.created_at,
  };
}

/** Every pot, removed ones included: moves still name them, and closing must see removed months. */
export async function readSavingsPots(): Promise<PotRow[]> {
  const { rows, error } = await readAll<RawPot>('savings_pots', POT_COLUMNS);
  if (lacksSavings(error)) return [];
  if (error) throw error;
  return rows.map(readPot).filter((pot): pot is PotRow => pot !== null);
}

/** Every move between a pot and a goal, closed goals' included (their money stays out). */
export async function readGoalMoves(): Promise<MoveRow[]> {
  const { rows, error } = await readAll<RawMove>('goal_moves', MOVE_COLUMNS);
  if (lacksSavings(error)) return [];
  if (error) throw error;
  return rows.map(readMove);
}

function useSavingsPots() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['savings', userId, 'pots'],
    enabled: Boolean(userId),
    queryFn: readSavingsPots,
  });
}

export function useGoalMoves() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['goals', userId, 'moves'],
    enabled: Boolean(userId),
    queryFn: readGoalMoves,
  });
}

/** The person's own calendar day the account was made: nothing before it counts toward savings. */
async function readAccountDay(userId: string): Promise<string | null> {
  const { data, error } = await withTimeout(
    Promise.resolve(supabase.from('profiles').select('created_at').eq('id', userId).maybeSingle()),
    QUERY_TIMEOUT_MS,
    LOAD_FAILED,
  );
  if (error) throw error;
  const created = (data as { created_at?: string | null } | null)?.created_at;
  return created ? localDayOf(created) : null;
}

function useAccountDay() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['savings', userId, 'account-day'],
    enabled: Boolean(userId),
    staleTime: Infinity,
    queryFn: () => readAccountDay(userId!),
  });
}

/** The month in progress: "October so far · Earned $3,700 · Spent $2,961.29 · Moves to savings on 1 Nov". */
export type SavingsSoFar = {
  /** yyyy-mm */
  month: string;
  earned: number;
  spent: number;
  /** earned − spent; below 0 is "Over by $X so far". */
  leftOver: number;
  /** yyyy-mm-dd, the 1st of next month. */
  movesOn: string;
};

/** The money book's lists as `savingsFlows` reads them: every pay is income. */
function bookEntries(spending: readonly BookSpend[], income: readonly BookIncome[]): FlowEntry[] {
  return [
    ...spending,
    ...income.map((pay) => ({ kind: 'income', date: pay.date, amount: pay.amount })),
  ];
}

/**
 * Ready to use and every pot's status, from pots and moves alone: what Send, Sent, the wrap-up, the
 * savings edit page and the Cards tile need, without waiting on (or failing with) the money book.
 * A database without savings yet reads as none, never as an error.
 */
export function useSavingsCore() {
  const pots = useSavingsPots();
  const moves = useGoalMoves();
  const summary = useMemo(
    () => savingsSummary({ pots: pots.data ?? [], moves: moves.data ?? [] }),
    [pots.data, moves.data],
  );
  return {
    /** Every pot as stored, removed ones included. */
    pots: pots.data ?? [],
    moves: moves.data ?? [],
    summary,
    isPending: pots.isPending || moves.isPending,
    isError: pots.isError || moves.isError,
    refetch: () => {
      void pots.refetch();
      void moves.refetch();
    },
  };
}

/**
 * The Savings page: `useSavingsCore`, plus the month in progress (`soFar`) from the money book's own
 * spending and pay, the lists every balance is built from. `soFar` is null until every read behind
 * it has landed.
 */
export function useSavings() {
  const { today } = useToday();
  const core = useSavingsCore();
  const accountDay = useAccountDay();
  const flows = useBookFlows(today);

  const month = today.slice(0, 7);
  const soFar = useMemo<SavingsSoFar | null>(() => {
    if (!accountDay.data || flows.isLoading || flows.isError) return null;
    const { pay, spending } = savingsFlows(bookEntries(flows.spending, flows.income));
    const totals = monthTotals({ month, today, accountCreatedOn: accountDay.data, pay, spending });
    return { month, ...totals, movesOn: movesToSavingsOn(month) };
  }, [accountDay.data, flows.spending, flows.income, flows.isLoading, flows.isError, month, today]);

  return {
    ...core,
    soFar,
    isPending: core.isPending || accountDay.isPending || flows.isLoading,
    isError: core.isError || accountDay.isError || flows.isError,
    refetch: () => {
      core.refetch();
      void accountDay.refetch();
      flows.refetch();
    },
  };
}

/**
 * One pot for its page, with its status. `pot` is null once loaded when it is not in savings (a
 * removed pot, or a wrong id).
 */
export function useSavingsPot(id: string | undefined) {
  const { summary, isPending, isError, refetch } = useSavingsCore();
  const pot = useMemo<PotView | null>(
    () => summary.pots.find((view) => view.id === id) ?? null,
    [summary, id],
  );
  return { pot, isPending, isError, refetch };
}

/** yyyy-mm of the month before the one holding `today`. */
function previousMonth(today: string): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
}

/** yyyy-mm-dd of the last day of a yyyy-mm. */
function lastDayOf(month: string): string {
  const year = Number(month.slice(0, 4));
  const number = Number(month.slice(5, 7));
  return `${month}-${String(new Date(Date.UTC(year, number, 0)).getUTCDate()).padStart(2, '0')}`;
}

/**
 * The month (yyyy-mm) whose wrap-up should show now, or null. Only last month's, while it is kept
 * and not yet seen: an older one nobody opened is stale, and `useMarkWrapUpSeen` clears those too.
 */
export function useWrapUpDue(): string | null {
  const { today } = useToday();
  const pots = useSavingsPots();
  const last = previousMonth(today);
  return useMemo(() => {
    const due = (pots.data ?? []).find(
      (pot) =>
        pot.kind === 'month' &&
        pot.month?.slice(0, 7) === last &&
        !pot.removed_at &&
        !pot.wrap_up_seen_at,
    );
    return due ? last : null;
  }, [pots.data, last]);
}

/**
 * The update a closed month's page offers when something dated in it changed after it closed: the
 * month worked out again now by the close step's own reader (`closingFlows`: every page of that
 * month, the same lists, the same rule), so the offer is what closing it today would freeze.
 * Null when nothing changed, for anything but a kept month, until every read has landed, and while
 * the month has a date still to be written down (the close step waits for that too).
 */
export function useMonthUpdate(potId: string | undefined) {
  const userId = useUserId();
  const { today } = useToday();
  const pots = useSavingsPots();
  const moves = useGoalMoves();
  const accountDay = useAccountDay();

  const pot = (pots.data ?? []).find((row) => row.id === potId);
  const month = pot?.kind === 'month' && !pot.removed_at ? (pot.month?.slice(0, 7) ?? null) : null;
  const flows = useQuery({
    queryKey: ['savings', userId, 'month-flows', month, today],
    enabled: Boolean(userId && month),
    // Receipts and charges change outside savings: opening the page always reads again.
    staleTime: 0,
    queryFn: () => closingFlows(`${month}-01`, lastDayOf(month!), today),
  });

  const update = useMemo(() => {
    if (!pot || !month || !moves.data || !accountDay.data || !flows.data) return null;
    const now = monthTotals({ month, today, accountCreatedOn: accountDay.data, ...flows.data });
    return monthUpdate({ pot, moves: moves.data, now });
  }, [pot, month, moves.data, accountDay.data, flows.data, today]);

  return {
    update,
    isPending:
      pots.isPending ||
      moves.isPending ||
      accountDay.isPending ||
      (Boolean(month) && flows.isPending),
    isError: pots.isError || moves.isError || accountDay.isError || flows.isError,
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Any savings or goals write can move Ready to use, any pot's status and any goal's figure.
 * Awaited, so the page a write returns to already shows it.
 */
export function useInvalidateSavings() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      ['savings', 'goals'].map((key) => client.invalidateQueries({ queryKey: [key] })),
    ).then(() => undefined);
}

/**
 * An amount as the database takes it: whole cents, float noise gone. A stray third decimal is
 * refused here rather than rounded, so a cent is never moved quietly.
 */
export function moneyArg(amount: number): number {
  const cents = wholeCents(amount);
  if (cents === null) throw new Error('Amounts are in whole cents.');
  return fromCents(cents);
}

/** A refusal made here, before asking the server, in the server's own shape. */
function refusal(code: string, amount: number, hint: string | null = null) {
  return Object.assign(new Error('Refused.'), {
    code,
    details: fromCents(toCents(amount)).toFixed(2),
    hint,
  });
}

export type SavingsPotValues = {
  /** Null adds savings; an id edits that pot. */
  id?: string | null;
  /** Added savings only (1–60 characters); ignored for a month. */
  label?: string | null;
  amount: number;
  /** yyyy-mm-dd, added savings only, not after today; ignored for a month. */
  addedOn?: string | null;
  /** Up to 200 characters; empty clears it. */
  note?: string | null;
};

/**
 * Adds savings, or changes a pot. Refused (see `savingsRefusal`) below what the pot has in goals
 * ('inGoals'), and at $0 for anything but an overspent month ('zero'); check first with
 * `canChangePot`.
 */
export function useSaveSavingsPot() {
  const invalidate = useInvalidateSavings();
  return useMutation({
    mutationFn: async (values: SavingsPotValues) => {
      const { data, error } = await supabase.rpc('save_savings_pot', {
        p_id: values.id ?? null,
        p_label: values.label?.trim() ?? null,
        p_amount: moneyArg(values.amount),
        p_added_on: values.addedOn ?? null,
        p_note: values.note ?? null,
      });
      if (error) throw error;
      return { id: data as string };
    },
    onSuccess: invalidate,
  });
}

/**
 * Takes the update a month's page offered (`useMonthUpdate`): its new earned and spent. The server
 * sets the amount from them, never below what the month has in goals, and answers it.
 */
export function useUpdateSavingsMonth() {
  const invalidate = useInvalidateSavings();
  return useMutation({
    mutationFn: async ({ id, earned, spent }: { id: string; earned: number; spent: number }) => {
      const { data, error } = await supabase.rpc('update_savings_month', {
        p_id: id,
        p_earned: moneyArg(earned),
        p_spent: moneyArg(spent),
      });
      if (error) throw error;
      const amount = Number(data);
      if (data === null || !Number.isFinite(amount)) {
        throw new Error('The update came back in a shape Skip does not know.');
      }
      return { amount };
    },
    onSuccess: invalidate,
  });
}

/** Takes a pot out of savings for good (kept as removed). Refused while any of it is in goals. */
export function useRemoveSavingsPot() {
  const invalidate = useInvalidateSavings();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('remove_savings_pot', { p_id: id });
      if (error) throw error;
      return { id };
    },
    onSuccess: invalidate,
  });
}

/** The wrap-up for `month` (yyyy-mm) has been shown; earlier unseen ones are done with too. */
export function useMarkWrapUpSeen() {
  const invalidate = useInvalidateSavings();
  return useMutation({
    mutationFn: async (month: string) => {
      const { error } = await supabase.rpc('mark_wrap_up_seen', {
        p_month: `${month.slice(0, 7)}-01`,
      });
      if (error) throw error;
      return { month: month.slice(0, 7) };
    },
    onSuccess: invalidate,
  });
}

export type SendItem = { goalId: string; amount: number };

export type SentGoal = {
  goalId: string;
  amount: number;
  /** The goal's saved figure either side of this send: "Trip $300 -> $700". */
  before: number;
  after: number;
};

export type SendResult = { batchId: string; goals: SentGoal[] };

const isFiniteNumber = (value: unknown) =>
  (typeof value === 'number' || typeof value === 'string') && Number.isFinite(Number(value));

/** The send's answer, checked field by field; goals come back in the order they were asked. */
export function readSendResult(raw: unknown, asked: readonly SendItem[]): SendResult {
  const value = raw as { batch_id?: unknown; goals?: unknown } | null;
  if (!value || typeof value.batch_id !== 'string' || !Array.isArray(value.goals)) {
    throw new Error('The send came back in a shape Skip does not know.');
  }
  const lines = value.goals.map((line: unknown): SentGoal => {
    const item = line as Record<string, unknown> | null;
    if (
      !item ||
      typeof item.goal_id !== 'string' ||
      !isFiniteNumber(item.amount) ||
      !isFiniteNumber(item.saved_before) ||
      !isFiniteNumber(item.saved_after)
    ) {
      throw new Error('The send came back in a shape Skip does not know.');
    }
    return {
      goalId: item.goal_id,
      amount: Number(item.amount),
      before: Number(item.saved_before),
      after: Number(item.saved_after),
    };
  });
  const order = new Map(asked.map((item, index) => [item.goalId, index]));
  lines.sort((a, b) => (order.get(a.goalId) ?? 0) - (order.get(b.goalId) ?? 0));
  return { batchId: value.batch_id, goals: lines };
}

/**
 * Sends savings to goals in one go, all or nothing. Which pots each goal draws on is worked out
 * here from fresh reads (`allocateBatch`: `preferPotId` first, the month page's "Send to my
 * goals", then the newest pot), and the server checks it again. Lines of $0 are left out.
 * Refusals are told apart with `savingsRefusal`; asking for more than Ready to use is 'short'
 * before anything is sent.
 *
 * `batchId` is optional: a uuid the Send page keeps for its visit (expo-crypto's randomUUID) makes
 * the send safe to repeat, because a batch already on the server is answered, not sent again.
 */
export function useSendToGoals() {
  const invalidate = useInvalidateSavings();
  return useMutation({
    mutationFn: async ({
      items,
      preferPotId,
      batchId,
    }: {
      items: readonly SendItem[];
      preferPotId?: string | null;
      batchId?: string | null;
    }): Promise<SendResult> => {
      const asked = items
        .map((item) => ({ goalId: item.goalId, amount: moneyArg(item.amount) }))
        .filter((item) => item.amount > 0);
      if (asked.length === 0) throw new Error('Nothing to send.');

      const [pots, moves] = await Promise.all([readSavingsPots(), readGoalMoves()]);
      // Already landed (a retry after a lost answer): the server answers the batch as it was, and
      // the pots read now no longer have that money to allocate.
      const landed = Boolean(batchId) && moves.some((move) => move.batch_id === batchId);
      const draws = landed
        ? []
        : allocateBatch({
            pots,
            moves,
            items: asked.map((item) => ({ goal_id: item.goalId, amount: item.amount })),
            preferPotId: preferPotId ?? null,
          });
      const drawn = draws.reduce((sum, draw) => sum + toCents(draw.amount), 0);
      const wanted = asked.reduce((sum, item) => sum + toCents(item.amount), 0);
      if (!landed && drawn < wanted) {
        throw refusal('SV001', savingsSummary({ pots, moves }).readyToUse);
      }

      const { data, error } = await supabase.rpc('send_to_goals', {
        p_items: draws,
        p_batch: batchId ?? null,
      });
      if (error) throw error;
      return readSendResult(data, asked);
    },
    onSuccess: invalidate,
  });
}

/**
 * Moves money from a goal back to savings, into the pots it came from (`allocateTakeBack`, from
 * fresh reads). At most `GoalView.fromSavings`: what the goal started with never came from savings
 * and cannot go there; asking for more is 'tooMuchBack' before anything is sent.
 *
 * `batchId` works as it does for `useSendToGoals`: one per page visit makes a repeat move once.
 */
export function useTakeFromGoal() {
  const invalidate = useInvalidateSavings();
  return useMutation({
    mutationFn: async ({
      goalId,
      amount,
      batchId,
    }: {
      goalId: string;
      amount: number;
      batchId?: string | null;
    }) => {
      const wanted = moneyArg(amount);
      if (wanted <= 0) throw new Error('Nothing to take back.');
      const [pots, moves] = await Promise.all([readSavingsPots(), readGoalMoves()]);
      // Already landed: the server answers the batch, and this goal no longer has that money.
      const landed = Boolean(batchId) && moves.some((move) => move.batch_id === batchId);
      const placed = landed
        ? []
        : allocateTakeBack({ goalId, moves, amount: wanted, pots })
            .filter((line): line is { pot_id: string; amount: number } => Boolean(line.pot_id))
            .filter((line) => line.amount > 0);
      const covered = placed.reduce((sum, line) => sum + toCents(line.amount), 0);
      if (!landed && covered < toCents(wanted)) {
        throw refusal('SV004', fromCents(covered));
      }

      const { data, error } = await supabase.rpc('take_from_goal', {
        p_goal: goalId,
        p_items: placed,
        p_batch: batchId ?? null,
      });
      if (error) throw error;
      return { batchId: data as string };
    },
    onSuccess: invalidate,
  });
}

export type SavingsRefusal = {
  /**
   * short       more than a pot has left, or than Ready to use (amount: what is there; id: the pot)
   * goalFull    a goal was sent more than it needs (amount: what it needs; id: the goal)
   * inGoals     a pot cannot drop below what it has in goals (amount: that; id: the pot)
   * tooMuchBack more back than came from savings (amount: what came; id: the pot, when one)
   * notFinished a month that has not ended or is before the account
   * zero        $0 for a pot that is not an overspent month: remove it instead
   * gone        the pot or goal is no longer there (id: which, when known)
   */
  kind: 'short' | 'goalFull' | 'inGoals' | 'tooMuchBack' | 'notFinished' | 'zero' | 'gone';
  amount: number | null;
  id: string | null;
};

const REFUSALS: Record<string, SavingsRefusal['kind']> = {
  SV001: 'short',
  SV002: 'goalFull',
  SV003: 'inGoals',
  SV004: 'tooMuchBack',
  SV005: 'notFinished',
  SV006: 'zero',
  P0002: 'gone',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Which of the savings rules refused a write, with the figure its message needs; null for any other
 * failure (which says FAILURE_MESSAGE).
 */
export function savingsRefusal(thrown: unknown): SavingsRefusal | null {
  const error = thrown as { code?: unknown; details?: unknown; hint?: unknown } | null;
  const kind = typeof error?.code === 'string' ? REFUSALS[error.code] : undefined;
  if (!kind) return null;
  const details = typeof error?.details === 'string' ? error.details : '';
  const figure = kind === 'gone' || details === '' ? null : Number(details);
  const named = kind === 'gone' ? details : error?.hint;
  return {
    kind,
    amount: figure !== null && Number.isFinite(figure) ? figure : null,
    id: typeof named === 'string' && UUID.test(named) ? named : null,
  };
}

// ---------------------------------------------------------------------------
// Closing finished months
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown> & { id: string };
const text = (value: unknown) => (typeof value === 'string' ? value : null);

/**
 * The rows the ledger is built from, as fresh reads give them. Only the fields a figure depends on
 * are read; the rest are neutral, since nothing here is drawn.
 */
function readReceiptRow(raw: Raw): ReceiptRow {
  return {
    id: String(raw.id),
    brand_id: null,
    merchant: text(raw.merchant) ?? '',
    amount: Number(raw.amount),
    purchased_on: String(raw.purchased_on),
    category_id: '',
    card_id: text(raw.card_id),
    bank_account_id: text(raw.bank_account_id),
    note: null,
    source: 'manual',
    image_path: null,
    brands: null,
  };
}

function readChargeRow(raw: Raw): ChargeRow {
  return {
    id: String(raw.id),
    bill_id: text(raw.bill_id),
    subscription_id: text(raw.subscription_id),
    label: text(raw.label) ?? '',
    amount: Number(raw.amount),
    charged_on: String(raw.charged_on),
    card_id: text(raw.card_id),
    bank_account_id: text(raw.bank_account_id),
  };
}

function readBillRow(raw: Raw): BillRow {
  return {
    id: String(raw.id),
    created_at: text(raw.created_at),
    name: text(raw.name) ?? '',
    amount: Number(raw.amount),
    category_id: text(raw.category_id) ?? '',
    icon_id: text(raw.icon_id),
    recurrence: raw.recurrence as Recurrence,
    next_due_on: text(raw.next_due_on),
    starts_on: text(raw.starts_on),
    ends_on: text(raw.ends_on),
    card_id: text(raw.card_id),
    bank_account_id: text(raw.bank_account_id),
    in_spending: raw.in_spending !== false,
  };
}

function readSubscriptionRow(raw: Raw): SubscriptionRow {
  return {
    id: String(raw.id),
    started_on: text(raw.started_on),
    created_at: text(raw.created_at),
    brand_id: null,
    name: text(raw.name) ?? '',
    amount: Number(raw.amount),
    cycle: raw.cycle as SubscriptionRow['cycle'],
    next_renewal_on: text(raw.next_renewal_on),
    category_id: '',
    card_id: text(raw.card_id),
    bank_account_id: text(raw.bank_account_id),
    note: null,
    active: raw.active === true,
    brands: null,
  };
}

type LedgerSalary = Pick<
  SalaryDetailRow,
  'id' | 'name' | 'amount' | 'frequency' | 'last_payday' | 'account_ids'
>;

function readSalaryRow(raw: Raw): LedgerSalary {
  const links = (raw.salary_source_accounts ?? []) as { bank_account_id: string }[];
  return {
    id: String(raw.id),
    name: text(raw.name) ?? '',
    amount: Number(raw.amount),
    frequency: raw.frequency as PayFrequency,
    last_payday: text(raw.last_payday),
    account_ids: links.map((link) => link.bank_account_id),
  };
}

function readPayRow(raw: Raw): PayRow {
  return {
    id: String(raw.id),
    salary_source_id: text(raw.salary_source_id),
    label: text(raw.label) ?? '',
    amount: Number(raw.amount),
    paid_on: String(raw.paid_on),
    bank_account_id: text(raw.bank_account_id),
  };
}

/**
 * Whether a bill or subscription already on the record has a date between `from` and `to` (by
 * today) that is not written down yet: the sweep did not manage it this time. The ledger shows such
 * a date as missing, so a month's figures are not to be trusted until the next sweep writes it.
 * A plan never written down at all is worked out whole by the ledger, so it never counts here.
 */
export function unwrittenDatesIn(args: {
  bills: readonly BillRow[];
  subscriptions: readonly SubscriptionRow[];
  charges: readonly ChargeRow[];
  from: string;
  to: string;
  today: string;
}): boolean {
  const recorded = new Map<string, Set<string>>();
  for (const charge of args.charges) {
    const plan = charge.bill_id ?? charge.subscription_id;
    if (plan) recorded.set(plan, (recorded.get(plan) ?? new Set()).add(charge.charged_on));
  }
  const running = [
    // A bill that does not count records nothing new, so its dates after it stopped counting stay
    // unwritten for good: kept in, it would hold every month open from then on.
    ...args.bills.filter(countsInSpending).map((bill) => ({
      id: bill.id,
      recurrence: bill.recurrence,
      nextDate: bill.next_due_on,
      startsOn: bill.starts_on ?? null,
      createdAt: bill.created_at ?? null,
      endsOn: bill.ends_on ?? null,
    })),
    ...args.subscriptions
      .filter((subscription) => subscription.active)
      .map((subscription) => ({
        id: subscription.id,
        recurrence: subscription.cycle as Recurrence,
        nextDate: subscription.next_renewal_on,
        startsOn: subscription.started_on ?? null,
        createdAt: subscription.created_at ?? null,
        endsOn: null,
      })),
  ];
  return running.some((plan) => {
    const dates = recorded.get(plan.id);
    return Boolean(
      dates &&
      unrecordedDates(plan, args.today, dates).some((day) => day >= args.from && day <= args.to),
    );
  });
}

/**
 * Pay and spending for the months being closed, through the same `ledgerEntries` and `bookFlows`
 * the balances and "so far" use, on fresh reads. Null when a bill or subscription already on the
 * record has a date in those months still to write down: the sweep did not manage it this time,
 * and a month frozen without it would be wrong for good, so the close waits for the next sweep.
 */
async function closingFlows(from: string, to: string, today: string) {
  const reads = await Promise.all([
    readAll<Raw>('receipts', 'id, merchant, amount, purchased_on, card_id, bank_account_id', {
      column: 'purchased_on',
      from,
      before: movesToSavingsOn(to),
    }),
    readAll<Raw>(
      'charges',
      'id, bill_id, subscription_id, label, amount, charged_on, card_id, bank_account_id',
    ),
    withSpendingFlag((flag) =>
      readAll<Raw>(
        'bills',
        `id, name, amount, category_id, icon_id, recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id, created_at${flag}`,
      ),
    ),
    readAll<Raw>(
      'subscriptions',
      'id, name, amount, cycle, next_renewal_on, started_on, created_at, card_id, bank_account_id, active',
    ),
    readAll<Raw>(
      'salary_sources',
      'id, name, amount, frequency, last_payday, salary_source_accounts(bank_account_id)',
    ),
    readAll<Raw>('pay_received', 'id, salary_source_id, label, amount, paid_on, bank_account_id'),
  ]);
  const failed = reads.find((read) => read.error);
  if (failed) throw failed.error;
  const [receipts, charges, bills, subscriptions, salaries, pay] = reads.map((read) => read.rows);

  const chargeRows = charges.map(readChargeRow);
  const billRows = bills.map(readBillRow);
  const subscriptionRows = subscriptions.map(readSubscriptionRow);

  if (
    unwrittenDatesIn({
      bills: billRows,
      subscriptions: subscriptionRows,
      charges: chargeRows,
      from,
      to,
      today,
    })
  ) {
    return null;
  }

  const entries = ledgerEntries({
    receipts: receipts.map(readReceiptRow),
    subscriptions: subscriptionRows,
    bills: billRows,
    salaries: salaries.map(readSalaryRow),
    charges: chargeRows,
    pay: pay.map(readPayRow),
    // Where pay lands moves no figure here.
    accountOrder: [],
    from,
    to,
    today,
  });
  const { spending, income } = bookFlows({
    entries,
    subscriptions: subscriptionRows,
    bills: billRows,
    charges: chargeRows,
  });
  return savingsFlows(bookEntries(spending, income));
}

/** Function or table not on this database yet: there is nothing to close into. */
const lacksClosing = (error: ReadFailure) =>
  error?.code === 'PGRST202' || error?.code === '42883' || lacksSavings(error);

/** userId → the month (yyyy-mm) in which there was last nothing left to close. */
const settledIn = new Map<string, string>();

/**
 * Moves every finished month not yet in savings into it (at most the last 12, none before the
 * account), and returns how many it closed. Runs after the sweep has written down pay and charges.
 * Every past month arrives already seen; only last month is left for its wrap-up.
 *
 * Never throws: it runs in the background, and a month it could not close is closed on the next
 * sweep. Any read that fails stops it before anything is written, so a month is never frozen on
 * half its figures.
 */
export async function closeFinishedMonths(userId: string, today: string): Promise<number> {
  const current = today.slice(0, 7);
  if (settledIn.get(userId) === current) return 0;

  try {
    const closed = await withTimeout(
      Promise.resolve(supabase.from('savings_pots').select('month').eq('kind', 'month')),
      QUERY_TIMEOUT_MS,
      LOAD_FAILED,
    );
    if (lacksSavings(closed.error)) {
      settledIn.set(userId, current);
      return 0;
    }
    if (closed.error) return 0;

    const accountCreatedOn = await readAccountDay(userId);
    if (!accountCreatedOn) return 0;

    const months = monthsToClose({
      today,
      accountCreatedOn,
      closedMonths: ((closed.data ?? []) as { month: string | null }[])
        .map((row) => row.month)
        .filter((month): month is string => Boolean(month)),
    });
    if (months.length === 0) {
      settledIn.set(userId, current);
      return 0;
    }

    const flows = await closingFlows(
      `${months[0]}-01`,
      lastDayOf(months[months.length - 1]),
      today,
    );
    if (!flows) return 0;

    const latest = previousMonth(today);
    let count = 0;
    let failed = false;
    for (const month of months) {
      const totals = monthTotals({ month, today, accountCreatedOn, ...flows });
      const { error } = await supabase.rpc('close_my_savings_month', {
        p_month: `${month}-01`,
        p_earned: totals.earned,
        p_spent: totals.spent,
        p_seen: month !== latest,
      });
      if (lacksClosing(error)) {
        settledIn.set(userId, current);
        return count;
      }
      if (error) failed = true;
      else count += 1;
    }
    if (!failed) settledIn.set(userId, current);
    return count;
  } catch {
    return 0;
  }
}
