import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '@/app/(tabs)/home';

/**
 * Home when the habits read fails. Spending Habits is a tool card like the Loan Calculator: it
 * wears the PRO pill and opens the explainer only for an account known to be free with no habits,
 * and a failed read knows nothing, so the card opens the dashboard (which says plainly that it
 * could not load) and the rest of Home is exactly what it was.
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

// The two cards are read by the props they are given.
const mockCard = jest.fn();
const mockDestinations = jest.fn();
jest.mock('@/components/dashboard/balance-summary', () => ({
  BalanceSummary: (props: unknown) => {
    mockCard(props);
    return null;
  },
}));
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
jest.mock('@/components/dashboard/date-selector', () => ({ DateSelector: () => null }));
jest.mock('@/components/ui/date-picker', () => ({ DatePicker: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/habits/habit-icon', () => ({ HabitIcon: () => null }));
// Artwork imports SVGs, which Jest has no transformer for.
jest.mock('@/data/spending-categories', () => ({ spendingCategories: [] }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

let mockProStatus: { pro: boolean; ready?: boolean } = { pro: false, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockProStatus }));

/** What TanStack hands back for a useQuery, whichever state it is in. */
type HabitsRead = {
  status: 'pending' | 'error' | 'success';
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  data: unknown[] | undefined;
  error: Error | null;
  refetch: jest.Mock;
};
const read = (state: 'pending' | 'error' | 'success', data?: unknown[]): HabitsRead => ({
  status: state,
  isPending: state === 'pending',
  isError: state === 'error',
  isSuccess: state === 'success',
  data,
  error: state === 'error' ? new Error('Could not load your habits.') : null,
  refetch: jest.fn(),
});
let mockHabits: HabitsRead;
jest.mock('@/api/habits', () => ({ useHabits: () => mockHabits }));

jest.mock('@/api/news', () => ({ useHasUnreadNews: () => false }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
  useKeepSchedulesCurrent: () => {},
}));
jest.mock('@/api/charges', () => ({ useCharges: () => ({ data: [] }) }));

/** A Thursday. */
const TODAY = '2026-09-10';

const mockRecent = [
  { id: 'receipt-r1', label: 'Bakery', amount: -6, date: TODAY, kind: 'receipt' as const },
  {
    id: 'bill-b1@2026-09-09',
    label: 'Rent',
    amount: -1030,
    date: '2026-09-09',
    kind: 'bill' as const,
  },
].map((row) => ({ ...row, sourceId: 's1' }));

jest.mock('@/api/queries', () => ({
  useProfile: () => ({ data: { display_name: 'Sam' } }),
  useLedger: (range: { from: string; to: string } | undefined) => ({
    entries: range && range.from > TODAY ? [] : mockRecent,
    totals: { in: 2000, out: 1036, net: 964, count: 2 },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useCurrentBalance: () => ({
    balance: 2700,
    income: 2000,
    expenses: 100,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T09:00:00`));

const LOCKED = 'Spending Habits. Pro feature. See what skipping saves.';
const OPEN = 'Spending Habits. Opens the tool.';

beforeEach(() => {
  jest.setSystemTime(new Date(`${TODAY}T09:00:00`));
  jest.mocked(router.push).mockClear();
  mockCard.mockClear();
  mockDestinations.mockClear();
  mockProStatus = { pro: false, ready: true };
  mockHabits = read('pending');
});

type Screen = Awaited<ReturnType<typeof render>>;

/** Every button Home draws, by what a screen reader says. */
const buttons = (screen: Screen) =>
  screen.getAllByRole('button').map((node) => String(node.props.accessibilityLabel ?? ''));

/** What the cards above were handed: data only, since the refresh callback is new each render. */
const feeds = () => ({
  card: mockCard.mock.lastCall?.[0],
  month: {
    amounts: mockDestinations.mock.lastCall?.[0].amounts,
    loading: mockDestinations.mock.lastCall?.[0].loading,
    error: mockDestinations.mock.lastCall?.[0].error,
  },
});

describe('Home when the habits read fails', () => {
  it.each([
    ['free or lapsed', { pro: false, ready: true }],
    ['Pro', { pro: true, ready: true }],
    ['not yet known', { pro: false, ready: false }],
  ])('draws the card without a PRO pill and opens the dashboard: %s', async (_, status) => {
    mockProStatus = status;
    mockHabits = read('error');
    const screen = await render(<HomeScreen />);

    expect(screen.queryAllByText('PRO', { includeHiddenElements: true })).toHaveLength(0);
    expect(screen.queryByLabelText(LOCKED)).toBeNull();
    await fireEvent.press(screen.getByLabelText(OPEN));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/habits');
  });

  it('does not take a stale empty list for a free account’s answer', async () => {
    // A refetch that fails keeps the last good data, here none, and reports an error.
    mockHabits = { ...read('error', []), data: [] };
    const screen = await render(<HomeScreen />);

    expect(screen.queryByLabelText(LOCKED)).toBeNull();
    expect(screen.queryAllByText('PRO', { includeHiddenElements: true })).toHaveLength(0);
    await fireEvent.press(screen.getByLabelText(OPEN));
    expect(router.push).toHaveBeenCalledWith('/habits');
  });

  it('leaves the rest of Home exactly as a healthy read does', async () => {
    mockHabits = read('success', [{ id: 'h1' }]);
    const healthy = await render(<HomeScreen />);
    const healthyButtons = buttons(healthy);
    const healthyFeeds = feeds();
    await healthy.unmount();
    mockCard.mockClear();
    mockDestinations.mockClear();

    mockHabits = read('error');
    const failed = await render(<HomeScreen />);

    expect(buttons(failed)).toEqual(healthyButtons);
    expect(feeds()).toEqual(healthyFeeds);
    // And that is a Home with its money on it, not an empty one.
    expect(healthyFeeds.card).toMatchObject({ balance: 2700, loading: false, error: false });
    expect(failed.getByLabelText('Bakery, -$6.00, Receipt')).toBeTruthy();
    expect(failed.getByText('Where it goes')).toBeTruthy();
    expect(failed.getByText('Go further')).toBeTruthy();
  });

  it('keeps the Loan Calculator card working beside it', async () => {
    mockHabits = read('error');
    const screen = await render(<HomeScreen />);

    await fireEvent.press(screen.getByLabelText('Loan Calculator. Opens the tool.'));
    expect(router.push).toHaveBeenCalledWith('/loan-calculator');
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('puts the pill on once a later read says a free account has no habits', async () => {
    mockHabits = read('error');
    const screen = await render(<HomeScreen />);
    expect(screen.queryByLabelText(LOCKED)).toBeNull();

    mockHabits = read('success', []);
    await screen.rerender(<HomeScreen />);
    expect(screen.getByLabelText(LOCKED)).toBeTruthy();
    expect(screen.queryAllByText('PRO', { includeHiddenElements: true })).toHaveLength(1);

    // And off again if the next read fails: nothing is known, so nothing is locked.
    mockHabits = read('error');
    await screen.rerender(<HomeScreen />);
    expect(screen.queryByLabelText(LOCKED)).toBeNull();
    expect(screen.getByLabelText(OPEN)).toBeTruthy();
  });
});
