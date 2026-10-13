import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import type { LoanListRow } from '@/api/loans';
import InsightsRoute from '@/app/insights';
import { InsightsScreen } from '@/components/insights/insights-screen';
import type { PeriodPickerParams } from '@/components/insights/use-insights-period';
import { MESSAGES } from '@/i18n/messages';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { pickPayment } from '@/lib/payment-pick';

/**
 * Insights v2, drawn from fakes of the reads only: every figure goes through the real helpers (the
 * spending maths, the Loans page's pricing, the habit week, the subscription cycles). The fill is
 * the Founder's design on Tuesday 13 Oct 2026.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (href: unknown) => mockPush(href),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
  useCurrentRouteInfo: () => ({ pathnameWithParams: '/insights' }),
  // Focus is the page coming back on top: once on mount, and again from `refocus()`.
  useFocusEffect: (effect: () => undefined | (() => void)) =>
    jest.requireActual('react').useEffect(() => {
      mockFocusEffects.add(effect);
      const undo = effect();
      return () => {
        mockFocusEffects.delete(effect);
        undo?.();
      };
    }, [effect]),
}));
const mockFocusEffects = new Set<() => undefined | (() => void)>();
/** The picker went back: this page is on top again. */
const refocus = () =>
  act(() => {
    for (const effect of mockFocusEffects) effect();
  });
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/components/ui/skeleton', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: () => createElement(View, { testID: 'skeleton' }),
    SkeletonList: () => null,
  };
});
const mockBrandMark = jest.fn();
jest.mock('@/components/brands/brand-mark', () => ({
  BrandMark: (props: object) => {
    mockBrandMark(props);
    return null;
  },
}));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/habits/habit-icon', () => ({ HabitIcon: () => null }));
jest.mock('@/components/savings/goal-icon', () => ({ GoalIcon: () => null }));
const mockRedirect = jest.fn();
/** Off: the gate lets the page through. On: the real gate, for someone on the free plan. */
let mockFree = false;
jest.mock('@/components/pro/pro-gate', () => ({
  useProGate: (id: string) =>
    mockFree ? jest.requireActual('@/components/pro/pro-gate').useProGate(id) : null,
}));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: false, ready: true }) }));
// The category labels import SVGs through `@/assets/*`, which jest cannot resolve.
jest.mock('@/data/bill-categories', () => ({
  LISTED_BILL_CATEGORIES: [{ id: 'housing', label: 'Housing' }],
}));
jest.mock('@/theme/home-icons', () => ({
  useHomeIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/loan-icons', () => ({
  useLoanTypeIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => {
  const colors = new Proxy({}, { get: () => '#000000' });
  return {
    useColors: () => colors,
    useTheme: () => ({ scheme: 'light', colors }),
    useMoneyColor: () => () => '#000000',
  };
});
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'owner' }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));

const TODAY = '2026-10-13';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-13', todayDate: new Date('2026-10-13T00:00:00') }),
}));

/** Every read the page asks for, by the name its fake answers to. */
const READS = [
  'ledger',
  'receipts',
  'subscriptions',
  'bills',
  'categories',
  'salary',
  'cards',
  'balances',
  'loans',
  'billMonth',
  'subscriptionMonth',
  'habits',
  'taps',
  'goals',
  'savings',
] as const;
type ReadName = (typeof READS)[number];

let mockFailing = new Set<ReadName>();
/** A reload that failed while the last answer is still held: TanStack keeps `isError` and `data`. */
let mockReloadFailed = new Set<ReadName>();
let mockLoading = new Set<ReadName>();
const mockAsked = new Set<ReadName>();
const mockRefetch = Object.fromEntries(READS.map((read) => [read, jest.fn()])) as Record<
  ReadName,
  jest.Mock
>;
const mockState = (read: ReadName) => {
  mockAsked.add(read);
  return {
    isLoading: mockLoading.has(read),
    isPending: mockLoading.has(read),
    isError: mockFailing.has(read) || mockReloadFailed.has(read),
    refetch: mockRefetch[read],
  };
};
/** A plain query: one that failed with nothing held has no data at all. */
const mockAnswer = (read: ReadName, data: unknown) => ({
  ...mockState(read),
  data: mockFailing.has(read) ? undefined : data,
});

type Entry = {
  id: string;
  label: string;
  amount: number;
  date: string;
  kind: string;
  sourceId: string;
  [field: string]: unknown;
};

let mockEntries: Entry[] = [];
let mockLedgerRanges: { from: string; to: string }[] = [];
let mockSalary: object[] = [];
let mockCards: object[] = [];
let mockBalances = new Map<string, number>();
let mockSubscriptions: object[] = [];
let mockReceipts: object[] = [];
let mockLoans: LoanListRow[] = [];
let mockPlanViews: Record<string, object> = {};
let mockHabits: object[] = [];
let mockTaps: object[] = [];
let mockGoals = { saved: 0, target: 0, active: [] as object[], done: [] as object[] };
let mockSavings = { readyToUse: 0, pots: [] as object[] };

jest.mock('@/api/brands', () => ({
  useSpendCategories: () =>
    mockAnswer('categories', [
      { id: 'groceries', label: 'Groceries', hint: null },
      { id: 'other', label: 'Other', hint: null },
    ]),
}));

jest.mock('@/api/queries', () => ({
  useLedger: (range: { from: string; to: string }) => {
    mockLedgerRanges.push(range);
    const allEntries = mockEntries.filter(
      (entry) => entry.date >= range.from && entry.date <= range.to,
    );
    return { entries: allEntries, allEntries, ...mockState('ledger') };
  },
  useReceipts: () => mockAnswer('receipts', mockReceipts),
  useSubscriptions: () => mockAnswer('subscriptions', mockSubscriptions),
  useBills: () => mockAnswer('bills', []),
  useSalarySources: () => mockAnswer('salary', mockSalary),
  useCards: () => mockAnswer('cards', mockCards),
  useSourceBalances: () => ({ balances: mockBalances, ...mockState('balances') }),
}));

jest.mock('@/api/loans', () => ({
  ...jest.requireActual('@/api/loans'),
  useLoans: () => ({ loans: mockLoans, ...mockState('loans') }),
}));

jest.mock('@/api/payment-ledger', () => ({
  usePlanMonth: (kind: string) => ({
    view: mockPlanViews[kind],
    hasPlans: true,
    labelOf: () => null,
    ...mockState(kind === 'bill' ? 'billMonth' : 'subscriptionMonth'),
  }),
}));

jest.mock('@/api/habits', () => ({
  ...jest.requireActual('@/api/habits'),
  useHabits: () => mockAnswer('habits', mockHabits),
  useHabitTaps: () => mockAnswer('taps', mockTaps),
}));

jest.mock('@/api/goals', () => ({
  useGoals: () => ({ goals: [], moves: [], summary: mockGoals, ...mockState('goals') }),
}));

jest.mock('@/api/savings', () => ({
  useSavingsCore: () => ({ pots: [], moves: [], summary: mockSavings, ...mockState('savings') }),
}));

/** Choose month and Choose year, as the route will hand it in. */
const mockPicker = jest.fn((params: PeriodPickerParams) => ({
  pathname: '/insights-period' as const,
  params,
}));
const draw = () => render(<InsightsScreen periodHref={mockPicker as never} />);

function loan(
  id: string,
  name: string,
  iconId: string,
  fields: Partial<LoanListRow>,
  bill: Partial<LoanListRow['bill']> = {},
): LoanListRow {
  return {
    id: `loan-${id}`,
    bill_id: id,
    principal: 25_000,
    annual_rate: 7.5,
    term_months: 60,
    monthly_payment: 500.95,
    total_interest: 5056.96,
    first_payment_on: '2026-10-09',
    funded_on: '2026-09-09',
    day_count_basis: 'monthly',
    statement_on: null,
    statement_principal: null,
    payment_overrides: null,
    created_at: '2026-09-09T10:00:00Z',
    billEnded: false,
    payoffs: [],
    ...fields,
    bill: {
      id,
      name,
      icon_id: iconId,
      starts_on: fields.first_payment_on ?? '2026-10-09',
      next_due_on: '2026-11-09',
      ends_on: '2031-09-09',
      ...bill,
    },
  } as LoanListRow;
}

/** The design's two loans: $35,328.93 owed, 18% paid off, $925.75 a month. */
const LOANS = [
  loan('bill-car', 'Car loan', 'loan-car', {
    principal: 18_000,
    annual_rate: 6.25,
    term_months: 48,
    monthly_payment: 424.8,
    first_payment_on: '2025-01-27',
    funded_on: null,
  }),
  loan('bill-personal', 'Personal loan', 'loan-personal', {}),
];

const spend = (id: string, label: string, amount: number, over: Partial<Entry> = {}): Entry => ({
  id,
  label,
  amount: -amount,
  date: '2026-10-02',
  kind: 'receipt',
  sourceId: 'card-sam',
  domain: null,
  ...over,
});

function planView(kind: 'bill' | 'subscription', total: number, planCount: number, rows: object[]) {
  return {
    month: '2026-10',
    when: 'current',
    total,
    planCount,
    paidCount: 0,
    comingCount: planCount,
    next: null,
    comingUp: [],
    rows: rows.map((row) => ({ kind, ...row })),
    stopped: [],
    extras: null,
  };
}

function duePlan(planId: string, name: string, date: string, amount: number, href: string) {
  return {
    planId,
    name,
    recurrence: 'monthly',
    amount,
    sourceId: '',
    categoryId: null,
    iconId: null,
    domain: null,
    logoHidden: false,
    href,
    editHref: href,
    occurrences: [
      { id: `${planId}@${date}`, planId, date, amount, sourceId: '', label: name, paid: false },
    ],
    status: { kind: 'next', date, inMonth: date.startsWith('2026-10') },
  };
}

/** The Founder's design, filled in. */
function fillThePage() {
  mockSalary = [
    { id: 'pay', name: 'Acme', amount: 10_000, frequency: 'monthly', last_payday: '2026-09-01' },
  ];
  mockEntries = [
    {
      id: 'pay@1',
      label: 'Acme',
      amount: 10_000,
      date: '2026-10-01',
      kind: 'income',
      sourceId: '',
    },
    spend('bill-rent@1', 'Housing', 1_500, {
      kind: 'bill',
      categoryId: 'housing',
      planId: 'rent',
      date: '2026-10-01',
    }),
    spend('sub-hulu@12', 'Hulu', 99.99, {
      kind: 'subscription',
      planId: 'hulu',
      date: '2026-10-12',
      domain: 'hulu.com',
    }),
  ];
  mockCards = [{ id: 'card-sam', holder: 'Sam', last4: null, color: '#905479', balance: 49.99 }];
  mockSubscriptions = [
    {
      id: 'hulu',
      name: 'Hulu',
      amount: 99.99,
      cycle: 'monthly',
      active: true,
      category_id: '',
      next_renewal_on: '2026-11-12',
    },
    {
      id: 'netflix',
      name: 'Netflix',
      amount: 15.99,
      cycle: 'monthly',
      active: true,
      category_id: 'fun',
      next_renewal_on: '2026-11-09',
    },
  ];
  mockLoans = LOANS;
  mockPlanViews = {
    bill: planView('bill', 1_500, 4, [duePlan('aep', 'AEP', '2026-10-22', 150, '/bill/aep')]),
    subscription: planView('subscription', 99.99, 3, [
      duePlan('netflix', 'Netflix', '2026-11-09', 15.99, '/subscription/netflix'),
    ]),
  };
  mockHabits = [
    {
      id: 'tim',
      name: 'Tim Hortons',
      icon_id: 'coffee',
      color: 'blue',
      price: 8,
      started_on: '2026-10-05',
      saved_from: '2026-10-08',
    },
  ];
  // Bought on the 10th; the 8th, 9th, 11th and 12th were skipped, and today saves nothing yet.
  mockTaps = [{ habitId: 'tim', day: '2026-10-10', amount: 8, receiptId: 'r-tim' }];
  mockGoals = {
    saved: 1_950,
    target: 6_000,
    active: [
      {
        id: 'g1',
        name: 'Komal birthday',
        icon_id: 'gifts',
        saved: 400,
        target: 1_000,
        percent: 40,
      },
      {
        id: 'g2',
        name: 'Emergency fund',
        icon_id: 'emergency',
        saved: 1_200,
        target: 3_000,
        percent: 40,
      },
      { id: 'g3', name: 'Trip', icon_id: 'trip', saved: 350, target: 2_000, percent: 17 },
    ],
    done: [],
  };
  mockSavings = { readyToUse: 3_200, pots: [{ id: 'sep', movedOn: '2026-10-01', amount: 500 }] };
}

beforeEach(() => {
  resetLocaleForTests();
  mockFailing = new Set();
  mockReloadFailed = new Set();
  mockFree = false;
  mockRedirect.mockClear();
  mockLoading = new Set();
  mockAsked.clear();
  mockEntries = [];
  mockLedgerRanges = [];
  mockSalary = [];
  mockCards = [];
  mockBalances = new Map();
  mockSubscriptions = [];
  mockReceipts = [];
  mockLoans = [];
  mockPlanViews = {
    bill: planView('bill', 0, 0, []),
    subscription: planView('subscription', 0, 0, []),
  };
  mockHabits = [];
  mockTaps = [];
  mockGoals = { saved: 0, target: 0, active: [], done: [] };
  mockSavings = { readyToUse: 0, pots: [] };
  mockBrandMark.mockClear();
  mockPush.mockClear();
  mockPicker.mockClear();
  for (const refetch of Object.values(mockRefetch)) refetch.mockClear();
});

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

type Node = { parent: Node | null; props: { testID?: string } };

/** A text's own box: its parent, past the slot and group boxes that large text draws around it. */
function boxOf(node: Node): Node | null {
  let box = node.parent;
  while (box && String(box.props.testID ?? '').startsWith('fit-')) box = box.parent;
  return box;
}

const section = (id: string) => within(screen.getByTestId(`insights-section-${id}`));
const headings = () => screen.getAllByRole('header').map((node) => String(node.props.children));

const SECTION_ORDER = [
  'What comes in',
  'What goes out',
  'Where it goes',
  'Where you spend most',
  'What you owe',
  'Loans',
  'Bills & subscriptions',
  'Coming up',
  'Habits',
  'Goals',
  'Savings',
];

describe('Insights — the whole page', () => {
  it('draws every section of the design, in its order, each with its muted line', async () => {
    fillThePage();
    await draw();
    expect(headings().filter((words) => SECTION_ORDER.includes(words))).toEqual(SECTION_ORDER);
    for (const [id, subtitle] of [
      ['in', 'Money you receive'],
      ['out', 'Money you spend in this period'],
      ['goes', 'Spending by category'],
      ['most', 'Places you spend the most'],
      ['owe', 'Money you owe on cards'],
      ['loans', 'Money you owe on loans'],
      ['plans', 'What you pay every month'],
      ['coming', 'Regular costs ahead'],
      ['habits', 'What you saved by skipping'],
      ['goals', 'Progress toward what you’re saving for'],
      ['savings', 'Money set aside'],
    ]) {
      expect({ id, drawn: section(id).queryByText(subtitle) !== null }).toEqual({
        id,
        drawn: true,
      });
    }
  });

  it('draws the design’s figures, each to the cent', async () => {
    fillThePage();
    await draw();

    // The plum card: this month's pay less what has gone out so far.
    const hero = within(screen.getByTestId('insights-hero'));
    expect(hero.getByText('$8,400.01')).toBeTruthy();
    expect(hero.getByText('$10,000.00 in · $1,599.99 out')).toBeTruthy();
    expect(hero.getByText('You’ve spent 16% of your income so far.')).toBeTruthy();

    const out = section('out');
    expect(out.getByText('This month')).toBeTruthy();
    expect(out.getByText('$1,599.99')).toBeTruthy();
    expect(out.getByText('Recorded in this period')).toBeTruthy();
    expect(within(screen.getByTestId('insights-kinds')).getByText('$1,500.00')).toBeTruthy();

    const goes = section('goes');
    expect(goes.getByText('Housing')).toBeTruthy();
    expect(goes.getByText('Other')).toBeTruthy();
    expect(goes.getByText('$99.99')).toBeTruthy();

    const most = section('most');
    expect(most.getByText('Hulu')).toBeTruthy();
    expect(most.getAllByText('1 time')).toHaveLength(2);

    expect(section('owe').getByText('Sam')).toBeTruthy();
    expect(section('owe').getByText('$49.99')).toBeTruthy();

    const loans = section('loans');
    expect(loans.getByText('$35,328.93')).toBeTruthy();
    expect(loans.getByText('2 loans')).toBeTruthy();
    expect(loans.getByText('18% paid off')).toBeTruthy();
    expect(loans.getByText('Car loan · next 27 Oct')).toBeTruthy();
    expect(loans.getByText('$424.80')).toBeTruthy();
    expect(loans.getByText('Personal loan · next 9 Nov')).toBeTruthy();
    expect(loans.getByText('$500.95')).toBeTruthy();
    expect(loans.getByText('Monthly payments')).toBeTruthy();
    expect(loans.getByText('$925.75')).toBeTruthy();

    const plans = section('plans');
    expect(plans.getByText('Bills · 4')).toBeTruthy();
    expect(plans.getByText('Subscriptions · 3')).toBeTruthy();
    expect(plans.getByText('Next due')).toBeTruthy();
    expect(plans.getByText('AEP · 22 Oct')).toBeTruthy();
    expect(plans.getByText('$150.00')).toBeTruthy();
    expect(plans.getByText('Netflix · 9 Nov')).toBeTruthy();
    expect(plans.getByText('$15.99')).toBeTruthy();

    const coming = section('coming');
    expect(coming.getByText('$115.98/mo')).toBeTruthy();
    expect(coming.getByText('$1,391.76 over a year')).toBeTruthy();

    const habits = section('habits');
    expect(habits.getByText('Tim Hortons')).toBeTruthy();
    expect(habits.getByText('Skipped 1 time this week')).toBeTruthy();
    expect(habits.getByText('$8.00')).toBeTruthy();
    expect(habits.getByText('Saved so far')).toBeTruthy();
    expect(habits.getByText('$32.00')).toBeTruthy();

    const goals = section('goals');
    expect(goals.getByText('Saved toward goals')).toBeTruthy();
    expect(goals.getByText('$1,950.00')).toBeTruthy();
    expect(goals.getByText('of $6,000 · 3 active')).toBeTruthy();
    expect(goals.getAllByText('40%')).toHaveLength(2);
    expect(goals.getByText('$400 of $1,000')).toBeTruthy();
    expect(goals.getByText('$1,200 of $3,000')).toBeTruthy();

    const savings = section('savings');
    expect(savings.getByText('Moved this month')).toBeTruthy();
    expect(savings.getByText('$500.00')).toBeTruthy();
    expect(savings.getByText('About 5% of this month’s income')).toBeTruthy();
    expect(savings.getByText('Total in savings')).toBeTruthy();
    expect(savings.getByText('$3,200.00')).toBeTruthy();
  });

  it('asks for every read at once, with nothing waiting on another', async () => {
    mockLoading = new Set(READS);
    await draw();
    expect([...mockAsked].sort()).toEqual([...READS].sort());
    // The current month for the plum card, and the period below it to today.
    expect(mockLedgerRanges.slice(0, 2)).toEqual([
      { from: '2026-10-01', to: '2026-10-31' },
      { from: '2026-10-01', to: TODAY },
    ]);
  });

  it('says nothing about friends or groups', async () => {
    fillThePage();
    await draw();
    const lines = shownText(screen.toJSON());
    expect(lines.filter((line) => /friend/i.test(line))).toEqual([]);
    expect(lines.filter((line) => /\bgroups?\b/i.test(line))).toEqual([]);
    expect(lines.filter((line) => /to people|shared with others|settled up/i.test(line))).toEqual(
      [],
    );
  });

  it('opens each section’s own page from See all', async () => {
    fillThePage();
    await draw();
    const SEE_ALL: [string, string][] = [
      ['in', '/salary'],
      ['out', '/transactions'],
      ['goes', '/transactions'],
      ['most', '/transactions'],
      ['owe', '/cards'],
      ['loans', '/loans'],
      ['plans', '/bills'],
      ['coming', '/subscriptions'],
      ['habits', '/habits'],
      ['goals', '/goals'],
      ['savings', '/savings'],
    ];
    for (const [id, page] of SEE_ALL) {
      mockPush.mockClear();
      await fireEvent.press(screen.getByTestId(`insights-section-${id}-see-all`));
      expect({ id, pushed: mockPush.mock.calls }).toEqual({ id, pushed: [[page]] });
    }
  });

  it('opens a loan, the plan pages and the next dues from their rows', async () => {
    fillThePage();
    await draw();
    await fireEvent.press(screen.getByRole('button', { name: 'Car loan · next 27 Oct, $424.80' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Bills · 4, $1,500.00' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Subscriptions · 3, $99.99' }));
    await fireEvent.press(screen.getByRole('button', { name: 'AEP · 22 Oct, $150.00' }));
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Subscriptions, $115.98/mo, $1,391.76 over a year',
      }),
    );
    expect(mockPush.mock.calls.map(([href]) => href)).toEqual([
      { pathname: '/loan/[id]', params: { id: 'bill-car' } },
      '/bills',
      '/subscriptions',
      '/bill/aep',
      '/subscriptions',
    ]);
  });
});

describe('Insights — nothing yet', () => {
  it('keeps Loans, Habits, Goals and Savings in view with one muted line and its action', async () => {
    mockSalary = [
      { id: 'pay', name: 'Acme', amount: 3_000, frequency: 'monthly', last_payday: '2026-09-01' },
    ];
    await draw();
    const EMPTY: [string, string, string, string][] = [
      ['loans', 'No loans yet', 'Add a loan', '/add-loan'],
      ['habits', 'No habits yet', 'Start a habit', '/habit-new'],
      ['goals', 'No goals yet', 'Add a goal', '/save-goal'],
      ['savings', 'Nothing in savings yet', 'See savings', '/savings'],
    ];
    for (const [id, line, action, page] of EMPTY) {
      mockPush.mockClear();
      const card = within(screen.getByTestId(`insights-section-${id}-empty`));
      expect(card.getByText(line)).toBeTruthy();
      await fireEvent.press(card.getByRole('button', { name: action }));
      expect({ id, pushed: mockPush.mock.calls }).toEqual({ id, pushed: [[page]] });
    }
  });

  it('leaves off the sections with nothing to show', async () => {
    mockSalary = [
      { id: 'pay', name: 'Acme', amount: 3_000, frequency: 'monthly', last_payday: '2026-09-01' },
    ];
    await draw();
    // The page drew, so the absences below are not just an empty screen.
    expect(screen.getByText('What comes in')).toBeTruthy();
    for (const id of ['goes', 'most', 'owe', 'plans', 'coming']) {
      expect({ id, drawn: screen.queryByTestId(`insights-section-${id}`) !== null }).toEqual({
        id,
        drawn: false,
      });
    }
  });
});

describe('Insights — a read that fails', () => {
  /** A section's own reads, and a figure only that section draws. */
  const OWN: [string, ReadName[], string][] = [
    ['loans', ['loans'], 'Monthly payments'],
    ['habits', ['habits', 'taps'], 'Saved so far'],
    ['goals', ['goals'], 'Saved toward goals'],
    ['savings', ['savings'], 'Total in savings'],
    ['in', ['salary'], 'Salary'],
    ['plans', ['billMonth', 'subscriptionMonth', 'bills', 'subscriptions'], 'Next due'],
  ];

  it.each(OWN)(
    'fails %s in its own card only, and Try again asks its reads again',
    async (id, reads, figure) => {
      fillThePage();
      mockFailing = new Set([reads[0]]);
      await draw();

      const card = within(screen.getByTestId(`insights-section-${id}-failed`));
      expect(card.getByText(FAILURE_MESSAGE)).toBeTruthy();
      expect(screen.getAllByText(FAILURE_MESSAGE)).toHaveLength(1);
      expect(screen.queryByText(figure)).toBeNull();
      // Everything else is still drawn.
      expect(within(screen.getByTestId('insights-hero')).getByText('$8,400.01')).toBeTruthy();
      const others = OWN.filter(([other]) => other !== id).map(([, , otherFigure]) => otherFigure);
      expect(others.filter((words) => screen.queryByText(words) === null)).toEqual([]);

      await fireEvent.press(card.getByRole('button', { name: 'Try again' }));
      expect(READS.filter((read) => mockRefetch[read].mock.calls.length > 0)).toEqual(
        READS.filter((read) => reads.includes(read)),
      );
    },
  );

  it.each(['ledger', 'receipts', 'subscriptions', 'categories'] as ReadName[])(
    'shows no spending figure at all while %s has failed, and asks every spending read again',
    async (read) => {
      fillThePage();
      mockFailing = new Set([read]);
      await draw();

      expect(screen.queryByTestId('insights-hero')).toBeNull();
      expect(screen.queryByText('$8,400.01')).toBeNull();
      expect(screen.queryByText('$1,599.99')).toBeNull();
      expect(screen.queryByTestId('insights-section-goes')).toBeNull();
      expect(screen.queryByTestId('insights-section-most')).toBeNull();
      // Its place at the top and the What goes out card each say it once.
      expect(
        within(screen.getByTestId('insights-hero-failed')).getByText(FAILURE_MESSAGE),
      ).toBeTruthy();
      expect(
        within(screen.getByTestId('insights-section-out-failed')).getByText(FAILURE_MESSAGE),
      ).toBeTruthy();
      // The period can still be changed.
      expect(screen.getByRole('button', { name: 'Show the whole year' })).toBeTruthy();

      await fireEvent.press(
        within(screen.getByTestId('insights-hero-failed')).getByRole('button', {
          name: 'Try again',
        }),
      );
      for (const spending of ['ledger', 'receipts', 'subscriptions', 'categories'] as ReadName[]) {
        expect({ spending, asked: mockRefetch[spending].mock.calls.length > 0 }).toEqual({
          spending,
          asked: true,
        });
      }
      expect(mockRefetch.loans).not.toHaveBeenCalled();
    },
  );

  it.each(['cards', 'balances'] as ReadName[])(
    'fails What you owe when %s fails, never showing a typed balance, and Try again asks both',
    async (read) => {
      fillThePage();
      mockFailing = new Set([read]);
      await draw();
      const card = within(screen.getByTestId('insights-section-owe-failed'));
      expect(card.getByText(FAILURE_MESSAGE)).toBeTruthy();
      // The typed opening balance is nowhere on the page.
      expect(screen.queryByText('$49.99')).toBeNull();
      expect(screen.getByText('Loans')).toBeTruthy();

      await fireEvent.press(card.getByRole('button', { name: 'Try again' }));
      expect(READS.filter((each) => mockRefetch[each].mock.calls.length > 0)).toEqual([
        'cards',
        'balances',
      ]);
    },
  );

  it('leaves What you owe off when the balances fail with no card to owe on', async () => {
    fillThePage();
    mockCards = [];
    mockFailing = new Set(['balances']);
    await draw();
    expect(screen.queryByTestId('insights-section-owe')).toBeNull();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });

  it('keeps every figure on screen when a reload fails with the last answer still held', async () => {
    fillThePage();
    // Every plain read; the combined ones (the ledger, the balances, the loans) decide for themselves.
    mockReloadFailed = new Set<ReadName>([
      'receipts',
      'subscriptions',
      'bills',
      'categories',
      'salary',
      'cards',
      'habits',
      'taps',
    ]);
    await draw();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    for (const figure of ['Every month · 1 source', 'Saved so far', 'Hulu', 'Sam', '$115.98/mo']) {
      expect({ figure, drawn: screen.queryAllByText(figure).length > 0 }).toEqual({
        figure,
        drawn: true,
      });
    }
  });

  it('holds each section’s room while its read is out, the figures nowhere', async () => {
    fillThePage();
    mockLoading = new Set(['loans', 'ledger']);
    await draw();
    expect(section('loans').getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText('$35,328.93')).toBeNull();
    expect(screen.queryByText('$8,400.01')).toBeNull();
    expect(section('habits').getByText('Tim Hortons')).toBeTruthy();
  });
});

describe('Insights — what you owe', () => {
  it('draws each card’s debt to the cent: the walked balance wins, the typed one stands otherwise', async () => {
    mockCards = [
      { id: 'card-a', holder: 'Chase Sapphire', last4: '1004', color: '#426EA8', balance: 1200 },
      { id: 'card-b', holder: 'Amex Gold', last4: '2002', color: '#C9A979', balance: 0.07 },
    ];
    mockBalances = new Map([['card-a', 1234.56]]);
    await draw();

    const beside = (label: string, figure: string) =>
      expect(boxOf(screen.getByText(figure) as unknown as Node)).toBe(
        boxOf(screen.getByText(label) as unknown as Node),
      );
    beside('Chase Sapphire 1004', '$1,234.56');
    beside('Amex Gold 2002', '$0.07');
    expect(screen.queryByText('$1,200.00')).toBeNull();
    // Each card wears its face colour with its holder's initial.
    const hidden = { includeHiddenElements: true };
    expect(section('owe').getByText('C', hidden)).toBeTruthy();
    expect(section('owe').getByText('A', hidden)).toBeTruthy();
  });

  it('owes nothing on a card in credit', async () => {
    mockCards = [{ id: 'card-a', holder: 'Chase', last4: null, color: '#426EA8', balance: 10 }];
    mockBalances = new Map([['card-a', -25.5]]);
    await draw();
    expect(section('owe').getByText('$0.00')).toBeTruthy();
    expect(screen.queryByText('$25.50')).toBeNull();
  });

  it('is left out while there is no card', async () => {
    await draw();
    expect(screen.getByText('What comes in')).toBeTruthy();
    expect(screen.queryByText('What you owe')).toBeNull();
    expect(screen.queryByTestId('insights-cards')).toBeNull();
  });
});

describe('Insights — where you spend most', () => {
  it('keeps letters for a store only when every row of it chose letters and none has a logo', async () => {
    mockEntries = [
      spend('n1', 'Netflix', 10, { kind: 'subscription', logoHidden: true }),
      spend('n2', 'Netflix', 10, { kind: 'subscription', logoHidden: true }),
      spend('t1', 'Target', 10, { logoHidden: true }),
      spend('t2', 'Target', 10, { logoHidden: false }),
      spend('c1', 'Calm', 10, { logoHidden: true }),
      spend('c2', 'Calm', 10, { domain: 'calm.com' }),
      // Every row chose letters, yet one carries a website: the website wins.
      spend('s1', 'Spotify', 10, { kind: 'subscription', logoHidden: true }),
      spend('s2', 'Spotify', 10, { kind: 'subscription', logoHidden: true, domain: 'spotify.com' }),
    ];
    await draw();

    const drawn = Object.fromEntries(
      mockBrandMark.mock.calls.map(([props]: [{ name: string }]) => [props.name, props]),
    );
    expect(drawn.Netflix).toMatchObject({ domain: null, hidden: true });
    expect(drawn.Target).toMatchObject({ domain: null, hidden: false });
    expect(drawn.Calm).toMatchObject({ domain: 'calm.com', hidden: false });
    expect(drawn.Spotify).toMatchObject({ domain: 'spotify.com', hidden: false });
  });

  it('puts a receipt and a subscription under their own categories, not Other', async () => {
    mockReceipts = [{ id: 'r1', category_id: 'groceries' }];
    mockSubscriptions = [
      {
        id: 'hulu',
        name: 'Hulu',
        amount: 9,
        cycle: 'monthly',
        active: true,
        category_id: 'groceries',
      },
    ];
    mockEntries = [
      spend('receipt-r1', 'Oxxo', 12.34),
      spend('sub@2', 'Hulu', 9, { kind: 'subscription', planId: 'hulu' }),
    ];
    await draw();
    expect(section('goes').getByText('Groceries')).toBeTruthy();
    expect(section('goes').getByText('$21.34')).toBeTruthy();
    expect(section('goes').queryByText('Other')).toBeNull();
  });
});

describe('Insights — at large text sizes', () => {
  const layout = async (testID: string, width: number) =>
    fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
    });

  /** Each row's label beside its figure, then the card: `wide` names the row whose word is too wide. */
  async function layOutCard(card: string, ids: string[], wide?: string) {
    for (const id of ids) {
      await layout(`fit-slot-${id}-label`, 150);
      await layout(`fit-copy-${id}-label`, id === wide ? 170 : 80);
    }
    await layout(card, 290);
  }

  type Shown = { props: { children?: unknown; [prop: string]: unknown } };
  const shownIn = (slot: string) => screen.getByTestId(slot).children[0] as unknown as Shown;
  const beside = (id: string) =>
    String(screen.getByTestId(`fit-slot-${id}-label`).parent?.props.className).includes('flex-row');

  beforeEach(() => {
    mockCards = [
      { id: 'card-a', holder: 'Chase Sapphire', last4: '1004', color: '#426EA8', balance: 1234.56 },
    ];
    mockEntries = [
      spend('e1', 'Ticketmaster Entertainment', 1234.5, { categoryId: 'fun', sourceId: 'card-a' }),
      spend('e2', 'Bakery', 6, { categoryId: 'food', sourceId: 'card-a' }),
    ];
  });

  it('prints each headline figure whole, with its cents, never shrunk on its own by iOS', async () => {
    mockSalary = [
      { id: 'pay', name: 'Acme', amount: 3456.78, frequency: 'monthly', last_payday: '2026-09-13' },
    ];
    mockEntries.push({
      id: 'pay@13',
      label: 'Acme',
      amount: 3456.78,
      date: '2026-10-13',
      kind: 'income',
      sourceId: '',
    });
    mockLoans = LOANS;
    await draw();
    for (const id of ['insights-hero-figure', 'out', 'loans-owed']) {
      // The figure drawn in its slot, ahead of the hidden copy that measures it.
      const node = shownIn(`fit-slot-${id}`);
      expect(node.props.children).toMatch(/\.\d{2}$/);
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.adjustsFontSizeToFit).toBeUndefined();
      expect(node.props.maxFontSizeMultiplier).toBe(1.2);
    }
    // 3,456.78 in, less 1,240.50 out.
    expect(shownIn('fit-slot-insights-hero-figure').props.children).toBe('$2,216.28');
    expect(shownIn('fit-slot-salary-value').props.children).toBe('$3,456.78');
  });

  it('moves every What you owe figure under its label once one label cannot fit', async () => {
    mockCards = [
      ...mockCards,
      { id: 'card-b', holder: 'Amex Gold', last4: '2002', color: '#C9A979', balance: 87.65 },
    ];
    await draw();
    await layOutCard('insights-cards', ['card-a', 'card-b']);
    expect([beside('card-a'), beside('card-b')]).toEqual([true, true]);

    await layOutCard('insights-cards', ['card-a', 'card-b'], 'card-b');
    expect([beside('card-a'), beside('card-b')]).toEqual([false, false]);
    // Still pinned to its own label, and still to the cent.
    for (const [id, figure] of [
      ['card-a', '$1,234.56'],
      ['card-b', '$87.65'],
    ]) {
      const row = screen.getByTestId(`fit-slot-${id}-label`).parent;
      expect(screen.getByTestId(`fit-slot-${id}-value`).parent).toBe(row);
      expect(shownIn(`fit-slot-${id}-value`).props.children).toBe(figure);
    }
  });

  it('wraps a long store name and moves every figure in that card under its name together', async () => {
    await draw();
    const name = screen.getByText('Ticketmaster Entertainment');
    expect(name.props.numberOfLines).toBeUndefined();
    expect(name.props.maxFontSizeMultiplier).toBe(1.4);

    await layOutCard('insights-merchants', ['merchant-0', 'merchant-1'], 'merchant-0');
    expect([beside('merchant-0'), beside('merchant-1')]).toEqual([false, false]);
    // The other cards are groups of their own and keep their layout.
    expect(beside('category-0')).toBe(true);
  });
});

describe('Insights — money in', () => {
  const schedule = {
    id: 's1',
    name: 'Acme',
    amount: 3000,
    frequency: 'monthly',
    last_payday: '2025-10-01',
  };
  const oneOff = (payday: string, amount: number) => ({
    id: `o-${payday}-${amount}`,
    name: '',
    amount,
    frequency: 'once',
    last_payday: payday,
  });

  it('counts the schedules every month and says what one-off pays added this month', async () => {
    mockSalary = [schedule, oneOff('2026-10-01', 400), oneOff('2025-10-01', 999)];
    await draw();
    const card = within(screen.getByTestId('insights-income'));
    expect(card.getByText('Salary')).toBeTruthy();
    expect(card.getByText('$3,000.00')).toBeTruthy();
    expect(card.getByText('Every month · 1 source')).toBeTruthy();
    expect(card.getByText('+ $400.00 paid once this month')).toBeTruthy();
  });

  it('shows this month’s one-off pays, summed to the cent, when there is no schedule', async () => {
    mockSalary = [
      oneOff('2026-10-01', 0.1),
      oneOff('2026-10-02', 0.2),
      oneOff('2026-10-03', 520.2),
    ];
    await draw();
    const card = within(screen.getByTestId('insights-income'));
    expect(card.getByText('$520.50')).toBeTruthy();
    expect(card.getByText('This month · 3 one-off pays')).toBeTruthy();
    expect(card.queryByText(/Every month/)).toBeNull();
  });

  it('never counts an earlier month’s one-off pay as this month’s income, and asks for pay', async () => {
    mockSalary = [oneOff('2025-10-01', 400)];
    await draw();
    expect(screen.queryByTestId('insights-income')).toBeNull();
    expect(screen.queryByText('$400.00')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Set up payday' }));
    expect(mockPush).toHaveBeenCalledWith('/salary');
  });
});

describe('Insights — the period', () => {
  it('in Year: the year so far, a bar per month, this month dark', async () => {
    fillThePage();
    mockEntries.push(spend('march', 'Bakery', 25, { date: '2026-03-14' }));
    await draw();
    await fireEvent.press(screen.getByRole('button', { name: 'Show the whole year' }));

    const out = section('out');
    expect(out.getByText('This year')).toBeTruthy();
    expect(out.getByText('$1,624.99')).toBeTruthy();
    expect(mockLedgerRanges[mockLedgerRanges.length - 1]).toEqual({
      from: '2026-01-01',
      to: TODAY,
    });
    expect(screen.getByTestId('insights-chart').props.accessibilityLabel).toContain(
      'March: $25.00',
    );
    expect(screen.getByTestId('insights-chart-bar-9').props.className).not.toContain('/30');
    expect(screen.getByTestId('insights-chart-bar-2').props.className).toContain('bg-accent/30');
    // The plum card stays on this month whatever the period.
    expect(within(screen.getByTestId('insights-hero')).getByText('$8,400.01')).toBeTruthy();
  });

  it('opens Choose month for this page, and shows the month handed back', async () => {
    fillThePage();
    mockEntries.push(spend('march', 'Bakery', 25, { date: '2026-03-14' }));
    await draw();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Showing October 2026. Choose another month' }),
    );
    expect(mockPicker).toHaveBeenCalledTimes(1);
    const [params] = mockPicker.mock.calls[0];
    expect(params).toEqual({ kind: 'month', owner: expect.any(String), selected: '2026-10' });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/insights-period', params });

    // A second tap before the picker is on top opens nothing more.
    await fireEvent.press(
      screen.getByRole('button', { name: 'Showing October 2026. Choose another month' }),
    );
    expect(mockPicker).toHaveBeenCalledTimes(1);

    await act(() => pickPayment({ owner: params.owner, type: 'month', month: '2026-03' }));
    const out = section('out');
    expect(out.getByText('March 2026')).toBeTruthy();
    expect(within(screen.getByTestId('fit-slot-out')).getByText('$25.00')).toBeTruthy();
    expect(screen.getByText('Mar 2026')).toBeTruthy();
    expect(mockLedgerRanges[mockLedgerRanges.length - 1]).toEqual({
      from: '2026-03-01',
      to: '2026-03-31',
    });
    // A pick for another page is not this one's.
    await act(() => pickPayment({ owner: 'someone-else', type: 'month', month: '2026-01' }));
    expect(out.getByText('March 2026')).toBeTruthy();
  });

  it('goes to the picked month’s year, and opens Choose year on it', async () => {
    fillThePage();
    mockEntries.push(
      spend('jun', 'Bakery', 30, { date: '2025-06-05' }),
      spend('dec', 'Bakery', 30, { date: '2025-12-05' }),
    );
    await draw();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Showing October 2026. Choose another month' }),
    );
    const [{ owner }] = mockPicker.mock.calls[0];
    await act(() => pickPayment({ owner, type: 'month', month: '2025-12' }));
    await refocus();
    await fireEvent.press(screen.getByRole('button', { name: 'Show the whole year' }));

    // On the card and on the switch.
    expect(section('out').getAllByText('2025')).toHaveLength(2);
    expect(mockLedgerRanges[mockLedgerRanges.length - 1]).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
    });
    // December, the month picked, is the dark one.
    expect(screen.getByTestId('insights-chart-bar-11').props.className).not.toContain('/30');
    expect(screen.getByTestId('insights-chart-bar-5').props.className).toContain('bg-accent/30');

    mockPicker.mockClear();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Showing 2025. Choose another year' }),
    );
    expect(mockPicker.mock.calls[0][0]).toEqual({ kind: 'year', owner, selected: '2025' });

    await act(() => pickPayment({ owner, type: 'year', year: 2026 }));
    await refocus();
    expect(section('out').getByText('This year')).toBeTruthy();
    // Back to Month: December 2025 is not in 2026, so it was let go.
    await fireEvent.press(screen.getByRole('button', { name: 'Show one month' }));
    expect(section('out').getByText('This month')).toBeTruthy();
  });
});

const NBSP = ' ';

/** No key or placeholder may reach the screen as itself. */
function expectNoRawText() {
  const lines = shownText(screen.toJSON());
  expect(lines.filter((line) => /^[a-z]+\.[a-zA-Z]+\./.test(line))).toEqual([]);
  expect(lines.filter((line) => /\{\w+\}/.test(line))).toEqual([]);
}

describe('Insights in Spanish', () => {
  it('reads every section', async () => {
    setLanguage('es');
    fillThePage();
    await draw();

    expect(within(screen.getByTestId('insights-hero')).getByText('Te queda este mes')).toBeTruthy();
    expect(screen.getByText('Llevas gastado el 16% de tus ingresos.')).toBeTruthy();
    expect(headings().filter((words) => words !== 'Análisis')).toEqual(
      expect.arrayContaining([
        'Lo que entra',
        'Lo que sale',
        'A dónde se va',
        'Dónde gastas más',
        'Lo que debes',
        'Préstamos',
        'Facturas y suscripciones',
        'Próximos',
        'Hábitos',
        'Metas',
        'Ahorros',
      ]),
    );
    expect(screen.getByText('Cada mes · 1 fuente')).toBeTruthy();
    expect(screen.getByText('Este mes')).toBeTruthy();
    expect(screen.getByText('Recibos de compras')).toBeTruthy();
    expect(screen.getByText('Vivienda')).toBeTruthy();
    expect(screen.getAllByText('1 vez')).toHaveLength(2);
    expect(screen.getByText('Lo que debes en tarjetas')).toBeTruthy();
    expect(screen.getByText('Los lugares donde más gastas')).toBeTruthy();
    expect(screen.getByText('2 préstamos')).toBeTruthy();
    expect(screen.getByText('Pagos mensuales')).toBeTruthy();
    expect(screen.getByText('Facturas · 4')).toBeTruthy();
    expect(screen.getByText('$115.98/mes')).toBeTruthy();
    expect(screen.getByText('1 día sin comprar esta semana')).toBeTruthy();
    expect(screen.getByText('de $6,000 · 3 activas')).toBeTruthy();
    expect(screen.getByText('Cerca del 5% de los ingresos de este mes')).toBeTruthy();
    expect(screen.getAllByText('Ver todo').length).toBe(11);
    expectNoRawText();
  });

  it('keeps the empty sections in view with their action', async () => {
    setLanguage('es');
    await draw();
    expect(screen.getByText('Aún no hay préstamos')).toBeTruthy();
    expect(screen.getByText('Agregar un préstamo')).toBeTruthy();
    expect(screen.getByText('Skip aún no sabe cuánto ganas')).toBeTruthy();
    expect(screen.getByText('Configurar día de pago')).toBeTruthy();
    expectNoRawText();
  });
});

describe('Insights in French', () => {
  it('reads every section, figures written the Canadian way', async () => {
    setLanguage('fr');
    fillThePage();
    await draw();

    expect(screen.getByText('Aperçu')).toBeTruthy();
    // Queries fold a no-break space into a plain one, so the figures are compared as they are.
    const left = `8${NBSP}400,01${NBSP}$`;
    expect(within(screen.getByTestId('insights-hero')).getByText(left).props.children).toBe(left);
    expect(screen.getByText('Ce qui entre')).toBeTruthy();
    expect(screen.getByText('Chaque mois · 1 source')).toBeTruthy();
    expect(screen.getByText('Ce mois-ci')).toBeTruthy();
    expect(screen.getByText('Logement')).toBeTruthy();
    expect(screen.getAllByText('1 fois')).toHaveLength(2);
    expect(screen.getByText('Ce que tu dois sur tes cartes')).toBeTruthy();
    const owed = `35${NBSP}328,93${NBSP}$`;
    expect(screen.getByText(owed).props.children).toBe(owed);
    expect(screen.getByText('18 % remboursé')).toBeTruthy();
    const perMonth = `115,98${NBSP}$/mois`;
    expect(screen.getByText(perMonth).props.children).toBe(perMonth);
    expect(screen.getByText('Économisé jusqu’ici')).toBeTruthy();
    expect(screen.getByText('sur 6 000 $ · 3 actifs')).toBeTruthy();
    expect(screen.getByText('Total de l’épargne')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: `Tout voir${NBSP}: Prêts` }).props.accessibilityLabel,
    ).toBe(`Tout voir${NBSP}: Prêts`);
    expectNoRawText();
  });

  it('says the one failure line in the section whose read failed', async () => {
    setLanguage('fr');
    fillThePage();
    mockFailing = new Set(['goals']);
    await draw();
    const card = within(screen.getByTestId('insights-section-goals-failed'));
    expect(card.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy();
    expect(card.getByText('Réessayer')).toBeTruthy();
    // The rest of the page is still there.
    expect(screen.getByText('Ce qui entre')).toBeTruthy();
    expect(screen.getByText('Ce que tu dois')).toBeTruthy();
  });
});

describe('Insights copy', () => {
  it('keeps no words for the removed Where you stand and What you keep sections', () => {
    expect(Object.keys(MESSAGES).filter((key) => /^insights\.(stand|keep)\./.test(key))).toEqual(
      [],
    );
  });
});

describe('Insights — review fixes', () => {
  it('says No active goals when every goal is reached, with Add a goal', async () => {
    fillThePage();
    mockGoals = { saved: 0, target: 0, active: [], done: [{ id: 'g0' }] };
    await draw();
    const card = within(screen.getByTestId('insights-section-goals-empty'));
    expect(card.getByText('No active goals')).toBeTruthy();
    await fireEvent.press(card.getByRole('button', { name: 'Add a goal' }));
    expect(mockPush).toHaveBeenCalledWith('/save-goal');
  });

  it('says No open loans when every loan is finished, with Add a loan', async () => {
    fillThePage();
    // Its last payment went in 2025: paid off.
    mockLoans = [
      loan('bill-old', 'Laptop loan', 'loan-other', {
        principal: 1_200,
        annual_rate: 5,
        term_months: 12,
        monthly_payment: 102.73,
        first_payment_on: '2025-01-01',
        funded_on: '2024-12-01',
      }),
    ];
    await draw();
    const card = within(screen.getByTestId('insights-section-loans-empty'));
    expect(card.getByText('No open loans')).toBeTruthy();
    await fireEvent.press(card.getByRole('button', { name: 'Add a loan' }));
    expect(mockPush).toHaveBeenCalledWith('/add-loan');
  });

  it('says no share of income when nothing moved to savings this month', async () => {
    fillThePage();
    mockSavings = { readyToUse: 3_200, pots: [{ id: 'aug', movedOn: '2026-09-01', amount: 500 }] };
    await draw();
    expect(section('savings').getByText('$0.00')).toBeTruthy();
    expect(section('savings').queryByText(/of this month’s income/)).toBeNull();
  });

  it('says less than 1%, never 0%, for a share that rounds to nothing', async () => {
    fillThePage();
    mockEntries = [
      {
        id: 'pay@1',
        label: 'Acme',
        amount: 10_000,
        date: '2026-10-01',
        kind: 'income',
        sourceId: '',
      },
      spend('coffee', 'Bakery', 10),
    ];
    mockSavings = { readyToUse: 3_200, pots: [{ id: 'add', movedOn: '2026-10-05', amount: 20 }] };
    await draw();
    expect(screen.getByText('You’ve spent less than 1% of your income so far.')).toBeTruthy();
    expect(section('savings').getByText('Less than 1% of this month’s income')).toBeTruthy();
    expect(shownText(screen.toJSON()).filter((line) => /\b0%/.test(line))).toEqual([]);
  });

  it('says less than 1% as whole sentences in Spanish and French', async () => {
    fillThePage();
    mockEntries = [
      {
        id: 'pay@1',
        label: 'Acme',
        amount: 10_000,
        date: '2026-10-01',
        kind: 'income',
        sourceId: '',
      },
      spend('coffee', 'Bakery', 10),
    ];
    mockSavings = { readyToUse: 3_200, pots: [{ id: 'add', movedOn: '2026-10-05', amount: 20 }] };
    setLanguage('es');
    await draw();
    expect(screen.getByText('Llevas gastado menos del 1% de tus ingresos.')).toBeTruthy();
    expect(screen.getByText('Menos del 1% de los ingresos de este mes')).toBeTruthy();
    await screen.unmount();

    setLanguage('fr');
    await draw();
    expect(
      screen.getByText(`Tu as dépensé moins de 1${NBSP}% de tes revenus jusqu’ici.`),
    ).toBeTruthy();
    expect(screen.getByText(`Moins de 1${NBSP}% des revenus de ce mois-ci`)).toBeTruthy();
  });

  it('forgets a picked month from another year once a year is picked', async () => {
    fillThePage();
    await draw();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Showing October 2026. Choose another month' }),
    );
    const [{ owner }] = mockPicker.mock.calls[0];
    await act(() => pickPayment({ owner, type: 'month', month: '2026-03' }));
    await refocus();
    await fireEvent.press(screen.getByRole('button', { name: 'Show the whole year' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Showing 2026. Choose another year' }),
    );
    await act(() => pickPayment({ owner, type: 'year', year: 2025 }));
    await refocus();
    await fireEvent.press(screen.getByRole('button', { name: 'Show one month' }));
    expect(section('out').getByText('This month')).toBeTruthy();
    expect(section('out').queryByText('March 2026')).toBeNull();
  });

  it('keeps a picked month that lies in the year picked', async () => {
    fillThePage();
    await draw();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Showing October 2026. Choose another month' }),
    );
    const [{ owner }] = mockPicker.mock.calls[0];
    await act(() => pickPayment({ owner, type: 'month', month: '2025-12' }));
    await refocus();
    await fireEvent.press(screen.getByRole('button', { name: 'Show the whole year' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Showing 2025. Choose another year' }),
    );
    await act(() => pickPayment({ owner, type: 'year', year: 2025 }));
    await refocus();
    await fireEvent.press(screen.getByRole('button', { name: 'Show one month' }));
    expect(section('out').getByText('December 2025')).toBeTruthy();
  });
});

describe('Insights — the routes', () => {
  it('draws the page from the real route, and opens Choose month as its own page', async () => {
    fillThePage();
    await render(<InsightsRoute />);
    expect(within(screen.getByTestId('insights-hero')).getByText('$8,400.01')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Showing October 2026. Choose another month' }),
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/insights-period',
      params: { kind: 'month', owner: expect.any(String), selected: '2026-10' },
    });
  });
});

describe('Insights — names and prompts in Spanish and French', () => {
  /** A receipt filed under Groceries, read through its own row as the ledger carries no category. */
  function groceries() {
    mockSalary = [];
    mockReceipts = [{ id: 'r1', category_id: 'groceries' }];
    mockEntries = [spend('receipt-r1', 'Oxxo', 12.34)];
  }

  it('names a spending category in Spanish', async () => {
    setLanguage('es');
    groceries();
    await draw();
    expect(section('goes').getByText('Supermercado')).toBeTruthy();
  });

  it('names a spending category in French, and asks for pay while there is none', async () => {
    setLanguage('fr');
    groceries();
    await draw();
    expect(section('goes').getByText('Épicerie')).toBeTruthy();
    expect(screen.getByText('Skip ne sait pas encore combien tu gagnes')).toBeTruthy();
    expect(screen.getByText('Configurer le jour de paie')).toBeTruthy();
    expectNoRawText();
  });
});

describe('Insights — the Pro gate', () => {
  it('sends someone on the free plan to the Insights explainer, drawing and asking for nothing', async () => {
    mockFree = true;
    fillThePage();
    await render(<InsightsRoute />);

    expect(mockRedirect).toHaveBeenCalledWith({
      pathname: '/pro-feature',
      params: { id: 'insights', next: '/insights' },
    });
    expect(screen.queryByTestId('insights-hero')).toBeNull();
    expect(screen.queryByText('$8,400.01')).toBeNull();
    expect(screen.queryByText('What comes in')).toBeNull();
    expect([...mockAsked]).toEqual([]);
  });
});
