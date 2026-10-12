import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { buildBillValues, guardLoanBillDates, type StoredBillDates } from '@/api/entry-values';
import { useUpdateBill } from '@/api/mutations';
import { unrecordedDates } from '@/lib/charges';

/**
 * Editing a loan's bill through the bill form, until loans have their own edit (P2). The form
 * saves the date it shows as the next due date and the floor, so without a guard a loan added after
 * its payments were made restarts below save_loan's count floor, and both recorders write every
 * earlier payment as spending.
 */

type Row = Record<string, unknown>;

const mockDb: {
  bills: Record<string, Row>;
  loanBills: Set<string>;
  readFailure: { code: string; message: string } | null;
  reads: string[];
  updates: { id: unknown; values: Row }[];
} = { bills: {}, loanBills: new Set(), readFailure: null, reads: [], updates: [] };

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      let id: unknown = null;
      const read: Record<string, unknown> = {
        select: () => read,
        eq: (_column: string, value: unknown) => {
          id = value;
          return read;
        },
        maybeSingle: () => read,
        then: (resolve: (value: unknown) => unknown) => {
          mockDb.reads.push(table);
          if (mockDb.readFailure) return resolve({ data: null, error: mockDb.readFailure });
          if (table === 'loans') {
            return resolve({
              data: mockDb.loanBills.has(id as string) ? { id: 'loan' } : null,
              error: null,
            });
          }
          return resolve({ data: mockDb.bills[id as string] ?? null, error: null });
        },
      };
      return {
        ...read,
        update: (values: Row) => ({
          eq: (_column: string, value: unknown) => ({
            select: async () => {
              mockDb.updates.push({ id: value, values });
              return { data: [{ id: value }], error: null };
            },
          }),
        }),
      };
    },
  },
}));

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

const TODAY = '2026-10-12';

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockDb.bills = {
    // Saved on 12 Oct 2026; its 24 payments ran 2019–2020 (save_loan: no next due date).
    'paid-off': {
      icon_id: 'loan-car',
      next_due_on: null,
      starts_on: '2019-01-15',
      ends_on: '2020-12-15',
    },
    // Saved on 12 Oct 2026, paying since Jan 2024: counted from 12 Oct, next due 27 Oct.
    'added-late': {
      icon_id: 'loan-student',
      next_due_on: '2026-10-27',
      starts_on: '2026-10-12',
      ends_on: '2027-12-27',
    },
    rent: { icon_id: null, next_due_on: '2026-11-01', starts_on: '2026-07-01', ends_on: null },
  };
  mockDb.loanBills = new Set(['paid-off', 'added-late']);
  mockDb.readFailure = null;
  mockDb.reads = [];
  mockDb.updates = [];
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
});

/** What add-bill's Save builds for a loan bill, the date shown being `shown`. */
function formValues(shown: string, endDate: string | null) {
  const built = buildBillValues(
    {
      name: 'Car loan',
      amount: '424.80',
      issuer: null,
      categoryId: 'loans',
      iconId: 'loan-car',
      recurrence: 'monthly',
      startDate: new Date(`${shown}T00:00:00`),
      endDate: endDate ? new Date(`${endDate}T00:00:00`) : null,
      sourceId: '',
      note: '',
    },
    { sources: [], lastChargedOn: null, hasLoan: true },
  );
  if (!built.ok) throw new Error(built.message);
  return built.values;
}

async function save(id: string, values: Row) {
  const { result } = await renderHook(() => useUpdateBill(), { wrapper });
  await result.current.mutateAsync({ id, values });
  return mockDb.updates[mockDb.updates.length - 1].values;
}

/** What the recorder would write for the bill as saved, by today. */
function recorded(written: Row, endsOn: string | null) {
  return unrecordedDates(
    {
      id: 'bill',
      recurrence: 'monthly',
      nextDate: written.next_due_on as string | null,
      startsOn: written.starts_on as string | null,
      endsOn,
    },
    TODAY,
    new Set(),
  );
}

describe('editing a loan bill saved with every payment already made', () => {
  it('keeps it with nothing to come, so Save with no change records nothing', async () => {
    // The form shows starts_on when there is no next due date (add-bill.tsx).
    const values = formValues('2019-01-15', '2020-12-15');
    expect(recorded(values, '2020-12-15')).toHaveLength(24);

    const written = await save('paid-off', values);

    expect(written).toMatchObject({ next_due_on: null, starts_on: '2019-01-15', name: 'Car loan' });
    expect(recorded(written, '2020-12-15')).toEqual([]);
  });
});

describe('editing a running loan bill added after payments were made', () => {
  it('never moves its floor earlier than the day it was added', async () => {
    const values = formValues('2024-01-27', null);
    expect(recorded(values, null)).toHaveLength(33);

    const written = await save('added-late', values);

    expect(written.starts_on).toBe('2026-10-12');
    expect(recorded(written, null)).toEqual([]);
  });

  it('saves the date it shows (its next payment) as it always did', async () => {
    const written = await save('added-late', formValues('2026-10-27', null));
    expect(written).toMatchObject({ next_due_on: '2026-10-27', starts_on: '2026-10-27' });
  });
});

describe('the bill update path', () => {
  it('leaves any other bill as edited: moving rent earlier fills those months, as before', async () => {
    const written = await save('rent', { next_due_on: '2026-05-01', starts_on: '2026-05-01' });
    expect(written).toEqual({ next_due_on: '2026-05-01', starts_on: '2026-05-01' });
  });

  it('reads nothing first when the edit names no date', async () => {
    await save('paid-off', { name: 'Honda' });
    expect(mockDb.reads).toEqual([]);
    expect(mockDb.updates).toEqual([{ id: 'paid-off', values: { name: 'Honda' } }]);
  });

  it('writes nothing when the bill cannot be read first', async () => {
    mockDb.readFailure = { code: '08006', message: 'connection failure' };
    const { result } = await renderHook(() => useUpdateBill(), { wrapper });

    await expect(
      result.current.mutateAsync({ id: 'paid-off', values: formValues('2019-01-15', null) }),
    ).rejects.toMatchObject({ code: '08006' });
    expect(mockDb.updates).toEqual([]);
  });
});

describe('guardLoanBillDates', () => {
  const stored = (fields: Partial<StoredBillDates>): StoredBillDates => ({
    icon_id: null,
    next_due_on: null,
    starts_on: '2019-01-15',
    hasLoan: false,
    ...fields,
  });
  const edit = { next_due_on: '2019-01-15', starts_on: '2019-01-15' };

  it('knows a loan by its loans row or by its type icon', () => {
    expect(guardLoanBillDates(edit, stored({ hasLoan: true }))).toEqual({
      next_due_on: null,
      starts_on: '2019-01-15',
    });
    expect(guardLoanBillDates(edit, stored({ icon_id: 'loan-home' }))).toEqual({
      next_due_on: null,
      starts_on: '2019-01-15',
    });
    expect(guardLoanBillDates(edit, stored({ icon_id: 'other' }))).toEqual(edit);
  });

  it('only touches the dates the edit names', () => {
    expect(guardLoanBillDates({ name: 'Car' }, stored({ hasLoan: true }))).toEqual({ name: 'Car' });
    expect(guardLoanBillDates({ next_due_on: '2026-01-15' }, stored({ hasLoan: true }))).toEqual({
      next_due_on: null,
    });
  });
});
