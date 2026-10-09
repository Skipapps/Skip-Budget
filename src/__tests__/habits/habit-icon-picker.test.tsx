import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { HabitIconPicker, iconColumns } from '@/components/habits/habit-icon-picker';
import { HABIT_ICON_CATEGORIES, HABIT_ICONS } from '@/data/habit-icons';
import { setLanguage } from '@/i18n/store';
import { selection } from '@/lib/haptics';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The icon picker: all 100 icons under their 13 headings, each on its own circle in its category's
 * tint (the Founder's review: no tinted panel behind a group), and as many columns as the widest
 * word of any label allows, never fewer than two.
 */

// Each drawing stands in as a component that names itself, so a test can see which one a cell drew.
jest.mock('@/data/habit-icon-art', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    HABIT_ICON_ART: new Proxy(
      {},
      { get: (_, id) => () => <MockText testID={`art-${String(id)}`}>{String(id)}</MockText> },
    ),
  };
});
jest.mock('@/lib/haptics', () => ({ selection: jest.fn(), tap: jest.fn() }));

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/providers/theme-provider', () => ({ useTheme: () => ({ scheme: mockScheme }) }));

type Screen = Awaited<ReturnType<typeof render>>;

const layout = (width: number) => ({ nativeEvent: { layout: { width, height: 20, x: 0, y: 0 } } });

/** The cell's width style, which carries the column count. */
const cellWidth = (screen: Screen, name: string) =>
  StyleSheet.flatten(screen.getByRole('button', { name }).props.style).width;

/** The circle a drawing sits on. */
const circleOf = (screen: Screen, id: string) =>
  StyleSheet.flatten(screen.getByTestId(`art-${id}`).parent?.props.style);

beforeEach(() => {
  jest.clearAllMocks();
  mockScheme = 'light';
  setLanguage(null);
});

afterAll(() => setLanguage(null));

describe('iconColumns', () => {
  it('takes four columns while the widest word fits a quarter, then three, then two', () => {
    // 375pt phone: 327pt of content. A quarter is 81.75pt less 4pt of inset.
    expect(iconColumns(327, 76)).toBe(4);
    expect(iconColumns(327, 77)).toBe(3);
    expect(iconColumns(327, 104)).toBe(3);
    expect(iconColumns(327, 105)).toBe(2);
    expect(iconColumns(327, 158)).toBe(2);
  });

  it('stays at two, where labels wrap between words, however wide a word gets', () => {
    expect(iconColumns(327, 400)).toBe(2);
  });

  it('opens on four until both widths are known', () => {
    expect(iconColumns(0, 120)).toBe(4);
    expect(iconColumns(327, 0)).toBe(4);
  });
});

describe('HabitIconPicker', () => {
  it('lists all 100 icons under the 13 headings, in the registry’s order', async () => {
    const screen = await render(<HabitIconPicker value={null} onPick={jest.fn()} />);

    expect(screen.getAllByRole('header').map((heading) => heading.props.children)).toEqual([
      'Food & Dining',
      'Transport',
      'Shopping',
      'Entertainment',
      'Health',
      'Fitness',
      'Wellness',
      'Home & Bills',
      'Family & Pets',
      'Relationships',
      'Learning & Growth',
      'Finance',
      'Goals',
    ]);
    const cells = screen.getAllByRole('button');
    expect(cells).toHaveLength(100);
    expect(HABIT_ICONS).toHaveLength(100);
    for (const icon of HABIT_ICONS) expect(screen.getByTestId(`art-${icon.id}`)).toBeTruthy();
  });

  it('puts every icon on its own 48pt circle in its category’s tint, with no tinted panel', async () => {
    const screen = await render(<HabitIconPicker value={null} onPick={jest.fn()} />);

    for (const category of HABIT_ICON_CATEGORIES) {
      for (const icon of category.icons) {
        expect(circleOf(screen, icon.id)).toMatchObject({
          width: 48,
          height: 48,
          backgroundColor: category.tint.light,
        });
      }
      const grid = StyleSheet.flatten(
        screen.getByTestId(`habit-icon-grid-${category.id}`).props.style ?? {},
      );
      expect(grid.backgroundColor).toBeUndefined();
    }
  });

  it('takes the dark tints in dark mode', async () => {
    mockScheme = 'dark';
    const screen = await render(<HabitIconPicker value={null} onPick={jest.fn()} />);
    const coffee = HABIT_ICON_CATEGORIES[0];
    expect(circleOf(screen, 'food-dining/coffee').backgroundColor).toBe(coffee.tint.dark);
    expect(coffee.tint.dark).not.toBe(coffee.tint.light);
  });

  it('marks the picked icon, and hands back the one tapped with a selection haptic', async () => {
    const onPick = jest.fn();
    const screen = await render(<HabitIconPicker value="food-dining/coffee" onPick={onPick} />);

    expect(screen.getByRole('button', { name: 'Coffee' }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByRole('button', { name: 'Bus' }).props.accessibilityState).toEqual({
      selected: false,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Bus' }));
    expect(selection).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('transport/bus');
  });

  it('lets labels wrap freely and grow to the control ceiling: nothing cut, nothing shrunk', async () => {
    const screen = await render(<HabitIconPicker value={null} onPick={jest.fn()} />);

    const label = screen.getByText('Alcohol & nightlife');
    expect(label.props.numberOfLines).toBeUndefined();
    expect(label.props.adjustsFontSizeToFit).toBeUndefined();
    expect(label.props.maxFontSizeMultiplier).toBe(TEXT_CAP.control);
  });

  it('measures the widest word from a hidden copy of every label’s words', async () => {
    const screen = await render(<HabitIconPicker value={null} onPick={jest.fn()} />);

    const copy = screen.getByTestId('habit-icon-picker-words', { includeHiddenElements: true });
    const words = String(copy.props.children).split('\n');
    expect(words).toContain('Alcohol');
    expect(words).toContain('nightlife');
    expect(words).not.toContain('Alcohol & nightlife');
    expect(copy.props.maxFontSizeMultiplier).toBe(TEXT_CAP.control);
    expect(screen.queryByTestId('habit-icon-picker-words')).toBeNull();
  });

  it('drops every section to three columns, then two, as the widest word grows', async () => {
    const screen = await render(<HabitIconPicker value={null} onPick={jest.fn()} />);
    const copy = screen.getByTestId('habit-icon-picker-words', { includeHiddenElements: true });
    expect(cellWidth(screen, 'Coffee')).toBe('25%');

    await fireEvent(screen.getByTestId('habit-icon-picker'), 'layout', layout(327));
    await fireEvent(copy, 'layout', layout(70));
    expect(cellWidth(screen, 'Coffee')).toBe('25%');

    await fireEvent(copy, 'layout', layout(90));
    expect(cellWidth(screen, 'Coffee')).toBe(`${100 / 3}%`);
    expect(cellWidth(screen, 'Wedding')).toBe(`${100 / 3}%`);

    await fireEvent(copy, 'layout', layout(130));
    expect(cellWidth(screen, 'Coffee')).toBe('50%');

    // A wider phone takes the columns back.
    await fireEvent(screen.getByTestId('habit-icon-picker'), 'layout', layout(450));
    expect(cellWidth(screen, 'Coffee')).toBe(`${100 / 3}%`);
  });

  it('speaks and shows the icons in the language on screen', async () => {
    setLanguage('fr');
    const screen = await render(<HabitIconPicker value={null} onPick={jest.fn()} />);
    expect(screen.getByText('Magasinage')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Souper au resto' })).toBeTruthy();
    expect(screen.queryAllByText(/^habits\./)).toHaveLength(0);
  });
});
