import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { lacksAnchorDay, withAnchorDay } from '@/api/anchor-day';
import { recordDueCharges } from '@/api/charges';
import { useBill, useBills, useSubscription, useSubscriptions } from '@/api/queries';

/**
 * Bills and subscriptions are read with the day their monthly steps keep (`anchor_day`). A database
 * without the column still loads every list, with its logos (the anchor day's fallback sits inside
 * the logo one, which retries on any 42703), and every plan walks from its stored date's own day
 * there, as it did before. The phone's recorder walks from the anchor day.
 */

type Row = Record<string, unknown>;
type Failure = { code?: string; message?: string; details?: string } | null;

const mockDb: {
  rows: Record<string, Row[]>;
  hasAnchorDay: boolean;
  selects: { table: string; columns: string }[];
  written: Row[];
} = { rows: {}, hasAnchorDay: true, selects: [], written: [] };

jest.mock('@/lib/supabase', () => {
  const ANCHOR = /\banchor_day\b/;
  const build = (table: string) => {
    let columns = '';
    let single = false;
    const answer = () => {
      if (!mockDb.hasAnchorDay && ANCHOR.test(columns)) {
        return {
          data: null,
          error: { code: '42703', message: `column ${table}.anchor_day does not exist` },
        };
      }
      const rows = (mockDb.rows[table] ?? []).map((row) => {
        if (ANCHOR.test(columns)) return { ...row };
        const { anchor_day: _day, ...rest } = row;
        return rest;
      });
      return { data: single ? (rows[0] ?? null) : rows, error: null };
    };
    const builder: Record<string, unknown> = {
      select: (asked: string) => {
        columns = asked;
        mockDb.selects.push({ table, columns: asked });
        return builder;
      },
      order: () => builder,
      eq: () => builder,
      maybeSingle: () => {
        single = true;
        return builder;
      },
      upsert: async (rows: Row[]) => {
        mockDb.written.push(...rows);
        return { error: null };
      },
      then: (resolve: (value: unknown) => unknown) => resolve(answer()),
    };
    return builder;
  };
  return { supabase: { from: (table: string) => build(table) } };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const rent: Row = {
  id: 'rent',
  name: 'Rent',
  amount: 1234.56,
  category_id: 'housing',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2027-04-30',
  starts_on: '2027-04-30',
  ends_on: null,
  card_id: 'card-1',
  bank_account_id: null,
  created_at: '2027-04-01T00:00:00Z',
  brand_id: null,
  note: null,
  brands: null,
  logo_domain: 'rent.example',
  logo_hidden: false,
  in_spending: true,
  anchor_day: 31,
};

const stream: Row = {
  id: 'stream',
  brand_id: null,
  name: 'Stream',
  amount: 15.99,
  cycle: 'monthly',
  next_renewal_on: '2027-02-28',
  started_on: '2027-02-28',
  created_at: '2027-02-01T00:00:00Z',
  category_id: 'other',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  active: true,
  brands: null,
  logo_domain: 'stream.example',
  logo_hidden: false,
  anchor_day: 30,
};

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockDb.rows = { bills: [rent], subscriptions: [stream], charges: [] };
  mockDb.hasAnchorDay = true;
  mockDb.selects = [];
  mockDb.written = [];
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

describe('withAnchorDay', () => {
  const answers = (...results: { error: Failure }[]) => {
    const asked: string[] = [];
    const read = (column: string) => {
      asked.push(column);
      return Promise.resolve(results[asked.length - 1]);
    };
    return { asked, read };
  };

  it('reads with the column once when the database has it', async () => {
    const { asked, read } = answers({ error: null });
    await expect(withAnchorDay(read)).resolves.toEqual({ error: null });
    expect(asked).toEqual([', anchor_day']);
  });

  it('reads again without it on 42703 naming anchor_day, in the message or the details', async () => {
    for (const failure of [
      { code: '42703', message: 'column bills.anchor_day does not exist' },
      { code: '42703', message: 'undefined column', details: 'anchor_day' },
    ]) {
      const { asked, read } = answers({ error: failure }, { error: null });
      await expect(withAnchorDay(read)).resolves.toEqual({ error: null });
      expect(asked).toEqual([', anchor_day', '']);
    }
  });

  it('returns any other failure as it came, without a second read', async () => {
    for (const failure of [
      { code: '42703', message: 'column bills.logo_domain does not exist' },
      { code: '42P01', message: 'relation anchor_day does not exist' },
      { code: 'PGRST301', message: 'JWT expired' },
    ]) {
      const { asked, read } = answers({ error: failure });
      await expect(withAnchorDay(read)).resolves.toEqual({ error: failure });
      expect(asked).toEqual([', anchor_day']);
    }
    expect(lacksAnchorDay(null)).toBe(false);
  });
});

describe('the bills and subscriptions reads', () => {
  it('carry the anchor day where the database has it', async () => {
    const bills = await renderHook(() => useBills(), { wrapper });
    const subscriptions = await renderHook(() => useSubscriptions(), { wrapper });
    const bill = await renderHook(() => useBill('rent'), { wrapper });
    const subscription = await renderHook(() => useSubscription('stream'), { wrapper });
    await waitFor(() => expect(bills.result.current.data?.[0]?.anchor_day).toBe(31));
    await waitFor(() => expect(subscriptions.result.current.data?.[0]?.anchor_day).toBe(30));
    await waitFor(() => expect(bill.result.current.data?.anchor_day).toBe(31));
    await waitFor(() => expect(subscription.result.current.data?.anchor_day).toBe(30));
  });

  it('still load on a database without it, logos and all, with no anchor day', async () => {
    mockDb.hasAnchorDay = false;
    const bills = await renderHook(() => useBills(), { wrapper });
    const subscriptions = await renderHook(() => useSubscriptions(), { wrapper });
    const bill = await renderHook(() => useBill('rent'), { wrapper });
    const subscription = await renderHook(() => useSubscription('stream'), { wrapper });
    await waitFor(() => expect(bills.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(subscriptions.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(bill.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(subscription.result.current.isSuccess).toBe(true));

    expect(bills.result.current.data?.[0]).toMatchObject({ logo_domain: 'rent.example' });
    expect(bills.result.current.data?.[0]).not.toHaveProperty('anchor_day');
    expect(subscriptions.result.current.data?.[0]).toMatchObject({ logo_domain: 'stream.example' });
    expect(bill.result.current.data).toMatchObject({ logo_domain: 'rent.example' });
    expect(subscription.result.current.data).toMatchObject({ logo_domain: 'stream.example' });

    // Each read asked once with the anchor day, then once without it; never without the logos.
    const billReads = mockDb.selects.filter((select) => select.table === 'bills');
    expect(billReads.length).toBeGreaterThan(0);
    for (const select of mockDb.selects) expect(select.columns).toMatch(/logo_domain/);
    expect(billReads.filter((select) => /anchor_day/.test(select.columns))).toHaveLength(
      billReads.length / 2,
    );
  });
});

describe('the phone recorder', () => {
  it('records on the anchor day: rent on the 31st stored on 30 Apr comes due on 31 May', async () => {
    await recordDueCharges('user-1', '2027-05-31');
    expect(
      mockDb.written.map((row) => `${row.bill_id ?? row.subscription_id} ${row.charged_on}`),
    ).toEqual([
      'rent 2027-04-30',
      'rent 2027-05-31',
      'stream 2027-02-28',
      'stream 2027-03-30',
      'stream 2027-04-30',
      'stream 2027-05-30',
    ]);
  });

  it('on a database without the column, walks from the stored day as before', async () => {
    mockDb.hasAnchorDay = false;
    await recordDueCharges('user-1', '2027-05-31');
    expect(
      mockDb.written.map((row) => `${row.bill_id ?? row.subscription_id} ${row.charged_on}`),
    ).toEqual([
      'rent 2027-04-30',
      'rent 2027-05-30',
      'stream 2027-02-28',
      'stream 2027-03-28',
      'stream 2027-04-28',
      'stream 2027-05-28',
    ]);
  });
});
