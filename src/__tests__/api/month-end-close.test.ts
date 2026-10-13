import { closeFinishedMonths } from '@/api/savings';

/**
 * A month closed into savings counts a bill on its anchor day, as the ledger shows it. Rent due on
 * the 31st, stored on 30 Apr after April clamped it, was stopped ("Keep past") on 30 May: May's
 * rent never came, so May closes without it. Read without the anchor day, the walk would land May's
 * rent on the 30th, inside the plan, and close May a payment short. The fake database is
 * savings-close.test.ts's: it answers reads the way PostgREST does.
 */

type Row = Record<string, unknown>;
type Failure = { code?: string; message?: string; details?: string } | null;

const mockDb: {
  tables: Record<string, Row[]>;
  readErrors: Record<string, Failure>;
  rpcError: Failure;
  pageCap: number;
  /** Columns this database does not have yet: a read naming one is refused (42703). */
  missing: string[];
  reads: string[];
  rpcs: { name: string; args: Row }[];
} = {
  tables: {},
  readErrors: {},
  rpcError: null,
  pageCap: 1000,
  missing: [],
  reads: [],
  rpcs: [],
};

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const filters: ((row: Row) => boolean)[] = [];
    let counted = false;
    let single = false;
    let limit = Infinity;
    let orderBy: string | null = null;
    let asked: string[] = [];
    const builder: Record<string, unknown> = {
      select: (columns: string, options?: { count?: string }) => {
        mockDb.reads.push(table);
        asked = columns.split(',').map((column) => column.trim());
        counted = Boolean(options?.count);
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      gt: (column: string, value: string) => {
        filters.push((row) => String(row[column]) > value);
        return builder;
      },
      gte: (column: string, value: string) => {
        filters.push((row) => String(row[column]) >= value);
        return builder;
      },
      lt: (column: string, value: string) => {
        filters.push((row) => String(row[column]) < value);
        return builder;
      },
      not: (column: string) => {
        filters.push((row) => row[column] !== null && row[column] !== undefined);
        return builder;
      },
      order: (column: string) => {
        orderBy ??= column;
        return builder;
      },
      limit: (count: number) => {
        limit = count;
        return builder;
      },
      maybeSingle: () => {
        single = true;
        return builder;
      },
      then: (resolve: (value: unknown) => unknown) => {
        const failure = mockDb.readErrors[table];
        if (failure) return Promise.resolve(resolve({ data: null, error: failure, count: null }));
        const missing = asked.find((column) => mockDb.missing.includes(column));
        if (missing) {
          const error = { code: '42703', message: `column ${table}.${missing} does not exist` };
          return Promise.resolve(resolve({ data: null, error, count: null }));
        }
        let rows = (mockDb.tables[table] ?? []).filter((row) => filters.every((keep) => keep(row)));
        const count = rows.length;
        if (orderBy) {
          const column = orderBy;
          rows = [...rows].sort((a, b) => String(a[column]).localeCompare(String(b[column])));
        }
        rows = rows.slice(0, Math.min(limit, mockDb.pageCap));
        return Promise.resolve(
          resolve({
            data: single ? (rows[0] ?? null) : rows,
            error: null,
            count: counted ? count : null,
          }),
        );
      },
    };
    return builder;
  };
  return {
    supabase: {
      from: build,
      rpc: async (name: string, args: Row) => {
        mockDb.rpcs.push({ name, args });
        if (mockDb.rpcError) return { data: null, error: mockDb.rpcError };
        (mockDb.tables.savings_pots ??= []).push({
          id: `pot-${mockDb.rpcs.length}`,
          kind: 'month',
          month: args.p_month,
        });
        return { data: `pot-${mockDb.rpcs.length}`, error: null };
      },
    },
  };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2027-06-05';

function seed(userId: string) {
  mockDb.tables = {
    profiles: [{ id: userId, created_at: '2027-05-01T12:00:00+00:00' }],
    savings_pots: [],
    receipts: [],
    charges: [],
    bills: [
      {
        id: 'rent',
        name: 'Rent',
        amount: 1000,
        category_id: 'housing',
        icon_id: null,
        recurrence: 'monthly',
        next_due_on: '2027-04-30',
        starts_on: '2027-04-30',
        ends_on: '2027-05-30',
        created_at: '2027-04-30T12:00:00+00:00',
        anchor_day: 31,
      },
    ],
    subscriptions: [],
    pay_received: [],
    salary_sources: [],
  };
}

beforeEach(() => {
  mockDb.readErrors = {};
  mockDb.rpcError = null;
  mockDb.pageCap = 1000;
  mockDb.missing = [];
  mockDb.reads = [];
  mockDb.rpcs = [];
});

it('closes May without the rent due on the 31st, after the bill stopped on the 30th', async () => {
  seed('user-anchor');
  expect(await closeFinishedMonths('user-anchor', TODAY)).toBe(1);
  expect(mockDb.rpcs).toEqual([
    {
      name: 'close_my_savings_month',
      args: { p_month: '2027-05-01', p_earned: 0, p_spent: 0, p_seen: false },
    },
  ]);
});

it('on a database without the column, closes on the 30th as the walk did before', async () => {
  seed('user-older');
  // No such column to ask for, and none on the row.
  mockDb.missing = ['anchor_day'];
  delete mockDb.tables.bills[0].anchor_day;
  expect(await closeFinishedMonths('user-older', TODAY)).toBe(1);
  expect(mockDb.rpcs.map((call) => call.args.p_spent)).toEqual([1000]);
});
