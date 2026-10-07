import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import BillDetailScreen from '@/app/bill/[id]';

/**
 * One bill's own page: the details, its charges as one timeline (Paid on top, then Upcoming, oldest
 * first) with a Month / Year filter, and the header pencil to edit. A bill deleted from its edit
 * flow steps this page back out rather than showing an empty one.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

let mockId = 'b1';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: mockId }),
}));

jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479' }),
  useMoneyColor: () => () => '#000000',
}));

jest.useFakeTimers({
  now: new Date('2026-10-03T12:00:00'),
  doNotFake: ['nextTick', 'setImmediate'],
});

const mockBills = {
  data: [
    {
      id: 'b1',
      name: 'Housing',
      amount: 1030,
      category_id: 'housing',
      icon_id: null,
      recurrence: 'monthly',
      next_due_on: '2026-11-01',
      starts_on: '2026-09-01',
      card_id: null,
      bank_account_id: 'acc1',
      brands: null,
    },
  ] as unknown[] | undefined,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};

const mockLedger = jest.fn();
jest.mock('@/api/queries', () => ({
  useBills: () => mockBills,
  usePaymentSources: () => ({ sources: [{ id: 'acc1', label: 'Chase Checking ••7730' }] }),
  useLedger: (range: { from: string; to: string }) => {
    mockLedger(range);
    const entry = (date: string, planId = 'b1') => ({
      id: `bill-${planId}@${date}`,
      label: 'Housing',
      amount: -1030,
      date,
      kind: 'bill',
      sourceId: 'acc1',
      planId,
    });
    return {
      entries: [
        entry('2026-09-01'),
        entry('2026-10-01'),
        entry('2026-11-01'),
        entry('2026-12-01'),
        // Another bill's charge, which must not appear on this page.
        entry('2026-10-05', 'b2'),
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    };
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockId = 'b1';
});

it('shows the bill, then its paid and upcoming charges as one timeline', async () => {
  const screen = await render(<BillDetailScreen />);

  expect(screen.getByText('$1,030.00')).toBeTruthy();
  expect(screen.getByText('Monthly')).toBeTruthy();
  expect(screen.getByText('Chase Checking ••7730')).toBeTruthy();
  expect(screen.getByText('Upcoming')).toBeTruthy();
  // The heading, plus the caption on each of the two paid charges.
  expect(screen.getAllByText('Paid')).toHaveLength(3);

  // Paid then Upcoming, oldest first; the first two dates are the Next due and Started lines.
  const dates = screen
    .getAllByText(/^\d{1,2} (Sep|Oct|Nov|Dec) 2026$/)
    .map((node) => node.props.children);
  expect(dates).toEqual([
    '1 Nov 2026', // Next due
    '1 Sep 2026', // Started
    '1 Sep 2026',
    '1 Oct 2026',
    '1 Nov 2026',
    '1 Dec 2026',
  ]);
});

it('opens the edit flow from the pencil', async () => {
  const screen = await render(<BillDetailScreen />);

  await fireEvent.press(screen.getByLabelText('Edit Housing'));

  expect(router.push).toHaveBeenCalledWith('/add-bill?id=b1');
});

it('offers Month and Year only, and reads the whole calendar month', async () => {
  const screen = await render(<BillDetailScreen />);

  expect(screen.queryByLabelText('All')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Month'));

  expect(mockLedger).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-31' });
});

it('steps back out when the bill is gone, rather than showing an empty page', async () => {
  mockId = 'deleted';

  await render(<BillDetailScreen />);

  expect(router.back).toHaveBeenCalled();
});

it('opens Change logo for this bill from its logo', async () => {
  const screen = await render(<BillDetailScreen />);

  await fireEvent.press(screen.getByLabelText('Change logo'));

  expect(router.push).toHaveBeenCalledWith({
    pathname: '/change-logo',
    params: { kind: 'bill', id: 'b1', name: 'Housing' },
  });
});

describe('at large text sizes', () => {
  type Screen = Awaited<ReturnType<typeof render>>;

  const layout = async (screen: Screen, testID: string, width: number) =>
    fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
    });

  /** Next due, Paid from, Category, Started: each label's room and widest word, then the card. */
  async function layOutDetails(screen: Screen, widestLabelWord: number) {
    for (let index = 0; index < 4; index += 1) {
      await layout(screen, `fit-slot-detail-${index}-label`, 90);
      await layout(screen, `fit-copy-detail-${index}-label`, index === 1 ? widestLabelWord : 50);
      await layout(screen, `fit-slot-detail-${index}-value`, 180);
      await layout(screen, `fit-copy-detail-${index}-value`, 80);
    }
    await layout(screen, 'plan-details', 290);
  }

  const rowOf = (screen: Screen, testID: string) =>
    String(screen.getByTestId(testID).parent?.props.className);

  it('prints the amount whole, with its cents, and never shrinks it on its own', async () => {
    const screen = await render(<BillDetailScreen />);
    const figure = screen.getByText('$1,030.00');
    expect(figure.props.numberOfLines).toBeUndefined();
    expect(figure.props.adjustsFontSizeToFit).toBeUndefined();
    expect(figure.props.maxFontSizeMultiplier).toBe(1.2);
  });

  it('keeps each detail beside its label while every word fits', async () => {
    const screen = await render(<BillDetailScreen />);
    await layOutDetails(screen, 60);
    for (let index = 0; index < 4; index += 1) {
      expect(rowOf(screen, `fit-slot-detail-${index}-label`)).toContain('flex-row');
    }
    expect(screen.getByText('Chase Checking ••7730').props.className).toContain('text-right');
  });

  it('puts every detail under its label once one label word cannot fit', async () => {
    const screen = await render(<BillDetailScreen />);
    await layOutDetails(screen, 95);
    for (let index = 0; index < 4; index += 1) {
      expect(rowOf(screen, `fit-slot-detail-${index}-label`)).not.toContain('flex-row');
    }
    // Under its label, a value starts where the label does.
    expect(screen.getByText('Chase Checking ••7730').props.className).not.toContain('text-right');
  });

  it('puts every charge in a card under its date once one date cannot fit beside its amount', async () => {
    const screen = await render(<BillDetailScreen />);
    const paid = ['2026-09-01', '2026-10-01'].map((date) => `bill-b1@${date}`);
    for (const id of paid) {
      await layout(screen, `fit-slot-${id}-date`, 120);
      await layout(screen, `fit-copy-${id}-date`, id.endsWith('09-01') ? 130 : 60);
      await layout(screen, `fit-slot-${id}-amount`, 95);
    }
    await layout(screen, 'charges-paid', 327);

    for (const id of paid) {
      const date = screen.getByTestId(`fit-slot-${id}-date`);
      expect(screen.getByTestId(`fit-slot-${id}-amount`).parent).toBe(date.parent);
    }
    // The upcoming card is its own group and keeps its amounts beside their dates.
    const upcoming = 'bill-b1@2026-11-01';
    expect(screen.getByTestId(`fit-slot-${upcoming}-amount`).parent).not.toBe(
      screen.getByTestId(`fit-slot-${upcoming}-date`).parent,
    );
    expect(screen.getAllByText('-$1,030.00').length).toBeGreaterThan(0);
  });
});
