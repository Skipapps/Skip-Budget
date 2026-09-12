import { render } from '@testing-library/react-native';

import AddSubscriptionScreen from '@/app/add-subscription';

/**
 * What the subscription editor does when it cannot read the subscription.
 *
 * `id` is what turns Save into an update. The screen used to mount its form as
 * soon as the read stopped loading, row or no row, so a failed read opened a
 * blank "edit" and one press of Save put those blanks over a real service —
 * name, amount, renewal date and card together.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/brands/brand-field', () => ({ BrandField: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'sub-1' }),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

/*
 * Spied on as hooks: the form calls `useUpdateSubscription()` at mount, so a
 * hook that was never called is proof the form was never on screen.
 */
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockUseUpdate = jest.fn(() => ({ mutateAsync: mockUpdate, isPending: false }));
const mockUseCreate = jest.fn(() => ({ mutateAsync: mockCreate, isPending: false }));
const mockUseDelete = jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false }));

jest.mock('@/api/mutations', () => ({
  useUpdateSubscription: () => mockUseUpdate(),
  useCreateSubscription: () => mockUseCreate(),
  useDeleteSubscription: () => mockUseDelete(),
}));

jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => ({ mutateAsync: jest.fn() }),
  useReminderChoice: () => ({ choice: 'off', ready: true }),
}));

jest.mock('@/api/brands', () => ({
  useSpendCategories: () => ({ data: [] }),
}));

let mockSubscription: { data: unknown; isError: boolean; isFetched: boolean };
const mockRefetch = jest.fn();

jest.mock('@/api/queries', () => ({
  useSubscription: () => ({ ...mockSubscription, refetch: mockRefetch }),
  usePaymentSources: () => ({ sources: [] }),
}));

beforeEach(() => {
  mockSubscription = { data: null, isError: false, isFetched: false };
  [mockUpdate, mockCreate, mockRefetch, mockUseUpdate, mockUseCreate, mockUseDelete].forEach((fn) =>
    fn.mockClear(),
  );
});

describe('Add subscription — an edit whose row could not be read', () => {
  it('says so instead of opening a blank form over the real subscription', async () => {
    mockSubscription = { data: null, isError: true, isFetched: true };
    const { getByText, queryByText } = await render(<AddSubscriptionScreen />);

    expect(getByText('Could not open this subscription')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    expect(queryByText('Edit subscription')).toBeNull();
    expect(queryByText('Continue')).toBeNull();
    expect(queryByText('Save changes')).toBeNull();

    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('holds the skeleton while the read is still running', async () => {
    const { getByText, queryByText } = await render(<AddSubscriptionScreen />);

    expect(getByText('Edit subscription')).toBeTruthy();
    expect(queryByText('Could not open this subscription')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
  });

  it('opens the form as usual once the row is in hand', async () => {
    mockSubscription = {
      data: {
        id: 'sub-1',
        brand_id: null,
        name: 'Streaming',
        amount: 12.99,
        cycle: 'monthly',
        next_renewal_on: '2026-10-01',
        category_id: 'other',
        card_id: null,
        bank_account_id: null,
        note: null,
        active: true,
        brands: null,
      },
      isError: false,
      isFetched: true,
    };
    const { getByText, queryByText } = await render(<AddSubscriptionScreen />);

    expect(getByText('Edit subscription')).toBeTruthy();
    expect(queryByText('Could not open this subscription')).toBeNull();
    expect(mockUseUpdate).toHaveBeenCalled();
  });

  it('says the subscription is gone when the read lands empty', async () => {
    mockSubscription = { data: null, isError: false, isFetched: true };
    const { getByText, queryByText } = await render(<AddSubscriptionScreen />);

    expect(getByText('That subscription is not here')).toBeTruthy();
    expect(queryByText('Edit subscription')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
  });
});
