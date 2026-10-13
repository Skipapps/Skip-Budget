import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import SetupSubscriptionsScreen from '@/app/setup-subscriptions';

/**
 * The subscriptions step of setup is the same loop as the bills step, over
 * the subscription form: the shell is shared and pinned in setup-bills.test;
 * this covers what differs — the rows, the form it opens and its words.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333', line: '#DDDDDD' }),
  useMoneyColor: () => () => '#000000',
}));

let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => mockCanGoBack,
  },
}));

let mockSubscriptions: { data?: unknown[]; isPending: boolean; isError: boolean };

jest.mock('@/api/queries', () => ({
  useSubscriptions: () => ({ ...mockSubscriptions, refetch: jest.fn() }),
}));
jest.mock('@/api/payment-labels', () => {
  // Every card and account by name. card-2 is a free account's locked extra: no picker offers it
  // for new spending, but what it pays is named.
  const names: Record<string, string> = { 'card-1': 'Visa', 'card-2': 'Amex ••3005' };
  return {
    usePaymentLabels: () => ({
      sources: [],
      labelOf: (id: string) => names[id] ?? null,
      isLoading: false,
    }),
  };
});

const NETFLIX = {
  id: 'sub-1',
  name: 'Netflix',
  amount: 15.49,
  cycle: 'monthly',
  next_renewal_on: '2026-10-05',
  category_id: 'entertainment',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  active: true,
  brand_id: null,
  brands: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack = true;
  mockSubscriptions = { data: [], isPending: false, isError: false };
});

it('offers to add a subscription, or to skip back to the checklist', async () => {
  const screen = await render(<SetupSubscriptionsScreen />);

  await fireEvent.press(screen.getByText('Add a subscription'));
  expect(router.push).toHaveBeenCalledWith('/add-subscription');

  await fireEvent.press(screen.getByText('Skip for now'));
  expect(router.back).toHaveBeenCalled();
});

it('lists the ones added, and goes round again or finishes', async () => {
  mockSubscriptions = { data: [NETFLIX], isPending: false, isError: false };
  const screen = await render(<SetupSubscriptionsScreen />);

  expect(screen.getByText('Netflix')).toBeTruthy();

  await fireEvent.press(screen.getByText('Netflix'));
  expect(router.push).toHaveBeenCalledWith('/add-subscription?id=sub-1');

  await fireEvent.press(screen.getByText('Add another subscription'));
  expect(router.push).toHaveBeenCalledWith('/add-subscription');

  await fireEvent.press(screen.getByText('Done'));
  expect(router.back).toHaveBeenCalled();
});

it('names the card a subscription is paid with, a card the free plan has locked too', async () => {
  mockSubscriptions = {
    data: [NETFLIX, { ...NETFLIX, id: 'sub-2', name: 'Spotify', card_id: 'card-2' }],
    isPending: false,
    isError: false,
  };
  const screen = await render(<SetupSubscriptionsScreen />);

  expect(screen.getByText('Monthly · Visa')).toBeTruthy();
  expect(screen.getByText('Monthly · Amex ••3005')).toBeTruthy();
});
