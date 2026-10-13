import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useCreateHabit, type HabitValues } from '@/api/habits';
import {
  mayHaveWritten,
  NOTHING_UPDATED,
  useCreatePayment,
  useDeleteUnseenPay,
  useCreateReceipt,
  type PaymentValues,
  type ReceiptValues,
} from '@/api/mutations';

/**
 * Creates given the form's client id file at most one row, however many times Save is pressed:
 * - a save whose answer was lost looks for its row before filing again, and gives a row it finds
 *   the values as they are now;
 * - a save the database refused with a code files normally next time, with no look first;
 * - a save with no earlier lost answer is one request.
 *
 * The database is a table in memory. A write can land with its answer lost, be lost on its way, or
 * be refused with a code, as PostgREST would answer each.
 */

type Row = Record<string, unknown>;
type Fault = 'answer-lost' | 'never-arrived' | { code: string; message: string };

const mockTables: Record<string, Row[]> = {};
/** Every request, in order: "insert receipts", "select receipts", "update receipts". */
const mockLog: string[] = [];
/** What the next inserts meet, in order; an empty queue lets them through. */
const mockInsertFaults: (Fault | null)[] = [];
/** Whether the next look by id gets no answer. */
let mockLookLost = false;
let mockGenerated = 0;
/** Runs just before an update is made: another device acting between two requests. */
let mockBeforeUpdate: (() => void) | null = null;

/** What postgrest-js answers when fetch itself fails: no code, status 0. */
const DROPPED = {
  message: 'TypeError: Network request failed',
  details: '',
  hint: '',
  code: '',
};

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: Row = {};
    const filters: [string, unknown][] = [];
    let single = false;
    let maybe = false;
    let columns = '*';
    const rows = () => (mockTables[table] ??= []);
    const matching = () => rows().filter((row) => filters.every(([col, val]) => row[col] === val));
    /** Only the columns asked for, as PostgREST answers. */
    const shape = (row: Row): Row =>
      columns === '*'
        ? { ...row }
        : Object.fromEntries(columns.split(',').map((col) => [col.trim(), row[col.trim()]]));

    const run = () => {
      mockLog.push(`${op} ${table}`);
      if (op === 'select') {
        if (mockLookLost) {
          mockLookLost = false;
          return { data: null, error: DROPPED, status: 0 };
        }
        const found = matching();
        const shaped = found.map(shape);
        return { data: maybe || single ? (shaped[0] ?? null) : shaped, error: null };
      }
      if (op === 'delete') {
        const gone = new Set(matching());
        mockTables[table] = rows().filter((row) => !gone.has(row));
        return { data: null, error: null };
      }
      if (op === 'update') {
        mockBeforeUpdate?.();
        const found = matching();
        for (const row of found) Object.assign(row, payload);
        return { data: found.map(shape), error: null };
      }
      const fault = mockInsertFaults.shift() ?? null;
      if (fault === 'never-arrived') return { data: null, error: DROPPED, status: 0 };
      if (fault && typeof fault === 'object') return { data: null, error: fault };
      const id = (payload.id as string | undefined) ?? `generated-${(mockGenerated += 1)}`;
      if (rows().some((row) => row.id === id)) {
        // Row level security keeps the key out of the detail, as the live database does.
        return {
          data: null,
          error: {
            code: '23505',
            details: null,
            hint: null,
            message: `duplicate key value violates unique constraint "${table}_pkey"`,
          },
        };
      }
      const row = { ...payload, id };
      rows().push(row);
      if (fault === 'answer-lost') return { data: null, error: DROPPED, status: 0 };
      return { data: single ? shape(row) : [shape(row)], error: null };
    };

    const builder: Record<string, unknown> = {
      select: (asked?: string) => {
        if (asked !== undefined) columns = asked;
        return builder;
      },
      insert: (values: Row) => {
        op = 'insert';
        payload = values;
        return builder;
      },
      delete: () => {
        op = 'delete';
        return builder;
      },
      update: (values: Row) => {
        op = 'update';
        payload = values;
        return builder;
      },
      eq: (col: string, val: unknown) => {
        filters.push([col, val]);
        return builder;
      },
      single: () => {
        single = true;
        return builder;
      },
      maybeSingle: () => {
        maybe = true;
        return builder;
      },
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
        try {
          return Promise.resolve(resolve(run()));
        } catch (thrown) {
          return Promise.resolve(reject(thrown));
        }
      },
    };
    return builder;
  };
  return { supabase: { from: (table: string) => build(table) } };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

let nextId = 0;
/** A fresh client id per test: the record of lost answers is app-wide, as on the phone. */
const clientId = () => `00000000-0000-4000-8000-${String((nextId += 1)).padStart(12, '0')}`;

const receipt: ReceiptValues = {
  brand_id: null,
  merchant: 'Trader Joe’s',
  amount: 42.17,
  purchased_on: '2026-10-13',
  category_id: 'groceries',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  source: 'manual',
  image_path: null,
};

beforeEach(() => {
  for (const table of Object.keys(mockTables)) delete mockTables[table];
  mockLog.length = 0;
  mockInsertFaults.length = 0;
  mockGenerated = 0;
  mockBeforeUpdate = null;
  mockLookLost = false;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
});

type Outcome = { ok: true; value: unknown } | { ok: false; error: unknown };

async function save<T>(mutate: (values: T) => Promise<unknown>, values: T): Promise<Outcome> {
  let outcome: Outcome = { ok: false, error: null };
  await act(async () => {
    try {
      outcome = { ok: true, value: await mutate(values) };
    } catch (thrown) {
      outcome = { ok: false, error: thrown };
    }
  });
  return outcome;
}

describe('mayHaveWritten', () => {
  it('reads a dropped connection, a gateway page and a deadline as maybe written', () => {
    expect(mayHaveWritten(DROPPED)).toBe(true);
    expect(mayHaveWritten({ message: '<html>502 Bad Gateway</html>' })).toBe(true);
    expect(mayHaveWritten(new Error('Could not save. Check your connection.'))).toBe(true);
    expect(mayHaveWritten(new TypeError('Network request failed'))).toBe(true);
    expect(mayHaveWritten(null)).toBe(true);
  });

  it('reads any answer with a code as not written: the request rolled back', () => {
    expect(mayHaveWritten({ code: 'P0001', message: 'Scanning is part of Skip Pro.' })).toBe(false);
    expect(mayHaveWritten({ code: '23514', message: 'check' })).toBe(false);
    expect(mayHaveWritten({ code: 'PGRST301', message: 'JWT expired' })).toBe(false);
    expect(mayHaveWritten({ code: '57014', message: 'statement timeout' })).toBe(false);
  });
});

describe('useCreate with a client id', () => {
  it('files a first save in one request, under the id it was given', async () => {
    const { result } = await renderHook(() => useCreateReceipt(), { wrapper });
    const id = clientId();

    const outcome = await save(result.current.mutateAsync, { ...receipt, id });

    expect(outcome).toEqual({ ok: true, value: { id } });
    expect(mockLog).toEqual(['insert receipts']);
    expect(mockTables.receipts).toEqual([{ ...receipt, id, user_id: 'user-1' }]);
  });

  it('files with no id as before: one insert, the id left to the database', async () => {
    const { result } = await renderHook(() => useCreateReceipt(), { wrapper });

    const outcome = await save(result.current.mutateAsync, receipt);

    expect(outcome).toEqual({ ok: true, value: { id: 'generated-1' } });
    expect(mockLog).toEqual(['insert receipts']);
    expect(mockTables.receipts).toHaveLength(1);
  });

  it('after a lost answer, finds the row the first save left and gives it the edited values', async () => {
    const { result } = await renderHook(() => useCreateReceipt(), { wrapper });
    const id = clientId();
    const other = { ...receipt, merchant: 'Costco', id: 'older', user_id: 'user-1' };
    mockTables.receipts = [other];
    mockInsertFaults.push('answer-lost');

    const first = await save(result.current.mutateAsync, { ...receipt, id });
    expect(first.ok).toBe(false);
    expect(mockTables.receipts).toHaveLength(2);

    // The person fixes the amount before pressing Save again.
    const edited = { ...receipt, amount: 24.17, id };
    const second = await save(result.current.mutateAsync, edited);

    expect(second).toEqual({ ok: true, value: { id } });
    expect(mockLog).toEqual(['insert receipts', 'select receipts', 'update receipts']);
    // Only that row: the receipt saved before it is left as it was.
    expect(mockTables.receipts).toEqual([
      other,
      { ...receipt, amount: 24.17, id, user_id: 'user-1' },
    ]);
  });

  it('a look that gets no answer fails the save, files nothing, and the next save looks again', async () => {
    const { result } = await renderHook(() => useCreateReceipt(), { wrapper });
    const id = clientId();
    mockInsertFaults.push('answer-lost');
    await save(result.current.mutateAsync, { ...receipt, id });
    mockLookLost = true;

    const second = await save(result.current.mutateAsync, { ...receipt, id });

    expect(second).toEqual({ ok: false, error: DROPPED });
    expect(mockTables.receipts).toHaveLength(1);

    mockLog.length = 0;
    const third = await save(result.current.mutateAsync, { ...receipt, amount: 1, id });
    expect(third).toEqual({ ok: true, value: { id } });
    expect(mockLog).toEqual(['select receipts', 'update receipts']);
    expect(mockTables.receipts).toEqual([{ ...receipt, amount: 1, id, user_id: 'user-1' }]);
  });

  it('after a request that never arrived, looks, finds nothing, and files under the same id', async () => {
    const { result } = await renderHook(() => useCreateReceipt(), { wrapper });
    const id = clientId();
    mockInsertFaults.push('never-arrived');

    expect((await save(result.current.mutateAsync, { ...receipt, id })).ok).toBe(false);
    expect(mockTables.receipts ?? []).toHaveLength(0);

    const second = await save(result.current.mutateAsync, { ...receipt, id });

    expect(second).toEqual({ ok: true, value: { id } });
    expect(mockLog).toEqual(['insert receipts', 'select receipts', 'insert receipts']);
    expect(mockTables.receipts).toEqual([{ ...receipt, id, user_id: 'user-1' }]);
  });

  it('after a refusal with a code, files normally next time with no look first', async () => {
    const { result } = await renderHook(() => useCreateReceipt(), { wrapper });
    const id = clientId();
    const refusal = { code: 'P0001', message: 'Scanning is part of Skip Pro.' };
    mockInsertFaults.push(refusal);

    const first = await save(result.current.mutateAsync, { ...receipt, id });
    expect(first).toEqual({ ok: false, error: refusal });

    const second = await save(result.current.mutateAsync, { ...receipt, id });

    expect(second).toEqual({ ok: true, value: { id } });
    expect(mockLog).toEqual(['insert receipts', 'insert receipts']);
    expect(mockTables.receipts).toHaveLength(1);
  });

  it('once the retry has filed, the id is not looked up first: a double tap updates it', async () => {
    const { result } = await renderHook(() => useCreateReceipt(), { wrapper });
    const id = clientId();
    mockInsertFaults.push('never-arrived');
    await save(result.current.mutateAsync, { ...receipt, id });
    await save(result.current.mutateAsync, { ...receipt, id });
    mockLog.length = 0;

    // A third save of the same id (a double tap) finds its id taken and updates instead.
    const third = await save(result.current.mutateAsync, { ...receipt, note: 'twice', id });

    expect(third).toEqual({ ok: true, value: { id } });
    expect(mockLog).toEqual(['insert receipts', 'update receipts']);
    expect(mockTables.receipts).toEqual([{ ...receipt, note: 'twice', id, user_id: 'user-1' }]);
  });

  it('keeps looking first while the answer stays unknown, through a refusal in between', async () => {
    const { result } = await renderHook(() => useCreateReceipt(), { wrapper });
    const id = clientId();
    mockInsertFaults.push('answer-lost');
    await save(result.current.mutateAsync, { ...receipt, id });
    // The row is gone before the next try (deleted elsewhere), and that try is refused.
    mockTables.receipts.length = 0;
    mockInsertFaults.push({ code: 'P0001', message: 'refused' });
    expect((await save(result.current.mutateAsync, { ...receipt, id })).ok).toBe(false);

    mockLog.length = 0;
    const third = await save(result.current.mutateAsync, { ...receipt, id });

    expect(third).toEqual({ ok: true, value: { id } });
    expect(mockLog).toEqual(['select receipts', 'insert receipts']);
    expect(mockTables.receipts).toHaveLength(1);
  });

  it('a save that finds its id already taken updates that row instead of failing', async () => {
    const { result } = await renderHook(() => useCreateReceipt(), { wrapper });
    const id = clientId();
    // The first save's answer was lost after the second one looked: the row landed meanwhile.
    mockTables.receipts = [{ ...receipt, id, user_id: 'user-1' }];

    const outcome = await save(result.current.mutateAsync, { ...receipt, amount: 5, id });

    expect(outcome).toEqual({ ok: true, value: { id } });
    expect(mockTables.receipts).toEqual([{ ...receipt, amount: 5, id, user_id: 'user-1' }]);
  });

  it('a duplicate on any other unique key is still a refusal', async () => {
    const { result } = await renderHook(() => useCreateReceipt(), { wrapper });
    const id = clientId();
    const other = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "receipts_user_name_key"',
    };
    mockInsertFaults.push(other);

    const outcome = await save(result.current.mutateAsync, { ...receipt, id });

    expect(outcome).toEqual({ ok: false, error: other });
    expect(mockLog).toEqual(['insert receipts']);
  });

  it('another table’s primary key is not this row’s id', async () => {
    const { result } = await renderHook(() => useCreateReceipt(), { wrapper });
    const id = clientId();
    const other = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "pay_received_pkey"',
    };
    mockInsertFaults.push(other);

    const outcome = await save(result.current.mutateAsync, { ...receipt, id });

    expect(outcome).toEqual({ ok: false, error: other });
  });

  it('a row found and then gone before the update says so, and the next save looks again', async () => {
    const { result } = await renderHook(() => useCreateReceipt(), { wrapper });
    const id = clientId();
    mockInsertFaults.push('answer-lost');
    await save(result.current.mutateAsync, { ...receipt, id });
    // Deleted on another device between the look and the update.
    mockBeforeUpdate = () => {
      mockTables.receipts.length = 0;
      mockBeforeUpdate = null;
    };

    const outcome = await save(result.current.mutateAsync, { ...receipt, id });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect((outcome.error as Error).message).toBe(NOTHING_UPDATED);

    mockLog.length = 0;
    const next = await save(result.current.mutateAsync, { ...receipt, id });
    expect(next).toEqual({ ok: true, value: { id } });
    expect(mockLog).toEqual(['select receipts', 'insert receipts']);
    expect(mockTables.receipts).toHaveLength(1);
  });

  it('a payment whose answer was lost is filed once, with the account as chosen the second time', async () => {
    const { result } = await renderHook(() => useCreatePayment(), { wrapper });
    const id = clientId();
    const payment: PaymentValues = {
      card_id: 'card-1',
      bank_account_id: null,
      from_bank_account_id: 'checking',
      amount: 1250.05,
      paid_on: '2026-10-13',
      note: null,
    };
    mockInsertFaults.push('answer-lost');
    await save(result.current.mutateAsync, { ...payment, id });

    const second = await save(result.current.mutateAsync, {
      ...payment,
      from_bank_account_id: null,
      id,
    });

    expect(second).toEqual({ ok: true, value: { id } });
    expect(mockTables.payments).toEqual([
      { ...payment, from_bank_account_id: null, id, user_id: 'user-1' },
    ]);
  });
});

describe('useCreateHabit with a client id', () => {
  const habit: HabitValues = {
    name: 'Coffee out ',
    icon_id: 'coffee',
    color: 'violet',
    price: 5.75,
    category_id: 'dining',
    card_id: 'card-1',
    bank_account_id: null,
    preset_id: null,
    started_on: '2026-10-12',
    saved_from: '2026-10-13',
  };

  it('files one habit after a lost answer, with the edited name, and answers with the row', async () => {
    const { result } = await renderHook(() => useCreateHabit(), { wrapper });
    const id = clientId();
    mockInsertFaults.push('answer-lost');

    expect((await save(result.current.mutateAsync, { ...habit, id })).ok).toBe(false);
    const second = await save(result.current.mutateAsync, { ...habit, name: ' Lattes ', id });

    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.value).toEqual(
        expect.objectContaining({ id, name: 'Lattes', price: 5.75, color: 'violet' }),
      );
    }
    expect(mockLog).toEqual(['insert habits', 'select habits', 'update habits']);
    expect(mockTables.habits).toHaveLength(1);
    expect(mockTables.habits[0]).toEqual(
      expect.objectContaining({ id, name: 'Lattes', user_id: 'user-1' }),
    );
  });

  it('files a first habit in one request', async () => {
    const { result } = await renderHook(() => useCreateHabit(), { wrapper });
    const id = clientId();

    const outcome = await save(result.current.mutateAsync, { ...habit, id });

    expect(outcome.ok).toBe(true);
    expect(mockLog).toEqual(['insert habits']);
    expect(mockTables.habits[0]).toEqual(expect.objectContaining({ id, name: 'Coffee out' }));
  });

  it('a Pro refusal followed by a save once Pro is confirmed files normally', async () => {
    const { result } = await renderHook(() => useCreateHabit(), { wrapper });
    const id = clientId();
    mockInsertFaults.push({
      code: 'P0001',
      message: 'Tracking spending habits is part of Skip Pro.',
    });

    expect((await save(result.current.mutateAsync, { ...habit, id })).ok).toBe(false);
    const second = await save(result.current.mutateAsync, { ...habit, id });

    expect(second.ok).toBe(true);
    expect(mockLog).toEqual(['insert habits', 'insert habits']);
    expect(mockTables.habits).toHaveLength(1);
  });
});

describe('useDeleteUnseenPay', () => {
  it('deletes the pay recorded for it, then the pay itself, and nothing of any other pay', async () => {
    mockTables.pay_received = [
      { id: 'r1', salary_source_id: 'pay-1' },
      { id: 'r2', salary_source_id: 'pay-1' },
      { id: 'r3', salary_source_id: 'acme' },
    ];
    mockTables.salary_sources = [{ id: 'pay-1' }, { id: 'acme' }];
    const { result } = await renderHook(() => useDeleteUnseenPay(), { wrapper });

    const outcome = await save(result.current.mutateAsync, 'pay-1');

    expect(outcome).toEqual({ ok: true, value: { id: 'pay-1' } });
    expect(mockLog).toEqual(['delete pay_received', 'delete salary_sources']);
    expect(mockTables.pay_received).toEqual([{ id: 'r3', salary_source_id: 'acme' }]);
    expect(mockTables.salary_sources).toEqual([{ id: 'acme' }]);
  });
});
