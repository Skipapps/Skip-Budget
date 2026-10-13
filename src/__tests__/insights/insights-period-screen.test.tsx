import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import InsightsPeriodRoute from '@/app/insights-period';
import { InsightsPeriodScreen } from '@/components/insights/insights-period-screen';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { onPaymentPicked } from '@/lib/payment-pick';

/**
 * Choose month and Choose year for Insights, on 13 Oct 2026: only months and years with money on
 * record (receipts, charges, pay, payoffs), plus the current one, newest first, months under their
 * year; nothing after today and nothing before the seven kept years. A pick goes back to the page
 * that opened this one, by its id.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => undefined | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/components/ui/skeleton', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { SkeletonList: () => createElement(View, { testID: 'skeleton' }) };
});
let mockGate: unknown = null;
jest.mock('@/components/pro/pro-gate', () => ({ useProGate: () => mockGate }));
jest.mock('@/providers/theme-provider', () => {
  const colors = new Proxy({}, { get: () => '#000000' });
  return { useColors: () => colors, useTheme: () => ({ scheme: 'light', colors }) };
});
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-13', todayDate: new Date('2026-10-13T00:00:00') }),
}));

const READS = ['receipts', 'charges', 'pay', 'payoffs'] as const;
type ReadName = (typeof READS)[number];
let mockFailing: ReadName | null = null;
let mockLoading: ReadName | null = null;
const mockRefetch = Object.fromEntries(READS.map((read) => [read, jest.fn()])) as Record<
  ReadName,
  jest.Mock
>;
let mockRows: Record<ReadName, object[]> = { receipts: [], charges: [], pay: [], payoffs: [] };
/** A reload that failed while the last answer is still held: TanStack keeps `isError` and `data`. */
let mockReloadFailed: ReadName | null = null;
const mockAnswer = (read: ReadName) => ({
  // A read that failed with nothing held has no data at all.
  data: mockFailing === read ? undefined : mockRows[read],
  isLoading: mockLoading === read,
  isError: mockFailing === read || mockReloadFailed === read,
  refetch: mockRefetch[read],
});

jest.mock('@/api/queries', () => ({
  useReceipts: () => mockAnswer('receipts'),
  useLoanPayoffRows: () => mockAnswer('payoffs'),
}));
jest.mock('@/api/charges', () => ({ useCharges: () => mockAnswer('charges') }));
jest.mock('@/api/pay', () => ({ usePayReceived: () => mockAnswer('pay') }));

const radioNames = () =>
  screen.getAllByRole('radio').map((node) => String(node.props.accessibilityLabel));
const ticked = () =>
  screen
    .getAllByRole('radio')
    .filter((node) => node.props.accessibilityState?.selected)
    .map((node) => String(node.props.accessibilityLabel));

beforeEach(() => {
  resetLocaleForTests();
  mockParams = {};
  mockGate = null;
  mockFailing = null;
  mockReloadFailed = null;
  mockLoading = null;
  mockRows = {
    receipts: [{ purchased_on: '2026-09-04' }, { purchased_on: '2025-12-24' }],
    charges: [{ charged_on: '2026-08-01' }, { charged_on: '2026-11-01' }],
    pay: [{ paid_on: '2026-07-15' }, { paid_on: '2025-11-30' }],
    // Older than the seven kept years: never listed.
    payoffs: [{ paid_on: '2025-10-02' }, { paid_on: '2019-05-01' }],
  };
  jest.clearAllMocks();
});
afterAll(() => resetLocaleForTests());

describe('Choose month', () => {
  it('lists only months with money, plus this one, newest first under their year', async () => {
    mockParams = { kind: 'month', owner: 'insights-1', selected: '2026-10' };
    await render(<InsightsPeriodScreen />);

    expect(screen.getByRole('header', { name: 'Choose month' })).toBeTruthy();
    expect(screen.getByRole('header', { name: '2026' })).toBeTruthy();
    expect(screen.getByRole('header', { name: '2025' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: '2019' })).toBeNull();
    // November's charge is ahead of today, so November has nothing in it yet.
    expect(radioNames()).toEqual([
      'October 2026',
      'September 2026',
      'August 2026',
      'July 2026',
      'December 2025',
      'November 2025',
      'October 2025',
    ]);
    expect(ticked()).toEqual(['October 2026']);
  });

  it('ticks the month the page is showing', async () => {
    mockParams = { kind: 'month', owner: 'insights-1', selected: '2025-12' };
    await render(<InsightsPeriodScreen />);
    expect(ticked()).toEqual(['December 2025']);
  });

  it('hands the month picked back to the page that opened it, and goes back', async () => {
    mockParams = { kind: 'month', owner: 'insights-1', selected: '2026-10' };
    const heard = jest.fn();
    const stranger = jest.fn();
    const stop = onPaymentPicked('insights-1', 'month', heard);
    const stopStranger = onPaymentPicked('another-page', 'month', stranger);
    await render(<InsightsPeriodScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'August 2026' }));
    expect(heard).toHaveBeenCalledWith({ owner: 'insights-1', type: 'month', month: '2026-08' });
    expect(stranger).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
    // A second tap before the page has gone does nothing more.
    await fireEvent.press(screen.getByRole('radio', { name: 'July 2026' }));
    expect(heard).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
    stop();
    stopStranger();
  });

  it('reads in Spanish', async () => {
    setLanguage('es');
    mockParams = { kind: 'month', owner: 'insights-1', selected: '2026-10' };
    await render(<InsightsPeriodScreen />);
    expect(radioNames()[0]).toBe('octubre de 2026');
  });
});

describe('Choose year', () => {
  it('lists only years with money, plus this one, newest first, the shown one ticked', async () => {
    mockParams = { kind: 'year', owner: 'insights-1', selected: '2025' };
    await render(<InsightsPeriodScreen />);
    expect(screen.getByRole('header', { name: 'Choose year' })).toBeTruthy();
    expect(radioNames()).toEqual(['2026', '2025']);
    expect(ticked()).toEqual(['2025']);
  });

  it('hands the year picked back and goes back', async () => {
    mockParams = { kind: 'year', owner: 'insights-1', selected: '2026' };
    const heard = jest.fn();
    const stop = onPaymentPicked('insights-1', 'year', heard);
    await render(<InsightsPeriodScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: '2025' }));
    expect(heard).toHaveBeenCalledWith({ owner: 'insights-1', type: 'year', year: 2025 });
    expect(router.back).toHaveBeenCalledTimes(1);
    stop();
  });

  it('lists this year alone when nothing is on record', async () => {
    mockRows = { receipts: [], charges: [], pay: [], payoffs: [] };
    mockParams = { kind: 'year', owner: 'insights-1' };
    await render(<InsightsPeriodScreen />);
    expect(radioNames()).toEqual(['2026']);
    expect(ticked()).toEqual(['2026']);
  });
});

describe('while the reads are out', () => {
  it.each(READS)('lists nothing until %s has answered', async (read) => {
    mockLoading = read;
    mockParams = { kind: 'month', owner: 'insights-1' };
    await render(<InsightsPeriodScreen />);
    expect(screen.getByTestId('insights-period-loading')).toBeTruthy();
    expect(screen.queryAllByRole('radio')).toEqual([]);
  });

  it.each(READS)(
    'says the one failure line when %s fails, and asks every read again',
    async (read) => {
      mockFailing = read;
      mockParams = { kind: 'month', owner: 'insights-1' };
      await render(<InsightsPeriodScreen />);
      expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
      expect(screen.queryAllByRole('radio')).toEqual([]);
      await fireEvent.press(screen.getByText('Try again'));
      expect(READS.filter((each) => mockRefetch[each].mock.calls.length === 1)).toEqual([...READS]);
    },
  );
});

it.each(READS)(
  'keeps the list when a reload of %s fails with its last answer held',
  async (read) => {
    mockReloadFailed = read;
    mockParams = { kind: 'month', owner: 'insights-1', selected: '2026-10' };
    await render(<InsightsPeriodScreen />);
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(radioNames()).toHaveLength(7);
  },
);

it('stays behind the Pro gate', async () => {
  const { Text } = jest.requireActual('react-native');
  mockGate = <Text>Gate</Text>;
  mockParams = { kind: 'month', owner: 'insights-1' };
  await render(<InsightsPeriodScreen />);
  expect(screen.getByText('Gate')).toBeTruthy();
  expect(screen.queryAllByRole('radio')).toEqual([]);
});

it('is the page the insights-period route draws', async () => {
  mockParams = { kind: 'year', owner: 'insights-1', selected: '2026' };
  await render(<InsightsPeriodRoute />);
  expect(screen.getByRole('header', { name: 'Choose year' })).toBeTruthy();
  expect(radioNames()).toEqual(['2026', '2025']);
});
