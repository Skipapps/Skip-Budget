import { act, render } from '@testing-library/react-native';

import SourceDetailScreen from '@/app/source/[id]';
import { toIsoDate } from '@/lib/date';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/** A card's own activity draws a habit's receipt with the habit's icon, and the rest as before. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockBrandMark = jest.fn();
jest.mock('@/components/brands/brand-mark', () => ({
  BrandMark: (props: { name: string }) => {
    mockBrandMark(props.name);
    return null;
  },
}));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
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
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => false }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'src-1' }),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));
jest.mock('@/api/mutations', () => ({
  useCreatePayment: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeletePayment: () => ({ mutate: jest.fn(), isPending: false }),
}));

const mockCard = {
  id: 'src-1',
  holder: 'Everyday Visa',
  network: 'VISA',
  last4: '4242',
  color: '#000000',
  balance: 100,
  balance_as_of: null,
};

const yesterday = () => {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
};

const mockEntries = [
  {
    id: 'receipt-h1',
    label: 'Coffee',
    amount: -5,
    date: yesterday(),
    kind: 'receipt',
    habit: { iconId: 'food-dining/coffee', color: 'caramel' },
  },
  { id: 'receipt-r1', label: 'Bakery', amount: -6.5, date: yesterday(), kind: 'receipt' },
];

// The page also reads receipts (their order within a day) and charges (which plan a charge opens).
jest.mock('@/api/charges', () => ({ useCharges: () => ({ data: [] }) }));
jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ data: [] }),
  useSourceLedger: () => ({
    source: mockCard,
    kind: 'card',
    card: mockCard,
    account: null,
    ledger: { entries: mockEntries, balance: 88.5, charged: 11.5, paid: 0 },
    isLoading: false,
    isError: false,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetProStatusForTests();
});

it('draws the habit’s icon for its receipt and a logo for the others', async () => {
  await act(async () => publishProStatus({ pro: true, ready: true }));
  const screen = await render(<SourceDetailScreen />);

  expect(screen.getByText('Coffee')).toBeTruthy();
  expect(mockHabitIcon).toHaveBeenCalledWith({
    iconId: 'food-dining/coffee',
    color: 'caramel',
    size: 40,
  });
  expect(mockBrandMark.mock.calls.map(([name]) => name)).not.toContain('Coffee');
  expect(mockBrandMark.mock.calls.map(([name]) => name)).toContain('Bakery');
});
