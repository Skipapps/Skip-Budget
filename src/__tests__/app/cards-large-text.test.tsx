import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import CardsScreen from '@/app/(tabs)/cards';

/**
 * The Cards tab at large text sizes: the two money tiles share one label size and one figure size
 * and grow taller rather than spill out of a square, and the card faces keep their shape at the least
 * while nothing on them is cut.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    Easing: { out: () => () => 0, quad: () => 0 },
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/data/money-mock', () => ({
  moneyBuckets: [
    { id: 'salary', label: 'Salary', artwork: 'tileSalary' },
    { id: 'savings', label: 'Savings', artwork: 'tileSavings' },
  ],
}));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true }) }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => async () => true,
  useDialog: () => async () => undefined,
}));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));
jest.mock('@/lib/use-today', () => ({ useToday: () => ({ today: '2026-09-12' }) }));

jest.mock('@/api/queries', () => ({
  savedFor: (month: { saved: number }) => Number(month.saved),
  useCards: () => ({
    data: [
      {
        id: 'card-1',
        holder: 'Chase Sapphire Preferred',
        balance: 1234.56,
        last4: '4242',
        network: 'VISA',
        color: '#000000',
      },
    ],
    isPending: false,
    isError: false,
  }),
  useBankAccounts: () => ({
    data: [
      {
        id: 'acct-1',
        bank_name: 'A Bank',
        nickname: 'Everyday',
        account_type: 'checking',
        balance: 900,
        last4: '1111',
        color: '#000000',
      },
    ],
    isPending: false,
    isError: false,
  }),
  useSalarySources: () => ({
    data: [{ amount: 12345.67, frequency: 'monthly' }],
    isPending: false,
    isError: false,
  }),
  useMonthlySavings: () => ({
    data: [{ month: '2026-08-01', saved: 260 }],
    isPending: false,
    isError: false,
  }),
  useSourceBalances: () => ({ balances: new Map(), isError: false, refetch: jest.fn() }),
}));

type Screen = Awaited<ReturnType<typeof render>>;

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

const sizeOf = (screen: Screen, text: string) =>
  StyleSheet.flatten(screen.getByText(text).props.style).fontSize as number;

/** Montserrat at 13pt x 1.3 (labels) and SemiBold at 16pt x 1.2 (figures). */
const LABELS = { salary: 59.6, savings: 65.2 };
const FIGURES = { salary: 112.4, savings: 77.9 };

/** One layout pass with `room` points for each tile's text, then the two group boxes. */
async function layOutTiles(screen: Screen, room: number) {
  for (const id of ['salary', 'savings'] as const) {
    await layout(screen, `fit-slot-${id}-label`, room);
    await layout(screen, `fit-copy-${id}-label`, LABELS[id]);
    await layout(screen, `fit-slot-${id}-figure`, room);
    await layout(screen, `fit-copy-${id}-figure`, FIGURES[id]);
  }
  await layout(screen, 'money-tile-labels', 327);
  await layout(screen, 'money-tile-figures', 327);
}

/** The tiles' row, found from a tile: side by side it is a row, stacked a column. */
const tilesStacked = (screen: Screen) =>
  !String(screen.getByLabelText('Salary, $12,345.67').parent?.parent?.props.className).includes(
    'flex-row',
  );

type Json = { props: Record<string, unknown>; children: (Json | string)[] | null };

/** Every drawn view whose props match. */
function hostsWhere(screen: Screen, match: (props: Record<string, unknown>) => boolean): Json[] {
  const found: Json[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') return;
    if (match(node.props)) found.push(node);
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as Json | Json[] | null;
  (Array.isArray(tree) ? tree : tree ? [tree] : []).forEach(walk);
  return found;
}

const paddingTopIs = (value: string) => (props: Record<string, unknown>) =>
  StyleSheet.flatten(props.style as StyleProp<ViewStyle>)?.paddingTop === value;

/** The spacer that keeps a tile at least square is drawn only side by side. */
const squareSpacers = (screen: Screen) => hostsWhere(screen, paddingTopIs('100%')).length;

beforeEach(() => {
  const window = { width: 375, height: 812, scale: 3, fontScale: 1.3 };
  Dimensions.set({ window, screen: window });
});

describe('Cards — money tiles at large text sizes', () => {
  it('prints the labels and figures whole, the figures with their cents', async () => {
    const screen = await render(<CardsScreen />);
    for (const label of ['Salary', 'Savings']) {
      const node = screen.getByText(label);
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.maxFontSizeMultiplier).toBe(1.3);
    }
    for (const figure of ['$12,345.67', '$260.00']) {
      const node = screen.getByText(figure);
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.adjustsFontSizeToFit).toBeUndefined();
      expect(node.props.maxFontSizeMultiplier).toBe(1.2);
    }
  });

  it('keeps each tile at least square without fixing its height, so it can grow', async () => {
    const screen = await render(<CardsScreen />);
    expect(squareSpacers(screen)).toBe(2);
    expect(hostsWhere(screen, (props) => /aspect-/.test(String(props.className ?? '')))).toEqual(
      [],
    );
  });

  it('shrinks both figures together when the wider one needs it, side by side', async () => {
    const screen = await render(<CardsScreen />);
    // 100pt each: "$12,345.67" needs 112.4pt, so both go to 99 / 112.4 = 0.88.
    await layOutTiles(screen, 100);

    expect(sizeOf(screen, '$260.00')).toBe(sizeOf(screen, '$12,345.67'));
    expect(sizeOf(screen, '$12,345.67')).toBeCloseTo(16 * 0.88, 5);
    expect(sizeOf(screen, 'Salary')).toBe(sizeOf(screen, 'Savings'));
    expect(tilesStacked(screen)).toBe(false);
  });

  it('stacks the tiles rather than take the figures under their default size', async () => {
    const screen = await render(<CardsScreen />);
    // 70pt would need 16pt x 1.2 x 0.61 = 11.7pt, under the 16pt default.
    await layOutTiles(screen, 70);

    expect(tilesStacked(screen)).toBe(true);
    // One tile per line has no use for a square.
    expect(squareSpacers(screen)).toBe(0);
    expect(screen.getByText('$12,345.67')).toBeTruthy();
  });
});

describe('Cards — card faces at large text sizes', () => {
  it('wraps the holder name, keeps the shape as a minimum and keeps the logo its size', async () => {
    const screen = await render(<CardsScreen />);

    const holder = screen.getByText('Chase Sapphire Preferred');
    expect(holder.props.numberOfLines).toBeUndefined();
    expect(holder.props.maxFontSizeMultiplier).toBe(1.3);

    // The network wordmark is a logo; an account type is words and follows the text size.
    expect(screen.getByText('VISA').props.allowFontScaling).toBe(false);
    const type = screen.getByText('Checking');
    expect(type.props.allowFontScaling).toBeUndefined();
    expect(type.props.maxFontSizeMultiplier).toBe(1.3);

    // The balance is a figure of its own, whole, and is never shrunk by iOS on its own.
    const owed = screen.getByText('-$1,234');
    expect(owed.props.adjustsFontSizeToFit).toBeUndefined();
    expect(owed.props.numberOfLines).toBeUndefined();
    expect(owed.props.maxFontSizeMultiplier).toBe(1.2);

    // One for the card, one for the account; nothing on the tab has a fixed aspect ratio.
    expect(hostsWhere(screen, paddingTopIs('56.18%'))).toHaveLength(2);
    expect(hostsWhere(screen, (props) => /aspect-/.test(String(props.className ?? '')))).toEqual(
      [],
    );
  });
});
