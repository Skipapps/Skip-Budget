import { fireEvent, render, within } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import InsightsScreen from '@/app/insights';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * Insights holds no Savings figure and no way into Savings. The queries mock below has no savings
 * read, as the real module has none, so a page that asked for one would crash on an undefined hook.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (path: string) => mockPush(path),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
}));

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
jest.mock('@/data/bill-categories', () => ({ BILL_CATEGORIES: [] }));

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

/** Every read the page waits on before it shows a figure. */
const SOURCES = ['ledger', 'cards', 'salary', 'subscriptions', 'categories', 'balances'] as const;
type Source = (typeof SOURCES)[number];

let mockCards: { id: string; holder: string; last4: string; balance: number }[] = [];
let mockBalances = new Map<string, number>();
let mockFailing: Source | null = null;
let mockEntries: object[] = [];

const mockRefetch = Object.fromEntries(SOURCES.map((source) => [source, jest.fn()])) as Record<
  Source,
  jest.Mock
>;

let mockSalary: unknown[] = [];
let mockSubscriptions: object[] = [];

const mockAnswer = (source: Source, data: unknown) => ({
  data,
  isError: mockFailing === source,
  refetch: mockRefetch[source],
});

jest.mock('@/api/queries', () => ({
  useLedger: () => ({
    entries: mockEntries,
    totals: { in: 0, out: 0 },
    isLoading: false,
    isError: mockFailing === 'ledger',
    refetch: mockRefetch.ledger,
  }),
  useCards: () => mockAnswer('cards', mockCards),
  useSalarySources: () => mockAnswer('salary', mockSalary),
  useSubscriptions: () => mockAnswer('subscriptions', mockSubscriptions),
  useSourceBalances: () => ({
    balances: mockBalances,
    isError: mockFailing === 'balances',
    refetch: mockRefetch.balances,
  }),
}));

beforeEach(() => {
  mockSalary = [];
  mockSubscriptions = [];
  mockCards = [];
  mockBalances = new Map();
  mockFailing = null;
  mockEntries = [];
  mockBrandMark.mockClear();
  mockPush.mockClear();
  for (const refetch of Object.values(mockRefetch)) refetch.mockClear();
});

type Node = { parent: Node | null; props: { testID?: string } };

/** A text's own box: its parent, past the slot and group boxes that large text draws around it. */
function boxOf(node: Node): Node | null {
  let box = node.parent;
  while (box && String(box.props.testID ?? '').startsWith('fit-')) box = box.parent;
  return box;
}

type Tree = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;

/** Every line a person can see or hear: text, labels, hints and placeholders. */
function shownText(node: Tree): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(shownText);
  const props = node.props ?? {};
  const spoken = ['accessibilityLabel', 'aria-label', 'accessibilityHint', 'placeholder'].flatMap(
    (name) => (typeof props[name] === 'string' ? [props[name] as string] : []),
  );
  return [...spoken, ...(node.children ?? []).flatMap((child) => shownText(child as Tree))];
}

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

describe('Insights — what you owe', () => {
  it('draws each card’s debt to the cent: the walked balance wins, the typed one stands otherwise', async () => {
    mockCards = [
      // The walked balance must win over the figure typed when the card was added.
      { id: 'card-a', holder: 'Chase Sapphire', last4: '1004', balance: 1200 },
      // Not walked, so the typed figure stands.
      { id: 'card-b', holder: 'Amex Gold', last4: '2002', balance: 0.07 },
    ];
    mockBalances = new Map([['card-a', 1234.56]]);

    const { getByText, queryByText } = await render(<InsightsScreen />);

    expect(getByText('What you owe')).toBeTruthy();
    // A figure is pinned to its own label by sharing a box with it, so a debt cannot pass by
    // turning up somewhere else on the page.
    const beside = (label: string, figure: string) =>
      expect(boxOf(getByText(figure))).toBe(boxOf(getByText(label)));

    beside('Chase Sapphire 1004', '$1,234.56');
    beside('Amex Gold 2002', '$0.07');
    expect(queryByText('$1,200.00')).toBeNull();
  });

  it('is left out while there is no card', async () => {
    const { getByText, queryByText, queryByTestId } = await render(<InsightsScreen />);

    // The page drew, so the missing section is not just an empty screen.
    expect(getByText('What comes in')).toBeTruthy();
    expect(queryByText('What you owe')).toBeNull();
    expect(queryByTestId('insights-cards')).toBeNull();
  });
});

describe('Insights — Savings is not part of this page', () => {
  /** What the page used to say in its "Where you stand" section. */
  const STAND = [
    'Where you stand',
    'Saved, less what you owe',
    'Put aside',
    'Owed on credit cards',
  ];
  /** What the page used to say in its "What you keep" section, empty state included. */
  const KEEP = [
    'What you keep',
    'See every month',
    'No finished months yet',
    'When a month ends',
    'See savings',
  ];
  const MONTH_AND_YEAR =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/;

  // Every remaining section has something to draw, so an absence below is not an empty page.
  function fillThePage() {
    mockSalary = [
      { id: 'pay', name: 'Acme', amount: 3000, frequency: 'monthly', last_payday: '2026-01-01' },
    ];
    mockEntries = [spend('o1', 'Oxxo', { amount: -12.34 }), spend('o2', 'Oxxo', { amount: -5 })];
    mockCards = [
      { id: 'card-a', holder: 'Chase Sapphire', last4: '1004', balance: 1200 },
      { id: 'card-b', holder: 'Amex Gold', last4: '2002', balance: 0.07 },
    ];
    mockBalances = new Map([['card-a', 1234.56]]);
    mockSubscriptions = [{ id: 's1', amount: 15.99, active: true }];
  }

  it('still draws every other section', async () => {
    fillThePage();
    const screen = await render(<InsightsScreen />);

    for (const heading of [
      'What comes in',
      'What goes out',
      'Where it goes',
      'Where you spend most',
      'What you owe',
      'Coming up',
    ]) {
      expect({ heading, drawn: screen.queryByText(heading) !== null }).toEqual({
        heading,
        drawn: true,
      });
    }
  });

  it('has no Where you stand card, and no total made from the cards', async () => {
    fillThePage();
    const screen = await render(<InsightsScreen />);

    expect(
      shownText(screen.toJSON()).filter((line) => STAND.some((w) => line.includes(w))),
    ).toEqual([]);
    expect(screen.queryByTestId('insights-stand')).toBeNull();
    // 1,234.56 + 0.07: the old "Owed on credit cards" figure. Each card's own debt stays.
    expect(screen.queryByText('$1,234.63')).toBeNull();
    expect(screen.getByText('$1,234.56')).toBeTruthy();
    expect(screen.getByText('$0.07')).toBeTruthy();
  });

  it('has no What you keep section: no months, no empty state, no links', async () => {
    fillThePage();
    const screen = await render(<InsightsScreen />);
    const lines = shownText(screen.toJSON());

    expect(lines.filter((line) => KEEP.some((words) => line.includes(words)))).toEqual([]);
    expect(lines.filter((line) => MONTH_AND_YEAR.test(line))).toEqual([]);
    // The one "Every month" left is the pay card's; the other was the link under What you keep.
    expect(screen.getAllByText('Every month')).toHaveLength(1);
    expect(within(screen.getByTestId('insights-income')).getByText('Every month')).toBeTruthy();
  });

  it('says nothing about savings at all', async () => {
    fillThePage();
    const screen = await render(<InsightsScreen />);

    expect(shownText(screen.toJSON()).filter((line) => /savings?/i.test(line))).toEqual([]);
  });

  it('offers no way into Savings from any button', async () => {
    fillThePage();
    // With no pay the page shows its "Set up payday" button as well as the subscriptions row: each
    // goes to a page of its own, and nothing else may go anywhere.
    mockSalary = [];
    const screen = await render(<InsightsScreen />);

    for (const button of screen.getAllByRole('button')) await fireEvent.press(button);

    const pushed = mockPush.mock.calls.map(([path]) => path);
    expect(pushed).toEqual(expect.arrayContaining(['/salary', '/subscriptions']));
    expect(pushed.filter((path) => /savings/.test(path))).toEqual([]);
  });
});

describe('Insights — the whole page', () => {
  it('says nothing about friends or groups', async () => {
    const screen = await render(<InsightsScreen />);

    // The page drew its sections, so the absences below are not just an empty screen.
    expect(screen.getByText('What comes in')).toBeTruthy();

    // Lines of text rather than elements: a failing comparison prints the words, and an element
    // cannot be printed.
    const lines = shownText(screen.toJSON());
    expect(lines.filter((line) => /friend/i.test(line))).toEqual([]);
    expect(lines.filter((line) => /\bgroups?\b/i.test(line))).toEqual([]);
    expect(lines.filter((line) => /shared with others|settled up/i.test(line))).toEqual([]);
  });

  it('shows the failure page, and asks every source again, when any one source fails', async () => {
    mockCards = [{ id: 'card-a', holder: 'Chase Sapphire', last4: '1004', balance: 1234.56 }];
    const DRAWN = ['What comes in', 'What you owe', '$1,234.56'];

    // Without a failure all three are on the page, so their absence below is the failure's doing.
    const working = await render(<InsightsScreen />);
    expect(DRAWN.filter((words) => working.queryByText(words) !== null)).toEqual(DRAWN);
    await working.unmount();

    for (const source of SOURCES) {
      mockFailing = source;
      for (const refetch of Object.values(mockRefetch)) refetch.mockClear();

      const { getByText, queryByText, unmount } = await render(<InsightsScreen />);

      // The source rides along in each comparison so a miss names the read that slipped through.
      expect({
        source,
        failure: queryByText(FAILURE_MESSAGE) !== null,
        drawn: DRAWN.filter((words) => queryByText(words) !== null),
      }).toEqual({ source, failure: true, drawn: [] });

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
    mockSalary = [
      { id: 'pay', name: 'Acme', amount: 3456.78, frequency: 'monthly', last_payday: '2026-01-01' },
    ];
    const screen = await render(<InsightsScreen />);
    for (const id of ['income', 'out']) {
      // The figure drawn in its slot, ahead of the hidden copy that measures it.
      const node = shownIn(screen, `fit-slot-${id}`);
      expect(node.props.children).toMatch(/\.\d{2}$/);
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.adjustsFontSizeToFit).toBeUndefined();
      expect(node.props.maxFontSizeMultiplier).toBe(1.2);
    }
    expect(shownIn(screen, 'fit-slot-income').props.children).toBe('$3,456.78');
  });

  it('moves every What you owe figure under its label once one label cannot fit', async () => {
    mockCards = [
      ...mockCards,
      { id: 'card-b', holder: 'Amex Gold', last4: '2002', balance: 87.65 },
    ];
    const screen = await render(<InsightsScreen />);
    await layOutCard(screen, 'insights-cards', ['card-a', 'card-b']);
    expect([beside(screen, 'card-a'), beside(screen, 'card-b')]).toEqual([true, true]);

    await layOutCard(screen, 'insights-cards', ['card-a', 'card-b'], 'card-b');
    expect([beside(screen, 'card-a'), beside(screen, 'card-b')]).toEqual([false, false]);
    // Still pinned to its own label, and still to the cent.
    for (const [id, figure] of [
      ['card-a', '$1,234.56'],
      ['card-b', '$87.65'],
    ]) {
      const row = screen.getByTestId(`fit-slot-${id}-label`).parent;
      expect(screen.getByTestId(`fit-slot-${id}-value`).parent).toBe(row);
      expect(shownIn(screen, `fit-slot-${id}-value`).props.children).toBe(figure);
    }
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
