import { render } from '@testing-library/react-native';

import HabitsScreen from '@/app/habits';
import type { HabitRow } from '@/api/habits';
import { resetLocaleForTests } from '@/i18n/store';
import { formatCurrency } from '@/lib/format';
import type { HabitTap } from '@/lib/habit-week';
import { habitsSummary } from '@/lib/insights-sections';
import { toCents } from '@/lib/money';

/**
 * F12: Insights' Habits card says what the Habits page says. The real page is drawn on the same
 * habits and taps, on days across a week, and its hero's Saved so far and each card's saved figure
 * must be Insights' to the cent. Only the reads are fakes; the week maths is the real one.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
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
  const colors = { ink: '#111111', muted: '#6F6F6F', line: '#E5E1DC', onControl: '#FFFFFF' };
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

let mockHabits: HabitRow[] = [];
let mockTaps: HabitTap[] = [];
const answer = <T,>(data: T) => ({ data, isPending: false, isError: false, refetch: jest.fn() });
jest.mock('@/api/habits', () => ({
  ...jest.requireActual('@/api/habits'),
  useHabits: () => answer(mockHabits),
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

/** Four habits: Insights shows three, and Saved so far counts all four. */
const HABITS = [
  habit({}),
  habit({
    id: 'delivery',
    name: 'Food delivery',
    price: 25,
    started_on: '2026-09-28',
    saved_from: '2026-09-28',
    sort_order: 1,
  }),
  // Made on a Wednesday: its first week counts from that day.
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
  // An archived habit's receipt counts on neither page.
  tap('gone', '2026-10-07', 9),
];

type Screen = Awaited<ReturnType<typeof render>>;

/** The Habits page's hero, read off its spoken line. */
function heroSaved(screen: Screen): string {
  const label = screen.getByTestId('habits-hero').props.accessibilityLabel as string;
  const found = /Saved so far, (.+)\.$/.exec(label);
  if (!found) throw new Error(`No Saved so far in: ${label}`);
  return found[1];
}

/**
 * A card's saved figure, read off its one spoken summary. A card whose habit counts from a later
 * day ("Starts Wed, Oct 7") draws no figure: it has saved nothing.
 */
function cardSaved(screen: Screen, id: string): string {
  const label = screen.getByTestId(`habit-summary-${id}`).props.accessibilityLabel as string;
  const found = /([^ ]+) saved\./.exec(label);
  if (found) return found[1];
  if (/Starts /.test(label)) return formatCurrency(0);
  throw new Error(`No saved figure in: ${label}`);
}

beforeEach(() => {
  resetLocaleForTests();
  mockHabits = HABITS;
  mockTaps = TAPS;
});

describe('F12 Insights’ Habits card agrees with the Habits page', () => {
  // Monday to Sunday of the week of 5 Oct, the creation day of Tim Hortons, and the next Monday.
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

  it.each(DAYS)('on %s, to the cent', async (today) => {
    mockToday = today;
    const insights = habitsSummary(HABITS, TAPS, today);
    const screen = await render(<HabitsScreen />);

    expect(formatCurrency(insights.savedSoFar)).toBe(heroSaved(screen));
    expect(insights.count).toBe(4);
    expect(insights.rows.map((row) => row.habit.id)).toEqual(['coffee', 'delivery', 'timhortons']);
    for (const row of insights.rows) {
      expect([row.habit.id, formatCurrency(row.saved)]).toEqual([
        row.habit.id,
        cardSaved(screen, row.habit.id),
      ]);
      // Saved is the skipped days at the habit's price.
      expect(toCents(row.saved)).toBe(row.skipped * toCents(row.habit.price));
    }
    await screen.unmount();
  });

  it('reads Friday 9 Oct as the cards do: skipped days this week and what they saved', () => {
    const insights = habitsSummary(HABITS, TAPS, '2026-10-09');
    expect(insights.rows.map((row) => [row.habit.name, row.skipped, row.saved])).toEqual([
      // Mon bought, Tue skipped, Wed bought, Thu bought (twice); Friday is not over.
      ['Coffee', 1, 5],
      // Tue bought; Mon, Wed and Thu skipped.
      ['Food delivery', 3, 75],
      // Counts from Wednesday: Wed and Thu skipped; Tuesday's receipt is before it.
      ['Tim Hortons', 2, 16],
    ]);
    // Every untapped finished day since each began, Snacks included: $5.00 + 9 × $25.00 + $16.00
    // + 35 × $2.35 (2 Sep to 8 Oct, less the 10th and the 1st).
    expect(insights.savedSoFar).toBe(328.25);
  });

  it('shows the design’s line: Tim Hortons skipped once this week, $8.00', () => {
    const insights = habitsSummary(HABITS, TAPS, '2026-10-08');
    expect(insights.rows[2]).toMatchObject({ skipped: 1, saved: 8 });
  });

  it('shows fewer rows when there are fewer habits, and none with none', () => {
    expect(habitsSummary(HABITS.slice(0, 1), TAPS, '2026-10-09').rows).toHaveLength(1);
    expect(habitsSummary([], TAPS, '2026-10-09')).toEqual({ rows: [], savedSoFar: 0, count: 0 });
  });
});
