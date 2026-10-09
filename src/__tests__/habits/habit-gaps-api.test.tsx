import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  useArchiveHabit,
  useCreateHabit,
  useHabit,
  useHabits,
  useHabitTaps,
  useTapHabitDay,
  useUntapHabitDay,
  useUpdateHabit,
  type HabitRow,
  type HabitValues,
} from '@/api/habits';
import { useReceipts } from '@/api/queries';
import { ReceiptRow } from '@/components/receipts/receipt-row';
import { refusedForPro } from '@/lib/pro-refusal';

/**
 * The habit hooks over a small stateful database, so requests can be held and several can be out at
 * once: a tap and a removal in flight together, a lapsed account's writes, and a deleted habit's
 * receipts. The fake keeps what is written and answers like PostgREST does for the shapes the hooks
 * ask for (filters, the habit embed that no archive state filters, the unique day index, and the
 * Pro wall on a new habit).
 */

type Row = Record<string, unknown>;
type Filter =
  | { kind: 'eq' | 'is' | 'not'; column: string; value: unknown }
  | { kind: 'or'; expression: string };
type Order = { column: string; ascending: boolean };
type Table = 'receipts' | 'habits';
type Request = {
  table: Table;
  op: 'select' | 'insert' | 'update' | 'delete';
  columns: string;
  count: boolean;
  payload?: Row;
  filters: Filter[];
  orders: Order[];
  range?: [number, number];
  limit?: number;
  single: boolean;
  maybe: boolean;
};

const mockDb: { receipts: Row[]; habits: Row[] } = { receipts: [], habits: [] };
const mockRequests: Request[] = [];
/** A promise a write waits on before it touches the database. */
const mockHold: { insert?: Promise<void>; delete?: Promise<void> } = {};
let mockFail: { delete?: boolean } = {};
let mockIsPro = true;
let mockNextId = 1;

jest.mock('@/lib/supabase', () => {
  const build = (table: 'receipts' | 'habits') => {
    const request: Request = {
      table,
      op: 'select',
      columns: '',
      count: false,
      filters: [],
      orders: [],
      single: false,
      maybe: false,
    };
    mockRequests.push(request);

    /**
     * The one `or` the tap reader writes, a keyset step: after (day, id) in that order. Anything
     * else is refused loudly, so a changed read cannot pass for a working one.
     */
    const after = (row: Row, expression: string) => {
      const found =
        /^purchased_on\.gt\.([^,]+),and\(purchased_on\.eq\.([^,]+),id\.gt\.([^)]+)\)$/.exec(
          expression,
        );
      if (!found) throw new Error(`The fake database does not read: ${expression}`);
      const [, day, sameDay, id] = found;
      return (
        String(row.purchased_on) > day ||
        (String(row.purchased_on) === sameDay && String(row.id) > id)
      );
    };

    const matches = (row: Row) =>
      request.filters.every((filter) => {
        if (filter.kind === 'or') return after(row, filter.expression);
        const value = row[filter.column] ?? null;
        if (filter.kind === 'eq') return row[filter.column] === filter.value;
        if (filter.kind === 'is') return value === filter.value;
        return value !== filter.value;
      });

    const compare = (a: Row, b: Row) => {
      for (const { column, ascending } of request.orders) {
        const left = a[column] ?? '';
        const right = b[column] ?? '';
        const sign =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right));
        if (sign !== 0) return ascending ? sign : -sign;
      }
      return 0;
    };

    const run = async (): Promise<Row> => {
      const rows = mockDb[request.table];
      if (request.op === 'insert') {
        if (request.table === 'receipts') {
          await mockHold.insert;
          const clash = rows.some(
            (row) =>
              request.payload?.habit_id &&
              row.habit_id === request.payload.habit_id &&
              row.purchased_on === request.payload.purchased_on,
          );
          if (clash) {
            return { data: null, error: { code: '23505', message: 'duplicate key value' } };
          }
        } else if (!mockIsPro) {
          return {
            data: null,
            error: { code: 'P0001', message: 'Tracking spending habits is part of Skip Pro.' },
          };
        }
        const row = { id: `new-${mockNextId++}`, archived_at: null, ...request.payload };
        rows.push(row);
        return { data: request.single ? { ...row } : [row], error: null };
      }
      if (request.op === 'update') {
        const hit = rows.filter(matches);
        for (const row of hit) Object.assign(row, request.payload);
        return { data: hit.map((row) => ({ id: row.id })), error: null };
      }
      if (request.op === 'delete') {
        await mockHold.delete;
        if (mockFail.delete) return { data: null, error: { code: '42501', message: 'denied' } };
        // In place: a write still held holds this same array.
        for (let at = rows.length - 1; at >= 0; at -= 1) {
          if (matches(rows[at])) rows.splice(at, 1);
        }
        return { data: null, error: null };
      }

      let hit = rows.filter(matches).sort(compare);
      const count = hit.length;
      if (request.range) hit = hit.slice(request.range[0], request.range[1] + 1);
      if (request.limit !== undefined) hit = hit.slice(0, request.limit);
      // The embed reads the habit whatever state it is in: no filter on `habits(...)` hides an
      // archived one, which is how a deleted habit's receipts keep its icon and name.
      const embed = request.columns.includes('habit:habits(');
      const shaped = hit.map((row) => {
        if (request.table !== 'receipts' || !embed) return row;
        const owner = mockDb.habits.find((habit) => habit.id === row.habit_id);
        return {
          ...row,
          habit: owner ? { name: owner.name, icon_id: owner.icon_id, color: owner.color } : null,
          brands: null,
        };
      });
      if (request.single || request.maybe) {
        return shaped.length
          ? { data: shaped[0], error: null }
          : request.maybe
            ? { data: null, error: null }
            : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
      }
      return { data: shaped, error: null, count: request.count ? count : null };
    };

    const builder: Record<string, unknown> = {
      select: (columns: string, options?: { count?: string }) => {
        request.columns = columns;
        request.count = Boolean(options?.count);
        return builder;
      },
      insert: (payload: Row) => {
        request.op = 'insert';
        request.payload = payload;
        return builder;
      },
      update: (payload: Row) => {
        request.op = 'update';
        request.payload = payload;
        return builder;
      },
      delete: () => {
        request.op = 'delete';
        return builder;
      },
      eq: (column: string, value: unknown) => {
        request.filters.push({ kind: 'eq', column, value });
        return builder;
      },
      is: (column: string, value: unknown) => {
        request.filters.push({ kind: 'is', column, value });
        return builder;
      },
      not: (column: string, _operator: string, value: unknown) => {
        request.filters.push({ kind: 'not', column, value });
        return builder;
      },
      or: (expression: string) => {
        request.filters.push({ kind: 'or', expression });
        return builder;
      },
      order: (column: string, options?: { ascending?: boolean }) => {
        request.orders.push({ column, ascending: options?.ascending ?? true });
        return builder;
      },
      limit: (count: number) => {
        request.limit = count;
        return builder;
      },
      range: (from: number, to: number) => {
        request.range = [from, to];
        return builder;
      },
      single: () => {
        request.single = true;
        return builder;
      },
      maybeSingle: () => {
        request.maybe = true;
        return builder;
      },
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        run().then(resolve, reject),
    };
    return builder;
  };
  return {
    supabase: {
      from: (table: 'receipts' | 'habits') => build(table),
      rpc: async () => ({ data: null, error: null }),
      auth: { getUser: async () => ({ data: { user: null } }) },
    },
  };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
// A lapsed account, whatever the test: nothing a habit write does may depend on this.
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: false, ready: true }) }));

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
const mockHabitIcon = jest.fn();
jest.mock('@/components/habits/habit-icon', () => ({
  HabitIcon: (props: object) => {
    mockHabitIcon(props);
    return null;
  },
}));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333' }),
  useMoneyColor: () => () => '#000000',
}));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const COFFEE: HabitRow = {
  id: 'coffee',
  name: 'Coffee',
  icon_id: 'food-dining/coffee',
  color: 'caramel',
  price: 5,
  category_id: 'dining',
  card_id: 'card-1',
  bank_account_id: null,
  preset_id: 'coffee',
  started_on: '2026-10-05',
  saved_from: '2026-10-05',
  sort_order: 0,
  archived_at: null,
  created_at: '2026-10-05T08:00:00Z',
};

const habitReceipt = (id: string, day: string, amount = 5): Row => ({
  id,
  brand_id: null,
  merchant: 'Coffee',
  amount,
  purchased_on: day,
  category_id: 'dining',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  source: 'habit',
  image_path: null,
  created_at: `${day}T08:00:00Z`,
  habit_id: 'coffee',
});

const BAKERY: Row = {
  id: 'bakery',
  brand_id: null,
  merchant: 'Bakery',
  amount: 6,
  purchased_on: '2026-10-06',
  category_id: 'dining',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  source: 'manual',
  image_path: null,
  created_at: '2026-10-06T09:00:00Z',
  habit_id: null,
};

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

const taps = (result: { current: { taps: { data?: { day: string }[] } } }) =>
  (result.current.taps.data ?? []).map((tap) => tap.day).sort();

beforeEach(() => {
  mockRequests.length = 0;
  mockDb.habits = [{ ...COFFEE }];
  mockDb.receipts = [];
  delete mockHold.insert;
  delete mockHold.delete;
  mockFail = {};
  mockIsPro = true;
  mockNextId = 1;
  mockHabitIcon.mockClear();
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
});

/** Until the mutations' own state and the refreshes they asked for have landed. */
async function idle() {
  // A mutation reports its state a tick after it answers, and that may start a refresh.
  for (let tick = 0; tick < 3; tick += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  while (client.isFetching() > 0) await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * act() that stays open until the client is quiet, so nothing React Query reports lands between
 * two awaits of a test, outside act. A request held on purpose may still be out: it is not waited on.
 */
async function settle(work: () => Promise<void> | void) {
  await act(async () => {
    await work();
    await idle();
  });
}

// A refresh that follows the last assertion lands here, inside act, not in the next test.
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

describe('a tap and a removal in flight together', () => {
  const mount = () =>
    renderHook(() => ({ tap: useTapHabitDay(), untap: useUntapHabitDay(), taps: useHabitTaps() }), {
      wrapper,
    });

  it('answer on their own: the tap lands while the removal is still out, and the read follows both', async () => {
    mockDb.receipts = [habitReceipt('r-mon', '2026-10-05')];
    const { result } = await mount();
    await waitFor(() => expect(taps(result)).toEqual(['2026-10-05']));

    const gate = deferred();
    mockHold.delete = gate.promise;
    let removal!: Promise<unknown>;
    await settle(async () => {
      removal = result.current.untap.mutateAsync('r-mon');
    });

    let filed!: { receiptId: string | null; alreadyTapped: boolean };
    await settle(async () => {
      filed = await result.current.tap.mutateAsync({ habit: COFFEE, day: '2026-10-06' });
    });
    expect(filed.alreadyTapped).toBe(false);
    // Monday's receipt is still there: the removal has not been answered.
    expect(mockDb.receipts.map((row) => row.purchased_on)).toEqual(['2026-10-05', '2026-10-06']);

    await settle(async () => {
      gate.release();
      await removal;
    });
    expect(mockDb.receipts.map((row) => row.purchased_on)).toEqual(['2026-10-06']);
    await waitFor(() => expect(taps(result)).toEqual(['2026-10-06']));
  });

  it('files, removes and files the same day again, each by the id the read gave it', async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.taps.isSuccess).toBe(true));

    let first!: { receiptId: string | null };
    await settle(async () => {
      first = await result.current.tap.mutateAsync({ habit: COFFEE, day: '2026-10-06' });
    });
    await waitFor(() => expect(taps(result)).toEqual(['2026-10-06']));
    const read = result.current.taps.data![0];
    expect(read.receiptId).toBe(first.receiptId);
    expect(read.amount).toBe(5);

    await settle(async () => {
      await result.current.untap.mutateAsync(read.receiptId);
    });
    await waitFor(() => expect(taps(result)).toEqual([]));
    expect(mockDb.receipts).toEqual([]);

    let again!: { receiptId: string | null; alreadyTapped: boolean };
    await settle(async () => {
      again = await result.current.tap.mutateAsync({ habit: COFFEE, day: '2026-10-06' });
    });
    expect(again.alreadyTapped).toBe(false);
    expect(again.receiptId).not.toBe(first.receiptId);
    await waitFor(() => expect(taps(result)).toEqual(['2026-10-06']));
    expect(mockDb.receipts).toHaveLength(1);
  });

  it('files one receipt for two taps on a day at once, and the second is told it was already there', async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.taps.isSuccess).toBe(true));

    let answers!: { receiptId: string | null; alreadyTapped: boolean }[];
    await settle(async () => {
      answers = await Promise.all([
        result.current.tap.mutateAsync({ habit: COFFEE, day: '2026-10-07' }),
        result.current.tap.mutateAsync({ habit: COFFEE, day: '2026-10-07' }),
      ]);
    });

    expect(mockDb.receipts).toHaveLength(1);
    expect(answers.map((answer) => answer.alreadyTapped)).toEqual([false, true]);
    // The second found the first's receipt, so an undo from either would remove the same one.
    expect(answers[1].receiptId).toBe(answers[0].receiptId);
    expect(answers[0].receiptId).toBe(mockDb.receipts[0].id);
  });

  it('cannot remove a receipt its tap has not written yet, so the day must be held until it has', async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.taps.isSuccess).toBe(true));

    const gate = deferred();
    mockHold.insert = gate.promise;
    let filing!: Promise<{ receiptId: string | null }>;
    await settle(async () => {
      filing = result.current.tap.mutateAsync({ habit: COFFEE, day: '2026-10-06' });
    });

    // A removal by any id now deletes nothing and still reports done, as any delete does.
    await settle(async () => {
      await result.current.untap.mutateAsync('not-yet');
    });
    expect(mockDb.receipts).toEqual([]);

    await settle(async () => {
      gate.release();
      await filing;
    });
    expect(mockDb.receipts.map((row) => row.purchased_on)).toEqual(['2026-10-06']);
  });

  it('removes only a habit’s receipt, whatever id it is handed', async () => {
    mockDb.receipts = [habitReceipt('r-mon', '2026-10-05'), BAKERY];
    const { result } = await mount();
    await waitFor(() => expect(taps(result)).toEqual(['2026-10-05']));

    await settle(async () => {
      await result.current.untap.mutateAsync('bakery');
    });
    expect(mockDb.receipts.map((row) => row.id)).toEqual(['r-mon', 'bakery']);

    await settle(async () => {
      await result.current.untap.mutateAsync('r-mon');
    });
    expect(mockDb.receipts.map((row) => row.id)).toEqual(['bakery']);
  });

  it('refreshes once for the tap that worked, and not for the removal that was refused', async () => {
    mockDb.receipts = [habitReceipt('r-mon', '2026-10-05')];
    const { result } = await mount();
    await waitFor(() => expect(taps(result)).toEqual(['2026-10-05']));
    const refresh = jest.spyOn(client, 'invalidateQueries');

    mockFail = { delete: true };
    await settle(async () => {
      const [removal, filing] = await Promise.allSettled([
        result.current.untap.mutateAsync('r-mon'),
        result.current.tap.mutateAsync({ habit: COFFEE, day: '2026-10-06' }),
      ]);
      expect(removal.status).toBe('rejected');
      expect(filing.status).toBe('fulfilled');
    });

    expect(refresh.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      ['habits'],
      ['receipts'],
      ['receipt'],
      ['dashboard'],
    ]);
    // Monday's receipt survived, Tuesday's was filed.
    expect(mockDb.receipts.map((row) => row.purchased_on).sort()).toEqual([
      '2026-10-05',
      '2026-10-06',
    ]);
  });
});

describe('an account whose Pro has lapsed', () => {
  const VALUES: HabitValues = {
    name: 'Tea',
    icon_id: 'food-dining/coffee',
    color: 'green',
    price: 3.5,
    category_id: 'dining',
    card_id: null,
    bank_account_id: null,
    preset_id: null,
    started_on: '2026-10-05',
    saved_from: '2026-10-09',
  };

  beforeEach(() => {
    mockIsPro = false;
  });

  it('can still tap, untap, edit and delete a habit it has', async () => {
    mockDb.receipts = [habitReceipt('r-mon', '2026-10-05')];
    const { result } = await renderHook(
      () => ({
        tap: useTapHabitDay(),
        untap: useUntapHabitDay(),
        update: useUpdateHabit(),
        archive: useArchiveHabit(),
      }),
      { wrapper },
    );

    await settle(async () => {
      await result.current.tap.mutateAsync({ habit: COFFEE, day: '2026-10-06' });
    });
    expect(mockDb.receipts).toHaveLength(2);

    await settle(async () => {
      await result.current.untap.mutateAsync('r-mon');
    });
    expect(mockDb.receipts.map((row) => row.purchased_on)).toEqual(['2026-10-06']);

    await settle(async () => {
      await result.current.update.mutateAsync({
        id: 'coffee',
        values: { price: 4.25, name: 'Flat white' },
      });
    });
    expect(mockDb.habits[0]).toMatchObject({ name: 'Flat white', price: 4.25 });

    await settle(async () => {
      await result.current.archive.mutateAsync('coffee');
    });
    expect(typeof mockDb.habits[0].archived_at).toBe('string');
  });

  it('is refused only at starting one, with the Pro wall’s own words', async () => {
    const { result } = await renderHook(() => useCreateHabit(), { wrapper });

    let thrown: unknown;
    await settle(async () => {
      try {
        await result.current.mutateAsync(VALUES);
      } catch (error) {
        thrown = error;
      }
      // React Query reports a failed mutation's state on the next tick; let it land in here too.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(refusedForPro(thrown)).toBe(true);
    expect(mockDb.habits.map((row) => row.id)).toEqual(['coffee']);

    mockIsPro = true;
    await settle(async () => {
      await result.current.mutateAsync(VALUES);
    });
    expect(mockDb.habits.map((row) => row.name)).toEqual(['Coffee', 'Tea']);
  });
});

describe('deleting a habit that has receipts', () => {
  beforeEach(() => {
    mockDb.receipts = [
      habitReceipt('r-mon', '2026-10-05'),
      habitReceipt('r-wed', '2026-10-07', 4.5),
      BAKERY,
    ];
  });

  const mountAll = () =>
    renderHook(
      () => ({
        archive: useArchiveHabit(),
        habits: useHabits(),
        habit: useHabit('coffee'),
        taps: useHabitTaps(),
        receipts: useReceipts(),
      }),
      { wrapper },
    );

  const habitOf = (rows: Row[] | undefined, id: string) =>
    (rows as { id: string; habit?: unknown }[] | undefined)?.find((row) => row.id === id)?.habit;

  it('archives the card and writes to nothing else, so no receipt is touched', async () => {
    const before = JSON.parse(JSON.stringify(mockDb.receipts));
    const { result } = await mountAll();
    await waitFor(() => expect(result.current.receipts.isSuccess).toBe(true));
    mockRequests.length = 0;

    await settle(async () => {
      await result.current.archive.mutateAsync('coffee');
    });

    const writes = mockRequests.filter((request) => request.op !== 'select');
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ table: 'habits', op: 'update' });
    expect(Object.keys(writes[0].payload!)).toEqual(['archived_at']);
    expect(writes[0].filters).toEqual([
      { kind: 'eq', column: 'id', value: 'coffee' },
      { kind: 'is', column: 'archived_at', value: null },
    ]);
    expect(mockRequests.some((request) => request.op === 'delete')).toBe(false);
    expect(mockDb.receipts).toEqual(before);
  });

  it('leaves the dashboard, keeps the page that receipts lead to, and keeps every tap', async () => {
    const { result } = await mountAll();
    await waitFor(() => expect(result.current.habits.data).toHaveLength(1));
    await waitFor(() => expect(result.current.taps.data).toHaveLength(2));

    await settle(async () => {
      await result.current.archive.mutateAsync('coffee');
    });

    // Refreshed by the archive itself, with no help from the test.
    await waitFor(() => expect(result.current.habits.data).toEqual([]));
    await waitFor(() => expect(result.current.habit.data?.archived_at).toEqual(expect.any(String)));
    expect(result.current.habit.data).toMatchObject({ id: 'coffee', name: 'Coffee', price: 5 });
    expect(result.current.taps.data).toEqual([
      { habitId: 'coffee', day: '2026-10-05', amount: 5, receiptId: 'r-mon' },
      { habitId: 'coffee', day: '2026-10-07', amount: 4.5, receiptId: 'r-wed' },
    ]);
  });

  it('keeps each receipt’s name, amount and the habit’s icon and colour in the list', async () => {
    const { result } = await mountAll();
    await waitFor(() => expect(result.current.receipts.isSuccess).toBe(true));
    const mark = { name: 'Coffee', icon_id: 'food-dining/coffee', color: 'caramel' };
    expect(habitOf(result.current.receipts.data, 'r-mon')).toEqual(mark);

    await settle(async () => {
      await result.current.archive.mutateAsync('coffee');
    });
    await waitFor(() => expect(result.current.habits.data).toEqual([]));
    await waitFor(() => expect(result.current.receipts.isSuccess).toBe(true));

    const list = result.current.receipts.data!;
    expect(list).toHaveLength(3);
    for (const [id, amount] of [
      ['r-mon', 5],
      ['r-wed', 4.5],
    ] as const) {
      const row = list.find((entry) => entry.id === id)!;
      expect(row).toMatchObject({ merchant: 'Coffee', amount, habit_id: 'coffee' });
      expect(row.habit).toEqual(mark);
    }
    // The store's own receipt never belonged to the habit and still does not.
    expect(list.find((entry) => entry.id === 'bakery')).toMatchObject({ habit: null });
  });

  it('draws the receipts list row with the icon, name and price, as before the delete', async () => {
    const { result } = await mountAll();
    await settle(async () => {
      await result.current.archive.mutateAsync('coffee');
    });
    await waitFor(() => expect(result.current.habits.data).toEqual([]));
    await waitFor(() =>
      expect(habitOf(result.current.receipts.data, 'r-wed')).toMatchObject({ name: 'Coffee' }),
    );

    const row = result.current.receipts.data!.find((entry) => entry.id === 'r-wed')!;
    const screen = await render(
      <ReceiptRow
        merchant={row.merchant}
        amount={row.amount}
        date={row.purchased_on}
        habit={row.habit}
        sourceLabel="VISA ••4821"
      />,
    );

    expect(mockHabitIcon).toHaveBeenCalledWith({
      iconId: 'food-dining/coffee',
      color: 'caramel',
      size: 40,
    });
    expect(screen.getByLabelText('Coffee, -$4.50, paid with VISA ••4821')).toBeTruthy();
  });
});
