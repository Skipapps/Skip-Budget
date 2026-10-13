import { render } from '@testing-library/react-native';

import HabitDetailScreen from '@/app/habit/[id]';
import HabitsScreen from '@/app/habits';
import { habitMaths, type HabitRow } from '@/api/habits';
import { resetLocaleForTests } from '@/i18n/store';
import { formatCurrency } from '@/lib/format';
import { savedAllTime, stoppedOnDay, type HabitTap } from '@/lib/habit-week';

/**
 * Saved so far on the Habits page's hero is each habit's own Saved so far on its View details page,
 * added up, to the cent. Both real pages are drawn on the same habits and receipts on days across a
 * week and the next Monday; only the reads are fakes.
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
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null, SkeletonList: () => null }));
jest.mock('@/components/habits/habit-icon', () => ({ HabitIcon: () => null }));
jest.mock('@/providers/theme-provider', () => {
  const colors = {
    ink: '#111111',
    muted: '#6F6F6F',
    line: '#E5E1DC',
    accentInk: '#905479',
    onControl: '#FFFFFF',
  };
  return {
    useColors: () => colors,
    useTheme: () => ({ scheme: 'light', colors }),
    useMoneyColor: () => () => '#000000',
  };
});

let mockToday = '2026-10-09';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/api/history', () => ({
  useHistoryFloor: () => ({ floor: '2019-10-09', free: false }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn() }));
jest.mock('@/providers/toast-context', () => ({ useToast: () => jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'owner' }));
jest.mock('@/api/queries', () => ({
  usePaymentSources: () => ({ sources: [{ id: 'card-1', label: 'Visa ••4242' }] }),
}));
jest.mock('@/api/payment-labels', () => ({
  usePaymentLabels: () => ({
    sources: [{ id: 'card-1', label: 'Visa ••4242' }],
    labelOf: (id: string) => (id === 'card-1' ? 'Visa ••4242' : null),
    isLoading: false,
  }),
}));
jest.mock('@/api/brands', () => ({
  useSpendCategories: () => ({ data: [{ id: 'dining', label: 'Dining' }] }),
}));

let mockActive: HabitRow[] = [];
let mockStopped: HabitRow[] = [];
let mockEvery: HabitRow[] = [];
let mockTaps: HabitTap[] = [];
const answer = <T,>(data: T) => ({ data, isPending: false, isError: false, refetch: jest.fn() });
jest.mock('@/api/habits', () => ({
  ...jest.requireActual('@/api/habits'),
  useHabits: () => answer(mockActive),
  useStoppedHabits: () => answer(mockStopped),
  useHabit: (id: string) => answer(mockEvery.find((row) => row.id === id) ?? null),
  useHabitTaps: () => answer(mockTaps),
  useTapHabitDay: () => ({ mutateAsync: jest.fn() }),
  useUntapHabitDay: () => ({ mutateAsync: jest.fn() }),
}));

const habit = (over: Partial<HabitRow>): HabitRow => ({
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
  ...over,
});

const tap = (habitId: string, day: string, amount: number, id = `${habitId}-${day}`): HabitTap => ({
  habitId,
  day,
  amount,
  receiptId: `r-${id}`,
});

const ACTIVE = [
  habit({}),
  habit({
    id: 'delivery',
    name: 'Food delivery',
    price: 25,
    started_on: '2026-09-28',
    saved_from: '2026-09-28',
    sort_order: 1,
  }),
  // Made on a Wednesday: it counts from that day.
  habit({
    id: 'timhortons',
    name: 'Tim Hortons',
    price: 8,
    started_on: '2026-10-05',
    saved_from: '2026-10-07',
    sort_order: 2,
  }),
  habit({
    id: 'snacks',
    name: 'Snacks',
    price: 2.35,
    started_on: '2026-08-31',
    saved_from: '2026-09-02',
    sort_order: 3,
  }),
];

/** Stopped with Keep past days at 9 pm local on Thursday 1 Oct; its receipts stay. */
const STOPPED = habit({
  id: 'lunch',
  name: 'Lunch out',
  price: 12.4,
  started_on: '2026-09-14',
  saved_from: '2026-09-16',
  sort_order: 4,
  archived_at: new Date(2026, 9, 1, 21, 0).toISOString(),
});

const TAPS = [
  tap('coffee', '2026-10-05', 5),
  tap('coffee', '2026-10-07', 6.5),
  // Two receipts on one day: one day bought, not two.
  tap('coffee', '2026-10-08', 5, 'coffee-a'),
  tap('coffee', '2026-10-08', 5, 'coffee-b'),
  tap('delivery', '2026-09-29', 25),
  tap('delivery', '2026-10-06', 25),
  // Before the habit was made, and a week ahead: shown, never saved.
  tap('timhortons', '2026-10-06', 8),
  tap('timhortons', '2026-10-15', 8),
  tap('snacks', '2026-09-10', 2.35),
  tap('snacks', '2026-10-01', 2.35),
  tap('lunch', '2026-09-18', 12.4),
  tap('lunch', '2026-09-24', 12.4),
];

type Screen = Awaited<ReturnType<typeof render>>;

/** Saved so far, read off the hero's one spoken line; both pages draw the same hero. */
function heroSaved(screen: Screen): string {
  const label = screen.getByTestId('habits-hero').props.accessibilityLabel as string;
  const found = /Saved so far, (.+)\.$/.exec(label);
  if (!found) throw new Error(`No Saved so far in: ${label}`);
  return found[1];
}

/** "$1,234.56" in cents; refuses any other shape, so a misread figure cannot pass as a sum. */
function cents(figure: string): number {
  if (!/^\$\d{1,3}(,\d{3})*\.\d{2}$/.test(figure)) throw new Error(`Not dollars: ${figure}`);
  return Number(figure.replace(/[$,.]/g, ''));
}

async function detailSaved(id: string): Promise<string> {
  mockId = id;
  const screen = await render(<HabitDetailScreen />);
  const saved = heroSaved(screen);
  await screen.unmount();
  return saved;
}

beforeEach(() => {
  resetLocaleForTests();
  mockActive = ACTIVE;
  mockStopped = [STOPPED];
  mockEvery = [...ACTIVE, STOPPED];
  mockTaps = TAPS;
});

describe('Saved so far: the Habits page and each View details agree', () => {
  const DAYS = [
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
    '2026-10-08',
    '2026-10-09',
    '2026-10-10',
    '2026-10-11',
    '2026-10-12',
  ];

  it.each(DAYS)('on %s, the hero is the habits’ own pages added up, to the cent', async (today) => {
    mockToday = today;
    const screen = await render(<HabitsScreen />);
    const hero = heroSaved(screen);
    await screen.unmount();

    // A stopped habit has no page of its own (it steps back), so its part is the same sum on it alone.
    let total = cents(formatCurrency(savedAllTime([habitMaths(STOPPED)], TAPS, today)));
    for (const row of ACTIVE) total += cents(await detailSaved(row.id));
    expect(cents(hero)).toBe(total);
    expect(cents(hero)).toBe(
      cents(formatCurrency(savedAllTime([...ACTIVE, STOPPED].map(habitMaths), TAPS, today))),
    );
  });

  it('shows the hand-counted figures on Friday 9 Oct', async () => {
    mockToday = '2026-10-09';
    // Coffee: 5 to 8 Oct, three bought: 1 x $5.00. Food delivery: 28 Sep to 8 Oct, two bought:
    // 9 x $25.00. Tim Hortons: 7 and 8 Oct: 2 x $8.00. Snacks: 2 Sep to 8 Oct is 37 days, two
    // bought: 35 x $2.35.
    expect(await detailSaved('coffee')).toBe('$5.00');
    expect(await detailSaved('delivery')).toBe('$225.00');
    expect(await detailSaved('timhortons')).toBe('$16.00');
    expect(await detailSaved('snacks')).toBe('$82.25');

    // Lunch out, stopped on 1 Oct: 16 to 30 Sep, the 18th and the 24th bought: 13 x $12.40.
    expect(savedAllTime([habitMaths(STOPPED)], TAPS, '2026-10-09')).toBe(161.2);
    const screen = await render(<HabitsScreen />);
    expect(heroSaved(screen)).toBe('$489.45');
    await screen.unmount();
  });

  it('has no View details for the stopped habit: its page steps back out', async () => {
    const { router } = jest.requireMock('expo-router');
    mockId = 'lunch';
    const screen = await render(<HabitDetailScreen />);
    expect(screen.queryByTestId('habits-hero')).toBeNull();
    expect(router.back).toHaveBeenCalled();
    await screen.unmount();
  });

  it('gives a stopped habit the Saved so far it had when it stopped, by the same sum', () => {
    // 16 to 30 Sep is 15 days, the 18th and the 24th bought: 13 x $12.40 = $161.20, on the stop
    // day and every day after.
    const stopped = habitMaths(STOPPED);
    expect(stopped.stoppedOn).toBe(stoppedOnDay(STOPPED.archived_at));
    expect(stopped.stoppedOn).toBe('2026-10-01');
    for (const today of ['2026-10-01', ...DAYS, '2027-01-04']) {
      expect([today, savedAllTime([stopped], TAPS, today)]).toEqual([today, 161.2]);
    }
    // With the running ones on Friday 9 Oct: $328.25 + $161.20.
    expect(savedAllTime([...ACTIVE.map(habitMaths), stopped], TAPS, '2026-10-09')).toBe(489.45);
  });
});
