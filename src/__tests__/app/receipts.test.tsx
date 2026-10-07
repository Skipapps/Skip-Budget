import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import ReceiptsScreen from '@/app/receipts';

/** The receipts list runs oldest day first, today last; rows within a day keep their order. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));

jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));

// The brand mark fetches a logo.
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));

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

/** Three days, three rows sharing the middle one, newest-first as the query returns them. */
const TODAY = '2026-09-12';
const mockReceipts = [
  { id: 'r6', merchant: 'Bakery', amount: 6, purchased_on: TODAY },
  { id: 'r5', merchant: 'Chemist', amount: 5, purchased_on: '2026-09-11' },
  { id: 'r4', merchant: 'Bookshop', amount: 4, purchased_on: '2026-09-11' },
  { id: 'r3', merchant: 'Hardware', amount: 3, purchased_on: '2026-09-11' },
  { id: 'r2', merchant: 'Greengrocer', amount: 2, purchased_on: '2026-09-01' },
].map((row) => ({ ...row, card_id: null, bank_account_id: null, brands: null }));

jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ data: mockReceipts, isLoading: false, isError: false, refetch: jest.fn() }),
  usePaymentSources: () => ({ sources: [] }),
}));

jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T09:00:00`));

describe('Receipts — day order', () => {
  it('heads the list with the oldest day and ends on today', async () => {
    const { getAllByText } = await render(<ReceiptsScreen />);

    // `1 Sep 2026` appears twice (day heading, then its single row's own date), so the sequence is
    // asserted whole rather than by position.
    const order = getAllByText(/^(1 Sep 2026|Yesterday|Today)$/).map((node) => node.props.children);

    expect(order).toEqual(['1 Sep 2026', '1 Sep 2026', 'Yesterday', 'Today']);
    expect(order[0]).toBe('1 Sep 2026');
    expect(order[order.length - 1]).toBe('Today');
  });

  it('leaves the rows inside a day in the order they arrived', async () => {
    const { getAllByRole } = await render(<ReceiptsScreen />);

    const labels = getAllByRole('button')
      .map((node) => String(node.props.accessibilityLabel ?? ''))
      .filter((label) => label.includes('$'));

    // Oldest day first, then the 11th's three rows untouched, then today.
    expect(labels).toEqual([
      'Greengrocer, -$2.00',
      'Chemist, -$5.00',
      'Bookshop, -$4.00',
      'Hardware, -$3.00',
      'Bakery, -$6.00',
    ]);
  });
});

describe('Receipts — opening a row', () => {
  it('opens the receipt’s own page, never its edit form', async () => {
    const { getByLabelText } = await render(<ReceiptsScreen />);

    await fireEvent.press(getByLabelText('Bakery, -$6.00'));

    expect(router.push).toHaveBeenCalledWith('/receipt/r6');
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});
