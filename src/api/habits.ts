import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { NOTHING_UPDATED, type ReceiptValues } from '@/api/mutations';
import { habitColor, type HabitColor } from '@/data/habit-colors';
import { withTimeout } from '@/lib/deadline';
import type { HabitMaths, HabitTap } from '@/lib/habit-week';
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
  /** What one tapped day costs; a change reaches only the taps after it. */
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

/** A habit write moves its receipts too (a rename renames them), and they feed every total. */
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

/** The database keeps names trimmed, so a stray space typed at the end is not a refusal. */
function trimmed<T extends Partial<HabitValues>>(values: T): T {
  return typeof values.name === 'string' ? { ...values, name: values.name.trim() } : values;
}

/**
 * Starts a habit. Pro only: a free account is refused by the database with "part of Skip Pro"
 * (`refusedForPro`). Resolves to the saved row.
 */
export function useCreateHabit() {
  const userId = useUserId();
  const invalidate = useInvalidateHabits();

  return useMutation({
    mutationFn: async (values: HabitValues): Promise<HabitRow> => {
      if (!userId) throw new Error('Sign in first.');
      const payload = { ...trimmed(values), user_id: userId };
      const { data, error } = await supabase
        .from('habits')
        .insert(payload as never)
        .select(HABIT_COLUMNS)
        .single();
      if (error) throw error;
      return readHabit(data as unknown as RawHabit);
    },
    onSuccess: invalidate,
  });
}

/** Any plan may edit a habit it has. A new price or Paid with reaches only later taps. */
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
 * Deletes a habit card. Soft: its receipts are money really spent and keep its icon and name. A
 * habit already archived keeps the time it was first archived, and counts as done.
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
    merchant: habit.name,
    amount: habit.price,
    purchased_on: day,
    category_id: habit.category_id || 'other',
    card_id: habit.card_id,
    // The database allows one; a card wins as it does everywhere a row names both.
    bank_account_id: habit.card_id ? null : habit.bank_account_id,
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
