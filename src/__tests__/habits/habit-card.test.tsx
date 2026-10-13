import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { HabitRow } from '@/api/habits';
import { ToolCards } from '@/components/dashboard/tool-cards';
import { HabitCard } from '@/components/habits/habit-card';
import { habitColor } from '@/data/habit-colors';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import type { HabitTap } from '@/lib/habit-week';

/**
 * A habit's card: what the week spent against its limit, what it saved, how far through the week it
 * is, a circle per day that fills, empties or stays inert, the pencil and View details. Also the card
 * drawn as a preview, and the Home tool card's PRO pill wording.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), success: jest.fn(), warn: jest.fn() }));

const mockIcon = jest.fn();
jest.mock('@/components/habits/habit-icon', () => ({
  HabitIcon: (props: object) => {
    mockIcon(props);
    return null;
  },
}));

let mockScheme: 'light' | 'dark' = 'light';
const COLORS = {
  ink: '#111111',
  muted: '#6F6F6F',
  line: '#E5E1DC',
  onControl: '#FFFFFF',
  accentInk: '#905479',
};
// Jest turns an .svg into a number, not a component; the icons have suites of their own.
jest.mock('@/theme/home-icons', () => ({
  useHomeIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => COLORS,
  useTheme: () => ({ scheme: mockScheme, colors: COLORS }),
  // Named so a test can tell which colour a figure was given.
  useMoneyColor: () => (amount: number) => (amount > 0 ? 'MONEY_IN' : amount < 0 ? 'OUT' : 'INK'),
}));

/** Friday. Its week runs Monday the 5th to Sunday the 11th. */
const TODAY = '2026-10-09';
const THIS_WEEK = '2026-10-05';
const LAST_WEEK = '2026-09-28';

/** The design's day: Friday the 16th, in the week of Monday the 12th. */
const FRIDAY = '2026-10-16';
const FRIDAY_WEEK = '2026-10-12';
const WEEK_BEFORE = '2026-10-05';

const habit = (over: Partial<HabitRow> = {}): HabitRow => ({
  id: 'coffee',
  name: 'Coffee',
  icon_id: 'food-dining/coffee',
  color: 'caramel',
  price: 5,
  category_id: 'dining',
  card_id: null,
  bank_account_id: null,
  preset_id: 'coffee',
  started_on: THIS_WEEK,
  saved_from: THIS_WEEK,
  sort_order: 0,
  archived_at: null,
  created_at: '2026-10-05T08:00:00Z',
  ...over,
});

const tap = (day: string, habitId = 'coffee', amount = 5): HabitTap => ({
  habitId,
  day,
  amount,
  receiptId: `r-${habitId}-${day}`,
});

/** Made on the Monday of the 28th. */
const TIM = habit({
  id: 'tim',
  name: 'Tim Hortons',
  price: 5,
  started_on: '2026-09-28',
  saved_from: '2026-09-28',
});
/** Made on Wednesday the 14th, so its first week has five days. */
const BREAKFAST = habit({
  id: 'bfast',
  name: 'Breakfast',
  icon_id: 'food-dining/breakfast',
  color: 'green',
  price: 4,
  started_on: '2026-10-12',
  saved_from: '2026-10-14',
});
const TIM_DAYS = [
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
];
const DESIGN_TAPS = [...TIM_DAYS.map((day) => tap(day, 'tim')), tap('2026-10-14', 'bfast', 4)];

type Screen = Awaited<ReturnType<typeof render>>;
const flat = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

type Node = { props: Record<string, unknown>; children: unknown[]; parent: Node | null };
const node = (screen: Screen, testID: string) =>
  screen.getByTestId(testID, { includeHiddenElements: true }) as unknown as Node;

/** The price beside or under the name: its words and size. */
function price(screen: Screen) {
  const slot = node(screen, 'fit-slot-price');
  const text = slot.children[0] as Node;
  return { slot, text: text.props.children, size: flat(text as never).fontSize };
}

/** Lays the header out: the card's room, the name's slot beside the price, its widest word. */
async function layOutHeader(screen: Screen, room: number, slot: number, word: number) {
  const layout = (testID: string, width: number) =>
    fireEvent(node(screen, testID) as never, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
    });
  await layout('habit-header', room);
  await layout('fit-slot-name', slot);
  await layout('fit-copy-name', word);
}

/** Every word drawn, top to bottom, read off the nodes: a text matcher would fold no-break spaces. */
const shown = (screen: Screen) =>
  screen.getAllByText(/./).map((text) => String(text.props.children));

/** The spoken summary of a card, by habit id. */
const summary = (screen: Screen, id: string) =>
  node(screen, `habit-summary-${id}`).props.accessibilityLabel as string;

/** How wide the bar's fill is drawn, as the percent it was given. */
const barWidth = (screen: Screen, id: string) => {
  const fill = node(screen, `habit-bar-${id}`).children[0] as Node;
  return String(flat(fill as never).width);
};

/**
 * What VoiceOver stops on, in order: every accessible node with a label, not looking inside one,
 * since its children are read as part of it.
 */
function readingOrder(screen: Screen): string[] {
  type Json = { props: Record<string, unknown>; children: Json[] | null } | string;
  const found: string[] = [];
  const walk = (entry: Json | Json[] | null) => {
    if (entry === null || typeof entry === 'string') return;
    if (Array.isArray(entry)) return void entry.forEach(walk);
    const { accessible, accessibilityLabel } = entry.props;
    if (accessible === true && typeof accessibilityLabel === 'string') {
      return void found.push(accessibilityLabel);
    }
    entry.children?.forEach(walk);
  };
  walk(screen.toJSON() as never);
  return found;
}

const noop = () => {};

beforeEach(() => {
  resetLocaleForTests();
  mockScheme = 'light';
  mockIcon.mockClear();
});
afterAll(() => resetLocaleForTests());

describe('HabitCard: the design’s figures on Friday the 16th', () => {
  const week = (row: HabitRow, weekStart: string) => (
    <HabitCard
      habit={row}
      taps={DESIGN_TAPS}
      weekStart={weekStart}
      today={FRIDAY}
      onEdit={noop}
      onDetails={noop}
    />
  );
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  it('shows Tim Hortons’ week: the spent figure, the limit, the saved line, the bar, then Day 5 of 7', async () => {
    const screen = await render(week(TIM, FRIDAY_WEEK));
    // Four days bought at $5 of seven days at $5; Wednesday is over and was skipped.
    expect(shown(screen)).toEqual([
      'Tim Hortons',
      '$5',
      '$20.00',
      'Out of $35.00 spend limit',
      '$5.00 saved',
      'Day 5 of 7',
      ...days,
      'View details',
    ]);
    expect(barWidth(screen, 'tim')).toMatch(/^57\.14285\d+%$/);
  });

  it('shows Breakfast’s first week, made on a Wednesday: five days, so a $20.00 limit and Day 3 of 5', async () => {
    const screen = await render(week(BREAKFAST, FRIDAY_WEEK));
    expect(shown(screen)).toEqual([
      'Breakfast',
      '$4',
      '$4.00',
      'Out of $20.00 spend limit',
      '$4.00 saved',
      'Day 3 of 5',
      ...days,
      'View details',
    ]);
    expect(Number.parseFloat(barWidth(screen, 'bfast'))).toBeCloseTo(20, 8);
    // Monday and Tuesday were before it was made: faded and out of reach.
    for (const day of ['Monday, October 12', 'Tuesday, October 13']) {
      const circle = screen.getByLabelText(`Breakfast, ${day}, before this habit started`);
      expect(circle).toBeDisabled();
    }
    expect(screen.getByTestId('day-2026-10-12').props.className).toContain('opacity-40');
    expect(screen.getByTestId('day-2026-10-14').props.className).not.toContain('opacity-40');
  });

  it('closes last week for Tim Hortons: Spent plus Saved is the limit, and the pill says Week complete', async () => {
    const screen = await render(week(TIM, WEEK_BEFORE));
    // Monday to Thursday and Saturday bought; Friday and Sunday saved $10.00 of the $35.00.
    expect(shown(screen)).toEqual([
      'Tim Hortons',
      '$5',
      '$25.00',
      'Out of $35.00 spend limit',
      '$10.00 saved',
      'Week complete',
      ...days,
      'View details',
    ]);
    expect(Number.parseFloat(barWidth(screen, 'tim'))).toBeCloseTo((25 / 35) * 100, 8);
  });

  it('gives Breakfast no figures, bar or pill in the week before it was made, only when it starts', async () => {
    const screen = await render(week(BREAKFAST, WEEK_BEFORE));
    expect(shown(screen)).toEqual([
      'Breakfast',
      '$4',
      'Starts Wed, Oct 14',
      ...days,
      'View details',
    ]);
    expect(screen.queryByTestId('habit-bar-bfast', { includeHiddenElements: true })).toBeNull();
    expect(summary(screen, 'bfast')).toBe('Breakfast, $4.00 each time, Starts Wed, Oct 14.');

    // Every day is faded and inert, the Wednesday it starts included.
    const circles = screen.getAllByLabelText(/before this habit started$/);
    expect(circles).toHaveLength(7);
    circles.forEach((circle) => expect(circle).toBeDisabled());
    expect(screen.getByTestId('day-2026-10-05').props.className).toContain('opacity-40');
  });

  it('keeps pencil and View details on the not-yet-started week', async () => {
    const onEdit = jest.fn();
    const onDetails = jest.fn();
    const screen = await render(
      <HabitCard
        habit={BREAKFAST}
        taps={DESIGN_TAPS}
        weekStart={WEEK_BEFORE}
        today={FRIDAY}
        onEdit={onEdit}
        onDetails={onDetails}
      />,
    );
    await fireEvent.press(screen.getByLabelText('Edit Breakfast'));
    await fireEvent.press(screen.getByLabelText('View details, Breakfast'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDetails).toHaveBeenCalledTimes(1);
  });

  it('counts only its own habit’s receipts when it is handed every habit’s taps', async () => {
    // Breakfast’s tap on Wednesday and Tim’s Monday, Tuesday, Thursday and Friday are all in the list.
    const screen = await render(week(BREAKFAST, FRIDAY_WEEK));
    expect(screen.getByText('$4.00')).toBeTruthy();
    expect(screen.queryByText('$24.00')).toBeNull();
    expect(screen.queryByText('$20.00')).toBeNull();
  });
});

describe('HabitCard: the price', () => {
  it.each([
    [5, '$5'],
    [4.5, '$4.50'],
    [0.99, '$0.99'],
    [4.05, '$4.05'],
    [12, '$12'],
    [1250, '$1,250'],
    [1250.5, '$1,250.50'],
  ])('writes %s as %s, never rounded', async (amount, expected) => {
    const screen = await render(
      <HabitCard habit={habit({ price: amount })} taps={[]} weekStart={THIS_WEEK} today={TODAY} />,
    );
    expect(price(screen).text).toBe(expected);
  });

  it('keeps the cents when the price is spoken, whole or not', async () => {
    const whole = await render(
      <HabitCard habit={habit()} taps={[]} weekStart={THIS_WEEK} today={TODAY} />,
    );
    expect(summary(whole, 'coffee')).toMatch(/^Coffee, \$5\.00 each time\. /);
    const cents = await render(
      <HabitCard
        habit={habit({ id: 'tea', price: 4.5 })}
        taps={[]}
        weekStart={THIS_WEEK}
        today={TODAY}
      />,
    );
    expect(summary(cents, 'tea')).toMatch(/^Coffee, \$4\.50 each time\. /);
  });

  it('sits at 20pt, bold, on the right of the header row', async () => {
    const screen = await render(
      <HabitCard habit={habit()} taps={[]} weekStart={THIS_WEEK} today={TODAY} />,
    );
    const shownPrice = price(screen);
    expect(shownPrice.size).toBe(20);
    expect(String((shownPrice.slot.children[0] as Node).props.className)).toContain(
      'font-app-bold text-ink',
    );
    expect(shownPrice.slot.props.className).toContain('shrink-0');
    expect(shownPrice.slot.parent).toBe(node(screen, 'fit-slot-name').parent!.parent);
  });

  it('follows the currency chosen: pounds and pesos, cents kept only where there are some', async () => {
    setCurrency('GBP');
    const pounds = await render(
      <HabitCard
        habit={habit({ price: 4.5 })}
        taps={[tap(THIS_WEEK)]}
        weekStart={THIS_WEEK}
        today={TODAY}
      />,
    );
    expect(price(pounds).text).toBe('£4.50');
    expect(shown(pounds)).toEqual(
      expect.arrayContaining(['£5.00', 'Out of £31.50 spend limit', '£13.50 saved']),
    );
    expect(shown(pounds).filter((word) => word.includes('$'))).toEqual([]);

    setCurrency('MXN');
    const pesos = await render(
      <HabitCard habit={habit({ price: 50 })} taps={[]} weekStart={THIS_WEEK} today={TODAY} />,
    );
    expect(price(pesos).text).toBe('$50');
    expect(shown(pesos)).toEqual(expect.arrayContaining(['Out of $350.00 spend limit']));
  });
});

describe('HabitCard', () => {
  const coffeeTaps = [tap('2026-10-05'), tap('2026-10-07'), tap('2026-10-02', 'other', 99)];

  it('draws the habit’s icon, name and price, with Coffee’s own figures for the week', async () => {
    const screen = await render(
      <HabitCard habit={habit()} taps={coffeeTaps} weekStart={THIS_WEEK} today={TODAY} />,
    );

    // Monday and Wednesday bought; Tuesday and Thursday saved; today is Day 5 of 7.
    expect(shown(screen)).toEqual(
      expect.arrayContaining([
        'Coffee',
        '$5',
        '$10.00',
        'Out of $35.00 spend limit',
        '$10.00 saved',
        'Day 5 of 7',
      ]),
    );
    expect(mockIcon).toHaveBeenCalledWith({
      iconId: 'food-dining/coffee',
      color: 'caramel',
      size: 44,
    });
  });

  it('puts the spent figure, the limit, the saved line and the bar in one spoken summary', async () => {
    const screen = await render(
      <HabitCard habit={habit()} taps={coffeeTaps} weekStart={THIS_WEEK} today={TODAY} />,
    );
    const stop = node(screen, 'habit-summary-coffee');
    expect(stop.props.accessible).toBe(true);
    expect(stop.props.accessibilityLabel).toBe(
      'Coffee, $5.00 each time. $10.00 spent out of $35.00. $10.00 saved. Day 5 of 7.',
    );
    // Found by its label, and not a button: the pencil and View details are the card’s buttons.
    expect(
      screen.getByLabelText(/^Coffee, \$5\.00 each time\./).props.accessibilityRole,
    ).toBeUndefined();
  });

  it('only fills days from the day the habit was made; earlier ones are faded and inert', async () => {
    // Made Thursday: Monday to Wednesday were before it.
    const onTapDay = jest.fn();
    const screen = await render(
      <HabitCard
        habit={habit({ saved_from: '2026-10-08' })}
        taps={[]}
        weekStart={THIS_WEEK}
        today={TODAY}
        onTapDay={onTapDay}
      />,
    );
    const monday = screen.getByLabelText('Coffee, Monday, October 5, before this habit started');
    expect(monday).toBeDisabled();
    await fireEvent.press(monday);
    expect(onTapDay).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Coffee, Thursday, October 8, not bought'));
    expect(onTapDay).toHaveBeenCalledWith('2026-10-08');
    // Thursday to Sunday are tracked: $20.00; Thursday saved $5.00; today is the second day of four.
    expect(summary(screen, 'coffee')).toBe(
      'Coffee, $5.00 each time. $0.00 spent out of $20.00. $5.00 saved. Day 2 of 4.',
    );
  });

  it('still shows, and can remove, a receipt filed before the habit was made', async () => {
    const onUntapDay = jest.fn();
    const early = tap('2026-10-05');
    const screen = await render(
      <HabitCard
        habit={habit({ saved_from: '2026-10-07' })}
        taps={[early]}
        weekStart={THIS_WEEK}
        today={TODAY}
        onUntapDay={onUntapDay}
      />,
    );
    const monday = screen.getByLabelText('Coffee, Monday, October 5, bought, $5.00');
    expect(monday).toBeEnabled();
    await fireEvent.press(monday);
    expect(onUntapDay).toHaveBeenCalledWith(early);
    expect(
      screen.getByLabelText('Coffee, Tuesday, October 6, before this habit started'),
    ).toBeDisabled();
  });

  it('moves the price under the name once a word of the name cannot fit beside it', async () => {
    const screen = await render(
      <HabitCard
        habit={habit({ name: 'Extraordinarily long name' })}
        taps={coffeeTaps}
        weekStart={THIS_WEEK}
        today={TODAY}
      />,
    );
    // "Extraordinarily" needs 130pt; beside the price the name has 90.
    await layOutHeader(screen, 300, 90, 130);

    const moved = price(screen);
    expect(moved.text).toBe('$5');
    expect(moved.slot.parent).toBe(node(screen, 'fit-slot-name').parent);
  });

  it('keeps the price beside a name whose words fit', async () => {
    const screen = await render(
      <HabitCard habit={habit()} taps={coffeeTaps} weekStart={THIS_WEEK} today={TODAY} />,
    );
    await layOutHeader(screen, 300, 90, 60);
    expect(price(screen).slot.props.className).toContain('shrink-0');
  });

  it('gives each day a state, words for VoiceOver, and the right press', async () => {
    const onTapDay = jest.fn();
    const onUntapDay = jest.fn();
    const screen = await render(
      <HabitCard
        habit={habit()}
        taps={coffeeTaps}
        weekStart={THIS_WEEK}
        today={TODAY}
        onTapDay={onTapDay}
        onUntapDay={onUntapDay}
      />,
    );

    const monday = screen.getByLabelText('Coffee, Monday, October 5, bought, $5.00');
    expect(monday.props.accessibilityHint).toBe('Removes this receipt.');
    expect(flat(screen.getByTestId('day-2026-10-05')).backgroundColor).toBe(
      habitColor('caramel').fill,
    );

    const tuesday = screen.getByLabelText('Coffee, Tuesday, October 6, not bought');
    expect(tuesday.props.accessibilityHint).toBe('Records $5.00 spent on this day.');
    expect(flat(screen.getByTestId('day-2026-10-06'))).toMatchObject({
      borderWidth: 1.5,
      borderColor: COLORS.muted,
    });

    expect(screen.getByLabelText('Coffee, Friday, October 9, today, not bought yet')).toBeTruthy();
    expect(flat(screen.getByTestId('day-2026-10-09'))).toMatchObject({
      borderWidth: 2,
      borderColor: habitColor('caramel').fill,
    });

    const saturday = screen.getByLabelText('Coffee, Saturday, October 10, still to come');
    expect(saturday).toBeDisabled();
    expect(flat(screen.getByTestId('day-2026-10-10'))).toMatchObject({
      borderColor: COLORS.line,
    });

    await fireEvent.press(tuesday);
    await fireEvent.press(
      screen.getByLabelText('Coffee, Friday, October 9, today, not bought yet'),
    );
    await fireEvent.press(monday);
    await fireEvent.press(saturday);
    expect(onTapDay.mock.calls).toEqual([['2026-10-06'], ['2026-10-09']]);
    expect(onUntapDay).toHaveBeenCalledWith(coffeeTaps[0]);
    expect(onUntapDay).toHaveBeenCalledTimes(1);
  });

  it('draws days before the plan’s floor like days before the start, and does nothing with them', async () => {
    const onTapDay = jest.fn();
    const onUntapDay = jest.fn();
    // Free shows from Wednesday: Monday's receipt and Tuesday stay out of reach.
    const screen = await render(
      <HabitCard
        habit={habit()}
        taps={coffeeTaps}
        weekStart={THIS_WEEK}
        today={TODAY}
        floor="2026-10-07"
        onTapDay={onTapDay}
        onUntapDay={onUntapDay}
      />,
    );
    const monday = screen.getByLabelText('Coffee, Monday, October 5, kept but not shown on Free');
    const tuesday = screen.getByLabelText('Coffee, Tuesday, October 6, kept but not shown on Free');
    expect(monday).toBeDisabled();
    expect(tuesday).toBeDisabled();
    expect(flat(screen.getByTestId('day-2026-10-05')).backgroundColor).toBeUndefined();
    await fireEvent.press(monday);
    await fireEvent.press(tuesday);
    expect(onTapDay).not.toHaveBeenCalled();
    expect(onUntapDay).not.toHaveBeenCalled();

    // From the floor on, the days work as ever; the figures still count the whole week.
    expect(screen.getByLabelText('Coffee, Wednesday, October 7, bought, $5.00')).toBeEnabled();
    expect(screen.getByLabelText('Coffee, Thursday, October 8, not bought')).toBeEnabled();
    expect(summary(screen, 'coffee')).toBe(
      'Coffee, $5.00 each time. $10.00 spent out of $35.00. $10.00 saved. Day 5 of 7.',
    );
  });

  it('holds a day still while its request is in flight', async () => {
    const onTapDay = jest.fn();
    const screen = await render(
      <HabitCard
        habit={habit()}
        taps={coffeeTaps}
        weekStart={THIS_WEEK}
        today={TODAY}
        onTapDay={onTapDay}
        busyDays={new Set(['2026-10-06'])}
      />,
    );
    const tuesday = screen.getByLabelText('Coffee, Tuesday, October 6, not bought');
    expect(tuesday).toBeDisabled();
    expect(tuesday.props.accessibilityState).toMatchObject({ busy: true });
    await fireEvent.press(tuesday);
    expect(onTapDay).not.toHaveBeenCalled();
  });

  it('fades a week before the start: only when it starts, the price still shown, every day inert', async () => {
    const screen = await render(
      <HabitCard habit={habit()} taps={[]} weekStart={LAST_WEEK} today={TODAY} />,
    );
    expect(shown(screen).slice(0, 3)).toEqual(['Coffee', '$5', 'Starts Mon, Oct 5']);
    expect(summary(screen, 'coffee')).toBe('Coffee, $5.00 each time, Starts Mon, Oct 5.');
    const monday = screen.getByLabelText('Coffee, Monday, September 28, before this habit started');
    expect(monday).toBeDisabled();
  });

  it('shows no figures in this week either when the habit starts later in it', async () => {
    // A clock moved back: made Friday, looked at on Wednesday.
    const screen = await render(
      <HabitCard
        habit={habit({ saved_from: '2026-10-09' })}
        taps={[]}
        weekStart={THIS_WEEK}
        today="2026-10-07"
      />,
    );
    expect(shown(screen).slice(0, 3)).toEqual(['Coffee', '$5', 'Starts Fri, Oct 9']);
    expect(screen.queryByTestId('habit-bar-coffee', { includeHiddenElements: true })).toBeNull();
  });

  it('names the week for a week still to come, which the page never shows, instead of a day count', async () => {
    const screen = await render(
      <HabitCard habit={TIM} taps={DESIGN_TAPS} weekStart="2026-10-19" today={FRIDAY} />,
    );
    const words = shown(screen);
    expect(words).toEqual(expect.arrayContaining(['$0.00', 'Out of $35.00 spend limit']));
    expect(words.some((word) => /^Day \d|^Week complete$/.test(word))).toBe(false);
    expect(summary(screen, 'tim')).toBe(
      'Tim Hortons, $5.00 each time. $0.00 spent out of $35.00. $0.00 saved. Oct 19 – 25.',
    );
  });

  describe('the bar', () => {
    it('is empty before anything is bought', async () => {
      const screen = await render(
        <HabitCard habit={habit()} taps={[]} weekStart={THIS_WEEK} today={TODAY} />,
      );
      expect(barWidth(screen, 'coffee')).toBe('0%');
    });

    it('fills to spent over the limit, from whole cents', async () => {
      // Three of seven days at $4.50: $13.50 of $31.50.
      const screen = await render(
        <HabitCard
          habit={habit({ price: 4.5 })}
          taps={[
            tap('2026-10-05', 'coffee', 4.5),
            tap('2026-10-06', 'coffee', 4.5),
            tap('2026-10-07', 'coffee', 4.5),
          ]}
          weekStart={THIS_WEEK}
          today={TODAY}
        />,
      );
      expect(shown(screen)).toEqual(
        expect.arrayContaining(['$13.50', 'Out of $31.50 spend limit']),
      );
      expect(Number.parseFloat(barWidth(screen, 'coffee'))).toBeCloseTo((1350 / 3150) * 100, 8);
      expect(barWidth(screen, 'coffee')).toMatch(/%$/);
    });

    it('stops at exactly 100% when the week has spent its whole limit', async () => {
      // Last week's $25.00 with Monday's receipt edited up to $15.00: $35.00 of $35.00.
      const taps = DESIGN_TAPS.map((entry) =>
        entry.receiptId === 'r-tim-2026-10-05' ? { ...entry, amount: 15 } : entry,
      );
      const screen = await render(
        <HabitCard habit={TIM} taps={taps} weekStart={WEEK_BEFORE} today={FRIDAY} />,
      );
      expect(shown(screen)).toEqual(
        expect.arrayContaining(['$35.00', 'Out of $35.00 spend limit']),
      );
      expect(barWidth(screen, 'tim')).toBe('100%');
    });

    it('never runs past 100% when an edited receipt pushes spent over the limit, and still says the real figure', async () => {
      // Monday's receipt edited to $30.00: $45.00 against a $35.00 limit.
      const taps = DESIGN_TAPS.map((entry) =>
        entry.receiptId === 'r-tim-2026-10-12' ? { ...entry, amount: 30 } : entry,
      );
      const screen = await render(
        <HabitCard habit={TIM} taps={taps} weekStart={FRIDAY_WEEK} today={FRIDAY} />,
      );
      expect(barWidth(screen, 'tim')).toBe('100%');
      expect(shown(screen)).toEqual(
        expect.arrayContaining(['$45.00', 'Out of $35.00 spend limit', '$5.00 saved']),
      );
      expect(summary(screen, 'tim')).toBe(
        'Tim Hortons, $5.00 each time. $45.00 spent out of $35.00. $5.00 saved. Day 5 of 7.',
      );
    });
  });

  describe('the pencil and View details', () => {
    it('presses the pencil to edit the habit, and nothing else', async () => {
      const onEdit = jest.fn();
      const onDetails = jest.fn();
      const screen = await render(
        <HabitCard
          habit={habit()}
          taps={coffeeTaps}
          weekStart={THIS_WEEK}
          today={TODAY}
          onEdit={onEdit}
          onDetails={onDetails}
        />,
      );
      const pencil = screen.getByRole('button', { name: 'Edit Coffee' });
      await fireEvent.press(pencil);
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onDetails).not.toHaveBeenCalled();
    });

    it('presses View details to open the history, reading as “View details, Coffee”', async () => {
      const onEdit = jest.fn();
      const onDetails = jest.fn();
      const screen = await render(
        <HabitCard
          habit={habit()}
          taps={coffeeTaps}
          weekStart={THIS_WEEK}
          today={TODAY}
          onEdit={onEdit}
          onDetails={onDetails}
        />,
      );
      const details = screen.getByRole('button', { name: 'View details, Coffee' });
      expect(screen.getByText('View details')).toBeTruthy();
      await fireEvent.press(details);
      expect(onDetails).toHaveBeenCalledTimes(1);
      expect(onEdit).not.toHaveBeenCalled();
    });

    it('opens nothing from the body: the name, the figures and the pill do not press', async () => {
      const onEdit = jest.fn();
      const onDetails = jest.fn();
      const onTapDay = jest.fn();
      const screen = await render(
        <HabitCard
          habit={habit()}
          taps={coffeeTaps}
          weekStart={THIS_WEEK}
          today={TODAY}
          onEdit={onEdit}
          onDetails={onDetails}
          onTapDay={onTapDay}
        />,
      );
      for (const word of ['Coffee', '$5', '$10.00', 'Out of $35.00 spend limit', 'Day 5 of 7']) {
        await fireEvent.press(screen.getByText(word));
      }
      await fireEvent.press(node(screen, 'habit-summary-coffee') as never);
      expect(onEdit).not.toHaveBeenCalled();
      expect(onDetails).not.toHaveBeenCalled();
      expect(onTapDay).not.toHaveBeenCalled();
    });

    it('names the habit on each card’s buttons, so two cards’ buttons read apart', async () => {
      const screen = await render(
        <>
          <HabitCard
            habit={TIM}
            taps={DESIGN_TAPS}
            weekStart={FRIDAY_WEEK}
            today={FRIDAY}
            onEdit={noop}
            onDetails={noop}
          />
          <HabitCard
            habit={BREAKFAST}
            taps={DESIGN_TAPS}
            weekStart={FRIDAY_WEEK}
            today={FRIDAY}
            onEdit={noop}
            onDetails={noop}
          />
        </>,
      );
      expect(
        screen
          .getAllByRole('button')
          .map((button) => button.props.accessibilityLabel)
          .filter((label) => /^(Edit|View details)/.test(label)),
      ).toEqual([
        'Edit Tim Hortons',
        'View details, Tim Hortons',
        'Edit Breakfast',
        'View details, Breakfast',
      ]);
      expect(screen.getAllByText('View details')).toHaveLength(2);
    });

    it('draws a button only where it has somewhere to go', async () => {
      const screen = await render(
        <HabitCard habit={habit()} taps={coffeeTaps} weekStart={THIS_WEEK} today={TODAY} />,
      );
      expect(screen.queryByLabelText('Edit Coffee')).toBeNull();
      expect(screen.queryByLabelText('View details, Coffee')).toBeNull();
    });
  });

  it('is read summary first, then the pencil, the seven days, and View details last', async () => {
    const screen = await render(
      <HabitCard
        habit={TIM}
        taps={DESIGN_TAPS}
        weekStart={FRIDAY_WEEK}
        today={FRIDAY}
        onEdit={noop}
        onDetails={noop}
        onTapDay={noop}
        onUntapDay={noop}
      />,
    );
    expect(readingOrder(screen)).toEqual([
      'Tim Hortons, $5.00 each time. $20.00 spent out of $35.00. $5.00 saved. Day 5 of 7.',
      'Edit Tim Hortons',
      'Tim Hortons, Monday, October 12, bought, $5.00',
      'Tim Hortons, Tuesday, October 13, bought, $5.00',
      'Tim Hortons, Wednesday, October 14, not bought',
      'Tim Hortons, Thursday, October 15, bought, $5.00',
      'Tim Hortons, Friday, October 16, bought, $5.00',
      'Tim Hortons, Saturday, October 17, still to come',
      'Tim Hortons, Sunday, October 18, still to come',
      'View details, Tim Hortons',
    ]);
  });

  describe('as a preview (interactive={false})', () => {
    const draft = (over: Partial<HabitRow>) =>
      habit({ id: 'preview', name: 'Taxi & rides', color: 'violet', ...over });

    it('draws no pencil and no View details, even when handed handlers, and reads as one line', async () => {
      const onEdit = jest.fn();
      const onDetails = jest.fn();
      const screen = await render(
        <HabitCard
          interactive={false}
          habit={draft({ saved_from: TODAY })}
          taps={[]}
          weekStart={TODAY}
          today={TODAY}
          onEdit={onEdit}
          onDetails={onDetails}
        />,
      );
      expect(screen.queryAllByRole('button', { includeHiddenElements: true })).toHaveLength(0);
      expect(screen.queryByLabelText(/^Edit /, { includeHiddenElements: true })).toBeNull();
      expect(screen.queryByText('View details', { includeHiddenElements: true })).toBeNull();
      // Made on a Friday, a new habit has Friday to Sunday: Day 1 of 3.
      expect(readingOrder(screen)).toEqual([
        'Taxi & rides, $5.00 each time. $0.00 spent out of $15.00. $0.00 saved. Day 1 of 3.',
      ]);
      expect(screen.getByLabelText(/^Taxi & rides, /).props.accessible).toBe(true);
    });

    it('reads a habit made on a Monday as $0.00, out of $35.00, $0.00 saved, Day 1 of 7', async () => {
      const screen = await render(
        <HabitCard
          interactive={false}
          habit={draft({ started_on: THIS_WEEK, saved_from: THIS_WEEK })}
          taps={[]}
          weekStart={THIS_WEEK}
          today={THIS_WEEK}
        />,
      );
      expect(shown(screen)).toEqual([
        'Taxi & rides',
        '$5',
        '$0.00',
        'Out of $35.00 spend limit',
        '$0.00 saved',
        'Day 1 of 7',
      ]);
      expect(readingOrder(screen)).toEqual([
        'Taxi & rides, $5.00 each time. $0.00 spent out of $35.00. $0.00 saved. Day 1 of 7.',
      ]);
    });

    it('is still drawn as the dashboard will: today ringed in the habit’s fill, no day pressable', async () => {
      const screen = await render(
        <HabitCard
          interactive={false}
          habit={draft({ saved_from: TODAY })}
          taps={[]}
          weekStart={TODAY}
          today={TODAY}
          onTapDay={jest.fn()}
        />,
      );
      expect(
        flat(screen.getByTestId('day-2026-10-09', { includeHiddenElements: true })),
      ).toMatchObject({ borderWidth: 2, borderColor: habitColor('violet').fill });
      expect(
        screen.queryAllByLabelText(/, not bought/, { includeHiddenElements: true }),
      ).toHaveLength(0);
    });
  });

  it('reads in Spanish, with no key or placeholder left', async () => {
    setLanguage('es');
    const thisWeek = await render(
      <HabitCard
        habit={TIM}
        taps={DESIGN_TAPS}
        weekStart={FRIDAY_WEEK}
        today={FRIDAY}
        onEdit={noop}
        onDetails={noop}
      />,
    );
    expect(shown(thisWeek)).toEqual([
      'Tim Hortons',
      '$5',
      '$20.00',
      'De un límite de $35.00',
      '$5.00 ahorrado',
      'Día 5 de 7',
      ...['L', 'M', 'M', 'J', 'V', 'S', 'D'],
      'Ver detalles',
    ]);
    expect(summary(thisWeek, 'tim')).toBe(
      'Tim Hortons, $5.00 cada vez. $20.00 gastado de $35.00. $5.00 ahorrado. Día 5 de 7.',
    );
    expect(thisWeek.getByLabelText('Editar Tim Hortons')).toBeTruthy();
    expect(thisWeek.getByLabelText('Ver detalles, Tim Hortons')).toBeTruthy();
    expect(
      thisWeek.getByLabelText('Tim Hortons, viernes 16 de octubre, comprado, $5.00'),
    ).toBeTruthy();

    const lastWeek = await render(
      <HabitCard
        habit={TIM}
        taps={DESIGN_TAPS}
        weekStart={WEEK_BEFORE}
        today={FRIDAY}
        onEdit={noop}
        onDetails={noop}
      />,
    );
    expect(shown(lastWeek)).toContain('Semana completa');

    const notYet = await render(
      <HabitCard
        habit={BREAKFAST}
        taps={DESIGN_TAPS}
        weekStart={WEEK_BEFORE}
        today={FRIDAY}
        onEdit={noop}
        onDetails={noop}
      />,
    );
    expect(shown(notYet)).toContain('Empieza el mié 14 oct');
    expect(summary(notYet, 'bfast')).toBe('Breakfast, $4.00 cada vez, Empieza el mié 14 oct.');

    for (const screen of [thisWeek, lastWeek, notYet]) {
      const json = JSON.stringify(screen.toJSON());
      expect(json).not.toMatch(/habits\.[a-z]+\./);
      expect(json).not.toMatch(/\{\w+\}/);
    }
  });

  it('reads in French, with the comma, a no-break space before the mark, and no key or placeholder left', async () => {
    setLanguage('fr');
    const NBSP = ' ';
    const thisWeek = await render(
      <HabitCard
        habit={TIM}
        taps={DESIGN_TAPS}
        weekStart={FRIDAY_WEEK}
        today={FRIDAY}
        onEdit={noop}
        onDetails={noop}
      />,
    );
    expect(shown(thisWeek)).toEqual([
      'Tim Hortons',
      `5${NBSP}$`,
      `20,00${NBSP}$`,
      `Sur une limite de 35,00${NBSP}$`,
      `5,00${NBSP}$ économisé`,
      'Jour 5 sur 7',
      ...['L', 'M', 'M', 'J', 'V', 'S', 'D'],
      'Voir les détails',
    ]);
    expect(summary(thisWeek, 'tim')).toBe(
      `Tim Hortons, 5,00${NBSP}$ chaque fois. 20,00${NBSP}$ dépensé sur 35,00${NBSP}$. 5,00${NBSP}$ économisé. Jour 5 sur 7.`,
    );
    expect(thisWeek.getByLabelText('Modifier Tim Hortons')).toBeTruthy();
    expect(thisWeek.getByLabelText('Voir les détails, Tim Hortons')).toBeTruthy();

    const breakfast = await render(
      <HabitCard
        habit={BREAKFAST}
        taps={DESIGN_TAPS}
        weekStart={FRIDAY_WEEK}
        today={FRIDAY}
        onEdit={noop}
        onDetails={noop}
      />,
    );
    expect(shown(breakfast)).toContain('Jour 3 sur 5');

    const lastWeek = await render(
      <HabitCard
        habit={TIM}
        taps={DESIGN_TAPS}
        weekStart={WEEK_BEFORE}
        today={FRIDAY}
        onEdit={noop}
        onDetails={noop}
      />,
    );
    expect(shown(lastWeek)).toContain('Semaine terminée');

    const notYet = await render(
      <HabitCard
        habit={BREAKFAST}
        taps={DESIGN_TAPS}
        weekStart={WEEK_BEFORE}
        today={FRIDAY}
        onEdit={noop}
        onDetails={noop}
      />,
    );
    expect(shown(notYet)).toContain('Commence le mer. 14 oct.');
    expect(summary(notYet, 'bfast')).toBe(
      `Breakfast, 4,00${NBSP}$ chaque fois, Commence le mer. 14 oct..`,
    );

    for (const screen of [thisWeek, breakfast, lastWeek, notYet]) {
      const json = JSON.stringify(screen.toJSON());
      expect(json).not.toMatch(/habits\.[a-z]+\./);
      expect(json).not.toMatch(/\{\w+\}/);
    }
  });
});

describe('the Spending Habits tool card', () => {
  it('opens the dashboard, or the explainer with the PRO pill when locked', async () => {
    const onPress = jest.fn();
    const open = await render(<ToolCards onPress={onPress} />);
    await fireEvent.press(open.getByLabelText('Spending habits. Opens the tool.'));
    expect(onPress).toHaveBeenLastCalledWith('/habits');
    expect(open.queryAllByText('PRO', { includeHiddenElements: true })).toHaveLength(0);

    const locked = await render(<ToolCards onPress={onPress} habitsLocked />);
    await fireEvent.press(
      locked.getByLabelText('Spending habits. Pro feature. See what skipping saves.'),
    );
    expect(onPress).toHaveBeenLastCalledWith({
      pathname: '/pro-feature',
      params: { id: 'habits', next: '/habits' },
    });
    // The pill is a sticker: its word is in the card's label, not read again.
    expect(locked.queryAllByText('PRO')).toHaveLength(0);
    expect(locked.getAllByText('PRO', { includeHiddenElements: true })).toHaveLength(1);
    // Loans never locks.
    expect(locked.getByLabelText('Loans. Opens the page.')).toBeTruthy();
  });

  it('says it in Spanish and French', async () => {
    setLanguage('es');
    const es = await render(<ToolCards onPress={() => {}} habitsLocked />);
    expect(
      es.getByLabelText('Hábitos de gasto. Función Pro. Mira lo que ahorras sin comprar.'),
    ).toBeTruthy();
    expect(
      es.getAllByText('Hábitos de gasto', { includeHiddenElements: true }).length,
    ).toBeGreaterThan(0);

    setLanguage('fr');
    const fr = await render(<ToolCards onPress={() => {}} />);
    expect(fr.getByLabelText('Habitudes de dépense. Ouvre l’outil.')).toBeTruthy();
  });
});
