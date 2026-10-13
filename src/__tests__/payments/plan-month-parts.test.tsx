import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { monthCardWords } from '@/components/payments/month-card';
import type { PlanMonthData } from '@/api/payment-ledger';
import {
  PlanMonthPage,
  PlanMonthScreen,
  type PlanMonthLinks,
} from '@/components/payments/plan-month-screen';
import { stoppedWords, type LoanEndingInfo } from '@/components/payments/stopped-row';
import { whenText } from '@/components/payments/coming-up-row';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import type {
  MonthOccurrence,
  MonthPlanRow,
  PlanKind,
  PlanMonth,
  StoppedPlanRow,
} from '@/lib/bill-month';
import { pickPayment } from '@/lib/payment-pick';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The Monthly bills and Subscriptions page, drawn from a month's data as the designs show October
 * 2026 on the 12th: bills $1,884.00 (4 bills, 2 paid, 2 coming up, next AEP on 22 Oct) and
 * subscriptions $38.98 (3, 2 paid, 1 coming up, next iCloud+ on 15 Oct).
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
jest.mock('@/providers/theme-provider', () => {
  const colors = { ink: '#000001', muted: '#000002', moneyIn: '#000003', onControl: '#FFFFFF' };
  return { useColors: () => colors, useTheme: () => ({ scheme: 'light', colors }) };
});
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
jest.mock('@/components/ui/skeleton', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: () => createElement(View, { testID: 'skeleton' }),
    SkeletonList: () => createElement(View, { testID: 'skeleton-list' }),
  };
});
// The marks are the rows' own components; here each says which it is and what it was given.
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

let mockToday = '2026-10-12';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));

// The app's own refresh, which runs the sweep: a pull must reach it.
const mockRefreshAll = jest.fn(() => Promise.resolve());
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: mockRefreshAll, refreshing: false }),
}));

// The month's read, as `usePlanMonth` hands it over; each test says what it returns.
const mockPlanMonth = jest.fn();
jest.mock('@/api/payment-ledger', () => ({
  usePlanMonth: (...args: unknown[]) => mockPlanMonth(...args),
}));

type LoansRead = { loans: unknown[]; isPending: boolean; isError: boolean; refetch: jest.Mock };
let mockLoans: LoansRead = { loans: [], isPending: false, isError: false, refetch: jest.fn() };
// Counted, so a page that has no use for the loans is seen never to read them.
const mockUseLoans = jest.fn();
jest.mock('@/api/loans', () => ({
  useLoans: (today: string) => mockUseLoans(today),
  loanTermsOf: (row: { terms: unknown }) => row.terms,
}));
jest.mock('@/components/loans/loan-ending', () => ({
  endingOfTerms: (terms: LoanEndingInfo) => terms,
}));

// The page's id, as the month page will be handed it.
const mockOwners: string[] = [];
jest.mock('@/lib/payment-pick', () => {
  const actual = jest.requireActual('@/lib/payment-pick');
  return {
    ...actual,
    onPaymentPicked: (owner: string, type: 'month', listener: (pick: unknown) => void) => {
      mockOwners.push(owner);
      return actual.onPaymentPicked(owner, type, listener);
    },
  };
});

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;

const hidden = { includeHiddenElements: true };
const CEILINGS = new Set<number>(Object.values(TEXT_CAP));
const classOf = (node: { props: Record<string, unknown> } | null | undefined) =>
  String(node?.props.className ?? '');

const LABELS: Record<string, string> = { komal: 'Komal ••7010', discover: 'Discover ••6334' };
const labelOf = (id: string) => LABELS[id] ?? null;

function occurrence(
  planId: string,
  date: string,
  amount: number,
  sourceId: string,
  label: string,
): MonthOccurrence {
  return {
    id: `${planId}@${date}`,
    planId,
    date,
    amount,
    sourceId,
    label,
    paid: date <= '2026-10-12',
  };
}

function plan(
  over: Partial<MonthPlanRow> & Pick<MonthPlanRow, 'planId' | 'name' | 'amount'>,
): MonthPlanRow {
  const kind = over.kind ?? 'bill';
  const loan = over.categoryId === 'loans';
  return {
    kind,
    recurrence: 'monthly',
    sourceId: '',
    categoryId: kind === 'bill' ? 'other' : 'entertainment',
    iconId: null,
    domain: null,
    logoHidden: false,
    href:
      kind === 'subscription'
        ? { pathname: '/subscription/[id]', params: { id: over.planId } }
        : { pathname: loan ? '/loan/[id]' : '/bill/[id]', params: { id: over.planId } },
    editHref: {
      pathname: kind === 'subscription' ? '/add-subscription' : loan ? '/add-loan' : '/add-bill',
      params: { id: over.planId },
    },
    occurrences: [],
    status: { kind: 'none' },
    ...over,
  };
}

const ASHWOOD_PAID = occurrence('ashwood', '2026-10-01', 1035, 'komal', 'Ashwood Hill Apartments');
const NATIONWIDE_PAID = occurrence('nationwide', '2026-10-11', 145, '', 'Nationwide');
const AEP_DUE = occurrence('aep', '2026-10-22', 150, 'komal', 'AEP');
const CAR_DUE = occurrence('car', '2026-10-28', 554, 'discover', 'Car loan');

const BILLS: PlanMonth = {
  month: '2026-10',
  when: 'current',
  total: 1884,
  planCount: 4,
  paidCount: 2,
  comingCount: 2,
  next: AEP_DUE,
  comingUp: [AEP_DUE, CAR_DUE],
  rows: [
    plan({
      planId: 'ashwood',
      name: 'Ashwood Hill Apartments',
      amount: 1035,
      sourceId: 'komal',
      categoryId: 'housing',
      occurrences: [ASHWOOD_PAID],
      status: { kind: 'paid' },
    }),
    plan({
      planId: 'nationwide',
      name: 'Nationwide',
      amount: 145,
      domain: 'nationwide.com',
      occurrences: [NATIONWIDE_PAID],
      status: { kind: 'paid' },
    }),
    plan({
      planId: 'aep',
      name: 'AEP',
      amount: 150,
      sourceId: 'komal',
      domain: 'aep.com',
      occurrences: [AEP_DUE],
      status: { kind: 'next', date: '2026-10-22', inMonth: true },
    }),
    plan({
      planId: 'car',
      name: 'Car loan',
      amount: 554,
      sourceId: 'discover',
      categoryId: 'loans',
      iconId: 'car',
      occurrences: [CAR_DUE],
      status: { kind: 'next', date: '2026-10-28', inMonth: true },
    }),
  ],
  stopped: [],
  extras: null,
};

const ICLOUD_DUE = occurrence('icloud', '2026-10-15', 12.99, 'discover', 'iCloud+');
const SUBSCRIPTIONS: PlanMonth = {
  month: '2026-10',
  when: 'current',
  total: 38.98,
  planCount: 3,
  paidCount: 2,
  comingCount: 1,
  next: ICLOUD_DUE,
  comingUp: [ICLOUD_DUE],
  rows: [
    plan({
      kind: 'subscription',
      planId: 'netflix',
      name: 'Netflix',
      amount: 15.99,
      status: { kind: 'paid' },
      occurrences: [occurrence('netflix', '2026-10-09', 15.99, '', 'Netflix')],
    }),
    plan({
      kind: 'subscription',
      planId: 'spotify',
      name: 'Spotify',
      amount: 10,
      status: { kind: 'paid' },
      occurrences: [occurrence('spotify', '2026-10-09', 10, '', 'Spotify')],
    }),
    plan({
      kind: 'subscription',
      planId: 'icloud',
      name: 'iCloud+',
      amount: 12.99,
      sourceId: 'discover',
      status: { kind: 'next', date: '2026-10-15', inMonth: true },
      occurrences: [ICLOUD_DUE],
    }),
  ],
  stopped: [],
  extras: null,
};

function stoppedRow(
  over: Partial<StoppedPlanRow> & Pick<StoppedPlanRow, 'planId' | 'name' | 'amount'>,
): StoppedPlanRow {
  const { status: _status, editHref: _editHref, ...row } = plan(over);
  return { ...row, stoppedOn: null, lastCharged: null, ...over };
}

function dataOf(view: PlanMonth, over: Partial<PlanMonthData> = {}): PlanMonthData {
  return {
    view,
    hasPlans: true,
    labelOf,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    ...over,
  };
}

const links = (): PlanMonthLinks => ({
  onSearch: jest.fn(),
  onChooseMonth: jest.fn(),
  onSeeHistory: jest.fn(),
});

function drawPage(
  kind: PlanKind,
  data: PlanMonthData,
  extra: { links?: PlanMonthLinks; loanEndings?: Map<string, LoanEndingInfo> } = {},
) {
  return render(
    <PlanMonthPage
      kind={kind}
      today={mockToday}
      data={data}
      loanEndings={extra.loanEndings ?? new Map()}
      links={extra.links ?? links()}
    />,
  );
}

const rowNamed = (testID: string) => screen.getByTestId(testID);

/** The page scroller's pull-to-refresh handler. */
function pullOf(tree: Tree): (() => void) | undefined {
  let pull: (() => void) | undefined;
  const walk = (node: Json | string) => {
    if (typeof node === 'string') return;
    const control = node.props.refreshControl as { props: { onRefresh: () => void } } | undefined;
    if (node.type === 'RCTScrollView' && control) pull = control.props.onRefresh;
    node.children?.forEach(walk);
  };
  (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return pull;
}

beforeEach(() => {
  resetLocaleForTests();
  mockToday = '2026-10-12';
  mockLoans = { loans: [], isPending: false, isError: false, refetch: jest.fn() };
  mockOwners.length = 0;
  jest.clearAllMocks();
  mockUseLoans.mockImplementation(() => mockLoans);
});

describe('the month card', () => {
  it('says what October’s bills come to, as the design does', async () => {
    await drawPage('bill', dataOf(BILLS));
    const card = screen.getByTestId('month-card-summary');
    expect(card.props.accessibilityLabel).toBe(
      'Due in October: $1,884.00. 4 bills · 2 paid · 2 coming up. Next: AEP · 22 Oct',
    );
    for (const line of [
      'Due in October',
      '$1,884.00',
      '4 bills · 2 paid · 2 coming up',
      'Next: AEP · 22 Oct',
    ]) {
      expect(within(card).getAllByText(line, hidden).length).toBeGreaterThan(0);
    }
    expect(
      screen.getByRole('button', { name: 'Showing October 2026. Choose another month' }),
    ).toBeTruthy();
    expect(within(screen.getByTestId('month-chip')).getByText('Oct 2026')).toBeTruthy();
  });

  it('says what October’s subscriptions come to', () => {
    const words = monthCardWords('subscription', SUBSCRIPTIONS);
    expect(words.amount).toBe('$38.98');
    expect(words.counts).toBe('3 subscriptions · 2 paid · 1 coming up');
    expect(words.next).toBe('Next: iCloud+ · 15 Oct');
  });

  it('says nothing is due, with no next line, in a month with nothing in it', () => {
    const words = monthCardWords('bill', {
      ...BILLS,
      month: '2026-11',
      total: 0,
      planCount: 0,
      paidCount: 0,
      comingCount: 0,
      next: null,
      comingUp: [],
    });
    expect(words.label).toBe('Due in November');
    expect(words.amount).toBe('$0.00');
    expect(words.counts).toBe('Nothing due in November');
    expect(words.next).toBeNull();
    expect(words.chip).toBe('Nov 2026');
    expect(words.spoken).toBe('Due in November: $0.00. Nothing due in November.');
  });

  it('says an extra loan payment beside the figure, never in it, and reads it in the one stop', async () => {
    const view = {
      ...BILLS,
      extras: { total: 1000, count: 1, loans: 1, name: 'Car loan', inAll: 2884 },
    };
    await drawPage('bill', dataOf(view));
    const card = screen.getByTestId('month-card-summary');
    expect(within(card).getAllByText('$1,884.00', hidden).length).toBeGreaterThan(0);
    expect(within(card).getByTestId('month-extra', hidden).props.children).toBe(
      '+ $1,000.00 extra on Car loan · $2,884.00 in all',
    );
    expect(card.props.accessibilityLabel).toBe(
      'Due in October: $1,884.00. 4 bills · 2 paid · 2 coming up. Next: AEP · 22 Oct. ' +
        '+ $1,000.00 extra on Car loan · $2,884.00 in all',
    );
  });

  it('counts the loans when the extra went on more than one', () => {
    const words = monthCardWords('bill', {
      ...BILLS,
      extras: { total: 1500, count: 3, loans: 2, name: null, inAll: 3384 },
    });
    expect(words.extra).toBe('+ $1,500.00 extra on 2 loans · $3,384.00 in all');
  });

  it('has no extra line without one, and never for subscriptions', async () => {
    expect(monthCardWords('bill', { ...BILLS, extras: null }).extra).toBeNull();
    const handed = { total: 5, count: 1, loans: 1, name: 'Odd', inAll: 43.98 };
    expect(monthCardWords('subscription', { ...SUBSCRIPTIONS, extras: handed }).extra).toBeNull();
    await drawPage('bill', dataOf({ ...BILLS, extras: null }));
    expect(screen.queryByTestId('month-extra', hidden)).toBeNull();
  });

  it('says the extra in Spanish and French', () => {
    const view = {
      ...BILLS,
      extras: { total: 1500, count: 3, loans: 2, name: null, inAll: 3384 },
    };
    setLanguage('es');
    expect(monthCardWords('bill', view).extra).toMatch(
      /^\+ .+ de pagos extra a 2 préstamos · .+ en total$/,
    );
    setLanguage('fr');
    expect(monthCardWords('bill', view).extra).toMatch(/^\+ .+ en plus sur 2 prêts · .+ au total$/);
  });

  it('opens the month picker from the chip', async () => {
    const given = links();
    await drawPage('bill', dataOf(BILLS), { links: given });
    await fireEvent.press(screen.getByTestId('month-chip'));
    expect(given.onChooseMonth).toHaveBeenCalledTimes(1);
  });
});

describe('coming up', () => {
  it('lists each date still to come, with when it is and where it is paid from', async () => {
    await drawPage('bill', dataOf(BILLS));
    const section = screen.getByTestId('coming-up');
    expect(within(section).getByRole('header', { name: 'Coming up, 2' })).toBeTruthy();

    const aep = within(section).getByTestId('coming-row-aep@2026-10-22');
    expect(aep.props.accessibilityLabel).toBe('AEP, $150.00, due 22 Oct, in 10 days, Komal ••7010');
    expect(within(aep).getByText('22 Oct · Komal ••7010')).toBeTruthy();
    expect(within(aep).getByText('in 10 days')).toBeTruthy();
    expect(within(section).getByText('in 16 days')).toBeTruthy();
    expect(within(section).getByText('28 Oct · Discover ••6334')).toBeTruthy();
  });

  it('opens the plan’s page, a loan’s its loan page', async () => {
    await drawPage('bill', dataOf(BILLS));
    await fireEvent.press(screen.getByTestId('coming-row-car@2026-10-28'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/loan/[id]', params: { id: 'car' } });
  });

  it('says "Card not set" with no link, and Tomorrow the day before', async () => {
    const due = occurrence('nationwide', '2026-10-13', 145, '', 'Nationwide');
    await drawPage('bill', dataOf({ ...BILLS, comingUp: [due], next: due }));
    const section = screen.getByTestId('coming-up');
    expect(within(section).getByText('13 Oct · Card not set')).toBeTruthy();
    expect(within(section).getByText('Tomorrow')).toBeTruthy();
    expect(within(section).queryByRole('button', { name: 'Add a card' })).toBeNull();
  });

  it('counts days on the calendar, across a clock change', () => {
    expect(whenText('2026-11-02', '2026-10-31')).toBe('in 2 days');
    expect(whenText('2026-10-26', '2026-10-24')).toBe('in 2 days');
    expect(whenText('2026-10-13', '2026-10-12')).toBe('Tomorrow');
    expect(whenText('2026-10-12', '2026-10-12')).toBe('Today');
  });

  it('is no button when no plan is behind the date, and opens a stopped plan’s page', async () => {
    const orphan = occurrence('gone', '2026-10-20', 40, '', 'Gone');
    const stopping = occurrence('gym', '2026-10-25', 30, 'komal', 'Gym');
    const gym = stoppedRow({ planId: 'gym', name: 'Gym', amount: 30, stoppedOn: '2026-10-31' });
    await drawPage('bill', dataOf({ ...BILLS, comingUp: [orphan, stopping], stopped: [gym] }));
    const lonely = screen.getByTestId('coming-row-gone@2026-10-20');
    expect(lonely.props.accessibilityRole).toBeUndefined();
    expect(lonely.props.accessibilityLabel).toBe(
      'Gone, $40.00, due 20 Oct, in 8 days, Card not set',
    );
    expect(
      within(screen.getByTestId('coming-up')).queryByRole('button', { name: /^Gone/ }),
    ).toBeNull();

    await fireEvent.press(screen.getByTestId('coming-row-gym@2026-10-25'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/bill/[id]', params: { id: 'gym' } });
  });

  it('is not there when nothing is left to come', async () => {
    await drawPage('bill', dataOf({ ...BILLS, comingUp: [], next: null }));
    expect(screen.queryByTestId('coming-up')).toBeNull();
    expect(screen.queryByText(/^Next: /)).toBeNull();
  });
});

describe('all bills', () => {
  it('lists every running bill with how often, from where and where it stands', async () => {
    await drawPage('bill', dataOf(BILLS));
    const section = screen.getByTestId('all-plans');
    expect(within(section).getByRole('header', { name: 'All bills, 4' })).toBeTruthy();
    expect(
      within(section)
        .getAllByRole('button')
        .filter((node) => String(node.props.testID).match(/^plan-row-[a-z]+$/))
        .map((node) => node.props.testID),
    ).toEqual(['plan-row-ashwood', 'plan-row-nationwide', 'plan-row-aep', 'plan-row-car']);

    const ashwood = rowNamed('plan-row-ashwood');
    expect(within(ashwood).getByText('Monthly · Komal ••7010')).toBeTruthy();
    expect(within(ashwood).getByText('$1,035.00')).toBeTruthy();
    expect(classOf(within(ashwood).getByText('Paid'))).toContain('text-money-in');
    expect(within(ashwood).getByTestId('icon-Check').props.iconColor).toBe('#000003');
    expect(ashwood.props.accessibilityLabel).toBe(
      'Ashwood Hill Apartments, $1,035.00, Monthly, Komal ••7010, Paid',
    );

    const aep = rowNamed('plan-row-aep');
    expect(within(aep).getByText('Next 22 Oct')).toBeTruthy();
    expect(within(aep).queryByTestId('paid-line')).toBeNull();
  });

  it('draws amounts in ink, never in a money colour', async () => {
    await drawPage('bill', dataOf(BILLS));
    const amount = within(rowNamed('plan-row-car')).getByText('$554.00');
    expect(classOf(amount)).toContain('text-ink');
    expect(amount.props.style).not.toEqual(expect.objectContaining({ color: expect.anything() }));
  });

  it('offers "Add a card" as its own target, and to VoiceOver as an action on the row', async () => {
    await drawPage('bill', dataOf(BILLS));
    const row = rowNamed('plan-row-nationwide');
    expect(within(row).getByText('Monthly ·')).toBeTruthy();
    expect(row.props.accessibilityLabel).toBe('Nationwide, $145.00, Monthly, Card not set, Paid');
    expect(row.props.accessibilityActions).toEqual([{ name: 'addCard', label: 'Add a card' }]);

    const link = within(row).getByRole('button', { name: 'Add a card' });
    expect(link.props.accessibilityHint).toBe('Choose how Nationwide is paid');
    expect(link.props.hitSlop).toEqual({ top: 14, bottom: 14, left: 8, right: 8 });
    expect(classOf(within(link).getByText('Add a card'))).toContain('text-tint-ink');

    await fireEvent.press(link);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/add-bill',
      params: { id: 'nationwide' },
    });

    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'addCard' } });
    expect(router.push).toHaveBeenCalledTimes(2);
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/add-bill',
      params: { id: 'nationwide' },
    });
  });

  it('sends a loan’s "Add a card" to the loan’s own form', async () => {
    const car = { ...BILLS.rows[3], sourceId: '' };
    await drawPage('bill', dataOf({ ...BILLS, rows: [car] }));
    await fireEvent.press(
      within(rowNamed('plan-row-car')).getByRole('button', { name: 'Add a card' }),
    );
    expect(router.push).toHaveBeenCalledWith({ pathname: '/add-loan', params: { id: 'car' } });
  });

  it('has no "Add a card" when the bill has a card', async () => {
    await drawPage('bill', dataOf(BILLS));
    const row = rowNamed('plan-row-aep');
    expect(row.props.accessibilityActions).toEqual([]);
    expect(within(row).queryByRole('button', { name: 'Add a card' })).toBeNull();
  });

  it('opens the bill’s page from the row', async () => {
    await drawPage('bill', dataOf(BILLS));
    await fireEvent.press(rowNamed('plan-row-ashwood'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/bill/[id]', params: { id: 'ashwood' } });
  });

  it('says when a bill not due this month is next, with its year, or when it ends', async () => {
    const yearly = plan({
      planId: 'tax',
      name: 'Property tax',
      amount: 900,
      recurrence: 'yearly',
      sourceId: 'komal',
      status: { kind: 'next', date: '2027-03-03', inMonth: false },
    });
    const ending = plan({
      planId: 'gym',
      name: 'Gym',
      amount: 40,
      sourceId: 'komal',
      status: { kind: 'ends', date: '2026-10-30' },
    });
    await drawPage('bill', dataOf({ ...BILLS, rows: [...BILLS.rows, yearly, ending] }));
    expect(within(rowNamed('plan-row-tax')).getByText('Next 3 Mar 2027')).toBeTruthy();
    expect(within(rowNamed('plan-row-tax')).getByText('Yearly · Komal ••7010')).toBeTruthy();
    expect(within(rowNamed('plan-row-gym')).getByText('Ends 30 Oct 2026')).toBeTruthy();
  });

  it('shows a subscription with no renewal date with no status word at all', async () => {
    const undated = plan({
      kind: 'subscription',
      planId: 'paper',
      name: 'Paper',
      amount: 5,
      sourceId: 'discover',
      status: { kind: 'none' },
    });
    await drawPage('subscription', dataOf({ ...SUBSCRIPTIONS, rows: [undated] }));
    const row = rowNamed('plan-row-paper');
    expect(row.props.accessibilityLabel).toBe('Paper, $5.00, Monthly, Discover ••6334');
    expect(within(row).queryByText(/Paid|Next|Ends/)).toBeNull();
  });

  it('puts the amount and status under the name once a word of the name cannot sit beside them', async () => {
    await drawPage('bill', dataOf({ ...BILLS, rows: [BILLS.rows[0]] }));
    const inNameColumn = (text: string) => {
      for (
        let at = within(rowNamed('plan-row-ashwood')).getByText(text).parent;
        at;
        at = at.parent
      ) {
        if (classOf(at).includes('min-w-0 flex-1 items-start')) return true;
      }
      return false;
    };
    expect(inNameColumn('$1,035.00')).toBe(false);

    const group = screen.getByTestId('plan-row-ashwood-words');
    const layout = async (node: ReturnType<typeof screen.getByTestId>, width: number) =>
      fireEvent(node, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } });
    await layout(group, 300);
    await layout(within(group).getByTestId('fit-slot-name', hidden), 90);
    await layout(within(group).getByTestId('fit-copy-name', hidden), 140);

    expect(inNameColumn('$1,035.00')).toBe(true);
    expect(inNameColumn('Paid')).toBe(true);
  });
});

describe('subscriptions', () => {
  it('draws the design’s three, two to add a card to, with their logos', async () => {
    await drawPage('subscription', dataOf(SUBSCRIPTIONS));
    expect(screen.getByRole('header', { name: 'Subscriptions' })).toBeTruthy();
    const section = screen.getByTestId('all-plans');
    expect(within(section).getByRole('header', { name: 'All subscriptions, 3' })).toBeTruthy();
    expect(within(section).getAllByRole('button', { name: 'Add a card' })).toHaveLength(2);
    expect(within(rowNamed('plan-row-icloud')).getByText('Next 15 Oct')).toBeTruthy();
    expect(within(screen.getByTestId('coming-up')).getByText('in 3 days')).toBeTruthy();
    expect(screen.getAllByTestId('brand-mark').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('bill-mark')).toBeNull();

    await fireEvent.press(rowNamed('plan-row-netflix'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/subscription/[id]',
      params: { id: 'netflix' },
    });
  });

  it('gives a bill its own mark, with its logo unless the owner hid it', async () => {
    const hiddenLogo = { ...BILLS.rows[2], logoHidden: true };
    await drawPage('bill', dataOf({ ...BILLS, rows: [BILLS.rows[1], hiddenLogo], comingUp: [] }));
    const marks = screen.getAllByTestId('bill-mark').map((node) => node.props.mark);
    expect(marks).toEqual([
      expect.objectContaining({ name: 'Nationwide', domain: 'nationwide.com', size: 40 }),
      expect.objectContaining({ name: 'AEP', domain: null }),
    ]);
  });
});

describe('stopped and cancelled', () => {
  it('lists a stopped bill under the rest, with when it stopped', async () => {
    const water = stoppedRow({
      planId: 'water',
      name: 'City water',
      amount: 60,
      stoppedOn: '2026-09-30',
    });
    await drawPage('bill', dataOf({ ...BILLS, stopped: [water] }));
    const section = screen.getByTestId('stopped-plans');
    expect(within(section).getByRole('header', { name: 'Stopped, 1' })).toBeTruthy();
    const row = rowNamed('stopped-row-water');
    expect(within(row).getByText('Stopped on 30 Sep 2026')).toBeTruthy();
    expect(within(row).queryByTestId('paid-line')).toBeNull();
    expect(within(row).queryByRole('button', { name: 'Add a card' })).toBeNull();
    await fireEvent.press(row);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/bill/[id]', params: { id: 'water' } });
  });

  it('shows a bill stopped after its charge this month as paid, so the counts add up', async () => {
    const charged = occurrence('phone', '2026-10-05', 80, 'komal', 'Phone');
    const phone = stoppedRow({
      planId: 'phone',
      name: 'Phone',
      amount: 80,
      sourceId: 'komal',
      stoppedOn: '2026-10-06',
      occurrences: [charged],
    });
    await drawPage('bill', dataOf({ ...BILLS, stopped: [phone] }));
    const row = rowNamed('stopped-row-phone');
    expect(within(row).getByText('$80.00')).toBeTruthy();
    expect(within(row).getByTestId('paid-line')).toBeTruthy();
    expect(within(row).getByText('Stopped on 6 Oct 2026')).toBeTruthy();
    expect(row.props.accessibilityLabel).toBe(
      'Phone, $80.00, Monthly, Komal ••7010, Stopped on 6 Oct 2026, Paid',
    );
  });

  it('says a loan paid off was paid off, the Loans page’s way, and one stopped early stopped', async () => {
    const paidOff = stoppedRow({
      planId: 'van',
      name: 'Van loan',
      amount: 320,
      categoryId: 'loans',
      stoppedOn: '2026-09-14',
    });
    const quit = stoppedRow({
      planId: 'boat',
      name: 'Boat loan',
      amount: 210,
      categoryId: 'loans',
      stoppedOn: '2026-08-01',
    });
    await drawPage('bill', dataOf({ ...BILLS, stopped: [paidOff, quit] }), {
      loanEndings: new Map<string, LoanEndingInfo>([
        ['van', { ending: 'paid', endedOn: '2026-09-14' }],
        ['boat', { ending: 'stopped', endedOn: '2026-08-01' }],
      ]),
    });
    expect(within(rowNamed('stopped-row-van')).getByText('Paid off on 14 Sep 2026')).toBeTruthy();
    expect(within(rowNamed('stopped-row-boat')).getByText('Stopped on 1 Aug 2026')).toBeTruthy();
    await fireEvent.press(rowNamed('stopped-row-van'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/loan/[id]', params: { id: 'van' } });
  });

  it('says a cancelled subscription last charged, and just Cancelled when it never was', async () => {
    const hulu = stoppedRow({
      kind: 'subscription',
      planId: 'hulu',
      name: 'Hulu',
      amount: 7.99,
      lastCharged: '2026-10-09',
    });
    const trial = stoppedRow({ kind: 'subscription', planId: 'trial', name: 'Trial', amount: 3 });
    await drawPage('subscription', dataOf({ ...SUBSCRIPTIONS, stopped: [hulu, trial] }));
    expect(
      within(screen.getByTestId('stopped-plans')).getByRole('header', { name: 'Cancelled, 2' }),
    ).toBeTruthy();
    expect(
      within(rowNamed('stopped-row-hulu')).getByText('Cancelled · last charged 9 Oct 2026'),
    ).toBeTruthy();
    expect(rowNamed('stopped-row-hulu').props.accessibilityLabel).toContain(
      'Cancelled, last charged 9 Oct 2026',
    );
    expect(within(rowNamed('stopped-row-trial')).getByText('Cancelled')).toBeTruthy();
  });

  it('writes a paid-off loan with no last date as plainly paid off', () => {
    expect(
      stoppedWords(
        { kind: 'bill', categoryId: 'loans', stoppedOn: '2026-09-01', lastCharged: null },
        { ending: 'paid', endedOn: null },
      ).shown,
    ).toBe('Paid off');
  });

  it('says a stopped loan in its own gender, as the Loans page does, and a bill in its own', () => {
    const loan = { kind: 'bill' as const, categoryId: 'loans', lastCharged: null };
    const bill = { kind: 'bill' as const, categoryId: 'energy', lastCharged: null };
    const stopped = { ending: 'stopped' as const, endedOn: '2026-10-05' };
    expect(stoppedWords({ ...loan, stoppedOn: '2026-10-05' }, stopped).shown).toBe(
      'Stopped on 5 Oct 2026',
    );
    setLanguage('es');
    expect(stoppedWords({ ...loan, stoppedOn: '2026-10-05' }, stopped).shown).toBe(
      'Detenido el 5 oct 2026',
    );
    expect(stoppedWords({ ...loan, stoppedOn: null }).shown).toBe('Detenido');
    expect(stoppedWords({ ...bill, stoppedOn: '2026-10-05' }).shown).toBe('Detenida el 5 oct 2026');
    setLanguage('fr');
    expect(stoppedWords({ ...loan, stoppedOn: '2026-10-05' }, stopped).shown).toBe(
      'Arrêté le 5 oct. 2026',
    );
    expect(stoppedWords({ ...bill, stoppedOn: null }).shown).toBe('Arrêtée');
  });

  it('is not there when nothing has stopped', async () => {
    await drawPage('bill', dataOf(BILLS));
    expect(screen.queryByTestId('stopped-plans')).toBeNull();
  });
});

describe('the page around them', () => {
  it('searches from a plain round button and adds from a tinted one', async () => {
    const given = links();
    await drawPage('bill', dataOf(BILLS), { links: given });
    const search = screen.getByRole('button', { name: 'Search payments' });
    expect(classOf(search)).toContain('bg-card');
    await fireEvent.press(search);
    expect(given.onSearch).toHaveBeenCalledTimes(1);

    const add = screen.getByRole('button', { name: 'Add bill' });
    expect(classOf(add)).toContain('bg-tint');
    await fireEvent.press(add);
    expect(router.push).toHaveBeenCalledWith('/add-bill');
  });

  it('opens the payment history from the last row', async () => {
    const given = links();
    await drawPage('subscription', dataOf(SUBSCRIPTIONS), { links: given });
    await fireEvent.press(screen.getByRole('button', { name: 'See payment history' }));
    expect(given.onSeeHistory).toHaveBeenCalledTimes(1);
  });

  it('shows the skeleton while the month is read', async () => {
    await drawPage('bill', dataOf(BILLS, { isLoading: true }));
    expect(screen.getByTestId('plan-month-loading')).toBeTruthy();
    expect(screen.queryByTestId('month-card')).toBeNull();
  });

  it('never shows a month it could not read: one failure line and Try again', async () => {
    const data = dataOf(BILLS, { isError: true, isLoading: true });
    await drawPage('bill', data);
    expect(screen.getByTestId('art-error')).toBeTruthy();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    expect(screen.queryByTestId('month-card')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(data.refetch).toHaveBeenCalledTimes(1);
  });

  it('invites the first bill, or the first subscription, on an empty account', async () => {
    await drawPage('bill', dataOf(BILLS, { hasPlans: false }));
    expect(screen.getByTestId('art-emptyBills')).toBeTruthy();
    expect(screen.getByText('No bills yet')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a bill' }));
    expect(router.push).toHaveBeenCalledWith('/add-bill');

    await drawPage('subscription', dataOf(SUBSCRIPTIONS, { hasPlans: false }));
    expect(screen.getByTestId('art-emptySubscriptions')).toBeTruthy();
    expect(screen.getByText('No subscriptions yet')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a subscription' }));
    expect(router.push).toHaveBeenLastCalledWith('/add-subscription');
  });
});

describe('the page’s month', () => {
  const byMonth = (kind: PlanKind, month: string) =>
    dataOf({ ...(kind === 'bill' ? BILLS : SUBSCRIPTIONS), month });

  beforeEach(() => mockPlanMonth.mockImplementation(byMonth));

  it('reads this month, or the one the route names', async () => {
    await render(<PlanMonthScreen kind="bill" />);
    expect(mockPlanMonth).toHaveBeenLastCalledWith('bill', '2026-10', '2026-10-12');

    await render(<PlanMonthScreen kind="subscription" month="2026-07" />);
    expect(mockPlanMonth).toHaveBeenLastCalledWith('subscription', '2026-07', '2026-10-12');

    await render(<PlanMonthScreen kind="bill" month="2026-13" />);
    expect(mockPlanMonth).toHaveBeenLastCalledWith('bill', '2026-10', '2026-10-12');
  });

  it('shows the month picked for it, and not one picked for another page', async () => {
    await render(<PlanMonthScreen kind="bill" />);
    expect(mockOwners).toHaveLength(1);

    await act(() => pickPayment({ owner: 'someone-else', type: 'month', month: '2027-01' }));
    expect(mockPlanMonth).toHaveBeenLastCalledWith('bill', '2026-10', '2026-10-12');

    await act(() => pickPayment({ owner: mockOwners[0], type: 'month', month: '2026-11' }));
    expect(mockPlanMonth).toHaveBeenLastCalledWith('bill', '2026-11', '2026-10-12');
    expect(screen.getByText('Due in November')).toBeTruthy();
  });

  it('opens Choose month from the chip with its own id and the month it shows', async () => {
    await render(<PlanMonthScreen kind="subscription" month="2026-08" />);
    await fireEvent.press(screen.getByTestId('month-chip'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/payment-month',
      params: { kind: 'subscription', owner: mockOwners[0], selected: '2026-08' },
    });
  });

  it('runs the app’s refresh, sweep and all, on a pull: not a bare re-read', async () => {
    const refetch = jest.fn();
    mockPlanMonth.mockImplementation(() => dataOf(BILLS, { refetch }));
    await render(<PlanMonthScreen kind="bill" />);
    const pull = pullOf(screen.toJSON() as Tree);
    expect(pull).toBeDefined();
    await act(async () => pull?.());
    expect(mockRefreshAll).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it('reads the loans for Monthly bills only, never for Subscriptions', async () => {
    await render(<PlanMonthScreen kind="subscription" />);
    expect(screen.getByText('$38.98')).toBeTruthy();
    expect(mockUseLoans).not.toHaveBeenCalled();
    await render(<PlanMonthScreen kind="bill" />);
    expect(mockUseLoans).toHaveBeenCalledWith('2026-10-12');
  });

  it('opens the search on the page’s own kind', async () => {
    await render(<PlanMonthScreen kind="subscription" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Search payments' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/payment-search',
      params: { kind: 'subscription' },
    });
  });

  it('opens the payment history on the page’s own kind', async () => {
    await render(<PlanMonthScreen kind="bill" />);
    await fireEvent.press(screen.getByRole('button', { name: 'See payment history' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/payment-history',
      params: { kind: 'bill' },
    });
  });

  it('holds the page for the loans read only when a stopped loan is shown, and retries both', async () => {
    const refetch = jest.fn();
    const loanStopped = stoppedRow({
      planId: 'van',
      name: 'Van loan',
      amount: 320,
      categoryId: 'loans',
    });
    mockPlanMonth.mockImplementation(() =>
      dataOf({ ...BILLS, stopped: [loanStopped] }, { refetch }),
    );
    mockLoans = { loans: [], isPending: true, isError: false, refetch: jest.fn() };
    await render(<PlanMonthScreen kind="bill" />);
    expect(screen.getByTestId('plan-month-loading')).toBeTruthy();

    mockLoans = { loans: [], isPending: false, isError: true, refetch: jest.fn() };
    await render(<PlanMonthScreen kind="bill" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(mockLoans.refetch).toHaveBeenCalledTimes(1);

    mockLoans = { loans: [], isPending: true, isError: true, refetch: jest.fn() };
    mockPlanMonth.mockImplementation(byMonth);
    await render(<PlanMonthScreen kind="bill" />);
    expect(screen.getByTestId('month-card')).toBeTruthy();
  });

  it('reads a paid-off loan from the loans the way the Loans page does', async () => {
    const loanStopped = stoppedRow({
      planId: 'van',
      name: 'Van loan',
      amount: 320,
      categoryId: 'loans',
      stoppedOn: '2026-09-14',
    });
    mockLoans = {
      loans: [{ bill: { id: 'van' }, terms: { ending: 'paid', endedOn: '2026-09-10' } }],
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    };
    mockPlanMonth.mockImplementation(() => dataOf({ ...BILLS, stopped: [loanStopped] }));
    await render(<PlanMonthScreen kind="bill" />);
    expect(within(rowNamed('stopped-row-van')).getByText('Paid off on 10 Sep 2026')).toBeTruthy();
  });
});

describe('in every language, at large text', () => {
  const STOPPED = [
    stoppedRow({ planId: 'water', name: 'City water', amount: 60, stoppedOn: '2026-09-30' }),
  ];

  it.each<Language>(['en', 'es', 'fr'])(
    '%s: each line at its role’s ceiling, never cut, never a raw key',
    async (language) => {
      setLanguage(language);
      await drawPage('bill', dataOf({ ...BILLS, stopped: STOPPED }));
      const walk = (node: Json | string, lines: string[]) => {
        if (typeof node === 'string') return;
        if (node.type === 'Text') {
          expect(CEILINGS.has(node.props.maxFontSizeMultiplier as number)).toBe(true);
          expect(node.props.numberOfLines).toBeUndefined();
          expect(node.props.adjustsFontSizeToFit).toBeUndefined();
          lines.push((node.children ?? []).filter((child) => typeof child === 'string').join(''));
        }
        node.children?.forEach((child) => walk(child, lines));
      };
      const tree = screen.toJSON() as Tree;
      const lines: string[] = [];
      (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach((node) =>
        walk(node, lines),
      );
      for (const line of lines) {
        expect(line).not.toMatch(/(payments|bills|subscriptions)\.[a-z]/);
        expect(line).not.toMatch(/\{\w+\}/);
      }
    },
  );

  it('writes the month in Spanish and French', async () => {
    setLanguage('es');
    await drawPage('bill', dataOf(BILLS));
    for (const line of [
      'A pagar en octubre',
      '4 facturas · pagadas: 2 · por pagar: 2',
      'Próximo: AEP · 22 oct',
      'Facturas mensuales',
      'Todas las facturas',
      'en 10 días',
      'Agregar una tarjeta',
      'Ver historial de pagos',
    ]) {
      expect(screen.getAllByText(line, hidden).length).toBeGreaterThan(0);
    }

    setLanguage('fr');
    await drawPage('subscription', dataOf(SUBSCRIPTIONS));
    for (const line of [
      'À payer en octobre',
      '3 abonnements · payés : 2 · à venir : 1',
      'Prochain : iCloud+ · 15 oct.',
      'Tous les abonnements',
      'dans 3 jours',
      'Ajouter une carte',
    ]) {
      expect(screen.getAllByText(line, hidden).length).toBeGreaterThan(0);
    }
  });
});
