import { fireEvent, render, screen } from '@testing-library/react-native';

import GoalScreen from '@/app/goal/[id]';
import SavingsScreen from '@/app/savings';
import SavingsPotScreen from '@/app/savings-pot/[id]';
import { SEPTEMBER, TRIP } from '@/components/savings/__fixtures__/design';
import { resetLocaleForTests } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The Savings page, a month's page and a goal's page after a reload that failed behind them: the
 * figures and the buttons stay, and one quiet line under the main card says they may be behind.
 * When a read has nothing cached (the moves never loaded while the pots did), there is no figure
 * and no Send or Take money out: those figures would count money already in goals as still here.
 *
 * The reads are faked in the states their hooks report (src/__tests__/api/savings-goal-read-refresh
 * pins those), so this is the screens' half of the rule.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  selection: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null, Skeleton: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: 'light' }),
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/goal-icons', () => ({
  useGoalTypeIcons: () => new Proxy({}, { get: () => () => null }),
  useSavingsIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'batch-visit' }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-11', todayDate: new Date(2026, 9, 11) }),
}));

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: () => true,
    canDismiss: () => true,
  },
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => true,
}));
jest.mock('@/providers/toast-context', () => ({ useToast: () => jest.fn() }));

type ReadFlags = { isError: boolean; refreshFailed: boolean };
const FRESH: ReadFlags = { isError: false, refreshFailed: false };
/** A reload failed while every last answer is still showing. */
const RELOAD_FAILED: ReadFlags = { isError: true, refreshFailed: true };
/** A read has nothing cached, as when the moves never loaded while the pots did. */
const NOTHING_CACHED: ReadFlags = { isError: true, refreshFailed: false };

let mockRead: ReadFlags = FRESH;
/** The reads behind the pot page's update offer, and behind the goal page's Add from savings. */
let mockOther: ReadFlags = FRESH;
const mockPot = SEPTEMBER;
const mockGoal = TRIP;
const mockRefetch = jest.fn();

jest.mock('@/api/savings', () => {
  const mutation = () => ({ mutateAsync: jest.fn(), isPending: false });
  // What the hook hands back whatever its flags say: the pots read, with or without its moves.
  const summary = () => ({ readyToUse: 850, pots: [mockPot], withMoneyLeft: [mockPot] });
  return {
    useSavings: () => ({
      pots: [mockPot],
      moves: [],
      summary: summary(),
      soFar: {
        month: '2026-10',
        earned: 3700,
        spent: 2961.29,
        leftOver: 738.71,
        movesOn: '2026-11-01',
      },
      isPending: false,
      ...mockRead,
      refetch: mockRefetch,
    }),
    useSavingsPot: (id: string) => ({
      pot: id === mockPot.id ? mockPot : null,
      isPending: false,
      ...mockRead,
      refetch: mockRefetch,
    }),
    useSavingsCore: () => ({ summary: summary(), isPending: false, ...mockOther }),
    useMonthUpdate: () => ({ update: null, isPending: false, ...mockOther }),
    useUpdateSavingsMonth: mutation,
    useTakeFromGoal: mutation,
    savingsRefusal: () => null,
  };
});
jest.mock('@/api/goals', () => ({
  useGoal: (id: string) => ({
    goal: id === mockGoal.id ? mockGoal : null,
    moves: [],
    isPending: false,
    ...mockRead,
    refetch: mockRefetch,
  }),
}));

const NOTE = 'Couldn’t refresh · showing your last figures';

/** What is drawn straight after the element with this test id, top to bottom. */
function after(testID: string): string | undefined {
  const drawn: string[] = [];
  const walk = (node: unknown): void => {
    if (node == null) return;
    if (typeof node === 'string') return void drawn.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    const element = node as { props?: { testID?: string }; children?: unknown[] | null };
    (element.children ?? []).forEach(walk);
    if (element.props?.testID === testID) drawn.push(`<end of ${testID}>`);
  };
  walk(screen.toJSON());
  return drawn[drawn.indexOf(`<end of ${testID}>`) + 1];
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockRead = FRESH;
  mockOther = FRESH;
  mockParams = {};
});

describe('the Savings page', () => {
  it('says nothing about refreshing while its reads are fresh', async () => {
    await render(<SavingsScreen />);
    expect(screen.getByTestId('savings-ready-card')).toBeTruthy();
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('keeps its figures after a failed reload, with the note under the summary cards', async () => {
    mockRead = RELOAD_FAILED;
    await render(<SavingsScreen />);

    expect(screen.getByTestId('savings-ready-card')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send to my goals' })).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    expect(after('savings-so-far-card')).toBe(NOTE);
  });

  it('shows no figure and no Send when a read has nothing cached', async () => {
    mockRead = NOTHING_CACHED;
    await render(<SavingsScreen />);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByTestId('savings-ready-card')).toBeNull();
    expect(screen.queryByTestId('savings-so-far-card')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send to my goals' })).toBeNull();
    expect(screen.queryByText(NOTE)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalled();
  });
});

describe('a month’s page', () => {
  beforeEach(() => {
    mockParams = { id: SEPTEMBER.id };
  });

  it('says nothing about refreshing while its reads are fresh', async () => {
    await render(<SavingsPotScreen />);
    expect(screen.getByTestId('pot-hero')).toBeTruthy();
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('keeps its figures and Send after a failed reload, with the note under the hero', async () => {
    mockRead = RELOAD_FAILED;
    await render(<SavingsPotScreen />);

    expect(screen.getByTestId('pot-hero')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send to my goals' })).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    expect(after('pot-hero')).toBe(NOTE);
  });

  it('says the note when only the reads behind its update offer failed to reload', async () => {
    mockOther = RELOAD_FAILED;
    await render(<SavingsPotScreen />);

    expect(screen.getByTestId('pot-hero')).toBeTruthy();
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    expect(after('pot-hero')).toBe(NOTE);
  });

  it('shows no figure, no Send and no pencil when a read has nothing cached', async () => {
    mockRead = NOTHING_CACHED;
    await render(<SavingsPotScreen />);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByTestId('pot-hero')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send to my goals' })).toBeNull();
    expect(screen.queryByLabelText('Edit savings')).toBeNull();
    expect(screen.queryByText(NOTE)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('is the failure, not a blank page, when a failed reload left no such pot', async () => {
    mockParams = { id: 'nowhere' };
    mockRead = RELOAD_FAILED;
    await render(<SavingsPotScreen />);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});

describe('a goal’s page', () => {
  beforeEach(() => {
    mockParams = { id: TRIP.id };
  });

  it('says nothing about refreshing while its reads are fresh', async () => {
    await render(<GoalScreen />);
    expect(screen.getByTestId('goal-hero')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Take money out' })).toBeTruthy();
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('keeps its figures and buttons after a failed reload, with the note under the hero', async () => {
    mockRead = RELOAD_FAILED;
    await render(<GoalScreen />);

    expect(screen.getByTestId('goal-hero')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add from savings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Take money out' })).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    expect(after('goal-hero')).toBe(NOTE);
  });

  it('says the note when only the savings behind Add from savings failed to reload', async () => {
    mockOther = RELOAD_FAILED;
    await render(<GoalScreen />);

    expect(screen.getByRole('button', { name: 'Add from savings' })).toBeTruthy();
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    expect(after('goal-hero')).toBe(NOTE);
  });

  it('shows no figure, no Add, no Take money out and no pencil when a read has nothing cached', async () => {
    mockRead = NOTHING_CACHED;
    await render(<GoalScreen />);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByTestId('goal-hero')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add from savings' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Take money out' })).toBeNull();
    expect(screen.queryByLabelText('Edit goal')).toBeNull();
    expect(screen.queryByText(NOTE)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalled();
  });
});
