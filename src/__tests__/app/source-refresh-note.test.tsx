import { act, render, screen } from '@testing-library/react-native';

import SourceDetailScreen from '@/app/source/[id]';
import { resetLocaleForTests } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * A card's or account's page after a reload that failed behind its figures: the balance, the sums
 * and the rows stay, and one quiet line under the sums card says they may be behind. With nothing
 * cached the page is the failure instead, and says nothing about refreshing.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// The real SDK starts a cleanup interval that holds Jest open.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/habits/habit-icon', () => ({ HabitIcon: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => false) }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'src-1' }),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));
jest.mock('@/api/mutations', () => ({
  useDeletePayment: () => ({ mutate: jest.fn(), isPending: false }),
}));

const account = {
  id: 'src-1',
  bank_name: 'Chase',
  nickname: 'Checking',
  account_type: 'checking',
  last4: '7730',
  color: '#123456',
  balance: 1200,
  balance_as_of: '2026-10-01',
};

let mockRead: { isError: boolean; refreshFailed: boolean };

jest.mock('@/api/charges', () => ({ useCharges: () => ({ data: [] }) }));
jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ data: [] }),
  useSourceLedger: () => ({
    source: account,
    kind: 'account',
    card: null,
    account,
    ledger: {
      entries: [
        { id: 'receipt-r1', label: 'Bakery', amount: -6, date: '2026-10-10', kind: 'receipt' },
      ],
      balance: 1194,
      charged: 6,
      paid: 0,
    },
    isLoading: false,
    ...mockRead,
  }),
}));

// Only the clock is fixed; real timers keep the renders independent of one another.
jest.useFakeTimers({
  now: new Date('2026-10-13T12:00:00'),
  doNotFake: [
    'hrtime',
    'nextTick',
    'performance',
    'queueMicrotask',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'requestIdleCallback',
    'cancelIdleCallback',
    'setImmediate',
    'clearImmediate',
    'setInterval',
    'clearInterval',
    'setTimeout',
    'clearTimeout',
  ],
});

const NOTE = 'Couldn’t refresh · showing your last figures';

/** Every line the page draws, top to bottom, with the summary card's end marked. */
function drawnInOrder(): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (node == null) return;
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const element = node as { props?: { testID?: string }; children?: unknown[] | null };
    (element.children ?? []).forEach(walk);
    if (element.props?.testID === 'source-sums') out.push('<end of sums>');
  };
  walk(screen.toJSON());
  return out;
}

beforeEach(async () => {
  resetLocaleForTests();
  resetProStatusForTests();
  mockRead = { isError: false, refreshFailed: false };
  await act(async () => publishProStatus({ pro: true, ready: true }));
});
afterAll(() => {
  resetLocaleForTests();
  jest.useRealTimers();
});

describe('The card and account page', () => {
  it('says nothing about refreshing while its reads are fresh', async () => {
    await render(<SourceDetailScreen />);

    expect(screen.getByTestId('source-sums')).toBeTruthy();
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('keeps its figures and puts the note straight under the sums card after a failed reload', async () => {
    mockRead = { isError: false, refreshFailed: true };
    await render(<SourceDetailScreen />);

    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    const drawn = drawnInOrder();
    expect(drawn[drawn.indexOf('<end of sums>') + 1]).toBe(NOTE);
    expect(screen.getByText('Bakery')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });

  it('is the failure, with no note, when there is nothing to show', async () => {
    mockRead = { isError: true, refreshFailed: false };
    await render(<SourceDetailScreen />);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});
