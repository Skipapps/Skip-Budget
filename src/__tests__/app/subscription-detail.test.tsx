import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import SubscriptionDetailScreen from '@/app/subscription/[id]';

/**
 * A subscription's own page draws the logo by the row's rule (its own choice, else the catalog's,
 * letters when chosen), and the logo opens Change logo for that subscription.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn(), warn: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479' }),
  useMoneyColor: () => () => '#000000',
}));

const mockMark = jest.fn();
jest.mock('@/components/brands/brand-mark', () => ({
  BrandMark: (props: object) => {
    mockMark(props);
    return null;
  },
}));

// The stopped-plan Delete reads the charges, asks, and deletes; none is reached on a running plan.
const mockLoadPast = jest.fn();
const mockChooseDelete = jest.fn();
jest.mock('@/api/past-charges', () => ({
  usePastCharges: () => ({
    ready: true,
    count: 0,
    lastChargedOn: null,
    load: () => mockLoadPast(),
    chooseDelete: (...args: unknown[]) => mockChooseDelete(...args),
    retry: jest.fn(),
  }),
}));
const mockDelete = jest.fn();
jest.mock('@/api/mutations', () => ({
  useDeleteBill: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteSubscription: () => ({ mutateAsync: mockDelete, isPending: false }),
}));
const mockAsk = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => mockAsk }));

let mockRow: Record<string, unknown>;
jest.mock('@/api/queries', () => ({
  useSubscriptions: () => ({
    data: [mockRow],
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  usePaymentSources: () => ({ sources: [] }),
  useLedger: () => ({
    entries: [],
    allEntries: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const CALM = {
  id: 's1',
  name: 'Calm',
  amount: 14.99,
  cycle: 'monthly',
  next_renewal_on: '2026-11-01',
  card_id: null,
  bank_account_id: null,
  note: null,
  active: true,
  brands: { domain: 'calmair.com' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRow = CALM;
});

it('opens Change logo for this subscription from its logo', async () => {
  const screen = await render(<SubscriptionDetailScreen />);

  await fireEvent.press(screen.getByLabelText('Change logo'));

  expect(router.push).toHaveBeenCalledWith({
    pathname: '/change-logo',
    params: { kind: 'subscription', id: 's1', name: 'Calm' },
  });
});

it.each([
  ['the catalog’s logo when nothing was chosen', {}, { domain: 'calmair.com' }],
  ['the website chosen over the catalog’s', { logo_domain: 'calm.com' }, { domain: 'calm.com' }],
  [
    'letters when they were chosen, with no name lookup',
    { logo_domain: 'calm.com', logo_hidden: true },
    { domain: null, hidden: true },
  ],
])('draws %s', async (_, over, expected) => {
  mockRow = { ...CALM, ...over };

  await render(<SubscriptionDetailScreen />);

  expect(mockMark).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Calm', ...expected }));
});

describe('Delete, on a cancelled subscription', () => {
  const DELETE = 'Delete subscription';
  type PastRead = { count: number; lastChargedOn: string | null };

  beforeEach(() => {
    mockLoadPast.mockImplementation(async () => ({ count: 0, lastChargedOn: null }));
    mockChooseDelete.mockResolvedValue(null);
    mockAsk.mockResolvedValue(null);
  });

  it('waits for the charges it has not read, then asks with their count', async () => {
    mockRow = { ...CALM, active: false };
    let arrive: (read: PastRead) => void = () => {};
    mockLoadPast.mockImplementationOnce(() => new Promise((resolve) => (arrive = resolve)));
    const screen = await render(<SubscriptionDetailScreen />);
    await fireEvent.press(screen.getByText(DELETE));
    expect(mockChooseDelete).not.toHaveBeenCalled();

    await act(async () => arrive({ count: 3, lastChargedOn: '2026-09-01' }));
    expect(mockChooseDelete).toHaveBeenCalledWith(
      'Calm',
      { stopped: true },
      { count: 3, lastChargedOn: '2026-09-01' },
    );
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('says the one failure line when the charges cannot be read, and asks nothing', async () => {
    mockRow = { ...CALM, active: false };
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const refused = new Error('read failed');
    mockLoadPast.mockRejectedValueOnce(refused);
    const screen = await render(<SubscriptionDetailScreen />);
    await fireEvent.press(screen.getByText(DELETE));

    expect(mockAsk).toHaveBeenCalledWith({ title: 'Something went wrong. Please try again.' });
    // A real failure, reported with its cause.
    expect(log).toHaveBeenCalledWith('[failure]', refused);
    log.mockRestore();
    expect(mockChooseDelete).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
