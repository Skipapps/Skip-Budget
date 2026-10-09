import { render } from '@testing-library/react-native';

import ReceiptsScreen from '@/app/receipts';

/** The receipts list draws a habit's receipt with the habit's icon, and every other with its logo. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));

jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));

const mockBrandMark = jest.fn();
jest.mock('@/components/brands/brand-mark', () => ({
  BrandMark: (props: { name: string }) => {
    mockBrandMark(props.name);
    return null;
  },
}));
const mockHabitIcon = jest.fn();
jest.mock('@/components/habits/habit-icon', () => ({
  HabitIcon: (props: object) => {
    mockHabitIcon(props);
    return null;
  },
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({ useArtwork: () => ({}) }));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true }) }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));
jest.mock('@/api/scan', () => ({
  useReceiptScan: () => ({ scan: jest.fn(), scanning: false, available: false }),
  draftToParams: () => ({}),
}));

const TODAY = '2026-09-12';
const mockReceipts = [
  {
    id: 'r2',
    merchant: 'Coffee',
    amount: 5,
    purchased_on: TODAY,
    habit_id: 'coffee',
    habit: { name: 'Coffee', icon_id: 'food-dining/coffee', color: 'caramel' },
  },
  { id: 'r1', merchant: 'Bakery', amount: 6, purchased_on: TODAY },
].map((row) => ({ ...row, card_id: null, bank_account_id: null, brands: null }));

jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ data: mockReceipts, isLoading: false, isError: false, refetch: jest.fn() }),
  usePaymentSources: () => ({ sources: [] }),
}));

jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T09:00:00`));

it('draws the habit’s icon for its receipt and a logo for the rest', async () => {
  const screen = await render(<ReceiptsScreen />);
  expect(screen.getByLabelText('Coffee, -$5.00')).toBeTruthy();
  expect(mockHabitIcon).toHaveBeenCalledWith({
    iconId: 'food-dining/coffee',
    color: 'caramel',
    size: 40,
  });
  expect(mockBrandMark.mock.calls.map(([name]) => name)).toEqual(['Bakery']);
});
