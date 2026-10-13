import { QueryClient, QueryClientProvider, useQueries } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import CardsScreen from '@/app/(tabs)/cards';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The Cards tab after a resume on a weak network. Every mounted read refetches on a resume after
 * 30 s; when that refetch fails, TanStack keeps the last good answer cached but reports `isError`.
 * The faces, Salary and Loans must keep those answers, not give the page over to the failure. With
 * nothing cached the page still says so.
 *
 * The page's balance, salary and loan hooks are the real ones over a fake database.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
// The real SDK starts a cleanup interval on import that keeps Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));

// The faces have tests of their own; here only the balance the page hands them matters.
const mockCardFaces: { card: { id: string; balance: number } }[] = [];
const mockAccountFaces: { account: { id: string; balance: number } }[] = [];
jest.mock('@/components/cards/payment-card', () => ({
  PaymentCard: (props: { card: { id: string; balance: number } }) => {
    mockCardFaces.push(props);
    return null;
  },
}));
jest.mock('@/components/cards/account-card', () => ({
  AccountCard: (props: { account: { id: string; balance: number } }) => {
    mockAccountFaces.push(props);
    return null;
  },
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
// Jest turns an .svg into a number, not a component; the icons have a suite of their own.
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));
// Savings and Goals keep their own rule (a failure only with nothing listed), tested elsewhere.
jest.mock('@/api/savings', () => ({
  useSavingsCore: () => ({
    pots: [{ id: 'sep' }],
    summary: { readyToUse: 850 },
    isPending: false,
    isError: false,
  }),
}));
jest.mock('@/api/goals', () => ({
  useGoals: () => ({
    goals: [],
    summary: { active: [], done: [] },
    isPending: false,
    isError: false,
  }),
}));
jest.mock('@/lib/use-today', () => ({ useToday: () => ({ today: TODAY }) }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

const mockRows: Record<string, unknown[]> = {};
// Every table fails while this is on; the tables in mockFailing fail on their own. 'salary list'
// is the page's own salary read alone: the balances read the same table with its account links.
let mockOffline = false;
const mockFailing = new Set<string>();

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    let selected = '';
    const fails = () =>
      mockOffline ||
      mockFailing.has(table) ||
      (table === 'salary_sources' &&
        mockFailing.has('salary list') &&
        !selected.includes('salary_source_accounts'));
    const answer = () =>
      fails()
        ? { data: null, error: new Error(`${table} is unreachable`) }
        : { data: mockRows[table] ?? [], error: null };
    const builder: Record<string, unknown> = {
      select: (columns: string) => {
        selected = columns;
        return builder;
      },
      order: () => builder,
      eq: () => builder,
      in: () => builder,
      maybeSingle: () => builder,
      // Awaited directly by every read, so the builder is its own promise.
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

const TODAY = '2026-09-12';

/** The reads the page decides on, by the key each is cached under. */
const KEYS = {
  cards: ['cards', 'user-1'],
  bank_accounts: ['bank_accounts', 'user-1'],
  salary_sources: ['salary_sources', 'user-1'],
  loans: ['loans', 'user-1', 'bill-ids'],
  bills: ['bills', 'user-1'],
} as const;
type Read = keyof typeof KEYS;

/**
 * How many of the given reads TanStack says failed on a refetch with data still cached. The probe's
 * observers are disabled and bring no queryFn, so every fetch runs the page's own read; they are told
 * of a change in the same batch as the page's, so once it counts every one, the page has drawn them
 * too.
 */
function Probe({ reads }: { reads: readonly Read[] }) {
  const results = useQueries({
    queries: reads.map((read) => ({ queryKey: [...KEYS[read]], enabled: false })),
  });
  return (
    <Text testID="refetch-errors">
      {String(results.filter((result) => result.isRefetchError).length)}
    </Text>
  );
}

async function show(probe: readonly Read[] = []) {
  const client = new QueryClient({
    // No retries: a failed read must reach isError on the first answer.
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={client}>
      <CardsScreen />
      <Probe reads={probe} />
    </QueryClientProvider>,
  );
  return client;
}

/** Waits for the Salary tile to draw its figure: every read the page needs has answered. */
const landed = () => waitFor(() => expect(screen.getByText('$1,880.00')).toBeTruthy());

/** Fails the given reads on a reload and waits until the page has drawn that answer. */
async function reloadFailing(client: QueryClient, reads: readonly Read[]) {
  await act(() => client.refetchQueries());
  await waitFor(() =>
    expect(screen.getByTestId('refetch-errors').props.children).toBe(String(reads.length)),
  );
}

/** What a tile draws, top to bottom. */
const linesIn = (id: string) =>
  within(screen.getByTestId(`money-tile-${id}`))
    .getAllByText(/./)
    .map((line) => line.props.children);

/** The balance each face was last handed. */
const faces = () => ({
  visa: mockCardFaces.filter((face) => face.card.id === 'visa').at(-1)?.card.balance,
  checking: mockAccountFaces.filter((face) => face.account.id === 'checking').at(-1)?.account
    .balance,
});

beforeEach(() => {
  mockOffline = false;
  mockFailing.clear();
  mockCardFaces.length = 0;
  mockAccountFaces.length = 0;
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
  // $6.00 from checking on the 10th.
  mockRows.receipts = [
    {
      id: 'r1',
      brand_id: null,
      merchant: 'Bakery',
      amount: 6,
      purchased_on: '2026-09-10',
      category_id: 'other',
      card_id: null,
      bank_account_id: 'checking',
      note: null,
      source: 'manual',
      image_path: null,
      created_at: '2026-09-10T08:00:00Z',
      brands: null,
    },
  ];
  mockRows.salary_sources = [
    {
      id: 's1',
      name: 'Acme',
      amount: 1880,
      frequency: 'monthly',
      last_payday: '2026-08-31',
      salary_source_accounts: [],
    },
  ];
  // A car loan still being paid, next due after today.
  mockRows.bills = [
    {
      id: 'loan-bill',
      name: 'Car loan',
      amount: 412.5,
      category_id: 'loan',
      icon_id: 'loan-car',
      recurrence: 'monthly',
      next_due_on: '2026-09-27',
      starts_on: '2026-01-27',
      ends_on: null,
      card_id: null,
      bank_account_id: null,
      created_at: '2026-01-01T00:00:00Z',
      brand_id: null,
      brands: null,
    },
  ];
  mockRows.loans = [{ bill_id: 'loan-bill' }];
});

describe('Cards when every read lands', () => {
  it('shows the faces, Salary and Loans, worked by hand', async () => {
    await show();
    await landed();

    expect(linesIn('salary')).toEqual(['Salary', '$1,880.00']);
    expect(linesIn('loans')).toEqual(['Loans', '1 active']);
    // Checking: $1,200.00 less the $6.00 receipt. The card has not moved.
    expect(faces()).toEqual({ visa: 300, checking: 1194 });
  });
});

describe('Cards after a failed background refetch', () => {
  it('keeps the faces, Salary and Loans when every read fails', async () => {
    const reads = Object.keys(KEYS) as Read[];
    const client = await show(reads);
    await landed();
    const before = { faces: faces(), salary: linesIn('salary'), loans: linesIn('loans') };

    mockOffline = true;
    await reloadFailing(client, reads);

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect({ faces: faces(), salary: linesIn('salary'), loans: linesIn('loans') }).toEqual(before);
  });

  it.each([
    ['the salary list alone', 'salary list', 'salary_sources', 'salary'],
    ['every salary read', 'salary_sources', 'salary_sources', 'salary'],
    ['the loans read', 'loans', 'loans', 'loans'],
  ] as const)('keeps the page when %s fails', async (_what, failing, read, tile) => {
    const client = await show([read]);
    await landed();
    const before = linesIn(tile);

    mockFailing.add(failing);
    await reloadFailing(client, [read]);

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(linesIn(tile)).toEqual(before);
  });
});

describe('Cards when a read fails with nothing cached', () => {
  it.each(['salary list', 'salary_sources', 'loans', 'cards'])(
    'gives the page over to the failure when %s fails',
    async (table) => {
      mockFailing.add(table);
      await show();

      expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
      expect(screen.queryByText('Credit cards')).toBeNull();
      expect(screen.queryByText('Add a loan')).toBeNull();
      expect(screen.queryByText('Add salary')).toBeNull();
    },
  );
});
