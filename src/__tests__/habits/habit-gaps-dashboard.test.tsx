import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import HabitsScreen from '@/app/habits';
import type { HabitRow, TapResult } from '@/api/habits';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { success, warn } from '@/lib/haptics';
import type { HabitTap } from '@/lib/habit-week';

/**
 * Gaps left by the first habit suites, on the dashboard with the hooks mocked at their boundary:
 * a day whose request is still out (tap then untap, untap then tap, one day's request beside
 * another's), an account whose Pro has lapsed (taps and untaps are never gated), and the figures
 * in pesos and pounds, to the cent, in all three languages.
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
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => null,
  SkeletonList: () => null,
}));
jest.mock('@/components/habits/habit-icon', () => ({ HabitIcon: () => null }));

const COLORS = { ink: '#111111', muted: '#6F6F6F', line: '#E5E1DC', onControl: '#FFFFFF' };
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => COLORS,
  useTheme: () => ({ scheme: 'light', colors: COLORS }),
  useMoneyColor: () => () => '#000000',
}));

/** Friday; this week is Monday the 5th to Sunday the 11th. */
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-09', todayDate: new Date('2026-10-09T00:00:00') }),
}));

let mockPro = { pro: true, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));
jest.mock('@/api/history', () => ({
  useHistoryFloor: () => ({ floor: '2019-10-09', free: false }),
}));

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

const delivery = (over: Partial<HabitRow>): HabitRow =>
  habit({
    id: 'delivery',
    name: 'Food delivery',
    icon_id: 'food-dining/fast-food',
    color: 'blue',
    price: 25,
    started_on: '2026-09-28',
    saved_from: '2026-09-28',
    sort_order: 1,
    ...over,
  });

const COFFEE = habit({});
const DELIVERY = delivery({});

const tap = (habitId: string, day: string, amount: number): HabitTap => ({
  habitId,
  day,
  amount,
  receiptId: `r-${habitId}-${day}`,
});

/** Coffee on Mon and Wed, Food delivery on Tue the 29th and Tue the 6th. */
const TAPS = [
  tap('coffee', '2026-10-05', 5),
  tap('coffee', '2026-10-07', 5),
  tap('delivery', '2026-09-29', 25),
  tap('delivery', '2026-10-06', 25),
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
const NBSP = '\u00A0';
const FAILURE = 'Something went wrong. Please try again.';
const FILED: TapResult = { receiptId: 'r-new', alreadyTapped: false };

const hero = (screen: Screen) =>
  screen.getByLabelText(/^(Spent|Gastado|Dépensé) /).props.accessibilityLabel as string;

/** The cards' spoken headers, read from the nodes: a text matcher would fold no-break spaces away. */
const headers = (screen: Screen) =>
  screen
    .getAllByRole('button')
    .map((node) => String(node.props.accessibilityLabel))
    .filter((label) => /^(Coffee|Food delivery), .*(spent|gastado|dépensé)\.$/.test(label));

const TUE_OPEN = 'Coffee, Tuesday, October 6, not bought';
const MON_BOUGHT = 'Coffee, Monday, October 5, bought, $5.00';
const MON_EMPTY = 'Coffee, Monday, October 5, not bought';

beforeEach(() => {
  jest.clearAllMocks();
  mockTapDay.mockReset();
  mockUntapDay.mockReset();
  mockConfirm.mockReset();
  resetLocaleForTests();
  mockPro = { pro: true, ready: true };
  mockHabits = query([COFFEE, DELIVERY]);
  mockTaps = query(TAPS);
  mockConfirm.mockResolvedValue(true);
  // failureMessage() logs every failure it is handed; these tests fail on purpose.
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => resetLocaleForTests());

describe('a day whose request is still out', () => {
  it('ignores presses on a tapped day until the taps show it, then removes the receipt the read gave it', async () => {
    const answer = deferred<TapResult>();
    mockTapDay.mockReturnValue(answer.promise);
    const screen = await render(<HabitsScreen />);

    await fireEvent.press(screen.getByLabelText(TUE_OPEN));
    const filled = () => screen.getByLabelText('Coffee, Tuesday, October 6, bought, $5.00');
    expect(filled()).toBeDisabled();

    // Out: pressing the filled circle neither asks to remove nor files a second receipt.
    await fireEvent.press(filled());
    expect(mockConfirm).not.toHaveBeenCalled();

    // Answered, taps not read again: the circle is still a stand-in with no real receipt behind it.
    await act(async () => answer.resolve(FILED));
    await fireEvent.press(filled());
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockUntapDay).not.toHaveBeenCalled();
    expect(mockTapDay).toHaveBeenCalledTimes(1);

    // Read: the day has its receipt, and an undo removes that one.
    mockTaps = query([
      ...TAPS,
      { habitId: 'coffee', day: '2026-10-06', amount: 5, receiptId: 'r-new' },
    ]);
    await screen.rerender(<HabitsScreen />);
    expect(filled()).toBeEnabled();
    mockUntapDay.mockResolvedValue({ receiptId: 'r-new' });
    await fireEvent.press(filled());
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Remove Tuesday’s Coffee ($5.00)?' }),
    );
    await waitFor(() => expect(mockUntapDay).toHaveBeenCalledWith('r-new'));
    expect(mockTapDay).toHaveBeenCalledTimes(1);
  });

  it('holds an emptied day still until the taps drop it, then files it again', async () => {
    const answer = deferred<{ receiptId: string }>();
    mockUntapDay.mockReturnValue(answer.promise);
    const screen = await render(<HabitsScreen />);

    await fireEvent.press(screen.getByLabelText(MON_BOUGHT));
    await waitFor(() => expect(mockUntapDay).toHaveBeenCalledWith('r-coffee-2026-10-05'));

    // Coffee's Monday is empty at once and inert; Food delivery's Monday was never filled and is not.
    expect(screen.getByLabelText(MON_EMPTY)).toBeDisabled();
    expect(screen.getByLabelText('Food delivery, Monday, October 5, not bought')).toBeEnabled();
    await fireEvent.press(screen.getByLabelText(MON_EMPTY));
    expect(mockTapDay).not.toHaveBeenCalled();

    // Answered, taps still showing the receipt: still inert, so no tap can land on the old receipt.
    await act(async () => answer.resolve({ receiptId: 'r-coffee-2026-10-05' }));
    expect(screen.getByLabelText(MON_EMPTY)).toBeDisabled();

    mockTaps = query(TAPS.filter((entry) => entry.receiptId !== 'r-coffee-2026-10-05'));
    await screen.rerender(<HabitsScreen />);
    expect(screen.getByLabelText(MON_EMPTY)).toBeEnabled();

    mockTapDay.mockResolvedValue(FILED);
    await fireEvent.press(screen.getByLabelText(MON_EMPTY));
    expect(mockTapDay).toHaveBeenCalledWith({ habit: COFFEE, day: '2026-10-05' });
  });

  it('empties one day while another day’s tap is out, and each answers on its own', async () => {
    const filing = deferred<TapResult>();
    mockTapDay.mockReturnValue(filing.promise);
    mockUntapDay.mockResolvedValue({ receiptId: 'r-coffee-2026-10-05' });
    const screen = await render(<HabitsScreen />);

    await fireEvent.press(screen.getByLabelText(TUE_OPEN));
    // Coffee Mon, Tue, Wed = 15; Food delivery 25.
    expect(hero(screen)).toBe('Spent this week, $40.00. Saved so far, $230.00.');

    await fireEvent.press(screen.getByLabelText(MON_BOUGHT));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('toast.receipt.deleted', 'deleted'));
    // Monday's $5 is out and Tuesday's $5 is in: $35 spent, Mon and Thu skipped.
    expect(hero(screen)).toBe('Spent this week, $35.00. Saved so far, $235.00.');
    expect(screen.getByLabelText('Coffee, Tuesday, October 6, bought, $5.00')).toBeDisabled();
    expect(mockToast).not.toHaveBeenCalledWith('toast.receipt.added');

    await act(async () => filing.resolve(FILED));
    expect(mockToast).toHaveBeenCalledWith('toast.receipt.added');
    expect(mockToast.mock.calls.map(([key]) => key)).toEqual([
      'toast.receipt.deleted',
      'toast.receipt.added',
    ]);
    expect(success).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('puts a refused removal back while another day’s tap is out, and the tap carries on', async () => {
    const filing = deferred<TapResult>();
    mockTapDay.mockReturnValue(filing.promise);
    mockUntapDay.mockRejectedValue(new Error('offline'));
    const screen = await render(<HabitsScreen />);

    await fireEvent.press(screen.getByLabelText(TUE_OPEN));
    await fireEvent.press(screen.getByLabelText(MON_BOUGHT));

    expect(await screen.findByText(FAILURE)).toBeTruthy();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(MON_BOUGHT)).toBeEnabled();
    expect(screen.getByLabelText('Coffee, Tuesday, October 6, bought, $5.00')).toBeDisabled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(hero(screen)).toBe('Spent this week, $40.00. Saved so far, $230.00.');

    await act(async () => filing.resolve(FILED));
    expect(mockToast).toHaveBeenCalledWith('toast.receipt.added');
    expect(screen.getByLabelText(MON_BOUGHT)).toBeEnabled();
    expect(screen.getByLabelText('Coffee, Tuesday, October 6, bought, $5.00')).toBeTruthy();
  });

  it('puts a refused tap back while another day’s removal is out, and the removal carries on', async () => {
    const removing = deferred<{ receiptId: string }>();
    mockUntapDay.mockReturnValue(removing.promise);
    mockTapDay.mockRejectedValue(new Error('offline'));
    const screen = await render(<HabitsScreen />);

    await fireEvent.press(screen.getByLabelText(MON_BOUGHT));
    await waitFor(() => expect(mockUntapDay).toHaveBeenCalled());
    await fireEvent.press(screen.getByLabelText(TUE_OPEN));

    expect(await screen.findByText(FAILURE)).toBeTruthy();
    expect(screen.getByLabelText(TUE_OPEN)).toBeEnabled();
    // Monday is still drawn empty and inert while its request is out.
    expect(screen.getByLabelText(MON_EMPTY)).toBeDisabled();
    expect(hero(screen)).toBe('Spent this week, $30.00. Saved so far, $240.00.');

    await act(async () => removing.resolve({ receiptId: 'r-coffee-2026-10-05' }));
    expect(mockToast).toHaveBeenCalledWith('toast.receipt.deleted', 'deleted');
    expect(mockToast).not.toHaveBeenCalledWith('toast.receipt.added');
  });

  it('tells two habits’ same-day requests apart: Coffee’s tap does not hold Food delivery’s day', async () => {
    const filing = deferred<TapResult>();
    mockTapDay.mockReturnValueOnce(filing.promise).mockResolvedValue(FILED);
    const screen = await render(<HabitsScreen />);

    // Thursday the 8th is open on both cards, and each label names its habit.
    await fireEvent.press(screen.getByLabelText('Coffee, Thursday, October 8, not bought'));
    expect(screen.getByLabelText('Coffee, Thursday, October 8, bought, $5.00')).toBeDisabled();
    expect(screen.getByLabelText('Food delivery, Thursday, October 8, not bought')).toBeEnabled();

    await fireEvent.press(screen.getByLabelText('Food delivery, Thursday, October 8, not bought'));
    expect(mockTapDay).toHaveBeenCalledTimes(2);
    expect(mockTapDay).toHaveBeenNthCalledWith(1, { habit: COFFEE, day: '2026-10-08' });
    expect(mockTapDay).toHaveBeenNthCalledWith(2, { habit: DELIVERY, day: '2026-10-08' });
  });
});

describe('an account whose Pro has lapsed', () => {
  beforeEach(() => {
    mockPro = { pro: false, ready: true };
  });

  it('files and removes days exactly as Pro does, and is never sent to the explainer for it', async () => {
    mockTapDay.mockResolvedValue(FILED);
    mockUntapDay.mockResolvedValue({ receiptId: 'r-coffee-2026-10-05' });
    const screen = await render(<HabitsScreen />);

    // The dashboard, hero and week selector are all there.
    expect(screen.getByText('Spent this week')).toBeTruthy();
    expect(screen.getByLabelText('Previous week')).toBeEnabled();

    await fireEvent.press(screen.getByLabelText(TUE_OPEN));
    expect(mockTapDay).toHaveBeenCalledWith({ habit: COFFEE, day: '2026-10-06' });
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('toast.receipt.added'));

    await fireEvent.press(screen.getByLabelText(MON_BOUGHT));
    await waitFor(() => expect(mockUntapDay).toHaveBeenCalledWith('r-coffee-2026-10-05'));
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.receipt.deleted', 'deleted');

    expect(router.push).not.toHaveBeenCalled();
  });

  it('still opens a card on its habit’s page', async () => {
    const screen = await render(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText(/^Coffee, .* spent\.$/));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/habit/[id]', params: { id: 'coffee' } });
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('gates only starting one: the + goes to the explainer, never the new habit page', async () => {
    const screen = await render(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText('Add a habit'));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/pro-feature',
      params: { id: 'habits' },
    });
  });

  it('sends the empty page’s action to the explainer too, from the page and from the +', async () => {
    mockHabits = query<HabitRow[]>([]);
    mockTaps = query<HabitTap[]>([]);
    const screen = await render(<HabitsScreen />);

    const adds = screen.getAllByRole('button', { name: 'Add a habit' });
    expect(adds).toHaveLength(2);
    for (const add of adds) await fireEvent.press(add);
    expect(router.push).toHaveBeenCalledTimes(2);
    expect(jest.mocked(router.push).mock.calls).toEqual([
      [{ pathname: '/pro-feature', params: { id: 'habits' } }],
      [{ pathname: '/pro-feature', params: { id: 'habits' } }],
    ]);
  });

  it('still files a day while Pro is not yet known: taps never wait on the store', async () => {
    mockPro = { pro: false, ready: false };
    mockTapDay.mockResolvedValue(FILED);
    const screen = await render(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText(TUE_OPEN));
    expect(mockTapDay).toHaveBeenCalledWith({ habit: COFFEE, day: '2026-10-06' });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('says it failed, rather than inviting a first habit, when the read fails', async () => {
    mockHabits = { ...query<HabitRow[]>([]), data: undefined, isError: true };
    const screen = await render(<HabitsScreen />);
    expect(screen.getByText(FAILURE)).toBeTruthy();
    expect(screen.queryByText('Track a spending habit')).toBeNull();
    // The only way on is Try again; the explainer is for the + alone.
    expect(screen.getAllByRole('button', { name: 'Add a habit' })).toHaveLength(1);
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('figures in pesos and pounds, to the cent', () => {
  /**
   * Pesos at ten times the dollar prices, one receipt edited to $48.75, one archived habit's receipt
   * that must stay out. Coffee: Oct 5-8 are the days gone by, two bought, so 2 x 50 = 100.00 saved.
   * Food delivery: Sep 28 to Oct 8 is 11 days, two bought, 9 x 250 = 2,250.00. Spent this week:
   * 50.00 + 48.75 + 250.00 = 348.75.
   */
  const PESO_COFFEE = habit({ price: 50 });
  const PESO_DELIVERY = delivery({ price: 250 });
  const PESO_TAPS = [
    tap('coffee', '2026-10-05', 50),
    tap('coffee', '2026-10-07', 48.75),
    tap('delivery', '2026-09-29', 250),
    tap('delivery', '2026-10-06', 250),
    tap('gone', '2026-10-07', 90),
  ];

  beforeEach(() => {
    mockHabits = query([PESO_COFFEE, PESO_DELIVERY]);
    mockTaps = query(PESO_TAPS);
  });
  afterEach(() => setCurrency(null));

  it('adds up the hero, and each card, in pesos', async () => {
    setCurrency('MXN');
    const screen = await render(<HabitsScreen />);

    expect(hero(screen)).toBe('Spent this week, $348.75. Saved so far, $2,350.00.');
    expect(headers(screen)).toEqual([
      'Coffee, $50.00 each time, 1 day skipped, $100.00 saved, $98.75 spent.',
      'Food delivery, $250.00 each time, 2 days skipped, $750.00 saved, $250.00 spent.',
    ]);
  });

  it('writes the price into the hint on an open day and the real amount into the question', async () => {
    setCurrency('MXN');
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<HabitsScreen />);

    expect(screen.getByLabelText(TUE_OPEN).props.accessibilityHint).toBe(
      'Records $50.00 spent on this day.',
    );
    // A receipt edited to $48.75 is asked about, and drawn, at $48.75, not at the habit's $50.00.
    await fireEvent.press(screen.getByLabelText('Coffee, Wednesday, October 7, bought, $48.75'));
    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Remove Wednesday’s Coffee ($48.75)?' }),
      ),
    );
    expect(screen.queryByLabelText('Coffee, Wednesday, October 7, bought, $50.00')).toBeNull();
  });

  it('keeps thousands and cents whole in an earlier week', async () => {
    setCurrency('MXN');
    const screen = await render(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText('Previous week'));

    // Sep 28 to Oct 4: seven days gone by, one bought, 6 x 250 = 1,500.00; Coffee had not begun.
    expect(hero(screen)).toBe('Spent that week, $250.00. Saved so far, $2,350.00.');
    expect(
      screen.getByLabelText(
        'Food delivery, $250.00 each time, Bought on 1 day, $1,500.00 saved, $250.00 spent.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Coffee, $50.00 each time, Not tracking yet.')).toBeTruthy();
  });

  it('files a tap at the habit’s own number, with nothing converted', async () => {
    setCurrency('MXN');
    mockTapDay.mockResolvedValue(FILED);
    const screen = await render(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText(TUE_OPEN));

    expect(mockTapDay).toHaveBeenCalledTimes(1);
    expect(mockTapDay.mock.calls[0][0].habit.price).toBe(50);
    // The pending circle is drawn at that price, and the hero moves by exactly that.
    expect(screen.getByLabelText('Coffee, Tuesday, October 6, bought, $50.00')).toBeTruthy();
    expect(hero(screen)).toBe('Spent this week, $398.75. Saved so far, $2,300.00.');
  });

  it('follows the currency chosen, not a dollar sign', async () => {
    setCurrency('GBP');
    const screen = await render(<HabitsScreen />);
    expect(hero(screen)).toBe('Spent this week, £348.75. Saved so far, £2,350.00.');
    expect(screen.getByLabelText(TUE_OPEN).props.accessibilityHint).toBe(
      'Records £50.00 spent on this day.',
    );
    expect(screen.queryByLabelText(/\$/)).toBeNull();
  });

  it('writes the same pesos in Spanish, with the point decimal Mexico uses', async () => {
    setCurrency('MXN');
    setLanguage('es');
    const screen = await render(<HabitsScreen />);
    expect(hero(screen)).toBe('Gastado esta semana, $348.75. Ahorrado hasta hoy, $2,350.00.');
    expect(headers(screen)).toEqual([
      'Coffee, $50.00 cada vez, 1 día sin comprar, $100.00 ahorrado, $98.75 gastado.',
      'Food delivery, $250.00 cada vez, 2 días sin comprar, $750.00 ahorrado, $250.00 gastado.',
    ]);
  });

  it('writes them in French with the comma, a no-break space for thousands, and the mark after', async () => {
    setCurrency('MXN');
    setLanguage('fr');
    const screen = await render(<HabitsScreen />);
    expect(hero(screen)).toBe(
      `Dépensé cette semaine, 348,75${NBSP}$. Économisé jusqu’ici, 2${NBSP}350,00${NBSP}$.`,
    );
    expect(headers(screen)).toEqual([
      `Coffee, 50,00${NBSP}$ chaque fois, 1 jour sans achat, 100,00${NBSP}$ économisé, 98,75${NBSP}$ dépensé.`,
      `Food delivery, 250,00${NBSP}$ chaque fois, 2 jours sans achat, 750,00${NBSP}$ économisé, 250,00${NBSP}$ dépensé.`,
    ]);
  });
});
