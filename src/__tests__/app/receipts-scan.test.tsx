import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import ReceiptsScreen from '@/app/receipts';

/**
 * Scan on the receipts list: free reads 15 receipts a month by camera. Until the app knows, a tap
 * does nothing, so nobody with scans left is shown the explainer; once known, a free account with
 * scans left and a paying one go to the camera and on to the filled-in form, and a free account
 * past the 15th sees the explainer.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
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
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));

let mockPro = { pro: true, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));

const mockScan = jest.fn();
jest.mock('@/api/scan', () => ({
  useReceiptScan: () => ({ scan: mockScan, scanning: false, available: true }),
  draftToParams: () => ({ scannedStore: 'Deli', scannedAmount: '9.50' }),
}));

let mockReceipts: { source: string; created_at: string; purchased_on: string }[] = [];
const scansThisMonth = (count: number) =>
  Array.from({ length: count }, () => ({
    source: 'scan',
    created_at: new Date().toISOString(),
    purchased_on: '2000-01-01',
  }));

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

beforeEach(() => {
  jest.clearAllMocks();
  mockPro = { pro: true, ready: true };
  mockReceipts = [];
});

it('does nothing on a tap before Pro is known', async () => {
  mockPro = { pro: false, ready: false };
  const screen = await render(<ReceiptsScreen />);

  await fireEvent.press(screen.getByLabelText('Scan a receipt'));

  expect(router.push).not.toHaveBeenCalled();
  expect(mockScan).not.toHaveBeenCalled();
});

it('shows a free account past its 15th scan the explainer, without opening the camera', async () => {
  mockPro = { pro: false, ready: true };
  mockReceipts = scansThisMonth(15);
  const screen = await render(<ReceiptsScreen />);

  await fireEvent.press(screen.getByLabelText('Scan a receipt'));

  expect(router.push).toHaveBeenCalledWith({ pathname: '/pro-feature', params: { id: 'scan' } });
  expect(mockScan).not.toHaveBeenCalled();
});

it('scans for a free account with scans left', async () => {
  mockPro = { pro: false, ready: true };
  mockReceipts = scansThisMonth(14);
  mockScan.mockResolvedValueOnce({ store: null, amount: 9.5, read: ['amount'] });
  const screen = await render(<ReceiptsScreen />);

  await fireEvent.press(screen.getByLabelText('Scan a receipt'));

  await waitFor(() => expect(mockScan).toHaveBeenCalledTimes(1));
  expect(router.push).not.toHaveBeenCalledWith(
    expect.objectContaining({ pathname: '/pro-feature' }),
  );
});

it('scans for a paying account and opens the filled-in form', async () => {
  mockScan.mockResolvedValueOnce({ store: null, amount: 9.5, read: ['amount'] });
  const screen = await render(<ReceiptsScreen />);

  await fireEvent.press(screen.getByLabelText('Scan a receipt'));

  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/add-receipt',
      params: { scannedStore: 'Deli', scannedAmount: '9.50' },
    }),
  );
  expect(mockScan).toHaveBeenCalledTimes(1);
});
