import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useCharges } from '@/api/charges';
import { usePayReceived } from '@/api/pay';
import {
  useBankAccounts,
  useBills,
  useCards,
  useLoanPayoffRows,
  useReceipts,
  useSalaryDetails,
  useSubscriptions,
} from '@/api/queries';
import HomeScreen from '@/app/(tabs)/home';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * Home after a resume on a weak network. Every mounted read refetches on a resume after 30 s; when
 * that refetch fails, TanStack keeps the last good answer cached but reports `isError`. Home must
 * keep showing those figures, not swap them for the failure line. With nothing cached it still
 * says so.
 *
 * Home's own hooks are the real ones over a fake database, so the decision is the one the app makes.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));
// The real SDK starts a cleanup interval on import that keeps Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

// The two cards above the lists are read by the props they are given. The balance card leaves a
// marker, so what is drawn straight under it can be found.
const mockCard = jest.fn();
const mockDestinations = jest.fn();
jest.mock('@/components/dashboard/balance-summary', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BalanceSummary: (props: unknown) => {
      mockCard(props);
      return createElement(View, { testID: 'balance-card' });
    },
  };
});
jest.mock('@/components/dashboard/destination-list', () => ({
  DestinationList: (props: unknown) => {
    mockDestinations(props);
    return null;
  },
}));
jest.mock('@/components/dashboard/dashboard-header', () => ({ DashboardHeader: () => null }));
jest.mock('@/components/dashboard/getting-started-card', () => ({
  GettingStartedCard: () => null,
}));
jest.mock('@/components/dashboard/insight-banner', () => ({ InsightBanner: () => null }));
jest.mock('@/components/dashboard/quick-actions', () => ({ QuickActions: () => null }));
jest.mock('@/components/dashboard/tool-cards', () => ({ ToolCards: () => null }));
jest.mock('@/components/dashboard/date-selector', () => ({ DateSelector: () => null }));
jest.mock('@/components/ui/date-picker', () => ({ DatePicker: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/habits/habit-icon', () => ({ HabitIcon: () => null }));
// Artwork imports SVGs, which Jest has no transformer for.
jest.mock('@/data/spending-categories', () => ({ spendingCategories: [] }));
jest.mock('@/theme/home-icons', () => ({
  useHomeIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/api/habits', () => ({
  useHabits: () => ({ isSuccess: true, isError: false, data: [], refetch: jest.fn() }),
}));
jest.mock('@/api/news', () => ({ useHasUnreadNews: () => false }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
  useKeepSchedulesCurrent: () => {},
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

const mockRows: Record<string, unknown[]> = {};
// Every table fails while this is on; the tables in mockFailing fail on their own.
let mockOffline = false;
const mockFailing = new Set<string>();

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const answer = () =>
      mockOffline || mockFailing.has(table)
        ? { data: null, error: new Error(`${table} is unreachable`) }
        : { data: mockRows[table] ?? [], error: null };
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      eq: () => builder,
      in: () => builder,
      maybeSingle: () => builder,
      // Awaited directly by every read in queries.ts, so the builder is its own promise.
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

/** A Thursday. */
const TODAY = '2026-09-10';

jest.useFakeTimers({
  now: new Date(`${TODAY}T09:00:00`),
  doNotFake: ['nextTick', 'setImmediate'],
});

const BAKERY = 'Bakery, -$6.00, Receipt';
const NOTE = 'Couldn’t refresh · showing your last figures';
const INTERNET = 'Internet, -$59.99, Bill';

const PROBED_READS = 9;

/**
 * How many of the reads behind Home's lists and balance TanStack says failed on a refetch with data
 * still cached, from a component beside Home on the same cache. Its observers are told in the same
 * batch as Home's, so once it counts every one, Home has drawn them too.
 */
function Reads() {
  const reads = [
    useCards(),
    useReceipts(),
    useSubscriptions(),
    useBills(),
    useSalaryDetails(),
    useCharges(),
    usePayReceived(),
    useLoanPayoffRows(),
    useBankAccounts(),
  ];
  return (
    <Text testID="refetch-errors">
      {String(reads.filter((read) => read.isRefetchError).length)}
    </Text>
  );
}

async function show() {
  const client = new QueryClient({
    // No retries: a failed read must reach isError on the first answer.
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={client}>
      <HomeScreen />
      <Reads />
    </QueryClientProvider>,
  );
  return client;
}

/** The reads TanStack holds as failed with their last answer still cached, by name. */
const failedWithData = (client: QueryClient) =>
  client
    .getQueryCache()
    .getAll()
    .filter((query) => query.state.status === 'error' && query.state.data !== undefined)
    .map((query) => String(query.queryKey[0]))
    .sort();

/** Every marker and line Home draws, top to bottom. */
function drawnInOrder(): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (node == null) return;
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const element = node as { props?: { testID?: string }; children?: unknown[] | null };
    if (element.props?.testID) out.push(`#${element.props.testID}`);
    (element.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}

/** What "Where your money went" was last handed. */
const month = () => {
  const props = mockDestinations.mock.lastCall?.[0];
  return { amounts: props?.amounts, loading: props?.loading, error: props?.error };
};

beforeEach(() => {
  mockOffline = false;
  mockFailing.clear();
  mockCard.mockClear();
  mockDestinations.mockClear();
  for (const table of Object.keys(mockRows)) delete mockRows[table];

  // $1,200.00 in checking and $300.00 owed on the card, both as of the 1st.
  mockRows.bank_accounts = [
    {
      id: 'checking',
      bank_name: 'Chase',
      nickname: 'Checking',
      account_type: 'checking',
      last4: '0042',
      color: '#222222',
      balance: 1200,
      balance_as_of: '2026-09-01',
    },
  ];
  mockRows.cards = [
    {
      id: 'visa',
      holder: 'Sam',
      network: 'Visa',
      last4: '4421',
      color: '#111111',
      balance: 300,
      balance_as_of: '2026-09-01',
      bill_due_day: null,
    },
  ];
  // Bought today from checking, so it is Recent; due on the 25th, so it is Coming up.
  mockRows.receipts = [
    {
      id: 'r1',
      brand_id: null,
      merchant: 'Bakery',
      amount: 6,
      purchased_on: TODAY,
      category_id: 'other',
      card_id: null,
      bank_account_id: 'checking',
      note: null,
      source: 'manual',
      image_path: null,
      created_at: `${TODAY}T08:00:00Z`,
      brands: null,
    },
  ];
  mockRows.bills = [
    {
      id: 'bill-1',
      name: 'Internet',
      amount: 59.99,
      category_id: 'utilities',
      icon_id: null,
      recurrence: 'monthly',
      next_due_on: '2026-09-25',
      starts_on: null,
      ends_on: null,
      card_id: null,
      bank_account_id: null,
      created_at: '2026-09-01T00:00:00Z',
      brand_id: null,
      brands: null,
    },
  ];
});

describe('Home after a failed background refetch', () => {
  it('keeps Recent, Coming up and the month figures when every read fails', async () => {
    const client = await show();
    expect(await screen.findByLabelText(BAKERY)).toBeTruthy();
    expect(screen.getByLabelText(INTERNET)).toBeTruthy();
    await waitFor(() => expect(month().loading).toBe(false));
    const before = month();
    expect(before.error).toBe(false);
    expect(before.amounts).toMatchObject({ 'monthly-bills': -59.99, receipts: -6 });

    mockOffline = true;
    await act(() => client.refetchQueries());
    await waitFor(() =>
      expect(screen.getByTestId('refetch-errors').props.children).toBe(String(PROBED_READS)),
    );

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.getByLabelText(BAKERY)).toBeTruthy();
    expect(screen.getByLabelText(INTERNET)).toBeTruthy();
    expect(month()).toEqual(before);
    // Said once, straight under the balance card.
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    const drawn = drawnInOrder();
    expect(drawn[drawn.indexOf('#balance-card') + 1]).toBe(NOTE);
  });

  it('says nothing about refreshing while every read is fresh', async () => {
    await show();
    expect(await screen.findByLabelText(BAKERY)).toBeTruthy();
    await waitFor(() => expect(mockCard.mock.lastCall?.[0]).toMatchObject({ loading: false }));

    expect(screen.queryByText(NOTE)).toBeNull();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });

  it.each([
    // A term of the balance only.
    ['cards', 1],
    // A term of the balance and of the month.
    ['receipts', 1],
    // Pay, behind the month's income and the balance.
    ['salary_sources', 1],
  ])('shows the note when only %s fails to reload behind its figures', async (table, reads) => {
    const client = await show();
    expect(await screen.findByLabelText(BAKERY)).toBeTruthy();
    await waitFor(() => expect(mockCard.mock.lastCall?.[0]).toMatchObject({ loading: false }));
    const before = { card: mockCard.mock.lastCall?.[0], month: month() };

    mockFailing.add(table);
    await act(() => client.refetchQueries());
    await waitFor(() =>
      expect(screen.getByTestId('refetch-errors').props.children).toBe(String(reads)),
    );

    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect({ card: mockCard.mock.lastCall?.[0], month: month() }).toEqual(before);
  });

  it('keeps the Current balance when every read fails', async () => {
    const client = await show();
    await waitFor(() => expect(mockCard.mock.lastCall?.[0]).toMatchObject({ loading: false }));
    const before = mockCard.mock.lastCall?.[0];
    // $1,200.00 in checking less the $6.00 Bakery receipt, less the $300.00 the card owes.
    expect(before).toMatchObject({ balance: 894, error: false });

    mockOffline = true;
    await act(() => client.refetchQueries());
    await waitFor(() =>
      expect(screen.getByTestId('refetch-errors').props.children).toBe(String(PROBED_READS)),
    );

    // Every term of the balance failed on its reload and still holds its last answer.
    expect(failedWithData(client)).toEqual(
      expect.arrayContaining([
        'bank_accounts',
        'bills',
        'cards',
        'charges',
        'payments',
        'receipts',
      ]),
    );
    expect(mockCard.mock.lastCall?.[0]).toEqual(before);
  });
});

describe('Home when the balance has nothing to show but the month does', () => {
  it('says the failure on the balance with no note beside it, and keeps the month figures', async () => {
    const client = await show();
    expect(await screen.findByLabelText(BAKERY)).toBeTruthy();
    await waitFor(() => expect(month().loading).toBe(false));
    const before = month();

    // The cards read loses its answer and fails again; the receipts read fails behind its own.
    mockFailing.add('cards');
    mockFailing.add('receipts');
    await act(() => client.refetchQueries({ queryKey: ['receipts'] }));
    await act(() => client.resetQueries({ queryKey: ['cards'] }));
    await waitFor(() => {
      expect(mockCard.mock.lastCall?.[0]).toMatchObject({ error: true });
      expect(screen.getByTestId('refetch-errors').props.children).toBe('1');
    });

    expect(month()).toEqual(before);
    // The note never sits beside a failure line, though the month's figures are the older ones.
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});

describe('Home when the reads fail with nothing cached', () => {
  it('says so in Recent, Coming up, the month figures and the balance', async () => {
    mockOffline = true;
    await show();

    // Recent and Coming up each say it once.
    expect(await screen.findAllByText(FAILURE_MESSAGE)).toHaveLength(2);
    expect(screen.queryByLabelText(BAKERY)).toBeNull();
    expect(screen.queryByLabelText(INTERNET)).toBeNull();
    expect(month().error).toBe(true);
    expect(mockCard.mock.lastCall?.[0]).toMatchObject({ error: true });
    // Nothing older is showing, so there is nothing to say about refreshing.
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});
