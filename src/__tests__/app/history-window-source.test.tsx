import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import SourceDetailScreen from '@/app/source/[id]';
import { toIsoDate } from '@/lib/date';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * A card's page on free lists the last 90 days of its history; the balance above it still counts
 * every row, and where older rows were left out the list says they are kept.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
// The filter page reads insets outside any provider.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockConfirm = jest.fn(async (_options: Record<string, unknown>) => false);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));

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

const card = {
  id: 'src-1',
  holder: 'Everyday Visa',
  network: 'VISA',
  last4: '4242',
  color: '#000000',
  balance: 100,
  balance_as_of: null,
};

const daysAgo = (days: number) => {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days));
};

const RECENT = {
  id: 'receipt-r1',
  label: 'Bakery',
  amount: -6.5,
  date: daysAgo(5),
  kind: 'receipt',
};
const OLD = {
  id: 'receipt-r0',
  label: 'Hardware',
  amount: -300,
  date: daysAgo(200),
  kind: 'receipt',
};

let mockEntries: object[] = [RECENT, OLD];

jest.mock('@/api/queries', () => ({
  useSourceLedger: () => ({
    source: card,
    kind: 'card',
    card,
    account: null,
    // The balance is the ledger's, walked over every row; the page only lists them.
    ledger: { entries: mockEntries, balance: 406.5, charged: 306.5, paid: 0 },
    isLoading: false,
    isError: false,
  }),
}));

const NOTICE = 'Older history is saved. Free shows the last 90 days. Skip Pro shows up to 7 years.';

beforeEach(() => {
  jest.clearAllMocks();
  resetProStatusForTests();
  mockEntries = [RECENT, OLD];
});

it('lists 90 days on free under the full balance, and says the rest is kept', async () => {
  await act(async () => publishProStatus({ pro: false, ready: true }));
  const screen = await render(<SourceDetailScreen />);

  expect(screen.getByText('$406.50')).toBeTruthy();
  expect(screen.getByText('Bakery')).toBeTruthy();
  expect(screen.queryByText('Hardware')).toBeNull();

  await fireEvent.press(screen.getByLabelText(NOTICE));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/pro-feature', params: { id: 'history' } });
});

it('lists everything on Pro, with no notice', async () => {
  await act(async () => publishProStatus({ pro: true, ready: true }));
  const screen = await render(<SourceDetailScreen />);

  expect(screen.getByText('Bakery')).toBeTruthy();
  expect(screen.getByText('Hardware')).toBeTruthy();
  expect(screen.queryByLabelText(NOTICE)).toBeNull();
});

it('says the rows are kept, not that the card is empty, when every one is older', async () => {
  await act(async () => publishProStatus({ pro: false, ready: true }));
  mockEntries = [OLD];
  const screen = await render(<SourceDetailScreen />);

  expect(screen.getByLabelText(NOTICE)).toBeTruthy();
  expect(screen.queryByText('Nothing on this one yet')).toBeNull();
});
