import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import BillsScreen from '@/app/bills';
import SubscriptionsScreen from '@/app/subscriptions';

/**
 * Monthly bills and Subscriptions, kept to one job (Founder, 2026-10-03).
 *
 * People tapped the charges expecting the bill behind them, and nothing
 * happened. Now a charge opens its bill's or subscription's own page, and
 * adding is the + in the header — the "Your bills" / "Add bill" tiles are
 * gone.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));

jest.mock('@/lib/haptics', () => ({ tap: jest.fn() }));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
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

const mockEntries = [
  {
    id: 'bill-b1@2026-10-01',
    label: 'Housing',
    amount: -1500,
    date: '2026-10-01',
    kind: 'bill',
    sourceId: '',
    planId: 'b1',
  },
  {
    id: 'subscription-s1@2026-10-05',
    label: 'Netflix',
    amount: -15.99,
    date: '2026-10-05',
    kind: 'subscription',
    sourceId: '',
    planId: 's1',
  },
];

jest.mock('@/api/queries', () => ({
  useBills: () => ({ data: [{ id: 'b1' }] }),
  useSubscriptions: () => ({ data: [{ id: 's1' }] }),
  usePaymentSources: () => ({ sources: [] }),
  useLedger: () => ({
    entries: mockEntries,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

beforeEach(() => jest.clearAllMocks());

describe('Monthly bills', () => {
  it('opens the page of the bill behind a charge', async () => {
    const screen = await render(<BillsScreen />);

    await fireEvent.press(screen.getByLabelText(/Housing/));

    expect(router.push).toHaveBeenCalledWith('/bill/b1');
  });

  it('adds from the + in the header, with no tiles on the page', async () => {
    const screen = await render(<BillsScreen />);

    expect(screen.queryByText('Your bills')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Add bill'));

    expect(router.push).toHaveBeenCalledWith('/add-bill');
  });
});

describe('Subscriptions', () => {
  it('opens the page of the subscription behind a renewal', async () => {
    const screen = await render(<SubscriptionsScreen />);

    await fireEvent.press(screen.getByLabelText(/Netflix/));

    expect(router.push).toHaveBeenCalledWith('/subscription/s1');
  });

  it('adds from the + in the header, with no tiles on the page', async () => {
    const screen = await render(<SubscriptionsScreen />);

    expect(screen.queryByText('Your plans')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Add subscription'));

    expect(router.push).toHaveBeenCalledWith('/add-subscription');
  });
});
