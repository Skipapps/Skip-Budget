import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import ReceiptsScreen from '@/app/receipts';

/**
 * Scan on the receipts list is Pro. Until the app knows, a tap does nothing, so someone who paid
 * and taps right after launch is never shown the explainer; once known, a free account sees it and
 * a paying one goes to the camera and on to the filled-in form.
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

jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
  usePaymentSources: () => ({ sources: [] }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPro = { pro: true, ready: true };
});

it('does nothing on a tap before Pro is known', async () => {
  mockPro = { pro: false, ready: false };
  const screen = await render(<ReceiptsScreen />);

  await fireEvent.press(screen.getByLabelText('Scan a receipt'));

  expect(router.push).not.toHaveBeenCalled();
  expect(mockScan).not.toHaveBeenCalled();
});

it('shows a free account the explainer, without opening the camera', async () => {
  mockPro = { pro: false, ready: true };
  const screen = await render(<ReceiptsScreen />);

  await fireEvent.press(screen.getByLabelText('Scan a receipt'));

  expect(router.push).toHaveBeenCalledWith({ pathname: '/pro-feature', params: { id: 'scan' } });
  expect(mockScan).not.toHaveBeenCalled();
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
