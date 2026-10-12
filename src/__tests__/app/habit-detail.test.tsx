import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import HabitDetailScreen from '@/app/habit/[id]';
import type { HabitRow } from '@/api/habits';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import type { HabitTap } from '@/lib/habit-week';

/**
 * A habit's page, "View details": what it has cost and saved since it began, then its weeks, newest
 * first, each opening to its days. A bought day opens its receipt; the header pencil opens the edit
 * page; a deleted or missing habit steps back out. Built from the design's Friday the 16th (Tim
 * Hortons, $5 from Sep 28, twelve days bought) and from a small habit with an edited receipt.
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

const COLORS = {
  ink: '#111111',
  muted: '#6F6F6F',
  line: '#E5E1DC',
  accentInk: '#905479',
  onControl: '#FFFFFF',
};
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => COLORS,
  useTheme: () => ({ scheme: 'light', colors: COLORS }),
  useMoneyColor: () => () => '#000000',
}));
let mockToday = '2026-10-09';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));

let mockFloor = { floor: '2019-10-09', free: false };
jest.mock('@/api/history', () => ({ useHistoryFloor: () => mockFloor }));

const habitRow = (over: Partial<HabitRow> = {}): HabitRow => ({
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

/** The small habit: made on Monday the 5th, looked at on Friday the 9th. */
const COFFEE = habitRow();
/** The design's habit: made on Monday the 28th, looked at on Friday the 16th. */
const TIM = habitRow({
  id: 'tim',
  name: 'Tim Hortons',
  started_on: '2026-09-28',
  saved_from: '2026-09-28',
});

const tap = (day: string, amount = 5, habitId = 'coffee'): HabitTap => ({
  habitId,
  day,
  amount,
  receiptId: `r-${habitId}-${day}`,
});

const TIM_TAPS = [
  '2026-09-28',
  '2026-09-30',
  '2026-10-02',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
  '2026-10-08',
  '2026-10-10',
  '2026-10-12',
  '2026-10-13',
  '2026-10-15',
  '2026-10-16',
].map((day) => tap(day, 5, 'tim'));

type Query<T> = { data: T; isPending: boolean; isError: boolean; refetch: jest.Mock };
const query = <T,>(data: T): Query<T> => ({
  data,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
});

let mockHabit: Query<HabitRow | null | undefined>;
let mockTaps: Query<HabitTap[] | undefined>;
jest.mock('@/api/habits', () => ({
  useHabit: () => mockHabit,
  useHabitTaps: () => mockTaps,
  habitMaths: (row: HabitRow) => ({
    id: row.id,
    price: row.price,
    startedOn: row.started_on,
    savedFrom: row.saved_from,
  }),
}));
jest.mock('@/api/queries', () => ({
  usePaymentSources: () => ({ sources: [{ id: 'card-1', label: 'Visa ••4242' }] }),
}));
jest.mock('@/api/brands', () => ({
  useSpendCategories: () => ({ data: [{ id: 'dining', label: 'Dining' }] }),
}));

type Screen = Awaited<ReturnType<typeof render>>;
const NBSP = ' ';

/** Every word drawn, top to bottom, read off the nodes: a text matcher would fold no-break spaces. */
const shown = (screen: Pick<Screen, 'getAllByText'>) =>
  screen.getAllByText(/./).map((text) => String(text.props.children));

/** The weeks listed, newest first, by their Mondays. */
const weeksListed = (screen: Screen) =>
  screen
    .queryAllByTestId(/^habit-week-\d{4}-\d{2}-\d{2}$/)
    .map((week) => String(week.props.testID).replace('habit-week-', ''));

const week = (screen: Screen, weekStart: string) =>
  within(screen.getByTestId(`habit-week-${weekStart}`));

/** The button that folds a week. */
const fold = (screen: Screen, weekStart: string) =>
  week(screen, weekStart).getAllByRole('button')[0];

/** The days listed in an opened week, newest first. */
const daysListed = (screen: Screen, weekStart: string) =>
  week(screen, weekStart)
    .queryAllByTestId(/^habit-day-/)
    .map((row) => String(row.props.testID).replace('habit-day-', ''));

const day = (screen: Screen, iso: string) => screen.getByTestId(`habit-day-${iso}`);

/** Every word drawn or read out, so a raw key or an unfilled {param} cannot hide anywhere. */
function wordsOn(screen: Screen): string[] {
  type Json = { props: Record<string, unknown>; children: (Json | string)[] | null };
  const found: string[] = [];
  const walk = (entry: Json | string | (Json | string)[] | null) => {
    if (entry === null) return;
    if (typeof entry === 'string') return void found.push(entry);
    if (Array.isArray(entry)) return entry.forEach(walk);
    for (const prop of ['accessibilityLabel', 'accessibilityHint']) {
      const value = entry.props[prop];
      if (typeof value === 'string') found.push(value);
    }
    entry.children?.forEach(walk);
  };
  walk(screen.toJSON() as never);
  return found;
}
const leftovers = (screen: Screen) =>
  wordsOn(screen).filter((word) => /^[a-z]+\.[a-zA-Z]+\.|\{\w+\}/.test(word));

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockId = 'coffee';
  mockToday = '2026-10-09';
  mockFloor = { floor: '2019-10-09', free: false };
  mockHabit = query<HabitRow | null | undefined>(COFFEE);
  // The Wednesday receipt was edited to $6.50; the taps carry each receipt's own amount. The tea
  // tap is another habit's.
  mockTaps = query<HabitTap[] | undefined>([
    tap('2026-10-05'),
    tap('2026-10-07', 6.5),
    tap('2026-10-08', 3, 'tea'),
  ]);
});
afterAll(() => resetLocaleForTests());

describe('a habit’s page', () => {
  it('says what it has cost and saved so far, and the days behind them', async () => {
    const screen = await render(<HabitDetailScreen />);
    const words = shown(screen);

    expect(words).toEqual(
      expect.arrayContaining([
        '$5.00 each time · since Oct 5',
        'Spent so far',
        // $5.00 + $6.50, the edited receipt at its own amount; the tea tap stays out.
        '$11.50',
        'Saved so far',
        // Tuesday and Thursday skipped at $5.
        '$10.00',
        '2 days bought · 2 days skipped',
      ]),
    );
    expect(mockIcon).toHaveBeenCalledWith(
      expect.objectContaining({ iconId: 'food-dining/coffee', color: 'caramel', size: 36 }),
    );
  });

  it('reads the hero as one stop: the price and start, what it spent, what it saved', async () => {
    const screen = await render(<HabitDetailScreen />);
    const hero = screen.getByTestId('habits-hero');
    expect(hero.props.accessible).toBe(true);
    expect(hero.props.accessibilityLabel).toBe(
      '$5.00 each time · since Oct 5. Spent so far, $11.50. Saved so far, $10.00.',
    );
  });

  it('shows the design’s hero for Tim Hortons: $60.00 spent, $35.00 saved, 12 days bought, 7 skipped', async () => {
    mockToday = '2026-10-16';
    mockId = 'tim';
    mockHabit = query<HabitRow | null | undefined>(TIM);
    mockTaps = query<HabitTap[] | undefined>(TIM_TAPS);
    const screen = await render(<HabitDetailScreen />);

    const words = shown(screen);
    expect(words).toEqual(
      expect.arrayContaining([
        '$5.00 each time · since Sep 28',
        'Spent so far',
        '$60.00',
        'Saved so far',
        '$35.00',
        '12 days bought · 7 days skipped',
        'Week by week',
        '3 weeks',
      ]),
    );
    // In the order the page draws them: the hero, the tally, then the weeks.
    const at = (word: string) => words.indexOf(word);
    expect(at('Spent so far')).toBeLessThan(at('$60.00'));
    expect(at('$60.00')).toBeLessThan(at('Saved so far'));
    expect(at('$35.00')).toBeLessThan(at('12 days bought · 7 days skipped'));
    expect(at('12 days bought · 7 days skipped')).toBeLessThan(at('Week by week'));
  });

  it('counts one week as “1 week”', async () => {
    const screen = await render(<HabitDetailScreen />);
    expect(shown(screen)).toEqual(expect.arrayContaining(['Week by week', '1 week']));
  });

  it('counts only this habit’s receipts', async () => {
    mockTaps = query<HabitTap[] | undefined>([
      tap('2026-10-05'),
      tap('2026-10-06', 99, 'tea'),
      tap('2026-10-07', 99, 'tea'),
    ]);
    const screen = await render(<HabitDetailScreen />);
    expect(shown(screen)).toEqual(
      expect.arrayContaining(['$5.00', '1 day bought · 3 days skipped']),
    );
    expect(shown(screen)).not.toContain('$99.00');
    expect(daysListed(screen, '2026-10-05')).toEqual([
      '2026-10-09',
      '2026-10-08',
      '2026-10-07',
      '2026-10-06',
      '2026-10-05',
    ]);
  });

  it('lists the weeks newest first, from this week back to the one it began in, with this week open', async () => {
    mockToday = '2026-10-16';
    mockId = 'tim';
    mockHabit = query<HabitRow | null | undefined>(TIM);
    mockTaps = query<HabitTap[] | undefined>(TIM_TAPS);
    const screen = await render(<HabitDetailScreen />);

    expect(weeksListed(screen)).toEqual(['2026-10-12', '2026-10-05', '2026-09-28']);
    expect(fold(screen, '2026-10-12').props.accessibilityState).toMatchObject({ expanded: true });
    expect(fold(screen, '2026-10-05').props.accessibilityState).toMatchObject({ expanded: false });
    expect(fold(screen, '2026-09-28').props.accessibilityState).toMatchObject({ expanded: false });

    // Only the open week shows its days, newest first, from today back to Monday.
    expect(daysListed(screen, '2026-10-12')).toEqual([
      '2026-10-16',
      '2026-10-15',
      '2026-10-14',
      '2026-10-13',
      '2026-10-12',
    ]);
    expect(screen.queryAllByTestId(/^habit-day-2026-10-(0|10|11)/)).toHaveLength(0);
  });

  it('writes each week’s figures from the design: this week, last week, the first week', async () => {
    mockToday = '2026-10-16';
    mockId = 'tim';
    mockHabit = query<HabitRow | null | undefined>(TIM);
    mockTaps = query<HabitTap[] | undefined>(TIM_TAPS);
    const screen = await render(<HabitDetailScreen />);

    expect(shown(week(screen, '2026-10-12'))).toEqual(
      expect.arrayContaining([
        'This week',
        '$20.00',
        '$5.00',
        'Out of $35.00 spend limit',
        'Day 5 of 7',
      ]),
    );
    expect(shown(week(screen, '2026-10-05'))).toEqual(
      expect.arrayContaining([
        'Last week',
        '$25.00',
        '$10.00',
        'Out of $35.00 spend limit',
        'Week complete',
      ]),
    );
    expect(shown(week(screen, '2026-09-28'))).toEqual(
      expect.arrayContaining(['$15.00', '$20.00', 'Out of $35.00 spend limit', 'Week complete']),
    );
  });

  it('draws this week’s days: bought opens a receipt, skipped says +$5.00 saved, today is bought', async () => {
    mockToday = '2026-10-16';
    mockId = 'tim';
    mockHabit = query<HabitRow | null | undefined>(TIM);
    mockTaps = query<HabitTap[] | undefined>(TIM_TAPS);
    const screen = await render(<HabitDetailScreen />);

    expect(shown(within(day(screen, '2026-10-16')))).toEqual([
      'Fri, Oct 16',
      'Today · Bought',
      '$5.00',
    ]);
    expect(shown(within(day(screen, '2026-10-15')))).toEqual(['Thu, Oct 15', 'Bought', '$5.00']);
    expect(shown(within(day(screen, '2026-10-14')))).toEqual([
      'Wed, Oct 14',
      'Skipped',
      '+$5.00',
      'saved',
    ]);
  });

  it('draws today as not bought yet, with a dash, when nothing was filed for it', async () => {
    mockToday = '2026-10-16';
    mockId = 'tim';
    mockHabit = query<HabitRow | null | undefined>(TIM);
    mockTaps = query<HabitTap[] | undefined>(
      TIM_TAPS.filter((entry) => entry.day !== '2026-10-16'),
    );
    const screen = await render(<HabitDetailScreen />);
    expect(shown(within(day(screen, '2026-10-16')))).toEqual([
      'Fri, Oct 16',
      'Today · not bought yet',
      '–',
    ]);
    // Today saves nothing until it is over: eleven bought, the same seven skipped, $55.00 spent.
    expect(shown(screen)).toEqual(
      expect.arrayContaining(['$55.00', '$35.00', '11 days bought · 7 days skipped']),
    );
  });

  it('opens the receipt behind a bought day, with that receipt’s own id', async () => {
    mockToday = '2026-10-16';
    mockId = 'tim';
    mockHabit = query<HabitRow | null | undefined>(TIM);
    mockTaps = query<HabitTap[] | undefined>(TIM_TAPS);
    const screen = await render(<HabitDetailScreen />);

    await fireEvent.press(day(screen, '2026-10-15'));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/receipt/[id]',
      params: { id: 'r-tim-2026-10-15' },
    });
    await fireEvent.press(day(screen, '2026-10-12'));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/receipt/[id]',
      params: { id: 'r-tim-2026-10-12' },
    });

    // A skipped day opens nothing.
    await fireEvent.press(day(screen, '2026-10-14'));
    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('opens a week to show its days, and several can be open at once', async () => {
    mockToday = '2026-10-16';
    mockId = 'tim';
    mockHabit = query<HabitRow | null | undefined>(TIM);
    mockTaps = query<HabitTap[] | undefined>(TIM_TAPS);
    const screen = await render(<HabitDetailScreen />);

    await fireEvent.press(fold(screen, '2026-10-05'));
    expect(fold(screen, '2026-10-05').props.accessibilityState).toMatchObject({ expanded: true });
    // This week stays open beside it.
    expect(fold(screen, '2026-10-12').props.accessibilityState).toMatchObject({ expanded: true });
    expect(daysListed(screen, '2026-10-05')).toEqual([
      '2026-10-11',
      '2026-10-10',
      '2026-10-09',
      '2026-10-08',
      '2026-10-07',
      '2026-10-06',
      '2026-10-05',
    ]);
    expect(shown(within(day(screen, '2026-10-11')))).toEqual([
      'Sun, Oct 11',
      'Skipped',
      '+$5.00',
      'saved',
    ]);
    expect(daysListed(screen, '2026-10-12')).toHaveLength(5);

    await fireEvent.press(fold(screen, '2026-09-28'));
    expect(daysListed(screen, '2026-09-28')).toEqual([
      '2026-10-04',
      '2026-10-03',
      '2026-10-02',
      '2026-10-01',
      '2026-09-30',
      '2026-09-29',
      '2026-09-28',
    ]);
    expect(
      ['2026-10-12', '2026-10-05', '2026-09-28'].map(
        (weekStart) => fold(screen, weekStart).props.accessibilityState.expanded,
      ),
    ).toEqual([true, true, true]);

    // A bought day in an older week opens its own receipt.
    await fireEvent.press(day(screen, '2026-10-02'));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/receipt/[id]',
      params: { id: 'r-tim-2026-10-02' },
    });

    // Pressing the header again closes just that week.
    await fireEvent.press(fold(screen, '2026-10-05'));
    expect(fold(screen, '2026-10-05').props.accessibilityState).toMatchObject({ expanded: false });
    expect(daysListed(screen, '2026-10-05')).toEqual([]);
    expect(fold(screen, '2026-10-12').props.accessibilityState).toMatchObject({ expanded: true });
    expect(fold(screen, '2026-09-28').props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('closes this week when it is pressed, and opens it again', async () => {
    const screen = await render(<HabitDetailScreen />);
    expect(daysListed(screen, '2026-10-05')).toHaveLength(5);
    await fireEvent.press(fold(screen, '2026-10-05'));
    expect(daysListed(screen, '2026-10-05')).toEqual([]);
    await fireEvent.press(fold(screen, '2026-10-05'));
    expect(daysListed(screen, '2026-10-05')).toHaveLength(5);
  });

  it('draws a receipt edited to $6.50 at $6.50 on its day', async () => {
    const screen = await render(<HabitDetailScreen />);
    expect(shown(within(day(screen, '2026-10-07')))).toEqual(['Wed, Oct 7', 'Bought', '$6.50']);
    expect(shown(within(day(screen, '2026-10-05')))).toEqual(['Mon, Oct 5', 'Bought', '$5.00']);
  });

  it('lists a receipt dated before the habit began, and one dated after today, in their own weeks', async () => {
    mockTaps = query<HabitTap[] | undefined>([
      tap('2026-09-30'),
      tap('2026-10-05'),
      tap('2026-10-20'),
    ]);
    const screen = await render(<HabitDetailScreen />);

    expect(weeksListed(screen)).toEqual(['2026-10-19', '2026-10-05', '2026-09-28']);
    expect(shown(screen)).toEqual(expect.arrayContaining(['3 weeks', '$15.00']));
    // The week before it began has its Spent and Saved, and says when the habit starts.
    expect(shown(week(screen, '2026-09-28'))).toEqual([
      'Last week',
      `Sep${NBSP}28${NBSP}– Oct${NBSP}4`,
      'Spent',
      '$5.00',
      'Saved',
      '$0.00',
      'Starts Mon, Oct 5',
    ]);
    // The week still to come has its figures and no day count.
    expect(shown(week(screen, '2026-10-19'))).toEqual([
      `Oct${NBSP}19${NBSP}– 25`,
      'Spent',
      '$5.00',
      'Saved',
      '$0.00',
      'Out of $35.00 spend limit',
    ]);
    await fireEvent.press(fold(screen, '2026-09-28'));
    expect(daysListed(screen, '2026-09-28')).toEqual(['2026-09-30']);
    await fireEvent.press(day(screen, '2026-09-30'));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/receipt/[id]',
      params: { id: 'r-coffee-2026-09-30' },
    });
  });

  it('has no interactive day circles, receipts list or tiles left from the old page', async () => {
    const screen = await render(<HabitDetailScreen />);
    expect(screen.queryAllByLabelText(/^Coffee, /)).toHaveLength(0);
    expect(screen.queryByText('Receipts from Coffee')).toBeNull();
    expect(screen.queryByTestId('habit-receipts')).toBeNull();
    expect(screen.queryByText('Each time')).toBeNull();
  });

  it('says “About this habit”: price, how it is paid, category, colour and when it started', async () => {
    mockToday = '2026-10-16';
    mockId = 'tim';
    mockHabit = query<HabitRow | null | undefined>(TIM);
    mockTaps = query<HabitTap[] | undefined>(TIM_TAPS);
    const screen = await render(<HabitDetailScreen />);

    expect(shown(within(screen.getByTestId('habit-about')))).toEqual([
      'Price',
      '$5.00 each time',
      'Paid with',
      'Visa ••4242',
      'Category',
      'Dining & Takeout',
      'Colour',
      'Caramel',
      'Started',
      '28 Sep 2026',
    ]);
    expect(shown(screen)).toContain('About this habit');
  });

  it('opens the edit page from the pencil', async () => {
    const screen = await render(<HabitDetailScreen />);
    await fireEvent.press(screen.getByLabelText('Edit Coffee'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/habit-new',
      params: { id: 'coffee' },
    });
  });

  it('says there is no card or account when none is behind it', async () => {
    mockHabit = query<HabitRow | null | undefined>(habitRow({ card_id: null }));
    const screen = await render(<HabitDetailScreen />);
    const rows = shown(within(screen.getByTestId('habit-about')));
    expect(rows.slice(2, 4)).toEqual(['Paid with', 'No card or account']);
  });
});

describe('a habit’s page: a habit from an earlier year', () => {
  beforeEach(() => {
    mockToday = '2026-01-07';
    mockId = 'old';
    mockHabit = query<HabitRow | null | undefined>(
      habitRow({
        id: 'old',
        name: 'Old habit',
        started_on: '2025-12-22',
        saved_from: '2025-12-22',
      }),
    );
    mockTaps = query<HabitTap[] | undefined>([]);
  });

  it('names the year of its start in the hero and the started row, and of the weeks that ended last year', async () => {
    const screen = await render(<HabitDetailScreen />);
    // Dec 22 to Jan 6: sixteen days skipped at $5.00.
    expect(shown(screen)).toEqual(
      expect.arrayContaining([
        '$5.00 each time · since Dec 22, 2025',
        '$80.00',
        '0 days bought · 16 days skipped',
        '3 weeks',
        '22 Dec 2025',
      ]),
    );
    expect(screen.getByTestId('habits-hero').props.accessibilityLabel).toBe(
      '$5.00 each time · since Dec 22, 2025. Spent so far, $0.00. Saved so far, $80.00.',
    );
    expect(weeksListed(screen)).toEqual(['2026-01-05', '2025-12-29', '2025-12-22']);
    // Only the week that ended in 2025 names its year; the one ending Jan 4 is this year's.
    expect(shown(week(screen, '2025-12-22'))).toContain(`Dec${NBSP}22${NBSP}– 28,${NBSP}2025`);
    expect(shown(week(screen, '2025-12-29'))).toContain(`Dec${NBSP}29${NBSP}– Jan${NBSP}4`);
    expect(shown(week(screen, '2026-01-05'))).toContain(`Jan${NBSP}5${NBSP}– 11`);
  });

  it('writes it the way Spanish and French do', async () => {
    setLanguage('es');
    const es = await render(<HabitDetailScreen />);
    expect(shown(es)).toContain('$5.00 cada vez · desde el 22 dic 2025');
    setLanguage('fr');
    const fr = await render(<HabitDetailScreen />);
    expect(shown(fr)).toContain(`5,00${NBSP}$ chaque fois · depuis le 22 déc. 2025`);
  });

  it('leaves the year off a habit that began this year', async () => {
    mockToday = '2026-10-09';
    mockHabit = query<HabitRow | null | undefined>(habitRow({ id: 'old' }));
    const screen = await render(<HabitDetailScreen />);
    expect(shown(screen)).toContain('$5.00 each time · since Oct 5');
  });
});

describe('a habit’s page on a free plan', () => {
  beforeEach(() => {
    mockToday = '2026-10-16';
    mockId = 'tim';
    mockHabit = query<HabitRow | null | undefined>(TIM);
    mockTaps = query<HabitTap[] | undefined>(TIM_TAPS);
  });

  it('leaves out the weeks that end before the 90-day floor and the days before it, and says older history is saved', async () => {
    // The floor is Wednesday the 7th: the week of Sep 28 ends before it; the week of Oct 5 is cut.
    mockFloor = { floor: '2026-10-07', free: true };
    const screen = await render(<HabitDetailScreen />);

    expect(weeksListed(screen)).toEqual(['2026-10-12', '2026-10-05']);
    // The count is of the weeks listed, not of every week the habit has had.
    expect(shown(screen)).toContain('2 weeks');
    expect(shown(screen)).not.toContain('3 weeks');
    await fireEvent.press(fold(screen, '2026-10-05'));
    expect(daysListed(screen, '2026-10-05')).toEqual([
      '2026-10-11',
      '2026-10-10',
      '2026-10-09',
      '2026-10-08',
      '2026-10-07',
    ]);

    // The totals and the cut week’s own figures still count everything.
    expect(shown(screen)).toEqual(
      expect.arrayContaining(['$60.00', '$35.00', '12 days bought · 7 days skipped']),
    );
    expect(shown(week(screen, '2026-10-05'))).toEqual(
      expect.arrayContaining(['$25.00', '$10.00', 'Week complete']),
    );

    expect(screen.getByText('Older history is saved')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/^Older history is saved/));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/pro-feature',
      params: { id: 'history' },
    });
  });

  it('says it too when only days of the first listed week are hidden', async () => {
    mockFloor = { floor: '2026-10-02', free: true };
    const screen = await render(<HabitDetailScreen />);
    expect(weeksListed(screen)).toEqual(['2026-10-12', '2026-10-05', '2026-09-28']);
    expect(shown(screen)).toContain('3 weeks');
    await fireEvent.press(fold(screen, '2026-09-28'));
    expect(daysListed(screen, '2026-09-28')).toEqual(['2026-10-04', '2026-10-03', '2026-10-02']);
    expect(screen.getByText('Older history is saved')).toBeTruthy();
  });

  it('shows no notice when the plan hides nothing', async () => {
    mockFloor = { floor: '2026-07-18', free: true };
    const screen = await render(<HabitDetailScreen />);
    expect(weeksListed(screen)).toEqual(['2026-10-12', '2026-10-05', '2026-09-28']);
    expect(screen.queryByText('Older history is saved')).toBeNull();
  });

  it('shows Pro every week and no notice', async () => {
    mockFloor = { floor: '2019-10-16', free: false };
    const screen = await render(<HabitDetailScreen />);
    expect(weeksListed(screen)).toHaveLength(3);
    expect(screen.queryByText('Older history is saved')).toBeNull();
  });
});

describe('a habit’s page: states', () => {
  it('says how it stands before any receipt: nothing spent, every finished day saved', async () => {
    mockTaps = query<HabitTap[] | undefined>([]);
    const screen = await render(<HabitDetailScreen />);
    expect(shown(screen)).toEqual(
      expect.arrayContaining(['$0.00', '$20.00', '0 days bought · 4 days skipped', '1 week']),
    );
    expect(daysListed(screen, '2026-10-05')).toEqual([
      '2026-10-09',
      '2026-10-08',
      '2026-10-07',
      '2026-10-06',
      '2026-10-05',
    ]);
    expect(shown(within(day(screen, '2026-10-09')))).toEqual([
      'Fri, Oct 9',
      'Today · not bought yet',
      '–',
    ]);
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

  it('says a failed read of the receipts failed too, rather than showing a habit with no history', async () => {
    mockTaps = { ...query<HabitTap[] | undefined>(undefined), isError: true };
    const screen = await render(<HabitDetailScreen />);
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    expect(screen.queryByText('Week by week')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Try again'));
    expect(mockHabit.refetch).toHaveBeenCalled();
    expect(mockTaps.refetch).toHaveBeenCalled();
  });

  it('keeps the page when a refresh fails, with the failure line and Try again', async () => {
    mockTaps = { ...mockTaps, isError: true };
    mockHabit = { ...mockHabit, isError: true };
    const screen = await render(<HabitDetailScreen />);

    expect(shown(screen)).toEqual(
      expect.arrayContaining(['$5.00 each time · since Oct 5', '$11.50', 'Week by week']),
    );
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Try again'));
    expect(mockHabit.refetch).toHaveBeenCalled();
    expect(mockTaps.refetch).toHaveBeenCalled();
    // A habit still there is not taken for a deleted one because its refresh failed.
    expect(router.back).not.toHaveBeenCalled();
  });

  it('waits on a skeleton while loading', async () => {
    mockHabit = { ...query<HabitRow | null | undefined>(undefined), isPending: true };
    const screen = await render(<HabitDetailScreen />);
    expect(screen.getByTestId('skeleton-4')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('waits on a skeleton while only the receipts are still loading', async () => {
    mockTaps = { ...query<HabitTap[] | undefined>(undefined), isPending: true };
    const screen = await render(<HabitDetailScreen />);
    expect(screen.getByTestId('skeleton-4')).toBeTruthy();
    expect(screen.queryByText('Week by week')).toBeNull();
  });
});

describe('a habit’s page: money and languages', () => {
  beforeEach(() => {
    mockToday = '2026-10-16';
    mockId = 'tim';
  });

  it('writes pounds, to the cent, in the hero, the weeks and the days', async () => {
    setCurrency('GBP');
    mockHabit = query<HabitRow | null | undefined>({ ...TIM, price: 4.5 });
    mockTaps = query<HabitTap[] | undefined>([
      tap('2026-10-12', 4.5, 'tim'),
      tap('2026-10-15', 6.75, 'tim'),
    ]);
    const screen = await render(<HabitDetailScreen />);

    // Since Sep 28: the Monday of the 28th to yesterday is 18 days, two bought in the whole run.
    const words = shown(screen);
    expect(words).toEqual(
      expect.arrayContaining([
        '£4.50 each time · since Sep 28',
        '£11.25',
        // 18 days to the 15th, 2 bought: 16 skipped at £4.50.
        '£72.00',
        '2 days bought · 16 days skipped',
        'Out of £31.50 spend limit',
        '£4.50 each time',
      ]),
    );
    expect(words.filter((word) => word.includes('$'))).toEqual([]);
    expect(shown(within(day(screen, '2026-10-15')))).toEqual(['Thu, Oct 15', 'Bought', '£6.75']);
    expect(shown(within(day(screen, '2026-10-14')))).toEqual([
      'Wed, Oct 14',
      'Skipped',
      '+£4.50',
      'saved',
    ]);
  });

  it('writes pesos with thousands and cents whole', async () => {
    setCurrency('MXN');
    mockHabit = query<HabitRow | null | undefined>({ ...TIM, price: 250 });
    mockTaps = query<HabitTap[] | undefined>([
      tap('2026-10-12', 250, 'tim'),
      tap('2026-10-13', 1234.5, 'tim'),
    ]);
    const screen = await render(<HabitDetailScreen />);
    expect(shown(screen)).toEqual(
      expect.arrayContaining([
        '$250.00 each time · since Sep 28',
        '$1,484.50',
        'Out of $1,750.00 spend limit',
      ]),
    );
    expect(shown(within(day(screen, '2026-10-13')))).toEqual([
      'Tue, Oct 13',
      'Bought',
      '$1,234.50',
    ]);
  });

  it('reads in Spanish', async () => {
    setLanguage('es');
    mockHabit = query<HabitRow | null | undefined>(TIM);
    mockTaps = query<HabitTap[] | undefined>(TIM_TAPS);
    const screen = await render(<HabitDetailScreen />);

    const words = shown(screen);
    expect(words).toEqual(
      expect.arrayContaining([
        '$5.00 cada vez · desde el 28 sep',
        'Gastado hasta hoy',
        'Ahorrado hasta hoy',
        '12 días comprados · 7 días sin comprar',
        'Semana a semana',
        '3 semanas',
        'Esta semana',
        'Sobre este hábito',
        'Precio',
        '$5.00 cada vez',
      ]),
    );
    expect(shown(within(day(screen, '2026-10-14')))).toEqual([
      'mié 14 oct',
      'Sin comprar',
      '+$5.00',
      'ahorrado',
    ]);
    expect(shown(within(day(screen, '2026-10-16')))).toEqual([
      'vie 16 oct',
      'Hoy · Comprado',
      '$5.00',
    ]);
    expect(screen.getByLabelText('Editar Tim Hortons')).toBeTruthy();
    expect(leftovers(screen)).toEqual([]);
  });

  it('reads in French', async () => {
    setLanguage('fr');
    mockHabit = query<HabitRow | null | undefined>(TIM);
    mockTaps = query<HabitTap[] | undefined>(TIM_TAPS);
    const screen = await render(<HabitDetailScreen />);

    const words = shown(screen);
    expect(words).toEqual(
      expect.arrayContaining([
        `5,00${NBSP}$ chaque fois · depuis le 28 sept.`,
        'Dépensé jusqu’ici',
        'Économisé jusqu’ici',
        '12 jours achetés · 7 jours sans achat',
        'Semaine par semaine',
        '3 semaines',
        'Cette semaine',
        'À propos de cette habitude',
        'Prix',
        `5,00${NBSP}$ chaque fois`,
      ]),
    );
    expect(shown(within(day(screen, '2026-10-14')))).toEqual([
      'mer. 14 oct.',
      'Sans achat',
      `+5,00${NBSP}$`,
      'économisé',
    ]);
    expect(screen.getByLabelText('Modifier Tim Hortons')).toBeTruthy();
    expect(leftovers(screen)).toEqual([]);
  });
});
