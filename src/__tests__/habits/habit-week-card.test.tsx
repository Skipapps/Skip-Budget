import { fireEvent, render, within } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { HabitAboutCard, HabitWeekCard } from '@/components/habits/habit-week-card';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { habitHistory, type HabitMaths, type HabitTap, type HabitWeek } from '@/lib/habit-week';

/**
 * One week of a habit's history on its page: the header that opens and closes it (the label, the
 * Spent and Saved tiles, the bar and the day count), then its days, newest first, a bought one
 * opening its receipt. And the "About this habit" card. The weeks are built by the real maths from
 * the design's Friday the 16th, so the figures are the ones the design shows.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), success: jest.fn(), warn: jest.fn() }));

const COLORS = {
  ink: '#111111',
  muted: '#6F6F6F',
  line: '#E5E1DC',
  onControl: '#FFFFFF',
  accentInk: '#905479',
};
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => COLORS,
  useTheme: () => ({ scheme: 'light', colors: COLORS }),
  // Named so a test can tell which colour a figure was given.
  useMoneyColor: () => (amount: number) => (amount > 0 ? 'MONEY_IN' : amount < 0 ? 'OUT' : 'INK'),
}));

const NBSP = ' ';
const FRIDAY = '2026-10-16';

const TIM: HabitMaths = {
  id: 'tim',
  price: 5,
  startedOn: '2026-09-28',
  savedFrom: '2026-09-28',
};
const BREAKFAST: HabitMaths = {
  id: 'bfast',
  price: 4,
  startedOn: '2026-10-12',
  savedFrom: '2026-10-14',
};

const tap = (day: string, habitId = 'tim', amount = 5): HabitTap => ({
  habitId,
  day,
  amount,
  receiptId: `r-${habitId}-${day}`,
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
const TAPS = [...TIM_DAYS.map((day) => tap(day)), tap('2026-10-14', 'bfast', 4)];

/** Newest first: the weeks of Oct 12, Oct 5 and Sep 28. */
const WEEKS = habitHistory(TIM, TAPS, FRIDAY);
const [THIS_WEEK, LAST_WEEK, FIRST_WEEK] = WEEKS;

type Screen = Awaited<ReturnType<typeof render>>;
type Node = { props: Record<string, unknown>; children: unknown[]; parent: Node | null };
const flat = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

const noop = () => {};

type Over = Partial<Parameters<typeof HabitWeekCard>[0]>;
const card = (week: HabitWeek, over: Over = {}) => (
  <HabitWeekCard
    week={week}
    color="caramel"
    today={FRIDAY}
    open={false}
    onToggle={noop}
    onOpenReceipt={noop}
    {...over}
  />
);

/** Every word drawn, top to bottom, read off the nodes: a text matcher would fold no-break spaces. */
const shown = (screen: Pick<Screen, 'getAllByText'>) =>
  screen.getAllByText(/./).map((text) => String(text.props.children));

/** The header button: the one button that is not a day. */
const header = (screen: Screen) => screen.getAllByRole('button')[0];

const rowAt = (screen: Screen, day: string) => screen.getByTestId(`habit-day-${day}`);
const rowWords = (screen: Screen, day: string) => shown(within(rowAt(screen, day)));

/** How wide the bar's fill is drawn: the one child of the track the test id names. */
const barWidth = (screen: Screen, weekStart: string) => {
  const track = screen.getByTestId(`habit-week-bar-${weekStart}`, { includeHiddenElements: true });
  return String(flat(track.children[0] as unknown as Node).width);
};

/** The turn the chevron is drawn at, or null when none is drawn. */
function chevronTurn(screen: Screen): string | null {
  let turn: string | null = null;
  const walk = (entry: unknown) => {
    if (entry === null || typeof entry !== 'object') return;
    if (Array.isArray(entry)) return void entry.forEach(walk);
    const json = entry as { props: { style?: unknown }; children: unknown };
    const transform = flat(json).transform as { rotate?: string }[] | undefined;
    const rotate = transform?.find((step) => step.rotate)?.rotate;
    if (rotate) turn = rotate;
    walk(json.children);
  };
  walk(screen.toJSON());
  return turn;
}

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('the real weeks the cards are built from', () => {
  it('are the design’s: this week $20.00 of $35.00, last week $25.00, the first week $15.00', () => {
    expect(
      WEEKS.map(({ weekStart, spent, saved, limit }) => ({ weekStart, spent, saved, limit })),
    ).toEqual([
      { weekStart: '2026-10-12', spent: 20, saved: 5, limit: 35 },
      { weekStart: '2026-10-05', spent: 25, saved: 10, limit: 35 },
      { weekStart: '2026-09-28', spent: 15, saved: 20, limit: 35 },
    ]);
  });
});

describe('HabitWeekCard: the header', () => {
  it('shows this week: its label and range, Spent and Saved, the bar and the limit, Day 5 of 7', async () => {
    const screen = await render(card(THIS_WEEK));
    expect(shown(screen)).toEqual([
      'This week',
      `Oct${NBSP}12${NBSP}– 18`,
      'Spent',
      '$20.00',
      'Saved',
      '$5.00',
      'Out of $35.00 spend limit',
      'Day 5 of 7',
    ]);
    expect(Number.parseFloat(barWidth(screen, '2026-10-12'))).toBeCloseTo((20 / 35) * 100, 8);
  });

  it('shows last week as complete, and an older week with no label at all', async () => {
    const last = await render(card(LAST_WEEK));
    expect(shown(last)).toEqual([
      'Last week',
      `Oct${NBSP}5${NBSP}– 11`,
      'Spent',
      '$25.00',
      'Saved',
      '$10.00',
      'Out of $35.00 spend limit',
      'Week complete',
    ]);

    const first = await render(card(FIRST_WEEK));
    expect(shown(first)).toEqual([
      `Sep${NBSP}28${NBSP}– Oct${NBSP}4`,
      'Spent',
      '$15.00',
      'Saved',
      '$20.00',
      'Out of $35.00 spend limit',
      'Week complete',
    ]);
    // A finished week: Spent + Saved is the limit.
    expect(FIRST_WEEK.spent + FIRST_WEEK.saved).toBe(FIRST_WEEK.limit);
  });

  it('draws Saved in the money-in colour above $0.00 and leaves Spent in ink', async () => {
    const screen = await render(card(THIS_WEEK));
    expect(flat(screen.getByText('$5.00')).color).toBe('MONEY_IN');
    expect(flat(screen.getByText('$20.00')).color).toBeUndefined();

    const none = await render(card({ ...THIS_WEEK, saved: 0 }));
    expect(flat(none.getByText('$0.00')).color).toBe('INK');
  });

  it('is one button, read as the week, the figures and the day count', async () => {
    const screen = await render(card(THIS_WEEK));
    const button = header(screen);
    expect(button.props.accessibilityLabel).toBe(
      `This week, Oct${NBSP}12${NBSP}– 18. $20.00 spent, $5.00 saved, out of $35.00. Day 5 of 7.`,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);

    const last = await render(card(LAST_WEEK));
    expect(header(last).props.accessibilityLabel).toBe(
      `Last week, Oct${NBSP}5${NBSP}– 11. $25.00 spent, $10.00 saved, out of $35.00. Week complete.`,
    );
    // An older week is named by its range alone.
    const first = await render(card(FIRST_WEEK));
    expect(header(first).props.accessibilityLabel).toBe(
      `Sep${NBSP}28${NBSP}– Oct${NBSP}4. $15.00 spent, $20.00 saved, out of $35.00. Week complete.`,
    );
  });

  it('says whether it is expanded, what pressing does, and turns its chevron to match', async () => {
    const closed = await render(card(THIS_WEEK));
    expect(header(closed).props.accessibilityState).toMatchObject({ expanded: false });
    expect(header(closed).props.accessibilityHint).toBe('Shows the days.');
    expect(chevronTurn(closed)).toBe('0deg');

    const open = await render(card(THIS_WEEK, { open: true }));
    expect(header(open).props.accessibilityState).toMatchObject({ expanded: true });
    expect(header(open).props.accessibilityHint).toBe('Hides the days.');
    expect(chevronTurn(open)).toBe('180deg');
  });

  it('reports its own week when pressed, from the header or anywhere on it', async () => {
    const onToggle = jest.fn();
    const screen = await render(card(LAST_WEEK, { onToggle }));
    await fireEvent.press(header(screen));
    for (const word of [
      'Last week',
      'Spent',
      '$25.00',
      'Out of $35.00 spend limit',
      'Week complete',
    ]) {
      await fireEvent.press(screen.getByText(word));
    }
    expect(onToggle).toHaveBeenCalledTimes(6);
    expect(onToggle.mock.calls.every(([weekStart]) => weekStart === '2026-10-05')).toBe(true);
  });

  it('clamps the bar at 100% when an edited receipt pushes spent over the limit, and still says the real figure', async () => {
    // Monday's receipt edited to $30.00: $45.00 against a $35.00 limit.
    const edited = habitHistory(
      TIM,
      TAPS.map((entry) => (entry.day === '2026-10-12' ? { ...entry, amount: 30 } : entry)),
      FRIDAY,
    )[0];
    expect(edited.spent).toBe(45);
    const screen = await render(card(edited));
    expect(barWidth(screen, '2026-10-12')).toBe('100%');
    expect(shown(screen)).toEqual(expect.arrayContaining(['$45.00', 'Out of $35.00 spend limit']));
  });

  it('shows an empty bar for $0.00 spent', async () => {
    const screen = await render(card({ ...THIS_WEEK, spent: 0 }));
    expect(barWidth(screen, '2026-10-12')).toBe('0%');
  });

  describe('a week before the habit began, holding a receipt dated in it', () => {
    // Breakfast was made on Wednesday the 14th; a receipt dated the 7th is real money.
    const before = habitHistory(BREAKFAST, [...TAPS, tap('2026-10-07', 'bfast', 4)], FRIDAY).find(
      (entry) => entry.weekStart === '2026-10-05',
    )!;

    it('keeps Spent and Saved, and says when the habit starts instead of a bar and a limit', async () => {
      expect(before.progress).toEqual({ kind: 'notStarted', startsOn: '2026-10-14' });
      const screen = await render(card(before));
      expect(shown(screen)).toEqual([
        'Last week',
        `Oct${NBSP}5${NBSP}– 11`,
        'Spent',
        '$4.00',
        'Saved',
        '$0.00',
        'Starts Wed, Oct 14',
      ]);
      expect(
        screen.queryByTestId('habit-week-bar-2026-10-05', { includeHiddenElements: true }),
      ).toBeNull();
      expect(screen.queryByText(/spend limit/)).toBeNull();
      expect(header(screen).props.accessibilityLabel).toBe(
        `Last week, Oct${NBSP}5${NBSP}– 11. $4.00 spent, $0.00 saved. Starts Wed, Oct 14.`,
      );
    });

    it('still lists the receipt’s day when opened, and opens that receipt', async () => {
      const onOpenReceipt = jest.fn();
      const screen = await render(card(before, { open: true, onOpenReceipt }));
      expect(shown(within(rowAt(screen, '2026-10-07')))).toEqual(['Wed, Oct 7', 'Bought', '$4.00']);
      await fireEvent.press(rowAt(screen, '2026-10-07'));
      expect(onOpenReceipt).toHaveBeenCalledWith('r-bfast-2026-10-07');
    });

    it('says it in Spanish and French', async () => {
      setLanguage('es');
      const es = await render(card(before));
      expect(shown(es)).toContain('Empieza el mié 14 oct');
      expect(header(es).props.accessibilityLabel).toContain(
        '$4.00 gastado, $0.00 ahorrado. Empieza',
      );

      setLanguage('fr');
      const fr = await render(card(before));
      expect(shown(fr)).toContain('Commence le mer. 14 oct.');
    });
  });

  it('gives a week still to come no day count, reached only through a receipt dated in it', async () => {
    const [ahead] = habitHistory(TIM, [...TAPS, tap('2026-10-20')], FRIDAY);
    expect(ahead).toMatchObject({ weekStart: '2026-10-19', progress: { kind: 'upcoming' } });
    const screen = await render(card(ahead));
    expect(shown(screen)).toEqual([
      `Oct${NBSP}19${NBSP}– 25`,
      'Spent',
      '$5.00',
      'Saved',
      '$0.00',
      'Out of $35.00 spend limit',
    ]);
    expect(Number.parseFloat(barWidth(screen, '2026-10-19'))).toBeCloseTo((5 / 35) * 100, 8);
    expect(header(screen).props.accessibilityLabel).toBe(
      `Oct${NBSP}19${NBSP}– 25. $5.00 spent, $0.00 saved, out of $35.00.`,
    );
  });

  describe('a week in an earlier year', () => {
    // Made in October 2025 and looked at in October 2026: the oldest week is a year back.
    const OLD: HabitMaths = {
      id: 'old',
      price: 5,
      startedOn: '2025-10-06',
      savedFrom: '2025-10-06',
    };
    const oldest = habitHistory(OLD, [tap('2025-10-08', 'old')], FRIDAY).at(-1)!;

    it('names the year after the range, in English', async () => {
      expect(oldest.weekStart).toBe('2025-10-06');
      const screen = await render(card(oldest));
      expect(shown(screen).slice(0, 1)).toEqual([`Oct${NBSP}6${NBSP}– 12,${NBSP}2025`]);
      expect(header(screen).props.accessibilityLabel).toMatch(
        new RegExp(`^Oct${NBSP}6${NBSP}– 12,${NBSP}2025\\. `),
      );
    });

    it('names it after the range in Spanish and French too', async () => {
      setLanguage('es');
      const es = await render(card(oldest));
      expect(shown(es)[0]).toBe(`6${NBSP}– 12${NBSP}oct${NBSP}2025`);
      setLanguage('fr');
      const fr = await render(card(oldest));
      expect(shown(fr)[0]).toBe(`6${NBSP}– 12${NBSP}oct.${NBSP}2025`);
    });

    it('leaves the year off a week of this year, and off one that ends in this year', async () => {
      const ends = habitHistory(
        { ...OLD, startedOn: '2025-12-29', savedFrom: '2025-12-29' },
        [],
        '2026-01-07',
      );
      const screen = await render(card(ends[1], { today: '2026-01-07' }));
      // Dec 29 to Jan 4: its Sunday is in the year of today.
      expect(shown(screen).slice(0, 2)).toEqual(['Last week', `Dec${NBSP}29${NBSP}– Jan${NBSP}4`]);
      const thisYear = await render(card(THIS_WEEK));
      expect(shown(thisYear)[1]).toBe(`Oct${NBSP}12${NBSP}– 18`);
    });

    it('leaves the year off the week that holds today even when it ends in the next year', async () => {
      const [holding] = habitHistory(
        { ...OLD, startedOn: '2025-12-29', savedFrom: '2025-12-29' },
        [],
        '2025-12-30',
      );
      const screen = await render(card(holding, { today: '2025-12-30' }));
      expect(shown(screen).slice(0, 2)).toEqual(['This week', `Dec${NBSP}29${NBSP}– Jan${NBSP}4`]);
      expect(header(screen).props.accessibilityLabel).toMatch(
        new RegExp(`^This week, Dec${NBSP}29${NBSP}– Jan${NBSP}4\\. `),
      );
    });

    it('names a later year for a week still to come that ends in it', async () => {
      // Looked at on Dec 23, 2025, with a receipt dated Jan 2, 2026.
      const [ahead] = habitHistory(
        { ...OLD, startedOn: '2025-12-15', savedFrom: '2025-12-15' },
        [tap('2026-01-02', 'old')],
        '2025-12-23',
      );
      expect(ahead.weekStart).toBe('2025-12-29');
      const screen = await render(card(ahead, { today: '2025-12-23' }));
      expect(shown(screen)[0]).toBe(`Dec${NBSP}29${NBSP}– Jan${NBSP}4,${NBSP}2026`);
      expect(header(screen).props.accessibilityLabel).toMatch(
        new RegExp(`^Dec${NBSP}29${NBSP}– Jan${NBSP}4,${NBSP}2026\\. `),
      );
    });
  });
});

describe('HabitWeekCard: the days', () => {
  it('lists no day while closed, and this week’s five days, newest first, once open', async () => {
    const closed = await render(card(THIS_WEEK));
    expect(
      closed.queryByTestId('habit-week-days-2026-10-12', { includeHiddenElements: true }),
    ).toBeNull();
    expect(closed.queryAllByTestId(/^habit-day-/)).toHaveLength(0);

    const open = await render(card(THIS_WEEK, { open: true }));
    expect(open.getByTestId('habit-week-days-2026-10-12')).toBeTruthy();
    expect(open.getAllByTestId(/^habit-day-/).map((row) => row.props.testID)).toEqual([
      'habit-day-2026-10-16',
      'habit-day-2026-10-15',
      'habit-day-2026-10-14',
      'habit-day-2026-10-13',
      'habit-day-2026-10-12',
    ]);
  });

  it('draws a bought day with its date, “Bought” and the receipt’s amount; today says so', async () => {
    const screen = await render(card(THIS_WEEK, { open: true }));
    expect(rowWords(screen, '2026-10-16')).toEqual(['Fri, Oct 16', 'Today · Bought', '$5.00']);
    expect(rowWords(screen, '2026-10-15')).toEqual(['Thu, Oct 15', 'Bought', '$5.00']);
    expect(rowWords(screen, '2026-10-13')).toEqual(['Tue, Oct 13', 'Bought', '$5.00']);
  });

  it('draws a skipped day with +$5.00 in the money-in colour and “saved” under it', async () => {
    const screen = await render(card(THIS_WEEK, { open: true }));
    expect(rowWords(screen, '2026-10-14')).toEqual(['Wed, Oct 14', 'Skipped', '+$5.00', 'saved']);
    expect(flat(within(rowAt(screen, '2026-10-14')).getByText('+$5.00')).color).toBe('MONEY_IN');
  });

  it('draws today, not yet bought, with a dash where the amount would be', async () => {
    const week = habitHistory(
      TIM,
      TAPS.filter((entry) => entry.day !== FRIDAY),
      FRIDAY,
    )[0];
    expect(week.days[0]).toEqual({ day: FRIDAY, kind: 'today', amount: 0 });
    const screen = await render(card(week, { open: true }));
    expect(rowWords(screen, FRIDAY)).toEqual(['Fri, Oct 16', 'Today · not bought yet', '–']);
  });

  it('draws a receipt edited to $6.50 at $6.50, not at the habit’s price', async () => {
    const week = habitHistory(
      TIM,
      TAPS.map((entry) => (entry.day === '2026-10-13' ? { ...entry, amount: 6.5 } : entry)),
      FRIDAY,
    )[0];
    const screen = await render(card(week, { open: true }));
    expect(rowWords(screen, '2026-10-13')).toEqual(['Tue, Oct 13', 'Bought', '$6.50']);
    expect(rowAt(screen, '2026-10-13').props.accessibilityLabel).toBe(
      'Tuesday, October 13, bought, $6.50',
    );
  });

  it('opens the receipt behind the bought day pressed, and nothing else', async () => {
    const onOpenReceipt = jest.fn();
    const onToggle = jest.fn();
    const screen = await render(card(THIS_WEEK, { open: true, onOpenReceipt, onToggle }));

    await fireEvent.press(rowAt(screen, '2026-10-15'));
    expect(onOpenReceipt).toHaveBeenLastCalledWith('r-tim-2026-10-15');
    await fireEvent.press(rowAt(screen, '2026-10-12'));
    expect(onOpenReceipt).toHaveBeenLastCalledWith('r-tim-2026-10-12');
    await fireEvent.press(rowAt(screen, '2026-10-16'));
    expect(onOpenReceipt).toHaveBeenLastCalledWith('r-tim-2026-10-16');
    expect(onOpenReceipt).toHaveBeenCalledTimes(3);

    // A day is not part of the header: pressing it never folds the week.
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('gives a skipped day and a day not yet bought nothing to press', async () => {
    const onOpenReceipt = jest.fn();
    const week = habitHistory(
      TIM,
      TAPS.filter((entry) => entry.day !== FRIDAY),
      FRIDAY,
    )[0];
    const screen = await render(card(week, { open: true, onOpenReceipt }));
    for (const day of ['2026-10-14', FRIDAY]) {
      await fireEvent.press(rowAt(screen, day));
      expect(rowAt(screen, day).props.accessibilityRole).toBeUndefined();
    }
    expect(onOpenReceipt).not.toHaveBeenCalled();
  });

  it('reads each day as a sentence, and a bought day as a button that opens the receipt', async () => {
    const week = habitHistory(
      TIM,
      TAPS.filter((entry) => entry.day !== FRIDAY),
      FRIDAY,
    )[0];
    const screen = await render(card(week, { open: true }));

    const bought = rowAt(screen, '2026-10-15');
    expect(bought.props.accessibilityRole).toBe('button');
    expect(bought.props.accessibilityLabel).toBe('Thursday, October 15, bought, $5.00');
    expect(bought.props.accessibilityHint).toBe('Opens the receipt.');
    expect(rowAt(screen, '2026-10-14').props.accessibilityLabel).toBe(
      'Wednesday, October 14, skipped, $5.00 saved',
    );
    expect(rowAt(screen, FRIDAY).props.accessibilityLabel).toBe(
      'Friday, October 16, today, not bought yet',
    );
    for (const day of ['2026-10-14', FRIDAY])
      expect(rowAt(screen, day).props.accessible).toBe(true);
  });

  it('does not press a bought day that has no receipt to open', async () => {
    const onOpenReceipt = jest.fn();
    const week: HabitWeek = {
      ...THIS_WEEK,
      days: [{ day: '2026-10-15', kind: 'bought', amount: 5 }],
    };
    const screen = await render(card(week, { open: true, onOpenReceipt }));
    await fireEvent.press(rowAt(screen, '2026-10-15'));
    expect(onOpenReceipt).not.toHaveBeenCalled();
    expect(rowAt(screen, '2026-10-15').props.accessibilityRole).toBeUndefined();
    expect(rowWords(screen, '2026-10-15')).toEqual(['Thu, Oct 15', 'Bought', '$5.00']);
  });

  it('opens to nothing for a week with no day to list', async () => {
    const screen = await render(card({ ...THIS_WEEK, days: [] }, { open: true }));
    expect(
      screen.queryByTestId('habit-week-days-2026-10-12', { includeHiddenElements: true }),
    ).toBeNull();
  });

  it('lists a receipt re-dated before the habit began, bought and pressable', async () => {
    // Breakfast was made on the 14th; a receipt dated Monday the 12th is real money.
    const week = habitHistory(BREAKFAST, [...TAPS, tap('2026-10-12', 'bfast', 4)], FRIDAY)[0];
    const onOpenReceipt = jest.fn();
    const screen = await render(card(week, { open: true, onOpenReceipt }));
    expect(screen.getAllByTestId(/^habit-day-/).map((row) => row.props.testID)).toEqual([
      'habit-day-2026-10-16',
      'habit-day-2026-10-15',
      'habit-day-2026-10-14',
      'habit-day-2026-10-12',
    ]);
    await fireEvent.press(rowAt(screen, '2026-10-12'));
    expect(onOpenReceipt).toHaveBeenCalledWith('r-bfast-2026-10-12');
  });
});

describe('HabitWeekCard: money in other currencies and languages', () => {
  it('writes the week in pounds, to the cent', async () => {
    setCurrency('GBP');
    const week = habitHistory(
      { ...TIM, price: 4.5 },
      [tap('2026-10-12', 'tim', 4.5), tap('2026-10-14', 'tim', 6.75)],
      FRIDAY,
    )[0];
    const screen = await render(card(week, { open: true }));
    // Spent £11.25, saved Tuesday, Thursday (two of four finished days) at £4.50; limit 7 x £4.50.
    expect(shown(screen)).toEqual(
      expect.arrayContaining(['£11.25', '£9.00', 'Out of £31.50 spend limit']),
    );
    expect(rowWords(screen, '2026-10-14')).toEqual(['Wed, Oct 14', 'Bought', '£6.75']);
    expect(rowWords(screen, '2026-10-13')).toEqual(['Tue, Oct 13', 'Skipped', '+£4.50', 'saved']);
    expect(shown(screen).filter((word) => word.includes('$'))).toEqual([]);
  });

  it('writes pesos with thousands and cents whole', async () => {
    setCurrency('MXN');
    const week = habitHistory(
      { ...TIM, price: 250 },
      [tap('2026-10-12', 'tim', 250), tap('2026-10-13', 'tim', 1234.5)],
      FRIDAY,
    )[0];
    const screen = await render(card(week));
    expect(shown(screen)).toEqual(
      expect.arrayContaining(['$1,484.50', 'Out of $1,750.00 spend limit']),
    );
  });

  it('reads in Spanish, with no key or placeholder left', async () => {
    setLanguage('es');
    const screen = await render(card(THIS_WEEK, { open: true }));
    expect(shown(screen)).toEqual([
      'Esta semana',
      `12${NBSP}– 18${NBSP}oct`,
      'Gastado',
      '$20.00',
      'Ahorrado',
      '$5.00',
      'De un límite de $35.00',
      'Día 5 de 7',
      'vie 16 oct',
      'Hoy · Comprado',
      '$5.00',
      'jue 15 oct',
      'Comprado',
      '$5.00',
      'mié 14 oct',
      'Sin comprar',
      '+$5.00',
      'ahorrado',
      'mar 13 oct',
      'Comprado',
      '$5.00',
      'lun 12 oct',
      'Comprado',
      '$5.00',
    ]);
    expect(header(screen).props.accessibilityHint).toBe('Oculta los días.');
    expect(rowAt(screen, '2026-10-14').props.accessibilityLabel).toBe(
      'miércoles 14 de octubre, sin comprar, $5.00 ahorrado',
    );
    expect(rowAt(screen, FRIDAY).props.accessibilityHint).toBe('Abre el recibo.');
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/habits\.[a-z]+\.|\{\w+\}/);

    const last = await render(card(LAST_WEEK));
    expect(shown(last)).toContain('Semana completa');
  });

  it('reads in French, with the comma, a no-break space before the mark, and no key left', async () => {
    setLanguage('fr');
    const today = habitHistory(
      TIM,
      TAPS.filter((entry) => entry.day !== FRIDAY),
      FRIDAY,
    )[0];
    const screen = await render(card(today, { open: true }));
    expect(shown(screen)).toEqual([
      'Cette semaine',
      `12${NBSP}– 18${NBSP}oct.`,
      'Dépensé',
      `15,00${NBSP}$`,
      'Économisé',
      `5,00${NBSP}$`,
      `Sur une limite de 35,00${NBSP}$`,
      'Jour 5 sur 7',
      'ven. 16 oct.',
      'Aujourd’hui · pas encore acheté',
      '–',
      'jeu. 15 oct.',
      'Acheté',
      `5,00${NBSP}$`,
      'mer. 14 oct.',
      'Sans achat',
      `+5,00${NBSP}$`,
      'économisé',
      'mar. 13 oct.',
      'Acheté',
      `5,00${NBSP}$`,
      'lun. 12 oct.',
      'Acheté',
      `5,00${NBSP}$`,
    ]);
    expect(header(screen).props.accessibilityHint).toBe('Masque les jours.');
    expect(rowAt(screen, '2026-10-15').props.accessibilityLabel).toBe(
      `jeudi 15 octobre, acheté, 5,00${NBSP}$`,
    );
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/habits\.[a-z]+\.|\{\w+\}/);

    const last = await render(card(LAST_WEEK));
    expect(shown(last)).toContain('Semaine terminée');
  });
});

describe('HabitWeekCard at a large text size', () => {
  const layout = (screen: Screen, testID: string, width: number) =>
    fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
    });

  beforeEach(() => {
    const window = { width: 375, height: 812, scale: 3, fontScale: 1 };
    Dimensions.set({ window, screen: window });
  });

  /** Lays the week's days out: each date as wide as `word`, in a slot as wide as `room`. */
  async function layOutDays(screen: Screen, week: HabitWeek, room: number, word: number) {
    await layout(screen, `habit-week-days-${week.weekStart}`, 330);
    for (const { day } of week.days) {
      await layout(screen, `fit-slot-${day}-date`, room);
      await layout(screen, `fit-copy-${day}-date`, word);
    }
  }

  const amountSlot = (screen: Screen, day: string) =>
    screen.getByTestId(`fit-slot-${day}-amount`, { includeHiddenElements: true });

  it('keeps every amount beside its date while each date’s widest word fits', async () => {
    const screen = await render(card(THIS_WEEK, { open: true }));
    await layOutDays(screen, THIS_WEEK, 150, 60);
    for (const { day } of THIS_WEEK.days) {
      expect(String(amountSlot(screen, day).props.className ?? '')).not.toContain('mt-[2px]');
    }
    expect(String(amountSlot(screen, FRIDAY).props.className)).toContain('shrink-0');
  });

  it('puts every amount in the week under its words once one date’s word cannot fit', async () => {
    const screen = await render(card(THIS_WEEK, { open: true }));
    await layOutDays(screen, THIS_WEEK, 150, 60);
    // One date's word needs more than its room beside the amount: all five days stack together.
    await layout(screen, 'fit-copy-2026-10-14-date', 200);
    for (const day of ['2026-10-16', '2026-10-15', '2026-10-13', '2026-10-12']) {
      expect(String(amountSlot(screen, day).props.className)).toContain('mt-[2px]');
    }
    // The skipped day's amount stacks too, under its words in the same column.
    const skipped = within(rowAt(screen, '2026-10-14'));
    expect(skipped.getByText('+$5.00')).toBeTruthy();
    expect(skipped.getByText('saved')).toBeTruthy();
  });

  it('stacks Spent over Saved once a figure cannot be shown whole beside the other', async () => {
    const screen = await render(card(THIS_WEEK));
    const groups = ['labels', 'figures'] as const;
    const figures = screen.getByTestId('habit-week-figures-2026-10-12');
    expect(String(figures.props.className)).toContain('flex-row');

    await layout(screen, 'habit-week-labels-2026-10-12', 280);
    await layout(screen, 'habit-week-figures-2026-10-12', 280);
    for (const member of ['spent', 'saved']) {
      for (const group of groups) {
        const part = group === 'labels' ? 'label' : 'figure';
        await layout(screen, `fit-slot-${member}-${part}`, 120);
        await layout(screen, `fit-copy-${member}-${part}`, 60);
      }
    }
    expect(String(screen.getByTestId('habit-week-figures-2026-10-12').props.className)).toContain(
      'flex-row',
    );

    await layout(screen, 'fit-copy-saved-figure', 150);
    expect(
      String(screen.getByTestId('habit-week-figures-2026-10-12').props.className),
    ).not.toContain('flex-row');
  });
});

describe('HabitAboutCard', () => {
  const rows = [
    { label: 'Price', value: '$5.00 each time' },
    { label: 'Paid with', value: 'Visa ••4242' },
    { label: 'Category', value: 'Dining & Takeout' },
    { label: 'Colour', value: 'Caramel' },
    { label: 'Started', value: '28 Sep 2026' },
  ];

  it('draws a label and its value per row, in order, and reads each row as one line', async () => {
    const screen = await render(<HabitAboutCard rows={rows} />);
    expect(shown(screen)).toEqual(rows.flatMap((row) => [row.label, row.value]));
    for (const row of rows) {
      expect(screen.getByLabelText(`${row.label}, ${row.value}`).props.accessible).toBe(true);
    }
  });

  it('puts every value under its label once one row cannot sit side by side', async () => {
    const window = { width: 375, height: 812, scale: 3, fontScale: 1 };
    Dimensions.set({ window, screen: window });
    const screen = await render(<HabitAboutCard rows={rows} />);
    const layout = (testID: string, width: number) =>
      fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
      });

    const row = () => screen.getByLabelText('Paid with, Visa ••4242') as unknown as Node;
    expect(String(row().props.className)).toContain('flex-row');

    await layout('habit-about', 330);
    for (let index = 0; index < rows.length; index += 1) {
      for (const part of ['label', 'value']) {
        await layout(`fit-slot-about-${index}-${part}`, 150);
        await layout(`fit-copy-about-${index}-${part}`, 60);
      }
    }
    expect(String(row().props.className)).toContain('flex-row');

    // "Dining & Takeout" has a word wider than its room.
    await layout('fit-copy-about-2-value', 180);
    expect(String(row().props.className)).not.toContain('flex-row');
  });

  it('writes the same rows in any language it is handed', async () => {
    setLanguage('fr');
    const screen = await render(
      <HabitAboutCard rows={[{ label: 'Prix', value: `5,00${NBSP}$ chaque fois` }]} />,
    );
    expect(shown(screen)).toEqual(['Prix', `5,00${NBSP}$ chaque fois`]);
  });
});
