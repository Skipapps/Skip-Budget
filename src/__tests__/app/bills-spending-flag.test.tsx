import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import BillsScreen from '@/app/bills';
import SetupBillsScreen from '@/app/setup-bills';
import { resetLocaleForTests } from '@/i18n/store';

/**
 * A loan saved with "Add to monthly bills" off is not a bill on the lists of bills: Monthly bills
 * (its figure, its counts, its rows and its empty page) and the setup step. The Loans page and its
 * own page still show it (they read useBills unfiltered).
 */

jest.mock('@/theme/bill-icons', () => ({
  useBillIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
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
  useColors: () => ({
    ink: '#000000',
    body: '#222222',
    muted: '#777777',
    line: '#DDDDDD',
    accentInk: '#905479',
  }),
  useMoneyColor: () => () => '#000000',
  useTheme: () => ({ scheme: 'light' }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const RENT = {
  id: 'rent',
  name: 'Rent',
  amount: 1500,
  category_id: 'housing',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2026-10-15',
  starts_on: '2026-07-01',
  ends_on: null,
  card_id: 'card-1',
  bank_account_id: null,
  created_at: '2026-06-01T12:00:00Z',
  brands: null,
  in_spending: true,
};
const CAR_LOAN = {
  ...RENT,
  id: 'car',
  name: 'Car loan',
  amount: 424.8,
  category_id: 'loans',
  icon_id: 'loan-car',
  next_due_on: '2026-10-27',
  in_spending: false,
};

// Rent was charged on the 15th of Jul to Sep; today is 12 Oct, so the 15th is still to come.
const mockCharges = ['2026-07-15', '2026-08-15', '2026-09-15'].map((on) => ({
  id: `rent-${on}`,
  bill_id: 'rent',
  subscription_id: null,
  label: 'Rent',
  amount: 1500,
  charged_on: on,
  card_id: 'card-1',
  bank_account_id: null,
}));

let mockBills: { data: unknown[]; isPending: boolean; isLoading: boolean; isError: boolean };

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
  useBills: () => ({ ...mockBills, refetch: jest.fn() }),
  useSubscriptions: () => mockRead([]),
  useLoanPayoffRows: () => mockRead([]),
  usePaymentSources: () => ({
    sources: [{ id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' }],
  }),
  // The ledger already leaves the loan's payments out; what is left here is the count of bills.
  useLedger: () => ({
    entries: [],
    allEntries: [],
    hidden: { receipts: false, plans: new Set(), income: false },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.useFakeTimers({
  now: new Date('2026-10-12T12:00:00'),
  doNotFake: ['nextTick', 'setImmediate'],
});

/** The page, with what its refresh needs around it. */
function show(page: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

const lines = () => screen.queryAllByText(/./).map((node) => String(node.props.children));

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('a loan kept out of monthly bills', () => {
  it('is not on Monthly bills, nor in its count, its figure or Coming up', async () => {
    mockBills = { data: [RENT, CAR_LOAN], isPending: false, isLoading: false, isError: false };
    await show(<BillsScreen />);

    // Rent alone: the 15th is still to come, and the loan's 27th is not a bill.
    expect(screen.getByText('1 bill · 0 paid · 1 coming up')).toBeTruthy();
    expect(within(screen.getByTestId('month-card-summary')).getByText('$1,500.00')).toBeTruthy();
    expect(screen.getByText('Next: Rent · 15 Oct')).toBeTruthy();
    expect(within(screen.getByTestId('coming-up')).getByText('Rent')).toBeTruthy();
    expect(
      within(screen.getByTestId('all-plans')).getByRole('header', { name: 'All bills, 1' }),
    ).toBeTruthy();
    expect(screen.queryByText('Car loan')).toBeNull();
    expect(lines().some((line) => /Car loan|\$424\.80/.test(line))).toBe(false);
    // Nor is it set aside as stopped: it is simply not a bill here.
    expect(screen.queryByTestId('stopped-plans')).toBeNull();
  });

  it('alone, leaves Monthly bills inviting the first bill', async () => {
    mockBills = { data: [CAR_LOAN], isPending: false, isLoading: false, isError: false };
    await show(<BillsScreen />);

    expect(screen.getByText('No bills yet')).toBeTruthy();
    expect(screen.getAllByText('Add a bill').length).toBeGreaterThan(0);
    expect(screen.queryByText('Car loan')).toBeNull();
    expect(screen.queryByTestId('month-card')).toBeNull();
  });

  it('beside a bill that counts, leaves Monthly bills saying nothing is due, not that there are no bills', async () => {
    // Rent starts next month, so nothing is due in October.
    const later = { ...RENT, starts_on: '2026-11-01', next_due_on: '2026-11-01' };
    mockBills = { data: [later, CAR_LOAN], isPending: false, isLoading: false, isError: false };
    await show(<BillsScreen />);

    expect(screen.queryByText('No bills yet')).toBeNull();
    expect(screen.getByText('Nothing due in October')).toBeTruthy();
    expect(screen.queryByText('Car loan')).toBeNull();
  });

  it('is not on the setup step', async () => {
    mockBills = { data: [RENT, CAR_LOAN], isPending: false, isLoading: false, isError: false };
    await show(<SetupBillsScreen />);

    expect(screen.getByText('Rent')).toBeTruthy();
    expect(screen.queryByText('Car loan')).toBeNull();
  });
});
