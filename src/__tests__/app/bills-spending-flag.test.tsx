import { render } from '@testing-library/react-native';

import BillPlansScreen from '@/app/bill-plans';
import BillsScreen from '@/app/bills';
import SetupBillsScreen from '@/app/setup-bills';
import { resetLocaleForTests } from '@/i18n/store';

/**
 * A loan saved with "Add to monthly bills" off is not a bill on the lists of bills: Your bills, the
 * setup step, and the count behind Monthly bills' empty page. The Loans page and its own page still
 * show it (they read useBills unfiltered).
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
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null, SkeletonList: () => null }));
jest.mock('@/components/ui/range-dropdown', () => ({ RangeDropdown: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#222222',
    muted: '#777777',
    line: '#DDDDDD',
    accentInk: '#905479',
  }),
  useMoneyColor: () => () => '#000000',
}));

const RENT = {
  id: 'rent',
  name: 'Rent',
  amount: 1500,
  category_id: 'housing',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2026-11-01',
  starts_on: '2026-07-01',
  ends_on: null,
  card_id: 'card-1',
  bank_account_id: null,
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

let mockBills: { data: unknown[]; isPending: boolean; isError: boolean };

jest.mock('@/api/queries', () => ({
  useBills: () => ({ ...mockBills, refetch: jest.fn() }),
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

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('a loan kept out of monthly bills', () => {
  it('is not on Your bills, nor in its count or total', async () => {
    mockBills = { data: [RENT, CAR_LOAN], isPending: false, isError: false };
    const screen = await render(<BillPlansScreen />);

    expect(screen.getByText('Rent')).toBeTruthy();
    expect(screen.queryByText('Car loan')).toBeNull();
    expect(screen.getByText('1 bill')).toBeTruthy();
    expect(screen.getAllByText('-$1,500.00').length).toBeGreaterThan(0);
  });

  it('alone, leaves Your bills empty', async () => {
    mockBills = { data: [CAR_LOAN], isPending: false, isError: false };
    const screen = await render(<BillPlansScreen />);

    expect(screen.getByText('No bills yet')).toBeTruthy();
    expect(screen.queryByText('Car loan')).toBeNull();
  });

  it('alone, leaves Monthly bills inviting the first bill', async () => {
    mockBills = { data: [CAR_LOAN], isPending: false, isError: false };
    const screen = await render(<BillsScreen />);
    expect(screen.getByText('No bills yet')).toBeTruthy();
    expect(screen.getByText('Add a bill')).toBeTruthy();
  });

  it('beside a bill that counts, leaves Monthly bills saying the window is empty', async () => {
    mockBills = { data: [RENT, CAR_LOAN], isPending: false, isError: false };
    const screen = await render(<BillsScreen />);
    expect(screen.queryByText('No bills yet')).toBeNull();
  });

  it('is not on the setup step', async () => {
    mockBills = { data: [RENT, CAR_LOAN], isPending: false, isError: false };
    const screen = await render(<SetupBillsScreen />);

    expect(screen.getByText('Rent')).toBeTruthy();
    expect(screen.queryByText('Car loan')).toBeNull();
  });
});
