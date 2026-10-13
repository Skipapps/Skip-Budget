import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  habitCarriedChanged,
  habitCarriedValues,
  habitTapValues,
  refusedHabitGone,
  useDeleteHabitAndDays,
  useHabitPastDays,
  useHabitTaps,
  useUpdateHabitAndDays,
  type HabitEditValues,
  type HabitRow,
} from '@/api/habits';
import { refusedForPro } from '@/lib/pro-refusal';

/**
 * Editing or deleting a habit that has filed days asks about them. Past and upcoming saves the habit
 * and its days in one call, to the cent; Upcoming only writes none of the days; Remove everything
 * takes the habit and its days in one call. A habit that is gone is refused, never reported as
 * saved or removed.
 */

type Answer = { data?: unknown; error?: unknown; count?: number | null };
type Request = { table: string; calls: [string, ...unknown[]][] };

const mockRequests: Request[] = [];
const mockRpcs: [string, unknown][] = [];
/** Answers in the order the requests are awaited; an empty queue answers with no rows. */
const mockAnswers: Answer[] = [];
/** When set, every answer waits for it: a read still on its way. */
let mockGate: Promise<void> | null = null;

jest.mock('@/lib/supabase', () => {
  const answer = () => ({ data: null, error: null, count: null, ...mockAnswers.shift() });
  const build = (table: string) => {
    const request: Request = { table, calls: [] };
    mockRequests.push(request);
    const builder: Record<string, unknown> = {};
    for (const op of [
      'select',
      'insert',
      'update',
      'delete',
      'eq',
      'is',
      'not',
      'order',
      'or',
      'limit',
      'single',
      'maybeSingle',
    ]) {
      builder[op] = (...args: unknown[]) => {
        request.calls.push([op, ...args]);
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => unknown) =>
      mockGate ? mockGate.then(() => resolve(answer())) : resolve(answer());
    return builder;
  };
  return {
    supabase: {
      from: (table: string) => build(table),
      rpc: (fn: string, args: unknown) => {
        mockRpcs.push([fn, args]);
        return Promise.resolve(answer());
      },
    },
  };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

let client: QueryClient;
let invalidated: unknown[][];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockRequests.length = 0;
  mockRpcs.length = 0;
  mockAnswers.length = 0;
  mockGate = null;
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  invalidated = [];
  jest.spyOn(client, 'invalidateQueries').mockImplementation((filters) => {
    invalidated.push((filters?.queryKey ?? []) as unknown[]);
    return Promise.resolve();
  });
});

const COFFEE: HabitRow = {
  id: 'habit-coffee',
  name: 'Coffee',
  icon_id: 'food-dining/coffee',
  color: 'caramel',
  price: 4.5,
  category_id: 'dining',
  card_id: 'card-1',
  bank_account_id: null,
  preset_id: 'coffee',
  started_on: '2026-10-05',
  saved_from: '2026-10-08',
  sort_order: 0,
  archived_at: null,
  created_at: '2026-10-09T08:00:00Z',
};

/** Runs a mutation inside act, so the hook's own state updates settle before anything is asserted. */
async function settle<T>(work: () => Promise<T>): Promise<T> {
  type Outcome = { ok: true; value: T } | { ok: false; error: unknown };
  let outcome = { ok: false, error: new Error('never ran') } as Outcome;
  await act(async () => {
    try {
      outcome = { ok: true, value: await work() };
    } catch (error) {
      outcome = { ok: false, error };
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

const EVERY_HABIT_KEY = [['habits'], ['receipts'], ['receipt'], ['dashboard']];

/** What PostgREST answers for delete_habit's refusal. */
const GONE = { code: 'P0002', details: null, hint: null, message: 'there is no such habit' };

describe('habitCarriedValues', () => {
  it("is what a tap copies from the habit, under the receipt's column names", () => {
    expect(habitCarriedValues(COFFEE)).toEqual({
      merchant: 'Coffee',
      amount: 4.5,
      category_id: 'dining',
      card_id: 'card-1',
      bank_account_id: null,
    });
    const tap = habitTapValues(COFFEE, '2026-10-09');
    expect(habitCarriedValues(COFFEE)).toEqual({
      merchant: tap.merchant,
      amount: tap.amount,
      category_id: tap.category_id,
      card_id: tap.card_id,
      bank_account_id: tap.bank_account_id,
    });
  });

  it('trims the name, files no category under other, and lets a card win over an account', () => {
    expect(
      habitCarriedValues({
        ...COFFEE,
        name: ' Lattes  ',
        category_id: '',
        bank_account_id: 'acct-1',
      }),
    ).toEqual({
      merchant: 'Lattes',
      amount: 4.5,
      category_id: 'other',
      card_id: 'card-1',
      bank_account_id: null,
    });
  });
});

describe('habitCarriedChanged', () => {
  it('is false when nothing a day copies changes', () => {
    expect(habitCarriedChanged(COFFEE, { ...COFFEE })).toBe(false);
  });

  it('compares prices in cents: 4.50 is 4.5, and float noise is no change', () => {
    expect(habitCarriedChanged(COFFEE, { ...COFFEE, price: Number('4.50') })).toBe(false);
    expect(habitCarriedChanged({ ...COFFEE, price: 0.3 }, { ...COFFEE, price: 0.1 + 0.2 })).toBe(
      false,
    );
    expect(habitCarriedChanged(COFFEE, { ...COFFEE, price: 4.51 })).toBe(true);
    expect(habitCarriedChanged(COFFEE, { ...COFFEE, price: 4.49 })).toBe(true);
    expect(habitCarriedChanged(COFFEE, { ...COFFEE, price: 45 })).toBe(true);
  });

  it('sees a rename, but not a space typed at the end', () => {
    expect(habitCarriedChanged(COFFEE, { ...COFFEE, name: 'Lattes' })).toBe(true);
    expect(habitCarriedChanged(COFFEE, { ...COFFEE, name: 'coffee' })).toBe(true);
    expect(habitCarriedChanged(COFFEE, { ...COFFEE, name: 'Coffee ' })).toBe(false);
  });

  it('sees every Paid with change: card to account, account to card, another card, Skip', () => {
    const fromAccount = { ...COFFEE, card_id: null, bank_account_id: 'acct-1' };
    expect(habitCarriedChanged(COFFEE, fromAccount)).toBe(true);
    expect(habitCarriedChanged(fromAccount, COFFEE)).toBe(true);
    expect(habitCarriedChanged(fromAccount, { ...fromAccount, bank_account_id: 'acct-2' })).toBe(
      true,
    );
    expect(habitCarriedChanged(COFFEE, { ...COFFEE, card_id: 'card-2' })).toBe(true);
    expect(habitCarriedChanged(COFFEE, { ...COFFEE, card_id: null })).toBe(true);
    expect(habitCarriedChanged({ ...COFFEE, card_id: null }, COFFEE)).toBe(true);
  });

  it('sees a new category, but not no category for other', () => {
    expect(habitCarriedChanged(COFFEE, { ...COFFEE, category_id: 'other' })).toBe(true);
    expect(
      habitCarriedChanged({ ...COFFEE, category_id: '' }, { ...COFFEE, category_id: 'other' }),
    ).toBe(false);
  });

  it('never asks about the icon or colour, which every day reads through the habit', () => {
    const restyled: HabitRow = { ...COFFEE, icon_id: 'goals/star', color: 'violet' };
    expect(habitCarriedChanged(COFFEE, restyled)).toBe(false);
  });
});

/** What the edit page saves for Coffee renamed Lattes at $6.10, paid from the account. */
const LATTES: HabitEditValues = {
  name: 'Lattes',
  icon_id: 'food-dining/coffee',
  color: 'violet',
  price: 6.1,
  card_id: null,
  bank_account_id: 'acct-1',
};

/** update_habit_and_days's answer: the habit as saved, as PostgREST sends it. */
const SAVED_LATTES = {
  ...COFFEE,
  name: 'Lattes',
  color: 'violet',
  price: '6.10',
  card_id: null,
  bank_account_id: 'acct-1',
};

/** What the page sends for LATTES, argument by argument. */
const LATTES_CALL = {
  p_habit: 'habit-coffee',
  p_name: 'Lattes',
  p_icon_id: 'food-dining/coffee',
  p_color: 'violet',
  p_price: 6.1,
  p_card_id: null,
  p_bank_account_id: 'acct-1',
  p_category_id: null,
};

describe('useUpdateHabitAndDays', () => {
  it('saves the habit and its days in one call to update_habit_and_days, and resolves to the habit as saved', async () => {
    mockAnswers.push({ data: SAVED_LATTES });
    const { result } = await renderHook(() => useUpdateHabitAndDays(), { wrapper });

    await expect(
      settle(() => result.current.mutateAsync({ id: 'habit-coffee', values: LATTES })),
    ).resolves.toEqual({
      ...COFFEE,
      name: 'Lattes',
      color: 'violet',
      price: 6.1,
      card_id: null,
      bank_account_id: 'acct-1',
    });

    expect(mockRpcs).toEqual([['update_habit_and_days', LATTES_CALL]]);
    // Nothing is written table by table, which could leave the habit and its days apart.
    expect(mockRequests).toHaveLength(0);
  });

  it('refreshes what a habit edit and a receipt edit refresh: the habits, every receipt, the totals', async () => {
    mockAnswers.push({ data: SAVED_LATTES });
    const { result } = await renderHook(() => useUpdateHabitAndDays(), { wrapper });

    await settle(() => result.current.mutateAsync({ id: 'habit-coffee', values: LATTES }));

    expect(invalidated).toEqual(EVERY_HABIT_KEY);
  });

  it('sends only the arguments the function takes, whatever else it is handed', async () => {
    mockAnswers.push({ data: SAVED_LATTES });
    const { result } = await renderHook(() => useUpdateHabitAndDays(), { wrapper });
    const handed = {
      ...LATTES,
      purchased_on: '2026-10-01',
      habit_id: 'habit-other',
      user_id: 'user-2',
      saved_from: '2026-01-01',
    } as HabitEditValues;

    await settle(() => result.current.mutateAsync({ id: 'habit-coffee', values: handed }));

    expect(mockRpcs).toEqual([['update_habit_and_days', LATTES_CALL]]);
  });

  it('sends the price to the cent, float noise gone', async () => {
    mockAnswers.push({ data: SAVED_LATTES }, { data: SAVED_LATTES });
    const { result } = await renderHook(() => useUpdateHabitAndDays(), { wrapper });

    await settle(() =>
      result.current.mutateAsync({ id: 'habit-coffee', values: { ...LATTES, price: 0.1 + 0.2 } }),
    );
    await settle(() =>
      result.current.mutateAsync({
        id: 'habit-coffee',
        values: { ...LATTES, price: Number('4.50') },
      }),
    );

    expect(mockRpcs.map(([, args]) => (args as { p_price: number }).p_price)).toEqual([0.3, 4.5]);
  });

  it('trims the name, and lets a card win over an account', async () => {
    mockAnswers.push({ data: SAVED_LATTES });
    const { result } = await renderHook(() => useUpdateHabitAndDays(), { wrapper });

    await settle(() =>
      result.current.mutateAsync({
        id: 'habit-coffee',
        values: { ...LATTES, name: ' Lattes ', card_id: 'card-1' },
      }),
    );

    expect(mockRpcs).toEqual([
      [
        'update_habit_and_days',
        { ...LATTES_CALL, p_name: 'Lattes', p_card_id: 'card-1', p_bank_account_id: null },
      ],
    ]);
  });

  it('keeps the category the habit is filed under unless a new icon brings one', async () => {
    mockAnswers.push({ data: SAVED_LATTES }, { data: SAVED_LATTES });
    const { result } = await renderHook(() => useUpdateHabitAndDays(), { wrapper });

    await settle(() => result.current.mutateAsync({ id: 'habit-coffee', values: LATTES }));
    await settle(() =>
      result.current.mutateAsync({
        id: 'habit-coffee',
        values: { ...LATTES, icon_id: 'food-dining/groceries', category_id: 'groceries' },
      }),
    );

    expect(mockRpcs.map(([, args]) => args)).toEqual([
      LATTES_CALL,
      { ...LATTES_CALL, p_icon_id: 'food-dining/groceries', p_category_id: 'groceries' },
    ]);
  });

  it.each([
    ['a zero price', { price: 0 }],
    ['a price below zero', { price: -4.5 }],
    ['a price that is not a number', { price: Number.NaN }],
    ['a fraction of a cent, which the database would round', { price: 4.355 }],
    ['an empty name', { name: '   ' }],
  ])('sends nothing for %s', async (_what, change) => {
    const { result } = await renderHook(() => useUpdateHabitAndDays(), { wrapper });

    await expect(
      settle(() =>
        result.current.mutateAsync({ id: 'habit-coffee', values: { ...LATTES, ...change } }),
      ),
    ).rejects.toThrow();
    expect(mockRpcs).toEqual([]);
    expect(mockRequests).toHaveLength(0);
    expect(invalidated).toEqual([]);
  });

  it('fails once, with no retry, when the habit is gone, and refreshes the stale habit so the page reads it gone', async () => {
    // Even under an app-wide mutation retry, the refusal reaches the person on the first answer.
    client = new QueryClient({
      defaultOptions: { mutations: { retry: 3, retryDelay: 0, gcTime: 0 } },
    });
    jest.spyOn(client, 'invalidateQueries').mockImplementation((filters) => {
      invalidated.push((filters?.queryKey ?? []) as unknown[]);
      return Promise.resolve();
    });
    mockAnswers.push({ error: GONE }, { error: GONE }, { error: GONE });
    const { result } = await renderHook(() => useUpdateHabitAndDays(), { wrapper });

    const thrown = await settle(() =>
      result.current.mutateAsync({ id: 'habit-coffee', values: LATTES }),
    ).catch((error: unknown) => error);

    expect(refusedHabitGone(thrown)).toBe(true);
    expect(mockRpcs).toHaveLength(1);
    expect(invalidated).toEqual(EVERY_HABIT_KEY);
  });

  it('fails with no fallback when the database has no such function: nothing is written table by table', async () => {
    mockAnswers.push({
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.update_habit_and_days',
      },
    });
    const { result } = await renderHook(() => useUpdateHabitAndDays(), { wrapper });

    const thrown = await settle(() =>
      result.current.mutateAsync({ id: 'habit-coffee', values: LATTES }),
    ).catch((error: unknown) => error);

    expect(thrown).toMatchObject({ code: 'PGRST202' });
    expect(refusedHabitGone(thrown)).toBe(false);
    expect(mockRpcs).toHaveLength(1);
    expect(mockRequests).toHaveLength(0);
    expect(invalidated).toEqual([]);
  });

  it('fails on an answer with no habit in it, rather than report a save it cannot show', async () => {
    mockAnswers.push({ data: null });
    const { result } = await renderHook(() => useUpdateHabitAndDays(), { wrapper });

    await expect(
      settle(() => result.current.mutateAsync({ id: 'habit-coffee', values: LATTES })),
    ).rejects.toThrow();
    expect(invalidated).toEqual([]);
  });
});

describe('refusedHabitGone', () => {
  it("knows delete_habit's refusal by its code and words", () => {
    expect(refusedHabitGone(GONE)).toBe(true);
  });

  it('is not any other refusal', () => {
    expect(refusedHabitGone({ code: 'P0002', message: 'there is no such loan' })).toBe(false);
    expect(refusedHabitGone({ code: 'P0001', message: 'not authenticated' })).toBe(false);
    expect(
      refusedHabitGone({ code: 'PGRST202', message: 'Could not find the function delete_habit' }),
    ).toBe(false);
    // The words alone, from anywhere else, are not the database's answer.
    expect(refusedHabitGone(new Error(GONE.message))).toBe(false);
    expect(refusedHabitGone(GONE.message)).toBe(false);
    expect(refusedHabitGone(null)).toBe(false);
  });
});

describe('useDeleteHabitAndDays', () => {
  it('removes the habit and its days in one call to delete_habit', async () => {
    const { result } = await renderHook(() => useDeleteHabitAndDays(), { wrapper });

    await expect(settle(() => result.current.mutateAsync('habit-coffee'))).resolves.toEqual({
      habitId: 'habit-coffee',
    });

    expect(mockRpcs).toEqual([['delete_habit', { p_habit: 'habit-coffee' }]]);
    // Nothing is deleted table by table, which could leave the days behind.
    expect(mockRequests).toHaveLength(0);
    expect(invalidated).toEqual(EVERY_HABIT_KEY);
  });

  it('fails once, with no retry, when the habit is gone, and refreshes the stale lists', async () => {
    // Even under an app-wide mutation retry, the refusal reaches the person on the first answer.
    client = new QueryClient({
      defaultOptions: { mutations: { retry: 3, retryDelay: 0, gcTime: 0 } },
    });
    jest.spyOn(client, 'invalidateQueries').mockImplementation((filters) => {
      invalidated.push((filters?.queryKey ?? []) as unknown[]);
      return Promise.resolve();
    });
    mockAnswers.push({ error: GONE }, { error: GONE }, { error: GONE });
    const { result } = await renderHook(() => useDeleteHabitAndDays(), { wrapper });

    const thrown = await settle(() => result.current.mutateAsync('habit-coffee')).catch(
      (error: unknown) => error,
    );

    expect(refusedHabitGone(thrown)).toBe(true);
    expect(refusedForPro(thrown)).toBe(false);
    expect(mockRpcs).toHaveLength(1);
    expect(invalidated).toEqual(EVERY_HABIT_KEY);
  });

  it('fails on any other refusal and refreshes nothing', async () => {
    mockAnswers.push({
      error: { code: 'PGRST202', message: 'Could not find the function public.delete_habit' },
    });
    const { result } = await renderHook(() => useDeleteHabitAndDays(), { wrapper });

    const thrown = await settle(() => result.current.mutateAsync('habit-coffee')).catch(
      (error: unknown) => error,
    );

    expect(thrown).toMatchObject({ code: 'PGRST202' });
    expect(refusedHabitGone(thrown)).toBe(false);
    expect(invalidated).toEqual([]);
  });
});

describe('useHabitPastDays', () => {
  const tap = (n: number, habitId: string) => ({
    id: `receipt-${n}`,
    habit_id: habitId,
    purchased_on: `2026-10-${String(n).padStart(2, '0')}`,
    amount: '4.50',
  });

  it("counts a habit's days from the taps already read, with no read of its own", async () => {
    mockAnswers.push({
      data: [tap(1, 'habit-coffee'), tap(2, 'habit-rides'), tap(3, 'habit-coffee')],
      count: 3,
    });
    const { result } = await renderHook(
      () => ({
        coffee: useHabitPastDays('habit-coffee'),
        rides: useHabitPastDays('habit-rides'),
        snacks: useHabitPastDays('habit-snacks'),
        taps: useHabitTaps(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.coffee.ready).toBe(true));

    expect(result.current.coffee.count).toBe(2);
    expect(result.current.rides.count).toBe(1);
    expect(result.current.snacks).toMatchObject({ count: 0, ready: true });
    expect(mockRequests).toHaveLength(1);
    expect(client.getQueryCache().getAll()[0].queryKey).toEqual([
      'receipts',
      'user-1',
      'habit-taps',
    ]);
  });

  it('is unknown, not none, until the taps have been read, and retries the read', async () => {
    mockAnswers.push({ error: { code: '08006', message: 'connection failure' } });
    const { result } = await renderHook(() => useHabitPastDays('habit-coffee'), { wrapper });

    expect(result.current).toMatchObject({ count: null, ready: false });
    await waitFor(() => expect(mockRequests).toHaveLength(1));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current).toMatchObject({ count: null, ready: false });

    mockAnswers.push({ data: [tap(1, 'habit-coffee')], count: 1 });
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.count).toBe(1);
    expect(mockRequests).toHaveLength(2);
  });

  it('has nothing to ask about for a habit not saved yet', async () => {
    mockAnswers.push({ data: [tap(1, 'habit-coffee')], count: 1 });
    const { result } = await renderHook(() => useHabitPastDays(undefined), { wrapper });

    expect(result.current).toMatchObject({ count: 0, ready: true });
    await expect(result.current.load()).resolves.toBe(0);
  });

  describe('load', () => {
    it('answers at once from the taps already read, with no read of its own', async () => {
      mockAnswers.push({ data: [tap(1, 'habit-coffee'), tap(2, 'habit-coffee')], count: 2 });
      const { result } = await renderHook(() => useHabitPastDays('habit-coffee'), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));

      await expect(settle(() => result.current.load())).resolves.toBe(2);
      expect(mockRequests).toHaveLength(1);
    });

    it('waits for the read already on its way, and starts no second one', async () => {
      let open: () => void = () => {};
      mockGate = new Promise<void>((resolve) => (open = resolve));
      mockAnswers.push({
        data: [tap(1, 'habit-coffee'), tap(2, 'habit-rides'), tap(3, 'habit-coffee')],
        count: 3,
      });
      const { result } = await renderHook(() => useHabitPastDays('habit-coffee'), { wrapper });
      await waitFor(() => expect(mockRequests).toHaveLength(1));
      expect(result.current.ready).toBe(false);

      const counted = result.current.load();
      open();
      await expect(settle(() => counted)).resolves.toBe(2);
      expect(mockRequests).toHaveLength(1);
    });

    it('reads again after a failed read, and answers with the count', async () => {
      mockAnswers.push({ error: { code: '08006', message: 'connection failure' } });
      const { result } = await renderHook(() => useHabitPastDays('habit-coffee'), { wrapper });
      await waitFor(() => expect(mockRequests).toHaveLength(1));
      await settle(async () => {});
      expect(result.current.ready).toBe(false);

      mockAnswers.push({ data: [tap(1, 'habit-coffee')], count: 1 });
      await expect(settle(() => result.current.load())).resolves.toBe(1);
      expect(mockRequests).toHaveLength(2);
    });

    it('rejects with the failure when the read fails again: unread is never none', async () => {
      const refused = { code: '08006', message: 'connection failure' };
      mockAnswers.push({ error: refused });
      const { result } = await renderHook(() => useHabitPastDays('habit-coffee'), { wrapper });
      await waitFor(() => expect(mockRequests).toHaveLength(1));
      await settle(async () => {});

      mockAnswers.push({ error: refused });
      await expect(settle(() => result.current.load())).rejects.toEqual(refused);
    });
  });
});
