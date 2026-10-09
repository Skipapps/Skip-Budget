import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { HabitRow } from '@/api/habits';
import { ToolCards } from '@/components/dashboard/tool-cards';
import { HabitCard, habitStatus } from '@/components/habits/habit-card';
import { habitColor } from '@/data/habit-colors';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import type { HabitTap } from '@/lib/habit-week';

/**
 * A habit's card: what the week saved over what it cost, the sub-line, and a circle per day that
 * fills, empties or stays inert. Also the card drawn as a preview, and the Home tool card's PRO
 * pill wording.
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

const maths = (row: HabitRow) => ({
  id: row.id,
  price: row.price,
  startedOn: row.started_on,
  savedFrom: row.saved_from,
});

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

beforeEach(() => {
  resetLocaleForTests();
  mockScheme = 'light';
  mockIcon.mockClear();
});
afterAll(() => resetLocaleForTests());

describe('habitStatus: the sub-line, first match wins', () => {
  const tapped = (...days: string[]) => new Set(days);

  it('says a week before the habit began is not tracked, and hides its figures', () => {
    expect(habitStatus(maths(habit()), tapped(), LAST_WEEK, TODAY)).toEqual({
      text: 'Not tracking yet',
      tone: 'muted',
      tracking: false,
    });
  });

  it('says bought today before anything else this week', () => {
    const row = habit({ started_on: LAST_WEEK, saved_from: LAST_WEEK });
    expect(habitStatus(maths(row), tapped(TODAY), THIS_WEEK, TODAY).text).toBe('Bought today');
  });

  it('calls a habit new in its first week until a day is filled', () => {
    // Made on Thursday: nothing tapped yet.
    const row = habit({ saved_from: '2026-10-08' });
    expect(habitStatus(maths(row), tapped(), THIS_WEEK, TODAY)).toEqual({
      text: 'New · tap the days you bought it',
      tone: 'muted',
      tracking: true,
    });
  });

  it('counts the run of skipped days to yesterday, in the habit’s colour', () => {
    // Monday and Wednesday bought; Thursday skipped.
    expect(
      habitStatus(maths(habit()), tapped('2026-10-05', '2026-10-07'), THIS_WEEK, TODAY),
    ).toEqual({ text: '1 day skipped', tone: 'habit', tracking: true });
    const older = habit({ started_on: LAST_WEEK, saved_from: LAST_WEEK });
    expect(habitStatus(maths(older), tapped('2026-10-06'), THIS_WEEK, TODAY).text).toBe(
      '2 days skipped',
    );
  });

  it('says bought yesterday when yesterday ends the run', () => {
    expect(habitStatus(maths(habit()), tapped('2026-10-08'), THIS_WEEK, TODAY).text).toBe(
      'Bought yesterday',
    );
  });

  it('keeps a habit made today new even with earlier days filled in, since nothing is skipped yet', () => {
    const row = habit({ saved_from: TODAY });
    expect(habitStatus(maths(row), tapped('2026-10-05'), THIS_WEEK, TODAY)).toEqual({
      text: 'New · tap the days you bought it',
      tone: 'muted',
      tracking: true,
    });
  });

  it('counts the skipped days of a past first week the habit joined mid-week', () => {
    // Made Wednesday the 30th: Wednesday to Sunday counted; Monday and Tuesday never did.
    const midWeek = habit({ started_on: LAST_WEEK, saved_from: '2026-09-30' });
    expect(habitStatus(maths(midWeek), tapped(), LAST_WEEK, TODAY)).toEqual({
      text: '5 days skipped',
      tone: 'habit',
      tracking: true,
    });
    const sunday = habit({ started_on: LAST_WEEK, saved_from: '2026-10-04' });
    expect(habitStatus(maths(sunday), tapped(), LAST_WEEK, TODAY).text).toBe('1 day skipped');
    // Made on the Monday: the whole week counted.
    const monday = habit({ started_on: LAST_WEEK, saved_from: LAST_WEEK });
    expect(habitStatus(maths(monday), tapped(), LAST_WEEK, TODAY).text).toBe('Skipped all week');
  });

  it('sums up a past week', () => {
    const row = habit({ started_on: LAST_WEEK, saved_from: LAST_WEEK });
    expect(habitStatus(maths(row), tapped(), LAST_WEEK, TODAY)).toEqual({
      text: 'Skipped all week',
      tone: 'habit',
      tracking: true,
    });
    expect(habitStatus(maths(row), tapped('2026-09-29', '2026-10-01'), LAST_WEEK, TODAY).text).toBe(
      'Bought on 2 days',
    );
    expect(habitStatus(maths(row), tapped('2026-09-29'), LAST_WEEK, TODAY).text).toBe(
      'Bought on 1 day',
    );
  });
});

describe('HabitCard', () => {
  const coffeeTaps = [tap('2026-10-05'), tap('2026-10-07'), tap('2026-10-02', 'other', 99)];

  it('shows the habit’s price beside its name, and no week figures or sub-line', async () => {
    const screen = await render(
      <HabitCard habit={habit()} taps={coffeeTaps} weekStart={THIS_WEEK} today={TODAY} />,
    );

    const shown = price(screen);
    expect(shown).toMatchObject({ text: '$5.00', size: 16 });
    expect(String((shown.slot.children[0] as Node).props.className)).toContain(
      'font-app-semibold text-ink',
    );
    // On the right of the header row, after the name's column.
    expect(shown.slot.props.className).toContain('shrink-0');
    expect(shown.slot.parent).toBe(node(screen, 'fit-slot-name').parent!.parent);

    expect(screen.getByText('Coffee')).toBeTruthy();
    // Spent and Saved belong to the hero; the status is said, not drawn.
    expect(screen.queryByText('$10.00')).toBeNull();
    expect(screen.queryByText('saved')).toBeNull();
    expect(screen.queryByText('1 day skipped')).toBeNull();
    expect(screen.queryByTestId('habit-pills')).toBeNull();
    expect(mockIcon).toHaveBeenCalledWith({
      iconId: 'food-dining/coffee',
      color: 'caramel',
      size: 44,
    });
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
    // Thursday alone saves.
    expect(
      screen.getByLabelText(
        'Coffee, $5.00 each time, New · tap the days you bought it, $5.00 saved, $0.00 spent.',
      ),
    ).toBeTruthy();
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

    const shown = price(screen);
    expect(shown.text).toBe('$5.00');
    expect(shown.slot.parent).toBe(node(screen, 'fit-slot-name').parent);
  });

  it('keeps the price beside a name whose words fit', async () => {
    const screen = await render(
      <HabitCard habit={habit()} taps={coffeeTaps} weekStart={THIS_WEEK} today={TODAY} />,
    );
    await layOutHeader(screen, 300, 90, 60);
    expect(price(screen).slot.props.className).toContain('shrink-0');
  });

  it('reads as one button that opens the habit, apart from the days', async () => {
    const onOpen = jest.fn();
    const screen = await render(
      <HabitCard
        habit={habit()}
        taps={coffeeTaps}
        weekStart={THIS_WEEK}
        today={TODAY}
        onOpen={onOpen}
      />,
    );
    const header = screen.getByLabelText(
      'Coffee, $5.00 each time, 1 day skipped, $10.00 saved, $10.00 spent.',
    );
    expect(header.props.accessibilityHint).toBe('Opens the habit.');
    await fireEvent.press(header);
    expect(onOpen).toHaveBeenCalledTimes(1);
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
    expect(screen.getByLabelText(/, \$10\.00 spent\.$/)).toBeTruthy();
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

  it('fades a week before the start: the price still shows, every day inert', async () => {
    const screen = await render(
      <HabitCard habit={habit()} taps={[]} weekStart={LAST_WEEK} today={TODAY} />,
    );
    expect(screen.queryByText('Not tracking yet')).toBeNull();
    expect(price(screen).text).toBe('$5.00');
    expect(screen.getByLabelText('Coffee, $5.00 each time, Not tracking yet.')).toBeTruthy();
    const monday = screen.getByLabelText('Coffee, Monday, September 28, before this habit started');
    expect(monday).toBeDisabled();
  });

  it('draws a preview with nothing to press, read as one line', async () => {
    const screen = await render(
      <HabitCard
        interactive={false}
        habit={habit({ id: 'preview', name: 'Taxi & rides', color: 'violet', saved_from: TODAY })}
        taps={[]}
        weekStart={TODAY}
        today={TODAY}
      />,
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(
      screen.getByLabelText(
        'Taxi & rides, $5.00 each time, New · tap the days you bought it, $0.00 saved, $0.00 spent.',
      ),
    ).toBeTruthy();
    // Still drawn as the dashboard will: today ringed in the habit's fill.
    expect(
      flat(screen.getByTestId('day-2026-10-09', { includeHiddenElements: true })),
    ).toMatchObject({
      borderWidth: 2,
      borderColor: habitColor('violet').fill,
    });
  });

  it('reads in Spanish and French, with no key or placeholder left', async () => {
    setLanguage('es');
    const es = await render(
      <HabitCard habit={habit()} taps={coffeeTaps} weekStart={THIS_WEEK} today={TODAY} />,
    );
    expect(
      es.getByLabelText(
        'Coffee, $5.00 cada vez, 1 día sin comprar, $10.00 ahorrado, $10.00 gastado.',
      ),
    ).toBeTruthy();
    expect(es.getByLabelText('Coffee, viernes 9 de octubre, hoy, aún sin comprar')).toBeTruthy();
    expect(es.getByLabelText('Coffee, lunes 5 de octubre, comprado, $5.00')).toBeTruthy();

    setLanguage('fr');
    const fr = await render(
      <HabitCard habit={habit()} taps={coffeeTaps} weekStart={THIS_WEEK} today={TODAY} />,
    );
    expect(
      fr.getByLabelText(
        'Coffee, 5,00\u00a0$ chaque fois, 1 jour sans achat, 10,00\u00a0$ économisé, 10,00\u00a0$ dépensé.',
      ),
    ).toBeTruthy();
    expect(price(fr).text).toBe('5,00\u00a0$');
    expect(fr.getByLabelText('Coffee, mardi 6 octobre, pas acheté')).toBeTruthy();

    for (const screen of [es, fr]) {
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
    await fireEvent.press(open.getByLabelText('Spending Habits. Opens the tool.'));
    expect(onPress).toHaveBeenLastCalledWith('/habits');
    expect(open.queryAllByText('PRO', { includeHiddenElements: true })).toHaveLength(0);

    const locked = await render(<ToolCards onPress={onPress} habitsLocked />);
    await fireEvent.press(
      locked.getByLabelText('Spending Habits. Pro feature. See what skipping saves.'),
    );
    expect(onPress).toHaveBeenLastCalledWith({
      pathname: '/pro-feature',
      params: { id: 'habits' },
    });
    // The pill is a sticker: its word is in the card's label, not read again.
    expect(locked.queryAllByText('PRO')).toHaveLength(0);
    expect(locked.getAllByText('PRO', { includeHiddenElements: true })).toHaveLength(1);
    // The loan calculator never locks.
    expect(locked.getByLabelText('Loan Calculator. Opens the tool.')).toBeTruthy();
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
