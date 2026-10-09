import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import HabitsScreen from '@/app/habits';
import type { HabitRow } from '@/api/habits';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { success, warn } from '@/lib/haptics';
import type { HabitTap } from '@/lib/habit-week';

/**
 * The habits dashboard: loading, failed, empty and full; the hero's two figures; the week
 * selector's limits; who + sends where; and a day filled and emptied, drawn before the server
 * answers and put back when it fails.
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
jest.mock('@/components/ui/skeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: () => <View testID="hero-skeleton" />,
    SkeletonList: ({ rows }: { rows: number }) => <View testID={`skeleton-${rows}`} />,
  };
});
jest.mock('@/components/habits/habit-icon', () => ({ HabitIcon: () => null }));

const COLORS = { ink: '#111111', muted: '#6F6F6F', line: '#E5E1DC', onControl: '#FFFFFF' };
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => COLORS,
  useTheme: () => ({ scheme: 'light', colors: COLORS }),
  useMoneyColor: () => () => '#000000',
}));

/** Friday; this week is Monday the 5th to Sunday the 11th. */
const TODAY = '2026-10-09';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-09', todayDate: new Date('2026-10-09T00:00:00') }),
}));

let mockPro = { pro: true, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));
let mockFloor = { floor: '2019-10-09', free: false };
jest.mock('@/api/history', () => ({ useHistoryFloor: () => mockFloor }));

const mockConfirm = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));

type Query<T> = { data: T | undefined; isPending: boolean; isError: boolean; refetch: jest.Mock };
const query = <T,>(data: T): Query<T> => ({
  data,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
});

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

const COFFEE = habit({});
const DELIVERY = habit({
  id: 'delivery',
  name: 'Food delivery',
  icon_id: 'food-dining/fast-food',
  color: 'blue',
  price: 25,
  started_on: '2026-09-28',
  saved_from: '2026-09-28',
  sort_order: 1,
});

const tap = (habitId: string, day: string, amount: number): HabitTap => ({
  habitId,
  day,
  amount,
  receiptId: `r-${habitId}-${day}`,
});

const TAPS = [
  tap('coffee', '2026-10-05', 5),
  tap('coffee', '2026-10-07', 5),
  tap('delivery', '2026-09-29', 25),
  tap('delivery', '2026-10-06', 25),
  // An archived habit's receipt: real money, but not on these cards or in the hero.
  tap('gone', '2026-10-07', 9),
];

let mockHabits: Query<HabitRow[]>;
let mockTaps: Query<HabitTap[]>;
const mockTapDay = jest.fn();
const mockUntapDay = jest.fn();
jest.mock('@/api/habits', () => ({
  useHabits: () => mockHabits,
  useHabitTaps: () => mockTaps,
  useTapHabitDay: () => ({ mutateAsync: mockTapDay }),
  useUntapHabitDay: () => ({ mutateAsync: mockUntapDay }),
  habitMaths: (row: HabitRow) => ({
    id: row.id,
    price: row.price,
    startedOn: row.started_on,
    savedFrom: row.saved_from,
  }),
}));

/** A promise the test settles. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Screen = Awaited<ReturnType<typeof render>>;
const NBSP = ' ';
const FAILURE = 'Something went wrong. Please try again.';

/** Every word drawn or read out, so a raw key or an unfilled {param} cannot hide anywhere. */
function wordsOn(screen: Screen): string[] {
  type Node = { props: Record<string, unknown>; children: (Node | string)[] | null };
  const found: string[] = [];
  const walk = (node: Node | string | (Node | string)[] | null) => {
    if (node === null) return;
    if (typeof node === 'string') return void found.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    for (const prop of ['accessibilityLabel', 'accessibilityHint']) {
      const value = node.props[prop];
      if (typeof value === 'string') found.push(value);
    }
    node.children?.forEach(walk);
  };
  walk(screen.toJSON() as never);
  return found;
}

const hero = (screen: Screen) =>
  screen.getByLabelText(/^Spent (this|that) week, /).props.accessibilityLabel as string;

beforeEach(() => {
  jest.clearAllMocks();
  // Queued answers too, so one test's leftovers never reach the next.
  mockTapDay.mockReset();
  mockUntapDay.mockReset();
  mockConfirm.mockReset();
  resetLocaleForTests();
  mockPro = { pro: true, ready: true };
  mockFloor = { floor: '2019-10-09', free: false };
  mockHabits = query([COFFEE, DELIVERY]);
  mockTaps = query(TAPS);
  mockConfirm.mockResolvedValue(true);
});
afterAll(() => resetLocaleForTests());

describe('the habits dashboard: states', () => {
  it('shows a hero-shaped skeleton over three rows while either read is out', async () => {
    mockTaps = { ...query<HabitTap[]>([]), data: undefined, isPending: true };
    const screen = await render(<HabitsScreen />);
    expect(screen.getByTestId('hero-skeleton')).toBeTruthy();
    expect(screen.getByTestId('skeleton-3')).toBeTruthy();
    expect(screen.queryByText('Spent this week')).toBeNull();
  });

  it('says it failed, never “no habits”, and tries both reads again', async () => {
    mockHabits = { ...query<HabitRow[]>([]), data: undefined, isError: true };
    const screen = await render(<HabitsScreen />);
    expect(screen.getByText(FAILURE)).toBeTruthy();
    expect(screen.queryByText('Track a spending habit')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Try again'));
    expect(mockHabits.refetch).toHaveBeenCalledTimes(1);
    expect(mockTaps.refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps what it last read when a refresh fails, with the failure line and Try again', async () => {
    mockHabits = { ...query([COFFEE, DELIVERY]), isError: true };
    const screen = await render(<HabitsScreen />);

    expect(hero(screen)).toBe('Spent this week, $35.00. Saved so far, $235.00.');
    expect(screen.getByLabelText('Coffee, Tuesday, October 6, not bought')).toBeEnabled();
    expect(screen.getByText(FAILURE)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Try again'));
    expect(mockHabits.refetch).toHaveBeenCalledTimes(1);
    expect(mockTaps.refetch).toHaveBeenCalledTimes(1);
  });

  it('invites a first habit when there are none, with no hero or week selector', async () => {
    mockHabits = query<HabitRow[]>([]);
    mockTaps = query<HabitTap[]>([]);
    const screen = await render(<HabitsScreen />);
    expect(screen.getByText('Track a spending habit')).toBeTruthy();
    expect(
      screen.getByText(
        'Pick something you buy often, like coffee. Tap the days you buy it, and Skip adds up what the other days save.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Spent this week')).toBeNull();
    expect(screen.queryByLabelText('Previous week')).toBeNull();

    // The page's action and the header's +, both "Add a habit".
    const adds = screen.getAllByRole('button', { name: 'Add a habit' });
    expect(adds).toHaveLength(2);
    await fireEvent.press(adds[1]);
    expect(router.push).toHaveBeenCalledWith('/habit-new');
  });
});

describe('the habits dashboard: + and the cards', () => {
  it('sends Pro to the new habit page, and free or lapsed to the explainer', async () => {
    const pro = await render(<HabitsScreen />);
    await fireEvent.press(pro.getByLabelText('Add a habit'));
    expect(router.push).toHaveBeenLastCalledWith('/habit-new');

    mockPro = { pro: false, ready: true };
    const free = await render(<HabitsScreen />);
    await fireEvent.press(free.getByLabelText('Add a habit'));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/pro-feature',
      params: { id: 'habits' },
    });
    // A lapsed account keeps using its habits: the cards and days still work.
    expect(free.getByLabelText('Coffee, Tuesday, October 6, not bought')).toBeEnabled();
  });

  it('does nothing on + until Pro is known', async () => {
    mockPro = { pro: false, ready: false };
    const screen = await render(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText('Add a habit'));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('names the habit in every day, so two cards’ Thursdays read apart', async () => {
    const screen = await render(<HabitsScreen />);
    expect(screen.getByLabelText('Coffee, Thursday, October 8, not bought')).toBeTruthy();
    expect(screen.getByLabelText('Food delivery, Thursday, October 8, not bought')).toBeTruthy();
  });

  it('lists the cards in order, each opening its habit', async () => {
    const screen = await render(<HabitsScreen />);
    const headers = screen
      .getAllByRole('button')
      .map((node) => String(node.props.accessibilityLabel))
      .filter((label) => / spent\.$/.test(label));
    expect(headers).toEqual([
      'Coffee, $5.00 each time, 1 day skipped, $10.00 saved, $10.00 spent.',
      'Food delivery, $25.00 each time, 2 days skipped, $75.00 saved, $25.00 spent.',
    ]);
    await fireEvent.press(screen.getByLabelText(headers[1]));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/habit/[id]',
      params: { id: 'delivery' },
    });
  });
});

describe('the habits dashboard: hero and weeks', () => {
  it('adds up this week’s spending and everything saved, active habits only', async () => {
    const screen = await render(<HabitsScreen />);
    // $5 + $5 + $25; the archived habit's $9 stays out.
    // Saved: coffee 2 x $5; delivery 9 skipped days since Sep 28 x $25.
    expect(hero(screen)).toBe('Spent this week, $35.00. Saved so far, $235.00.');
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByText(`Oct${NBSP}5${NBSP}– 11`)).toBeTruthy();
    expect(screen.getByLabelText('Next week')).toBeDisabled();
  });

  it('steps back as far as the earliest habit began, then returns to this week', async () => {
    const screen = await render(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText('Previous week'));

    expect(hero(screen)).toBe('Spent that week, $25.00. Saved so far, $235.00.');
    expect(screen.getByText('Last week')).toBeTruthy();
    expect(screen.getByText(`Sep${NBSP}28${NBSP}– Oct${NBSP}4`)).toBeTruthy();
    expect(screen.getByLabelText('Coffee, $5.00 each time, Not tracking yet.')).toBeTruthy();
    expect(
      screen.getByLabelText(/^Food delivery, \$25\.00 each time, Bought on 1 day, /),
    ).toBeTruthy();
    expect(screen.getByLabelText('Previous week')).toBeDisabled();
    expect(screen.getByLabelText('Next week')).toBeEnabled();

    const centre = screen.getByLabelText(`Last week, Sep${NBSP}28${NBSP}– Oct${NBSP}4`);
    expect(centre.props.accessibilityHint).toBe('Goes back to this week');
    await fireEvent.press(centre);
    expect(screen.getByText('This week')).toBeTruthy();
  });

  it('stops a free account at the week holding its 90-day floor; Pro goes back to the start', async () => {
    const early = { ...DELIVERY, started_on: '2026-06-01', saved_from: '2026-06-01' };
    mockHabits = query([COFFEE, early]);
    const backs = async (screen: Screen) => {
      let count = 0;
      while (screen.getByLabelText('Previous week').props.accessibilityState?.disabled !== true) {
        await fireEvent.press(screen.getByLabelText('Previous week'));
        count += 1;
        if (count > 60) break;
      }
      return count;
    };

    mockPro = { pro: false, ready: true };
    mockFloor = { floor: '2026-07-11', free: true };
    const free = await render(<HabitsScreen />);
    expect(await backs(free)).toBe(13);
    expect(free.getByText(`Jul${NBSP}6${NBSP}– 12`)).toBeTruthy();

    mockPro = { pro: true, ready: true };
    mockFloor = { floor: '2019-10-09', free: false };
    const pro = await render(<HabitsScreen />);
    expect(await backs(pro)).toBe(18);
    expect(pro.getByText(`Jun${NBSP}1${NBSP}– 7`)).toBeTruthy();
  });

  it('leaves the days before a free account’s floor alone in the oldest week it reaches', async () => {
    const early = { ...DELIVERY, started_on: '2026-06-01', saved_from: '2026-06-01' };
    mockHabits = query([COFFEE, early]);
    // A receipt on the Tuesday, before the floor: kept, counted, but out of reach here.
    mockTaps = query([...TAPS, tap('delivery', '2026-07-07', 25)]);
    mockPro = { pro: false, ready: true };
    mockFloor = { floor: '2026-07-08', free: true };
    const screen = await render(<HabitsScreen />);
    for (let week = 0; week < 13; week += 1) {
      await fireEvent.press(screen.getByLabelText('Previous week'));
    }
    expect(screen.getByText(`Jul${NBSP}6${NBSP}– 12`)).toBeTruthy();

    const monday = screen.getByLabelText(
      'Food delivery, Monday, July 6, kept but not shown on Free',
    );
    const tuesday = screen.getByLabelText(
      'Food delivery, Tuesday, July 7, kept but not shown on Free',
    );
    expect(monday).toBeDisabled();
    expect(tuesday).toBeDisabled();
    await fireEvent.press(monday);
    await fireEvent.press(tuesday);
    expect(mockTapDay).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();

    expect(screen.getByLabelText('Food delivery, Wednesday, July 8, not bought')).toBeEnabled();
    // The week's figure stays whole.
    expect(hero(screen)).toMatch(/^Spent that week, \$25\.00\. /);
  });

  it('reads in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<HabitsScreen />);
    expect(screen.getByText('Hábitos de gasto')).toBeTruthy();
    expect(screen.getByText('Gastado esta semana')).toBeTruthy();
    expect(screen.getByText('Ahorrado hasta hoy')).toBeTruthy();
    expect(screen.getByText('Esta semana')).toBeTruthy();
    expect(screen.getByLabelText('Agregar un hábito')).toBeTruthy();
    const words = wordsOn(screen);
    expect(words.filter((word) => /^[a-z]+\.[a-zA-Z]+\./.test(word))).toEqual([]);
    expect(words.filter((word) => /\{\w+\}/.test(word))).toEqual([]);
    expect(words).toContain('Ahorrado hasta hoy');
  });
});

describe('the habits dashboard: filling and emptying days', () => {
  it('fills a day at once, files it at the habit’s price, and says so', async () => {
    const answer = deferred<{ receiptId: string; alreadyTapped: boolean }>();
    mockTapDay.mockReturnValue(answer.promise);
    const screen = await render(<HabitsScreen />);

    await fireEvent.press(screen.getByLabelText('Coffee, Tuesday, October 6, not bought'));
    expect(mockTapDay).toHaveBeenCalledWith({ habit: COFFEE, day: '2026-10-06' });
    expect(success).toHaveBeenCalledTimes(1);

    // Filled before the server answers, held still, and counted in the hero.
    const filled = screen.getByLabelText('Coffee, Tuesday, October 6, bought, $5.00');
    expect(filled).toBeDisabled();
    expect(hero(screen)).toBe('Spent this week, $40.00. Saved so far, $230.00.');

    await act(async () => answer.resolve({ receiptId: 'r-new', alreadyTapped: false }));
    expect(mockToast).toHaveBeenCalledWith('toast.receipt.added');
    // Still filled until the taps are read again, then free to press.
    expect(screen.getByLabelText('Coffee, Tuesday, October 6, bought, $5.00')).toBeDisabled();

    mockTaps = query([...TAPS, tap('coffee', '2026-10-06', 5)]);
    await screen.rerender(<HabitsScreen />);
    expect(screen.getByLabelText('Coffee, Tuesday, October 6, bought, $5.00')).toBeEnabled();
  });

  it('trusts the taps over a filled day once a second read still lacks it', async () => {
    mockTapDay.mockResolvedValue({ receiptId: 'r-new', alreadyTapped: false });
    const screen = await render(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText('Coffee, Tuesday, October 6, not bought'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('toast.receipt.added'));

    // A read that set out before the answer: the day stays filled.
    mockTaps = query([...TAPS]);
    await screen.rerender(<HabitsScreen />);
    expect(screen.getByLabelText('Coffee, Tuesday, October 6, bought, $5.00')).toBeTruthy();

    // The next read still has no receipt there (deleted on another phone): the taps win.
    mockTaps = query([...TAPS]);
    await screen.rerender(<HabitsScreen />);
    expect(screen.getByLabelText('Coffee, Tuesday, October 6, not bought')).toBeEnabled();
  });

  it('files no second toast for a day another phone already filled', async () => {
    mockTapDay.mockResolvedValue({ receiptId: 'r-other', alreadyTapped: true });
    const screen = await render(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText('Coffee, Tuesday, October 6, not bought'));
    await waitFor(() => expect(mockTapDay).toHaveBeenCalled());
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('puts a failed day back and says it failed, until the next one works', async () => {
    mockTapDay.mockRejectedValueOnce(new Error('offline'));
    const screen = await render(<HabitsScreen />);

    await fireEvent.press(screen.getByLabelText('Coffee, Tuesday, October 6, not bought'));
    expect(await screen.findByText(FAILURE)).toBeTruthy();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Coffee, Tuesday, October 6, not bought')).toBeEnabled();
    expect(mockToast).not.toHaveBeenCalled();

    mockTapDay.mockResolvedValueOnce({ receiptId: 'r-new', alreadyTapped: false });
    await fireEvent.press(screen.getByLabelText('Coffee, Thursday, October 8, not bought'));
    await waitFor(() => expect(screen.queryByText(FAILURE)).toBeNull());
  });

  it('clears the failure line on a change of week', async () => {
    mockTapDay.mockRejectedValueOnce(new Error('offline'));
    const screen = await render(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText('Coffee, Tuesday, October 6, not bought'));
    expect(await screen.findByText(FAILURE)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Previous week'));
    expect(screen.queryByText(FAILURE)).toBeNull();
  });

  it('asks before emptying a day, then deletes its receipt and says so in red', async () => {
    mockUntapDay.mockResolvedValue({ receiptId: 'r-coffee-2026-10-05' });
    const screen = await render(<HabitsScreen />);

    await fireEvent.press(screen.getByLabelText('Coffee, Monday, October 5, bought, $5.00'));
    expect(mockConfirm).toHaveBeenCalledWith({
      title: 'Remove Monday’s Coffee ($5.00)?',
      message: 'This deletes the receipt.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    await waitFor(() => expect(mockUntapDay).toHaveBeenCalledWith('r-coffee-2026-10-05'));
    expect(mockToast).toHaveBeenCalledWith('toast.receipt.deleted', 'deleted');
    // Empty at once, before the taps are read again.
    expect(screen.queryByLabelText('Coffee, Monday, October 5, bought, $5.00')).toBeNull();
    expect(screen.getByLabelText('Coffee, Monday, October 5, not bought')).toBeTruthy();
  });

  it('leaves the day as it was when the removal is cancelled', async () => {
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText('Coffee, Monday, October 5, bought, $5.00'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockUntapDay).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Coffee, Monday, October 5, bought, $5.00')).toBeTruthy();
  });

  it('names today, and the date for an older week, in the question', async () => {
    mockTaps = query([...TAPS, tap('coffee', TODAY, 4.5)]);
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<HabitsScreen />);

    await fireEvent.press(screen.getByLabelText('Coffee, Friday, October 9, bought, $4.50'));
    await waitFor(() =>
      expect(mockConfirm).toHaveBeenLastCalledWith(
        expect.objectContaining({ title: 'Remove today’s Coffee ($4.50)?' }),
      ),
    );

    await fireEvent.press(screen.getByLabelText('Previous week'));
    await fireEvent.press(
      screen.getByLabelText('Food delivery, Tuesday, September 29, bought, $25.00'),
    );
    await waitFor(() =>
      expect(mockConfirm).toHaveBeenLastCalledWith(
        expect.objectContaining({ title: 'Remove Food delivery on 29 Sep 2026 ($25.00)?' }),
      ),
    );
  });
});
