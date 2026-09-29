import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import ReceiptsScreen from '@/app/receipts';

/**
 * The first receipt never starts at a paywall.
 *
 * Scanning is Pro. The empty page used to lead with "Scan a receipt" wherever
 * the device could scan, so a free account's first tap on Receipts landed on
 * the Pro pitch. The empty page adds a receipt by hand; Scan is still in the
 * header for whoever wants it.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: false }) }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));

const mockScan = jest.fn();
// A device that can scan: the case where the empty page used to offer it.
jest.mock('@/api/scan', () => ({
  useReceiptScan: () => ({ scan: mockScan, scanning: false, available: true }),
  draftToParams: () => ({}),
}));

jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
  usePaymentSources: () => ({ sources: [] }),
}));

it('adds a receipt by hand from the empty page, even where scanning is possible', async () => {
  const screen = await render(<ReceiptsScreen />);

  expect(screen.getByText('No receipts yet')).toBeTruthy();
  expect(screen.queryByText('Scan a receipt')).toBeNull();

  await fireEvent.press(screen.getByText('Add a receipt'));

  expect(router.push).toHaveBeenCalledWith('/add-receipt');
  expect(router.push).not.toHaveBeenCalledWith(
    expect.objectContaining({ pathname: '/pro-feature' }),
  );
  expect(mockScan).not.toHaveBeenCalled();
});
