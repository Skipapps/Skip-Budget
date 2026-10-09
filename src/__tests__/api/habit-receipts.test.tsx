import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  useLedger,
  useReceipt,
  useReceipts,
  useSourceLedger,
  type ReceiptRow,
} from '@/api/queries';

/**
 * A receipt filed from a spending habit carries the habit's name, icon and colour into every list:
 * the receipt reads embed the habit, and the timelines built from them mark the entry. A database
 * without habits yet still loads every receipt.
 */

type Row = Record<string, unknown>;
type Failure = { code: string; message: string };

const mockSelects: { table: string; columns: string }[] = [];
const mockRows: Record<string, Row[]> = {};
const mockFailures: Record<string, Failure> = {};
let mockHasHabits = true;
let mockHasLogoColumns = true;

jest.mock('@/lib/supabase', () => {
  const HABIT = /\bhabit_id\b|habits\(/;
  const LOGO = /\blogo_(domain|hidden)\b/;

  const build = (table: string) => {
    let columns = '';
    let single = false;
    const answer = () => {
      if (mockFailures[table]) return { data: null, error: mockFailures[table] };
      // PostgREST resolves the embed before Postgres sees a column, so this is the first refusal.
      if (!mockHasHabits && HABIT.test(columns)) {
        return {
          data: null,
          error: {
            code: 'PGRST200',
            message: `Could not find a relationship between '${table}' and 'habits' in the schema cache`,
          },
        };
      }
      if (!mockHasLogoColumns && LOGO.test(columns)) {
        return {
          data: null,
          error: { code: '42703', message: `column ${table}.logo_domain does not exist` },
        };
      }
      const rows = (mockRows[table] ?? []).map((row) => {
        if (HABIT.test(columns)) return { ...row };
        const { habit_id: _id, habit: _habit, ...rest } = row;
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

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-09';
const THIS_WEEK = { from: '2026-10-05', to: '2026-10-11' };

const receipt = (id: string, extra: Row = {}): Row => ({
  id,
  brand_id: null,
  merchant: `Store ${id}`,
  amount: 12,
  purchased_on: '2026-10-06',
  category_id: 'other',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  source: 'manual',
  image_path: null,
  created_at: '2026-10-06T08:00:00Z',
  brands: null,
  logo_domain: null,
  logo_hidden: false,
  habit_id: null,
  habit: null,
  ...extra,
});

const coffeeTap = receipt('tap', {
  merchant: 'Coffee',
  amount: 5,
  source: 'habit',
  category_id: 'dining',
  habit_id: 'habit-coffee',
  habit: { name: 'Coffee', icon_id: 'food-dining/coffee', color: 'caramel' },
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockSelects.length = 0;
  mockHasHabits = true;
  mockHasLogoColumns = true;
  for (const key of Object.keys(mockRows)) delete mockRows[key];
  for (const key of Object.keys(mockFailures)) delete mockFailures[key];
  mockRows.receipts = [coffeeTap, receipt('plain')];
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

const byLabel = <T extends { label: string }>(entries: T[], label: string) =>
  entries.find((entry) => entry.label === label);

type Read = () => { isSuccess: boolean; data: ReceiptRow[] | ReceiptRow | null | undefined };

const READS: [string, Read][] = [
  ['useReceipts', () => useReceipts()],
  ['useReceipt', () => useReceipt('tap')],
];

describe('receipt reads', () => {
  it.each(READS)('%s embeds the habit beside the receipt', async (_, hook) => {
    const { result } = await renderHook(hook, { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const asked = mockSelects.filter((select) => select.table === 'receipts');
    expect(asked).toHaveLength(1);
    expect(asked[0].columns).toContain('habit_id, habit:habits(name, icon_id, color)');
    const data = result.current.data;
    const row = Array.isArray(data) ? data[0] : data;
    expect(row?.habit_id).toBe('habit-coffee');
    expect(row?.habit).toEqual({ name: 'Coffee', icon_id: 'food-dining/coffee', color: 'caramel' });
  });

  it('a receipt from no habit has none', async () => {
    const { result } = await renderHook(() => useReceipts(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.find((row) => row.id === 'plain')?.habit).toBeNull();
  });

  it.each(READS)(
    '%s still loads, without habits, on a database that has none yet',
    async (_, hook) => {
      mockHasHabits = false;
      const { result } = await renderHook(hook, { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const asked = mockSelects.filter((select) => select.table === 'receipts');
      expect(asked).toHaveLength(2);
      // The same read, less exactly the habit.
      expect(asked[1].columns).toBe(
        asked[0].columns.replace(', habit_id, habit:habits(name, icon_id, color)', ''),
      );
      expect(asked[1].columns).toContain('logo_domain');
    },
  );

  it('loads on a database with neither habits nor the logo columns', async () => {
    mockHasHabits = false;
    mockHasLogoColumns = false;
    const { result } = await renderHook(() => useReceipts(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const last = mockSelects.filter((select) => select.table === 'receipts').at(-1)!;
    expect(last.columns).not.toMatch(/habit|logo_/);
    expect(last.columns).toContain('brands(domain)');
    expect(result.current.data).toHaveLength(2);
  });

  it('does not paper over any other failure', async () => {
    mockFailures.receipts = { code: '42501', message: 'permission denied for table habits' };
    const { result } = await renderHook(() => useReceipts(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockSelects.filter((select) => select.table === 'receipts')).toHaveLength(1);
  });

  it('draws a habit colour it does not know as the first one', async () => {
    mockRows.receipts = [
      receipt('odd', {
        habit_id: 'habit-odd',
        habit: { name: 'Odd', icon_id: 'goals/star', color: 'teal' },
      }),
    ];
    const { result } = await renderHook(() => useReceipts(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].habit?.color).toBe('caramel');
  });
});

describe('timelines built from them', () => {
  it("Activity marks a habit's receipt with its icon and colour, and no other", async () => {
    const { result } = await renderHook(() => useLedger(THIS_WEEK, TODAY), { wrapper });
    await waitFor(() => expect(result.current.entries).toHaveLength(2));

    const tap = byLabel(result.current.entries, 'Coffee');
    expect(tap).toMatchObject({ kind: 'receipt', amount: -5, date: '2026-10-06' });
    expect(tap?.habit).toEqual({ iconId: 'food-dining/coffee', color: 'caramel' });
    expect(byLabel(result.current.entries, 'Store plain')).not.toHaveProperty('habit');
  });

  it('an archived habit still marks its receipts', async () => {
    // The join reads the habit whatever its state; nothing in the row says archived.
    mockRows.receipts = [
      receipt('old-tap', {
        merchant: 'Snacks',
        habit_id: 'habit-gone',
        habit: { name: 'Snacks', icon_id: 'food-dining/snacks-sweets', color: 'pink' },
      }),
    ];
    const { result } = await renderHook(() => useLedger(THIS_WEEK, TODAY), { wrapper });
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    expect(result.current.entries[0].habit).toEqual({
      iconId: 'food-dining/snacks-sweets',
      color: 'pink',
    });
  });

  it("the card's own activity marks it too, at the receipt's amount", async () => {
    const { result } = await renderHook(() => useSourceLedger('card-1', TODAY), { wrapper });
    await waitFor(() => expect(result.current.ledger?.entries).toHaveLength(2));

    const entries = result.current.ledger!.entries;
    const tap = byLabel(entries, 'Coffee');
    expect(tap?.amount).toBe(-5);
    expect(tap?.habit).toEqual({ iconId: 'food-dining/coffee', color: 'caramel' });
    expect(byLabel(entries, 'Store plain')).not.toHaveProperty('habit');
    expect(result.current.ledger!.charged).toBe(17);
  });

  it('a database without habits lists the same receipts, unmarked', async () => {
    mockHasHabits = false;
    const { result } = await renderHook(() => useLedger(THIS_WEEK, TODAY), { wrapper });
    await waitFor(() => expect(result.current.entries).toHaveLength(2));

    expect(result.current.entries.every((entry) => !('habit' in entry))).toBe(true);
    expect(result.current.isError).toBe(false);
  });
});
