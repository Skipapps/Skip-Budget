import { closeFinishedMonths } from '@/api/savings';

/**
 * Closing finished months after the sweep: which months, on which figures, seen or not. The figures
 * come from the same ledger and money-book lists Home uses, run on fresh reads. The fake database
 * answers reads the way PostgREST does (filters, id order, a row cap per page, an exact count when
 * asked) and keeps the months closed, so a second run sees the first.
 *
 * The account below was made on 14 Jul 2026 and today is 11 Oct 2026. Its salary pays $3,700 on
 * the 15th, and September's pay was never written down (the ledger works it out from the schedule).
 * Rent is $3,000 on the 1st; Netflix $15.49 on the 20th; a gym bill stopped after August; an old
 * subscription was switched off after charging in September; a phone bill from 25 Sep has never
 * been written down at all (the ledger works it out too).
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

const TODAY = '2026-10-11';

const RENT = { bill_id: 'rent', subscription_id: null, label: 'Rent', amount: 3000 };
const NETFLIX = { bill_id: null, subscription_id: 'netflix', label: 'Netflix', amount: 15.49 };

function seed(userId: string) {
  mockDb.tables = {
    profiles: [{ id: userId, created_at: '2026-07-14T12:00:00+00:00' }],
    savings_pots: [],
    receipts: [
      // Before the account: never counted.
      { id: 'r1', merchant: 'Cafe', amount: 50, purchased_on: '2026-07-10' },
      { id: 'r2', merchant: 'Shop', amount: 290, purchased_on: '2026-07-20' },
      { id: 'r3', merchant: 'Shop', amount: 180.55, purchased_on: '2026-08-03' },
      { id: 'r4', merchant: 'Shop', amount: 60.45, purchased_on: '2026-09-09' },
      // This month: not part of any closing.
      { id: 'r5', merchant: 'Shop', amount: 99, purchased_on: '2026-10-02' },
    ],
    charges: [
      { id: 'c1', ...RENT, charged_on: '2026-07-01' },
      { id: 'c2', ...RENT, charged_on: '2026-08-01' },
      { id: 'c3', ...RENT, charged_on: '2026-09-01' },
      { id: 'c4', ...RENT, charged_on: '2026-10-01' },
      { id: 'c5', ...NETFLIX, charged_on: '2026-08-20' },
      { id: 'c6', ...NETFLIX, charged_on: '2026-09-20' },
      // A bill since stopped, and a subscription since switched off: what they charged went out.
      {
        id: 'c7',
        bill_id: 'gym',
        subscription_id: null,
        label: 'Gym',
        amount: 25,
        charged_on: '2026-08-10',
      },
      {
        id: 'c8',
        bill_id: null,
        subscription_id: 'old',
        label: 'Old',
        amount: 10,
        charged_on: '2026-09-05',
      },
    ],
    bills: [
      {
        id: 'rent',
        name: 'Rent',
        amount: 3000,
        category_id: 'housing',
        icon_id: null,
        recurrence: 'monthly',
        next_due_on: '2026-11-01',
        starts_on: '2026-07-01',
        ends_on: null,
        created_at: '2026-07-14T12:00:00+00:00',
      },
      {
        id: 'gym',
        name: 'Gym',
        amount: 25,
        category_id: 'other',
        icon_id: null,
        recurrence: 'monthly',
        next_due_on: null,
        starts_on: '2026-08-10',
        ends_on: '2026-08-31',
        created_at: '2026-08-10T12:00:00+00:00',
      },
      {
        id: 'phone',
        name: 'Phone',
        amount: 50,
        category_id: 'mobile',
        icon_id: null,
        recurrence: 'monthly',
        next_due_on: '2026-10-25',
        starts_on: '2026-09-25',
        ends_on: null,
        created_at: '2026-09-25T12:00:00+00:00',
      },
    ],
    subscriptions: [
      {
        id: 'netflix',
        name: 'Netflix',
        amount: 15.49,
        cycle: 'monthly',
        next_renewal_on: '2026-10-20',
        started_on: '2026-08-20',
        created_at: '2026-08-20T12:00:00+00:00',
        active: true,
      },
      {
        id: 'old',
        name: 'Old',
        amount: 10,
        cycle: 'monthly',
        next_renewal_on: '2026-10-05',
        started_on: '2026-09-05',
        created_at: '2026-09-05T12:00:00+00:00',
        active: false,
      },
    ],
    pay_received: [
      // The recorder back-fills from the typed last payday, before the account.
      { id: 'p0', salary_source_id: 'job', label: 'Job', amount: 3700, paid_on: '2026-06-15' },
      { id: 'p1', salary_source_id: 'job', label: 'Job', amount: 3700, paid_on: '2026-07-15' },
      { id: 'p2', salary_source_id: 'job', label: 'Job', amount: 3700, paid_on: '2026-08-15' },
    ],
    salary_sources: [
      { id: 'job', name: 'Job', amount: 3700, frequency: 'monthly', last_payday: '2026-06-15' },
    ],
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

describe('closeFinishedMonths', () => {
  it('fills in every finished month since the account, oldest first, leaving only last month unseen', async () => {
    seed('user-fill');

    expect(await closeFinishedMonths('user-fill', TODAY)).toBe(3);

    expect(mockDb.rpcs).toEqual([
      // From 14 Jul: July's 1st rent and the 10 Jul receipt predate the account.
      {
        name: 'close_my_savings_month',
        args: { p_month: '2026-07-01', p_earned: 3700, p_spent: 290, p_seen: true },
      },
      // Rent, a receipt, Netflix and the gym's last charge.
      {
        name: 'close_my_savings_month',
        args: { p_month: '2026-08-01', p_earned: 3700, p_spent: 3221.04, p_seen: true },
      },
      // Pay worked out from the schedule; rent, a receipt, Netflix, the switched-off
      // subscription's last charge and the phone bill nobody has written down yet.
      {
        name: 'close_my_savings_month',
        args: { p_month: '2026-09-01', p_earned: 3700, p_spent: 3135.94, p_seen: false },
      },
    ]);
  });

  it('waits while a bill on the record has a date in the months still to write down', async () => {
    seed('user-gap');
    mockDb.tables.charges = mockDb.tables.charges.filter((row) => row.id !== 'c3');

    expect(await closeFinishedMonths('user-gap', TODAY)).toBe(0);
    expect(mockDb.rpcs).toEqual([]);

    // The next sweep writes September's rent down; the close goes ahead on it.
    mockDb.tables.charges.push({ id: 'c3', ...RENT, charged_on: '2026-09-01' });
    expect(await closeFinishedMonths('user-gap', TODAY)).toBe(3);
    expect(mockDb.rpcs.map((call) => call.args.p_spent)).toEqual([290, 3221.04, 3135.94]);
  });

  it('closes only what is missing; a removed month counts as closed', async () => {
    seed('user-some');
    mockDb.tables.savings_pots = [
      { id: 'jul', kind: 'month', month: '2026-07-01', removed_at: '2026-10-02T00:00:00Z' },
      { id: 'aug', kind: 'month', month: '2026-08-01' },
      { id: 'gift', kind: 'added', month: null },
    ];

    expect(await closeFinishedMonths('user-some', TODAY)).toBe(1);
    expect(mockDb.rpcs.map((call) => [call.args.p_month, call.args.p_seen])).toEqual([
      ['2026-09-01', false],
    ]);
  });

  it('reads every page when history passes the row cap', async () => {
    seed('user-pages');
    mockDb.pageCap = 2;

    await closeFinishedMonths('user-pages', TODAY);

    expect(mockDb.rpcs.map((call) => call.args.p_spent)).toEqual([290, 3221.04, 3135.94]);
    expect(mockDb.reads.filter((table) => table === 'receipts').length).toBeGreaterThan(1);
    expect(mockDb.reads.filter((table) => table === 'charges').length).toBeGreaterThan(1);
  });

  it('a month without money in or out closes at nothing', async () => {
    seed('user-quiet');
    for (const table of [
      'receipts',
      'charges',
      'bills',
      'subscriptions',
      'pay_received',
      'salary_sources',
    ]) {
      mockDb.tables[table] = [];
    }

    await closeFinishedMonths('user-quiet', TODAY);
    expect(mockDb.rpcs.map((call) => [call.args.p_earned, call.args.p_spent])).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
  });

  it('closes nothing for an account made this month', async () => {
    seed('user-new');
    mockDb.tables.profiles = [{ id: 'user-new', created_at: '2026-10-05T12:00:00+00:00' }];

    expect(await closeFinishedMonths('user-new', TODAY)).toBe(0);
    expect(mockDb.rpcs).toEqual([]);
    expect(mockDb.reads).toEqual(['savings_pots', 'profiles']);
  });

  it('writes nothing when any read behind the figures fails, and tries again next time', async () => {
    seed('user-flaky');
    mockDb.readErrors.charges = { code: '08006', message: 'connection failure' };

    expect(await closeFinishedMonths('user-flaky', TODAY)).toBe(0);
    expect(mockDb.rpcs).toEqual([]);

    mockDb.readErrors = {};
    expect(await closeFinishedMonths('user-flaky', TODAY)).toBe(3);
  });

  it('a database without savings yet closes nothing and is not asked again this month', async () => {
    seed('user-old-db');
    mockDb.readErrors.savings_pots = {
      code: '42703',
      message: 'column savings_pots.kind does not exist',
    };

    expect(await closeFinishedMonths('user-old-db', TODAY)).toBe(0);
    expect(await closeFinishedMonths('user-old-db', TODAY)).toBe(0);
    expect(mockDb.reads).toEqual(['savings_pots']);
    expect(mockDb.rpcs).toEqual([]);
  });

  it('stops at the first close when the function is not on the database yet', async () => {
    seed('user-no-fn');
    mockDb.rpcError = { code: 'PGRST202', message: 'Could not find the function' };

    expect(await closeFinishedMonths('user-no-fn', TODAY)).toBe(0);
    expect(mockDb.rpcs).toHaveLength(1);
  });

  it('a close that fails is tried again on the next sweep; once all are in, it stops reading', async () => {
    seed('user-retry');
    mockDb.rpcError = { code: '08006', message: 'connection failure' };
    expect(await closeFinishedMonths('user-retry', TODAY)).toBe(0);
    expect(mockDb.rpcs).toHaveLength(3);

    mockDb.rpcError = null;
    expect(await closeFinishedMonths('user-retry', TODAY)).toBe(3);

    mockDb.reads = [];
    expect(await closeFinishedMonths('user-retry', TODAY)).toBe(0);
    expect(mockDb.reads).toEqual([]);

    // A new month starts the check again: October, with its own Netflix written down.
    mockDb.tables.charges.push({ id: 'c9', ...NETFLIX, charged_on: '2026-10-20' });
    expect(await closeFinishedMonths('user-retry', '2026-11-02')).toBe(1);
    expect(mockDb.rpcs[mockDb.rpcs.length - 1].args).toEqual({
      p_month: '2026-10-01',
      p_earned: 3700,
      p_spent: 3164.49,
      p_seen: false,
    });
  });

  it('closes on what a loan kept out of spending recorded, and never waits on it', async () => {
    seed('user-loan-off');
    // Counted in August, then "Add to monthly bills" switched off: September is never written.
    mockDb.tables.bills.push({
      id: 'car',
      name: 'Car loan',
      amount: 400,
      category_id: 'loans',
      icon_id: 'loan-car',
      recurrence: 'monthly',
      next_due_on: '2026-10-20',
      starts_on: '2026-08-20',
      ends_on: '2028-07-20',
      created_at: '2026-08-20T12:00:00+00:00',
      in_spending: false,
    });
    mockDb.tables.charges.push({
      id: 'c-car',
      bill_id: 'car',
      subscription_id: null,
      label: 'Car loan',
      amount: 400,
      charged_on: '2026-08-20',
    });

    expect(await closeFinishedMonths('user-loan-off', TODAY)).toBe(3);
    // August keeps its $400; September has no payment it never recorded.
    expect(mockDb.rpcs.map((call) => call.args.p_spent)).toEqual([290, 3621.04, 3135.94]);
  });

  it('closes on the same figures on a database without the flag', async () => {
    seed('user-no-flag');
    mockDb.missing = ['in_spending'];

    expect(await closeFinishedMonths('user-no-flag', TODAY)).toBe(3);
    expect(mockDb.rpcs.map((call) => call.args.p_spent)).toEqual([290, 3221.04, 3135.94]);
    expect(mockDb.reads.filter((table) => table === 'bills')).toHaveLength(2);
  });

  describe('with money paid off a loan', () => {
    /** A car loan counted since August, on the 20th, both instalments written down. */
    function withCarLoan(userId: string, bill: Row = {}) {
      seed(userId);
      mockDb.tables.bills.push({
        id: 'car',
        name: 'Car loan',
        amount: 400,
        category_id: 'loans',
        icon_id: 'loan-car',
        recurrence: 'monthly',
        next_due_on: '2026-10-20',
        starts_on: '2026-08-20',
        ends_on: '2028-07-20',
        created_at: '2026-08-20T12:00:00+00:00',
        in_spending: true,
        ...bill,
      });
      for (const on of ['2026-08-20', '2026-09-20']) {
        mockDb.tables.charges.push({
          id: `car-${on}`,
          bill_id: 'car',
          subscription_id: null,
          label: 'Car loan',
          amount: 400,
          charged_on: on,
        });
      }
    }

    const payoff = (id: string, paid_on: string, amount: string, over: Row = {}): Row => ({
      id,
      bill_id: 'car',
      paid_on,
      amount,
      kind: 'partial',
      card_id: null,
      bank_account_id: 'checking',
      counted: true,
      ...over,
    });

    it('counts each in the month it was paid, and none made while the loan was kept out', async () => {
      withCarLoan('user-payoffs');
      mockDb.tables.loan_payoffs = [
        payoff('po-sep', '2026-09-05', '1000.00'),
        payoff('po-aug-off', '2026-08-07', '200.00', { counted: false }),
        // This month: not part of any closing.
        payoff('po-oct', '2026-10-03', '500.00'),
      ];

      expect(await closeFinishedMonths('user-payoffs', TODAY)).toBe(3);
      // August: $400 more for the instalment; September: $400 and the $1,000 payoff.
      expect(mockDb.rpcs.map((call) => call.args.p_spent)).toEqual([290, 3621.04, 4535.94]);
    });

    it('a full payoff stops the instalments after it and counts once itself', async () => {
      withCarLoan('user-paid-off', { ends_on: '2026-09-05' });
      mockDb.tables.charges = mockDb.tables.charges.filter((row) => row.id !== 'car-2026-09-20');
      mockDb.tables.loan_payoffs = [
        payoff('po-full', '2026-09-05', '9000.00', { kind: 'full', bank_account_id: null }),
      ];

      expect(await closeFinishedMonths('user-paid-off', TODAY)).toBe(3);
      expect(mockDb.rpcs.map((call) => call.args.p_spent)).toEqual([290, 3621.04, 12135.94]);
    });

    it.each([
      [
        'PostgREST',
        { code: 'PGRST205', message: "Could not find the table 'public.loan_payoffs'" },
      ],
      ['Postgres', { code: '42P01', message: 'relation "loan_payoffs" does not exist' }],
    ])('closes on the figures without them on a database that has none (%s)', async (_, error) => {
      seed(`user-no-payoffs-${error.code}`);
      mockDb.readErrors.loan_payoffs = error;

      expect(await closeFinishedMonths(`user-no-payoffs-${error.code}`, TODAY)).toBe(3);
      expect(mockDb.rpcs.map((call) => call.args.p_spent)).toEqual([290, 3221.04, 3135.94]);
    });

    it('writes nothing when they cannot be read another way', async () => {
      withCarLoan('user-payoffs-flaky');
      mockDb.readErrors.loan_payoffs = { code: '08006', message: 'connection failure' };

      expect(await closeFinishedMonths('user-payoffs-flaky', TODAY)).toBe(0);
      expect(mockDb.rpcs).toEqual([]);
    });
  });

  it('never throws', async () => {
    seed('user-throws');
    mockDb.readErrors.profiles = { code: '08006', message: 'connection failure' };
    await expect(closeFinishedMonths('user-throws', TODAY)).resolves.toBe(0);
    expect(mockDb.rpcs).toEqual([]);
  });
});
