import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useDeletePay } from '@/api/pay';

/**
 * Deleting a pay: the count its question reads, "keep past" (write down the paydays due by today,
 * then delete the salary) and "remove everything" (one database step). The database is a fake that
 * keeps its rows, so what a step wrote is what the next one reads.
 */

type Failure = { code?: string; message?: string } | null;
type Row = Record<string, unknown>;
type Call = { table: string; op: string; args: unknown[] };

const mockRows: Record<string, Row[]> = {};
const mockReadErrors: Record<string, Failure> = {};
const mockCalls: Call[] = [];
/** Answers for the next upserts, in order; then none fail. */
let mockUpsertErrors: Failure[] = [];
let mockDeleteError: Failure = null;
let mockRpcError: Failure = null;
let mockSerial = 0;

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    let mode: 'read' | 'delete' = 'read';
    let single = false;
    const filters: [string, unknown][] = [];
    const matching = () =>
      (mockRows[table] ?? []).filter((row) =>
        filters.every(([column, value]) => row[column] === value),
      );

    const builder: Record<string, unknown> = {
      select: (columns: string) => {
        mockCalls.push({ table, op: 'select', args: [columns] });
        return builder;
      },
      order: () => builder,
      eq: (column: string, value: unknown) => {
        mockCalls.push({ table, op: 'eq', args: [column, value] });
        filters.push([column, value]);
        return builder;
      },
      maybeSingle: () => {
        single = true;
        return builder;
      },
      delete: () => {
        mockCalls.push({ table, op: 'delete', args: [] });
        mode = 'delete';
        return builder;
      },
      upsert: (rows: Row[], options: unknown) => {
        mockCalls.push({ table, op: 'upsert', args: [rows, options] });
        const error = mockUpsertErrors.shift() ?? null;
        if (!error) {
          for (const row of rows) {
            (mockRows[table] ??= []).push({ ...row, id: `pay-${(mockSerial += 1)}` });
          }
        }
        return Promise.resolve({ error });
      },
      then: (resolve: (value: unknown) => unknown) => {
        if (mode === 'delete') {
          if (mockDeleteError) return resolve({ error: mockDeleteError });
          const gone = new Set(matching());
          mockRows[table] = (mockRows[table] ?? []).filter((row) => !gone.has(row));
          // pay_received.salary_source_id is "on delete set null".
          if (table === 'salary_sources') {
            mockRows.pay_received = (mockRows.pay_received ?? []).map((row) =>
              [...gone].some((salary) => salary.id === row.salary_source_id)
                ? { ...row, salary_source_id: null }
                : row,
            );
          }
          return resolve({ error: null });
        }
        const error = mockReadErrors[table] ?? null;
        if (error) return resolve({ data: null, error });
        const data = matching().map((row) => ({ ...row }));
        return resolve({ data: single ? (data[0] ?? null) : data, error: null });
      },
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => build(table),
      rpc: (name: string, args: Row) => {
        mockCalls.push({ table: '', op: `rpc:${name}`, args: [args] });
        if (mockRpcError) return Promise.resolve({ data: null, error: mockRpcError });
        const id = args.p_salary;
        mockRows.pay_received = (mockRows.pay_received ?? []).filter(
          (row) => row.salary_source_id !== id,
        );
        mockRows.salary_sources = (mockRows.salary_sources ?? []).filter((row) => row.id !== id);
        return Promise.resolve({ data: null, error: null });
      },
    },
  };
});

jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => jest.fn() }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

const TODAY = '2026-10-13';

/** Paid every other Friday from 5 June into checking. */
const acme = (over: Row = {}): Row => ({
  id: 'acme',
  name: 'Acme Payroll',
  amount: '1834.62',
  frequency: 'biweekly',
  last_payday: '2026-06-05',
  salary_source_accounts: [{ bank_account_id: 'checking' }],
  ...over,
});

const cafe = (): Row => ({
  id: 'cafe',
  name: 'Corner Cafe',
  amount: 412.37,
  frequency: 'monthly',
  last_payday: '2026-06-15',
  salary_source_accounts: [{ bank_account_id: 'checking' }],
});

const recorded = (salary: string, paid_on: string, amount = 1834.62): Row => ({
  id: `${salary}-${paid_on}`,
  user_id: 'user-1',
  salary_source_id: salary,
  label: salary,
  amount,
  paid_on,
  bank_account_id: 'checking',
});

/** Acme through 25 September: nine paydays; 9 October is due and not written down. */
const ACME_PAID = [
  '2026-06-05',
  '2026-06-19',
  '2026-07-03',
  '2026-07-17',
  '2026-07-31',
  '2026-08-14',
  '2026-08-28',
  '2026-09-11',
  '2026-09-25',
].map((day) => recorded('acme', day));

const ops = () => mockCalls.map((call) => `${call.table}:${call.op}`);
const writes = () => mockCalls.filter((call) => call.op === 'upsert');
const deletes = () => mockCalls.filter((call) => call.op === 'delete');

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** What a removal threw once it has finished; null when it did not throw. */
async function failureOf(run: () => Promise<unknown>): Promise<unknown> {
  let thrown: unknown = null;
  await act(async () => {
    try {
      await run();
    } catch (error) {
      thrown = error;
    }
  });
  return thrown;
}

async function hook() {
  const rendered = await renderHook(() => useDeletePay(), { wrapper });
  return rendered.result;
}

beforeEach(() => {
  for (const table of Object.keys(mockRows)) delete mockRows[table];
  for (const table of Object.keys(mockReadErrors)) delete mockReadErrors[table];
  mockCalls.length = 0;
  mockUpsertErrors = [];
  mockDeleteError = null;
  mockRpcError = null;
  mockSerial = 0;
  mockRows.salary_sources = [acme(), cafe()];
  mockRows.bank_accounts = [{ id: 'checking' }];
  mockRows.pay_received = [...ACME_PAID, recorded('cafe', '2026-09-15', 412.37)];
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
});

describe('countPast, for the question', () => {
  it('counts the paydays on the record and the one due today but not written down', async () => {
    const result = await hook();
    await expect(result.current.countPast('acme', TODAY)).resolves.toBe(10);
  });

  it('counts only that pay’s own, as the ledger shows them', async () => {
    const result = await hook();
    // Cafe has 15 September on the record. The gap behind it is not worked out by the ledger nor
    // written by the sweep, and 15 October is still ahead.
    await expect(result.current.countPast('cafe', TODAY)).resolves.toBe(1);
  });

  it('is 0 for a pay whose first payday is still ahead', async () => {
    mockRows.salary_sources = [acme({ last_payday: '2026-10-23' })];
    mockRows.pay_received = [];
    const result = await hook();
    await expect(result.current.countPast('acme', TODAY)).resolves.toBe(0);
  });

  it('counts what is on the record for a pay removed on another phone', async () => {
    mockRows.salary_sources = [];
    mockRows.pay_received = [recorded('acme', '2026-09-25')];
    const result = await hook();
    await expect(result.current.countPast('acme', TODAY)).resolves.toBe(1);
  });

  it('works the paydays out alone on a database without recorded pay', async () => {
    mockReadErrors.pay_received = { code: '42P01', message: 'no such table' };
    const result = await hook();
    await expect(result.current.countPast('acme', TODAY)).resolves.toBe(10);
  });

  it.each(['salary_sources', 'pay_received'])(
    'rejects when %s cannot be read: an unread count is not none',
    async (table) => {
      mockReadErrors[table] = { code: '', message: 'Network request failed' };
      const result = await hook();
      await expect(result.current.countPast('acme', TODAY)).rejects.toMatchObject({ code: '' });
    },
  );
});

describe('remove, keep past', () => {
  it('writes down 9 October as Acme pays it today, then deletes Acme; its pay stays with no salary', async () => {
    const result = await hook();

    await act(() => result.current.remove({ id: 'acme', choice: 'keep', today: TODAY }));

    expect(writes()).toHaveLength(1);
    expect(writes()[0].args).toEqual([
      [
        {
          user_id: 'user-1',
          salary_source_id: 'acme',
          label: 'Acme Payroll',
          amount: 1834.62,
          paid_on: '2026-10-09',
          bank_account_id: 'checking',
        },
      ],
      { ignoreDuplicates: true },
    ]);
    const order = ops();
    expect(order.indexOf('pay_received:upsert')).toBeLessThan(
      order.indexOf('salary_sources:delete'),
    );
    expect(mockRows.salary_sources.map((row) => row.id)).toEqual(['cafe']);
    const acmePay = mockRows.pay_received.filter((row) => row.label !== 'cafe');
    expect(acmePay).toHaveLength(10);
    expect(acmePay.every((row) => row.salary_source_id === null)).toBe(true);
  });

  it('reads and writes only that pay: Cafe’s unwritten paydays are left to the sweep', async () => {
    const result = await hook();

    await act(() => result.current.remove({ id: 'acme', choice: 'keep', today: TODAY }));

    expect(mockCalls.filter((call) => call.op === 'eq')).toEqual([
      { table: 'salary_sources', op: 'eq', args: ['id', 'acme'] },
      { table: 'pay_received', op: 'eq', args: ['salary_source_id', 'acme'] },
      { table: 'salary_sources', op: 'eq', args: ['id', 'acme'] },
    ]);
    expect((writes()[0].args[0] as Row[]).every((row) => row.salary_source_id === 'acme')).toBe(
      true,
    );
  });

  it('deletes at once when nothing is due', async () => {
    mockRows.pay_received = [...ACME_PAID, recorded('acme', '2026-10-09')];
    const result = await hook();

    await act(() => result.current.remove({ id: 'acme', choice: 'keep', today: TODAY }));

    expect(writes()).toEqual([]);
    expect(deletes()).toHaveLength(1);
  });

  it('deletes nothing when the paydays cannot be read', async () => {
    mockReadErrors.pay_received = { code: '', message: 'Network request failed' };
    const result = await hook();

    expect(
      await failureOf(() => result.current.remove({ id: 'acme', choice: 'keep', today: TODAY })),
    ).toMatchObject({ code: '' });
    expect(writes()).toEqual([]);
    expect(deletes()).toEqual([]);
  });

  it('deletes nothing when the paydays cannot be written', async () => {
    mockUpsertErrors = [{ code: '', message: 'Network request failed' }];
    const result = await hook();

    expect(
      await failureOf(() => result.current.remove({ id: 'acme', choice: 'keep', today: TODAY })),
    ).toMatchObject({ code: '' });
    expect(deletes()).toEqual([]);
    expect(mockRows.salary_sources.map((row) => row.id)).toEqual(['acme', 'cafe']);
  });

  it('reads again once when a sweep wrote the same payday a moment before', async () => {
    mockUpsertErrors = [{ code: '23505', message: 'duplicate key value' }];
    const result = await hook();

    await act(() => result.current.remove({ id: 'acme', choice: 'keep', today: TODAY }));

    expect(writes()).toHaveLength(2);
    expect(deletes()).toHaveLength(1);
  });

  it('stops at a second refusal, deleting nothing', async () => {
    mockUpsertErrors = [
      { code: '23505', message: 'duplicate key value' },
      { code: '23505', message: 'duplicate key value' },
    ];
    const result = await hook();

    expect(
      await failureOf(() => result.current.remove({ id: 'acme', choice: 'keep', today: TODAY })),
    ).toMatchObject({ code: '23505' });
    expect(writes()).toHaveLength(2);
    expect(deletes()).toEqual([]);
  });

  it('fails when the delete fails, with the paydays already written down', async () => {
    mockDeleteError = { code: '', message: 'Network request failed' };
    const result = await hook();

    expect(
      await failureOf(() => result.current.remove({ id: 'acme', choice: 'keep', today: TODAY })),
    ).toMatchObject({ code: '' });
    expect(mockRows.pay_received.filter((row) => row.paid_on === '2026-10-09')).toHaveLength(1);
  });
});

describe('remove, everything', () => {
  it('is one database step, and nothing else is written', async () => {
    const result = await hook();

    await act(() => result.current.remove({ id: 'acme', choice: 'everything', today: TODAY }));

    expect(ops()).toEqual([':rpc:delete_salary_and_pay']);
    expect(mockCalls[0].args).toEqual([{ p_salary: 'acme' }]);
    expect(mockRows.salary_sources.map((row) => row.id)).toEqual(['cafe']);
    expect(mockRows.pay_received.map((row) => row.salary_source_id)).toEqual(['cafe']);
  });

  it('is done when the pay was removed on another phone already', async () => {
    mockRpcError = { code: 'P0002', message: 'there is no such pay' };
    const result = await hook();

    let done: unknown = null;
    await act(async () => {
      done = await result.current.remove({ id: 'acme', choice: 'everything', today: TODAY });
    });
    expect(done).toEqual({ id: 'acme', choice: 'everything' });
  });

  it.each([
    ['a dropped connection', { code: '', message: 'Network request failed' }],
    ['a database without the step yet', { code: 'PGRST202', message: 'Could not find' }],
  ])('fails on %s', async (_what, error) => {
    mockRpcError = error;
    const result = await hook();

    expect(
      await failureOf(() =>
        result.current.remove({ id: 'acme', choice: 'everything', today: TODAY }),
      ),
    ).toEqual(error);
  });
});

describe('what it refreshes', () => {
  it.each([
    ['keep', ['salary_sources', 'salary_source_accounts', 'pay_received', 'dashboard']],
    [
      'everything',
      ['salary_sources', 'salary_source_accounts', 'pay_received', 'dashboard', 'savings'],
    ],
  ] as const)('after %s', async (choice, keys) => {
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const result = await hook();

    await act(() => result.current.remove({ id: 'acme', choice, today: TODAY }));

    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey?.[0])).toEqual(keys);
  });

  it('refreshes nothing when it fails', async () => {
    mockRpcError = { code: '', message: 'Network request failed' };
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const result = await hook();

    expect(
      await failureOf(() =>
        result.current.remove({ id: 'acme', choice: 'everything', today: TODAY }),
      ),
    ).toBeTruthy();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
