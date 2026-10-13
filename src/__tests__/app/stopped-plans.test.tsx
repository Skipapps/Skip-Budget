import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';

import { resetLocaleForTests, setLanguage } from '@/i18n/store';

import BillDetailScreen from '@/app/bill/[id]';
import BillsScreen from '@/app/bills';
import SetupBillsScreen from '@/app/setup-bills';
import SetupSubscriptionsScreen from '@/app/setup-subscriptions';
import SubscriptionsScreen from '@/app/subscriptions';
import SubscriptionDetailScreen from '@/app/subscription/[id]';

/**
 * A bill or subscription whose past was kept on Delete has stopped, and stopped is final: its page
 * has no pencil, only Delete, and that Delete can only remove it, the way out keeping its past.
 * Monthly bills and Subscriptions keep it in a section under the running ones ("Stopped",
 * "Cancelled"), out of every count and total. Seen on 12 Oct 2026; Gym was stopped today, Course
 * before its first day.
 *
 * The questions are the real ones (`usePastCharges` over `usePastChoice`), over the charges below.
 */

jest.mock('@/theme/bill-icons', () => ({
  useBillIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/theme/loan-icons', () => ({
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
  useLoanTypeIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
let mockId = 'b2';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: mockId }),
  Redirect: () => null,
}));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  selection: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null, SkeletonList: () => null }));
jest.mock('@/components/ui/range-dropdown', () => ({ RangeDropdown: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
  useTheme: () => ({ scheme: 'light' }),
}));

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
const mockAsk = jest.fn(async (_request: object): Promise<string | null> => null);
jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => mockAsk }));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));
const mockDelete = jest.fn(async (id: string) => ({ id }));
jest.mock('@/api/mutations', () => ({
  useDeleteBill: () => ({ mutateAsync: mockDelete, isPending: false }),
  useDeleteSubscription: () => ({ mutateAsync: mockDelete, isPending: false }),
}));
let mockLoans: ReturnType<typeof loanRow>[] = [];
jest.mock('@/api/loans', () => {
  const { termsFromStored } = jest.requireActual('@/lib/loan');
  return {
    useLoanDetail: () => ({ data: { kind: 'bill' }, isPending: false, isError: false }),
    // A stopped loan's row reads whether it was paid off from these, with its real schedule behind.
    useLoans: () => ({ loans: mockLoans, isPending: false, isError: false, refetch: jest.fn() }),
    loanTermsOf: (row: ReturnType<typeof loanRow>) =>
      termsFromStored(row, row.bill.starts_on ?? undefined),
  };
});

const RENT = {
  id: 'b1',
  name: 'Rent',
  amount: 1100,
  category_id: 'housing',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2026-11-01',
  starts_on: '2026-01-01',
  ends_on: null,
  card_id: null,
  bank_account_id: null,
  brands: null,
};
// Stopped today: its due on the 15th is never recorded.
const GYM = {
  ...RENT,
  id: 'b2',
  name: 'Gym',
  amount: 40,
  category_id: 'other',
  next_due_on: '2026-10-15',
  starts_on: '2026-01-15',
  ends_on: '2026-10-12',
};
// Stopped before its first day: nothing was ever due.
const COURSE = {
  ...RENT,
  id: 'b3',
  name: 'Course',
  amount: 200,
  category_id: 'education',
  next_due_on: null,
  starts_on: '2026-10-12',
  ends_on: '2026-10-12',
};
// Loans' bills: one paid off (its schedule's last payment came on 3 Oct) and one stopped by "Keep
// past payments" on 5 Oct with money still owed.
const CAR = {
  ...RENT,
  id: 'l1',
  name: 'Car loan',
  amount: 424.8,
  category_id: 'loans',
  icon_id: 'loan-car',
  next_due_on: null,
  starts_on: '2025-11-03',
  ends_on: '2026-10-03',
};
const VAN = {
  ...CAR,
  id: 'l2',
  name: 'Van loan',
  starts_on: '2026-01-05',
  ends_on: '2026-10-05',
};

// A loan whose bill still runs, as the setup step lists it.
const TRUCK = { ...CAR, id: 'l3', name: 'Truck loan', next_due_on: '2026-11-01', ends_on: null };

/** A loan as the Loans read has it, with the terms its bill was saved under. */
function loanRow(
  bill: typeof CAR,
  fields: { principal: number; term_months: number; monthly_payment: number; annual_rate: number },
) {
  return {
    id: `loan-${bill.id}`,
    bill_id: bill.id,
    total_interest: 0,
    first_payment_on: bill.starts_on,
    funded_on: null,
    day_count_basis: 'monthly',
    statement_on: null,
    statement_principal: null,
    payment_overrides: null,
    created_at: '2025-10-01T10:00:00Z',
    billEnded: true,
    payoffs: [],
    ...fields,
    bill,
  };
}
const CAR_LOAN = loanRow(CAR, {
  principal: 1200,
  annual_rate: 0,
  term_months: 12,
  monthly_payment: 100,
});
const VAN_LOAN = loanRow(VAN, {
  principal: 9000,
  annual_rate: 7.5,
  term_months: 60,
  monthly_payment: 210,
});

const NETFLIX = {
  id: 's1',
  name: 'Netflix',
  amount: 15.99,
  cycle: 'monthly',
  next_renewal_on: '2026-10-20',
  started_on: '2026-01-20',
  category_id: 'entertainment',
  card_id: null,
  bank_account_id: null,
  note: null,
  active: true,
  brands: null,
};
const CALM = { ...NETFLIX, id: 's2', name: 'Calm', amount: 14.99, active: false };

const mockCharge = (
  id: string,
  plan: { bill_id?: string; subscription_id?: string },
  on: string,
  label: string,
  amount: number,
) => ({
  id,
  bill_id: null,
  subscription_id: null,
  label,
  amount,
  card_id: null,
  bank_account_id: null,
  ...plan,
  charged_on: on,
});
const mockCharges = [
  ...['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01'].map((on, index) =>
    mockCharge(`r${index}`, { bill_id: 'b1' }, on, 'Rent', 1100),
  ),
  ...['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01'].map((on, index) =>
    mockCharge(`r${index + 5}`, { bill_id: 'b1' }, on, 'Rent', 1100),
  ),
  mockCharge('c1', { bill_id: 'b2' }, '2026-09-15', 'Gym', 40),
  mockCharge('c2', { bill_id: 'b2' }, '2026-08-15', 'Gym', 40),
  mockCharge('c3', { subscription_id: 's2' }, '2026-09-03', 'Calm', 14.99),
  mockCharge('c4', { subscription_id: 's2' }, '2026-08-03', 'Calm', 14.99),
  mockCharge('n1', { subscription_id: 's1' }, '2026-09-20', 'Netflix', 15.99),
];
jest.mock('@/api/charges', () => ({
  useCharges: () => ({
    data: mockCharges,
    isSuccess: true,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/api/payment-labels', () => ({
  usePaymentLabels: () => ({
    sources: [],
    labelOf: () => null,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

let mockBills: unknown[] = [];
let mockSubscriptions: unknown[] = [];
const mockQuery = (data: unknown[]) => ({
  data,
  isPending: false,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
});
jest.mock('@/api/queries', () => ({
  ...jest.requireActual('@/api/queries'),
  useBills: () => mockQuery(mockBills),
  useSubscriptions: () => mockQuery(mockSubscriptions),
  useLoanPayoffRows: () => mockQuery([]),
  usePaymentSources: () => ({ sources: [] }),
  useLedger: () => ({
    entries: [],
    allEntries: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.useFakeTimers({
  now: new Date('2026-10-12T09:00:00'),
  doNotFake: ['nextTick', 'setImmediate'],
});

async function show(page: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

const EITHER = 'Either way, nothing after today is recorded.';

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockLoans = [];
  mockBills = [RENT, GYM, COURSE];
  mockSubscriptions = [NETFLIX, CALM];
  mockId = 'b2';
});

describe('a stopped bill’s page', () => {
  it('says when it stopped, has nothing due, no pencil, and Delete bill', async () => {
    await show(<BillDetailScreen />);

    expect(screen.getByText('Stopped on 12 Oct 2026')).toBeTruthy();
    expect(screen.queryByText('Next due')).toBeNull();
    expect(screen.queryByText('Ends')).toBeNull();
    expect(screen.queryByLabelText('Edit Gym')).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete bill' })).toBeTruthy();
  });

  it('can only be removed, the way out keeping its past; Remove everything deletes it', async () => {
    mockAsk.mockResolvedValueOnce('everything');
    await show(<BillDetailScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Delete bill' }));

    expect(mockAsk).toHaveBeenCalledWith({
      title: 'Delete Gym?',
      message: `Gym has 2 past charges. Keep them in your history, or remove them from past months too? ${EITHER}`,
      actions: [{ id: 'everything', label: 'Remove everything', destructive: true }],
      cancelLabel: 'Keep past charges',
    });
    expect(mockDelete).toHaveBeenCalledWith('b2');
    expect(mockToast).toHaveBeenCalledWith('toast.bill.deleted', 'deleted');
    // Held until the list no longer has it and the page steps back.
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeTruthy();
  });

  it('keeps it, untouched, when the person keeps its past', async () => {
    await show(<BillDetailScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Delete bill' }));

    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('with nothing ever charged, asks the plain Delete', async () => {
    mockId = 'b3';
    await show(<BillDetailScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Delete bill' }));

    expect(mockAsk).toHaveBeenCalledWith({
      title: 'Delete Course?',
      message: 'This can’t be undone.',
      actions: [{ id: 'everything', label: 'Delete', destructive: true }],
      cancelLabel: 'Cancel',
    });
  });

  it('says the one failure line when it cannot delete, and offers Delete again', async () => {
    jest.spyOn(console, 'log').mockImplementationOnce(() => {});
    mockAsk.mockResolvedValueOnce('everything');
    mockDelete.mockRejectedValueOnce(new Error('offline'));
    await show(<BillDetailScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Delete bill' }));

    expect(mockAsk).toHaveBeenLastCalledWith({ title: 'Something went wrong. Please try again.' });
    expect(screen.getByRole('button', { name: 'Delete bill' })).toBeTruthy();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('leaves a running bill with its pencil and no Delete on the page', async () => {
    mockId = 'b1';
    await show(<BillDetailScreen />);

    expect(screen.getByLabelText('Edit Rent')).toBeTruthy();
    expect(screen.getByText('Next due')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete bill' })).toBeNull();
  });
});

describe('a cancelled subscription’s page', () => {
  beforeEach(() => {
    mockId = 's2';
  });

  it('says it is cancelled and when it last charged, with no pencil and Delete subscription', async () => {
    await show(<SubscriptionDetailScreen />);

    expect(screen.getByText('Cancelled · last charged 3 Sep 2026')).toBeTruthy();
    expect(screen.queryByText('Next renewal')).toBeNull();
    expect(screen.queryByLabelText('Edit Calm')).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete subscription' })).toBeTruthy();
  });

  it('can only be removed, the way out keeping its past', async () => {
    mockAsk.mockResolvedValueOnce('everything');
    await show(<SubscriptionDetailScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Delete subscription' }));

    expect(mockAsk).toHaveBeenCalledWith({
      title: 'Delete Calm?',
      message: `Calm has 2 past charges. Keep them in your history, or remove them from past months too? ${EITHER}`,
      actions: [{ id: 'everything', label: 'Remove everything', destructive: true }],
      cancelLabel: 'Keep past charges',
    });
    expect(mockDelete).toHaveBeenCalledWith('s2');
    expect(mockToast).toHaveBeenCalledWith('toast.subscription.deleted', 'deleted');
  });

  it('leaves a running one with its pencil and no Delete on the page', async () => {
    mockId = 's1';
    await show(<SubscriptionDetailScreen />);

    expect(screen.getByLabelText('Edit Netflix')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete subscription' })).toBeNull();
  });
});

describe('Monthly bills: stopped bills', () => {
  it('lists stopped bills in a Stopped section at the bottom, out of the count and the figure', async () => {
    await show(<BillsScreen />);

    // Rent alone: the 1 Oct payment. With the stopped ones the figure would be $1,340.00.
    expect(screen.getByText('1 bill · 1 paid · 0 coming up')).toBeTruthy();
    expect(
      within(screen.getByTestId('fit-figure-month-card-figure')).getByText('$1,100.00'),
    ).toBeTruthy();
    expect(screen.queryByText('$1,340.00')).toBeNull();
    expect(
      within(screen.getByTestId('all-plans')).getByRole('header', { name: 'All bills, 1' }),
    ).toBeTruthy();

    const stopped = within(screen.getByTestId('stopped-plans'));
    expect(stopped.getByRole('header', { name: 'Stopped, 2' })).toBeTruthy();
    expect(stopped.getAllByText('Stopped on 12 Oct 2026')).toHaveLength(2);
    expect(stopped.queryByText('Rent')).toBeNull();
    expect(stopped.getByLabelText(/^Gym, .*, Stopped on 12 Oct 2026$/)).toBeTruthy();
    // Under the running ones, and above the link to the history.
    expect(
      screen
        .getAllByTestId(/^(all-plans|stopped-plans|see-history)$/)
        .map((node) => node.props.testID),
    ).toEqual(['all-plans', 'stopped-plans', 'see-history']);
    // Stopped is final: no "Add a card" on its rows.
    expect(screen.queryByTestId('stopped-row-b2-add-card')).toBeNull();

    await fireEvent.press(stopped.getByLabelText(/^Gym,/));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/bill/[id]', params: { id: 'b2' } });
  });

  it('never lists a stopped bill under Coming up or All bills', async () => {
    await show(<BillsScreen />);

    expect(screen.queryByTestId('coming-up')).toBeNull();
    const all = within(screen.getByTestId('all-plans'));
    expect(all.queryByText('Gym')).toBeNull();
    expect(all.queryByText('Course')).toBeNull();
    expect(all.getByText('Rent')).toBeTruthy();
  });

  it('says a finished loan was paid off, or stopped, as the Loans page does', async () => {
    mockBills = [RENT, CAR, VAN];
    mockLoans = [CAR_LOAN, VAN_LOAN];
    await show(<BillsScreen />);

    expect(screen.getByText('1 bill · 1 paid · 0 coming up')).toBeTruthy();
    const stopped = within(screen.getByTestId('stopped-plans'));
    expect(stopped.getByLabelText(/^Car loan, .*, Paid off on 3 Oct 2026$/)).toBeTruthy();
    expect(stopped.getByLabelText(/^Van loan, .*, Stopped on 5 Oct 2026$/)).toBeTruthy();

    await fireEvent.press(stopped.getByLabelText(/^Car loan,/));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/loan/[id]', params: { id: 'l1' } });
  });

  it.each([
    ['es', 'Liquidado el 3 oct 2026'],
    ['fr', 'Remboursé le 3 oct. 2026'],
  ] as const)('says a paid-off loan in %s, in the loan’s own gender', async (language, paid) => {
    setLanguage(language);
    mockBills = [CAR, VAN];
    mockLoans = [CAR_LOAN, VAN_LOAN];
    await show(<BillsScreen />);

    expect(within(screen.getByTestId('stopped-plans')).getByText(paid)).toBeTruthy();
  });

  // The loan's bill words, bills.loanStoppedOn, are the loan's own gender ("Detenido", "Arrêté");
  // the row says the bill's ("Detenida", "Arrêtée"): stopped-row.tsx, stoppedWords, uses
  // bills.stoppedOn for a stopped loan. Fix: for a loan with ending 'stopped', say bills.loanStoppedOn
  // (bills.loanStopped with no date).
  it.each([
    ['es', 'Detenido el 5 oct 2026'],
    ['fr', 'Arrêté le 5 oct. 2026'],
  ] as const)(
    'BUG: says a stopped loan in %s in the loan’s own gender',
    async (language, stoppedOn) => {
      setLanguage(language);
      mockBills = [CAR, VAN];
      mockLoans = [CAR_LOAN, VAN_LOAN];
      await show(<BillsScreen />);

      expect(within(screen.getByTestId('stopped-plans')).getByText(stoppedOn)).toBeTruthy();
    },
  );

  it('has no Stopped section while every bill runs', async () => {
    mockBills = [RENT];
    await show(<BillsScreen />);

    expect(screen.queryByTestId('stopped-plans')).toBeNull();
  });

  it('keeps stopped bills on the page when every bill has stopped, with nothing due, not as no bills', async () => {
    mockBills = [GYM, COURSE];
    await show(<BillsScreen />);

    expect(screen.queryByText('No bills yet')).toBeNull();
    expect(screen.getByText('Nothing due in October')).toBeTruthy();
    expect(screen.queryByTestId('all-plans')).toBeNull();
    expect(within(screen.getByTestId('stopped-plans')).getByText('Gym')).toBeTruthy();
  });
});

describe('Subscriptions: cancelled subscriptions', () => {
  it('lists cancelled ones in a Cancelled section with their last charge, out of the count', async () => {
    await show(<SubscriptionsScreen />);

    expect(screen.getByText('1 subscription · 0 paid · 1 coming up')).toBeTruthy();
    expect(
      within(screen.getByTestId('all-plans')).getByRole('header', { name: 'All subscriptions, 1' }),
    ).toBeTruthy();
    const cancelled = within(screen.getByTestId('stopped-plans'));
    expect(cancelled.getByRole('header', { name: 'Cancelled, 1' })).toBeTruthy();
    expect(cancelled.getByText('Cancelled · last charged 3 Sep 2026')).toBeTruthy();
    expect(
      cancelled.getByLabelText(
        'Calm, $14.99, Monthly, Card not set, Cancelled, last charged 3 Sep 2026',
      ),
    ).toBeTruthy();
    expect(cancelled.queryByText('Netflix')).toBeNull();
    // Final: no "Add a card", and its row opens its read-only page.
    expect(screen.queryByTestId('stopped-row-s2-add-card')).toBeNull();
    await fireEvent.press(cancelled.getByLabelText(/^Calm,/));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/subscription/[id]',
      params: { id: 's2' },
    });
  });

  it('keeps a cancelled subscription on the page when every one is cancelled, not as none yet', async () => {
    mockSubscriptions = [CALM];
    await show(<SubscriptionsScreen />);

    expect(screen.queryByText('No subscriptions yet')).toBeNull();
    expect(screen.getByText('Nothing due in October')).toBeTruthy();
    expect(within(screen.getByTestId('stopped-plans')).getByText('Calm')).toBeTruthy();
  });
});

describe('the setup lists', () => {
  it('open a stopped bill, or any loan, on its page, never an edit form', async () => {
    mockBills = [RENT, GYM, CAR, TRUCK];
    await show(<SetupBillsScreen />);

    await fireEvent.press(screen.getByLabelText(/^Gym,/));
    await fireEvent.press(screen.getByLabelText(/^Car loan,/));
    // A loan whose bill still runs opens its page too: that page decides whether it can change.
    await fireEvent.press(screen.getByLabelText(/^Truck loan,/));
    await fireEvent.press(screen.getByLabelText(/^Rent,/));

    expect(jest.mocked(router.push).mock.calls).toEqual([
      [{ pathname: '/bill/[id]', params: { id: 'b2' } }],
      [{ pathname: '/loan/[id]', params: { id: 'l1' } }],
      [{ pathname: '/loan/[id]', params: { id: 'l3' } }],
      ['/add-bill?id=b1'],
    ]);
  });

  it('open a cancelled subscription on its page, never its edit form', async () => {
    await show(<SetupSubscriptionsScreen />);

    await fireEvent.press(screen.getByLabelText(/^Calm,/));
    await fireEvent.press(screen.getByLabelText(/^Netflix,/));

    expect(jest.mocked(router.push).mock.calls).toEqual([
      ['/subscription/s2'],
      ['/add-subscription?id=s1'],
    ]);
  });
});
