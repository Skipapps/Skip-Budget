import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Dimensions } from 'react-native';

import type { ChargeRow } from '@/api/charges';
import type { LoanListRow } from '@/api/loans';
import { planLedger, type PlanMonthData } from '@/api/payment-ledger';
import type { BillRow, SubscriptionRow } from '@/api/queries';
import {
  PlanMonthPage,
  PlanMonthScreen,
  type PlanMonthLinks,
} from '@/components/payments/plan-month-screen';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { lastChargedBy, monthBounds, planMonth, type PlanKind } from '@/lib/bill-month';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { pickPayment } from '@/lib/payment-pick';
import { contrast } from '@/lib/tone';
import { ThemeProvider } from '@/providers/theme-provider';
import { buildTokens, mix, type Scheme } from '@/theme/palette';
import { shadows } from '@/theme/shadows';
import { TEXT_CAP } from '@/theme/text-scale';

// A machine under load needs more than Jest's five seconds for these heavy pages; a test that
// is really stuck still fails.
jest.setTimeout(20000);

/**
 * The Monthly bills and Subscriptions page as a person meets it, on the Founder's design month
 * (1.png, 6.png): October 2026 seen on the 12th. Nothing here is a hand-made view. The page's own
 * hook, `usePlanMonth`, runs for real over the real ledger and `planMonth`; only the five reads
 * under it (bills, subscriptions, charges, loan payoffs, the names of cards and accounts) are fakes,
 * held in `mockWorld`. What is on screen is checked against the maths, to the cent.
 *
 *   bills          $1,884.00 · 4 bills · 2 paid · 2 coming up · Next: AEP · 22 Oct
 *   subscriptions  $38.98 · 3 subscriptions · 2 paid · 1 coming up · Next: iCloud+ · 15 Oct
 */

jest.mock('lucide-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return new Proxy(
    {},
    {
      get:
        (_target, name) =>
        ({ color }: { color?: string }) =>
          createElement(View, { testID: `icon-${String(name)}`, iconColor: color }),
    },
  );
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    useArtwork: () =>
      new Proxy(
        {},
        { get: (_target, name) => () => createElement(View, { testID: `art-${String(name)}` }) },
      ),
  };
});
// Reanimated cannot start under Jest; the page only needs to know a skeleton is drawn.
jest.mock('@/components/ui/skeleton', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: () => createElement(View, { testID: 'skeleton' }),
    SkeletonList: () => createElement(View, { testID: 'skeleton-list' }),
  };
});
// Each mark says which one it is and what it was given: the logos are the rows' own parts.
jest.mock('@/components/bills/bill-mark', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BillMark: (props: Record<string, unknown>) =>
      createElement(View, { testID: 'bill-mark', mark: props }),
  };
});
jest.mock('@/components/brands/brand-mark', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BrandMark: (props: Record<string, unknown>) =>
      createElement(View, { testID: 'brand-mark', mark: props }),
  };
});

// The failure line imports Sentry, whose timer would keep Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

// The real theme, over a phone that stores its choice.
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));
let mockMode: Scheme = 'light';
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(mockMode)),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

let mockToday = '2026-10-12';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));

// The pull is the app's own refresh, which runs the sweep; it needs a QueryClient of its own.
const mockRefreshAll = jest.fn(() => Promise.resolve());
let mockRefreshing = false;
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: mockRefreshAll, refreshing: mockRefreshing }),
}));

// The five reads under `usePlanMonth`, as fake queries on one shared world: a test loads, fails and
// refetches them as the network would, and the page re-reads when it changes.
type ReadName = 'bills' | 'subscriptions' | 'charges' | 'payoffs' | 'labels';
type World = {
  data: Data;
  loading: ReadName | null;
  failed: ReadName | null;
  /** Told of every refetch, with the read it was for. */
  refetched: (name: ReadName) => void;
};
let mockWorld: World = { data: {}, loading: null, failed: null, refetched: () => {} };
const mockListeners = new Set<() => void>();
const mockSubscribe = (listener: () => void) => {
  mockListeners.add(listener);
  return () => {
    mockListeners.delete(listener);
  };
};
function mockChange(next: Partial<World>) {
  mockWorld = { ...mockWorld, ...next };
  mockListeners.forEach((listener) => listener());
}
const mockNoRows: readonly never[] = Object.freeze([]);
function mockQuery(name: ReadName, rows: unknown) {
  const world = mockWorld;
  return {
    data: world.loading === name || world.failed === name ? undefined : rows,
    isLoading: world.loading === name,
    isError: world.failed === name,
    // The world as it is when the page asks, not as it was drawn.
    refetch: () => mockWorld.refetched(name),
  };
}
const mockLabels = new Map([
  ['acct-komal-7010', 'Komal ••7010'],
  ['card-discover-6334', 'Discover ••6334'],
]);

jest.mock('@/api/queries', () => {
  const actual = jest.requireActual('@/api/queries');
  const { useSyncExternalStore } = jest.requireActual('react');
  const read = (name: ReadName, rows: (data: Data) => unknown) => () => {
    useSyncExternalStore(mockSubscribe, () => mockWorld);
    return mockQuery(name, rows(mockWorld.data));
  };
  return {
    ...actual,
    useBills: read('bills', (data) => data.bills ?? mockNoRows),
    useSubscriptions: read('subscriptions', (data) => data.subscriptions ?? mockNoRows),
    useLoanPayoffRows: read('payoffs', () => mockNoRows),
  };
});
jest.mock('@/api/charges', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  return {
    ...jest.requireActual('@/api/charges'),
    useCharges: () => {
      useSyncExternalStore(mockSubscribe, () => mockWorld);
      return mockQuery('charges', mockWorld.data.charges ?? mockNoRows);
    },
  };
});
jest.mock('@/api/payment-labels', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  return {
    usePaymentLabels: () => {
      useSyncExternalStore(mockSubscribe, () => mockWorld);
      const query = mockQuery('labels', null);
      return {
        sources: [],
        labelOf: (id: string) => mockLabels.get(id) ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
      };
    },
  };
});

// The loans a stopped loan row is read from, with the real schedule behind them.
let mockLoans = {
  loans: [] as LoanListRow[],
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};
jest.mock('@/api/loans', () => {
  const { termsFromStored } = jest.requireActual('@/lib/loan');
  return {
    useLoans: () => mockLoans,
    loanTermsOf: (row: LoanListRow) => termsFromStored(row, row.bill.starts_on ?? undefined),
  };
});

// ---------------------------------------------------------------------------------------------
// The accounts: the design's Komal ••7010 and Discover ••6334.

const TODAY = '2026-10-12';
const KOMAL = 'acct-komal-7010';
const DISCOVER = 'card-discover-6334';

function bill(id: string, fields: Partial<BillRow>): BillRow {
  return {
    id,
    name: id,
    amount: 0,
    category_id: 'other',
    icon_id: null,
    recurrence: 'monthly',
    next_due_on: null,
    starts_on: null,
    ends_on: null,
    card_id: null,
    bank_account_id: null,
    created_at: '2026-07-20T12:00:00Z',
    ...fields,
  };
}

function subscription(id: string, fields: Partial<SubscriptionRow>): SubscriptionRow {
  return {
    id,
    brand_id: null,
    name: id,
    amount: 0,
    cycle: 'monthly',
    next_renewal_on: null,
    started_on: null,
    created_at: '2026-07-20T12:00:00Z',
    category_id: 'entertainment',
    card_id: null,
    bank_account_id: null,
    note: null,
    active: true,
    brands: null,
    ...fields,
  };
}

/** One charge per date, as the recorders write them. */
function charges(
  plan: { bill?: string; subscription?: string },
  dates: readonly string[],
  label: string,
  amount: number,
  source: { card?: string; account?: string } = {},
): ChargeRow[] {
  const owner = plan.bill ?? plan.subscription;
  return dates.map((on) => ({
    id: `${owner}-${on}`,
    bill_id: plan.bill ?? null,
    subscription_id: plan.subscription ?? null,
    label,
    amount,
    charged_on: on,
    card_id: source.card ?? null,
    bank_account_id: source.account ?? null,
  }));
}

type Data = { bills?: BillRow[]; subscriptions?: SubscriptionRow[]; charges?: ChargeRow[] };

// ---------------------------------------------------------------------------------------------
// The design's data (the same four bills and three subscriptions as the Founder's screens).

const RENT = bill('rent', {
  name: 'Ashword Hill Apartments',
  amount: 1035,
  category_id: 'housing',
  next_due_on: '2026-08-01',
  starts_on: '2026-08-01',
  bank_account_id: KOMAL,
});
const NATIONWIDE = bill('nationwide', {
  name: 'Nationwide',
  amount: 145,
  category_id: 'insurance',
  next_due_on: '2026-08-05',
  starts_on: '2026-08-05',
});
const AEP = bill('aep', {
  name: 'AEP',
  amount: 150,
  category_id: 'energy',
  next_due_on: '2026-08-22',
  starts_on: '2026-08-22',
  bank_account_id: KOMAL,
});
const CAR_LOAN = bill('car', {
  name: 'Car loan',
  amount: 554,
  category_id: 'loans',
  icon_id: 'loan-car',
  next_due_on: '2026-09-28',
  starts_on: '2026-09-28',
  ends_on: '2031-08-28',
  card_id: DISCOVER,
  in_spending: true,
});

const DESIGN_BILLS: Data = {
  bills: [RENT, NATIONWIDE, AEP, CAR_LOAN],
  charges: [
    ...charges({ bill: 'rent' }, ['2026-08-01', '2026-09-01', '2026-10-01'], RENT.name, 1035, {
      account: KOMAL,
    }),
    ...charges(
      { bill: 'nationwide' },
      ['2026-08-05', '2026-09-05', '2026-10-05'],
      'Nationwide',
      145,
    ),
    ...charges({ bill: 'aep' }, ['2026-08-22', '2026-09-22'], 'AEP', 150, { account: KOMAL }),
    ...charges({ bill: 'car' }, ['2026-09-28'], 'Car loan', 554, { card: DISCOVER }),
  ],
};

const NETFLIX = subscription('netflix', {
  name: 'Netflix',
  amount: 15.99,
  next_renewal_on: '2026-08-03',
  started_on: '2026-08-03',
});
const SPOTIFY = subscription('spotify', {
  name: 'Spotify',
  amount: 10,
  next_renewal_on: '2026-09-08',
  started_on: '2026-09-08',
});
const ICLOUD = subscription('icloud', {
  name: 'iCloud+',
  amount: 12.99,
  next_renewal_on: '2026-08-15',
  started_on: '2026-08-15',
  card_id: DISCOVER,
});

const DESIGN_CHARGES = [
  ...charges(
    { subscription: 'netflix' },
    ['2026-08-03', '2026-09-03', '2026-10-03'],
    'Netflix',
    15.99,
  ),
  ...charges({ subscription: 'spotify' }, ['2026-09-08', '2026-10-08'], 'Spotify', 10),
  ...charges({ subscription: 'icloud' }, ['2026-08-15', '2026-09-15'], 'iCloud+', 12.99, {
    card: DISCOVER,
  }),
];
const DESIGN_SUBSCRIPTIONS: Data = {
  subscriptions: [NETFLIX, SPOTIFY, ICLOUD],
  charges: DESIGN_CHARGES,
};

// ---------------------------------------------------------------------------------------------
// Opening the page.

let mounted: { unmount: () => void | Promise<void> } | null = null;

async function mount(ui: ReactElement) {
  // One page at a time, so a query never finds the one before it.
  await mounted?.unmount();
  const view = await render(<ThemeProvider>{ui}</ThemeProvider>);
  mounted = view;
  // The theme reads the stored mode a tick after the first frame.
  await act(async () => {});
  return view;
}

/** The page over an account's data; `loading` and `failed` hold one of the five reads. */
async function openPage(
  kind: PlanKind,
  data: Data,
  o: { month?: string; loading?: ReadName; failed?: ReadName } = {},
) {
  mockWorld = {
    data,
    loading: o.loading ?? null,
    failed: o.failed ?? null,
    refetched: () => {},
  };
  await mount(<PlanMonthScreen kind={kind} month={o.month} />);
}

/** What `usePlanMonth` gives for a month, for the pure page: the same ledger and maths. */
function monthData(kind: PlanKind, month: string, data: Data): PlanMonthData {
  const bills = data.bills ?? [];
  const subscriptions = data.subscriptions ?? [];
  const charges = data.charges ?? [];
  return {
    view: planMonth({
      kind,
      month,
      today: TODAY,
      entries: planLedger(
        { bills, subscriptions, charges, payoffs: [] },
        monthBounds(month),
        TODAY,
      ),
      bills,
      subscriptions,
      lastCharged: lastChargedBy(charges),
    }),
    hasPlans: true,
    labelOf: (id) => mockLabels.get(id) ?? null,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  };
}

// ---------------------------------------------------------------------------------------------
// Reading the screen.

const hidden = { includeHiddenElements: true };

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;

const textOf = (node: { props: Record<string, unknown> }) =>
  [node.props.children as unknown]
    .flat(Infinity)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');

/** Every line a node draws, top to bottom. */
const linesIn = (node: Parameters<typeof within>[0]) => within(node).getAllByText(/./).map(textOf);

const classOf = (node: { props: Record<string, unknown> } | null | undefined) =>
  String(node?.props.className ?? '');

const card = () => linesIn(screen.getByTestId('month-card-summary'));
const planRow = (id: string) => screen.getByTestId(`plan-row-${id}`);
const stoppedRow = (id: string) => screen.getByTestId(`stopped-row-${id}`);
const comingRows = () => {
  const section = screen.queryByTestId('coming-up');
  return section
    ? within(section)
        .getAllByRole('button')
        .filter((node) => String(node.props.testID).startsWith('coming-row-'))
    : [];
};
const comingLines = () => comingRows().map(linesIn);
const planRowIds = (section: string) =>
  within(screen.getByTestId(section))
    .getAllByRole('button')
    .map((node) => String(node.props.testID))
    .filter((id) => /^(plan|stopped)-row-[a-z]+$/.test(id))
    .map((id) => id.replace(/^(plan|stopped)-row-/, ''));

const rowsOf = (section: string) =>
  planRowIds(section).map((id) =>
    linesIn(screen.getByTestId(`${section === 'stopped-plans' ? 'stopped' : 'plan'}-row-${id}`)),
  );

/** "$1,035.00" in whole cents, read off the screen as written (English). */
const centsOf = (money: string) => Number(money.replace(/[^0-9]/g, ''));
const isMoney = (line: string) => /^\$[\d,]+\.\d\d$/.test(line);

/** A tree's Text nodes and the words in the accessibility props, with the className of each Text. */
function everything(): {
  texts: { line: string; className: string; props: Json['props'] }[];
  said: string[];
} {
  const texts: { line: string; className: string; props: Json['props'] }[] = [];
  const said: string[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') return;
    for (const key of ['accessibilityLabel', 'accessibilityHint']) {
      if (typeof node.props[key] === 'string') said.push(node.props[key] as string);
    }
    if (node.type === 'Text') {
      const line = (node.children ?? []).filter((part) => typeof part === 'string').join('');
      texts.push({ line, className: String(node.props.className ?? ''), props: node.props });
      said.push(line);
    }
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as Tree;
  (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return { texts, said };
}

const pushed = () => jest.mocked(router.push).mock.calls.map(([href]) => href);

beforeEach(() => {
  resetLocaleForTests();
  mockToday = TODAY;
  mockMode = 'light';
  mockLoans = { loans: [], isPending: false, isError: false, refetch: jest.fn() };
  mockWorld = { data: {}, loading: null, failed: null, refetched: () => {} };
  mockRefreshing = false;
  jest.clearAllMocks();
  const window = { width: 390, height: 844, scale: 3, fontScale: 1 };
  Dimensions.set({ window, screen: window });
});

// ---------------------------------------------------------------------------------------------
// 1.png and 6.png.

describe('Monthly bills: October 2026 on the 12th', () => {
  beforeEach(() => openPage('bill', DESIGN_BILLS));

  it('is the design: the card, then Coming up, All bills and the history link', async () => {
    expect(screen.getByRole('header', { name: 'Monthly bills' })).toBeTruthy();
    expect(card()).toEqual([
      'Due in October',
      '$1,884.00',
      '4 bills · 2 paid · 2 coming up',
      'Next: AEP · 22 Oct',
    ]);
    expect(within(screen.getByTestId('month-chip')).getByText('Oct 2026')).toBeTruthy();
    expect(screen.getByTestId('month-card-summary').props.accessibilityLabel).toBe(
      'Due in October: $1,884.00. 4 bills · 2 paid · 2 coming up. Next: AEP · 22 Oct',
    );
    expect(
      screen.getByRole('button', { name: 'Showing October 2026. Choose another month' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'See payment history' })).toBeTruthy();
  });

  it('Coming up: AEP in 10 days and the car loan in 16, each with where it is paid from', async () => {
    const section = screen.getByTestId('coming-up');
    expect(within(section).getByRole('header', { name: 'Coming up, 2' })).toBeTruthy();
    expect(comingLines()).toEqual([
      ['AEP', '22 Oct · Komal ••7010', '$150.00', 'in 10 days'],
      ['Car loan', '28 Oct · Discover ••6334', '$554.00', 'in 16 days'],
    ]);
    expect(comingRows().map((node) => node.props.accessibilityLabel)).toEqual([
      'AEP, $150.00, due 22 Oct, in 10 days, Komal ••7010',
      'Car loan, $554.00, due 28 Oct, in 16 days, Discover ••6334',
    ]);
  });

  it('All bills: every bill in due order, Paid or Next, to the cent', async () => {
    expect(
      within(screen.getByTestId('all-plans')).getByRole('header', { name: 'All bills, 4' }),
    ).toBeTruthy();
    expect(planRowIds('all-plans')).toEqual(['rent', 'nationwide', 'aep', 'car']);
    expect(rowsOf('all-plans')).toEqual([
      ['Ashword Hill Apartments', 'Monthly · Komal ••7010', '$1,035.00', 'Paid'],
      ['Nationwide', 'Monthly ·', 'Add a card', '$145.00', 'Paid'],
      ['AEP', 'Monthly · Komal ••7010', '$150.00', 'Next 22 Oct'],
      ['Car loan', 'Monthly · Discover ••6334', '$554.00', 'Next 28 Oct'],
    ]);
  });

  it('reads each row to VoiceOver as one sentence', async () => {
    expect(planRowIds('all-plans').map((id) => planRow(id).props.accessibilityLabel)).toEqual([
      'Ashword Hill Apartments, $1,035.00, Monthly, Komal ••7010, Paid',
      'Nationwide, $145.00, Monthly, Card not set, Paid',
      'AEP, $150.00, Monthly, Komal ••7010, Next 22 Oct',
      'Car loan, $554.00, Monthly, Discover ••6334, Next 28 Oct',
    ]);
  });

  it('draws the tick for Paid, in the money-in green, and nothing for Next', async () => {
    expect(within(planRow('rent')).getByTestId('icon-Check')).toBeTruthy();
    expect(within(planRow('aep')).queryByTestId('icon-Check')).toBeNull();
    expect(classOf(within(planRow('rent')).getByText('Paid'))).toContain('text-money-in');
    expect(classOf(within(planRow('aep')).getByText('Next 22 Oct'))).toContain('text-muted');
  });

  it('draws every amount in ink, never in a money colour', async () => {
    for (const id of planRowIds('all-plans')) {
      const amount = within(planRow(id)).getByText(linesIn(planRow(id)).find(isMoney) ?? '');
      expect(classOf(amount)).toContain('text-ink');
      expect(classOf(amount)).not.toMatch(/money/);
    }
  });

  it('gives each bill its own mark: the loan its type, the others their category', async () => {
    const marks = screen.getAllByTestId('bill-mark').map((node) => node.props.mark);
    const carLoan = marks.filter((mark) => mark.name === 'Car loan');
    expect(carLoan).toHaveLength(2);
    expect(carLoan[0]).toEqual(
      expect.objectContaining({ categoryId: 'loans', iconId: 'loan-car' }),
    );
    expect(marks.find((mark) => mark.name === 'Ashword Hill Apartments')).toEqual(
      expect.objectContaining({ categoryId: 'housing', iconId: null, size: 40 }),
    );
    expect(screen.queryByTestId('brand-mark')).toBeNull();
  });
});

describe('Subscriptions: October 2026 on the 12th', () => {
  beforeEach(() => openPage('subscription', DESIGN_SUBSCRIPTIONS));

  it('is the design: $38.98, three subscriptions, iCloud+ next in 3 days', async () => {
    expect(screen.getByRole('header', { name: 'Subscriptions' })).toBeTruthy();
    expect(card()).toEqual([
      'Due in October',
      '$38.98',
      '3 subscriptions · 2 paid · 1 coming up',
      'Next: iCloud+ · 15 Oct',
    ]);
    expect(screen.getByTestId('month-card-summary').props.accessibilityLabel).toBe(
      'Due in October: $38.98. 3 subscriptions · 2 paid · 1 coming up. Next: iCloud+ · 15 Oct',
    );
    expect(
      within(screen.getByTestId('coming-up')).getByRole('header', { name: 'Coming up, 1' }),
    ).toBeTruthy();
    expect(comingLines()).toEqual([['iCloud+', '15 Oct · Discover ••6334', '$12.99', 'in 3 days']]);
  });

  it('All subscriptions: two with no card to add one to, and iCloud+ next on the 15th', async () => {
    expect(
      within(screen.getByTestId('all-plans')).getByRole('header', { name: 'All subscriptions, 3' }),
    ).toBeTruthy();
    expect(rowsOf('all-plans')).toEqual([
      ['Netflix', 'Monthly ·', 'Add a card', '$15.99', 'Paid'],
      ['Spotify', 'Monthly ·', 'Add a card', '$10.00', 'Paid'],
      ['iCloud+', 'Monthly · Discover ••6334', '$12.99', 'Next 15 Oct'],
    ]);
  });

  it('uses the subscriptions’ logos, not the bills’ marks', async () => {
    expect(screen.getAllByTestId('brand-mark').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('bill-mark')).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// The figure, the counts and the rows are one set of numbers.

/** What a month's screen says, read back as numbers. */
function adds() {
  const [, figure, counts, next] = card();
  const rows = planRowIds('all-plans').map((id) => {
    const lines = linesIn(planRow(id));
    return { id, cents: centsOf(lines.find(isMoney) ?? '$0.00'), status: lines[lines.length - 1] };
  });
  // A bill not due this month shows its next payment with its year: no part of the figure.
  const due = rows.filter((row) => !/\d{4}$/.test(row.status));
  const stoppedPaid = screen.queryByTestId('stopped-plans')
    ? planRowIds('stopped-plans')
        .map((id) => linesIn(stoppedRow(id)))
        .filter((lines) => lines[lines.length - 1] === 'Paid')
        .map((lines) => centsOf(lines.find(isMoney) ?? '$0.00'))
    : [];
  const paid = due.filter((row) => row.status === 'Paid');
  return {
    figure: centsOf(figure),
    counts,
    next,
    dueCents: [...due.map((row) => row.cents), ...stoppedPaid].reduce((sum, c) => sum + c, 0),
    n: due.length + stoppedPaid.length,
    p: paid.length + stoppedPaid.length,
    c: due.length - paid.length,
    comingCents: comingLines().reduce((sum, lines) => sum + centsOf(lines.find(isMoney) ?? ''), 0),
    firstComing: comingLines()[0],
  };
}

describe('the card agrees with the rows, month by month', () => {
  const MONTHS = ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

  it.each(MONTHS)(
    'bills, %s: figure, counts and Coming up are the rows added up',
    async (month) => {
      await openPage('bill', DESIGN_BILLS, { month });
      const seen = adds();
      expect(seen.figure).toBe(seen.dueCents);
      expect(seen.counts).toBe(`${seen.n} bills · ${seen.p} paid · ${seen.c} coming up`);
      expect(seen.n).toBe(seen.p + seen.c);
      expect(seen.comingCents).toBe(
        rowsOfDue()
          .filter((row) => row.status !== 'Paid')
          .reduce((sum, row) => sum + row.cents, 0),
      );
      expect(seen.next).toBe(
        seen.firstComing
          ? `Next: ${seen.firstComing[0]} · ${seen.firstComing[1].split(' · ')[0]}`
          : undefined,
      );
    },
  );

  it.each(MONTHS)(
    'subscriptions, %s: figure, counts and Coming up are the rows added up',
    async (month) => {
      await openPage('subscription', DESIGN_SUBSCRIPTIONS, { month });
      const seen = adds();
      expect(seen.figure).toBe(seen.dueCents);
      expect(seen.counts).toBe(`${seen.n} subscriptions · ${seen.p} paid · ${seen.c} coming up`);
      expect(seen.next).toBe(
        seen.firstComing
          ? `Next: ${seen.firstComing[0]} · ${seen.firstComing[1].split(' · ')[0]}`
          : undefined,
      );
    },
  );

  function rowsOfDue() {
    return planRowIds('all-plans')
      .map((id) => {
        const lines = linesIn(planRow(id));
        return { cents: centsOf(lines.find(isMoney) ?? '$0.00'), status: lines[lines.length - 1] };
      })
      .filter((row) => !/\d{4}$/.test(row.status));
  }

  it('adds subscriptions in cents: 15.99 + 10.00 + 12.99 is $38.98, not 38.980000000000004', async () => {
    await openPage('subscription', DESIGN_SUBSCRIPTIONS);
    expect(card()[1]).toBe('$38.98');
    expect(adds().dueCents).toBe(3898);
  });
});

// ---------------------------------------------------------------------------------------------
// A plan with no card.

describe('a plan with no card', () => {
  it('says "Card not set" in Coming up, and offers "Add a card" under All bills', async () => {
    // November: every bill is still to come, Nationwide among them with no card.
    await openPage('bill', DESIGN_BILLS, { month: '2026-11' });

    const nationwide = within(screen.getByTestId('coming-up')).getByRole('button', {
      name: /^Nationwide, /,
    });
    expect(linesIn(nationwide)).toEqual([
      'Nationwide',
      '5 Nov · Card not set',
      '$145.00',
      'in 24 days',
    ]);
    expect(nationwide.props.accessibilityLabel).toBe(
      'Nationwide, $145.00, due 5 Nov, in 24 days, Card not set',
    );
    // Coming up only says it; adding is All bills' to offer.
    expect(within(screen.getByTestId('coming-up')).queryByText('Add a card')).toBeNull();
    expect(within(nationwide).queryByRole('button')).toBeNull();

    const row = planRow('nationwide');
    expect(linesIn(row)).toEqual([
      'Nationwide',
      'Monthly ·',
      'Add a card',
      '$145.00',
      'Next 5 Nov',
    ]);
    expect(within(screen.getByTestId('all-plans')).getAllByText('Add a card')).toHaveLength(1);
  });

  it('is its own button, 44pt to the finger, which goes to the bill’s edit form and nowhere else', async () => {
    await openPage('bill', DESIGN_BILLS);
    const link = within(planRow('nationwide')).getByRole('button', { name: 'Add a card' });
    expect(link.props.accessibilityHint).toBe('Choose how Nationwide is paid');
    expect(link.props.hitSlop).toEqual(
      expect.objectContaining({ top: expect.any(Number), bottom: expect.any(Number) }),
    );
    expect(link.props.hitSlop.top).toBeGreaterThanOrEqual(14);
    expect(link.props.hitSlop.bottom).toBeGreaterThanOrEqual(14);
    expect(classOf(within(link).getByText('Add a card'))).toContain('text-tint-ink');

    await fireEvent.press(link);
    expect(pushed()).toEqual([{ pathname: '/add-bill', params: { id: 'nationwide' } }]);
  });

  it('gives VoiceOver the same thing as a custom action on the row, and only on a row that needs it', async () => {
    await openPage('bill', DESIGN_BILLS);
    const row = planRow('nationwide');
    expect(row.props.accessibilityActions).toEqual([{ name: 'addCard', label: 'Add a card' }]);
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'addCard' } });
    expect(pushed()).toEqual([{ pathname: '/add-bill', params: { id: 'nationwide' } }]);

    for (const id of ['rent', 'aep', 'car']) {
      expect(planRow(id).props.accessibilityActions).toEqual([]);
      expect(within(planRow(id)).queryByRole('button', { name: 'Add a card' })).toBeNull();
    }
  });

  it('takes a loan to the loan’s own form, and a subscription to its own', async () => {
    const unpaid = { ...CAR_LOAN, card_id: null };
    await openPage('bill', { ...DESIGN_BILLS, bills: [RENT, NATIONWIDE, AEP, unpaid] });
    await fireEvent.press(within(planRow('car')).getByRole('button', { name: 'Add a card' }));
    expect(pushed()).toEqual([{ pathname: '/add-loan', params: { id: 'car' } }]);

    jest.clearAllMocks();
    await openPage('subscription', DESIGN_SUBSCRIPTIONS);
    await fireEvent.press(within(planRow('netflix')).getByRole('button', { name: 'Add a card' }));
    expect(pushed()).toEqual([{ pathname: '/add-subscription', params: { id: 'netflix' } }]);
  });

  it('reads a card that cannot be named as no card, in Coming up and in the row', async () => {
    const gone = bill('gym', {
      name: 'Gym',
      amount: 40,
      next_due_on: '2026-10-20',
      starts_on: '2026-10-20',
      card_id: 'card-deleted',
    });
    await openPage('bill', { bills: [gone] });
    expect(comingLines()).toEqual([['Gym', '20 Oct · Card not set', '$40.00', 'in 8 days']]);
    expect(linesIn(planRow('gym'))).toEqual([
      'Gym',
      'Monthly ·',
      'Add a card',
      '$40.00',
      'Next 20 Oct',
    ]);
  });
});

// ---------------------------------------------------------------------------------------------
// Rows open detail pages.

describe('tapping a row', () => {
  it('opens its detail page, a loan its loan page, never an add form', async () => {
    await openPage('bill', DESIGN_BILLS);
    const rows = [
      ...planRowIds('all-plans').map(planRow),
      ...within(screen.getByTestId('coming-up'))
        .getAllByRole('button')
        .filter((node) => String(node.props.testID).startsWith('coming-row-')),
    ];
    expect(rows).toHaveLength(6);
    for (const row of rows) await fireEvent.press(row);

    expect(pushed()).toEqual([
      { pathname: '/bill/[id]', params: { id: 'rent' } },
      { pathname: '/bill/[id]', params: { id: 'nationwide' } },
      { pathname: '/bill/[id]', params: { id: 'aep' } },
      { pathname: '/loan/[id]', params: { id: 'car' } },
      { pathname: '/bill/[id]', params: { id: 'aep' } },
      { pathname: '/loan/[id]', params: { id: 'car' } },
    ]);
    expect(JSON.stringify(pushed())).not.toContain('/add-');
  });

  it('opens a subscription’s page from All subscriptions and from Coming up', async () => {
    await openPage('subscription', DESIGN_SUBSCRIPTIONS);
    for (const id of planRowIds('all-plans')) await fireEvent.press(planRow(id));
    await fireEvent.press(comingRows()[0]);
    expect(pushed()).toEqual([
      { pathname: '/subscription/[id]', params: { id: 'netflix' } },
      { pathname: '/subscription/[id]', params: { id: 'spotify' } },
      { pathname: '/subscription/[id]', params: { id: 'icloud' } },
      { pathname: '/subscription/[id]', params: { id: 'icloud' } },
    ]);
    expect(JSON.stringify(pushed())).not.toContain('/add-');
  });
});

// ---------------------------------------------------------------------------------------------
// Stopped, cancelled and paid off.

const GYM = bill('gym', {
  name: 'Gym',
  amount: 40,
  category_id: 'health',
  next_due_on: '2026-07-15',
  starts_on: '2026-07-15',
  ends_on: '2026-09-30',
  bank_account_id: KOMAL,
});
const PHONE = bill('phone', {
  name: 'Phone',
  amount: 80,
  category_id: 'mobile',
  next_due_on: '2026-08-05',
  starts_on: '2026-08-05',
  ends_on: '2026-10-06',
  bank_account_id: KOMAL,
});
const LAPTOP = bill('laptop', {
  name: 'Laptop loan',
  amount: 102.73,
  category_id: 'loans',
  icon_id: null,
  next_due_on: null,
  starts_on: '2025-01-01',
  ends_on: '2025-12-01',
  in_spending: true,
});
const BOAT = bill('boat', {
  name: 'Boat loan',
  amount: 210,
  category_id: 'loans',
  icon_id: 'loan-other',
  next_due_on: null,
  starts_on: '2026-01-05',
  ends_on: '2026-06-05',
  in_spending: true,
});

const STOPPED_BILLS: Data = {
  bills: [...(DESIGN_BILLS.bills ?? []), GYM, PHONE, LAPTOP, BOAT],
  charges: [
    ...(DESIGN_BILLS.charges ?? []),
    ...charges({ bill: 'gym' }, ['2026-07-15', '2026-08-15', '2026-09-15'], 'Gym', 40, {
      account: KOMAL,
    }),
    ...charges({ bill: 'phone' }, ['2026-08-05', '2026-09-05', '2026-10-05'], 'Phone', 80, {
      account: KOMAL,
    }),
  ],
};

/** A loan as the Loans read has it: a laptop paid off in 2025 and a boat stopped with money owed. */
function loan(
  billId: string,
  fields: Partial<LoanListRow>,
  ends: { next_due_on: string | null; ends_on: string | null },
): LoanListRow {
  return {
    id: `loan-${billId}`,
    bill_id: billId,
    principal: 1200,
    annual_rate: 5,
    term_months: 12,
    monthly_payment: 102.73,
    total_interest: 33.76,
    first_payment_on: '2025-01-01',
    funded_on: '2024-12-01',
    day_count_basis: 'monthly',
    statement_on: null,
    statement_principal: null,
    payment_overrides: null,
    created_at: '2024-12-01T10:00:00Z',
    billEnded: true,
    payoffs: [],
    ...fields,
    bill: {
      id: billId,
      name: billId,
      icon_id: null,
      starts_on: fields.first_payment_on ?? '2025-01-01',
      ...ends,
    },
  };
}

const LOANS = [
  loan('laptop', {}, { next_due_on: null, ends_on: '2025-12-01' }),
  loan(
    'boat',
    {
      principal: 9000,
      annual_rate: 7.5,
      term_months: 60,
      monthly_payment: 210,
      first_payment_on: '2026-01-05',
      funded_on: '2025-12-05',
    },
    { next_due_on: null, ends_on: '2026-06-05' },
  ),
];

describe('stopped bills', () => {
  beforeEach(() => {
    mockLoans = { ...mockLoans, loans: LOANS };
    return openPage('bill', STOPPED_BILLS);
  });

  it('sit under All bills, newest stop first, and are never added to the running ones', async () => {
    expect(
      within(screen.getByTestId('stopped-plans')).getByRole('header', { name: 'Stopped, 4' }),
    ).toBeTruthy();
    expect(planRowIds('stopped-plans')).toEqual(['phone', 'gym', 'boat', 'laptop']);
    expect(planRowIds('all-plans')).toEqual(['rent', 'nationwide', 'aep', 'car']);
    expect(
      within(screen.getByTestId('all-plans')).getByRole('header', { name: 'All bills, 4' }),
    ).toBeTruthy();
  });

  it('say how each ended: stopped on a date, or a loan paid off', async () => {
    expect(rowsOf('stopped-plans')).toEqual([
      ['Phone', 'Stopped on 6 Oct 2026', '$80.00', 'Paid'],
      ['Gym', 'Stopped on 30 Sep 2026', '$40.00'],
      ['Boat loan', 'Stopped on 5 Jun 2026', '$210.00'],
      ['Laptop loan', 'Paid off on 1 Dec 2025', '$102.73'],
    ]);
  });

  it('count a bill stopped after this month’s charge as paid, in the figure and the counts', async () => {
    // The design's $1,884.00 and 4 · 2 paid · 2 coming up, with the phone bill's $80.00 on 5 Oct.
    expect(card()).toEqual([
      'Due in October',
      '$1,964.00',
      '5 bills · 3 paid · 2 coming up',
      'Next: AEP · 22 Oct',
    ]);
    expect(adds().dueCents).toBe(196_400);
    // The Gym, the boat and the laptop are in no total.
    expect(within(screen.getByTestId('coming-up')).queryByText('Gym')).toBeNull();
  });

  it('read to VoiceOver with how they ended, and "Paid" when this month’s charge was made', async () => {
    expect(
      planRowIds('stopped-plans').map((id) => stoppedRow(id).props.accessibilityLabel),
    ).toEqual([
      'Phone, $80.00, Monthly, Komal ••7010, Stopped on 6 Oct 2026, Paid',
      'Gym, $40.00, Monthly, Komal ••7010, Stopped on 30 Sep 2026',
      'Boat loan, $210.00, Monthly, Card not set, Stopped on 5 Jun 2026',
      'Laptop loan, $102.73, Monthly, Card not set, Paid off on 1 Dec 2025',
    ]);
  });

  it('open the plan’s page, a loan its loan page, and offer no "Add a card"', async () => {
    const section = screen.getByTestId('stopped-plans');
    expect(within(section).queryByText('Add a card')).toBeNull();
    for (const id of planRowIds('stopped-plans')) await fireEvent.press(stoppedRow(id));
    expect(pushed()).toEqual([
      { pathname: '/bill/[id]', params: { id: 'phone' } },
      { pathname: '/bill/[id]', params: { id: 'gym' } },
      { pathname: '/loan/[id]', params: { id: 'boat' } },
      { pathname: '/loan/[id]', params: { id: 'laptop' } },
    ]);
  });
});

describe('cancelled subscriptions', () => {
  const HULU = subscription('hulu', {
    name: 'Hulu',
    amount: 7.99,
    active: false,
    next_renewal_on: '2026-08-09',
    started_on: '2026-08-09',
  });
  const MAX = subscription('max', {
    name: 'Max',
    amount: 9.99,
    active: false,
    next_renewal_on: '2026-08-09',
    started_on: '2026-08-09',
  });
  const DATA: Data = {
    subscriptions: [...(DESIGN_SUBSCRIPTIONS.subscriptions ?? []), HULU, MAX],
    charges: [
      ...DESIGN_CHARGES,
      ...charges({ subscription: 'hulu' }, ['2026-08-09', '2026-09-09'], 'Hulu', 7.99),
      ...charges({ subscription: 'max' }, ['2026-08-09', '2026-09-09', '2026-10-09'], 'Max', 9.99),
    ],
  };

  beforeEach(() => openPage('subscription', DATA));

  it('sit under a Cancelled heading, last charged first, and are never to come', async () => {
    expect(
      within(screen.getByTestId('stopped-plans')).getByRole('header', { name: 'Cancelled, 2' }),
    ).toBeTruthy();
    expect(rowsOf('stopped-plans')).toEqual([
      ['Max', 'Cancelled · last charged 9 Oct 2026', '$9.99', 'Paid'],
      ['Hulu', 'Cancelled · last charged 9 Sep 2026', '$7.99'],
    ]);
    expect(comingLines()).toEqual([['iCloud+', '15 Oct · Discover ••6334', '$12.99', 'in 3 days']]);
    expect(planRowIds('all-plans')).toEqual(['netflix', 'spotify', 'icloud']);
  });

  it('count a charge made this month before it was cancelled, and nothing else', async () => {
    // $38.98 and the 9 Oct charge of Max's $9.99.
    expect(card()).toEqual([
      'Due in October',
      '$48.97',
      '4 subscriptions · 3 paid · 1 coming up',
      'Next: iCloud+ · 15 Oct',
    ]);
    expect(adds().dueCents).toBe(4897);
  });

  it('read to VoiceOver with a comma, not a dot, and open the subscription’s page', async () => {
    expect(stoppedRow('hulu').props.accessibilityLabel).toBe(
      'Hulu, $7.99, Monthly, Card not set, Cancelled, last charged 9 Sep 2026',
    );
    expect(stoppedRow('max').props.accessibilityLabel).toBe(
      'Max, $9.99, Monthly, Card not set, Cancelled, last charged 9 Oct 2026, Paid',
    );
    await fireEvent.press(stoppedRow('hulu'));
    expect(pushed()).toEqual([{ pathname: '/subscription/[id]', params: { id: 'hulu' } }]);
  });

  it('say plain Cancelled for one that never charged', async () => {
    const never = subscription('trial', { name: 'Trial', amount: 3, active: false });
    await openPage('subscription', { subscriptions: [ICLOUD, never] });
    expect(linesIn(stoppedRow('trial'))).toEqual(['Trial', 'Cancelled', '$3.00']);
  });
});

describe('a loan kept out of monthly bills', () => {
  it('is not a bill on this page: not due, not coming up, not stopped', async () => {
    const kept = bill('motorbike', {
      name: 'Motorbike loan',
      amount: 300,
      category_id: 'loans',
      next_due_on: '2026-10-20',
      starts_on: '2026-10-20',
      in_spending: false,
    });
    await openPage('bill', { ...DESIGN_BILLS, bills: [...(DESIGN_BILLS.bills ?? []), kept] });
    expect(card()[1]).toBe('$1,884.00');
    expect(card()[2]).toBe('4 bills · 2 paid · 2 coming up');
    expect(screen.queryByText('Motorbike loan')).toBeNull();
    expect(screen.queryByTestId('stopped-plans')).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// Other months and other days.

describe('a past month', () => {
  it('is all paid: no Coming up, no Next, every row ticked', async () => {
    await openPage('bill', DESIGN_BILLS, { month: '2026-09' });
    expect(card()).toEqual(['Due in September', '$1,884.00', '4 bills · 4 paid · 0 coming up']);
    expect(within(screen.getByTestId('month-chip')).getByText('Sep 2026')).toBeTruthy();
    expect(screen.queryByTestId('coming-up')).toBeNull();
    expect(screen.queryByText(/^Next: /)).toBeNull();
    expect(rowsOf('all-plans').map((lines) => lines[lines.length - 1])).toEqual([
      'Paid',
      'Paid',
      'Paid',
      'Paid',
    ]);
  });

  it('shows the bills it had: the car loan began in September, so August has three', async () => {
    await openPage('bill', DESIGN_BILLS, { month: '2026-08' });
    expect(card()).toEqual(['Due in August', '$1,330.00', '3 bills · 3 paid · 0 coming up']);
    expect(planRowIds('all-plans')).toEqual(['rent', 'nationwide', 'aep', 'car']);
    // The car loan is not due in August: its next payment, with the year.
    expect(linesIn(planRow('car')).slice(-2)).toEqual(['$554.00', 'Next 28 Oct 2026']);
  });
});

describe('a future month', () => {
  beforeEach(() => openPage('bill', DESIGN_BILLS, { month: '2026-11' }));

  it('is all to come, counted from today', async () => {
    expect(card()).toEqual([
      'Due in November',
      '$1,884.00',
      '4 bills · 0 paid · 4 coming up',
      'Next: Ashword Hill Apartments · 1 Nov',
    ]);
    expect(comingLines().map((lines) => [lines[0], lines[3]])).toEqual([
      ['Ashword Hill Apartments', 'in 20 days'],
      ['Nationwide', 'in 24 days'],
      ['AEP', 'in 41 days'],
      ['Car loan', 'in 47 days'],
    ]);
    expect(rowsOf('all-plans').map((lines) => lines[lines.length - 1])).toEqual([
      'Next 1 Nov',
      'Next 5 Nov',
      'Next 22 Nov',
      'Next 28 Nov',
    ]);
  });
});

describe('the day', () => {
  it('says Tomorrow the day before', async () => {
    mockToday = '2026-10-21';
    await openPage('bill', DESIGN_BILLS);
    expect(comingLines()[0]).toEqual(['AEP', '22 Oct · Komal ••7010', '$150.00', 'Tomorrow']);
    expect(comingLines()[1][3]).toBe('in 7 days');
  });

  it('counts a bill due today as paid, so Coming up starts tomorrow and never says Today', async () => {
    mockToday = '2026-10-22';
    await openPage('bill', DESIGN_BILLS);
    expect(card()).toEqual([
      'Due in October',
      '$1,884.00',
      '4 bills · 3 paid · 1 coming up',
      'Next: Car loan · 28 Oct',
    ]);
    expect(comingLines()).toEqual([
      ['Car loan', '28 Oct · Discover ••6334', '$554.00', 'in 6 days'],
    ]);
    expect(linesIn(planRow('aep')).slice(-1)).toEqual(['Paid']);
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('counts days on the calendar across the clock change', async () => {
    // US clocks go back on 1 Nov: 31 Oct to 2 Nov is two days, not "in 1.96 days".
    mockToday = '2026-10-31';
    await openPage('bill', DESIGN_BILLS, { month: '2026-11' });
    expect(comingLines().map((lines) => lines[3])).toEqual([
      'Tomorrow',
      'in 5 days',
      'in 22 days',
      'in 28 days',
    ]);
  });
});

describe('plans that are not like the design', () => {
  it('a weekly bill is one row with its dates summed, and one Coming up row per date to come', async () => {
    const pilates = bill('pilates', {
      name: 'Pilates',
      amount: 10,
      category_id: 'health',
      recurrence: 'weekly',
      next_due_on: '2026-10-01',
      starts_on: '2026-10-01',
      card_id: DISCOVER,
    });
    await openPage('bill', {
      bills: [pilates],
      charges: charges({ bill: 'pilates' }, ['2026-10-01', '2026-10-08'], 'Pilates', 10, {
        card: DISCOVER,
      }),
    });
    // Thursdays: 1 and 8 Oct are paid, 15, 22 and 29 Oct are to come. One bill, five payments.
    expect(card()).toEqual([
      'Due in October',
      '$50.00',
      '1 bill · 0 paid · 1 coming up',
      'Next: Pilates · 15 Oct',
    ]);
    expect(comingLines().map((lines) => [lines[1], lines[3]])).toEqual([
      ['15 Oct · Discover ••6334', 'in 3 days'],
      ['22 Oct · Discover ••6334', 'in 10 days'],
      ['29 Oct · Discover ••6334', 'in 17 days'],
    ]);
    expect(
      within(screen.getByTestId('coming-up')).getByRole('header', { name: 'Coming up, 3' }),
    ).toBeTruthy();
    expect(rowsOf('all-plans')).toEqual([
      ['Pilates', 'Weekly · Discover ••6334', '$50.00', 'Next 15 Oct'],
    ]);
  });

  it('a yearly bill not due this month is after the due ones, with its year and one payment', async () => {
    const tax = bill('tax', {
      name: 'Property tax',
      amount: 900,
      category_id: 'housing',
      recurrence: 'yearly',
      next_due_on: '2026-03-03',
      starts_on: '2026-03-03',
      bank_account_id: KOMAL,
    });
    await openPage('bill', {
      bills: [tax, ...(DESIGN_BILLS.bills ?? [])],
      charges: [
        ...(DESIGN_BILLS.charges ?? []),
        ...charges({ bill: 'tax' }, ['2026-03-03'], 'Property tax', 900, { account: KOMAL }),
      ],
    });
    expect(card()[1]).toBe('$1,884.00');
    expect(card()[2]).toBe('4 bills · 2 paid · 2 coming up');
    expect(planRowIds('all-plans')).toEqual(['rent', 'nationwide', 'aep', 'car', 'tax']);
    expect(linesIn(planRow('tax'))).toEqual([
      'Property tax',
      'Yearly · Komal ••7010',
      '$900.00',
      'Next 3 Mar 2027',
    ]);
    expect(planRow('tax').props.accessibilityLabel).toBe(
      'Property tax, $900.00, Yearly, Komal ••7010, Next 3 Mar 2027',
    );
    expect(comingLines()).toHaveLength(2);
  });

  it('an active subscription with no renewal date is listed with no status, and counted nowhere', async () => {
    const paper = subscription('paper', {
      name: 'Paper',
      amount: 5,
      card_id: DISCOVER,
      next_renewal_on: null,
    });
    await openPage('subscription', {
      ...DESIGN_SUBSCRIPTIONS,
      subscriptions: [...(DESIGN_SUBSCRIPTIONS.subscriptions ?? []), paper],
    });
    expect(card()).toEqual([
      'Due in October',
      '$38.98',
      '3 subscriptions · 2 paid · 1 coming up',
      'Next: iCloud+ · 15 Oct',
    ]);
    expect(
      within(screen.getByTestId('all-plans')).getByRole('header', { name: 'All subscriptions, 4' }),
    ).toBeTruthy();
    expect(linesIn(planRow('paper'))).toEqual(['Paper', 'Monthly · Discover ••6334', '$5.00']);
    expect(planRow('paper').props.accessibilityLabel).toBe(
      'Paper, $5.00, Monthly, Discover ••6334',
    );
    expect(comingLines()).toHaveLength(1);
  });

  it('a month with nothing due says so, with no Next and no Coming up, and still lists the plans', async () => {
    const tax = bill('tax', {
      name: 'Property tax',
      amount: 900,
      recurrence: 'yearly',
      next_due_on: '2026-03-03',
      starts_on: '2026-03-03',
      card_id: DISCOVER,
    });
    await openPage('bill', {
      bills: [tax],
      charges: charges({ bill: 'tax' }, ['2026-03-03'], 'Property tax', 900, { card: DISCOVER }),
    });
    expect(card()).toEqual(['Due in October', '$0.00', 'Nothing due in October']);
    expect(screen.queryByTestId('coming-up')).toBeNull();
    expect(linesIn(planRow('tax')).slice(-2)).toEqual(['$900.00', 'Next 3 Mar 2027']);
  });

  it('an account whose only bill has stopped is not empty: $0.00 and the Stopped section', async () => {
    await openPage('bill', { bills: [GYM], charges: STOPPED_BILLS.charges });
    expect(card()).toEqual(['Due in October', '$0.00', 'Nothing due in October']);
    expect(screen.queryByTestId('all-plans')).toBeNull();
    expect(screen.queryByText('No bills yet')).toBeNull();
    expect(rowsOf('stopped-plans')).toEqual([['Gym', 'Stopped on 30 Sep 2026', '$40.00']]);
  });
});

// ---------------------------------------------------------------------------------------------
// The page around them.

describe('the header', () => {
  const links = (): PlanMonthLinks => ({
    onSearch: jest.fn(),
    onChooseMonth: jest.fn(),
    onSeeHistory: jest.fn(),
  });

  async function drawn(kind: PlanKind, given: PlanMonthLinks) {
    const data = monthData(kind, '2026-10', kind === 'bill' ? DESIGN_BILLS : DESIGN_SUBSCRIPTIONS);
    await mount(
      <PlanMonthPage kind={kind} today={TODAY} data={data} loanEndings={new Map()} links={given} />,
    );
  }

  it('has a back button, a title, a plain white Search circle and a tinted Plus, in that order', async () => {
    await openPage('bill', DESIGN_BILLS);
    const search = screen.getByRole('button', { name: 'Search payments' });
    expect(classOf(search)).toContain('bg-card');
    expect(classOf(search)).toContain('border-line');
    expect(classOf(search)).not.toContain('bg-tint');

    const plus = screen.getByRole('button', { name: 'Add bill' });
    expect(classOf(plus)).toContain('bg-tint');
    expect(classOf(plus)).not.toContain('border');
    expect(within(search).getByTestId('icon-Search')).toBeTruthy();
    expect(within(plus).getByTestId('icon-Plus')).toBeTruthy();

    const buttons = screen.getAllByRole('button').map((node) => node.props.accessibilityLabel);
    expect(buttons.slice(0, 3)).toEqual(['Go back', 'Search payments', 'Add bill']);
  });

  it('Plus adds a bill on Monthly bills and a subscription on Subscriptions', async () => {
    await openPage('bill', DESIGN_BILLS);
    await fireEvent.press(screen.getByRole('button', { name: 'Add bill' }));
    expect(pushed()).toEqual(['/add-bill']);

    jest.clearAllMocks();
    await openPage('subscription', DESIGN_SUBSCRIPTIONS);
    await fireEvent.press(screen.getByRole('button', { name: 'Add subscription' }));
    expect(pushed()).toEqual(['/add-subscription']);
  });

  it('Search opens payment search for the kind of page it is on', async () => {
    await openPage('bill', DESIGN_BILLS);
    await fireEvent.press(screen.getByRole('button', { name: 'Search payments' }));
    expect(pushed()).toEqual([{ pathname: '/payment-search', params: { kind: 'bill' } }]);

    jest.clearAllMocks();
    await openPage('subscription', DESIGN_SUBSCRIPTIONS);
    await fireEvent.press(screen.getByRole('button', { name: 'Search payments' }));
    expect(pushed()).toEqual([{ pathname: '/payment-search', params: { kind: 'subscription' } }]);
  });

  it('"See payment history" opens the history of the kind of page it is on', async () => {
    await openPage('bill', DESIGN_BILLS);
    await fireEvent.press(screen.getByRole('button', { name: 'See payment history' }));
    expect(pushed()).toEqual([{ pathname: '/payment-history', params: { kind: 'bill' } }]);

    jest.clearAllMocks();
    await openPage('subscription', DESIGN_SUBSCRIPTIONS);
    await fireEvent.press(screen.getByRole('button', { name: 'See payment history' }));
    expect(pushed()).toEqual([{ pathname: '/payment-history', params: { kind: 'subscription' } }]);
  });

  it('hands Search, the month chip and "See payment history" to the page’s links, once each', async () => {
    const given = links();
    await drawn('bill', given);
    await fireEvent.press(screen.getByRole('button', { name: 'Search payments' }));
    await fireEvent.press(screen.getByRole('button', { name: 'See payment history' }));
    await fireEvent.press(screen.getByTestId('month-chip'));
    expect(given.onSearch).toHaveBeenCalledTimes(1);
    expect(given.onSeeHistory).toHaveBeenCalledTimes(1);
    expect(given.onChooseMonth).toHaveBeenCalledTimes(1);
  });

  it('puts the history link last, after every section', async () => {
    await openPage('bill', STOPPED_BILLS);
    const order: string[] = [];
    const walk = (node: Json | string) => {
      if (typeof node === 'string') return;
      const id = node.props.testID;
      if (
        typeof id === 'string' &&
        ['month-card', 'coming-up', 'all-plans', 'stopped-plans', 'see-history'].includes(id)
      ) {
        order.push(id);
      }
      node.children?.forEach(walk);
    };
    const tree = screen.toJSON() as Tree;
    (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(walk);
    expect(order).toEqual(['month-card', 'coming-up', 'all-plans', 'stopped-plans', 'see-history']);
  });
});

describe('the month chip', () => {
  it('opens Choose month with this page’s id and the month it shows', async () => {
    await openPage('bill', DESIGN_BILLS, { month: '2026-08' });
    await fireEvent.press(screen.getByTestId('month-chip'));
    expect(pushed()).toEqual([
      {
        pathname: '/payment-month',
        params: { kind: 'bill', owner: expect.any(String), selected: '2026-08' },
      },
    ]);
  });

  it('shows the month picked for this page, with that month’s real figures, and no other page’s', async () => {
    await openPage('bill', DESIGN_BILLS);
    await fireEvent.press(screen.getByTestId('month-chip'));
    const { owner } = (pushed()[0] as unknown as { params: { owner: string } }).params;

    await act(() => pickPayment({ owner: 'someone-else', type: 'month', month: '2026-08' }));
    expect(card()[1]).toBe('$1,884.00');
    expect(card()[0]).toBe('Due in October');

    await act(() => pickPayment({ owner, type: 'month', month: '2026-08' }));
    expect(card()).toEqual(['Due in August', '$1,330.00', '3 bills · 3 paid · 0 coming up']);
    expect(within(screen.getByTestId('month-chip')).getByText('Aug 2026')).toBeTruthy();

    await act(() => pickPayment({ owner, type: 'month', month: '2026-11' }));
    expect(card()[0]).toBe('Due in November');
    expect(card()[1]).toBe('$1,884.00');
    expect(screen.getByTestId('coming-up')).toBeTruthy();
  });

  it('opens on the month the route names, and on this month for anything else', async () => {
    for (const [asked, chip] of [
      ['2026-09', 'Sep 2026'],
      ['2026-13', 'Oct 2026'],
      ['soon', 'Oct 2026'],
    ]) {
      jest.clearAllMocks();
      await openPage('subscription', DESIGN_SUBSCRIPTIONS, { month: asked });
      expect(within(screen.getByTestId('month-chip')).getByText(chip)).toBeTruthy();
      // Choose month is told the month the page shows, never the route's own words.
      await fireEvent.press(screen.getByTestId('month-chip'));
      expect(pushed()).toEqual([
        {
          pathname: '/payment-month',
          params: {
            kind: 'subscription',
            owner: expect.any(String),
            selected: chip.startsWith('Sep') ? '2026-09' : '2026-10',
          },
        },
      ]);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Loading, failing and empty.

describe('while the month is read', () => {
  it('shows a skeleton under the header, not an empty month and not a zero', async () => {
    // The hook has no plans to give while it loads; that must not read as an empty account.
    await openPage('bill', DESIGN_BILLS, { loading: 'bills' });
    expect(screen.getByTestId('plan-month-loading')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Monthly bills' })).toBeTruthy();
    expect(screen.queryByTestId('month-card')).toBeNull();
    expect(screen.queryByText('No bills yet')).toBeNull();
    expect(screen.queryByText('$0.00')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add bill' })).toBeTruthy();
  });

  it.each<ReadName>(['bills', 'subscriptions', 'charges', 'payoffs', 'labels'])(
    'holds the page while the %s are still coming, so no amount is drawn from part of the data',
    async (name) => {
      await openPage('bill', DESIGN_BILLS, { loading: name });
      expect(screen.getByTestId('plan-month-loading')).toBeTruthy();
      expect(screen.queryByTestId('month-card')).toBeNull();
      expect(screen.queryByText('Card not set')).toBeNull();
    },
  );

  it('draws the month once it lands', async () => {
    await openPage('bill', DESIGN_BILLS, { loading: 'charges' });
    expect(screen.getByTestId('plan-month-loading')).toBeTruthy();

    await act(async () => mockChange({ loading: null }));
    expect(screen.queryByTestId('plan-month-loading')).toBeNull();
    expect(card()[1]).toBe('$1,884.00');
  });

  it('pulls to refresh with the app’s own refresh, which runs the sweep, and shows it working', async () => {
    await openPage('bill', DESIGN_BILLS);
    const scroller = scrollOf(screen.getByTestId('month-card'));
    expect(scroller?.props.refreshControl.props.refreshing).toBe(false);
    await act(async () => scroller?.props.refreshControl.props.onRefresh());
    expect(mockRefreshAll).toHaveBeenCalledTimes(1);

    mockRefreshing = true;
    await openPage('bill', DESIGN_BILLS);
    expect(scrollOf(screen.getByTestId('month-card'))?.props.refreshControl.props.refreshing).toBe(
      true,
    );
  });
});

describe('when the month cannot be read', () => {
  it('says the one failure line with Try again, and never shows a zero month', async () => {
    await openPage('bill', DESIGN_BILLS, { failed: 'charges' });
    expect(screen.getByTestId('art-error')).toBeTruthy();
    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByTestId('month-card')).toBeNull();
    expect(screen.queryByText(/\$/)).toBeNull();
    expect(screen.getByRole('header', { name: 'Monthly bills' })).toBeTruthy();
  });

  it.each<ReadName>(['bills', 'subscriptions', 'charges', 'payoffs', 'labels'])(
    'fails when the %s fail, and a missing name is never read as "Card not set"',
    async (name) => {
      await openPage('bill', DESIGN_BILLS, { failed: name });
      expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
      expect(screen.queryByText('Card not set')).toBeNull();
      expect(screen.queryByTestId('month-card')).toBeNull();
    },
  );

  it('Try again reads it again, and the month appears when the read comes right', async () => {
    await openPage('subscription', DESIGN_SUBSCRIPTIONS, { failed: 'charges' });
    const asked: ReadName[] = [];
    mockWorld = {
      ...mockWorld,
      refetched: (name) => {
        asked.push(name);
        if (name === 'charges') mockChange({ failed: null });
      },
    };
    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect([...asked].sort()).toEqual(['bills', 'charges', 'labels', 'payoffs', 'subscriptions']);
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(card()[1]).toBe('$38.98');
  });

  it('says it in Spanish and French too', async () => {
    for (const [language, line, retry] of [
      ['es', 'Algo salió mal. Inténtalo de nuevo.', 'Intentar de nuevo'],
      ['fr', 'Une erreur est survenue. Réessaie.', 'Réessayer'],
    ] as const) {
      setLanguage(language);
      await openPage('bill', DESIGN_BILLS, { failed: 'charges' });
      expect(screen.getByText(line)).toBeTruthy();
      expect(screen.getByRole('button', { name: retry })).toBeTruthy();
    }
  });
});

describe('with nothing yet', () => {
  it('invites the first bill, which opens the add form', async () => {
    await openPage('bill', {});
    expect(screen.getByTestId('art-emptyBills')).toBeTruthy();
    expect(screen.getByText('No bills yet')).toBeTruthy();
    expect(
      screen.getByText(
        'Add the ones that repeat — rent, power, phone — and Skip will keep track of what is due.',
      ),
    ).toBeTruthy();
    expect(screen.queryByTestId('month-card')).toBeNull();
    expect(screen.queryByTestId('coming-up')).toBeNull();
    expect(screen.queryByRole('button', { name: 'See payment history' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Add a bill' }));
    expect(pushed()).toEqual(['/add-bill']);
  });

  it('invites the first subscription, which opens the add form', async () => {
    await openPage('subscription', {});
    expect(screen.getByTestId('art-emptySubscriptions')).toBeTruthy();
    expect(screen.getByText('No subscriptions yet')).toBeTruthy();
    expect(
      screen.getByText(
        'Add the ones you pay for and Skip will show what they cost you each month.',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Add a subscription' }));
    expect(pushed()).toEqual(['/add-subscription']);
  });

  it('counts a loan kept out of monthly bills as no bill at all', async () => {
    const kept = bill('motorbike', {
      name: 'Motorbike loan',
      amount: 300,
      category_id: 'loans',
      next_due_on: '2026-10-20',
      starts_on: '2026-10-20',
      in_spending: false,
    });
    await openPage('bill', { bills: [kept] });
    expect(screen.getByText('No bills yet')).toBeTruthy();
    expect(screen.queryByTestId('month-card')).toBeNull();
  });

  it('keeps Search and Plus in the header, so a new account can still add from the top', async () => {
    await openPage('bill', {});
    expect(screen.getByRole('button', { name: 'Search payments' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add bill' }));
    expect(pushed()).toEqual(['/add-bill']);
  });
});

// ---------------------------------------------------------------------------------------------
// Light and dark.

/** What a line of text sits on, by the class it is drawn with. */
const SURFACES: Record<string, ('surface' | 'card' | 'tint' | 'accent')[]> = {
  'text-ink': ['surface', 'card'],
  'text-muted': ['surface', 'card'],
  'text-money-in': ['card'],
  // The status pill sits on the tint; "Add a card" sits on the card.
  'text-tint-ink': ['tint', 'card'],
  'text-on-control': ['accent'],
  'text-on-control/90': ['accent'],
};

describe.each(['light', 'dark'] as const)('in %s', (scheme) => {
  const tokens = buildTokens(scheme);

  beforeEach(() => {
    mockMode = scheme;
    mockLoans = { ...mockLoans, loans: LOANS };
    return openPage('bill', STOPPED_BILLS);
  });

  it('draws the tick, the chevron and the header glyphs in this mode’s own colours', async () => {
    expect(within(planRow('rent')).getByTestId('icon-Check').props.iconColor).toBe(tokens.moneyIn);
    expect(
      within(screen.getByTestId('see-history')).getByTestId('icon-ChevronRight').props.iconColor,
    ).toBe(tokens.muted);
    expect(
      within(screen.getByRole('button', { name: 'Search payments' })).getByTestId('icon-Search')
        .props.iconColor,
    ).toBe(tokens.ink);
    expect(
      within(screen.getByRole('button', { name: 'Add bill' })).getByTestId('icon-Plus').props
        .iconColor,
    ).toBe(tokens.tintInk);
  });

  it('keeps the plum card’s shadow for light, where a dark page would swallow it', async () => {
    expect(screen.getByTestId('month-card').props.style).toEqual(
      scheme === 'light' ? shadows.card : undefined,
    );
  });

  /** Every text colour the page draws a Text in. */
  const colourClasses = () => {
    const used = new Set<string>();
    for (const { className } of everything().texts) {
      for (const name of className.match(/\btext-(?!\[|center|left|right)[a-z-]+(?:\/\d+)?/g) ??
        []) {
        used.add(name);
      }
    }
    return used;
  };

  const onPage = {
    surface: tokens.surface,
    card: tokens.card,
    tint: tokens.tint,
    accent: tokens.accent,
  };

  const ratio = (name: string, surface: keyof typeof onPage): number => {
    const token = name.replace(/^text-/, '').replace(/\/\d+$/, '');
    const camel = token.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    const colour = tokens[camel as keyof typeof tokens];
    // The soft lines on the plum card are 90% white over it.
    const drawn = name.endsWith('/90') ? mix(tokens.accent, colour, 0.9) : colour;
    return contrast(drawn, onPage[surface]);
  };

  it('draws every kind of text in a colour that reads on what it sits on, 4.5 to 1', async () => {
    const used = colourClasses();
    // The page does use each of them, so this cannot pass on an empty set.
    expect([...used]).toEqual(expect.arrayContaining(Object.keys(SURFACES)));
    // A colour no one has checked fails here, not on someone's phone.
    expect([...used].filter((name) => !(name in SURFACES))).toEqual([]);

    for (const name of used) {
      for (const surface of SURFACES[name]) {
        expect([name, surface, ratio(name, surface) >= 4.5]).toEqual([name, surface, true]);
      }
    }
  });

  it('draws the "Add a card" link in a plum that reads on the card, 4.5 to 1', async () => {
    // The ratio of the colour the link is really drawn in, not the name of its class.
    const link = within(planRow('nationwide')).getByText('Add a card');
    const names = classOf(link).match(/\btext-(?!\[)[a-z-]+/g) ?? [];
    expect(names).toHaveLength(1);
    expect(names).toEqual(['text-tint-ink']);
    expect(ratio(String(names[0]), 'card')).toBeGreaterThanOrEqual(4.5);
  });
});

// ---------------------------------------------------------------------------------------------
// Languages.

describe('in every language', () => {
  const MONEY = {
    en: (whole: string, cents: string) => `$${whole}.${cents}`,
    es: (whole: string, cents: string) => `$${whole}.${cents}`,
    fr: (whole: string, cents: string) => `${whole},${cents}\u00A0$`,
  };

  it('English, Spanish and French each write the design’s bills page whole', async () => {
    const WORDS: Record<
      Language,
      {
        title: string;
        card: string[];
        coming: string[][];
        all: string[][];
        headers: string[];
        history: string;
        search: string;
        add: string;
      }
    > = {
      en: {
        title: 'Monthly bills',
        card: [
          'Due in October',
          '$1,884.00',
          '4 bills · 2 paid · 2 coming up',
          'Next: AEP · 22 Oct',
        ],
        coming: [
          ['AEP', '22 Oct · Komal ••7010', '$150.00', 'in 10 days'],
          ['Car loan', '28 Oct · Discover ••6334', '$554.00', 'in 16 days'],
        ],
        all: [
          ['Ashword Hill Apartments', 'Monthly · Komal ••7010', '$1,035.00', 'Paid'],
          ['Nationwide', 'Monthly ·', 'Add a card', '$145.00', 'Paid'],
          ['AEP', 'Monthly · Komal ••7010', '$150.00', 'Next 22 Oct'],
          ['Car loan', 'Monthly · Discover ••6334', '$554.00', 'Next 28 Oct'],
        ],
        headers: ['Coming up, 2', 'All bills, 4'],
        history: 'See payment history',
        search: 'Search payments',
        add: 'Add bill',
      },
      es: {
        title: 'Facturas mensuales',
        card: [
          'A pagar en octubre',
          '$1,884.00',
          '4 facturas · pagadas: 2 · por pagar: 2',
          'Próximo: AEP · 22 oct',
        ],
        coming: [
          ['AEP', '22 oct · Komal ••7010', '$150.00', 'en 10 días'],
          ['Car loan', '28 oct · Discover ••6334', '$554.00', 'en 16 días'],
        ],
        all: [
          ['Ashword Hill Apartments', 'Mensual · Komal ••7010', '$1,035.00', 'Pagado'],
          ['Nationwide', 'Mensual ·', 'Agregar una tarjeta', '$145.00', 'Pagado'],
          ['AEP', 'Mensual · Komal ••7010', '$150.00', 'Próximo: 22 oct'],
          ['Car loan', 'Mensual · Discover ••6334', '$554.00', 'Próximo: 28 oct'],
        ],
        headers: ['Próximos, 2', 'Todas las facturas, 4'],
        history: 'Ver historial de pagos',
        search: 'Buscar pagos',
        add: 'Agregar factura',
      },
      fr: {
        title: 'Factures mensuelles',
        card: [
          'À payer en octobre',
          MONEY.fr('1\u00A0884', '00'),
          '4 factures · payées\u00A0: 2 · à venir\u00A0: 2',
          'Prochain\u00A0: AEP · 22 oct.',
        ],
        coming: [
          ['AEP', '22 oct. · Komal ••7010', MONEY.fr('150', '00'), 'dans 10 jours'],
          ['Car loan', '28 oct. · Discover ••6334', MONEY.fr('554', '00'), 'dans 16 jours'],
        ],
        all: [
          [
            'Ashword Hill Apartments',
            'Chaque mois · Komal ••7010',
            MONEY.fr('1\u00A0035', '00'),
            'Payé',
          ],
          ['Nationwide', 'Chaque mois ·', 'Ajouter une carte', MONEY.fr('145', '00'), 'Payé'],
          ['AEP', 'Chaque mois · Komal ••7010', MONEY.fr('150', '00'), 'Prochain\u00A0: 22 oct.'],
          [
            'Car loan',
            'Chaque mois · Discover ••6334',
            MONEY.fr('554', '00'),
            'Prochain\u00A0: 28 oct.',
          ],
        ],
        headers: ['À venir, 2', 'Toutes les factures, 4'],
        history: 'Voir l’historique des paiements',
        search: 'Rechercher des paiements',
        add: 'Ajouter une facture',
      },
    };

    for (const language of ['en', 'es', 'fr'] as const) {
      const words = WORDS[language];
      setLanguage(language);
      await openPage('bill', DESIGN_BILLS);
      expect([language, screen.getByRole('header', { name: words.title }) !== null]).toEqual([
        language,
        true,
      ]);
      expect([language, card()]).toEqual([language, words.card]);
      expect([language, comingLines()]).toEqual([language, words.coming]);
      expect([language, rowsOf('all-plans')]).toEqual([language, words.all]);
      for (const header of words.headers) {
        expect(screen.getByRole('header', { name: header })).toBeTruthy();
      }
      expect(screen.getByRole('button', { name: words.history })).toBeTruthy();
      expect(screen.getByRole('button', { name: words.search })).toBeTruthy();
      expect(screen.getByRole('button', { name: words.add })).toBeTruthy();
    }
  });

  it('writes subscriptions and the stopped words in each language', async () => {
    const HULU = subscription('hulu', {
      name: 'Hulu',
      amount: 7.99,
      active: false,
      next_renewal_on: '2026-08-09',
      started_on: '2026-08-09',
    });
    const data: Data = {
      subscriptions: [...(DESIGN_SUBSCRIPTIONS.subscriptions ?? []), HULU],
      charges: [
        ...DESIGN_CHARGES,
        ...charges({ subscription: 'hulu' }, ['2026-08-09', '2026-09-09'], 'Hulu', 7.99),
      ],
    };
    const EXPECTED = {
      en: {
        title: 'Subscriptions',
        counts: '3 subscriptions · 2 paid · 1 coming up',
        next: 'Next: iCloud+ · 15 Oct',
        pill: 'in 3 days',
        heading: 'All subscriptions, 3',
        stopped: 'Cancelled, 1',
        hulu: ['Hulu', 'Cancelled · last charged 9 Sep 2026', '$7.99'],
        add: 'Add subscription',
      },
      es: {
        title: 'Suscripciones',
        counts: '3 suscripciones · pagadas: 2 · por pagar: 1',
        next: 'Próximo: iCloud+ · 15 oct',
        pill: 'en 3 días',
        heading: 'Todas las suscripciones, 3',
        stopped: 'Canceladas, 1',
        hulu: ['Hulu', 'Cancelada · último cargo el 9 sep 2026', '$7.99'],
        add: 'Agregar suscripción',
      },
      fr: {
        title: 'Abonnements',
        counts: '3 abonnements · payés\u00A0: 2 · à venir\u00A0: 1',
        next: 'Prochain\u00A0: iCloud+ · 15 oct.',
        pill: 'dans 3 jours',
        heading: 'Tous les abonnements, 3',
        stopped: 'Annulés, 1',
        hulu: ['Hulu', 'Annulé · dernier prélèvement le 9 sept. 2026', MONEY.fr('7', '99')],
        add: 'Ajouter un abonnement',
      },
    } as const;

    for (const language of ['en', 'es', 'fr'] as const) {
      const words = EXPECTED[language];
      setLanguage(language);
      await openPage('subscription', data);
      expect([language, screen.getByRole('header', { name: words.title }) !== null]).toEqual([
        language,
        true,
      ]);
      expect([language, card().slice(2)]).toEqual([language, [words.counts, words.next]]);
      expect([language, comingLines()[0][3]]).toEqual([language, words.pill]);
      expect(screen.getByRole('header', { name: words.heading })).toBeTruthy();
      expect(screen.getByRole('header', { name: words.stopped })).toBeTruthy();
      expect([language, linesIn(stoppedRow('hulu'))]).toEqual([language, [...words.hulu]]);
      expect(screen.getByRole('button', { name: words.add })).toBeTruthy();
    }
  });

  it.each<Language>(['en', 'es', 'fr'])(
    '%s: no raw key and no unfilled {token} anywhere, drawn or read aloud',
    async (language) => {
      setLanguage(language);
      mockLoans = { ...mockLoans, loans: LOANS };
      await openPage('bill', STOPPED_BILLS);
      const { said } = everything();
      expect(said.length).toBeGreaterThan(40);
      for (const line of said) {
        expect(line).not.toMatch(/\b(payments|bills|subscriptions|common|dates|ui)\.[a-z]/);
        expect(line).not.toMatch(/\{\w+\}/);
        expect(line).not.toMatch(/undefined|NaN|\[object/);
      }
    },
  );

  it('writes amounts the way each language does, still to the cent', async () => {
    setLanguage('fr');
    await openPage('bill', DESIGN_BILLS);
    expect(card()[1]).toBe(MONEY.fr('1\u00A0884', '00'));
    setLanguage('es');
    await openPage('subscription', DESIGN_SUBSCRIPTIONS);
    expect(card()[1]).toBe(MONEY.es('38', '98'));
  });
});

// ---------------------------------------------------------------------------------------------
// Large text.

type Host = { type: unknown; parent: Host | null; props: Record<string, any> };

/** The scroll view a node is drawn in, or null when it is pinned outside it. */
function scrollOf(node: Host | null): Host | null {
  for (let at = node; at; at = at.parent) {
    if (String(at.type) === 'RCTScrollView') return at;
  }
  return null;
}
const insideScroll = (node: Host | null) => scrollOf(node) !== null;

describe('at large text', () => {
  const layout = async (node: Parameters<typeof fireEvent>[0], width: number) =>
    fireEvent(node, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } });

  /** A name whose widest word (`word`) is wider than the room (`room`) beside the amount. */
  async function cramp(row: Parameters<typeof within>[0], room: number, word: number) {
    // The layout bubbles from the row to the group's own box.
    await layout(row, 300);
    await layout(within(row).getByTestId('fit-slot-name', hidden), room);
    await layout(within(row).getByTestId('fit-copy-name', hidden), word);
  }

  beforeEach(() => {
    const window = { width: 390, height: 844, scale: 3, fontScale: 3 };
    Dimensions.set({ window, screen: window });
  });

  it('gives every line its role’s ceiling and never cuts or shrinks one', async () => {
    mockLoans = { ...mockLoans, loans: LOANS };
    await openPage('bill', STOPPED_BILLS);
    const ceilings = new Set<number>(Object.values(TEXT_CAP));
    const { texts } = everything();
    expect(texts.length).toBeGreaterThan(40);
    for (const { line, props } of texts) {
      expect([line, ceilings.has(props.maxFontSizeMultiplier as number)]).toEqual([line, true]);
      expect([line, props.numberOfLines]).toEqual([line, undefined]);
      expect([line, props.adjustsFontSizeToFit]).toEqual([line, undefined]);
    }
  });

  it('puts a row’s amount and status under its name once a word of the name cannot sit beside them', async () => {
    await openPage('bill', DESIGN_BILLS);
    expect(linesIn(planRow('rent'))).toEqual([
      'Ashword Hill Apartments',
      'Monthly · Komal ••7010',
      '$1,035.00',
      'Paid',
    ]);

    await cramp(planRow('rent'), 90, 140);
    // Name, then the amount, then how often and from where, then where it stands: nothing lost.
    expect(linesIn(planRow('rent'))).toEqual([
      'Ashword Hill Apartments',
      '$1,035.00',
      'Monthly · Komal ••7010',
      'Paid',
    ]);
    // The row beside it, with a short name, is untouched.
    expect(linesIn(planRow('aep'))).toEqual([
      'AEP',
      'Monthly · Komal ••7010',
      '$150.00',
      'Next 22 Oct',
    ]);
  });

  it('does the same in Coming up and in Stopped', async () => {
    mockLoans = { ...mockLoans, loans: LOANS };
    await openPage('bill', STOPPED_BILLS);

    const coming = comingRows()[0];
    await cramp(coming, 40, 60);
    expect(linesIn(coming)).toEqual(['AEP', '$150.00', '22 Oct · Komal ••7010', 'in 10 days']);

    await cramp(stoppedRow('phone'), 40, 60);
    expect(linesIn(stoppedRow('phone'))).toEqual([
      'Phone',
      '$80.00',
      'Stopped on 6 Oct 2026',
      'Paid',
    ]);
  });

  it('keeps the card’s whole figure and lines, and the history link inside the scroll', async () => {
    await openPage('bill', DESIGN_BILLS);
    expect(card()).toEqual([
      'Due in October',
      '$1,884.00',
      '4 bills · 2 paid · 2 coming up',
      'Next: AEP · 22 Oct',
    ]);
    const history = screen.getByRole('button', { name: 'See payment history' });
    expect(insideScroll(history)).toBe(true);
    expect(classOf(history)).not.toMatch(/(^|\s)(absolute|h-\[[^\]]+\])(\s|$)/);
    // The back arrow and the title stay pinned above the scroll.
    expect(insideScroll(screen.getByRole('header', { name: 'Monthly bills' }))).toBe(false);
  });

  it('keeps the button of an empty page inside the scroll, where a large-text user can reach it', async () => {
    await openPage('bill', {});
    expect(insideScroll(screen.getByRole('button', { name: 'Add a bill' }))).toBe(true);
    expect(screen.getByText('No bills yet').props.maxFontSizeMultiplier).toBe(TEXT_CAP.heading);
  });
});
