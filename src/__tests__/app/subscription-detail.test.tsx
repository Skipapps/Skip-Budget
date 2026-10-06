import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import SubscriptionDetailScreen from '@/app/subscription/[id]';

/**
 * A subscription's own page draws the logo by the row's rule (its own choice, else the catalog's,
 * letters when chosen), and the logo opens Change logo for that subscription.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479' }),
  useMoneyColor: () => () => '#000000',
}));

const mockMark = jest.fn();
jest.mock('@/components/brands/brand-mark', () => ({
  BrandMark: (props: object) => {
    mockMark(props);
    return null;
  },
}));

let mockRow: Record<string, unknown>;
jest.mock('@/api/queries', () => ({
  useSubscriptions: () => ({
    data: [mockRow],
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  usePaymentSources: () => ({ sources: [] }),
  useLedger: () => ({ entries: [], isLoading: false, isError: false, refetch: jest.fn() }),
}));

const CALM = {
  id: 's1',
  name: 'Calm',
  amount: 14.99,
  cycle: 'monthly',
  next_renewal_on: '2026-11-01',
  card_id: null,
  bank_account_id: null,
  note: null,
  active: true,
  brands: { domain: 'calmair.com' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRow = CALM;
});

it('opens Change logo for this subscription from its logo', async () => {
  const screen = await render(<SubscriptionDetailScreen />);

  await fireEvent.press(screen.getByLabelText('Change logo'));

  expect(router.push).toHaveBeenCalledWith({
    pathname: '/change-logo',
    params: { kind: 'subscription', id: 's1', name: 'Calm' },
  });
});

it.each([
  ['the catalog’s logo when nothing was chosen', {}, { domain: 'calmair.com' }],
  ['the website chosen over the catalog’s', { logo_domain: 'calm.com' }, { domain: 'calm.com' }],
  [
    'letters when they were chosen, with no name lookup',
    { logo_domain: 'calm.com', logo_hidden: true },
    { domain: null, hidden: true },
  ],
])('draws %s', async (_, over, expected) => {
  mockRow = { ...CALM, ...over };

  await render(<SubscriptionDetailScreen />);

  expect(mockMark).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Calm', ...expected }));
});
