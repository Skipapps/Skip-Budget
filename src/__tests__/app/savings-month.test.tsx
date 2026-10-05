import { fireEvent, render } from '@testing-library/react-native';

import SavingsMonthScreen from '@/app/savings-month';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * Correcting a month whose row arrives after the screen (cold cache, deep link). The correction and
 * note are `useState` initial values, read once, so they must be seeded when the row lands or Save
 * would write an empty amount over the figure.
 *
 * While the read is running or has failed the screen must not claim "that month is not on your
 * savings", which is a fact about the account.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));

jest.mock('@/api/mutations', () => ({
  useAdjustSavingsMonth: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useExcludeSavingsMonth: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ month: '2026-08-01' }),
}));

/** August, already corrected to $47.50 with a reason. */
const mockRow = {
  month: '2026-08-01',
  income: 4000,
  spent: 3600,
  saved: 400,
  adjusted_saved: 47.5,
  note: 'Paid the plumber in cash',
  excluded_at: null,
};

let mockState: { data: unknown[]; isLoading: boolean; isError: boolean } = {
  data: [mockRow],
  isLoading: false,
  isError: false,
};
const mockRefetch = jest.fn();

jest.mock('@/api/queries', () => ({
  useMonthlySavings: () => ({ ...mockState, refetch: mockRefetch }),
}));

beforeEach(() => {
  mockState = { data: [mockRow], isLoading: false, isError: false };
  mockRefetch.mockClear();
});

describe('A month on the savings list', () => {
  it('seeds the correction from a row that lands after the first render', async () => {
    mockState = { data: [], isLoading: true, isError: false };
    const view = await render(<SavingsMonthScreen />);

    expect(view.queryByText('That month is not on your savings.')).toBeNull();

    mockState = { data: [mockRow], isLoading: false, isError: false };
    await view.rerender(<SavingsMonthScreen />);

    expect(view.getByText('$47.50')).toBeTruthy();
    expect(view.getByDisplayValue('Paid the plumber in cash')).toBeTruthy();
  });

  it('answers a failed read with an error and a retry, not with "not on your savings"', async () => {
    mockState = { data: [], isLoading: false, isError: true };
    const { getByText, queryByText } = await render(<SavingsMonthScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(queryByText('That month is not on your savings.')).toBeNull();

    await fireEvent.press(getByText('Try again'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('still says so when the read landed and the month genuinely is not there', async () => {
    mockState = { data: [], isLoading: false, isError: false };
    const { getByText } = await render(<SavingsMonthScreen />);

    expect(getByText('That month is not on your savings.')).toBeTruthy();
  });
});
