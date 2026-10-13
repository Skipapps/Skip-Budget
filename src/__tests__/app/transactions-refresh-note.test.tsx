import { render, screen } from '@testing-library/react-native';

import TransactionsScreen from '@/app/(tabs)/transactions';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The Transactions tab after a reload that failed behind its figures: the summary and the rows stay,
 * and one quiet line straight under the summary card says they may be behind. With nothing cached
 * the tab is the failure instead, and says nothing about refreshing.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
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
jest.mock('@/api/payment-labels', () => ({
  usePaymentLabels: () => ({
    sources: [{ id: 's1', label: 'Everyday ••1111', color: '#111111', kind: 'account' }],
    labelOf: (id: string) => (id === 's1' ? 'Everyday ••1111' : null),
    isLoading: false,
  }),
}));

/** A Thursday, so the week runs Sunday 6 to Saturday 12 September. */
const TODAY = '2026-09-10';

const mockEntries = [
  { id: 'receipt-r1', label: 'Bakery', amount: -6.5, date: TODAY, kind: 'receipt' },
  { id: 'bill-b1@2026-09-08', label: 'Rent', amount: -1030, date: '2026-09-08', kind: 'bill' },
].map((row) => ({ ...row, sourceId: 's1' }));

let mockRead: { isError: boolean; refreshFailed: boolean };

jest.mock('@/api/queries', () => ({
  useLedger: () => ({
    entries: mockRead.isError ? [] : mockEntries,
    allEntries: mockRead.isError ? [] : mockEntries,
    totals: { in: 0, out: 1036.5, net: -1036.5, count: 2 },
    isLoading: false,
    ...mockRead,
    refetch: jest.fn(),
  }),
}));

// Only the clock is fixed; real timers keep the renders independent of one another.
jest.useFakeTimers({
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
jest.setSystemTime(new Date(`${TODAY}T09:00:00`));

const NOTE = 'Couldn’t refresh · showing your last figures';

/** Every line the page draws, top to bottom, with the summary card's last block marked. */
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
    if (element.props?.testID === 'ledger-stat-labels') out.push('<end of summary>');
  };
  walk(screen.toJSON());
  return out;
}

beforeEach(() => {
  resetLocaleForTests();
  mockRead = { isError: false, refreshFailed: false };
});
afterAll(() => {
  resetLocaleForTests();
  jest.useRealTimers();
});

describe('The Transactions tab', () => {
  it('says nothing about refreshing while its reads are fresh', async () => {
    await render(<TransactionsScreen />);

    expect(screen.getByText('Bakery')).toBeTruthy();
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('keeps its figures and rows and puts the note straight under the summary after a failed reload', async () => {
    mockRead = { isError: false, refreshFailed: true };
    await render(<TransactionsScreen />);

    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    const drawn = drawnInOrder();
    expect(drawn[drawn.indexOf('<end of summary>') + 1]).toBe(NOTE);
    expect(screen.getByText('Bakery')).toBeTruthy();
    expect(screen.getByText('Rent')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });

  it('is the failure, with no note, when there is nothing to show', async () => {
    mockRead = { isError: true, refreshFailed: false };
    await render(<TransactionsScreen />);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(NOTE)).toBeNull();
    expect(screen.queryByText('Bakery')).toBeNull();
  });

  it.each([
    ['es', 'No se pudo actualizar · mostrando tus últimas cifras'],
    ['fr', 'Impossible d’actualiser · voici tes derniers chiffres'],
  ] as const)('says the note in %s', async (language, note) => {
    setLanguage(language);
    mockRead = { isError: false, refreshFailed: true };
    await render(<TransactionsScreen />);

    expect(screen.getAllByText(note)).toHaveLength(1);
    expect(screen.getByText('Bakery')).toBeTruthy();
  });
});
