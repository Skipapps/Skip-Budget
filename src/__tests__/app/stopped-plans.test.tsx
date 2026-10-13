import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';

import { resetLocaleForTests, setLanguage } from '@/i18n/store';

import BillPlansScreen from '@/app/bill-plans';
import BillDetailScreen from '@/app/bill/[id]';
import BillsScreen from '@/app/bills';
import SetupBillsScreen from '@/app/setup-bills';
import SetupSubscriptionsScreen from '@/app/setup-subscriptions';
import SubscriptionPlansScreen from '@/app/subscription-plans';
import SubscriptionsScreen from '@/app/subscriptions';
import SubscriptionDetailScreen from '@/app/subscription/[id]';

/**
 * A bill or subscription whose past was kept on Delete has stopped, and stopped is final: its page
 * has no pencil, only Delete, and that Delete can only remove it, the way out keeping its past. The
 * lists keep it under the running ones ("Stopped", "Cancelled") with no date groups and out of every
 * count and total. Seen on 12 Oct 2026; Gym was stopped today, Course before its first day.
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
const mockAsk = jest.fn(async (_request: object): Promise<string | null> => null);
jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => mockAsk }));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));
const mockDelete = jest.fn(async (id: string) => ({ id }));
jest.mock('@/api/mutations', () => ({
  useDeleteBill: () => ({ mutateAsync: mockDelete, isPending: false }),
  useDeleteSubscription: () => ({ mutateAsync: mockDelete, isPending: false }),
}));
jest.mock('@/api/loans', () => ({
  useLoanDetail: () => ({ data: { kind: 'bill' }, isPending: false, isError: false }),
}));
let mockLoanEndings = new Map<string, { ending: 'paid' | 'stopped'; endedOn: string }>();
jest.mock('@/components/loans/use-loan-endings', () => ({
  useLoanEndings: () => mockLoanEndings,
}));

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
// Loans' bills: one paid off with a payoff, one stopped by "Keep past payments", and one whose
// last payment is behind while its bill still names a date ahead.
const CAR = {
  ...RENT,
  id: 'l1',
  name: 'Car loan',
  amount: 424.8,
  category_id: 'loans',
  icon_id: 'loan-car',
  next_due_on: '2026-10-27',
  ends_on: '2026-10-03',
};
const VAN = { ...CAR, id: 'l2', name: 'Van loan', next_due_on: null, ends_on: '2026-10-05' };
const TRUCK = { ...CAR, id: 'l3', name: 'Truck loan', next_due_on: '2026-11-01', ends_on: null };
const LOAN_ENDINGS = new Map([
  ['l1', { ending: 'paid' as const, endedOn: '2026-10-03' }],
  ['l2', { ending: 'stopped' as const, endedOn: '2026-10-05' }],
  ['l3', { ending: 'paid' as const, endedOn: '2026-10-01' }],
]);

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
) => ({
  id,
  bill_id: null,
  subscription_id: null,
  label: '',
  amount: 0,
  card_id: null,
  bank_account_id: null,
  ...plan,
  charged_on: on,
});
const mockCharges = [
  mockCharge('c1', { bill_id: 'b2' }, '2026-09-15'),
  mockCharge('c2', { bill_id: 'b2' }, '2026-08-15'),
  mockCharge('c3', { subscription_id: 's2' }, '2026-09-03'),
  mockCharge('c4', { subscription_id: 's2' }, '2026-08-03'),
];
jest.mock('@/api/charges', () => ({
  useCharges: () => ({ data: mockCharges, isSuccess: true, refetch: jest.fn() }),
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
  useBills: () => mockQuery(mockBills),
  useSubscriptions: () => mockQuery(mockSubscriptions),
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
  mockLoanEndings = new Map();
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

describe('Your bills', () => {
  it('lists stopped bills under Stopped, out of the count and the total', async () => {
    await show(<BillPlansScreen />);

    expect(screen.getByText('1 bill')).toBeTruthy();
    // Rent alone: the header, its day's total and its row. With the stopped ones it would be $1,340.
    expect(screen.getAllByText('-$1,100.00')).toHaveLength(3);
    expect(screen.queryByText('-$1,340.00')).toBeNull();
    const stopped = within(screen.getByTestId('bills-stopped'));
    expect(stopped.getByText('Stopped')).toBeTruthy();
    expect(stopped.getAllByText('Stopped on 12 Oct 2026')).toHaveLength(2);
    expect(stopped.queryByText('Rent')).toBeNull();
    expect(stopped.getByLabelText(/^Gym, .*\. Stopped on 12 Oct 2026$/)).toBeTruthy();

    await fireEvent.press(stopped.getByLabelText(/^Gym,/));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/bill/[id]', params: { id: 'b2' } });
  });

  it('searches the stopped ones too, counting only the running', async () => {
    await show(<BillPlansScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Search bills'), 'gym');

    expect(screen.getByText('0 of 1 bills')).toBeTruthy();
    expect(screen.getByLabelText(/^Gym,/)).toBeTruthy();
    expect(screen.queryByLabelText(/^Course,/)).toBeNull();
    expect(screen.queryByLabelText(/^Rent,/)).toBeNull();
  });

  it('says a finished loan was paid off, or stopped, as the Loans page does', async () => {
    mockBills = [RENT, CAR, VAN, TRUCK];
    mockLoanEndings = LOAN_ENDINGS;
    await show(<BillPlansScreen />);

    expect(screen.getByText('1 bill')).toBeTruthy();
    const stopped = within(screen.getByTestId('bills-stopped'));
    expect(stopped.getByLabelText(/^Car loan, .*\. Paid off on 3 Oct 2026$/)).toBeTruthy();
    expect(stopped.getByLabelText(/^Van loan, .*\. Stopped on 5 Oct 2026$/)).toBeTruthy();
    // Finished by its schedule though its bill still names a day ahead.
    expect(stopped.getByLabelText(/^Truck loan, .*\. Paid off on 1 Oct 2026$/)).toBeTruthy();

    await fireEvent.press(stopped.getByLabelText(/^Car loan,/));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/loan/[id]', params: { id: 'l1' } });
  });

  it.each([
    ['es', 'Liquidado el 3 oct 2026', 'Detenido el 5 oct 2026'],
    ['fr', 'Remboursé le 3 oct. 2026', 'Arrêté le 5 oct. 2026'],
  ] as const)(
    'says how a loan ended in %s, in the loan’s own gender',
    async (language, paid, end) => {
      setLanguage(language);
      mockBills = [CAR, VAN];
      mockLoanEndings = LOAN_ENDINGS;
      await show(<BillPlansScreen />);

      const stopped = within(screen.getByTestId('bills-stopped'));
      expect(stopped.getByText(paid)).toBeTruthy();
      expect(stopped.getByText(end)).toBeTruthy();
    },
  );

  it('has no Stopped section while every bill runs', async () => {
    mockBills = [RENT];
    await show(<BillPlansScreen />);

    expect(screen.queryByTestId('bills-stopped')).toBeNull();
  });
});

describe('Your subscriptions', () => {
  it('lists cancelled ones under Cancelled with their last charge, out of the count', async () => {
    await show(<SubscriptionPlansScreen />);

    expect(screen.getByText('1 subscription')).toBeTruthy();
    const cancelled = within(screen.getByTestId('subscriptions-cancelled'));
    expect(cancelled.getByText('Cancelled')).toBeTruthy();
    expect(cancelled.getByText('Cancelled · last charged 3 Sep 2026')).toBeTruthy();
    // Read aloud without the dot.
    expect(
      cancelled.getByLabelText('Calm, $14.99 Monthly. Cancelled, last charged 3 Sep 2026'),
    ).toBeTruthy();
    expect(cancelled.queryByText('Netflix')).toBeNull();
  });
});

describe('Monthly bills', () => {
  it('says there are no bills yet when every bill has stopped and nothing was charged', async () => {
    mockBills = [GYM, COURSE];
    await show(<BillsScreen />);

    expect(screen.getByText('No bills yet')).toBeTruthy();
  });
});

describe('Subscriptions', () => {
  it('says there are none yet when every one is cancelled and nothing renewed', async () => {
    mockSubscriptions = [CALM];
    await show(<SubscriptionsScreen />);

    expect(screen.getByText('No subscriptions yet')).toBeTruthy();
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
