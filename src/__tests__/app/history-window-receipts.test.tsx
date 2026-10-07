import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import ReceiptsScreen from '@/app/receipts';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * The receipts list on free shows the last 90 days of the window chosen: a year opens with a line
 * saying the older receipts are kept, and Pro shows them all.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));
jest.mock('@/api/scan', () => ({
  useReceiptScan: () => ({ scan: jest.fn(), scanning: false, available: false }),
  draftToParams: () => ({}),
}));

// 12 September 2026: the free window starts on 14 June.
const TODAY = '2026-09-12';
let mockReceipts = [
  { id: 'r-sep', merchant: 'Bakery', amount: 6, purchased_on: '2026-09-10' },
  { id: 'r-jun', merchant: 'Chemist', amount: 5, purchased_on: '2026-06-14' },
  { id: 'r-may', merchant: 'Hardware', amount: 3, purchased_on: '2026-05-02' },
].map((row) => ({ ...row, card_id: null, bank_account_id: null, brands: null }));
const ALL = mockReceipts;

jest.mock('@/api/queries', () => ({
  useReceipts: () => ({
    data: mockReceipts,
    isLoading: false,
    isFetched: true,
    isError: false,
    refetch: jest.fn(),
  }),
  usePaymentSources: () => ({ sources: [] }),
}));

jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T09:00:00`));

const NOTICE = 'Older history is saved. Free shows the last 90 days. Skip Pro shows up to 7 years.';

type Screen = Awaited<ReturnType<typeof render>>;

async function showYear(screen: Screen) {
  await fireEvent.press(screen.getByLabelText('Showing Month. Change the window.'));
  await fireEvent.press(screen.getByText('Year'));
}

beforeEach(() => {
  jest.clearAllMocks();
  resetProStatusForTests();
  mockReceipts = ALL;
});

it('shows a free year from the window’s first day, and says May is kept', async () => {
  await act(async () => publishProStatus({ pro: false, ready: true }));
  const screen = await render(<ReceiptsScreen />);
  await showYear(screen);

  expect(screen.getByText('Bakery')).toBeTruthy();
  expect(screen.getByText('Chemist')).toBeTruthy();
  expect(screen.queryByText('Hardware')).toBeNull();

  await fireEvent.press(screen.getByLabelText(NOTICE));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/pro-feature', params: { id: 'history' } });
});

it('shows the whole year on Pro, with no notice', async () => {
  await act(async () => publishProStatus({ pro: true, ready: true }));
  const screen = await render(<ReceiptsScreen />);
  await showYear(screen);

  expect(screen.getByText('Hardware')).toBeTruthy();
  expect(screen.queryByLabelText(NOTICE)).toBeNull();
});

it('draws no notice on a free month, which is inside the window', async () => {
  await act(async () => publishProStatus({ pro: false, ready: true }));
  const screen = await render(<ReceiptsScreen />);
  expect(screen.getByText('Bakery')).toBeTruthy();
  expect(screen.queryByLabelText(NOTICE)).toBeNull();
});

it('says the receipts are kept, not that nothing matches, when every one is older', async () => {
  await act(async () => publishProStatus({ pro: false, ready: true }));
  mockReceipts = ALL.filter((row) => row.id === 'r-may');
  const screen = await render(<ReceiptsScreen />);
  await showYear(screen);

  expect(screen.getByLabelText(NOTICE)).toBeTruthy();
  expect(screen.queryByText('Nothing matches')).toBeNull();
});
