import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';

import BillPlansScreen from '@/app/bill-plans';
import BillsScreen from '@/app/bills';
import SubscriptionPlansScreen from '@/app/subscription-plans';
import SubscriptionsScreen from '@/app/subscriptions';

/**
 * Monthly bills and Subscriptions each do one job: a row opens its bill's or subscription's own
 * page, adding is the + in the header (no "Your bills" / "Add bill" tiles), and a plan with no Paid
 * with offers "Add a card", which opens the same form its page's pencil does. The old list pages
 * are gone: a link to either lands on the new page.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null, SkeletonList: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
  useTheme: () => ({ scheme: 'light' }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const BILLS = [
  {
    id: 'b1',
    name: 'Housing',
    amount: 1500,
    category_id: 'housing',
    icon_id: null,
    recurrence: 'monthly',
    next_due_on: '2026-11-01',
    starts_on: '2026-10-01',
    ends_on: null,
    card_id: null,
    bank_account_id: null,
    created_at: '2026-09-01T12:00:00Z',
    brands: null,
  },
  {
    id: 'l1',
    name: 'Car loan',
    amount: 424.8,
    category_id: 'loans',
    icon_id: 'loan-car',
    recurrence: 'monthly',
    next_due_on: '2026-10-27',
    starts_on: '2026-09-27',
    ends_on: null,
    card_id: 'card-1',
    bank_account_id: null,
    created_at: '2026-09-01T12:00:00Z',
    brands: null,
  },
];
const mockSubscriptions = [
  {
    id: 's1',
    name: 'Netflix',
    amount: 15.99,
    cycle: 'monthly',
    next_renewal_on: '2026-10-20',
    started_on: '2026-09-20',
    created_at: '2026-09-01T12:00:00Z',
    category_id: 'entertainment',
    card_id: null,
    bank_account_id: null,
    note: null,
    active: true,
    brands: null,
  },
];
// Housing was charged on 1 Oct, the car loan on 27 Sep and Netflix on 20 Sep; today is 12 Oct.
const record = (
  id: string,
  plan: { bill?: string; subscription?: string },
  on: string,
  amount: number,
) => ({
  id,
  bill_id: plan.bill ?? null,
  subscription_id: plan.subscription ?? null,
  label: '',
  amount,
  charged_on: on,
  card_id: null,
  bank_account_id: null,
});
const mockCharges = [
  record('c1', { bill: 'b1' }, '2026-10-01', 1500),
  record('c2', { bill: 'l1' }, '2026-09-27', 424.8),
  record('c3', { subscription: 's1' }, '2026-09-20', 15.99),
];

let mockBills: unknown[] = BILLS;
const mockRead = (data: unknown[]) => ({
  data,
  isPending: false,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
});
jest.mock('@/api/charges', () => ({
  ...jest.requireActual('@/api/charges'),
  useCharges: () => mockRead(mockCharges),
}));
jest.mock('@/api/payment-labels', () => ({
  usePaymentLabels: () => ({
    sources: [],
    labelOf: (id: string) => (id === 'card-1' ? 'VISA ••4421' : null),
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/api/loans', () => ({
  useLoans: () => ({ loans: [], isPending: false, isError: false, refetch: jest.fn() }),
  loanTermsOf: () => null,
}));
jest.mock('@/api/queries', () => ({
  ...jest.requireActual('@/api/queries'),
  useBills: () => mockRead(mockBills),
  useSubscriptions: () => mockRead(mockSubscriptions),
  useLoanPayoffRows: () => mockRead([]),
}));

jest.useFakeTimers({
  now: new Date('2026-10-12T09:00:00'),
  doNotFake: ['nextTick', 'setImmediate'],
});

/** The page, with what its refresh needs around it. */
function show(page: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBills = BILLS;
});

describe('Monthly bills', () => {
  it('opens the page of the bill behind a row', async () => {
    await show(<BillsScreen />);

    await fireEvent.press(within(screen.getByTestId('all-plans')).getByLabelText(/^Housing,/));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/bill/[id]', params: { id: 'b1' } });
  });

  it('opens a loan’s own page from its payment, under Coming up and under All bills', async () => {
    await show(<BillsScreen />);

    await fireEvent.press(within(screen.getByTestId('coming-up')).getByLabelText(/^Car loan,/));
    await fireEvent.press(within(screen.getByTestId('all-plans')).getByLabelText(/^Car loan,/));

    expect(jest.mocked(router.push).mock.calls).toEqual([
      [{ pathname: '/loan/[id]', params: { id: 'l1' } }],
      [{ pathname: '/loan/[id]', params: { id: 'l1' } }],
    ]);
  });

  it('adds from the + in the header, with no tiles on the page', async () => {
    await show(<BillsScreen />);

    expect(screen.queryByText('Your bills')).toBeNull();
    expect(screen.queryByText('Add bill')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Add bill'));

    expect(router.push).toHaveBeenCalledWith('/add-bill');
  });

  it('offers "Add a card" to a bill with none, which opens its edit form', async () => {
    await show(<BillsScreen />);

    await fireEvent.press(screen.getByTestId('plan-row-b1-add-card'));

    // Housing has no card; the car loan has one, so only Housing is offered it.
    expect(screen.queryByTestId('plan-row-l1-add-card')).toBeNull();
    expect(jest.mocked(router.push).mock.calls).toEqual([
      [{ pathname: '/add-bill', params: { id: 'b1' } }],
    ]);
  });

  it('opens a loan’s own form, not a bill’s, from its "Add a card"', async () => {
    mockBills = [BILLS[0], { ...BILLS[1], card_id: null }];
    await show(<BillsScreen />);

    await fireEvent.press(screen.getByTestId('plan-row-l1-add-card'));

    expect(jest.mocked(router.push).mock.calls).toEqual([
      [{ pathname: '/add-loan', params: { id: 'l1' } }],
    ]);
  });

  it('opens the search for bills, the month list and the history from the page', async () => {
    await show(<BillsScreen />);

    await fireEvent.press(screen.getByLabelText('Search payments'));
    await fireEvent.press(screen.getByRole('button', { name: 'See payment history' }));

    expect(jest.mocked(router.push).mock.calls).toEqual([
      [{ pathname: '/payment-search', params: { kind: 'bill' } }],
      [{ pathname: '/payment-history', params: { kind: 'bill' } }],
    ]);
  });
});

describe('Subscriptions', () => {
  it('opens the page of the subscription behind a row', async () => {
    await show(<SubscriptionsScreen />);

    await fireEvent.press(within(screen.getByTestId('all-plans')).getByLabelText(/^Netflix,/));
    await fireEvent.press(within(screen.getByTestId('coming-up')).getByLabelText(/^Netflix,/));

    expect(jest.mocked(router.push).mock.calls).toEqual([
      [{ pathname: '/subscription/[id]', params: { id: 's1' } }],
      [{ pathname: '/subscription/[id]', params: { id: 's1' } }],
    ]);
  });

  it('adds from the + in the header, with no tiles on the page', async () => {
    await show(<SubscriptionsScreen />);

    expect(screen.queryByText('Your plans')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Add subscription'));

    expect(router.push).toHaveBeenCalledWith('/add-subscription');
  });

  it('offers "Add a card" to a subscription with none, which opens its edit form', async () => {
    await show(<SubscriptionsScreen />);

    await fireEvent.press(screen.getByTestId('plan-row-s1-add-card'));

    expect(jest.mocked(router.push).mock.calls).toEqual([
      [{ pathname: '/add-subscription', params: { id: 's1' } }],
    ]);
  });

  it('opens the search for subscriptions and the history from the page', async () => {
    await show(<SubscriptionsScreen />);

    await fireEvent.press(screen.getByLabelText('Search payments'));
    await fireEvent.press(screen.getByRole('button', { name: 'See payment history' }));

    expect(jest.mocked(router.push).mock.calls).toEqual([
      [{ pathname: '/payment-search', params: { kind: 'subscription' } }],
      [{ pathname: '/payment-history', params: { kind: 'subscription' } }],
    ]);
  });
});

describe('the old list pages', () => {
  it('send a link to Your bills to Monthly bills', async () => {
    await render(<BillPlansScreen />);
    expect(mockRedirect).toHaveBeenCalledWith('/bills');
  });

  it('send a link to Your subscriptions to Subscriptions', async () => {
    await render(<SubscriptionPlansScreen />);
    expect(mockRedirect).toHaveBeenCalledWith('/subscriptions');
  });
});
