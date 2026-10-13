import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import BillDetailScreen from '@/app/bill/[id]';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * One bill's own page: the details, its charges as one timeline (Paid on top, then Upcoming, oldest
 * first) with a Month / Year filter, and the header pencil to edit. A bill deleted from its edit
 * flow steps this page back out rather than showing an empty one.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

let mockId = 'b1';
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: mockId }),
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
}));

jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn(), warn: jest.fn() }));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479' }),
  useMoneyColor: () => () => '#000000',
}));

jest.useFakeTimers({
  now: new Date('2026-10-03T12:00:00'),
  doNotFake: ['nextTick', 'setImmediate'],
});

const mockBills = {
  data: [
    {
      id: 'b1',
      name: 'Housing',
      amount: 1030,
      category_id: 'housing',
      icon_id: null,
      recurrence: 'monthly',
      next_due_on: '2026-11-01',
      starts_on: '2026-09-01',
      card_id: null,
      bank_account_id: 'acc1',
      brands: null,
    },
  ] as unknown[] | undefined,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};

// The stopped-plan Delete reads the charges, asks, and deletes; none is reached on a running plan.
const mockLoadPast = jest.fn();
const mockChooseDelete = jest.fn();
jest.mock('@/api/past-charges', () => ({
  usePastCharges: () => ({
    ready: true,
    count: 0,
    lastChargedOn: null,
    load: () => mockLoadPast(),
    chooseDelete: (...args: unknown[]) => mockChooseDelete(...args),
    retry: jest.fn(),
  }),
}));
const mockDelete = jest.fn();
jest.mock('@/api/mutations', () => ({
  useDeleteBill: () => ({ mutateAsync: mockDelete, isPending: false }),
  useDeleteSubscription: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
const mockAsk = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => mockAsk }));

// No loan behind the bill unless a test says so: the page stays a bill page.
const NO_LOAN = { data: { kind: 'bill' } as unknown, isPending: false, isError: false };
let mockLoanRead = NO_LOAN;
jest.mock('@/api/loans', () => ({ useLoanDetail: () => mockLoanRead }));

// Every card and account by name, as usePaymentLabels gives them; null while they are still read.
// card-2 is a free account's locked extra: no picker offers it, but what it paid is named.
const mockNames: Record<string, string> = {
  acc1: 'Chase Checking ••7730',
  'card-2': 'Amex ••3005',
};
let mockNamesLoading = false;
jest.mock('@/api/payment-labels', () => ({
  usePaymentLabels: () => ({
    sources: [],
    labelOf: (id: string) => (mockNamesLoading ? null : (mockNames[id] ?? null)),
    isLoading: mockNamesLoading,
  }),
}));

const mockLedger = jest.fn();
// Charges the window holds but a free list leaves out (older than 90 days).
let mockOlder: string[] = [];
jest.mock('@/api/queries', () => ({
  useBills: () => mockBills,
  useLedger: (range: { from: string; to: string }) => {
    mockLedger(range);
    const entry = (date: string, planId = 'b1') => ({
      id: `bill-${planId}@${date}`,
      label: 'Housing',
      amount: -1030,
      date,
      kind: 'bill',
      sourceId: 'acc1',
      planId,
    });
    const listed = [
      entry('2026-09-01'),
      entry('2026-10-01'),
      entry('2026-11-01'),
      entry('2026-12-01'),
      // Another bill's charge, which must not appear on this page.
      entry('2026-10-05', 'b2'),
    ];
    return {
      entries: listed,
      allEntries: [...mockOlder.map((date) => entry(date)), ...listed],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    };
  },
}));

const HOUSING = mockBills.data![0] as Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  mockId = 'b1';
  mockLoanRead = NO_LOAN;
  mockNamesLoading = false;
  mockBills.data = [HOUSING];
});
afterAll(() => resetLocaleForTests());

it('shows the bill, then its paid and upcoming charges as one timeline', async () => {
  const screen = await render(<BillDetailScreen />);

  expect(screen.getByText('$1,030.00')).toBeTruthy();
  expect(screen.getByText('Monthly')).toBeTruthy();
  expect(screen.getByText('Chase Checking ••7730')).toBeTruthy();
  expect(screen.getByText('Upcoming')).toBeTruthy();
  // The heading, plus the caption on each of the two paid charges.
  expect(screen.getAllByText('Paid')).toHaveLength(3);

  // Paid then Upcoming, oldest first; the first two dates are the Next due and Started lines.
  const dates = screen
    .getAllByText(/^\d{1,2} (Sep|Oct|Nov|Dec) 2026$/)
    .map((node) => node.props.children);
  expect(dates).toEqual([
    '1 Nov 2026', // Next due
    '1 Sep 2026', // Started
    '1 Sep 2026',
    '1 Oct 2026',
    '1 Nov 2026',
    '1 Dec 2026',
  ]);
});

it('counts the whole year in the Paid heading when a free list stops at 90 days', async () => {
  mockOlder = ['2026-05-01'];
  const screen = await render(<BillDetailScreen />);

  // Two paid rows are listed; the heading still counts May's.
  expect(screen.getByText('3 · $3,090.00')).toBeTruthy();
  expect(screen.queryByText('May 1, 2026')).toBeNull();
  mockOlder = [];
});

it('opens the edit flow from the pencil', async () => {
  const screen = await render(<BillDetailScreen />);

  await fireEvent.press(screen.getByLabelText('Edit Housing'));

  expect(router.push).toHaveBeenCalledWith('/add-bill?id=b1');
});

it('offers Month and Year only, and reads the whole calendar month', async () => {
  const screen = await render(<BillDetailScreen />);

  expect(screen.queryByLabelText('All')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Month'));

  expect(mockLedger).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-31' });
});

it('steps back out when the bill is gone, rather than showing an empty page', async () => {
  mockId = 'deleted';

  await render(<BillDetailScreen />);

  expect(router.back).toHaveBeenCalled();
});

it('opens Change logo for this bill from its logo', async () => {
  const screen = await render(<BillDetailScreen />);

  await fireEvent.press(screen.getByLabelText('Change logo'));

  expect(router.push).toHaveBeenCalledWith({
    pathname: '/change-logo',
    params: { kind: 'bill', id: 'b1', name: 'Housing' },
  });
});

describe('at large text sizes', () => {
  type Screen = Awaited<ReturnType<typeof render>>;

  const layout = async (screen: Screen, testID: string, width: number) =>
    fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
    });

  /** Next due, Paid from, Category, Started: each label's room and widest word, then the card. */
  async function layOutDetails(screen: Screen, widestLabelWord: number) {
    for (let index = 0; index < 4; index += 1) {
      await layout(screen, `fit-slot-detail-${index}-label`, 90);
      await layout(screen, `fit-copy-detail-${index}-label`, index === 1 ? widestLabelWord : 50);
      await layout(screen, `fit-slot-detail-${index}-value`, 180);
      await layout(screen, `fit-copy-detail-${index}-value`, 80);
    }
    await layout(screen, 'plan-details', 290);
  }

  const rowOf = (screen: Screen, testID: string) =>
    String(screen.getByTestId(testID).parent?.props.className);

  it('prints the amount whole, with its cents, and never shrinks it on its own', async () => {
    const screen = await render(<BillDetailScreen />);
    const figure = screen.getByText('$1,030.00');
    expect(figure.props.numberOfLines).toBeUndefined();
    expect(figure.props.adjustsFontSizeToFit).toBeUndefined();
    expect(figure.props.maxFontSizeMultiplier).toBe(1.2);
  });

  it('keeps each detail beside its label while every word fits', async () => {
    const screen = await render(<BillDetailScreen />);
    await layOutDetails(screen, 60);
    for (let index = 0; index < 4; index += 1) {
      expect(rowOf(screen, `fit-slot-detail-${index}-label`)).toContain('flex-row');
    }
    expect(screen.getByText('Chase Checking ••7730').props.className).toContain('text-right');
  });

  it('puts every detail under its label once one label word cannot fit', async () => {
    const screen = await render(<BillDetailScreen />);
    await layOutDetails(screen, 95);
    for (let index = 0; index < 4; index += 1) {
      expect(rowOf(screen, `fit-slot-detail-${index}-label`)).not.toContain('flex-row');
    }
    // Under its label, a value starts where the label does.
    expect(screen.getByText('Chase Checking ••7730').props.className).not.toContain('text-right');
  });

  it('puts every charge in a card under its date once one date cannot fit beside its amount', async () => {
    const screen = await render(<BillDetailScreen />);
    const paid = ['2026-09-01', '2026-10-01'].map((date) => `bill-b1@${date}`);
    for (const id of paid) {
      await layout(screen, `fit-slot-${id}-date`, 120);
      await layout(screen, `fit-copy-${id}-date`, id.endsWith('09-01') ? 130 : 60);
      await layout(screen, `fit-slot-${id}-amount`, 95);
    }
    await layout(screen, 'charges-paid', 327);

    for (const id of paid) {
      const date = screen.getByTestId(`fit-slot-${id}-date`);
      expect(screen.getByTestId(`fit-slot-${id}-amount`).parent).toBe(date.parent);
    }
    // The upcoming card is its own group and keeps its amounts beside their dates.
    const upcoming = 'bill-b1@2026-11-01';
    expect(screen.getByTestId(`fit-slot-${upcoming}-amount`).parent).not.toBe(
      screen.getByTestId(`fit-slot-${upcoming}-date`).parent,
    );
    expect(screen.getAllByText('-$1,030.00').length).toBeGreaterThan(0);
  });
});

describe('a loan’s bill', () => {
  const LOAN_BILL = {
    id: 'l1',
    name: 'Car loan',
    amount: 424.8,
    category_id: 'loans',
    icon_id: 'loan-car',
    recurrence: 'monthly',
    next_due_on: '2026-10-27',
    starts_on: '2026-10-27',
    card_id: null,
    bank_account_id: 'acc1',
    brands: null,
  };
  const withLoanBill = () => {
    const bills = mockBills.data;
    mockBills.data = [...(bills ?? []), LOAN_BILL];
    mockId = 'l1';
    return () => {
      mockBills.data = bills;
    };
  };

  it('goes on to the loan’s own page once the loan is read', async () => {
    const restore = withLoanBill();
    mockLoanRead = { data: { kind: 'loan', loan: {} }, isPending: false, isError: false };
    const screen = await render(<BillDetailScreen />);

    expect(mockRedirect).toHaveBeenCalledWith({ pathname: '/loan/[id]', params: { id: 'l1' } });
    expect(screen.queryByText('$424.80')).toBeNull();
    restore();
  });

  it('waits for the loan before drawing a Loans bill, so it never flashes the bill page', async () => {
    const restore = withLoanBill();
    mockLoanRead = { data: undefined, isPending: true, isError: false };
    const screen = await render(<BillDetailScreen />);

    expect(screen.queryByText('$424.80')).toBeNull();
    expect(mockRedirect).not.toHaveBeenCalled();
    restore();
  });

  it.each([
    ['with no loan behind it', NO_LOAN],
    ['when the loan cannot be read', { data: undefined, isPending: false, isError: true }],
  ])('stays a bill page for a Loans bill %s', async (_, read) => {
    const restore = withLoanBill();
    mockLoanRead = read;
    const screen = await render(<BillDetailScreen />);
    expect(screen.getByText('$424.80')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
    restore();
  });

  it('never waits on the loan read for a bill of another kind', async () => {
    mockLoanRead = { data: undefined, isPending: true, isError: false };
    const screen = await render(<BillDetailScreen />);
    expect(screen.getByText('$1,030.00')).toBeTruthy();
  });
});

describe('Delete, on a stopped bill', () => {
  const DELETE = 'Delete bill';
  const running = mockBills.data;
  // Ended before today (3 October), so the page is final and offers Delete.
  const stopHousing = () => {
    mockBills.data = [{ ...(running?.[0] as object), ends_on: '2026-09-30' }];
  };
  afterEach(() => {
    mockBills.data = running;
  });
  type PastRead = { count: number; lastChargedOn: string | null };

  beforeEach(() => {
    mockLoadPast.mockImplementation(async () => ({ count: 0, lastChargedOn: null }));
    mockChooseDelete.mockResolvedValue(null);
    mockAsk.mockResolvedValue(null);
  });

  it('waits for the charges it has not read, then asks with their count', async () => {
    stopHousing();
    let arrive: (read: PastRead) => void = () => {};
    mockLoadPast.mockImplementationOnce(() => new Promise((resolve) => (arrive = resolve)));
    const screen = await render(<BillDetailScreen />);
    await fireEvent.press(screen.getByText(DELETE));
    expect(mockChooseDelete).not.toHaveBeenCalled();

    await act(async () => arrive({ count: 3, lastChargedOn: '2026-09-01' }));
    expect(mockChooseDelete).toHaveBeenCalledWith(
      'Housing',
      { stopped: true },
      { count: 3, lastChargedOn: '2026-09-01' },
    );
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('says the one failure line when the charges cannot be read, and asks nothing', async () => {
    stopHousing();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const refused = new Error('read failed');
    mockLoadPast.mockRejectedValueOnce(refused);
    const screen = await render(<BillDetailScreen />);
    await fireEvent.press(screen.getByText(DELETE));

    expect(mockAsk).toHaveBeenCalledWith({ title: 'Something went wrong. Please try again.' });
    // A real failure, reported with its cause.
    expect(log).toHaveBeenCalledWith('[failure]', refused);
    log.mockRestore();
    expect(mockChooseDelete).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe('paid from a card the free plan has locked', () => {
  afterEach(() => resetLocaleForTests());

  it.each([
    ['en', 'No payment method'],
    ['es', 'Sin forma de pago'],
    ['fr', 'Aucun mode de paiement'],
  ] as const)('names the card in %s', async (language, none) => {
    setLanguage(language);
    mockBills.data = [{ ...HOUSING, card_id: 'card-2', bank_account_id: null }];

    const screen = await render(<BillDetailScreen />);

    expect(screen.getByText('Amex ••3005')).toBeTruthy();
    expect(screen.queryByText(none)).toBeNull();
  });

  it('says nothing about how it is paid until the names are read', async () => {
    mockBills.data = [{ ...HOUSING, card_id: 'card-2', bank_account_id: null }];
    mockNamesLoading = true;

    const screen = await render(<BillDetailScreen />);

    expect(screen.queryByText('No payment method')).toBeNull();
    expect(screen.queryByText('$1,030.00')).toBeNull();

    mockNamesLoading = false;
    await screen.rerender(<BillDetailScreen />);
    expect(screen.getByText('Amex ••3005')).toBeTruthy();
  });

  it('still says a bill with no card or account has none, once the names are read', async () => {
    mockBills.data = [{ ...HOUSING, card_id: null, bank_account_id: null }];

    const screen = await render(<BillDetailScreen />);

    expect(screen.getByText('No payment method')).toBeTruthy();
  });
});
