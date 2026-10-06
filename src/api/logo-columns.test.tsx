import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  useBill,
  useBills,
  useLedger,
  useReceipt,
  useReceipts,
  useSourceLedger,
  useSubscription,
  useSubscriptions,
} from '@/api/queries';

/**
 * Receipts, subscriptions and bills are read with their per-row logo choice, every screen built
 * from them sees the logo through logoDomainOf, and a database that does not have the columns yet
 * still loads (catalog logos only) instead of failing every list.
 */

type Row = Record<string, unknown>;
type Failure = { code: string; message: string };

const mockSelects: { table: string; columns: string }[] = [];
const mockRows: Record<string, Row[]> = {};
const mockFailures: Record<string, Failure> = {};
let mockHasLogoColumns = true;

jest.mock('@/lib/supabase', () => {
  const LOGO = /\blogo_(domain|hidden)\b/;

  const build = (table: string) => {
    let columns = '';
    let single = false;
    const answer = () => {
      if (mockFailures[table]) return { data: null, error: mockFailures[table] };
      if (!mockHasLogoColumns && LOGO.test(columns)) {
        return {
          data: null,
          error: { code: '42703', message: `column ${table}.logo_domain does not exist` },
        };
      }
      // An older database has no such columns to return, whatever the fixture says.
      const rows = (mockRows[table] ?? []).map((row) => {
        if (LOGO.test(columns)) return { ...row };
        const { logo_domain: _domain, logo_hidden: _hidden, ...rest } = row;
        return rest;
      });
      return { data: single ? (rows[0] ?? null) : rows, error: null };
    };

    const builder: Record<string, unknown> = {
      select: (asked: string) => {
        columns = asked;
        mockSelects.push({ table, columns: asked });
        return builder;
      },
      order: () => builder,
      eq: () => builder,
      in: () => builder,
      maybeSingle: () => {
        single = true;
        return builder;
      },
      then: (resolve: (value: unknown) => unknown) => resolve(answer()),
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => build(table),
      rpc: async () => ({ data: null, error: null }),
      auth: { getUser: async () => ({ data: { user: null } }) },
    },
  };
});

jest.mock('@/providers/session-provider', () => ({
  useUserId: () => 'user-1',
}));

jest.mock('@/api/pro', () => ({
  usePro: () => ({ pro: true, ready: true }),
}));

const TODAY = '2026-09-20';
const SEPTEMBER = { from: '2026-09-01', to: '2026-09-30' };

const NETFLIX = { domain: 'netflix.com' };

const receipt = (id: string, extra: Row): Row => ({
  id,
  brand_id: null,
  merchant: `Store ${id}`,
  amount: 10,
  purchased_on: '2026-09-10',
  category_id: 'other',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  source: 'manual',
  image_path: null,
  brands: null,
  logo_domain: null,
  logo_hidden: false,
  ...extra,
});

const subscription = (id: string, extra: Row): Row => ({
  id,
  brand_id: null,
  name: `Plan ${id}`,
  amount: 15.49,
  cycle: 'monthly',
  next_renewal_on: '2026-09-15',
  started_on: '2026-09-15',
  created_at: '2026-09-01T00:00:00Z',
  category_id: 'entertainment',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  active: true,
  brands: null,
  logo_domain: null,
  logo_hidden: false,
  ...extra,
});

const bill = (id: string, extra: Row): Row => ({
  id,
  name: `Bill ${id}`,
  amount: 80,
  category_id: 'energy',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2026-09-05',
  starts_on: '2026-09-05',
  ends_on: null,
  card_id: 'card-1',
  bank_account_id: null,
  created_at: '2026-09-01T00:00:00Z',
  note: null,
  brand_id: null,
  brands: null,
  logo_domain: null,
  logo_hidden: false,
  ...extra,
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockSelects.length = 0;
  mockHasLogoColumns = true;
  for (const key of Object.keys(mockRows)) delete mockRows[key];
  for (const key of Object.keys(mockFailures)) delete mockFailures[key];
  mockRows.receipts = [receipt('r1', { logo_domain: 'hulu.com', brands: NETFLIX })];
  mockRows.subscriptions = [subscription('s1', { logo_domain: 'hulu.com' })];
  mockRows.bills = [bill('b1', { logo_domain: 'aep.com' })];
});

type Read = () => { isSuccess: boolean; isError: boolean; data: unknown };

const READS: [string, string, Read][] = [
  ['useReceipts', 'receipts', () => useReceipts()],
  ['useSubscriptions', 'subscriptions', () => useSubscriptions()],
  ['useBills', 'bills', () => useBills()],
  ['useReceipt', 'receipts', () => useReceipt('r1')],
  ['useSubscription', 'subscriptions', () => useSubscription('s1')],
  ['useBill', 'bills', () => useBill('b1')],
];

const firstRow = (data: unknown) => (Array.isArray(data) ? data[0] : data) as Row | undefined;

describe('reads that carry a logo', () => {
  it.each(READS)('%s asks for the logo choice beside the catalog brand', async (_, table, hook) => {
    const { result } = await renderHook(hook, { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const asked = mockSelects.filter((select) => select.table === table);
    expect(asked).toHaveLength(1);
    expect(asked[0].columns).toMatch(/\blogo_domain\b/);
    expect(asked[0].columns).toMatch(/\blogo_hidden\b/);
    expect(asked[0].columns).toContain('brands(domain)');
    expect(firstRow(result.current.data)).toHaveProperty('logo_domain');
  });

  it.each(READS)(
    '%s still loads, without the choice, on a database that lacks the columns',
    async (_, table, hook) => {
      mockHasLogoColumns = false;
      const { result } = await renderHook(hook, { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const asked = mockSelects.filter((select) => select.table === table);
      expect(asked).toHaveLength(2);
      // The same read, less exactly the two columns.
      expect(asked[1].columns).toBe(asked[0].columns.replace(', logo_domain, logo_hidden', ''));
      expect(asked[1].columns).toContain('brands(domain)');
      expect(firstRow(result.current.data)?.id).toBeDefined();
    },
  );

  it.each(READS)('%s does not paper over any other failure', async (_, table, hook) => {
    mockFailures[table] = { code: '42501', message: 'permission denied' };
    const { result } = await renderHook(hook, { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockSelects.filter((select) => select.table === table)).toHaveLength(1);
  });
});

describe('ledgers built from those reads', () => {
  beforeEach(() => {
    mockRows.receipts = [
      receipt('chosen', { logo_domain: 'hulu.com', brands: NETFLIX }),
      receipt('hidden', { logo_hidden: true, brands: NETFLIX }),
      receipt('catalog', { brands: NETFLIX }),
      receipt('custom', { logo_domain: 'planetfitness.com' }),
      receipt('plain', {}),
    ];
    mockRows.subscriptions = [
      subscription('s1', { logo_domain: 'max.com', brands: NETFLIX }),
      subscription('s2', { logo_hidden: true, brands: NETFLIX }),
    ];
    mockRows.bills = [bill('b1', { logo_hidden: true, brands: { domain: 'aep.com' } })];
    // September's electric already went out, so its entry is the recorded charge, not a projection.
    mockRows.charges = [
      {
        id: 'charge-1',
        bill_id: 'b1',
        subscription_id: null,
        label: 'Bill b1',
        amount: 81.2,
        charged_on: '2026-09-05',
        card_id: 'card-1',
        bank_account_id: null,
        notification_dismissed_at: null,
      },
    ];
    mockRows.cards = [
      {
        id: 'card-1',
        holder: 'Sam',
        network: 'Visa',
        last4: '4242',
        color: '#905479',
        balance: 0,
        balance_as_of: null,
        bill_due_day: null,
      },
    ];
  });

  const EXPECTED: Record<string, string | null> = {
    'Store chosen': 'hulu.com',
    'Store hidden': null,
    'Store catalog': 'netflix.com',
    'Store custom': 'planetfitness.com',
    'Store plain': null,
    'Plan s1': 'max.com',
    'Plan s2': null,
    'Bill b1': null,
  };

  /**
   * A hidden row's domain is null, which alone reads as "nothing chosen" and lets a screen find
   * the catalog logo by name. The flag is what tells it to draw letters.
   */
  const HIDDEN: Record<string, boolean> = {
    'Store chosen': false,
    'Store hidden': true,
    'Store catalog': false,
    'Store custom': false,
    'Store plain': false,
    'Plan s1': false,
    'Plan s2': true,
    'Bill b1': true,
  };

  type Drawn = { label: string; domain?: string | null; logoHidden?: boolean | null };

  const domains = (entries: Drawn[]) =>
    Object.fromEntries(entries.map((entry) => [entry.label, entry.domain ?? null]));
  const hidden = (entries: Drawn[]) =>
    Object.fromEntries(entries.map((entry) => [entry.label, entry.logoHidden]));

  it('the transactions timeline shows each row by the shared rule', async () => {
    const { result } = await renderHook(() => useLedger(SEPTEMBER, TODAY), { wrapper });
    await waitFor(() => expect(result.current.entries).toHaveLength(8));

    expect(domains(result.current.entries)).toEqual(EXPECTED);
  });

  it('the transactions timeline says which rows chose letters, recorded charges included', async () => {
    const { result } = await renderHook(() => useLedger(SEPTEMBER, TODAY), { wrapper });
    await waitFor(() => expect(result.current.entries).toHaveLength(8));

    expect(hidden(result.current.entries)).toEqual(HIDDEN);
    expect(result.current.entries.find((entry) => entry.label === 'Bill b1')?.amount).toBe(-81.2);
  });

  it("a card's own ledger shows each row by the same rule", async () => {
    const { result } = await renderHook(() => useSourceLedger('card-1', TODAY), { wrapper });
    await waitFor(() => expect(result.current.ledger?.entries).toHaveLength(8));

    expect(domains(result.current.ledger!.entries)).toEqual(EXPECTED);
  });

  it("a card's own ledger says which rows chose letters, recorded charges included", async () => {
    const { result } = await renderHook(() => useSourceLedger('card-1', TODAY), { wrapper });
    await waitFor(() => expect(result.current.ledger?.entries).toHaveLength(8));

    expect(hidden(result.current.ledger!.entries)).toEqual(HIDDEN);
    const electric = result.current.ledger!.entries.find((entry) => entry.label === 'Bill b1');
    expect(electric?.amount).toBe(-81.2);
  });

  it('falls back to catalog logos alone on a database without the columns', async () => {
    mockHasLogoColumns = false;
    const { result } = await renderHook(() => useLedger(SEPTEMBER, TODAY), { wrapper });
    await waitFor(() => expect(result.current.entries).toHaveLength(8));

    expect(domains(result.current.entries)).toEqual({
      'Store chosen': 'netflix.com',
      'Store hidden': 'netflix.com',
      'Store catalog': 'netflix.com',
      'Store custom': null,
      'Store plain': null,
      'Plan s1': 'netflix.com',
      'Plan s2': 'netflix.com',
      'Bill b1': 'aep.com',
    });
    expect(Object.values(hidden(result.current.entries))).toEqual(Array(8).fill(false));
    expect(result.current.isError).toBe(false);
  });
});
