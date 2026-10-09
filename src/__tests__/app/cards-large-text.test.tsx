import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import CardsScreen from '@/app/(tabs)/cards';

/**
 * The Cards tab at large text sizes. The four Money tiles share one size per kind of line (names,
 * figures, notes) and sit two to a row only while every line fits there whole, pills on one line;
 * otherwise they stack one per row. The card faces take their content's height, so nothing on
 * them is cut.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
// Jest turns an .svg into a number, not a component; the icons have a suite of their own.
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
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

let mockPay = 12345.67;
jest.mock('@/api/queries', () => ({
  useCards: () => ({
    data: [
      {
        id: 'card-1',
        holder: 'Chase Sapphire Preferred',
        balance: 1234.56,
        last4: '4242',
        network: 'VISA',
        color: '#000000',
        credit_limit: 5000,
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
    data: [{ amount: mockPay, frequency: 'monthly' }],
    isPending: false,
    isError: false,
  }),
  useSourceBalances: () => ({
    balances: new Map(),
    updated: new Map([['acct-1', '2026-09-12']]),
    isError: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/api/loans', () => ({
  useActiveLoans: () => ({
    loans: [{ billId: 'b1', name: 'Car loan' }],
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

type Screen = Awaited<ReturnType<typeof render>>;

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

const sizeOf = (screen: Screen, text: string) =>
  StyleSheet.flatten(screen.getByText(text).props.style).fontSize as number;

/**
 * Each line's widest word (a pill: its whole label plus its 24pt of padding) at 1.3x, in Montserrat:
 * names 14pt, figures 18pt SemiBold (capped at 1.2x), pills 13pt Medium, notes 12pt.
 */
const NATURAL: Record<string, number> = {
  'salary-label': 54.7,
  'savings-label': 70.3,
  'loans-label': 54.1,
  'goals-label': 50,
  'salary-figure': 111.5,
  'loans-figure': 77,
  'savings-pill': 71.6,
  'goals-pill': 138.5,
  'salary-note': 64.7,
  'savings-note': 50.7,
  'loans-note': 30,
};

/** One layout pass with `room` points for each tile's text, then the four group boxes. */
async function layOutTiles(screen: Screen, room: number, natural: Record<string, number> = {}) {
  for (const [id, width] of Object.entries({ ...NATURAL, ...natural })) {
    await layout(screen, `fit-slot-${id}`, room);
    await layout(screen, `fit-copy-${id}`, width);
  }
  for (const box of [
    'money-tile-labels',
    'money-tile-figures',
    'money-tile-pills',
    'money-tiles',
  ]) {
    await layout(screen, box, 327);
  }
}

const tilesStacked = (screen: Screen) =>
  screen
    .getAllByTestId('money-tile-row')
    .every((row) => !String(row.props.className).includes('flex-row'));

type Json = { props: Record<string, unknown>; children: (Json | string)[] | null };

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

beforeEach(() => {
  mockPay = 12345.67;
  const window = { width: 375, height: 812, scale: 3, fontScale: 1.3 };
  Dimensions.set({ window, screen: window });
});

describe('Cards — Money tiles at large text sizes', () => {
  it('caps each line at its role and never cuts or shrinks it on its own', async () => {
    const screen = await render(<CardsScreen />);
    const lines: [string, number][] = [
      ['Salary', 1.3],
      ['Goals', 1.3],
      ['$12,345.67', 1.2],
      ['1 active', 1.2],
      ['Open', 1.3],
      ['Coming soon', 1.3],
      ['Monthly', 1.3],
      ['Car loan', 1.3],
    ];
    for (const [text, cap] of lines) {
      const node = screen.getByText(text);
      expect([text, node.props.maxFontSizeMultiplier]).toEqual([text, cap]);
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.adjustsFontSizeToFit).toBeUndefined();
    }
  });

  it('draws side-by-side tiles at one height, the shorter filling the height of the taller', async () => {
    // Jest has no layout engine, so this pins the chain that makes it so: each row stretches its
    // cells to the tallest (no items-* override), and the tile and its surface grow into it.
    const screen = await render(<CardsScreen />);
    for (const row of screen.getAllByTestId('money-tile-row')) {
      expect(String(row.props.className)).toContain('flex-row');
      expect(String(row.props.className)).not.toMatch(/(^|\s)items-/);
    }
    for (const id of ['salary', 'savings', 'loans', 'goals']) {
      const tile = screen.getByTestId(`money-tile-${id}`);
      const cell = tile.parent;
      const surface = tile.children[0] as unknown as { props: { className?: string } };
      expect(String(cell?.props.className)).toMatch(/(^|\s)flex-1(\s|$)/);
      expect(String(cell?.props.className)).not.toMatch(/(^|\s)(self-|items-)/);
      expect(String(tile.props.className)).toMatch(/(^|\s)grow(\s|$)/);
      expect(String(surface.props.className)).toMatch(/(^|\s)grow(\s|$)/);
    }
  });

  it('keeps two to a row while every line fits, at its full size', async () => {
    const screen = await render(<CardsScreen />);
    // 140pt each, a 402pt phone: "Coming soon" needs 138.5pt with its padding.
    await layOutTiles(screen, 140);

    expect(tilesStacked(screen)).toBe(false);
    expect(sizeOf(screen, '$12,345.67')).toBe(18);
    expect(sizeOf(screen, '1 active')).toBe(18);
    expect(sizeOf(screen, 'Coming soon')).toBe(13);
  });

  it('shrinks both figures together when the wider one needs it, side by side', async () => {
    mockPay = 1234567.89;
    const screen = await render(<CardsScreen />);
    // "$1,234,567.89" needs 150pt: both figures go to 139 / 150 = 0.92, still above 18pt.
    await layOutTiles(screen, 140, { 'salary-figure': 150 });

    expect(tilesStacked(screen)).toBe(false);
    expect(sizeOf(screen, '$1,234,567.89')).toBeCloseTo(18 * 0.92, 5);
    expect(sizeOf(screen, '1 active')).toBe(sizeOf(screen, '$1,234,567.89'));
  });

  it('stacks the tiles rather than break a pill onto two lines', async () => {
    const screen = await render(<CardsScreen />);
    // 126.5pt each, a 375pt phone: "Coming soon" no longer fits whole.
    await layOutTiles(screen, 126.5);

    expect(tilesStacked(screen)).toBe(true);
    expect(screen.getByText('Coming soon').props.numberOfLines).toBeUndefined();
    // Nothing shrank to make room.
    expect(sizeOf(screen, 'Coming soon')).toBe(13);
  });

  it('stacks the tiles rather than take the figures under their default size', async () => {
    const screen = await render(<CardsScreen />);
    // Every pill fits here; 119 / 160 = 0.74 would draw the figures at 16pt, under 18.
    await layOutTiles(screen, 120, { 'salary-figure': 160, 'goals-pill': 100 });

    expect(tilesStacked(screen)).toBe(true);
    expect(screen.getByText('$12,345.67')).toBeTruthy();
  });
});

describe('Cards — card faces at large text sizes', () => {
  it('takes its content’s height, wraps the name and keeps the wordmark its size', async () => {
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

    // The bottom lines wrap and grow like the name.
    for (const text of ['$1,234 of $5,000 limit', 'Updated today', '•••• 4242', '•••• 1111']) {
      const node = screen.getByText(text);
      expect([text, node.props.numberOfLines]).toEqual([text, undefined]);
      expect(node.props.maxFontSizeMultiplier).toBe(1.3);
    }

    // No fixed shape anywhere on the tab: no aspect ratio, no ratio spacer.
    expect(
      hostsWhere(screen, (props) =>
        /%$/.test(
          String(StyleSheet.flatten(props.style as StyleProp<ViewStyle>)?.paddingTop ?? ''),
        ),
      ),
    ).toEqual([]);
    expect(hostsWhere(screen, (props) => /aspect-/.test(String(props.className ?? '')))).toEqual(
      [],
    );
  });
});
