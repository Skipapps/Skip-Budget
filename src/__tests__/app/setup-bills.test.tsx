import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import SetupBillsScreen from '@/app/setup-bills';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The bills step of setup holds a loop, not a form: every bill saved comes
 * back here, "Add another bill" goes round again, and only Done returns to
 * the checklist.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
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

const mockRefetch = jest.fn();
let mockBills: { data?: unknown[]; isPending: boolean; isError: boolean };

jest.mock('@/api/queries', () => ({
  useBills: () => ({ ...mockBills, refetch: mockRefetch }),
  usePaymentSources: () => ({ sources: [{ id: 'card-1', label: 'Visa' }] }),
}));

const RENT = {
  id: 'bill-1',
  name: 'Rent',
  amount: 1500,
  next_due_on: '2026-10-01',
  recurrence: 'monthly',
  category_id: 'housing',
  icon_id: null,
  card_id: 'card-1',
  bank_account_id: null,
  brands: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack = true;
  mockBills = { data: [], isPending: false, isError: false };
});

describe('Setup — bills, before the first one', () => {
  it('offers to add a bill, or to skip back to the checklist', async () => {
    const screen = await render(<SetupBillsScreen />);

    expect(screen.queryByText('Done')).toBeNull();
    expect(screen.queryByText('Add another bill')).toBeNull();

    await fireEvent.press(screen.getByText('Add a bill'));
    expect(router.push).toHaveBeenCalledWith('/add-bill');

    await fireEvent.press(screen.getByText('Skip for now'));
    expect(router.back).toHaveBeenCalled();
  });
});

describe('Setup — bills, once some are in', () => {
  beforeEach(() => {
    mockBills = { data: [RENT], isPending: false, isError: false };
  });

  it('lists them, and goes round again for another', async () => {
    const screen = await render(<SetupBillsScreen />);

    expect(screen.getByText('Rent')).toBeTruthy();
    expect(screen.queryByText('Add a bill')).toBeNull();

    await fireEvent.press(screen.getByText('Add another bill'));
    expect(router.push).toHaveBeenCalledWith('/add-bill');
  });

  it('opens a listed bill to fix it', async () => {
    const screen = await render(<SetupBillsScreen />);

    await fireEvent.press(screen.getByText('Rent'));
    expect(router.push).toHaveBeenCalledWith('/add-bill?id=bill-1');
  });

  it('returns to the checklist on Done, without stacking a second one', async () => {
    const screen = await render(<SetupBillsScreen />);

    await fireEvent.press(screen.getByText('Done'));
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('lands on the checklist from a deep link, where there is nothing to go back to', async () => {
    mockCanGoBack = false;
    const screen = await render(<SetupBillsScreen />);

    await fireEvent.press(screen.getByText('Done'));
    expect(router.replace).toHaveBeenCalledWith('/setup');
  });
});

it('says the one failure line when the bills will not load, and retries', async () => {
  mockBills = { isPending: false, isError: true };
  const screen = await render(<SetupBillsScreen />);

  expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
  await fireEvent.press(screen.getByText('Try again'));
  expect(mockRefetch).toHaveBeenCalled();
});
