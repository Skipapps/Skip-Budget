import { recordDueCharges } from '@/api/charges';

/**
 * The app's recorder and a bill kept out of spending: it writes nothing new for it, as the server's
 * record_due_charges does. On a database without the column it still records every bill; a failed
 * read there would otherwise stop every charge being written.
 */

type Row = Record<string, unknown>;
type Failure = { code: string; message: string } | null;

const mockDb: {
  bills: Row[];
  hasFlag: boolean;
  billsFailure: Failure;
  billSelects: string[];
  written: Row[];
} = { bills: [], hasFlag: true, billsFailure: null, billSelects: [], written: [] };

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      let columns = '';
      const builder: Record<string, unknown> = {
        select: (asked: string) => {
          columns = asked;
          if (table === 'bills') mockDb.billSelects.push(asked);
          return builder;
        },
        eq: () => builder,
        upsert: async (rows: Row[]) => {
          mockDb.written.push(...rows);
          return { error: null };
        },
        then: (resolve: (value: unknown) => unknown) => {
          if (table !== 'bills') return resolve({ data: [], error: null });
          if (mockDb.billsFailure) return resolve({ data: null, error: mockDb.billsFailure });
          if (!mockDb.hasFlag && /\bin_spending\b/.test(columns)) {
            return resolve({
              data: null,
              error: { code: '42703', message: 'column bills.in_spending does not exist' },
            });
          }
          const rows = mockDb.bills.map(({ in_spending: flag, ...rest }) =>
            /\bin_spending\b/.test(columns) ? { ...rest, in_spending: flag ?? true } : rest,
          );
          return resolve({ data: rows, error: null });
        },
      };
      return builder;
    },
  },
}));

const TODAY = '2026-10-12';

function bill(id: string, inSpending?: boolean): Row {
  return {
    id,
    name: id,
    amount: 100,
    recurrence: 'monthly',
    next_due_on: '2026-10-01',
    starts_on: '2026-10-01',
    ends_on: null,
    created_at: '2026-10-01T12:00:00Z',
    card_id: 'card-1',
    bank_account_id: null,
    ...(inSpending === undefined ? {} : { in_spending: inSpending }),
  };
}

beforeEach(() => {
  mockDb.bills = [bill('rent', true), bill('loan-kept-out', false), bill('phone')];
  mockDb.hasFlag = true;
  mockDb.billsFailure = null;
  mockDb.billSelects = [];
  mockDb.written = [];
});

const writtenFor = () => mockDb.written.map((row) => `${row.bill_id} ${row.charged_on}`).sort();

describe('recordDueCharges and a bill kept out of spending', () => {
  it('records the bills that count, and nothing for one kept out', async () => {
    expect(await recordDueCharges('user-1', TODAY)).toBe(2);
    expect(writtenFor()).toEqual(['phone 2026-10-01', 'rent 2026-10-01']);
    expect(mockDb.billSelects).toHaveLength(1);
    expect(mockDb.billSelects[0]).toMatch(/, in_spending$/);
  });

  it('records every bill on a database without the column, rather than none', async () => {
    mockDb.hasFlag = false;
    expect(await recordDueCharges('user-1', TODAY)).toBe(3);
    expect(writtenFor()).toEqual([
      'loan-kept-out 2026-10-01',
      'phone 2026-10-01',
      'rent 2026-10-01',
    ]);
    expect(mockDb.billSelects).toEqual([
      mockDb.billSelects[0],
      mockDb.billSelects[0].replace(', in_spending', ''),
    ]);
  });

  it('records nothing when the bills cannot be read for any other reason', async () => {
    mockDb.billsFailure = { code: '08006', message: 'connection failure' };
    expect(await recordDueCharges('user-1', TODAY)).toBe(0);
    expect(mockDb.written).toEqual([]);
    expect(mockDb.billSelects).toHaveLength(1);
  });
});
