import { recordDuePay } from '@/api/pay';
import { ledgerEntries, type BillRow, type LedgerInput, type SubscriptionRow } from '@/api/queries';
import { unwrittenDatesIn } from '@/api/savings';

/**
 * Month ends across the switch from the walk that shortened every month after February to one that
 * keeps the day. Pay already written on a shortened day (the 28th) stands for its month, so neither
 * the phone's writer nor the ledger adds the month's right day as a second pay. A bill whose stored
 * date was shortened (30 Apr) projects on its anchor day again (31 May).
 */

type Row = Record<string, unknown>;

const mockDb: { rows: Record<string, Row[]>; written: Row[] } = { rows: {}, written: [] };

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        order: () => builder,
        upsert: async (rows: Row[]) => {
          mockDb.written.push(...rows);
          return { error: null };
        },
        then: (resolve: (value: unknown) => unknown) =>
          resolve({ data: mockDb.rows[table] ?? [], error: null }),
      };
      return builder;
    },
  },
}));

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

/** Paid on 31 Jan, then written on the 28th every month by the walk that shortened it. */
const DRIFTED = ['02', '03', '04', '05', '06', '07', '08', '09'].map((month) => `2026-${month}-28`);

beforeEach(() => {
  mockDb.rows = {
    salary_sources: [
      {
        id: 'salary',
        name: 'Salary',
        amount: 2500,
        frequency: 'monthly',
        last_payday: '2026-01-31',
        salary_source_accounts: [{ bank_account_id: 'checking' }],
      },
    ],
    bank_accounts: [{ id: 'checking' }],
    pay_received: DRIFTED.map((day) => ({ salary_source_id: 'salary', paid_on: day })),
  };
  mockDb.written = [];
});

describe('recordDuePay after a drifted September', () => {
  it('writes nothing in October before the 31st: 28 Sep already paid September', async () => {
    await expect(recordDuePay('user-1', '2026-10-13')).resolves.toBe(0);
    expect(mockDb.written).toEqual([]);
  });

  it('writes October on the 31st, its right day, and nothing for September', async () => {
    await expect(recordDuePay('user-1', '2026-10-31')).resolves.toBe(1);
    expect(mockDb.written.map((row) => row.paid_on)).toEqual(['2026-10-31']);
  });
});

const base: Omit<LedgerInput, 'from' | 'to' | 'today'> = {
  receipts: [],
  subscriptions: [],
  bills: [],
  salaries: [
    {
      id: 'salary',
      name: 'Salary',
      amount: 2500,
      frequency: 'monthly',
      last_payday: '2026-01-31',
      account_ids: ['checking'],
    },
  ],
  charges: [],
  pay: DRIFTED.map((day, index) => ({
    id: `pay-${index}`,
    salary_source_id: 'salary',
    label: 'Salary',
    amount: 2500,
    paid_on: day,
    bank_account_id: 'checking',
  })),
  accountOrder: ['checking'],
};

describe('ledgerEntries after a drifted September', () => {
  it('shows September once, as it was recorded, then each month on its right day', () => {
    const income = ledgerEntries({
      ...base,
      from: '2026-09-01',
      to: '2026-12-31',
      today: '2026-10-13',
    })
      .filter((entry) => entry.kind === 'income')
      .map((entry) => `${entry.date} ${entry.amount}`)
      .sort();
    expect(income).toEqual([
      '2026-09-28 2500',
      '2026-10-31 2500',
      '2026-11-30 2500',
      '2026-12-31 2500',
    ]);
  });

  it('adds up to the cent: four months, four pays', () => {
    const total = ledgerEntries({
      ...base,
      from: '2026-09-01',
      to: '2026-12-31',
      today: '2026-10-13',
    })
      .filter((entry) => entry.kind === 'income')
      .reduce((sum, entry) => sum + Math.round(entry.amount * 100), 0);
    expect(total).toBe(1_000_000);
  });
});

describe('ledgerEntries for a bill stored on a shortened day', () => {
  const rent: BillRow = {
    id: 'rent',
    name: 'Rent',
    amount: 1234.56,
    category_id: 'housing',
    icon_id: null,
    recurrence: 'monthly',
    next_due_on: '2027-04-30',
    starts_on: '2027-01-31',
    ends_on: null,
    card_id: null,
    bank_account_id: 'checking',
    created_at: '2027-01-01T00:00:00Z',
    anchor_day: 31,
  };

  const projected = (bill: BillRow) =>
    ledgerEntries({
      ...base,
      salaries: [],
      pay: [],
      bills: [bill],
      from: '2027-05-01',
      to: '2027-07-31',
      today: '2027-04-15',
    })
      .map((entry) => `${entry.date} ${entry.amount}`)
      .sort();

  it('projects 31 May from a stored 30 Apr with anchor 31, then 30 Jun and 31 Jul', () => {
    expect(projected(rent)).toEqual([
      '2027-05-31 -1234.56',
      '2027-06-30 -1234.56',
      '2027-07-31 -1234.56',
    ]);
  });

  it('with no anchor day (a database without the column), walks from the stored day as before', () => {
    const { anchor_day: _day, ...older } = rent;
    expect(projected(older)).toEqual([
      '2027-05-30 -1234.56',
      '2027-06-30 -1234.56',
      '2027-07-30 -1234.56',
    ]);
  });
});

describe('ledgerEntries for a subscription stored on a shortened day', () => {
  const stream: SubscriptionRow = {
    id: 'stream',
    brand_id: null,
    name: 'Stream',
    amount: 15.99,
    cycle: 'monthly',
    next_renewal_on: '2027-02-28',
    started_on: '2027-01-30',
    created_at: '2027-01-01T00:00:00Z',
    category_id: 'other',
    card_id: null,
    bank_account_id: 'checking',
    note: null,
    active: true,
    brands: null,
    anchor_day: 30,
  };

  const renewals = (subscription: SubscriptionRow) =>
    ledgerEntries({
      ...base,
      salaries: [],
      pay: [],
      subscriptions: [subscription],
      from: '2027-02-01',
      to: '2027-04-30',
      today: '2027-02-15',
    })
      .map((entry) => entry.date)
      .sort();

  it('renews on the 30th again after February', () => {
    expect(renewals(stream)).toEqual(['2027-02-28', '2027-03-30', '2027-04-30']);
  });

  it('on the 28th with no anchor day, as before', () => {
    const { anchor_day: _day, ...older } = stream;
    expect(renewals(older)).toEqual(['2027-02-28', '2027-03-28', '2027-04-28']);
  });
});

describe('unwrittenDatesIn, which holds a month close open', () => {
  const rent = {
    id: 'rent',
    name: 'Rent',
    amount: 1000,
    category_id: 'housing',
    icon_id: null,
    recurrence: 'monthly' as const,
    next_due_on: '2027-04-30',
    starts_on: '2027-03-31',
    ends_on: null,
    card_id: null,
    bank_account_id: 'checking',
    created_at: '2027-03-01T00:00:00Z',
    anchor_day: 31,
  };
  const charges = ['2027-03-31', '2027-04-30'].map((day, index) => ({
    id: `c${index}`,
    bill_id: 'rent',
    subscription_id: null,
    label: 'Rent',
    amount: 1000,
    charged_on: day,
    card_id: null,
    bank_account_id: 'checking',
  }));
  const unwritten = (bill: BillRow) =>
    unwrittenDatesIn({
      bills: [bill],
      subscriptions: [],
      charges,
      from: '2027-05-01',
      to: '2027-05-31',
      today: '2027-05-30',
    });

  it('waits for nothing on 30 May: rent on the 31st is not due yet', () => {
    expect(unwritten(rent)).toBe(false);
  });

  it('on a database without the column, 30 May is due and not written', () => {
    const { anchor_day: _day, ...older } = rent;
    expect(unwritten(older)).toBe(true);
  });

  it('the same for a subscription renewing on the 31st', () => {
    const stream: SubscriptionRow = {
      id: 'stream',
      brand_id: null,
      name: 'Stream',
      amount: 15.99,
      cycle: 'monthly',
      next_renewal_on: '2027-04-30',
      started_on: '2027-03-31',
      created_at: '2027-03-01T00:00:00Z',
      category_id: 'other',
      card_id: null,
      bank_account_id: 'checking',
      note: null,
      active: true,
      brands: null,
      anchor_day: 31,
    };
    const renewals = ['2027-03-31', '2027-04-30'].map((day, index) => ({
      ...charges[index],
      id: `s${index}`,
      bill_id: null,
      subscription_id: 'stream',
      charged_on: day,
    }));
    const unwrittenFor = (subscription: SubscriptionRow) =>
      unwrittenDatesIn({
        bills: [],
        subscriptions: [subscription],
        charges: renewals,
        from: '2027-05-01',
        to: '2027-05-31',
        today: '2027-05-30',
      });
    expect(unwrittenFor(stream)).toBe(false);
    const { anchor_day: _day, ...older } = stream;
    expect(unwrittenFor(older)).toBe(true);
  });
});
