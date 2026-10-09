import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  habitMaths,
  habitTapValues,
  refusedBeforeHabitStart,
  useArchiveHabit,
  useCreateHabit,
  useHabit,
  useHabits,
  useHabitTaps,
  useTapHabitDay,
  useUntapHabitDay,
  useUpdateHabit,
  type HabitRow,
  type HabitValues,
} from '@/api/habits';
import { NOTHING_UPDATED } from '@/api/mutations';
import { refusedForPro } from '@/lib/pro-refusal';

/**
 * The data behind spending habits. A tapped day is one receipt at the habit's price, filed where the
 * habit is paid; a second tap on the same day is already done, not a failure; and a database that
 * cannot answer is an error, never "no habits".
 */

type Answer = { data?: unknown; error?: unknown; count?: number | null };
type Request = { table: string; calls: [string, ...unknown[]][] };

const mockRequests: Request[] = [];
/** Answers in the order the requests are awaited; an empty queue answers with no rows. */
const mockAnswers: Answer[] = [];

jest.mock('@/lib/supabase', () => {
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
    builder.then = (resolve: (value: unknown) => unknown) => {
      const answer = mockAnswers.shift() ?? { data: [], error: null };
      return resolve({ data: null, error: null, count: null, ...answer });
    };
    return builder;
  };
  return { supabase: { from: (table: string) => build(table) } };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

let client: QueryClient;
let invalidated: unknown[][];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockRequests.length = 0;
  mockAnswers.length = 0;
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
  price: 5,
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
    // React Query reports a failed mutation's state on the next tick; let it land in here too.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

const calls = (request: Request | undefined, op: string) =>
  (request?.calls ?? []).filter(([name]) => name === op).map(([, ...args]) => args);

const EVERY_HABIT_KEY = [['habits'], ['receipts'], ['receipt'], ['dashboard']];

describe('habitMaths', () => {
  it('hands the week maths both days: tappable from the Monday, saving from the day it was made', () => {
    expect(habitMaths(COFFEE)).toEqual({
      id: 'habit-coffee',
      price: 5,
      startedOn: '2026-10-05',
      savedFrom: '2026-10-08',
    });
  });
});

describe('habitTapValues', () => {
  it("files one receipt for the day at the habit's price, on the habit's card", () => {
    expect(habitTapValues(COFFEE, '2026-10-06')).toEqual({
      brand_id: null,
      merchant: 'Coffee',
      amount: 5,
      purchased_on: '2026-10-06',
      category_id: 'dining',
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
      source: 'habit',
      image_path: null,
      habit_id: 'habit-coffee',
    });
  });

  it('keeps the price to the cent, unrounded', () => {
    expect(habitTapValues({ ...COFFEE, price: 4.35 }, '2026-10-06').amount).toBe(4.35);
    expect(habitTapValues({ ...COFFEE, price: 1234.99 }, '2026-10-06').amount).toBe(1234.99);
  });

  it("files a tap from an account on the account, and Skip's on neither", () => {
    const fromAccount = habitTapValues(
      { ...COFFEE, card_id: null, bank_account_id: 'acct-1' },
      '2026-10-06',
    );
    expect([fromAccount.card_id, fromAccount.bank_account_id]).toEqual([null, 'acct-1']);

    const skip = habitTapValues({ ...COFFEE, card_id: null, bank_account_id: null }, '2026-10-06');
    expect([skip.card_id, skip.bank_account_id]).toEqual([null, null]);
  });

  it('never names both a card and an account, which the database refuses', () => {
    const both = habitTapValues({ ...COFFEE, bank_account_id: 'acct-1' }, '2026-10-06');
    expect([both.card_id, both.bank_account_id]).toEqual(['card-1', null]);
  });

  it('files an uncategorised habit under other', () => {
    expect(habitTapValues({ ...COFFEE, category_id: '' }, '2026-10-06').category_id).toBe('other');
  });

  it('refuses a day or a price that is not one', () => {
    expect(() => habitTapValues(COFFEE, '2026-10-06T00:00:00Z')).toThrow();
    expect(() => habitTapValues(COFFEE, '')).toThrow();
    expect(() => habitTapValues({ ...COFFEE, price: 0 }, '2026-10-06')).toThrow();
    expect(() => habitTapValues({ ...COFFEE, price: Number.NaN }, '2026-10-06')).toThrow();
  });
});

describe('useTapHabitDay', () => {
  it('inserts the receipt as the signed-in person and returns its id', async () => {
    mockAnswers.push({ data: { id: 'receipt-9' } });
    const { result } = await renderHook(() => useTapHabitDay(), { wrapper });

    await expect(
      settle(() => result.current.mutateAsync({ habit: COFFEE, day: '2026-10-06' })),
    ).resolves.toEqual({ receiptId: 'receipt-9', alreadyTapped: false });

    expect(mockRequests).toHaveLength(1);
    expect(mockRequests[0].table).toBe('receipts');
    expect(calls(mockRequests[0], 'insert')).toEqual([
      [{ ...habitTapValues(COFFEE, '2026-10-06'), user_id: 'user-1' }],
    ]);
    expect(invalidated).toEqual(EVERY_HABIT_KEY);
  });

  it('treats a day already tapped (unique violation) as done, with that day’s receipt', async () => {
    mockAnswers.push(
      {
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "receipts_habit_once_a_day"',
        },
      },
      { data: { id: 'receipt-first' } },
    );
    const { result } = await renderHook(() => useTapHabitDay(), { wrapper });

    await expect(
      settle(() => result.current.mutateAsync({ habit: COFFEE, day: '2026-10-06' })),
    ).resolves.toEqual({ receiptId: 'receipt-first', alreadyTapped: true });

    // The lookup names the habit and the day, nothing wider.
    const lookup = mockRequests[1];
    expect(lookup.table).toBe('receipts');
    expect(calls(lookup, 'eq')).toEqual([
      ['habit_id', 'habit-coffee'],
      ['purchased_on', '2026-10-06'],
    ]);
    expect(calls(lookup, 'insert')).toEqual([]);
    // The cache that let the second tap through is stale, so it is refreshed all the same.
    expect(invalidated).toEqual(EVERY_HABIT_KEY);
  });

  it('still reports the day as tapped when the lookup after a race fails', async () => {
    mockAnswers.push(
      { error: { code: '23505', message: 'duplicate key value' } },
      { error: { code: '08006', message: 'connection failure' } },
    );
    const { result } = await renderHook(() => useTapHabitDay(), { wrapper });

    await expect(
      settle(() => result.current.mutateAsync({ habit: COFFEE, day: '2026-10-06' })),
    ).resolves.toEqual({ receiptId: null, alreadyTapped: true });
  });

  it('fails on any other refusal and refreshes nothing', async () => {
    mockAnswers.push({ error: { code: '23514', message: 'A receipt can only belong to …' } });
    const { result } = await renderHook(() => useTapHabitDay(), { wrapper });

    await expect(
      settle(() => result.current.mutateAsync({ habit: COFFEE, day: '2026-10-06' })),
    ).rejects.toMatchObject({ code: '23514' });
    expect(mockRequests).toHaveLength(1);
    expect(invalidated).toEqual([]);
  });

  it('writes nothing for a day that is not one', async () => {
    const { result } = await renderHook(() => useTapHabitDay(), { wrapper });

    await expect(
      settle(() => result.current.mutateAsync({ habit: COFFEE, day: 'Monday' })),
    ).rejects.toThrow();
    expect(mockRequests).toHaveLength(0);
  });

  it('fails once, with no retry, on a day before the habit was made', async () => {
    // Even under an app-wide mutation retry, a refusal must reach the person on the first answer.
    client = new QueryClient({
      defaultOptions: { mutations: { retry: 3, retryDelay: 0, gcTime: 0 } },
    });
    mockAnswers.push({ error: BEFORE_START }, { error: BEFORE_START }, { error: BEFORE_START });
    const { result } = await renderHook(() => useTapHabitDay(), { wrapper });

    const thrown = await settle(() =>
      result.current.mutateAsync({ habit: COFFEE, day: '2026-10-06' }),
    ).catch((error: unknown) => error);

    expect(refusedBeforeHabitStart(thrown)).toBe(true);
    expect(refusedForPro(thrown)).toBe(false);
    expect((thrown as { details?: string }).details).toBe('2026-10-08');
    expect(mockRequests).toHaveLength(1);
  });
});

/** What PostgREST answers for the database's receipts_habit_not_before_creation refusal. */
const BEFORE_START = {
  code: '23514',
  details: '2026-10-08',
  hint: null,
  message: 'A habit receipt cannot be dated before the habit started.',
};

describe('refusedBeforeHabitStart', () => {
  it("knows the database's refusal by its code and words", () => {
    expect(refusedBeforeHabitStart(BEFORE_START)).toBe(true);
  });

  it('is not any other refusal on receipts', () => {
    expect(
      refusedBeforeHabitStart({
        code: '23514',
        message: 'A receipt can only belong to one of your own habits.',
      }),
    ).toBe(false);
    expect(refusedBeforeHabitStart({ code: '23505', message: 'duplicate key value' })).toBe(false);
    expect(
      refusedBeforeHabitStart({
        code: 'P0001',
        message: 'Tracking spending habits is part of Skip Pro.',
      }),
    ).toBe(false);
    // The words alone, from anywhere else, are not the database's answer.
    expect(refusedBeforeHabitStart(new Error(BEFORE_START.message))).toBe(false);
    expect(refusedBeforeHabitStart(BEFORE_START.message)).toBe(false);
    expect(refusedBeforeHabitStart(null)).toBe(false);
  });
});

describe('useUntapHabitDay', () => {
  it("deletes that receipt, and only if it is a habit's", async () => {
    const { result } = await renderHook(() => useUntapHabitDay(), { wrapper });

    await settle(() => result.current.mutateAsync('receipt-9'));

    expect(mockRequests[0].table).toBe('receipts');
    expect(calls(mockRequests[0], 'delete')).toEqual([[]]);
    expect(calls(mockRequests[0], 'eq')).toEqual([['id', 'receipt-9']]);
    expect(calls(mockRequests[0], 'not')).toEqual([['habit_id', 'is', null]]);
    expect(invalidated).toEqual(EVERY_HABIT_KEY);
  });

  it('fails when the delete fails', async () => {
    mockAnswers.push({ error: { code: '08006', message: 'connection failure' } });
    const { result } = await renderHook(() => useUntapHabitDay(), { wrapper });

    await expect(settle(() => result.current.mutateAsync('receipt-9'))).rejects.toMatchObject({
      code: '08006',
    });
    expect(invalidated).toEqual([]);
  });
});

describe('useHabits', () => {
  it('lists active habits in their order, prices as numbers', async () => {
    mockAnswers.push({
      data: [
        { ...COFFEE, price: '5.00' },
        { ...COFFEE, id: 'habit-rides', name: 'Taxi & rides', price: 15.5, color: 'violet' },
      ],
    });
    const { result } = await renderHook(() => useHabits(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((habit) => [habit.id, habit.price])).toEqual([
      ['habit-coffee', 5],
      ['habit-rides', 15.5],
    ]);
    const read = mockRequests[0];
    expect(read.table).toBe('habits');
    expect(calls(read, 'is')).toEqual([['archived_at', null]]);
    expect(calls(read, 'order').map(([column]) => column)).toEqual(['sort_order', 'created_at']);
  });

  it('reads both days a habit counts from', async () => {
    mockAnswers.push({ data: [COFFEE] });
    const { result } = await renderHook(() => useHabits(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(calls(mockRequests[0], 'select')[0][0]).toMatch(/\bstarted_on, saved_from\b/);
    expect(result.current.data?.[0]).toMatchObject({
      started_on: '2026-10-05',
      saved_from: '2026-10-08',
    });
  });

  it('draws a colour it does not know as the first one', async () => {
    mockAnswers.push({ data: [{ ...COFFEE, color: 'teal' }] });
    const { result } = await renderHook(() => useHabits(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].color).toBe('caramel');
  });

  it('is an error, not an empty list, when the table is missing (42P01)', async () => {
    mockAnswers.push({
      error: { code: '42P01', message: 'relation "public.habits" does not exist' },
    });
    const { result } = await renderHook(() => useHabits(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toMatchObject({ code: '42P01' });
  });

  it('is an error when the schema cache has no such table either (PGRST205)', async () => {
    mockAnswers.push({
      error: { code: 'PGRST205', message: "Could not find the table 'public.habits'" },
    });
    const { result } = await renderHook(() => useHabits(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
  });
});

describe('useHabit', () => {
  it('reads one habit by id, archived or not, under the habits key', async () => {
    mockAnswers.push({ data: { ...COFFEE, archived_at: '2026-10-10T00:00:00Z' } });
    const { result } = await renderHook(() => useHabit('habit-coffee'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.archived_at).toBe('2026-10-10T00:00:00Z');
    expect(calls(mockRequests[0], 'eq')).toEqual([['id', 'habit-coffee']]);
    expect(calls(mockRequests[0], 'is')).toEqual([]);
    expect(client.getQueryCache().getAll()[0].queryKey).toEqual([
      'habits',
      'user-1',
      'habit-coffee',
    ]);
  });

  it('is null for a habit that is not there', async () => {
    mockAnswers.push({ data: null });
    const { result } = await renderHook(() => useHabit('gone'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});

describe('useHabitTaps', () => {
  const tapRow = (n: number) => ({
    id: `receipt-${n}`,
    habit_id: n % 2 ? 'habit-coffee' : 'habit-rides',
    purchased_on: `2026-10-${String(n).padStart(2, '0')}`,
    amount: n % 2 ? '5.00' : 15.5,
  });

  it("reads every habit receipt as a tap, with the receipt's own amount", async () => {
    mockAnswers.push({ data: [tapRow(1), tapRow(2)], count: 2 });
    const { result } = await renderHook(() => useHabitTaps(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { habitId: 'habit-coffee', day: '2026-10-01', amount: 5, receiptId: 'receipt-1' },
      { habitId: 'habit-rides', day: '2026-10-02', amount: 15.5, receiptId: 'receipt-2' },
    ]);
    expect(mockRequests[0].table).toBe('receipts');
    expect(calls(mockRequests[0], 'not')).toEqual([['habit_id', 'is', null]]);
  });

  it("is cached under 'receipts', so any receipt write refreshes the circles", async () => {
    mockAnswers.push({ data: [], count: 0 });
    const { result } = await renderHook(() => useHabitTaps(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryCache().getAll()[0].queryKey).toEqual([
      'receipts',
      'user-1',
      'habit-taps',
    ]);
  });

  it('reads past a server row cap until the count is reached', async () => {
    // A server capping pages at 2 rows: five taps arrive in three pages.
    mockAnswers.push(
      { data: [tapRow(1), tapRow(2)], count: 5 },
      { data: [tapRow(3), tapRow(4)] },
      { data: [tapRow(5)] },
    );
    const { result } = await renderHook(() => useHabitTaps(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((tap) => tap.receiptId)).toEqual([
      'receipt-1',
      'receipt-2',
      'receipt-3',
      'receipt-4',
      'receipt-5',
    ]);
    // Each page starts after the last row read, by day then id; only the first asks for the count.
    expect(mockRequests.map((request) => calls(request, 'or'))).toEqual([
      [],
      [['purchased_on.gt.2026-10-02,and(purchased_on.eq.2026-10-02,id.gt.receipt-2)']],
      [['purchased_on.gt.2026-10-04,and(purchased_on.eq.2026-10-04,id.gt.receipt-4)']],
    ]);
    expect(
      mockRequests.map((request) => calls(request, 'order').map(([column]) => column)),
    ).toEqual(Array(3).fill(['purchased_on', 'id']));
    expect(mockRequests.map((request) => calls(request, 'limit'))).toEqual(Array(3).fill([[1000]]));
    expect(mockRequests.map((request) => calls(request, 'select')[0][1])).toEqual([
      { count: 'exact' },
      undefined,
      undefined,
    ]);
  });

  it('counts a receipt met on two pages once, at the day read last', async () => {
    // receipt-2 is re-dated from the 2nd to the 9th between the two pages.
    mockAnswers.push(
      { data: [tapRow(1), tapRow(2)], count: 3 },
      { data: [tapRow(3), { ...tapRow(2), purchased_on: '2026-10-09' }] },
    );
    const { result } = await renderHook(() => useHabitTaps(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRequests).toHaveLength(2);
    expect(result.current.data?.map((tap) => [tap.receiptId, tap.day])).toEqual([
      ['receipt-1', '2026-10-01'],
      ['receipt-2', '2026-10-09'],
      ['receipt-3', '2026-10-03'],
    ]);
  });

  it('stops at an empty page when rows were deleted after the count', async () => {
    mockAnswers.push({ data: [tapRow(1), tapRow(2)], count: 4 }, { data: [] });
    const { result } = await renderHook(() => useHabitTaps(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(mockRequests).toHaveLength(2);
  });

  it('fails the whole read when a later page fails', async () => {
    mockAnswers.push(
      { data: [tapRow(1), tapRow(2)], count: 4 },
      { error: { code: '08006', message: 'connection failure' } },
    );
    const { result } = await renderHook(() => useHabitTaps(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
  });

  it('is an error when the database has no habit_id column yet', async () => {
    mockAnswers.push({
      error: { code: '42703', message: 'column receipts.habit_id does not exist' },
    });
    const { result } = await renderHook(() => useHabitTaps(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
  });
});

const NEW_HABIT: HabitValues = {
  name: '  Coffee ',
  icon_id: 'food-dining/coffee',
  color: 'caramel',
  price: 5,
  category_id: 'dining',
  card_id: 'card-1',
  bank_account_id: null,
  preset_id: 'coffee',
  started_on: '2026-10-05',
  saved_from: '2026-10-08',
};

describe('useCreateHabit', () => {
  it('saves a trimmed name as the signed-in person and returns the row', async () => {
    mockAnswers.push({ data: { ...COFFEE, price: '5.00' } });
    const { result } = await renderHook(() => useCreateHabit(), { wrapper });

    await expect(settle(() => result.current.mutateAsync(NEW_HABIT))).resolves.toEqual(COFFEE);

    expect(mockRequests[0].table).toBe('habits');
    expect(calls(mockRequests[0], 'insert')).toEqual([
      [{ ...NEW_HABIT, name: 'Coffee', user_id: 'user-1' }],
    ]);
    expect(invalidated).toEqual(EVERY_HABIT_KEY);
  });

  it("passes the database's Pro wall on as a Pro refusal, not a failure", async () => {
    mockAnswers.push({
      error: { code: 'P0001', message: 'Tracking spending habits is part of Skip Pro.' },
    });
    const { result } = await renderHook(() => useCreateHabit(), { wrapper });

    const thrown = await settle(() => result.current.mutateAsync(NEW_HABIT)).catch(
      (error: unknown) => error,
    );
    expect(refusedForPro(thrown)).toBe(true);
    expect(invalidated).toEqual([]);
  });
});

describe('useUpdateHabit', () => {
  it('writes the trimmed values to the habit it names', async () => {
    mockAnswers.push({ data: [{ id: 'habit-coffee' }] });
    const { result } = await renderHook(() => useUpdateHabit(), { wrapper });

    await settle(() =>
      result.current.mutateAsync({ id: 'habit-coffee', values: { name: 'Lattes ', price: 6 } }),
    );

    expect(calls(mockRequests[0], 'update')).toEqual([[{ name: 'Lattes', price: 6 }]]);
    expect(calls(mockRequests[0], 'eq')).toEqual([['id', 'habit-coffee']]);
    // A rename renames the habit's receipts on the server, so their lists are stale too.
    expect(invalidated).toEqual(EVERY_HABIT_KEY);
  });

  it('fails instead of reporting success when the habit is not there', async () => {
    mockAnswers.push({ data: [] });
    const { result } = await renderHook(() => useUpdateHabit(), { wrapper });

    await expect(
      settle(() => result.current.mutateAsync({ id: 'gone', values: { price: 6 } })),
    ).rejects.toThrow(NOTHING_UPDATED);
    expect(invalidated).toEqual([]);
  });
});

describe('useArchiveHabit', () => {
  it('archives rather than deletes, keeping the first archive time', async () => {
    mockAnswers.push({ data: [{ id: 'habit-coffee' }] });
    const { result } = await renderHook(() => useArchiveHabit(), { wrapper });

    await settle(() => result.current.mutateAsync('habit-coffee'));

    const write = mockRequests[0];
    expect(calls(write, 'delete')).toEqual([]);
    const [[values]] = calls(write, 'update') as [[{ archived_at: string }]];
    expect(Object.keys(values)).toEqual(['archived_at']);
    expect(Number.isNaN(Date.parse(values.archived_at))).toBe(false);
    expect(calls(write, 'eq')).toEqual([['id', 'habit-coffee']]);
    expect(calls(write, 'is')).toEqual([['archived_at', null]]);
    expect(invalidated).toEqual(EVERY_HABIT_KEY);
  });

  it('counts a habit already archived as done', async () => {
    mockAnswers.push({ data: [] });
    const { result } = await renderHook(() => useArchiveHabit(), { wrapper });

    await expect(settle(() => result.current.mutateAsync('habit-coffee'))).resolves.toEqual({
      id: 'habit-coffee',
    });
  });
});
