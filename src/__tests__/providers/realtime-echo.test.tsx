import {
  MutationObserver,
  QueryClient,
  QueryClientProvider,
  QueryObserver,
} from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { createQueryClient } from '@/providers/query-provider';
import {
  ECHO_MAX_WAIT_MS,
  ECHO_WAIT_MS,
  OWN_ECHO_WINDOW_MS,
  RealtimeProvider,
  noteOwnWrite,
  rowIdsIn,
} from '@/providers/realtime-provider';

/**
 * A change on the socket re-reads what it touches, once. A burst of rows from one save is one
 * re-read. The echo of a row this phone just wrote re-reads nothing its own refresh already read
 * after the write landed; any other row, whoever wrote it and however soon, is read again.
 */

const ROW_1 = '11111111-1111-4111-8111-111111111111';
const ROW_2 = '22222222-2222-4222-8222-222222222222';

type Listener = { table: string; onChange: (payload?: unknown) => void };
const mockListeners: Listener[] = [];
const mockChain = {
  on: (_event: string, filter: { table: string }, onChange: (payload?: unknown) => void) => {
    mockListeners.push({ table: filter.table, onChange });
    return mockChain;
  },
  subscribe: () => mockChain,
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => mockChain,
    removeChannel: async () => 'ok',
  },
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-A' }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

// Real timers: the debounce is the thing under test. A loaded machine can stretch a test past the
// default 5 s, and one that times out leaves its act() open under the next.
jest.setTimeout(30_000);

const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

/** Past the debounce, with room for the re-read to finish. */
const settle = () => wait(ECHO_WAIT_MS + 150);

/** A change arriving on the socket, for the row given (an update), or naming no row. */
const echo = (table: string, id?: string) => {
  const payload = id ? { eventType: 'UPDATE', new: { id }, old: { id } } : {};
  for (const listener of mockListeners) if (listener.table === table) listener.onChange(payload);
};

let client: QueryClient;
let reads: Record<string, number>;
let stops: (() => void)[];

/** A query some screen is showing, counting its reads. */
function show(key: string) {
  reads[key] = 0;
  const observer = new QueryObserver(client, {
    queryKey: [key, 'user-A'],
    queryFn: async () => {
      reads[key] += 1;
      return reads[key];
    },
  });
  stops.push(observer.subscribe(() => {}));
}

async function mount() {
  const view = await render(
    <QueryClientProvider client={client}>
      <RealtimeProvider>
        <Text>Home</Text>
      </RealtimeProvider>
    </QueryClientProvider>,
  );
  show('bills');
  show('loans');
  show('receipts');
  await wait(20);
  expect(reads).toEqual({ bills: 1, loans: 1, receipts: 1 });
  return view;
}

beforeEach(() => {
  mockListeners.length = 0;
  reads = {};
  stops = [];
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
});

afterEach(() => {
  for (const stop of stops) stop();
  client.clear();
});

describe('changes from elsewhere', () => {
  it('re-reads once for a burst of rows, and only the keys the table touches', async () => {
    const view = await mount();

    echo('bills');
    echo('bills');
    echo('bills');
    expect(reads.bills).toBe(1);

    await settle();
    expect(reads).toEqual({ bills: 2, loans: 2, receipts: 1 });
    await view.unmount();
  });

  it('still re-reads during a steady stream of changes', async () => {
    const view = await mount();
    const started = Date.now();
    while (Date.now() - started < ECHO_MAX_WAIT_MS + ECHO_WAIT_MS) {
      echo('receipts');
      await wait(ECHO_WAIT_MS / 2);
    }
    expect(reads.receipts).toBeGreaterThanOrEqual(2);
    await view.unmount();
  });

  it('re-reads after a change from another device', async () => {
    const view = await mount();
    echo('receipts');
    await settle();
    expect(reads.receipts).toBe(2);
    await view.unmount();
  });

  it('does nothing once the provider is gone', async () => {
    const view = await mount();
    echo('receipts');
    await view.unmount();
    await settle();
    expect(reads.receipts).toBe(1);
  });
});

describe("the echo of this phone's own write", () => {
  /** What a save does: the server answers for the row, then its onSuccess refreshes the key. */
  async function save(id: string, key = 'receipts') {
    noteOwnWrite(client, [id]);
    await act(async () => {
      await client.invalidateQueries({ queryKey: [key] });
    });
  }

  it('re-reads nothing that its own refresh read after the write landed', async () => {
    const view = await mount();
    await save(ROW_1);
    expect(reads.receipts).toBe(2);

    echo('receipts', ROW_1);
    await settle();
    expect(reads.receipts).toBe(2);
    await view.unmount();
  });

  it("re-reads another device's row that changes moments after our own write", async () => {
    const view = await mount();
    await save(ROW_1);

    echo('receipts', ROW_2);
    await settle();
    expect(reads.receipts).toBe(3);
    await view.unmount();
  });

  it('re-reads a burst that mixes our row with another', async () => {
    const view = await mount();
    await save(ROW_1);

    echo('receipts', ROW_1);
    echo('receipts', ROW_2);
    await settle();
    expect(reads.receipts).toBe(3);
    await view.unmount();
  });

  it('re-reads a change that names no row', async () => {
    const view = await mount();
    await save(ROW_1);

    echo('receipts');
    await settle();
    expect(reads.receipts).toBe(3);
    await view.unmount();
  });

  it('re-reads when a later write of ours to another row landed after the last read', async () => {
    const view = await mount();
    await save(ROW_1);
    // Written, but this key was not refreshed since.
    noteOwnWrite(client, [ROW_2], Date.now() + 5);
    await wait(10);

    echo('receipts', ROW_1);
    echo('receipts', ROW_2);
    await settle();
    expect(reads.receipts).toBe(3);
    await view.unmount();
  });

  it('still re-reads a key the write did not refresh itself', async () => {
    const view = await mount();
    // Landed after every read so far.
    noteOwnWrite(client, [ROW_1], Date.now() + 5);
    await wait(10);

    echo('bills', ROW_1);
    await settle();
    expect(reads).toEqual({ bills: 2, loans: 2, receipts: 1 });
    await view.unmount();
  });

  it('counts as ours only shortly after the write', async () => {
    const view = await mount();
    noteOwnWrite(client, [ROW_1], Date.now() - OWN_ECHO_WINDOW_MS - 1_000);
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['receipts'] });
    });
    expect(reads.receipts).toBe(2);

    echo('receipts', ROW_1);
    await settle();
    expect(reads.receipts).toBe(3);
    await view.unmount();
  });

  it("learns the rows from the app's own mutations", async () => {
    client = createQueryClient();
    const view = await mount();

    const saving = new MutationObserver(client, {
      mutationFn: async ({ id }: { id: string; amount: number }) => ({ id }),
      onSuccess: () => client.invalidateQueries({ queryKey: ['receipts'] }),
    });
    await act(async () => {
      await saving.mutate({ id: ROW_1, amount: 12.5 });
    });
    expect(reads.receipts).toBe(2);

    echo('receipts', ROW_1);
    await settle();
    expect(reads.receipts).toBe(2);

    echo('receipts', ROW_2);
    await settle();
    expect(reads.receipts).toBe(3);
    await view.unmount();
  });
});

describe('rowIdsIn', () => {
  it('takes the rows a write named, and not the ones it only points at', () => {
    const card = '33333333-3333-4333-8333-333333333333';
    expect(rowIdsIn(ROW_1, undefined)).toEqual([ROW_1]);
    expect(rowIdsIn({ id: ROW_1 }, { id: ROW_1, values: { card_id: card } })).toEqual([ROW_1]);
    expect(
      rowIdsIn(undefined, { bill: { id: ROW_2, card_id: card }, today: '2026-10-13' }),
    ).toEqual([ROW_2]);
    expect(
      rowIdsIn([{ id: ROW_1 }, ROW_2.toUpperCase()], { salaryId: ROW_1, accountIds: [card] }),
    ).toEqual([ROW_1, ROW_2]);
    expect(rowIdsIn(null, 'not-a-row', 7, { id: 'local-1' })).toEqual([]);
  });
});
