import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import TransactionsScreen from '@/app/(tabs)/transactions';
import { NOTHING_HIDDEN, type HiddenHistory } from '@/lib/allowance';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * Activity on free stops at the last 90 days: the Earlier arrow goes no further back than the
 * period holding the window's first day, and where the window cut something off the list says it
 * is kept and opens what Pro shows. Pro steps back seven years.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
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
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/api/charges', () => ({ useCharges: () => ({ data: [] }) }));

// Thursday 10 September 2026: the free window starts on 12 June.
const TODAY = '2026-09-10';

let mockEntries: { id: string; label: string; amount: number; date: string }[] = [];
let mockHidden: HiddenHistory = NOTHING_HIDDEN;
jest.mock('@/api/queries', () => ({
  useLedger: () => ({
    entries: mockEntries.map((row) => ({ ...row, kind: 'receipt', sourceId: 's1' })),
    totals: { in: 0, out: 0, net: 0 },
    hidden: mockHidden,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  usePaymentSources: () => ({ sources: [{ id: 's1', label: 'Everyday' }] }),
}));

jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T09:00:00`));

const NOTICE = 'Older history is saved. Free shows the last 90 days. Skip Pro shows up to 7 years.';

beforeEach(() => {
  jest.clearAllMocks();
  resetProStatusForTests();
  mockEntries = [{ id: 'receipt-1', label: 'Bakery', amount: -6, date: TODAY }];
  mockHidden = NOTHING_HIDDEN;
});

type Screen = Awaited<ReturnType<typeof render>>;

/** Presses Earlier until it is disabled, and returns the period it stopped on. */
async function stepToEarliest(screen: Screen) {
  for (let step = 0; step < 200; step += 1) {
    const earlier = screen.getByLabelText('Earlier');
    if (earlier.props.accessibilityState?.disabled) break;
    await fireEvent.press(earlier);
  }
}

describe('stepping back', () => {
  it('stops at June on free, the month holding the window’s first day', async () => {
    await act(async () => publishProStatus({ pro: false, ready: true }));
    const screen = await render(<TransactionsScreen />);
    await fireEvent.press(screen.getByText('Month'));

    await stepToEarliest(screen);
    expect(screen.getByText('Jun 2026')).toBeTruthy();
  });

  it('goes back seven years on Pro', async () => {
    await act(async () => publishProStatus({ pro: true, ready: true }));
    const screen = await render(<TransactionsScreen />);
    await fireEvent.press(screen.getByText('Year'));

    await stepToEarliest(screen);
    expect(screen.getByText('2019')).toBeTruthy();
  });

  it('is not held to 90 days while the plan is still unknown', async () => {
    const screen = await render(<TransactionsScreen />);
    await fireEvent.press(screen.getByText('Month'));
    for (let step = 0; step < 4; step += 1) await fireEvent.press(screen.getByLabelText('Earlier'));
    expect(screen.getByText('May 2026')).toBeTruthy();
  });
});

describe('the notice', () => {
  it('ends a free list the window cut, and opens what Pro shows', async () => {
    await act(async () => publishProStatus({ pro: false, ready: true }));
    mockHidden = { receipts: true, plans: new Set() };
    const screen = await render(<TransactionsScreen />);

    expect(screen.getByText('Bakery')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(NOTICE));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/pro-feature',
      params: { id: 'history' },
    });
  });

  it('stands in for the empty page when everything in the period is older', async () => {
    await act(async () => publishProStatus({ pro: false, ready: true }));
    mockEntries = [];
    mockHidden = { receipts: false, plans: new Set(['bill-b1']) };
    const screen = await render(<TransactionsScreen />);

    expect(screen.getByLabelText(NOTICE)).toBeTruthy();
    expect(screen.queryByText('Nothing here yet')).toBeNull();
  });

  it('is not drawn when nothing was cut', async () => {
    await act(async () => publishProStatus({ pro: false, ready: true }));
    const screen = await render(<TransactionsScreen />);
    expect(screen.queryByLabelText(NOTICE)).toBeNull();
  });
});
