import { render } from '@testing-library/react-native';

import InsightsScreen from '@/app/insights';

/**
 * Which three months "What you keep" shows.
 *
 * This card used to be `savings.slice(0, 3)`, which meant "the three most
 * recent" only for as long as the query happened to return them newest-first.
 * Flipping that order anywhere upstream would have shown the three *oldest*
 * months with no error and nothing on screen to say so — the exact failure the
 * ascending-order work could have caused. So the fixture hands the same six
 * months over in three different orders and pins the answer.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/transactions/flow-chart', () => ({ FlowChart: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/pro/pro-gate', () => ({ useProGate: () => null }));

// The category labels import SVGs through `@/assets/*`, which jest's `@/`
// mapper points at `src/` and cannot resolve. No category is rendered here.
jest.mock('@/data/bills-mock', () => ({ BILL_CATEGORIES: [] }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', moneyOut: '#B85040' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({ useArtwork: () => ({}) }));
jest.mock('@/api/brands', () => ({
  useSpendCategories: () => ({ data: [], isError: false, refetch: jest.fn() }),
}));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));
jest.mock('@/api/splits', () => ({
  useMyBalances: () => ({ data: new Map(), isError: false, refetch: jest.fn() }),
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

/** Reassigned per case so the same six months arrive in a different order. */
let mockSavings = [...mockMonths];

const mockIdle = { data: [], isError: false, refetch: jest.fn() };

jest.mock('@/api/queries', () => ({
  savedFor: (month: {
    excluded_at: string | null;
    adjusted_saved: number | null;
    saved: number;
  }) => (month.excluded_at ? 0 : Number(month.adjusted_saved ?? month.saved)),
  useLedger: () => ({
    entries: [],
    totals: { in: 0, out: 0 },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useCards: () => mockIdle,
  useSalarySources: () => mockIdle,
  useMonthlySavings: () => ({ data: mockSavings, isError: false, refetch: jest.fn() }),
  useSubscriptions: () => mockIdle,
  useSourceBalances: () => ({ balances: new Map(), refetch: jest.fn() }),
}));

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
