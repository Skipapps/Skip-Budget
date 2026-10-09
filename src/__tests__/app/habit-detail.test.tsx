import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import HabitDetailScreen from '@/app/habit/[id]';
import type { HabitRow } from '@/api/habits';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import type { HabitTap } from '@/lib/habit-week';

/**
 * A habit's own page: what it is and how it is paid, this week's days (live), what it has cost and
 * saved, and every receipt it filed. The pencil opens the edit page; a deleted or missing habit
 * steps back out.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

let mockId = 'coffee';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: mockId }),
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), success: jest.fn(), warn: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/components/ui/skeleton', () => {
  const { View } = jest.requireActual('react-native');
  return { SkeletonList: ({ rows }: { rows: number }) => <View testID={`skeleton-${rows}`} /> };
});
const mockIcon = jest.fn();
jest.mock('@/components/habits/habit-icon', () => ({
  HabitIcon: (props: object) => {
    mockIcon(props);
    return null;
  },
}));

const COLORS = { ink: '#111111', muted: '#6F6F6F', line: '#E5E1DC', accentInk: '#905479' };
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => COLORS,
  useTheme: () => ({ scheme: 'light', colors: COLORS }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-09', todayDate: new Date('2026-10-09T00:00:00') }),
}));

let mockFloor = { floor: '2019-10-09', free: false };
jest.mock('@/api/history', () => ({ useHistoryFloor: () => mockFloor }));
const mockConfirm = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));
jest.mock('@/providers/toast-context', () => ({ useToast: () => jest.fn() }));

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

const tap = (day: string, amount = 5, habitId = 'coffee'): HabitTap => ({
  habitId,
  day,
  amount,
  receiptId: `r-${day}`,
});

const receipt = (id: string, purchased_on: string, extra: Record<string, unknown> = {}) => ({
  id,
  brand_id: null,
  merchant: 'Coffee',
  amount: 5,
  purchased_on,
  category_id: 'dining',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  source: 'habit',
  image_path: null,
  habit_id: 'coffee',
  habit: { name: 'Coffee', icon_id: 'food-dining/coffee', color: 'caramel' },
  ...extra,
});

const RECEIPTS = [
  receipt('r-2026-10-05', '2026-10-05'),
  receipt('r-2026-10-07', '2026-10-07', { amount: 6.5 }),
  // A store that happens to share the name, and another habit's receipt: neither belongs here.
  receipt('r-shop', '2026-10-08', { habit_id: null, habit: null, source: 'manual' }),
  receipt('r-tea', '2026-10-08', { habit_id: 'tea', merchant: 'Tea' }),
];

type Query<T> = { data: T; isPending: boolean; isError: boolean; refetch: jest.Mock };
const query = <T,>(data: T): Query<T> => ({
  data,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
});

let mockHabit: Query<HabitRow | null | undefined>;
let mockTaps: Query<HabitTap[] | undefined>;
let mockReceipts: Query<unknown[] | undefined>;
const mockTapDay = jest.fn();
jest.mock('@/api/habits', () => ({
  useHabit: () => mockHabit,
  useHabitTaps: () => mockTaps,
  useTapHabitDay: () => ({ mutateAsync: mockTapDay }),
  useUntapHabitDay: () => ({ mutateAsync: jest.fn() }),
  habitMaths: (row: HabitRow) => ({
    id: row.id,
    price: row.price,
    startedOn: row.started_on,
    savedFrom: row.saved_from,
  }),
}));
jest.mock('@/api/queries', () => ({
  useReceipts: () => mockReceipts,
  usePaymentSources: () => ({ sources: [{ id: 'card-1', label: 'Visa ••4242' }] }),
}));
jest.mock('@/api/brands', () => ({
  useSpendCategories: () => ({ data: [{ id: 'dining', label: 'Dining' }] }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockTapDay.mockReset();
  resetLocaleForTests();
  mockId = 'coffee';
  mockFloor = { floor: '2019-10-09', free: false };
  mockHabit = query<HabitRow | null | undefined>(COFFEE);
  // The Wednesday receipt was edited to $6.50; the taps carry each receipt's own amount.
  mockTaps = query<HabitTap[] | undefined>([
    tap('2026-10-05'),
    tap('2026-10-07', 6.5),
    tap('2026-10-08', 3, 'tea'),
  ]);
  mockReceipts = query<unknown[] | undefined>(RECEIPTS);
});
afterAll(() => resetLocaleForTests());

describe('a habit’s page', () => {
  it('shows the habit’s price and how it is paid, with its icon and no logo', async () => {
    const screen = await render(<HabitDetailScreen />);

    expect(screen.getByText('$5.00')).toBeTruthy();
    expect(screen.getByText('Each time')).toBeTruthy();
    const details = within(screen.getByTestId('plan-details'));
    for (const text of [
      'Paid with',
      'Visa ••4242',
      'Category',
      'Dining & Takeout',
      'Colour',
      'Caramel',
    ]) {
      expect(details.getByText(text)).toBeTruthy();
    }
    expect(details.getByText('Started')).toBeTruthy();
    expect(details.getByText('5 Oct 2026')).toBeTruthy();
    expect(mockIcon).toHaveBeenCalledWith(
      expect.objectContaining({ iconId: 'food-dining/coffee', color: 'caramel', size: 52 }),
    );
  });

  it('says what it has cost and saved so far, and the days behind them', async () => {
    const screen = await render(<HabitDetailScreen />);
    // $5.00 + $6.50; Tuesday and Thursday skipped at $5.
    expect(screen.getByLabelText('Spent so far, $11.50')).toBeTruthy();
    expect(screen.getByLabelText('Saved so far, $10.00')).toBeTruthy();
    expect(screen.getByText('2 bought · 2 skipped')).toBeTruthy();
  });

  it('lists only this habit’s receipts, newest first, each opening its own page', async () => {
    const screen = await render(<HabitDetailScreen />);
    expect(screen.getByText('Receipts from Coffee')).toBeTruthy();
    expect(screen.getByText('2 · $11.50')).toBeTruthy();

    const list = within(screen.getByTestId('habit-receipts'));
    const dates = list.getAllByText(/^\d{1,2} Oct 2026$/).map((node) => node.props.children);
    expect(dates).toEqual(['7 Oct 2026', '5 Oct 2026']);

    await fireEvent.press(screen.getByLabelText('7 Oct 2026, -$6.50, Visa ••4242'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/receipt/[id]',
      params: { id: 'r-2026-10-07' },
    });
  });

  it('keeps this week’s days live: a tap files that day', async () => {
    mockTapDay.mockResolvedValue({ receiptId: 'r-new', alreadyTapped: false });
    const screen = await render(<HabitDetailScreen />);
    expect(screen.getByText('This week')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Coffee, Tuesday, October 6, not bought'));
    expect(mockTapDay).toHaveBeenCalledWith({ habit: COFFEE, day: '2026-10-06' });
    expect(screen.getByLabelText('Coffee, Tuesday, October 6, bought, $5.00')).toBeTruthy();
  });

  it('opens the edit page from the pencil', async () => {
    const screen = await render(<HabitDetailScreen />);
    await fireEvent.press(screen.getByLabelText('Edit Coffee'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/habit-new',
      params: { id: 'coffee' },
    });
  });

  it('shows a free account its last 90 days and says older receipts are kept', async () => {
    mockFloor = { floor: '2026-10-06', free: true };
    const screen = await render(<HabitDetailScreen />);
    const list = within(screen.getByTestId('habit-receipts'));
    expect(list.getAllByText(/^\d{1,2} Oct 2026$/).map((node) => node.props.children)).toEqual([
      '7 Oct 2026',
    ]);
    // The heading and the totals still count every receipt.
    expect(screen.getByText('2 · $11.50')).toBeTruthy();
    expect(screen.getByText('Older history is saved')).toBeTruthy();
  });

  it('says how to fill it while it has no receipts', async () => {
    mockTaps = query<HabitTap[] | undefined>([]);
    mockReceipts = query<unknown[] | undefined>([]);
    const screen = await render(<HabitDetailScreen />);
    expect(screen.getByText('No receipts yet. Tap a day you bought it.')).toBeTruthy();
    expect(screen.getByText('0 bought · 4 skipped')).toBeTruthy();
  });

  it('steps back out once the habit is deleted or gone', async () => {
    mockHabit = query<HabitRow | null | undefined>({
      ...COFFEE,
      archived_at: '2026-10-09T10:00:00Z',
    });
    await render(<HabitDetailScreen />);
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));

    mockHabit = query<HabitRow | null | undefined>(null);
    await render(<HabitDetailScreen />);
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(2));
  });

  it('says a failed read failed and tries again', async () => {
    mockHabit = { ...query<HabitRow | null | undefined>(undefined), isError: true };
    const screen = await render(<HabitDetailScreen />);
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Try again'));
    expect(mockHabit.refetch).toHaveBeenCalled();
    expect(mockTaps.refetch).toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('keeps the page when a refresh fails, with the failure line and Try again', async () => {
    mockTaps = { ...mockTaps, isError: true };
    mockHabit = { ...mockHabit, isError: true };
    const screen = await render(<HabitDetailScreen />);

    expect(screen.getByText('Each time')).toBeTruthy();
    expect(screen.getByLabelText('Spent so far, $11.50')).toBeTruthy();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Try again'));
    expect(mockHabit.refetch).toHaveBeenCalled();
    expect(mockTaps.refetch).toHaveBeenCalled();
    expect(mockReceipts.refetch).toHaveBeenCalled();
    // A habit still there is not taken for a deleted one because its refresh failed.
    expect(router.back).not.toHaveBeenCalled();
  });

  it('waits on a skeleton while loading', async () => {
    mockHabit = { ...query<HabitRow | null | undefined>(undefined), isPending: true };
    const screen = await render(<HabitDetailScreen />);
    expect(screen.getByTestId('skeleton-4')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('reads in French', async () => {
    setLanguage('fr');
    const screen = await render(<HabitDetailScreen />);
    expect(screen.getByText('Chaque fois')).toBeTruthy();
    expect(screen.getByText('Cette semaine')).toBeTruthy();
    expect(screen.getByText('2 achetés · 2 sans achat')).toBeTruthy();
    expect(screen.getByLabelText('Modifier Coffee')).toBeTruthy();
  });
});
