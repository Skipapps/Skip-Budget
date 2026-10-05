import { render } from '@testing-library/react-native';

import AddBillScreen from '@/app/add-bill';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The bill editor's form only exists when the record does: `id` turns Save into an update, so a
 * failed read must not open a blank "edit" over a real bill.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/brands/brand-field', () => ({ BrandField: () => null }));

// The category and icon vocabularies are drawn from SVG files, which only Metro can load.
jest.mock('@/data/bills-mock', () => ({
  BILL_CATEGORIES: [{ id: 'energy', label: 'Energy' }],
  BILL_ICON_CHOICES: [],
  RECURRENCES: [{ value: 'monthly', label: 'Monthly' }],
  getBillIcon: () => () => null,
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));
jest.mock('@/api/past-charges', () => ({
  usePastCharges: () => ({
    choose: async () => 'upcoming',
    apply: jest.fn(),
    lastChargedOn: null,
    ready: true,
    retry: jest.fn(),
    saving: false,
  }),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'bill-1' }),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

/*
 * Mutations are spied on as hooks: the form runs `useUpdateBill()` at mount, so a hook never called
 * proves the form was never on screen, which is stronger than "nobody pressed Save".
 */
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockUseUpdateBill = jest.fn(() => ({ mutateAsync: mockUpdate, isPending: false }));
const mockUseCreateBill = jest.fn(() => ({ mutateAsync: mockCreate, isPending: false }));
const mockUseDeleteBill = jest.fn(() => ({ mutateAsync: mockDelete, isPending: false }));

jest.mock('@/api/mutations', () => ({
  useUpdateBill: () => mockUseUpdateBill(),
  useCreateBill: () => mockUseCreateBill(),
  useDeleteBill: () => mockUseDeleteBill(),
}));

const mockApplyReminder = jest.fn();
jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => ({ mutateAsync: mockApplyReminder }),
  useReminderChoice: () => ({ choice: 'off', ready: true }),
}));

let mockBill: { data: unknown; isError: boolean; isFetched: boolean };
const mockRefetch = jest.fn();

jest.mock('@/api/queries', () => ({
  useBill: () => ({ ...mockBill, refetch: mockRefetch }),
  useLoanForBill: () => ({ data: null }),
  usePaymentSources: () => ({ sources: [] }),
}));

beforeEach(() => {
  mockBill = { data: null, isError: false, isFetched: false };
  [mockUpdate, mockCreate, mockDelete, mockApplyReminder, mockRefetch].forEach((fn) =>
    fn.mockClear(),
  );
  [mockUseUpdateBill, mockUseCreateBill, mockUseDeleteBill].forEach((fn) => fn.mockClear());
});

describe('Add bill — an edit whose bill could not be read', () => {
  it('says so instead of opening a blank form over the real bill', async () => {
    mockBill = { data: null, isError: true, isFetched: true };
    const { getByText, queryByText } = await render(<AddBillScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    expect(queryByText('Edit bill')).toBeNull();
    expect(queryByText('Continue')).toBeNull();
    expect(queryByText('Save changes')).toBeNull();

    expect(mockUseUpdateBill).not.toHaveBeenCalled();
    expect(mockUseCreateBill).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('holds the skeleton while the read is still running', async () => {
    mockBill = { data: null, isError: false, isFetched: false };
    const { getByText, queryByText } = await render(<AddBillScreen />);

    expect(getByText('Edit bill')).toBeTruthy();
    expect(queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockUseUpdateBill).not.toHaveBeenCalled();
  });

  it('opens the form as usual once the bill is in hand', async () => {
    mockBill = {
      data: {
        id: 'bill-1',
        name: 'Power',
        amount: 84.2,
        category_id: 'energy',
        icon_id: null,
        recurrence: 'monthly',
        next_due_on: '2026-09-20',
        starts_on: null,
        ends_on: null,
        card_id: null,
        bank_account_id: null,
        note: null,
        brand_id: null,
        brands: null,
      },
      isError: false,
      isFetched: true,
    };
    const { getByText, queryByText } = await render(<AddBillScreen />);

    expect(getByText('Edit bill')).toBeTruthy();
    expect(getByText('How much is the bill?')).toBeTruthy();
    expect(queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockUseUpdateBill).toHaveBeenCalled();
  });

  it('says the bill is gone when the read lands empty, rather than starting a new one', async () => {
    mockBill = { data: null, isError: false, isFetched: true };
    const { getByText, queryByText } = await render(<AddBillScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    // An update on a missing id writes nothing yet reports success, and a create would file a
    // second bill, so neither is offered.
    expect(queryByText('Edit bill')).toBeNull();
    expect(mockUseUpdateBill).not.toHaveBeenCalled();
    expect(mockUseCreateBill).not.toHaveBeenCalled();
  });
});
