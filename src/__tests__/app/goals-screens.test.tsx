import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import GoalScreen from '@/app/goal/[id]';
import GoalCalculatorScreen from '@/app/goal-calculator';
import GoalsScreen from '@/app/goals';
import SaveGoalScreen from '@/app/save-goal';
import {
  EMERGENCY,
  NEW_PHONE,
  TRIP,
  goalView,
  move,
} from '@/components/savings/__fixtures__/design';
import { resetLocaleForTests } from '@/i18n/store';
import type { GoalView } from '@/lib/goals';
import type { MoveRow } from '@/lib/savings';

/**
 * The Goals screens with design 6's figures: the Goals page, a new goal (calculator, then name and
 * type, landing on Goals), changing and deleting a goal, and a goal's own page with its history
 * and Take money out.
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
jest.mock('@/theme/loan-icons', () => ({
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
}));
let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${(mockUuid += 1)}` }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-09', todayDate: new Date(2026, 9, 9) }),
}));

let mockParams: Record<string, string> = {};
let mockFocused = true;
let mockReady = 850;
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    dismiss: jest.fn(),
    canGoBack: () => true,
    canDismiss: () => true,
  },
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => mockFocused,
}));
const mockFinish = jest.fn();
jest.mock('@/lib/nav', () => ({ finishFlowOn: (href: string) => mockFinish(href) }));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));
const mockConfirm = jest.fn(async (_options: Record<string, unknown>) => true);
const mockAsk = jest.fn(async (_request: Record<string, unknown>): Promise<string | null> => null);
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
  useDialog: () => mockAsk,
}));

let mockActive: GoalView[];
let mockDone: GoalView[];
let mockMoves: MoveRow[];
const mockSaveGoal = jest.fn();
const mockDeleteGoal = jest.fn();
const mockTake = jest.fn();
jest.mock('@/api/goals', () => ({
  useGoals: () => ({
    goals: [...mockActive, ...mockDone],
    moves: mockMoves,
    summary: { saved: 720, target: 2200, active: mockActive, done: mockDone },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useGoal: (id: string | undefined) => ({
    goal: [...mockActive, ...mockDone].find((goal) => goal.id === id) ?? null,
    moves: mockMoves.filter((row) => row.goal_id === id),
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useSaveGoal: () => ({ mutateAsync: mockSaveGoal, isPending: false }),
  useDeleteGoal: () => ({ mutateAsync: mockDeleteGoal, isPending: false }),
}));
jest.mock('@/api/savings', () => ({
  useSavingsCore: () => ({ summary: { readyToUse: mockReady } }),
  useTakeFromGoal: () => ({ mutateAsync: mockTake, isPending: false }),
  savingsRefusal: (thrown: { refusal?: unknown }) => thrown?.refusal ?? null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockUuid = 0;
  mockParams = {};
  mockFocused = true;
  mockReady = 850;
  mockActive = [TRIP, EMERGENCY];
  mockDone = [NEW_PHONE];
  mockMoves = [
    move({ id: 'a', goal_id: 'trip', amount: 210, pot_id: 'jul', batch_id: 'b1' }),
    move({ id: 'b', goal_id: 'trip', amount: 190, pot_id: 'sep', batch_id: 'b1' }),
    move({
      id: 'c',
      goal_id: 'trip',
      amount: -100,
      pot_id: 'sep',
      batch_id: 'b2',
      created_at: '2026-10-12T12:00:00Z',
    }),
  ];
  mockSaveGoal.mockResolvedValue({ id: 'g-new' });
  mockDeleteGoal.mockResolvedValue({ id: 'trip', returnMoney: true });
  mockTake.mockResolvedValue({ batchId: 'uuid-1' });
});

async function typeOnPad(keys: string) {
  for (const key of keys) {
    await fireEvent.press(screen.getByLabelText(key === '.' ? 'Decimal point' : key));
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
}

describe('the Goals page', () => {
  it('reads as design 6 and opens a goal or a new one', async () => {
    await render(<GoalsScreen />);
    for (const line of [
      'Saved toward goals',
      '$720.00',
      'of $2,200',
      '2 active · 1 done',
      'Active',
      'Trip',
      'by Mar 2027',
      '25%',
      'About $37 a week to get there',
      'Emergency fund',
      '42%',
      'Completed',
      'New phone',
      '$600 · reached Aug 2026',
    ]) {
      expect([line, screen.queryAllByText(line).length > 0]).toEqual([line, true]);
    }

    await fireEvent.press(screen.getByRole('button', { name: /^Trip, 25%/ }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/goal/[id]',
      params: { id: 'trip' },
    });
    for (const button of screen.getAllByRole('button', { name: 'New goal' })) {
      await fireEvent.press(button);
      expect(router.push).toHaveBeenLastCalledWith('/goal-calculator');
    }
  });

  it('invites a first goal when there is none', async () => {
    mockActive = [];
    mockDone = [];
    await render(<GoalsScreen />);
    expect(screen.getByText('Save for something')).toBeTruthy();
    expect(screen.queryByText('Saved toward goals')).toBeNull();
  });
});

describe('a new goal', () => {
  it('works out the week and month, and carries the figures to the save page', async () => {
    await render(<GoalCalculatorScreen />);
    // $1,000 by April 2027, six months on.
    expect(screen.getByText('To reach $1,000 by Apr 2027')).toBeTruthy();
    expect(screen.getByText(/^About \$\d+ a week$/)).toBeTruthy();
    expect(screen.getByText(/^\$\d+ a month$/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/save-goal',
      params: { target: '1000', date: '2027-04-30', saved: '0' },
    });
  });

  it('can have no date, and then asks for a month to give a rate', async () => {
    await render(<GoalCalculatorScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'No date' }));
    expect(screen.getByText('Pick a month to see what to put aside each week.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/save-goal',
      params: { target: '1000', date: '', saved: '0' },
    });
  });

  it('stores the last day of the month picked', async () => {
    await render(<GoalCalculatorScreen />);
    // The picker opens on the default month's year, 2027.
    await fireEvent.press(screen.getByRole('radio', { name: 'February 2027' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(router.push).toHaveBeenLastCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ date: '2027-02-28' }) }),
    );
  });

  it('asks for a name and a type, then saves and lands on Goals', async () => {
    mockParams = { target: '1200', date: '2027-03-31', saved: '0' };
    await render(<SaveGoalScreen />);
    // No type is picked for the person.
    expect(
      screen.getAllByRole('radio').filter((radio) => radio.props.accessibilityState?.selected),
    ).toEqual([]);
    await fireEvent.press(screen.getByRole('button', { name: 'Save to Goals' }));
    expect(screen.getByText('To save this goal, fill in: Name, Goal type.')).toBeTruthy();
    expect(mockSaveGoal).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Trip to Japan'), 'Japan');
    await fireEvent.press(screen.getByRole('radio', { name: 'Emergency fund' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save to Goals' }));
    expect(mockSaveGoal).toHaveBeenCalledWith({
      id: null,
      values: {
        name: 'Japan',
        icon_id: 'emergency',
        target: 1200,
        target_date: '2027-03-31',
        start_amount: 0,
      },
    });
    expect(mockToast).toHaveBeenCalledWith('toast.goal.added');
    expect(mockFinish).toHaveBeenCalledWith('/goals');
  });

  it('started from an empty Send page, returns there with the new goal', async () => {
    mockParams = { target: '500', date: '', saved: '0', from: 'send' };
    await render(<SaveGoalScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Trip to Japan'), 'Bike');
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save to Goals' }));
    expect(mockToast).toHaveBeenCalledWith('toast.goal.added');
    expect(router.dismiss).toHaveBeenCalledWith(2);
    expect(mockFinish).not.toHaveBeenCalled();
  });

  it('carries the Send page on through the calculator', async () => {
    mockParams = { from: 'send' };
    await render(<GoalCalculatorScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(router.push).toHaveBeenLastCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ from: 'send' }) }),
    );
  });
});

describe('changing and deleting a goal', () => {
  it('saves changes and goes back to the goal', async () => {
    mockParams = { id: 'trip' };
    await render(<SaveGoalScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Trip to Japan'), 'Japan trip');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(mockSaveGoal).toHaveBeenCalledWith({
      id: 'trip',
      values: {
        name: 'Japan trip',
        icon_id: 'trip',
        target: 1200,
        target_date: '2027-03-31',
        start_amount: 0,
      },
    });
    expect(mockToast).toHaveBeenCalledWith('toast.goal.updated');
    expect(router.back).toHaveBeenCalled();
  });

  it('asks where the money from savings goes: back, or spent', async () => {
    mockParams = { id: 'trip' };
    mockAsk.mockResolvedValueOnce('spent');
    await render(<SaveGoalScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete goal' }));

    const asked = mockAsk.mock.calls[0][0] as { actions: { id: string; label: string }[] };
    expect(asked).toMatchObject({
      title: 'Delete Trip?',
      message: '$300.00 in it came from your savings.',
    });
    expect(asked.actions.map((action) => action.label)).toEqual([
      'Put $300.00 back in savings',
      'I spent it',
    ]);
    expect(mockDeleteGoal).toHaveBeenCalledWith({ id: 'trip', returnMoney: false });
    expect(mockToast).toHaveBeenCalledWith('toast.goal.deleted', 'deleted');
    expect(router.dismissTo).toHaveBeenCalledWith('/goals');
  });

  it('makes one move after Delete, and never flashes the failure page as the goal vanishes', async () => {
    mockParams = { id: 'trip' };
    mockAsk.mockResolvedValueOnce('back');
    // As the hook does: goals are read again before Delete answers, without this one.
    mockDeleteGoal.mockImplementation(async ({ id }: { id: string }) => {
      mockActive = mockActive.filter((goal) => goal.id !== id);
      return { id, returnMoney: true };
    });
    const { rerender } = await render(<SaveGoalScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete goal' }));
    await rerender(<SaveGoalScreen />);

    expect(router.dismissTo).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).toHaveBeenCalledWith('/goals');
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.queryByText('Something went wrong. Please try again.')).toBeNull();
  });

  it('asks plainly when nothing in it came from savings', async () => {
    mockActive = [goalView({ id: 'car', name: 'Car', fromSavings: 0, saved: 0, percent: 0 })];
    mockParams = { id: 'car' };
    await render(<SaveGoalScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete goal' }));
    expect(mockAsk).not.toHaveBeenCalled();
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete Car?',
        message: 'It comes off your goals. Your savings don’t change.',
        destructive: true,
      }),
    );
    expect(mockDeleteGoal).toHaveBeenCalledWith({ id: 'car', returnMoney: true });
  });

  it('treats a goal already deleted on another phone as done', async () => {
    mockParams = { id: 'trip' };
    mockAsk.mockResolvedValueOnce('back');
    mockDeleteGoal.mockRejectedValueOnce({ refusal: { kind: 'gone', amount: null, id: 'trip' } });
    await render(<SaveGoalScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete goal' }));
    expect(router.dismissTo).toHaveBeenCalledWith('/goals');
    expect(mockToast).not.toHaveBeenCalled();
    expect(screen.queryByTestId('goal-error')).toBeNull();
  });
});

describe('a goal’s page', () => {
  it('shows where it stands and its history, one line per send', async () => {
    mockActive = [{ ...TRIP, saved: 600, percent: 50, fromSavings: 300 }];
    mockParams = { id: 'trip' };
    await render(<GoalScreen />);
    expect(screen.getByText('50% saved')).toBeTruthy();
    expect(screen.getByText('−$100 back to savings · 12 Oct')).toBeTruthy();
    expect(screen.getByText('+$400 from savings · 11 Oct')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Add from savings' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/send-to-goals',
      params: { goal: 'trip' },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Edit goal' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/save-goal',
      params: { id: 'trip' },
    });
  });

  it('takes money out, never more than came from savings, a new batch each time', async () => {
    mockParams = { id: 'trip' };
    await render(<GoalScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Take money out' }));
    await typeOnPad('500');
    expect(screen.getByText('Up to $300.00 can go back to your savings.')).toBeTruthy();
    expect(mockTake).not.toHaveBeenCalled();
    for (let i = 0; i < 3; i += 1)
      await fireEvent.press(screen.getByLabelText('Delete last digit'));
    await typeOnPad('100');
    expect(mockTake).toHaveBeenLastCalledWith({ goalId: 'trip', amount: 100, batchId: 'uuid-1' });
    expect(mockToast).toHaveBeenCalledWith('toast.goal.takenOut');

    await fireEvent.press(screen.getByRole('button', { name: 'Take money out' }));
    await typeOnPad('50');
    expect(mockTake).toHaveBeenLastCalledWith({ goalId: 'trip', amount: 50, batchId: 'uuid-2' });
  });

  it('tries again under the same batch when the answer was lost', async () => {
    mockParams = { id: 'trip' };
    mockTake.mockRejectedValueOnce(new Error('offline'));
    await render(<GoalScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Take money out' }));
    await typeOnPad('100');
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Take money out' }));
    await typeOnPad('100');
    const batches = mockTake.mock.calls.map(([args]) => (args as { batchId: string }).batchId);
    expect(batches).toEqual(['uuid-1', 'uuid-1']);
  });

  it('offers no Add from savings while savings hold nothing to send', async () => {
    mockReady = 0;
    mockParams = { id: 'trip' };
    await render(<GoalScreen />);
    expect(screen.queryByRole('button', { name: 'Add from savings' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Take money out' })).toBeTruthy();
  });

  it('goes back once its goal is gone, but only while it is the page on top', async () => {
    mockParams = { id: 'gone' };
    mockFocused = false;
    const { rerender } = await render(<GoalScreen />);
    expect(router.back).not.toHaveBeenCalled();
    mockFocused = true;
    await rerender(<GoalScreen />);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('takes a different amount after a failure as a new take-out', async () => {
    mockParams = { id: 'trip' };
    mockTake.mockRejectedValueOnce(new Error('offline'));
    await render(<GoalScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Take money out' }));
    await typeOnPad('100');
    await fireEvent.press(screen.getByRole('button', { name: 'Take money out' }));
    await typeOnPad('120');
    const batches = mockTake.mock.calls.map(([args]) => (args as { batchId: string }).batchId);
    expect(batches).toEqual(['uuid-1', 'uuid-2']);
  });

  it('offers no Add from savings once reached', async () => {
    mockParams = { id: 'phone' };
    await render(<GoalScreen />);
    expect(screen.getByText('$600 · reached Aug 2026')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add from savings' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Take money out' })).toBeTruthy();
  });
});
