import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { insertOnce, NOTHING_UPDATED, type ClientId, type ReceiptValues } from '@/api/mutations';
import { habitColor, type HabitColor } from '@/data/habit-colors';
import { withTimeout } from '@/lib/deadline';
import type { HabitMaths, HabitTap } from '@/lib/habit-week';
import { fromCents, toCents, wholeCents } from '@/lib/money';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Spending habits: the cards, and the days tapped on them. A tapped day is a receipt carrying the
 * habit's id, so taps are read from receipts and cached under 'receipts': a receipt saved, re-dated
 * or deleted anywhere in the app refreshes the circles with no habit code involved.
 *
 * A failed read is an error, never an empty list, a missing table (PostgREST's PGRST205)
 * included: "no habits" would invite a Pro account to start one the database cannot keep.
 */

export type HabitRow = {
  id: string;
  name: string;
  icon_id: string;
  color: HabitColor;
  /**
   * What one tapped day costs. A change reaches the days already tapped only when the person
   * chooses Past and upcoming (`useUpdateHabitAndDays`).
   */
  price: number;
  /** Where a tap's receipt is filed in spending. */
  category_id: string;
  card_id: string | null;
  bank_account_id: string | null;
  preset_id: string | null;
  /** yyyy-mm-dd, the Monday of the week it was made: the first day that can be tapped. */
  started_on: string;
  /** yyyy-mm-dd, the local day it was made: the first day an untapped day counts as saved. */
  saved_from: string;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
};

const HABIT_COLUMNS =
  'id, name, icon_id, color, price, category_id, card_id, bank_account_id, preset_id, started_on, saved_from, sort_order, archived_at, created_at';

const QUERY_TIMEOUT_MS = 12_000;

/** PostgREST's row cap per request; the taps are read in pages so none is ever cut off. */
const TAP_PAGE = 1000;

type RawHabit = Omit<HabitRow, 'price' | 'color' | 'sort_order'> & {
  price: number | string;
  color: string;
  sort_order: number | null;
};

/** A row as the app uses it: the price as a number, a colour the app can draw. */
export function readHabit(raw: RawHabit): HabitRow {
  return {
    id: raw.id,
    name: raw.name,
    icon_id: raw.icon_id,
    color: habitColor(raw.color).id,
    price: Number(raw.price),
    category_id: raw.category_id,
    card_id: raw.card_id ?? null,
    bank_account_id: raw.bank_account_id ?? null,
    preset_id: raw.preset_id ?? null,
    started_on: raw.started_on,
    saved_from: raw.saved_from,
    sort_order: Number(raw.sort_order ?? 0),
    archived_at: raw.archived_at ?? null,
    created_at: raw.created_at,
  };
}

/** The fields the week maths reads. */
export function habitMaths(
  habit: Pick<HabitRow, 'id' | 'price' | 'started_on' | 'saved_from'>,
): HabitMaths {
  return {
    id: habit.id,
    price: habit.price,
    startedOn: habit.started_on,
    savedFrom: habit.saved_from,
  };
}

/** The habits on the dashboard: not archived, in the person's order, oldest first within it. */
export function useHabits() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['habits', userId],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async () => {
          const { data, error } = await supabase
            .from('habits')
            .select(HABIT_COLUMNS)
            .is('archived_at', null)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });
          if (error) throw error;
          return ((data ?? []) as unknown as RawHabit[]).map(readHabit);
        })(),
        QUERY_TIMEOUT_MS,
        'Could not load your habits. Check your connection and try again.',
      ),
  });
}

/**
 * One habit for its detail and edit pages, archived or not, so a receipt's link to its habit still
 * opens after the card is deleted. Under the 'habits' key, so every habit write refreshes it.
 */
export function useHabit(id: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['habits', userId, id],
    enabled: Boolean(userId && id),
    queryFn: () =>
      withTimeout(
        (async (): Promise<HabitRow | null> => {
          const { data, error } = await supabase
            .from('habits')
            .select(HABIT_COLUMNS)
            .eq('id', id!)
            .maybeSingle();
          if (error) throw error;
          return data ? readHabit(data as unknown as RawHabit) : null;
        })(),
        QUERY_TIMEOUT_MS,
        'Could not load that habit. Check your connection and try again.',
      ),
  });
}

type RawTap = { id: string; habit_id: string; purchased_on: string; amount: number | string };

/**
 * One page of habit receipts after `after`, in (purchased_on, id) order. Paged by that key, not by
 * offset, so a receipt saved or deleted between pages cannot shift a row into the next page twice
 * or out of it. Each page has its own deadline: a long history is several round trips, and one
 * slow network should not need to fit all of them into a single read's time.
 */
function readTapPage(after: RawTap | null) {
  let query = supabase
    .from('receipts')
    .select('id, habit_id, purchased_on, amount', after ? undefined : { count: 'exact' })
    .not('habit_id', 'is', null);
  if (after) {
    query = query.or(
      `purchased_on.gt.${after.purchased_on},and(purchased_on.eq.${after.purchased_on},id.gt.${after.id})`,
    );
  }
  return withTimeout(
    Promise.resolve(
      query
        .order('purchased_on', { ascending: true })
        .order('id', { ascending: true })
        .limit(TAP_PAGE),
    ),
    QUERY_TIMEOUT_MS,
    'Could not load your habit days. Check your connection and try again.',
  );
}

/**
 * Every receipt filed from a habit, archived habits' included, as the week maths reads them. Read
 * in pages: a tap the server's row cap left out would count its day as skipped and add its price
 * to Saved.
 */
export function useHabitTaps() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['receipts', userId, 'habit-taps'],
    enabled: Boolean(userId),
    queryFn: async (): Promise<HabitTap[]> => {
      // By receipt id: a receipt re-dated between pages is met at its old day and again at its new
      // one, and only the later read is true.
      const taps = new Map<string, HabitTap>();
      let total: number | null = null;
      let last: RawTap | null = null;
      for (;;) {
        const { data, error, count } = await readTapPage(last);
        if (error) throw error;
        if (last === null) total = count ?? null;
        const rows = (data ?? []) as unknown as RawTap[];
        if (rows.length === 0) break;
        for (const row of rows) {
          taps.set(row.id, {
            habitId: row.habit_id,
            day: row.purchased_on,
            amount: Number(row.amount),
            receiptId: row.id,
          });
        }
        last = rows[rows.length - 1];
        // A server that caps rows below TAP_PAGE answers a short page before the end, so the
        // count decides when there is one.
        if (total !== null ? taps.size >= total : rows.length < TAP_PAGE) break;
      }
      return [...taps.values()];
    },
  });
}

/**
 * Receipt lists draw a day's icon and colour through its habit, and taps, untaps and removals write
 * receipts, which feed every total: every habit write refreshes them with the habits.
 */
function useInvalidateHabits() {
  const client = useQueryClient();
  return () => {
    for (const key of ['habits', 'receipts', 'receipt', 'dashboard']) {
      client.invalidateQueries({ queryKey: [key] });
    }
  };
}

export type HabitValues = {
  name: string;
  icon_id: string;
  color: HabitColor;
  price: number;
  category_id: string;
  /** At most one of card_id and bank_account_id; neither is Skip (no account). */
  card_id: string | null;
  bank_account_id: string | null;
  preset_id: string | null;
  /** yyyy-mm-dd: the Monday of this week for a new habit (`weekStartOf(today)`). */
  started_on: string;
  /** yyyy-mm-dd: today, local, for a new habit. Never before `started_on`. */
  saved_from: string;
  sort_order?: number;
};

/** What the edit page saves: every field it shows, and the category only with a new icon. */
export type HabitEditValues = Pick<
  HabitValues,
  'name' | 'icon_id' | 'color' | 'price' | 'card_id' | 'bank_account_id'
> & { category_id?: string };

/** The database keeps names trimmed, so a stray space typed at the end is not a refusal. */
function trimmed<T extends Partial<HabitValues>>(values: T): T {
  return typeof values.name === 'string' ? { ...values, name: values.name.trim() } : values;
}

/**
 * Starts a habit. Pro only: a free account is refused by the database with "part of Skip Pro"
 * (`refusedForPro`). Resolves to the saved row. Given the form's client id, saving again after a
 * lost answer files no second habit (`insertOnce`).
 */
export function useCreateHabit() {
  const userId = useUserId();
  const invalidate = useInvalidateHabits();

  return useMutation({
    mutationFn: async ({ id, ...values }: HabitValues & ClientId): Promise<HabitRow> => {
      if (!userId) throw new Error('Sign in first.');
      const row = await insertOnce('habits', trimmed(values), userId, HABIT_COLUMNS, id);
      return readHabit(row as unknown as RawHabit);
    },
    onSuccess: invalidate,
  });
}

/**
 * Any plan may edit a habit it has. Upcoming only: writes the habit alone, so the days already
 * tapped keep the name, price, Paid with and category they were filed with. The icon and colour are
 * read through the habit, so every day follows them either way.
 */
export function useUpdateHabit() {
  const invalidate = useInvalidateHabits();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<HabitValues> }) => {
      const { data, error } = await supabase
        .from('habits')
        .update(trimmed(values) as never)
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(NOTHING_UPDATED);
      return { id };
    },
    onSuccess: invalidate,
  });
}

/**
 * Deletes a habit card, keeping its past days ("Keep past days"). Soft: its receipts are money
 * really spent and keep its icon and name. A habit already archived keeps the time it was first
 * archived, and counts as done.
 */
export function useArchiveHabit() {
  const invalidate = useInvalidateHabits();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('habits')
        .update({ archived_at: new Date().toISOString() } as never)
        .eq('id', id)
        .is('archived_at', null)
        .select('id');
      if (error) throw error;
      return { id };
    },
    onSuccess: invalidate,
  });
}

/** The receipt a tapped day files. */
export type HabitReceiptValues = ReceiptValues & { habit_id: string };

export type TappableHabit = Pick<
  HabitRow,
  'id' | 'name' | 'price' | 'category_id' | 'card_id' | 'bank_account_id'
>;

/** The habit fields its days copy. */
export type HabitCarriedFrom = Pick<
  HabitRow,
  'name' | 'price' | 'category_id' | 'card_id' | 'bank_account_id'
>;

/**
 * What a tapped day's receipt copies from its habit, under the receipt's column names: the only
 * values an edit can carry back to the days already filed.
 */
export type HabitCarriedValues = {
  merchant: string;
  amount: number;
  category_id: string;
  card_id: string | null;
  bank_account_id: string | null;
};

/** The values a tap files from `habit`, and so the ones Past and upcoming writes. */
export function habitCarriedValues(habit: HabitCarriedFrom): HabitCarriedValues {
  return {
    // Trimmed as the habit is saved, so a stray space typed at the end is no change.
    merchant: habit.name.trim(),
    amount: habit.price,
    category_id: habit.category_id || 'other',
    card_id: habit.card_id,
    // The database allows one; a card wins as it does everywhere a row names both.
    bank_account_id: habit.card_id ? null : habit.bank_account_id,
  };
}

/**
 * Whether saving `after` over `before` would change what the habit's days carry, so whether
 * there is anything to ask about. Prices are compared in cents (4.5 is 4.50). The icon and colour
 * are read through the habit, so they never ask on their own; a new icon asks only when it files
 * under another spend category, since the days carry `category_id`.
 */
export function habitCarriedChanged(before: HabitCarriedFrom, after: HabitCarriedFrom): boolean {
  const was = habitCarriedValues(before);
  const now = habitCarriedValues(after);
  return (
    was.merchant !== now.merchant ||
    toCents(was.amount) !== toCents(now.amount) ||
    was.category_id !== now.category_id ||
    was.card_id !== now.card_id ||
    was.bank_account_id !== now.bank_account_id
  );
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * One receipt for `day` at the habit's price, paid with the habit's card or account, under the
 * habit's name and category. Throws on a day or price that is not one, rather than file a receipt
 * nobody chose.
 */
export function habitTapValues(habit: TappableHabit, day: string): HabitReceiptValues {
  if (!ISO_DAY.test(day)) throw new Error(`Not a day: ${day}`);
  if (!Number.isFinite(habit.price) || habit.price <= 0) throw new Error('A habit needs a price.');
  return {
    brand_id: null,
    ...habitCarriedValues(habit),
    purchased_on: day,
    note: null,
    source: 'habit',
    image_path: null,
    habit_id: habit.id,
  };
}

/** 23505: the day already has its receipt (two quick taps, or another phone). */
const UNIQUE_VIOLATION = '23505';

/** Words in the database's refusal of a habit receipt dated before the habit was made. */
const BEFORE_HABIT_START = 'before the habit started';

/**
 * Whether a save was refused because its day is before the habit was made (a tap, or a habit
 * receipt moved to an earlier day). The database answers 23514 with a fixed message, and its
 * `details` holds the habit's first day, yyyy-mm-dd. 23514 alone is not enough: other checks on
 * receipts use it too.
 */
export function refusedBeforeHabitStart(thrown: unknown): boolean {
  if (!thrown || typeof thrown !== 'object') return false;
  const { code, message } = thrown as { code?: unknown; message?: unknown };
  return code === '23514' && typeof message === 'string' && message.includes(BEFORE_HABIT_START);
}

export type TapResult = {
  /** The day's receipt; null only when it was already there and could not be looked up. */
  receiptId: string | null;
  /** The day was already tapped; nothing new was filed. */
  alreadyTapped: boolean;
};

/**
 * Fills a day: files its receipt. Every plan may tap. A day that already has its receipt resolves
 * as already tapped, not as a failure: the circle the person wanted filled is filled.
 */
export function useTapHabitDay() {
  const userId = useUserId();
  const invalidate = useInvalidateHabits();

  return useMutation({
    mutationFn: async ({
      habit,
      day,
    }: {
      habit: TappableHabit;
      day: string;
    }): Promise<TapResult> => {
      if (!userId) throw new Error('Sign in first.');
      const payload = { ...habitTapValues(habit, day), user_id: userId };
      const { data, error } = await supabase
        .from('receipts')
        .insert(payload as never)
        .select('id')
        .single();

      if (error?.code === UNIQUE_VIOLATION) {
        const { data: existing } = await supabase
          .from('receipts')
          .select('id')
          .eq('habit_id', habit.id)
          .eq('purchased_on', day)
          .maybeSingle();
        return { receiptId: (existing as { id: string } | null)?.id ?? null, alreadyTapped: true };
      }
      if (error) throw error;
      return { receiptId: (data as { id: string }).id, alreadyTapped: false };
    },
    // A refusal, such as a day before the habit was made (`refusedBeforeHabitStart`), answers the
    // same every time; a retry would only delay the message.
    retry: false,
    onSuccess: invalidate,
  });
}

/**
 * Empties a day: deletes its receipt. Only a habit's receipt can go this way, whatever id is
 * passed. A receipt already gone counts as done, as any delete does.
 */
export function useUntapHabitDay() {
  const invalidate = useInvalidateHabits();

  return useMutation({
    mutationFn: async (receiptId: string) => {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId)
        .not('habit_id', 'is', null);
      if (error) throw error;
      return { receiptId };
    },
    onSuccess: invalidate,
  });
}

/**
 * How many days a habit has filed (its receipts, whatever their date), from `useHabitTaps`'s read:
 * whether an edit or a delete has past days to ask about. `count` is null until that read has
 * answered, and unread is not "none": the screen awaits `load()` before it asks, rather than guess
 * and rewrite or remove days nobody was asked about.
 */
export function useHabitPastDays(habitId: string | undefined) {
  const { data, isSuccess, refetch } = useHabitTaps();

  const mine = useMemo(() => (habitId && data ? daysOf(data, habitId) : 0), [data, habitId]);
  const retry = useCallback(() => void refetch(), [refetch]);

  /**
   * The count once the read has answered: at once when it has, otherwise after waiting for it (the
   * read already on its way, or a new one). Rejects only when the read fails.
   */
  const load = useCallback(async (): Promise<number> => {
    if (!habitId) return 0;
    if (isSuccess) return mine;
    const read = await refetch({ throwOnError: true, cancelRefetch: false });
    return daysOf(read.data ?? [], habitId);
  }, [habitId, isSuccess, mine, refetch]);

  return {
    count: !habitId ? 0 : isSuccess ? mine : null,
    /** Whether the count has been read; until then `count` is null. */
    ready: !habitId || isSuccess,
    retry,
    load,
  };
}

function daysOf(taps: readonly HabitTap[], habitId: string): number {
  return taps.filter((tap) => tap.habitId === habitId).length;
}

/**
 * Past and upcoming: saves the habit and gives every day it has filed the habit's new name, price,
 * Paid with and category (`habitCarriedValues`), a day whose amount was edited on its own included,
 * in one transaction on the server (`update_habit_and_days`). A dropped connection therefore never
 * leaves the habit saved and its days not, or the other way round. Each day keeps its id, date,
 * note, book and photo, and nothing arrives as newly spent. Throws before calling on a price that
 * is not a whole number of cents above zero, or an empty name. A habit that is gone, or is not the
 * caller's, is refused with P0002 (`refusedHabitGone`), and the caches are refreshed then too, since
 * they still show it: the page then reads it gone. A database without the function refuses with
 * PGRST202. Nothing is written either way. Resolves to the habit as saved.
 */
export function useUpdateHabitAndDays() {
  const invalidate = useInvalidateHabits();

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: HabitEditValues;
    }): Promise<HabitRow> => {
      const cents = wholeCents(values.price);
      if (cents === null || cents <= 0) throw new Error('A habit needs a price.');
      const name = values.name.trim();
      if (!name) throw new Error('A habit needs a name.');
      const { data, error } = await supabase.rpc('update_habit_and_days', {
        p_habit: id,
        p_name: name,
        p_icon_id: values.icon_id,
        p_color: values.color,
        p_price: fromCents(cents),
        p_card_id: values.card_id,
        // The database allows one; a card wins, as it does for the days.
        p_bank_account_id: values.card_id ? null : values.bank_account_id,
        p_category_id: values.category_id ?? null,
      });
      if (error) throw error;
      if (!data) throw new Error(NOTHING_UPDATED);
      return readHabit(data as unknown as RawHabit);
    },
    // A refusal answers the same every time; a retry would only delay the message.
    retry: false,
    onSuccess: invalidate,
    onError: (thrown) => {
      if (refusedHabitGone(thrown)) invalidate();
    },
  });
}

/**
 * The refusal of a habit that is gone, or is not the caller's, in delete_habit and
 * update_habit_and_days alike.
 */
const HABIT_GONE = { code: 'P0002', words: 'there is no such habit' } as const;

/**
 * Whether Remove everything, or Past and upcoming, was refused because the habit is not there
 * (removed on another phone, or never the caller's). The screen says the one failure message; this
 * tells it the habit page has nothing left to show.
 */
export function refusedHabitGone(thrown: unknown): boolean {
  if (!thrown || typeof thrown !== 'object') return false;
  const { code, message } = thrown as { code?: unknown; message?: unknown };
  return (
    code === HABIT_GONE.code && typeof message === 'string' && message.includes(HABIT_GONE.words)
  );
}

/**
 * Remove everything: deletes a habit and every day it filed, in one transaction on the server
 * (`delete_habit`), so it never leaves the days behind as ordinary receipts. Refused (P0002,
 * `refusedHabitGone`) when the habit is not there; the caches are refreshed then too, since they
 * still show it.
 */
export function useDeleteHabitAndDays() {
  const invalidate = useInvalidateHabits();

  return useMutation({
    mutationFn: async (habitId: string) => {
      const { error } = await supabase.rpc('delete_habit', { p_habit: habitId });
      if (error) throw error;
      return { habitId };
    },
    // The same answer every time; a retry would only delay the message.
    retry: false,
    onSuccess: invalidate,
    onError: (thrown) => {
      if (refusedHabitGone(thrown)) invalidate();
    },
  });
}
