import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { loanTermsOf, useLoans } from '@/api/loans';
import { useDeleteBill, useSaveLoan, useUpdateBill, type SaveLoanValues } from '@/api/mutations';
import { termsFromStored } from '@/lib/loan';

/**
 * The Loans page's read: every saved loan with its bill, in one request, with the payments the
 * person changed. It follows saving a loan and editing or deleting a bill. The fake database
 * keeps what is written, and deleting a bill takes its loan with it, as the foreign key does.
 */

type Row = Record<string, unknown>;
const mockTables: { bills: Row[]; loans: Row[] } = { bills: [], loans: [] };
const mockSelects: string[] = [];
let mockHasOverridesColumn = true;
let mockLoansFailure: { code: string; message: string } | null = null;
let mockSerial = 0;

jest.mock('@/lib/supabase', () => {
  const BILL_FIELDS = ['id', 'name', 'icon_id', 'starts_on', 'next_due_on', 'ends_on'];
  const build = (table: 'bills' | 'loans') => {
    let columns = '';
    let op: 'select' | 'update' | 'delete' = 'select';
    let changes: Row = {};
    const filters: [string, unknown][] = [];
    const matching = () =>
      mockTables[table].filter((row) => filters.every(([column, value]) => row[column] === value));
    const builder: Record<string, unknown> = {
      select: (asked: string) => {
        if (op === 'select') {
          columns = asked;
          if (table === 'loans') mockSelects.push(asked);
        }
        return builder;
      },
      update: (values: Row) => {
        op = 'update';
        changes = values;
        return builder;
      },
      delete: () => {
        op = 'delete';
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      },
      order: () => builder,
      then: (resolve: (value: unknown) => unknown) => {
        if (op === 'update') {
          const rows = matching();
          for (const row of rows) Object.assign(row, changes);
          return resolve({ data: rows.map((row) => ({ id: row.id })), error: null });
        }
        if (op === 'delete') {
          const gone = new Set(matching().map((row) => row.id));
          mockTables[table] = mockTables[table].filter((row) => !gone.has(row.id));
          if (table === 'bills') {
            mockTables.loans = mockTables.loans.filter((loan) => !gone.has(loan.bill_id));
          }
          return resolve({ data: null, error: null });
        }
        if (mockLoansFailure) return resolve({ data: null, error: mockLoansFailure });
        if (!mockHasOverridesColumn && /\bpayment_overrides\b/.test(columns)) {
          return resolve({
            data: null,
            error: { code: '42703', message: 'column loans.payment_overrides does not exist' },
          });
        }
        const rows = mockTables.loans.map((loan) => {
          const { payment_overrides: overrides, ...rest } = loan;
          const bill = mockTables.bills.find((candidate) => candidate.id === loan.bill_id);
          return {
            ...rest,
            ...(/\bpayment_overrides\b/.test(columns) ? { payment_overrides: overrides } : {}),
            bill: bill
              ? Object.fromEntries(BILL_FIELDS.map((field) => [field, bill[field]]))
              : null,
          };
        });
        return resolve({ data: rows, error: null });
      },
    };
    return builder;
  };
  return {
    supabase: {
      from: (table: 'bills' | 'loans') => build(table),
      rpc: async (_name: string, args: Row) => {
        mockSerial += 1;
        const billId = `bill-new-${mockSerial}`;
        mockTables.bills.push({
          id: billId,
          name: args.p_name,
          icon_id: args.p_icon_id,
          starts_on: args.p_first_payment_on,
          next_due_on: args.p_first_payment_on,
          ends_on: args.p_last_payment_on ?? '2031-10-01',
        });
        mockTables.loans.push({
          ...mockLoanRow(`loan-new-${mockSerial}`, billId, '2026-10-09T12:00:00Z'),
          payment_overrides: args.p_payment_overrides ?? null,
        });
        return { data: { id: billId }, error: null };
      },
    },
  };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

function mockLoanRow(id: string, billId: string, createdAt: string): Row {
  return {
    id,
    bill_id: billId,
    principal: '18000.00',
    annual_rate: '6.250000000',
    term_months: 48,
    monthly_payment: '424.81',
    total_interest: '2390.88',
    first_payment_on: '2024-07-15',
    funded_on: '2024-06-15',
    day_count_basis: 'actual/365',
    statement_on: null,
    statement_principal: null,
    created_at: createdAt,
    payment_overrides: null,
  };
}

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function settle(work: () => Promise<unknown>) {
  await act(async () => {
    await work();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const TODAY = '2026-10-09';

beforeEach(() => {
  mockSelects.length = 0;
  mockHasOverridesColumn = true;
  mockLoansFailure = null;
  mockSerial = 0;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
  });
  mockTables.bills = [
    {
      id: 'bill-car',
      name: 'Car loan',
      icon_id: 'loan-car',
      starts_on: '2024-07-15',
      next_due_on: '2026-10-15',
      ends_on: '2028-06-15',
    },
    {
      id: 'bill-school',
      name: 'Student loan',
      icon_id: 'loan-student',
      // Saved before loans kept their own first payment date: the bill's first due date stands in.
      starts_on: '2025-01-20',
      next_due_on: '2026-10-20',
      ends_on: null,
    },
    // Paid: its end date has gone.
    {
      id: 'bill-old',
      name: 'Old sofa',
      icon_id: null,
      starts_on: '2022-02-01',
      next_due_on: '2026-11-01',
      ends_on: '2026-09-01',
    },
  ];
  mockTables.loans = [
    {
      ...mockLoanRow('loan-car', 'bill-car', '2024-06-01T00:00:00Z'),
      payment_overrides: { '1': 612.4, '14': 1000 },
    },
    {
      ...mockLoanRow('loan-school', 'bill-school', '2024-07-01T00:00:00Z'),
      first_payment_on: null,
    },
    mockLoanRow('loan-old', 'bill-old', '2022-01-01T00:00:00Z'),
  ];
});

describe('useLoans', () => {
  it('reads every loan with its bill and its changed payments in one request', async () => {
    const { result } = await renderHook(() => useLoans(TODAY), { wrapper });
    await waitFor(() => expect(result.current.loans).toHaveLength(3));

    expect(mockSelects).toHaveLength(1);
    expect(mockSelects[0]).toContain(', payment_overrides');
    expect(mockSelects[0]).toContain(
      'bill:bills!inner(id, name, icon_id, starts_on, next_due_on, ends_on)',
    );
    const car = result.current.loans.find((loan) => loan.id === 'loan-car')!;
    expect(car).toMatchObject({
      bill_id: 'bill-car',
      principal: 18000,
      annual_rate: 6.25,
      term_months: 48,
      monthly_payment: 424.81,
      payment_overrides: { '1': 612.4, '14': 1000 },
      bill: {
        id: 'bill-car',
        name: 'Car loan',
        icon_id: 'loan-car',
        starts_on: '2024-07-15',
        next_due_on: '2026-10-15',
      },
      billEnded: false,
    });
    expect(termsFromStored(car)?.paymentOverrides).toEqual({ 1: 612.4, 14: 1000 });
    expect(
      result.current.loans.find((loan) => loan.id === 'loan-school')?.payment_overrides,
    ).toBeNull();
  });

  it("counts a loan without its own first payment date from its bill's first due date", async () => {
    const { result } = await renderHook(() => useLoans(TODAY), { wrapper });
    await waitFor(() => expect(result.current.loans).toHaveLength(3));
    const school = result.current.loans.find((loan) => loan.id === 'loan-school')!;

    expect(school.first_payment_on).toBeNull();
    expect(school.bill).toMatchObject({ starts_on: '2025-01-20', next_due_on: '2026-10-20' });
    // From the first due date, not the next one, so the payments already made are counted.
    expect(loanTermsOf(school)?.firstPaymentOn).toEqual(new Date(2025, 0, 20));
    // A loan with its own date keeps it.
    const car = result.current.loans.find((loan) => loan.id === 'loan-car')!;
    expect(loanTermsOf(car)?.firstPaymentOn).toEqual(new Date(2024, 6, 15));
  });

  it('says which bills have stopped running, as of the day asked', async () => {
    const { result, rerender } = await renderHook(
      ({ today }: { today: string }) => useLoans(today),
      {
        wrapper,
        initialProps: { today: TODAY },
      },
    );
    await waitFor(() => expect(result.current.loans).toHaveLength(3));
    const ended = () =>
      Object.fromEntries(result.current.loans.map((loan) => [loan.id, loan.billEnded]));

    expect(ended()).toEqual({ 'loan-car': false, 'loan-school': false, 'loan-old': true });
    await rerender({ today: '2028-06-16' });
    expect(ended()).toEqual({ 'loan-car': true, 'loan-school': false, 'loan-old': true });
  });

  it('still lists every loan, with no changes, on a database without the column', async () => {
    mockHasOverridesColumn = false;
    const { result } = await renderHook(() => useLoans(TODAY), { wrapper });
    await waitFor(() => expect(result.current.loans).toHaveLength(3));

    expect(mockSelects).toHaveLength(2);
    expect(mockSelects[1]).toBe(mockSelects[0].replace(', payment_overrides', ''));
    expect(result.current.loans.every((loan) => loan.payment_overrides === null)).toBe(true);
  });

  it('is an error, not an empty list, when the read fails', async () => {
    mockLoansFailure = { code: '08006', message: 'connection failure' };
    const { result } = await renderHook(() => useLoans(TODAY), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.loans).toEqual([]);
    expect(mockSelects).toHaveLength(1);
  });

  it('is empty for someone with no loans', async () => {
    mockTables.loans = [];
    const { result } = await renderHook(() => useLoans(TODAY), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({ loans: [], isError: false });
  });
});

describe('what refreshes it', () => {
  async function listed() {
    const view = await renderHook(() => useLoans(TODAY), { wrapper });
    await waitFor(() => expect(view.result.current.loans).toHaveLength(3));
    return view;
  }

  it('saving a loan', async () => {
    const { result } = await listed();
    const save = await renderHook(() => useSaveLoan(), { wrapper });
    const values: SaveLoanValues = {
      name: 'Kitchen',
      iconId: 'loan-home',
      principal: 9000,
      annualRate: 5,
      termMonths: 24,
      monthlyPayment: 394.84,
      totalInterest: 476.16,
      firstPaymentOn: '2026-11-01',
      fundedOn: null,
      dayCountBasis: 'actual/365',
      cardId: null,
      bankAccountId: null,
    };
    await settle(() => save.result.current.mutateAsync(values));

    await waitFor(() => expect(result.current.loans).toHaveLength(4));
    expect(result.current.loans.at(-1)?.bill.name).toBe('Kitchen');
  });

  it('editing a bill', async () => {
    const { result } = await listed();
    const update = await renderHook(() => useUpdateBill(), { wrapper });
    await settle(() =>
      update.result.current.mutateAsync({ id: 'bill-car', values: { name: 'Honda' } }),
    );

    await waitFor(() =>
      expect(result.current.loans.find((loan) => loan.id === 'loan-car')?.bill.name).toBe('Honda'),
    );
  });

  it('deleting a bill, which takes its loan with it', async () => {
    const { result } = await listed();
    const remove = await renderHook(() => useDeleteBill(), { wrapper });
    await settle(() => remove.result.current.mutateAsync('bill-school'));

    await waitFor(() => expect(result.current.loans).toHaveLength(2));
    expect(result.current.loans.map((loan) => loan.id)).toEqual(['loan-car', 'loan-old']);
  });
});
