import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import InsightsScreen from '@/app/insights';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * "What you keep" shows the three most recent months whatever order the query returns them in: the
 * fixture hands the same six months over in three orders and pins the answer.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/transactions/flow-chart', () => ({ FlowChart: () => null }));
const mockBrandMark = jest.fn();
jest.mock('@/components/brands/brand-mark', () => ({
  BrandMark: (props: object) => {
    mockBrandMark(props);
    return null;
  },
}));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/pro/pro-gate', () => ({ useProGate: () => null }));

// The category labels import SVGs through `@/assets/*`, which jest's `@/` mapper points at `src/`
// and cannot resolve.
jest.mock('@/data/bills-mock', () => ({ BILL_CATEGORIES: [] }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', moneyOut: '#B85040' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({ useArtwork: () => ({ error: () => null }) }));
jest.mock('@/api/brands', () => ({
  useSpendCategories: () => mockAnswer('categories', []),
}));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));

/** Six finished months, oldest to newest, with a distinct figure each. */
const mockMonths = [
  { month: '2026-03-01', saved: 300 },
  { month: '2026-04-01', saved: 400 },
  { month: '2026-05-01', saved: 500 },
  { month: '2026-06-01', saved: 600 },
  { month: '2026-07-01', saved: 700 },
  { month: '2026-08-01', saved: 800 },
].map((row) => ({
  ...row,
  income: 4000,
  spent: 4000 - row.saved,
  adjusted_saved: null,
  note: null,
  excluded_at: null,
}));

/** Every read the page waits on before it shows a figure. */
const SOURCES = [
  'ledger',
  'cards',
  'salary',
  'savings',
  'subscriptions',
  'categories',
  'balances',
] as const;
type Source = (typeof SOURCES)[number];

/** Reassigned per case so the same six months arrive in a different order. */
let mockSavings = [...mockMonths];
let mockCards: { id: string; holder: string; last4: string; balance: number }[] = [];
let mockBalances = new Map<string, number>();
let mockFailing: Source | null = null;
let mockEntries: object[] = [];

const mockRefetch = Object.fromEntries(SOURCES.map((source) => [source, jest.fn()])) as Record<
  Source,
  jest.Mock
>;

let mockSalary: unknown[] = [];

const mockAnswer = (source: Source, data: unknown) => ({
  data,
  isError: mockFailing === source,
  refetch: mockRefetch[source],
});

jest.mock('@/api/queries', () => ({
  savedFor: (month: {
    excluded_at: string | null;
    adjusted_saved: number | null;
    saved: number;
  }) => (month.excluded_at ? 0 : Number(month.adjusted_saved ?? month.saved)),
  useLedger: () => ({
    entries: mockEntries,
    totals: { in: 0, out: 0 },
    isLoading: false,
    isError: mockFailing === 'ledger',
    refetch: mockRefetch.ledger,
  }),
  useCards: () => mockAnswer('cards', mockCards),
  useSalarySources: () => mockAnswer('salary', mockSalary),
  useMonthlySavings: () => mockAnswer('savings', mockSavings),
  useSubscriptions: () => mockAnswer('subscriptions', []),
  useSourceBalances: () => ({
    balances: mockBalances,
    isError: mockFailing === 'balances',
    refetch: mockRefetch.balances,
  }),
}));

beforeEach(() => {
  mockSalary = [];
  mockSavings = [...mockMonths];
  mockCards = [];
  mockBalances = new Map();
  mockFailing = null;
  mockEntries = [];
  mockBrandMark.mockClear();
  for (const refetch of Object.values(mockRefetch)) refetch.mockClear();
});

/** The figures drawn in the mocked money-out colour, in page order. */
const redFigures = (nodes: { props: { style?: unknown; children?: unknown } }[]) =>
  nodes
    .filter(
      (node) => StyleSheet.flatten(node.props.style as StyleProp<TextStyle>)?.color === '#B85040',
    )
    .map((node) => node.props.children);

type Node = { parent: Node | null; props: { testID?: string } };

/** A text's own box: its parent, past the slot and group boxes that large text draws around it. */
function boxOf(node: Node): Node | null {
  let box = node.parent;
  while (box && String(box.props.testID ?? '').startsWith('fit-')) box = box.parent;
  return box;
}

/** The three newest of the six, oldest of those three first. */
const EXPECTED = ['June 2026', 'July 2026', 'August 2026'];

describe('Insights — what you keep', () => {
  it.each([
    ['newest first, as the query returns them', [...mockMonths].reverse()],
    ['oldest first, as the savings screen renders them', [...mockMonths]],
    [
      'shuffled',
      [mockMonths[2], mockMonths[5], mockMonths[0], mockMonths[4], mockMonths[1], mockMonths[3]],
    ],
  ])('shows the three most recent months when the list arrives %s', async (_label, order) => {
    mockSavings = order;

    const { getAllByText } = await render(<InsightsScreen />);

    const shown = getAllByText(
      /^(January|February|March|April|May|June|July|August|September|October|November|December) 2026$/,
    ).map((node) => node.props.children);

    expect(shown).toEqual(EXPECTED);
  });
});

describe('Insights — where you stand', () => {
  it('is savings less credit card debt, to the cent', async () => {
    // By hand: 300 + 400 + 500 + 600 + 700 + 800 = 3,300.00 put aside; 1,234.56 + 0.07 = 1,234.63
    // owed; 3,300.00 − 1,234.63 = 2,065.37. A card balance is debt, so owed is positive.
    mockCards = [
      // The walked balance must win over the figure typed when the card was added.
      { id: 'card-a', holder: 'Chase Sapphire', last4: '1004', balance: 1200 },
      // Not walked, so the typed figure stands.
      { id: 'card-b', holder: 'Amex Gold', last4: '2002', balance: 0.07 },
    ];
    mockBalances = new Map([['card-a', 1234.56]]);

    const { getByText } = await render(<InsightsScreen />);

    // A figure is pinned to its own label by sharing a box with it, so a total cannot pass by
    // turning up somewhere else on the page.
    const beside = (label: string, figure: string) =>
      expect(boxOf(getByText(figure))).toBe(boxOf(getByText(label)));

    beside('Saved, less what you owe', '$2,065.37');
    beside('Put aside', '$3,300.00');
    beside('Owed on credit cards', '$1,234.63');
    beside('Chase Sapphire 1004', '$1,234.56');
    beside('Amex Gold 2002', '$0.07');
  });

  it('a net worth that rounds to $0.00 is not drawn as a debt', async () => {
    // 0.1 + 0.2 is 0.30000000000000004, so 0.30 saved less these two cards is -5.55e-17: $0.00 on
    // screen, yet below zero to a raw comparison.
    mockSavings = [{ ...mockMonths[0], saved: 0.3, spent: 3999.7 }];
    mockCards = [
      { id: 'card-a', holder: 'Chase Sapphire', last4: '1004', balance: 0.1 },
      { id: 'card-b', holder: 'Amex Gold', last4: '2002', balance: 0.2 },
    ];

    const dust = await render(<InsightsScreen />);

    const label = dust.getByText('Saved, less what you owe');
    expect(dust.getAllByText('$0.00').some((node) => boxOf(node) === boxOf(label))).toBe(true);
    // The card debt is the only red figure; finding it proves the colour can be seen here, so the
    // headline missing from the list is a real answer.
    expect(redFigures(dust.getAllByText(/\$/))).toEqual(['$0.30']);
    await dust.unmount();

    // One cent more on a card is a real debt, so a rule that never colours the headline fails here.
    mockCards = [mockCards[0], { ...mockCards[1], balance: 0.21 }];
    const cent = await render(<InsightsScreen />);
    expect(redFigures(cent.getAllByText(/\$/))).toEqual(['-$0.01', '$0.31']);
  });

  it('says nothing about friends or groups', async () => {
    const { getByText, queryAllByText, queryAllByLabelText } = await render(<InsightsScreen />);

    // The page drew its figures, so the absences below are not just an empty screen.
    expect(getByText('Saved, less what you owe')).toBeTruthy();

    expect(queryAllByText(/friend/i)).toEqual([]);
    expect(queryAllByText(/\bgroups?\b/i)).toEqual([]);
    expect(queryAllByText(/shared with others|settled up/i)).toEqual([]);
    expect(queryAllByLabelText(/friend|\bgroups?\b|settled up/i)).toEqual([]);
  });

  it('shows the failure page, and asks every source again, when any one source fails', async () => {
    for (const source of SOURCES) {
      mockFailing = source;
      for (const refetch of Object.values(mockRefetch)) refetch.mockClear();

      const { getByText, queryByText, unmount } = await render(<InsightsScreen />);

      // The source rides along in each comparison so a miss names the read that slipped through.
      expect({
        source,
        failure: queryByText(FAILURE_MESSAGE) !== null,
        figures: queryByText('Saved, less what you owe') !== null,
      }).toEqual({ source, failure: true, figures: false });

      await fireEvent.press(getByText('Try again'));
      expect({
        source,
        asked: SOURCES.filter((each) => mockRefetch[each].mock.calls.length === 1),
      }).toEqual({ source, asked: [...SOURCES] });

      await unmount();
    }
  });
});

describe('Insights — where you spend most', () => {
  const spend = (id: string, label: string, over: object = {}) => ({
    id,
    label,
    amount: -10,
    date: '2026-10-01',
    kind: 'receipt',
    sourceId: 'card-1',
    domain: null,
    ...over,
  });

  it('keeps letters for a store only when every row of it chose letters and none has a logo', async () => {
    mockEntries = [
      spend('n1', 'Netflix', { kind: 'subscription', logoHidden: true }),
      spend('n2', 'Netflix', { kind: 'subscription', logoHidden: true }),
      spend('t1', 'Target', { logoHidden: true }),
      spend('t2', 'Target', { logoHidden: false }),
      spend('c1', 'Calm', { logoHidden: true }),
      spend('c2', 'Calm', { domain: 'calm.com' }),
      // Every row chose letters, yet one carries a website: the website wins.
      spend('s1', 'Spotify', { kind: 'subscription', logoHidden: true }),
      spend('s2', 'Spotify', { kind: 'subscription', logoHidden: true, domain: 'spotify.com' }),
    ];

    await render(<InsightsScreen />);

    const drawn = Object.fromEntries(
      mockBrandMark.mock.calls.map(([props]: [{ name: string }]) => [props.name, props]),
    );
    expect(drawn.Netflix).toMatchObject({ domain: null, hidden: true });
    expect(drawn.Target).toMatchObject({ domain: null, hidden: false });
    expect(drawn.Calm).toMatchObject({ domain: 'calm.com', hidden: false });
    expect(drawn.Spotify).toMatchObject({ domain: 'spotify.com', hidden: false });
  });
});

describe('Insights — at large text sizes', () => {
  type Screen = Awaited<ReturnType<typeof render>>;

  const layout = async (screen: Screen, testID: string, width: number) =>
    fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
    });

  /** Each row's label beside its figure, then the card: `wide` names the row whose word is too wide. */
  async function layOutCard(screen: Screen, card: string, ids: string[], wide?: string) {
    for (const id of ids) {
      await layout(screen, `fit-slot-${id}-label`, 150);
      await layout(screen, `fit-copy-${id}-label`, id === wide ? 170 : 80);
    }
    await layout(screen, card, 290);
  }

  type Shown = { props: { children?: unknown; [prop: string]: unknown } };
  const shownIn = (screen: Screen, slot: string) =>
    screen.getByTestId(slot).children[0] as unknown as Shown;

  const beside = (screen: Screen, id: string) =>
    String(screen.getByTestId(`fit-slot-${id}-label`).parent?.props.className).includes('flex-row');

  beforeEach(() => {
    mockCards = [{ id: 'card-a', holder: 'Chase Sapphire', last4: '1004', balance: 1234.56 }];
    mockEntries = [
      {
        id: 'e1',
        label: 'Ticketmaster Entertainment',
        amount: -1234.5,
        date: '2026-10-01',
        kind: 'receipt',
        sourceId: 'card-a',
        categoryId: 'fun',
      },
      {
        id: 'e2',
        label: 'Bakery',
        amount: -6,
        date: '2026-10-02',
        kind: 'receipt',
        sourceId: 'card-a',
        categoryId: 'food',
      },
    ];
  });

  it('prints each headline figure whole, with its cents, never shrunk on its own by iOS', async () => {
    const screen = await render(<InsightsScreen />);
    for (const id of ['worth', 'out']) {
      // The figure drawn in its slot, ahead of the hidden copy that measures it.
      const node = shownIn(screen, `fit-slot-${id}`);
      expect(node.props.children).toMatch(/\.\d{2}$/);
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.adjustsFontSizeToFit).toBeUndefined();
      expect(node.props.maxFontSizeMultiplier).toBe(1.2);
    }
  });

  it('moves both Where you stand figures under their labels once one label cannot fit', async () => {
    const screen = await render(<InsightsScreen />);
    await layOutCard(screen, 'insights-stand', ['aside', 'owed'], undefined);
    expect([beside(screen, 'aside'), beside(screen, 'owed')]).toEqual([true, true]);

    await layOutCard(screen, 'insights-stand', ['aside', 'owed'], 'owed');
    expect([beside(screen, 'aside'), beside(screen, 'owed')]).toEqual([false, false]);
    // Still pinned to its own label, and still to the cent.
    const row = screen.getByTestId('fit-slot-owed-label').parent;
    expect(screen.getByTestId('fit-slot-owed-value').parent).toBe(row);
    expect(shownIn(screen, 'fit-slot-owed-value').props.children).toBe('$1,234.56');
  });

  it('wraps a long store name and moves every figure in that card under its name together', async () => {
    const screen = await render(<InsightsScreen />);
    const name = screen.getByText('Ticketmaster Entertainment');
    expect(name.props.numberOfLines).toBeUndefined();
    expect(name.props.maxFontSizeMultiplier).toBe(1.4);

    await layOutCard(screen, 'insights-merchants', ['merchant-0', 'merchant-1'], 'merchant-0');
    expect([beside(screen, 'merchant-0'), beside(screen, 'merchant-1')]).toEqual([false, false]);
    // The other cards are groups of their own and keep their layout.
    expect(beside(screen, 'category-0')).toBe(true);
  });
});

describe('Insights — money in', () => {
  // This month and an earlier one, from the real clock the page itself reads.
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const earlier = `${now.getFullYear() - 1}-${pad(now.getMonth() + 1)}-01`;
  const schedule = {
    id: 's1',
    name: 'Acme',
    amount: 3000,
    frequency: 'monthly',
    last_payday: earlier,
  };
  const oneOff = (payday: string, amount: number) => ({
    id: `o-${payday}-${amount}`,
    name: '',
    amount,
    frequency: 'once',
    last_payday: payday,
  });

  it('counts the schedules every month and says what one-off pays added this month', async () => {
    mockSalary = [schedule, oneOff(thisMonth, 400), oneOff(earlier, 999)];
    const screen = await render(<InsightsScreen />);
    const card = within(screen.getByTestId('insights-income'));

    expect(card.getByText('Every month')).toBeTruthy();
    expect(card.getByText('$3,000.00')).toBeTruthy();
    expect(card.getByText('from 1 source')).toBeTruthy();
    expect(card.getByText('+ $400.00 paid once this month')).toBeTruthy();
  });

  it('shows this month’s one-off pays when there is no schedule', async () => {
    mockSalary = [oneOff(thisMonth, 400), oneOff(thisMonth, 120.5)];
    const screen = await render(<InsightsScreen />);
    const card = within(screen.getByTestId('insights-income'));

    expect(card.getByText('This month')).toBeTruthy();
    expect(card.getByText('$520.50')).toBeTruthy();
    expect(card.getByText('from 2 one-off pays')).toBeTruthy();
    expect(card.queryByText('Every month')).toBeNull();
  });

  it('never counts an earlier month’s one-off pay as this month’s income', async () => {
    mockSalary = [oneOff(earlier, 400)];
    const screen = await render(<InsightsScreen />);

    expect(screen.queryByTestId('insights-income')).toBeNull();
    expect(screen.queryByText('$400.00')).toBeNull();
  });
});
