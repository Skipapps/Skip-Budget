import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { recordDuePay, usePastPay } from '@/api/pay';
import { useCurrentBalance } from '@/api/queries';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Writing down the pay that has landed, and asking before a salary's edit reaches the pay already
 * received. The database is a fake that keeps what is written to it, so a second run sees the first
 * run's rows the way the real one would.
 */

type Failure = { code?: string; message?: string } | null;
type Row = Record<string, unknown>;
type Call = { table: string; op: string; args: unknown[] };

const mockRows: Record<string, Row[]> = {};
const mockReadErrors: Record<string, Failure> = {};
const mockCalls: Call[] = [];
let mockCountError: Failure = null;
let mockUpsertError: Failure = null;
let mockUpdateError: Failure = null;
let mockUpdateGate: Promise<void> | null = null;
let mockSerial = 0;

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    let mode: 'read' | 'count' | 'update' = 'read';
    let ordered: { column: string; ascending: boolean } | null = null;
    const filters: [string, unknown][] = [];

    const matching = () =>
      (mockRows[table] ?? []).filter((row) =>
        filters.every(([column, value]) => row[column] === value),
      );

    const builder: Record<string, unknown> = {
      select: (columns: string, options?: { count?: string; head?: boolean }) => {
        mockCalls.push({ table, op: 'select', args: [columns, options] });
        if (options?.head) mode = 'count';
        return builder;
      },
      order: (column: string, options?: { ascending?: boolean }) => {
        mockCalls.push({ table, op: 'order', args: [column, options] });
        ordered = { column, ascending: options?.ascending !== false };
        return builder;
      },
      eq: (column: string, value: unknown) => {
        mockCalls.push({ table, op: 'eq', args: [column, value] });
        filters.push([column, value]);
        return builder;
      },
      in: () => builder,
      maybeSingle: () => builder,
      update: (values: unknown) => {
        mockCalls.push({ table, op: 'update', args: [values] });
        mode = 'update';
        return builder;
      },
      upsert: (rows: Row[], options?: { ignoreDuplicates?: boolean }) => {
        mockCalls.push({ table, op: 'upsert', args: [rows, options] });
        if (mockUpsertError) return Promise.resolve({ error: mockUpsertError });
        const kept = (mockRows[table] ??= []);
        for (const row of rows) {
          const twin = kept.some(
            (have) =>
              row.salary_source_id &&
              have.salary_source_id === row.salary_source_id &&
              have.paid_on === row.paid_on,
          );
          if (!twin) kept.push({ ...row, id: `row-${(mockSerial += 1)}` });
        }
        return Promise.resolve({ error: null });
      },
      // Awaited directly by every read and by update().eq(), so the builder is its own promise.
      then: (resolve: (value: unknown) => unknown) => {
        if (mode === 'count') {
          return resolve({ count: matching().length, error: mockCountError });
        }
        if (mode === 'update') {
          void (mockUpdateGate ?? Promise.resolve()).then(() =>
            resolve({ error: mockUpdateError }),
          );
          return;
        }
        const error = mockReadErrors[table] ?? null;
        if (error) return resolve({ data: null, error });
        const data = [...matching()];
        if (ordered) {
          const { column, ascending } = ordered;
          data.sort((a, b) => {
            const left = String(a[column] ?? '');
            const right = String(b[column] ?? '');
            return ascending ? left.localeCompare(right) : right.localeCompare(left);
          });
        }
        return resolve({ data, error: null });
      },
    };
    return builder;
  };

  return { supabase: { from: (table: string) => build(table) } };
});

const mockAsk = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => mockAsk }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
// queries.ts imports usePro for the payment-source list; the real one needs react-native-purchases.
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-20';

const salary = (over: Row = {}, into: string[] = ['checking']) => ({
  id: 's1',
  name: 'Paycheck',
  amount: 2000,
  frequency: 'monthly',
  last_payday: '2026-08-15',
  salary_source_accounts: into.map((bank_account_id) => ({ bank_account_id })),
  ...over,
});

const accounts = (...ids: string[]) =>
  ids.map((id, index) => ({ id, created_at: `2026-0${index + 1}-01T00:00:00Z` }));

const recorded = (paid_on: string, salary_source_id = 's1') => ({ salary_source_id, paid_on });

/** What went to the database as a write to pay_received, in order. */
const writes = () =>
  mockCalls.filter((call) => call.table === 'pay_received' && call.op === 'upsert');
const written = () => writes().flatMap((call) => call.args[0] as Row[]);
const writtenDays = () => written().map((row) => row.paid_on);

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  for (const table of Object.keys(mockRows)) delete mockRows[table];
  for (const table of Object.keys(mockReadErrors)) delete mockReadErrors[table];
  mockCalls.length = 0;
  mockCountError = null;
  mockUpsertError = null;
  mockUpdateError = null;
  mockUpdateGate = null;
  mockSerial = 0;
  mockAsk.mockReset();
  resetLocaleForTests();
  // gcTime 0 on both, or the mutation cache's timer holds Jest open after the run.
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
});

afterAll(() => resetLocaleForTests());

describe('recordDuePay, what it writes', () => {
  it('writes every payday due and not yet written, oldest first, as it landed', async () => {
    mockRows.salary_sources = [salary()];
    mockRows.bank_accounts = accounts('checking', 'savings');

    const added = await recordDuePay('user-1', TODAY);

    expect(added).toBe(3);
    expect(writes()).toHaveLength(1);
    expect(written()).toEqual(
      ['2026-08-15', '2026-09-15', '2026-10-15'].map((paid_on) => ({
        user_id: 'user-1',
        salary_source_id: 's1',
        label: 'Paycheck',
        amount: 2000,
        paid_on,
        bank_account_id: 'checking',
      })),
    );
  });

  it('writes to pay_received, and tells the database to ignore a payday already there', async () => {
    mockRows.salary_sources = [salary()];
    mockRows.bank_accounts = accounts('checking');

    await recordDuePay('user-1', TODAY);

    expect(writes()[0].args[1]).toEqual({ ignoreDuplicates: true });
  });

  it('starts the day after the last pay on record, so a gap behind it is left alone', async () => {
    mockRows.salary_sources = [salary()];
    mockRows.bank_accounts = accounts('checking');
    mockRows.pay_received = [recorded('2026-09-15')];

    const added = await recordDuePay('user-1', TODAY);

    expect(added).toBe(1);
    expect(writtenDays()).toEqual(['2026-10-15']);
  });

  it('walks a weekly pay from the day after the last one on record', async () => {
    mockRows.salary_sources = [salary({ frequency: 'weekly', last_payday: '2026-09-30' })];
    mockRows.bank_accounts = accounts('checking');
    mockRows.pay_received = [recorded('2026-09-30')];

    await recordDuePay('user-1', TODAY);

    expect(writtenDays()).toEqual(['2026-10-07', '2026-10-14']);
  });

  it('starts at the last payday when that is later than anything on record', async () => {
    mockRows.salary_sources = [salary({ last_payday: '2026-10-10' })];
    mockRows.bank_accounts = accounts('checking');
    mockRows.pay_received = [recorded('2026-08-15')];

    await recordDuePay('user-1', TODAY);

    expect(writtenDays()).toEqual(['2026-10-10']);
  });

  it('never goes back past the seven years the app keeps', async () => {
    mockRows.salary_sources = [salary({ last_payday: '2019-01-15' })];
    mockRows.bank_accounts = accounts('checking');

    const added = await recordDuePay('user-1', TODAY);

    // The floor is 20 October 2019, so the 15th of that month is out and November 2019 is first.
    expect(added).toBe(84);
    expect(writtenDays()[0]).toBe('2019-11-15');
    expect(writtenDays()[83]).toBe('2026-10-15');
  });

  it('writes a pay just this time once, on its day, and never again', async () => {
    mockRows.salary_sources = [
      salary({ frequency: 'once', last_payday: '2026-10-10', amount: 250 }),
    ];
    mockRows.bank_accounts = accounts('checking');

    expect(await recordDuePay('user-1', TODAY)).toBe(1);
    expect(written()[0]).toMatchObject({ paid_on: '2026-10-10', amount: 250 });

    mockCalls.length = 0;
    expect(await recordDuePay('user-1', '2026-12-31')).toBe(0);
    expect(writes()).toEqual([]);
  });

  it('keeps a salary’s name, and an empty one when it has none', async () => {
    mockRows.salary_sources = [
      salary({ last_payday: '2026-10-15', name: 'Acme payroll' }),
      salary({ id: 's2', last_payday: '2026-10-15', name: null }),
    ];
    mockRows.bank_accounts = accounts('checking');

    await recordDuePay('user-1', TODAY);

    expect(written().map((row) => [row.salary_source_id, row.label])).toEqual([
      ['s1', 'Acme payroll'],
      ['s2', ''],
    ]);
  });

  it('writes the amount as a number to the cent, whatever the database sent it as', async () => {
    mockRows.salary_sources = [salary({ amount: '2314.82', last_payday: '2026-10-15' })];
    mockRows.bank_accounts = accounts('checking');

    await recordDuePay('user-1', TODAY);

    expect(written()[0].amount).toBe(2314.82);
  });

  it('follows each salary’s own record, not another’s', async () => {
    mockRows.salary_sources = [
      salary({ id: 'a', last_payday: '2026-09-15' }),
      salary({ id: 'b', last_payday: '2026-09-20', amount: 300 }),
    ];
    mockRows.bank_accounts = accounts('checking');
    mockRows.pay_received = [recorded('2026-10-15', 'a')];

    await recordDuePay('user-1', TODAY);

    // A is written up to the 15th; B has nothing, so both its paydays are.
    expect(written().map((row) => [row.salary_source_id, row.paid_on])).toEqual([
      ['b', '2026-09-20'],
      ['b', '2026-10-20'],
    ]);
  });
});

describe('recordDuePay, the account a pay lands in', () => {
  // Savings was added after checking, though it is listed first by the database's default order.
  beforeEach(() => {
    mockRows.bank_accounts = [
      { id: 'savings', created_at: '2026-02-01T00:00:00Z' },
      { id: 'checking', created_at: '2026-01-01T00:00:00Z' },
    ];
  });

  it.each([
    ['linked to both, savings first', ['savings', 'checking'], 'checking'],
    ['linked to both, checking first', ['checking', 'savings'], 'checking'],
    ['linked to savings only', ['savings'], 'savings'],
    ['linked to a removed account and savings', ['removed', 'savings'], 'savings'],
    ['linked to a removed account only', ['removed'], null],
    ['linked to none', [], null],
  ])('lands %s in %s', async (_how, into, lands) => {
    mockRows.salary_sources = [salary({ last_payday: '2026-10-15' }, into)];

    await recordDuePay('user-1', TODAY);

    expect(written()).toHaveLength(1);
    expect(written()[0].bank_account_id).toBe(lands);
  });

  it('asks for the accounts oldest first, which is the order that picks the landing one', async () => {
    mockRows.salary_sources = [salary({ last_payday: '2026-10-15' })];

    await recordDuePay('user-1', TODAY);

    const order = mockCalls.find((call) => call.table === 'bank_accounts' && call.op === 'order');
    expect(order?.args).toEqual(['created_at', { ascending: true }]);
  });
});

describe('recordDuePay, when there is nothing to write', () => {
  beforeEach(() => {
    mockRows.bank_accounts = accounts('checking');
  });

  it.each([
    ['nothing', 0],
    ['less than nothing', -5],
    ['nothing, as text', '0.00'],
    ['no amount', null],
  ])('writes nothing for a salary of %s', async (_what, amount) => {
    mockRows.salary_sources = [salary({ amount })];

    expect(await recordDuePay('user-1', TODAY)).toBe(0);
    expect(writes()).toEqual([]);
  });

  it('writes nothing for a salary that has never paid', async () => {
    mockRows.salary_sources = [salary({ last_payday: null })];

    expect(await recordDuePay('user-1', TODAY)).toBe(0);
    expect(writes()).toEqual([]);
  });

  it.each([
    ['whose first payday is still to come', { last_payday: '2026-10-25' }, []],
    [
      'whose next payday is tomorrow',
      { frequency: 'weekly', last_payday: '2026-10-14' },
      ['2026-10-14'],
    ],
  ])('writes nothing after today for a salary %s', async (_what, over, upTo) => {
    mockRows.salary_sources = [salary(over)];
    mockRows.pay_received = upTo.map((day) => recorded(day));

    expect(await recordDuePay('user-1', TODAY)).toBe(0);
    expect(writes()).toEqual([]);
  });

  it('writes nothing, and says so, when everything due is already on record', async () => {
    mockRows.salary_sources = [salary()];
    mockRows.pay_received = [recorded('2026-10-15')];

    expect(await recordDuePay('user-1', TODAY)).toBe(0);
    expect(writes()).toEqual([]);
  });

  it('writes nothing when the person has no salary', async () => {
    expect(await recordDuePay('user-1', TODAY)).toBe(0);
    expect(writes()).toEqual([]);
  });
});

describe('recordDuePay, when something goes wrong', () => {
  beforeEach(() => {
    mockRows.salary_sources = [salary()];
    mockRows.bank_accounts = accounts('checking');
  });

  it.each([
    ['the salaries', 'salary_sources', { message: 'unreachable' }],
    ['the accounts', 'bank_accounts', { message: 'unreachable' }],
    ['the record of pay', 'pay_received', { message: 'unreachable' }],
    ['the record of pay, on a database without the table', 'pay_received', { code: '42P01' }],
  ])('returns 0 and writes nothing when %s cannot be read', async (_what, table, error) => {
    mockReadErrors[table] = error;

    await expect(recordDuePay('user-1', TODAY)).resolves.toBe(0);
    expect(writes()).toEqual([]);
  });

  it('does not write a payday as new when the record of pay could not be read', async () => {
    // Reading it as empty would write all three paydays again over the ones already there.
    mockRows.pay_received = [
      recorded('2026-08-15'),
      recorded('2026-09-15'),
      recorded('2026-10-15'),
    ];
    mockReadErrors.pay_received = { message: 'unreachable' };

    await recordDuePay('user-1', TODAY);

    expect(writes()).toEqual([]);
  });

  it('returns 0, and does not throw, when a second run wrote the same paydays first', async () => {
    mockUpsertError = { code: '23505', message: 'duplicate key value violates unique constraint' };

    await expect(recordDuePay('user-1', TODAY)).resolves.toBe(0);
    expect(writes()).toHaveLength(1);
  });

  it('returns 0 for any other failed write too, since nothing was recorded', async () => {
    mockUpsertError = { code: '42501', message: 'permission denied' };

    await expect(recordDuePay('user-1', TODAY)).resolves.toBe(0);
  });
});

describe('recordDuePay, run again', () => {
  beforeEach(() => {
    mockRows.salary_sources = [salary()];
    mockRows.bank_accounts = accounts('checking');
  });

  it('writes nothing the second time, because the first run’s rows are on record', async () => {
    expect(await recordDuePay('user-1', TODAY)).toBe(3);
    mockCalls.length = 0;

    expect(await recordDuePay('user-1', TODAY)).toBe(0);
    expect(writes()).toEqual([]);
    expect(mockRows.pay_received).toHaveLength(3);
  });

  it('after a raise, writes only the paydays after the last one, at the new amount', async () => {
    await recordDuePay('user-1', TODAY);
    mockCalls.length = 0;

    (mockRows.salary_sources[0] as Row).amount = 2500;
    expect(await recordDuePay('user-1', '2026-11-20')).toBe(1);

    expect(written()).toEqual([
      {
        user_id: 'user-1',
        salary_source_id: 's1',
        label: 'Paycheck',
        amount: 2500,
        paid_on: '2026-11-15',
        bank_account_id: 'checking',
      },
    ]);
    // What was already written keeps the amount it landed with.
    expect(mockRows.pay_received.map((row) => [row.paid_on, row.amount])).toEqual([
      ['2026-08-15', 2000],
      ['2026-09-15', 2000],
      ['2026-10-15', 2000],
      ['2026-11-15', 2500],
    ]);
  });

  it('after the salary moves to another account, lands later pay there and leaves the old where it was', async () => {
    mockRows.bank_accounts = accounts('checking', 'savings');
    await recordDuePay('user-1', TODAY);
    mockCalls.length = 0;

    (mockRows.salary_sources[0] as Row).salary_source_accounts = [{ bank_account_id: 'savings' }];
    await recordDuePay('user-1', '2026-11-20');

    expect(mockRows.pay_received.map((row) => [row.paid_on, row.bank_account_id])).toEqual([
      ['2026-08-15', 'checking'],
      ['2026-09-15', 'checking'],
      ['2026-10-15', 'checking'],
      ['2026-11-15', 'savings'],
    ]);
  });
});

describe('what is written is what the screens already showed', () => {
  // A fresh client per reading, so none is served what an earlier one cached.
  async function currentBalance(today: string) {
    const reader = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const view = await renderHook(() => useCurrentBalance(today), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={reader}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));
    const { balance, income, expenses } = view.result.current;
    return { balance, income, expenses };
  }

  beforeEach(() => {
    mockRows.bank_accounts = [
      {
        id: 'checking',
        bank_name: 'Chase',
        nickname: 'Checking',
        account_type: 'checking',
        last4: '0042',
        color: '#222222',
        balance: 500,
        balance_as_of: '2026-09-01',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    mockRows.salary_sources = [salary()];
  });

  it('gives the same balance before and after the paydays are written down', async () => {
    const before = await currentBalance(TODAY);
    // 500 + the 15th of September and of October; the 15th of August is inside the typed balance.
    expect(before).toEqual({ balance: 4500, income: 4000, expenses: 0 });

    await recordDuePay('user-1', TODAY);
    expect(mockRows.pay_received).toHaveLength(3);

    expect(await currentBalance(TODAY)).toEqual(before);
  });

  it('keeps the written pay at its amount when the salary goes up, and prices only what is next', async () => {
    await recordDuePay('user-1', TODAY);
    (mockRows.salary_sources[0] as Row).amount = 2500;

    expect(await currentBalance(TODAY)).toEqual({ balance: 4500, income: 4000, expenses: 0 });

    await recordDuePay('user-1', '2026-11-20');

    // The 15th of November at the new amount.
    expect(await currentBalance('2026-11-20')).toEqual({
      balance: 7000,
      income: 6500,
      expenses: 0,
    });
  });
});

describe('usePastPay, choose, when there is nothing to ask', () => {
  it('goes on without a question for a salary that has never paid', async () => {
    mockRows.pay_received = [recorded('2026-09-15', 'other')];
    const { result } = await renderHook(() => usePastPay(), { wrapper });

    await expect(result.current.choose('s1', 'Paycheck')).resolves.toBe('upcoming');
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('goes on without a question on a database without the table', async () => {
    mockCountError = { code: '42P01' };
    const { result } = await renderHook(() => usePastPay(), { wrapper });

    await expect(result.current.choose('s1', 'Paycheck')).resolves.toBe('upcoming');
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('counts only the pay of the salary being saved', async () => {
    mockRows.pay_received = [recorded('2026-09-15', 'other'), recorded('2026-10-15', 'other')];
    const { result } = await renderHook(() => usePastPay(), { wrapper });

    await result.current.choose('s1', 'Paycheck');

    const eq = mockCalls.find((call) => call.table === 'pay_received' && call.op === 'eq');
    expect(eq?.args).toEqual(['salary_source_id', 's1']);
    const select = mockCalls.find((call) => call.table === 'pay_received' && call.op === 'select');
    expect(select?.args).toEqual(['id', { count: 'exact', head: true }]);
  });
});

describe('usePastPay, choose, when the salary has paid', () => {
  beforeEach(() => {
    mockRows.pay_received = [
      recorded('2026-08-15'),
      recorded('2026-09-15'),
      recorded('2026-10-15'),
      recorded('2026-10-15', 'other'),
    ];
  });

  it('asks, counting only its own pay, and returns the answer', async () => {
    mockAsk.mockResolvedValue('all');
    const { result } = await renderHook(() => usePastPay(), { wrapper });

    await expect(result.current.choose('s1', 'Paycheck')).resolves.toBe('all');

    expect(mockAsk).toHaveBeenCalledTimes(1);
    const request = mockAsk.mock.calls[0][0];
    expect(request.title).toBe('Change past pay too?');
    expect(request.message).toBe(
      'Paycheck has already paid you 3 times. Change those as well, or only the pay still to come?',
    );
    expect(request.actions).toEqual([
      { id: 'all', label: 'Past and upcoming' },
      { id: 'upcoming', label: 'Upcoming only' },
    ]);
    expect(request.cancelLabel).toBe('Cancel');
  });

  it('keeps the past when told upcoming only', async () => {
    mockAsk.mockResolvedValue('upcoming');
    const { result } = await renderHook(() => usePastPay(), { wrapper });

    await expect(result.current.choose('s1', 'Paycheck')).resolves.toBe('upcoming');
  });

  it('returns null when the question is backed out of, so nothing saves', async () => {
    mockAsk.mockResolvedValue(null);
    const { result } = await renderHook(() => usePastPay(), { wrapper });

    await expect(result.current.choose('s1', 'Paycheck')).resolves.toBeNull();
  });

  it('returns null for an answer it did not offer', async () => {
    mockAsk.mockResolvedValue('something-else');
    const { result } = await renderHook(() => usePastPay(), { wrapper });

    await expect(result.current.choose('s1', 'Paycheck')).resolves.toBeNull();
  });

  it('says "once" for a single pay', async () => {
    mockRows.pay_received = [recorded('2026-10-15')];
    mockAsk.mockResolvedValue('upcoming');
    const { result } = await renderHook(() => usePastPay(), { wrapper });

    await result.current.choose('s1', 'Paycheck');

    expect(mockAsk.mock.calls[0][0].message).toBe(
      'Paycheck has already paid you once. Change that pay as well, or only the pay still to come?',
    );
  });

  it('asks that it "may already have paid" when the pay could not be counted', async () => {
    mockCountError = { message: 'unreachable' };
    mockAsk.mockResolvedValue('upcoming');
    const { result } = await renderHook(() => usePastPay(), { wrapper });

    await expect(result.current.choose('s1', 'Paycheck')).resolves.toBe('upcoming');

    // Guessing "none" would reprice months of pay without a word; asking costs one tap.
    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(mockAsk.mock.calls[0][0].message).toBe(
      'Paycheck may already have paid you. Change that pay as well, or only the pay still to come?',
    );
  });
});

describe('usePastPay, the question in Spanish and French', () => {
  beforeEach(() => {
    mockAsk.mockResolvedValue('upcoming');
  });

  async function asked(name: string, days: string[]) {
    mockRows.pay_received = days.map((day) => recorded(day));
    const { result } = await renderHook(() => usePastPay(), { wrapper });
    await result.current.choose('s1', name);
    return mockAsk.mock.calls[mockAsk.mock.calls.length - 1][0];
  }

  it('asks in Spanish', async () => {
    setLanguage('es');

    const many = await asked('Sueldo', ['2026-08-15', '2026-09-15', '2026-10-15']);
    expect(many.title).toBe('¿Cambiar también los pagos anteriores?');
    expect(many.message).toBe(
      'Sueldo ya te pagó 3 veces. ¿Cambiarlos también o solo los próximos?',
    );
    expect(many.actions.map((action: { label: string }) => action.label)).toEqual([
      'Anteriores y próximos',
      'Solo los próximos',
    ]);
    expect(many.cancelLabel).toBe('Cancelar');

    const one = await asked('Sueldo', ['2026-10-15']);
    expect(one.message).toBe(
      'Sueldo ya te pagó una vez. ¿Cambiar también ese pago o solo los próximos?',
    );

    mockCountError = { message: 'unreachable' };
    const unknown = await asked('Sueldo', []);
    expect(unknown.message).toBe(
      'Puede que Sueldo ya te haya pagado. ¿Cambiar también esos pagos o solo los próximos?',
    );
  });

  it('asks in French, with the no-break space before the question mark', async () => {
    setLanguage('fr');

    const many = await asked('Paie', ['2026-08-15', '2026-09-15', '2026-10-15']);
    expect(many.title).toBe('Modifier aussi les paies passées ?');
    expect(many.message).toBe(
      'Paie t’a déjà payé 3 fois. Les modifier aussi, ou seulement celles à venir ?',
    );
    expect(many.actions.map((action: { label: string }) => action.label)).toEqual([
      'Passées et à venir',
      'Seulement celles à venir',
    ]);
    expect(many.cancelLabel).toBe('Annuler');

    const one = await asked('Paie', ['2026-10-15']);
    expect(one.message).toBe(
      'Paie t’a déjà payé une fois. Modifier aussi cette paie, ou seulement celles à venir ?',
    );

    mockCountError = { message: 'unreachable' };
    const unknown = await asked('Paie', []);
    expect(unknown.message).toBe(
      'Paie t’a peut-être déjà payé. Modifier aussi ces paies, ou seulement celles à venir ?',
    );
  });
});

describe('usePastPay, apply', () => {
  const NEW_PAY = { label: 'Day job', amount: 2500, bank_account_id: 'savings' };

  it('rewrites every pay of that salary, and only that salary, in place', async () => {
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => usePastPay(), { wrapper });

    await act(() => result.current.apply('s1', NEW_PAY));

    const update = mockCalls.find((call) => call.table === 'pay_received' && call.op === 'update');
    expect(update?.args).toEqual([NEW_PAY]);
    const eq = mockCalls.filter((call) => call.table === 'pay_received' && call.op === 'eq');
    expect(eq.map((call) => call.args)).toEqual([['salary_source_id', 's1']]);
    expect(mockCalls.filter((call) => call.op === 'upsert')).toEqual([]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pay_received'] });
  });

  it('can take a pay out of its account', async () => {
    const { result } = await renderHook(() => usePastPay(), { wrapper });

    await act(() => result.current.apply('s1', { ...NEW_PAY, bank_account_id: null }));

    const update = mockCalls.find((call) => call.op === 'update');
    expect(update?.args).toEqual([{ label: 'Day job', amount: 2500, bank_account_id: null }]);
  });

  it('fails loudly, and refreshes nothing, when the database refuses', async () => {
    mockUpdateError = { code: '42501', message: 'permission denied' };
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => usePastPay(), { wrapper });

    await expect(act(() => result.current.apply('s1', NEW_PAY))).rejects.toEqual(mockUpdateError);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('says it is saving until the database answers', async () => {
    let release = () => {};
    mockUpdateGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { result } = await renderHook(() => usePastPay(), { wrapper });
    expect(result.current.saving).toBe(false);

    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = result.current.apply('s1', NEW_PAY);
    });
    await waitFor(() => expect(result.current.saving).toBe(true));

    release();
    await act(async () => {
      await pending;
    });
    await waitFor(() => expect(result.current.saving).toBe(false));
  });
});
