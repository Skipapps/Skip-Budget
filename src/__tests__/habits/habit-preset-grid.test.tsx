import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo, Dimensions, StyleSheet } from 'react-native';

import { HabitPresetGrid } from '@/components/habits/habit-preset-grid';
import { HABIT_PRESETS, PRESETS_SHOWN, type HabitPreset } from '@/data/habit-presets';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Step 1's grid on its own: the ready-made habits two-up, each centred with no radio, names at one
 * size and subtitles at one size, one column once either would go under its default size; More and
 * Add my own as filled pills side by side or stacked; and More's reveal moving VoiceOver to the
 * first new habit.
 */

// Each icon draws its name and colour, so a test can see which ones are on the page.
jest.mock('lucide-react-native', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return new Proxy(
    {},
    {
      get: (_, name) =>
        function Icon({ color }: { color?: string }) {
          return <MockText testID={`icon-${String(name)}`}>{color}</MockText>;
        },
    },
  );
});
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: { View }, FadeIn: { duration: () => ({}) } };
});
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/data/habit-icon-art', () => ({
  HABIT_ICON_ART: new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () =>
    new Proxy({}, { get: (_, name) => (name === 'onControl' ? '#FFFFFF' : '#000000') }),
  useTheme: () => ({ scheme: 'light' }),
}));

type Screen = Awaited<ReturnType<typeof render>>;
type Host = NonNullable<Screen['root']>;

const hidden = { includeHiddenElements: true };

function phone(width: number, fontScale: number) {
  const window = { width, height: 812, scale: 3, fontScale };
  Dimensions.set({ window, screen: window });
}

type Props = Partial<Parameters<typeof HabitPresetGrid>[0]>;

function grid(props: Props = {}) {
  return render(
    <HabitPresetGrid
      presets={HABIT_PRESETS}
      shownBefore={PRESETS_SHOWN}
      moreShown={false}
      justRevealed={false}
      selectedId={null}
      trackingIds={new Set()}
      priceOf={(preset: HabitPreset) => preset.price}
      onPick={jest.fn()}
      onMore={jest.fn()}
      onOwn={jest.fn()}
      {...props}
    />,
  );
}

/** A tile's share of the row: 47.5% two-up, the whole row in one column. */
const tileWidth = (screen: Screen) =>
  StyleSheet.flatten(screen.getByLabelText(/^Coffee, /).parent?.props.style)?.width;

/** Text room in a tile at 375pt: two-up, 47.5% of 327pt less 30pt of padding and border; else 297pt. */
const ROOM = { twoUp: 125, oneColumn: 297 };

/**
 * One layout pass at the tiles' current width: the grid's width, each tile's text room, and each
 * name's and subtitle's widest word as measured (already multiplied by the text size), delivered
 * together as the phone would.
 */
async function layOut(screen: Screen, widest: { name: number; subtitle: number }) {
  const room = tileWidth(screen) === '100%' ? ROOM.oneColumn : ROOM.twoUp;
  const widths: [Host, number][] = [
    [screen.getByTestId('habit-presets'), 327],
    [screen.getByTestId('habit-presets-grid'), 327],
  ];
  for (const preset of HABIT_PRESETS.slice(0, PRESETS_SHOWN)) {
    for (const part of ['name', 'subtitle'] as const) {
      widths.push([screen.getByTestId(`fit-slot-${preset.id}-${part}`, hidden), room]);
      widths.push([screen.getByTestId(`fit-copy-${preset.id}-${part}`, hidden), widest[part]]);
    }
  }
  await act(async () => {
    for (const [node, width] of widths) {
      (node.props.onLayout as (event: unknown) => void)({
        nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
      });
    }
  });
}

/** Lays the grid out, then once more at whatever width its tiles took. */
async function settle(screen: Screen, widest: { name: number; subtitle: number }) {
  await layOut(screen, widest);
  await layOut(screen, widest);
}

const beside = (screen: Screen) =>
  String(screen.getByTestId('habit-preset-actions').props.className).includes('flex-row');

async function layOutButtons(screen: Screen, slot: number, label: number) {
  const widths: [Host, number][] = [[screen.getByTestId('habit-preset-actions'), 327]];
  for (const id of ['more', 'own']) {
    widths.push([screen.getByTestId(`fit-slot-${id}`, hidden), slot]);
    widths.push([screen.getByTestId(`fit-copy-${id}`, hidden), label]);
  }
  await act(async () => {
    for (const [node, width] of widths) {
      (node.props.onLayout as (event: unknown) => void)({
        nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
      });
    }
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  phone(375, 1);
});

/**
 * Each pill's label room at 375pt: (327pt - 12pt gap) / 2, less 14pt of padding a side; the icon and
 * its gap take 26pt of that. Labels are Montserrat SemiBold 15pt advance sums, at the default size.
 */
const PILL_SLOT = (327 - 12) / 2 - 28;
const LABELS: Record<Language, { more: number; own: number; words: [string, string] }> = {
  en: { more: 39.63, own: 98.33, words: ['More', 'Add my own'] },
  es: { more: 31.16, own: 93.56, words: ['Más', 'Crear el mío'] },
  fr: { more: 33.16, own: 93.3, words: ['Plus', 'Autre chose'] },
};

async function layOutPills(screen: Screen, language: Language, grow: number) {
  const widths: [Host, number][] = [[screen.getByTestId('habit-preset-actions'), 327]];
  for (const id of ['more', 'own'] as const) {
    widths.push([screen.getByTestId(`fit-slot-${id}`, hidden), PILL_SLOT]);
    widths.push([screen.getByTestId(`fit-copy-${id}`, hidden), LABELS[language][id] * grow]);
  }
  await act(async () => {
    for (const [node, width] of widths) {
      (node.props.onLayout as (event: unknown) => void)({
        nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
      });
    }
  });
}

describe('HabitPresetGrid', () => {
  it('centres each tile: the icon on top, the name and subtitle under it, and no radio', async () => {
    const screen = await grid({ selectedId: 'coffee' });

    const coffee = screen.getByLabelText(/^Coffee, /);
    expect(String(coffee.props.className)).toContain('items-center');
    expect(String(screen.getByText('Coffee').props.className)).toContain('text-center');
    expect(String(screen.getByText('Café runs').props.className)).toContain('text-center');
    // Chosen is the plum outline alone: no check mark anywhere on the grid.
    expect(String(coffee.props.className)).toContain('border-control');
    expect(screen.queryByTestId('icon-Check')).toBeNull();
    expect(String(screen.getByLabelText(/^Breakfast out, /).props.className)).not.toContain(
      'border-control',
    );
  });

  it('draws More and Add my own as filled plum pills with white words and icons', async () => {
    const screen = await grid();

    for (const name of ['More', 'Add my own']) {
      const pill = screen.getByRole('button', { name });
      const classes = String(pill.props.className).split(/\s+/);
      expect(classes).toEqual(
        expect.arrayContaining(['rounded-full', 'bg-control', 'active:bg-control-pressed']),
      );
      expect(classes).not.toContain('border');
      expect(String(screen.getByText(name).props.className).split(/\s+/)).toContain(
        'text-on-control',
      );
    }
    expect(screen.getByTestId('icon-ChevronDown').props.children).toBe('#FFFFFF');
    expect(screen.getByTestId('icon-Plus').props.children).toBe('#FFFFFF');
  });

  it.each(['en', 'es', 'fr'] as const)(
    'keeps the pills side by side at the default size in %s on a 375pt phone, and stacks them at 1.4x',
    async (language) => {
      setLanguage(language);
      const screen = await grid();
      expect(screen.getByRole('button', { name: LABELS[language].words[1] })).toBeTruthy();
      await layOutPills(screen, language, 1);
      expect(beside(screen)).toBe(true);

      const large = await grid();
      await layOutPills(large, language, 1.4);
      expect(beside(large)).toBe(false);
    },
  );

  it('draws each tile as a radio with its name, subtitle and price read out', async () => {
    const screen = await grid({ selectedId: 'lunch' });

    const lunch = screen.getByLabelText('Lunch out, Workday lunches, $15.00 each time');
    expect(lunch.props.accessibilityRole).toBe('radio');
    expect(lunch.props.accessibilityState).toMatchObject({ selected: true, checked: true });
    expect(screen.getAllByRole('radio')).toHaveLength(6);
  });

  it('stays two-up while the names shrink together above their default size', async () => {
    phone(375, 1.3);
    const screen = await grid();
    // 140pt into 125pt (less 1pt of slack) is 0.88: 17.2pt as drawn at 1.3x, over the 15pt default.
    await settle(screen, { name: 140, subtitle: 60 });

    expect(tileWidth(screen)).toBe('47.5%');
    const sizes = new Set(
      ['Coffee', 'Breakfast out', 'Taxi & rides'].map(
        (name) => StyleSheet.flatten(screen.getByText(name).props.style).fontSize,
      ),
    );
    expect([...sizes]).toEqual([15 * 0.88]);
  });

  it('goes to one column, at full size, once a name would go under its default size', async () => {
    phone(375, 1.3);
    const screen = await grid();
    await settle(screen, { name: 200, subtitle: 60 });

    expect(tileWidth(screen)).toBe('100%');
    expect(StyleSheet.flatten(screen.getByText('Coffee').props.style).fontSize).toBe(15);
  });

  it('goes to one column for a subtitle too', async () => {
    phone(375, 1.3);
    const screen = await grid();
    await settle(screen, { name: 60, subtitle: 190 });

    expect(tileWidth(screen)).toBe('100%');
  });

  it('puts More and Add my own side by side while both labels fit, and stacks them when not', async () => {
    const screen = await grid();
    await layOutButtons(screen, 120, 60);
    expect(beside(screen)).toBe(true);

    const stacked = await grid();
    await layOutButtons(stacked, 120, 130);
    expect(beside(stacked)).toBe(false);
    // Stacked, they keep the order they read in side by side.
    expect(stacked.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual(
      ['More', 'Add my own'],
    );
  });

  it('hands More and Add my own to the page, and More is gone once used', async () => {
    const onMore = jest.fn();
    const onOwn = jest.fn();
    const screen = await grid({ onMore, onOwn });
    await fireEvent.press(screen.getByRole('button', { name: 'More' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add my own' }));
    expect(onMore).toHaveBeenCalledTimes(1);
    expect(onOwn).toHaveBeenCalledTimes(1);

    await screen.rerender(
      <HabitPresetGrid
        presets={HABIT_PRESETS}
        shownBefore={PRESETS_SHOWN}
        moreShown
        justRevealed={false}
        selectedId={null}
        trackingIds={new Set()}
        priceOf={(preset: HabitPreset) => preset.price}
        onPick={jest.fn()}
        onMore={onMore}
        onOwn={onOwn}
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(10);
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
  });

  it('moves VoiceOver to the first habit More revealed, and only when More was just pressed', async () => {
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
    await grid({ moreShown: true, justRevealed: false });
    expect(focus).not.toHaveBeenCalled();

    const screen = await grid({ moreShown: true, justRevealed: true });
    expect(focus).toHaveBeenCalledTimes(1);
    const [target, event] = focus.mock.calls[0];
    expect(event).toBe('focus');
    expect(target).toBeTruthy();
    expect(screen.getByLabelText(/^Dinner out, /)).toBeTruthy();
  });
});
