import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { HabitIcon } from '@/components/habits/habit-icon';
import { HABIT_COLORS, habitColor } from '@/data/habit-colors';

type Drawn = { id: string; width?: number; height?: number };

// Jest has no SVG transformer: each drawing stands in as a component that notes its id and size.
const mockDrawn: Drawn[] = [];
jest.mock('@/data/habit-icon-art', () => ({
  HABIT_ICON_ART: new Proxy(
    {},
    {
      get: (_, id) =>
        function Art(props: { width?: number; height?: number }) {
          mockDrawn.push({ id: String(id), width: props.width, height: props.height });
          return null;
        },
    },
  ),
}));

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: mockScheme }),
}));

type Screen = Awaited<ReturnType<typeof render>>;

const hidden = { includeHiddenElements: true };
const circle = (screen: Screen) =>
  StyleSheet.flatten(screen.getByTestId('habit-icon', hidden).props.style);
/** The tint values belong to habit-colors; what is checked here is which one is drawn. */
const tint = (color: string, scheme: 'light' | 'dark') => habitColor(color).tint[scheme];
/** The drawing on screen now: the last one rendered. */
const drawn = () => mockDrawn[mockDrawn.length - 1];

describe('HabitIcon', () => {
  beforeEach(() => {
    mockScheme = 'light';
    mockDrawn.length = 0;
  });

  it('draws the icon centred on its colour’s light tint, 44 wide with the drawing at 60%', async () => {
    const screen = await render(<HabitIcon iconId="food-dining/coffee" color="caramel" />);
    expect(circle(screen)).toMatchObject({
      width: 44,
      height: 44,
      backgroundColor: tint('caramel', 'light'),
    });
    expect(drawn()).toEqual({ id: 'food-dining/coffee', width: 26, height: 26 });
  });

  it('takes the dark tint in dark mode', async () => {
    mockScheme = 'dark';
    const screen = await render(<HabitIcon iconId="transport/taxi-rides" color="violet" />);
    expect(circle(screen).backgroundColor).toBe(tint('violet', 'dark'));
    expect(tint('violet', 'dark')).not.toBe(tint('violet', 'light'));
    expect(drawn().id).toBe('transport/taxi-rides');
  });

  it('scales the drawing with the circle', async () => {
    const screen = await render(<HabitIcon iconId="shopping/gifts" color="pink" size={56} />);
    expect(circle(screen)).toMatchObject({
      width: 56,
      height: 56,
      backgroundColor: tint('pink', 'light'),
    });
    expect(drawn()).toEqual({ id: 'shopping/gifts', width: 34, height: 34 });
  });

  it('draws the fallback for an icon id it does not know', async () => {
    const screen = await render(<HabitIcon iconId="food-dining/caviar" color="green" />);
    expect(drawn()).toEqual({ id: 'goals/other', width: 26, height: 26 });
    expect(mockDrawn.map((art) => art.id)).not.toContain('food-dining/caviar');
    expect(circle(screen).backgroundColor).toBe(tint('green', 'light'));
  });

  it('draws the fallback on the first colour when both are missing', async () => {
    const screen = await render(<HabitIcon iconId={null} color={undefined} />);
    expect(drawn().id).toBe('goals/other');
    expect(circle(screen).backgroundColor).toBe(HABIT_COLORS[0].tint.light);
  });

  it('stays out of the accessibility tree: the row carries the name', async () => {
    const screen = await render(<HabitIcon iconId="food-dining/coffee" color="caramel" />);
    const view = screen.getByTestId('habit-icon', hidden);
    expect(view.props.accessible).toBe(false);
    expect(view.props.accessibilityElementsHidden).toBe(true);
    expect(view.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.queryByTestId('habit-icon')).toBeNull();
  });
});
