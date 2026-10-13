import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import GoalsSentScreen from '@/app/goals-sent';
import SavingsEntryScreen from '@/app/savings-entry';
import SavingsPotScreen from '@/app/savings-pot/[id]';
import SendToGoalsScreen from '@/app/send-to-goals';
import WrapUpScreen from '@/app/wrap-up';
import {
  AUGUST,
  EMERGENCY,
  JULY,
  NEW_PHONE,
  SEPTEMBER,
  TRIP,
  move,
  potView,
} from '@/components/savings/__fixtures__/design';
import { noteWrapUpShown, useWrapUpAutoShow } from '@/components/savings/use-wrap-up-auto-show';
import { resetLocaleForTests } from '@/i18n/store';
import type { GoalView } from '@/lib/goals';
import type { MoveRow, PotView } from '@/lib/savings';

/**
 * The Savings screens with the designs' figures: a month's page (design 2), adding and changing
 * savings, sending to goals (design 3), the Sent page (design 4) and the wrap-up (design 5), and
 * the wrap-up opening itself once.
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
let mockUserId = 'user-1';
jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-11', todayDate: new Date(2026, 9, 11) }),
}));

let mockParams: Record<string, string> = {};
let mockPathname = '/home';
let mockFocused = true;
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    dismissAll: jest.fn(),
    dismiss: jest.fn(),
    canGoBack: () => true,
    canDismiss: () => true,
  },
  useLocalSearchParams: () => mockParams,
  usePathname: () => mockPathname,
  useIsFocused: () => mockFocused,
}));
const mockFinish = jest.fn();
jest.mock('@/lib/nav', () => ({ finishFlowOn: (href: string) => mockFinish(href) }));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));
const mockConfirm = jest.fn(async (_options: Record<string, unknown>) => true);
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
  useDialog: () => jest.fn(),
}));

type Update = {
  earned: number;
  spent: number;
  earnedChange: number;
  spentChange: number;
  amount: number;
  inGoals: number;
  capped: boolean;
} | null;

let mockPots: PotView[];
let mockMoves: MoveRow[];
let mockReady: number;
let mockUpdate: Update;
let mockDue: string | null;
const NOTE = 'Couldn’t refresh · showing your last figures';

/** What is drawn straight after the Send page's "from savings" card. */
function afterSendFrom(): string | undefined {
  const drawn: string[] = [];
  const walk = (node: unknown): void => {
    if (node == null) return;
    if (typeof node === 'string') return void drawn.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    const element = node as { props?: { testID?: string }; children?: unknown[] | null };
    (element.children ?? []).forEach(walk);
    if (element.props?.testID === 'send-from') drawn.push('<end of send-from>');
  };
  walk(screen.toJSON());
  return drawn[drawn.indexOf('<end of send-from>') + 1];
}

// A reload failed behind what is showing; a read failed with nothing cached.
let mockReloadFailed = false;
let mockNothingRead = false;
const mockSavePot = jest.fn();
const mockRemovePot = jest.fn();
const mockSend = jest.fn();
const mockMarkSeen = jest.fn(async (_month: string) => ({ month: _month }));
const mockTakeUpdate = jest.fn();
const mockRefetch = jest.fn();
jest.mock('@/api/savings', () => {
  const mutation = (fn: jest.Mock) => ({ mutateAsync: fn, isPending: false });
  const core = () => ({
    pots: mockPots,
    moves: mockMoves,
    summary: {
      readyToUse: mockReady,
      pots: mockPots,
      withMoneyLeft: mockPots.filter((pot) => pot.left > 0),
    },
    isPending: false,
    isError: mockReloadFailed || mockNothingRead,
    refreshFailed: mockReloadFailed && !mockNothingRead,
    refetch: mockRefetch,
  });
  return {
    useSavingsCore: core,
    useSavings: () => ({ ...core(), soFar: null }),
    useSavingsPot: (id: string) => ({
      pot: mockPots.find((pot) => pot.id === id) ?? null,
      isPending: false,
      isError: false,
      refetch: mockRefetch,
    }),
    useMonthUpdate: () => ({ update: mockUpdate, isPending: false }),
    useUpdateSavingsMonth: () => mutation(mockTakeUpdate),
    useSaveSavingsPot: () => mutation(mockSavePot),
    useRemoveSavingsPot: () => mutation(mockRemovePot),
    useMarkWrapUpSeen: () => mutation(mockMarkSeen),
    useSendToGoals: () => mutation(mockSend),
    useWrapUpDue: () => mockDue,
    // The screens read refusals through this alone; a test throws one ready-made.
    savingsRefusal: (thrown: { refusal?: unknown }) => thrown?.refusal ?? null,
  };
});
let mockActive: GoalView[];
let mockDone: GoalView[];
jest.mock('@/api/goals', () => ({
  useGoals: () => ({
    goals: [...mockActive, ...mockDone],
    moves: mockMoves,
    summary: { saved: 720, target: 2200, active: mockActive, done: mockDone },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockParams = {};
  mockPathname = '/home';
  mockFocused = true;
  mockReloadFailed = false;
  mockNothingRead = false;
  mockPots = [SEPTEMBER, AUGUST, JULY];
  // August's $520 and July's $200 are in goals.
  mockMoves = [
    move({ id: 'm1', goal_id: 'trip', amount: 300, pot_id: 'aug', batch_id: 'b0' }),
    move({ id: 'm2', goal_id: 'ef', amount: 220, pot_id: 'aug', batch_id: 'b0' }),
    move({ id: 'm3', goal_id: 'ef', amount: 200, pot_id: 'jul', batch_id: 'b0' }),
  ];
  mockReady = 850;
  mockUpdate = null;
  mockDue = null;
  mockActive = [TRIP, EMERGENCY];
  mockDone = [NEW_PHONE];
  mockSavePot.mockResolvedValue({ id: 'new' });
  mockRemovePot.mockResolvedValue({ id: 'sep' });
});

describe('a month’s page', () => {
  it('reads as design 2 and sends from this month first', async () => {
    mockParams = { id: 'sep' };
    await render(<SavingsPotScreen />);

    for (const line of [
      'September 2026',
      'Left over',
      'Ready',
      'Moved to savings on 1 Oct',
      'Where your $3,700 went',
      'Spent 83%',
      'Left over 17%',
      'Waiting in savings',
      'Send it to a goal whenever you’re ready.',
    ]) {
      expect([line, screen.queryAllByText(line).length > 0]).toEqual([line, true]);
    }
    expect(screen.getByLabelText('Spent, -$3,060.00')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Send to my goals' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/send-to-goals',
      params: { pot: 'sep' },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Keep it in savings' }));
    expect(router.back).toHaveBeenCalled();
  });

  it('says what part went to goals', async () => {
    mockParams = { id: 'jul' };
    await render(<SavingsPotScreen />);
    expect(screen.getByText('$210 left in savings')).toBeTruthy();
    expect(screen.getByText('$200 went to your goals.')).toBeTruthy();
  });

  it('says an overspent month kindly and offers no Send', async () => {
    mockPots = [
      potView({
        id: 'may',
        month: '2026-05-01',
        earned: 3700,
        spent: 3800,
        amount: 0,
        leftOver: -100,
        status: 'overspent',
        left: 0,
      }),
    ];
    mockParams = { id: 'may' };
    await render(<SavingsPotScreen />);
    expect(screen.getByText('You spent $100.00 more than you earned')).toBeTruthy();
    expect(screen.getByText('Overspent')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send to my goals' })).toBeNull();
  });

  it('draws added savings by its own name, with no earned or spent', async () => {
    mockPots = [
      potView({
        id: 'gift',
        kind: 'added',
        month: null,
        label: 'Birthday gift',
        earned: null,
        spent: null,
        amount: 75,
        added_on: '2026-10-03',
        leftOver: 0,
        left: 75,
        movedOn: '2026-10-03',
      }),
    ];
    mockParams = { id: 'gift' };
    await render(<SavingsPotScreen />);
    expect(screen.getByText('Birthday gift')).toBeTruthy();
    expect(screen.getByText('Added on 3 Oct')).toBeTruthy();
    expect(screen.queryByText(/Where your/)).toBeNull();
    expect(screen.queryByLabelText(/^Earned,/)).toBeNull();
  });

  it('goes back once its pot is gone, but only while it is the page on top', async () => {
    mockParams = { id: 'gone' };
    mockFocused = false;
    const { rerender } = await render(<SavingsPotScreen />);
    expect(router.back).not.toHaveBeenCalled();

    mockFocused = true;
    await rerender(<SavingsPotScreen />);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('opens the edit page from the pencil', async () => {
    mockParams = { id: 'sep' };
    await render(<SavingsPotScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit savings' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/savings-entry',
      params: { id: 'sep' },
    });
  });

  describe('when something in the month changed after its wrap-up', () => {
    const update = {
      earned: 3700,
      spent: 3105,
      earnedChange: 0,
      spentChange: 45,
      amount: 595,
      inGoals: 0,
      capped: false,
    };

    it('says what changed and updates only when asked', async () => {
      mockUpdate = update;
      mockTakeUpdate.mockResolvedValue({ amount: 595 });
      mockParams = { id: 'sep' };
      await render(<SavingsPotScreen />);

      expect(
        screen.getByText('Since your wrap-up, September’s spending went up by $45'),
      ).toBeTruthy();
      expect(screen.queryByText(/This replaces/)).toBeNull();
      expect(mockTakeUpdate).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByRole('button', { name: 'Update to $595' }));
      expect(mockTakeUpdate).toHaveBeenCalledWith({ id: 'sep', earned: 3700, spent: 3105 });
      expect(mockToast).toHaveBeenCalledWith('toast.savings.updated');
    });

    it('does not call an amount a capped update left "the amount you set"', async () => {
      // A capped update held September at its $400 in goals, above its $300 left over.
      mockPots = [
        { ...SEPTEMBER, spent: 3400, leftOver: 300, amount: 400, sentFromIt: 400, left: 0 },
      ];
      mockUpdate = { ...update, spentChange: -50, spent: 3350, amount: 400, capped: true };
      mockParams = { id: 'sep' };
      await render(<SavingsPotScreen />);
      expect(screen.getByTestId('month-update')).toBeTruthy();
      expect(screen.queryByText(/This replaces/)).toBeNull();
    });

    it('says when goals hold it up, and what a hand-set amount it replaces', async () => {
      mockPots = [{ ...SEPTEMBER, amount: 700, left: 700 }];
      mockUpdate = { ...update, spentChange: 300, spent: 3360, amount: 400, capped: true };
      mockParams = { id: 'sep' };
      await render(<SavingsPotScreen />);

      expect(
        screen.getByText('$400 is already in your goals, so September stays at $400.'),
      ).toBeTruthy();
      expect(screen.getByText('This replaces the $700 you set.')).toBeTruthy();
    });
  });
});

describe('adding and changing savings', () => {
  it('lists what is missing, then adds savings dated today', async () => {
    await render(<SavingsEntryScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add to savings' }));
    expect(screen.getByText('To save this, fill in: Name, Amount.')).toBeTruthy();
    expect(mockSavePot).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Birthday gift'), 'Birthday gift');
    await fireEvent.changeText(screen.getByPlaceholderText('0'), '75');
    await fireEvent.press(screen.getByRole('button', { name: 'Add to savings' }));
    expect(mockSavePot).toHaveBeenCalledWith({
      id: null,
      label: 'Birthday gift',
      amount: 75,
      addedOn: '2026-10-11',
      note: '',
    });
    expect(mockToast).toHaveBeenCalledWith('toast.savings.added');
    expect(router.back).toHaveBeenCalled();
  });

  it('refuses $0 for a month that left something, and offers Remove', async () => {
    mockParams = { id: 'sep' };
    await render(<SavingsEntryScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('0'), '0');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      screen.getByText('Savings can’t be $0.00. Remove it from savings instead.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove from savings' })).toBeTruthy();
    expect(mockSavePot).not.toHaveBeenCalled();
  });

  it('refuses to remove a month whose money is in goals, and says how much', async () => {
    mockParams = { id: 'aug' };
    await render(<SavingsEntryScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove from savings' }));
    expect(
      screen.getByText('$520.00 of this is already in your goals. Take it out of a goal first.'),
    ).toBeTruthy();
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockRemovePot).not.toHaveBeenCalled();
  });

  it('removes a month after asking, and lands on Savings', async () => {
    mockParams = { id: 'sep' };
    await render(<SavingsEntryScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove from savings' }));
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Remove September 2026 from savings?',
        message: '$640 comes out of your savings.',
      }),
    );
    expect(mockRemovePot).toHaveBeenCalledWith('sep');
    expect(mockToast).toHaveBeenCalledWith('toast.savings.removed', 'deleted');
    expect(router.dismissTo).toHaveBeenCalledWith('/savings');
  });

  it('makes one move after Remove, and never flashes the failure page as the pot vanishes', async () => {
    mockParams = { id: 'sep' };
    // As the hook does: savings are read again before Remove answers, without the pot.
    mockRemovePot.mockImplementation(async (id: string) => {
      mockPots = mockPots.filter((pot) => pot.id !== id);
      return { id };
    });
    const { rerender } = await render(<SavingsEntryScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove from savings' }));
    await rerender(<SavingsEntryScreen />);

    expect(router.dismissTo).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).toHaveBeenCalledWith('/savings');
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.queryByText('Something went wrong. Please try again.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
  });

  it('leaves quietly when the pot was removed on another phone', async () => {
    mockParams = { id: 'sep' };
    mockSavePot.mockRejectedValueOnce({ refusal: { kind: 'gone', amount: null, id: 'sep' } });
    await render(<SavingsEntryScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(router.dismissTo).toHaveBeenCalledWith('/savings');
    expect(screen.queryByTestId('entry-error')).toBeNull();
  });

  it('says the server’s refusal as a sentence, and anything else as the one failure', async () => {
    mockParams = { id: 'sep' };
    mockSavePot.mockRejectedValueOnce({ refusal: { kind: 'inGoals', amount: 430, id: null } });
    await render(<SavingsEntryScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('0'), '300');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      screen.getByText('$430.00 of this is already in your goals. Take it out of a goal first.'),
    ).toBeTruthy();

    mockSavePot.mockRejectedValueOnce(new Error('offline'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
  });
});

describe('sending to goals', () => {
  it('reads as design 3: what is available and where it comes from', async () => {
    await render(<SendToGoalsScreen />);
    expect(screen.getByText('$850.00 available')).toBeTruthy();
    expect(screen.getByText('September $640 · July $210')).toBeTruthy();
    expect(screen.getByText('Trip')).toBeTruthy();
    expect(screen.getByText('Emergency fund')).toBeTruthy();
    expect(screen.getByText('$0 to goals')).toBeTruthy();
    expect(screen.getByText('$850 stays in savings')).toBeTruthy();
  });

  it('sends $400 and $300 as one batch and leaves $150, then shows what was sent', async () => {
    mockSend.mockResolvedValue({
      batchId: 'b1',
      goals: [
        { goalId: 'trip', amount: 400, before: 300, after: 700 },
        { goalId: 'ef', amount: 300, before: 420, after: 720 },
      ],
    });
    await render(<SendToGoalsScreen />);

    for (let i = 0; i < 8; i += 1) {
      await fireEvent.press(screen.getByRole('button', { name: 'Add $50 for Trip' }));
    }
    for (let i = 0; i < 6; i += 1) {
      await fireEvent.press(screen.getByRole('button', { name: 'Add $50 for Emergency fund' }));
    }
    expect(screen.getByText('$700 to goals')).toBeTruthy();
    expect(screen.getByText('$150 stays in savings')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Send $700' }));
    expect(mockSend).toHaveBeenCalledWith({
      items: [
        { goalId: 'trip', amount: 400 },
        { goalId: 'ef', amount: 300 },
      ],
      preferPotId: null,
      batchId: 'batch-visit',
    });
    expect(mockToast).toHaveBeenCalledWith('toast.goals.sent');
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/goals-sent',
      params: { batch: 'b1', sent: 'trip:400:700,ef:300:720', stays: '150' },
    });
  });

  it('never sends a goal more than it needs, nor more than is ready', async () => {
    await render(<SendToGoalsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Fill Emergency fund' }));
    expect(screen.getByText('$580')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Fill Trip' }));
    // $850 less Emergency fund's $580 leaves $270 of Trip's $900.
    expect(screen.getByText('$270')).toBeTruthy();
    expect(screen.getByText('$0 stays in savings')).toBeTruthy();
    const more = screen.getByRole('button', { name: 'Send $10 more to Trip' });
    expect(more.props.accessibilityState).toEqual({ disabled: true });
  });

  it('splits evenly, in cents, each capped at its need', async () => {
    await render(<SendToGoalsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Split evenly' }));
    expect(screen.getAllByText('$425')).toHaveLength(2);
  });

  it('starts a goal sent from its own page first, already filled as far as savings go', async () => {
    mockParams = { goal: 'ef', pot: 'jul' };
    mockSend.mockResolvedValue({ batchId: 'b2', goals: [] });
    await render(<SendToGoalsScreen />);
    expect(screen.getAllByText(/^Emergency fund|^Trip$/)[0].props.children).toBe('Emergency fund');
    expect(screen.getByText('$580 to goals')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Send $580' }));
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ preferPotId: 'jul', items: [{ goalId: 'ef', amount: 580 }] }),
    );
  });

  it('says what is missing, and the server’s refusals in words', async () => {
    await render(<SendToGoalsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Send $0' }));
    expect(screen.getByText('Choose how much to send to a goal.')).toBeTruthy();
    expect(mockSend).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Add $50 for Trip' }));
    mockSend.mockRejectedValueOnce({ refusal: { kind: 'goalFull', amount: 20, id: 'trip' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Send $50' }));
    expect(screen.getByText('Trip needs $20.00 more.')).toBeTruthy();

    mockSend.mockRejectedValueOnce({ refusal: { kind: 'short', amount: 30, id: null } });
    await fireEvent.press(screen.getByRole('button', { name: 'Send $50' }));
    expect(screen.getByText('You have $30.00 to send.')).toBeTruthy();
  });

  it('reads again and says nothing when a goal went on another phone', async () => {
    await render(<SendToGoalsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add $50 for Trip' }));
    mockSend.mockRejectedValueOnce({ refusal: { kind: 'gone', amount: null, id: 'trip' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Send $50' }));
    expect(mockRefetch).toHaveBeenCalled();
    expect(screen.queryByTestId('send-error')).toBeNull();
  });

  it('keeps the page and what was typed when a reload behind it fails', async () => {
    const { rerender } = await render(<SendToGoalsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add $50 for Trip' }));
    mockReloadFailed = true;
    mockActive = [{ ...TRIP }, { ...EMERGENCY }];
    await rerender(<SendToGoalsScreen />);
    expect(screen.getByText('$50 to goals')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    // Said once, straight under what is ready to send.
    expect(screen.getAllByText(NOTE)).toHaveLength(1);
    expect(afterSendFrom()).toBe(NOTE);
  });

  it('says nothing about refreshing while its reads are fresh', async () => {
    await render(<SendToGoalsScreen />);
    expect(screen.getByTestId('send-from')).toBeTruthy();
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('is the failure page, not a figure without the moves, when a read has nothing cached', async () => {
    // The pots are there but the moves never loaded: ready to send would count money in goals.
    mockNothingRead = true;
    await render(<SendToGoalsScreen />);
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    expect(screen.queryByTestId('send-from')).toBeNull();
    expect(screen.queryByText(NOTE)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('invites a first goal when there is none, or keeps the money in savings', async () => {
    mockActive = [];
    await render(<SendToGoalsScreen />);
    expect(screen.getByText('Create a goal and start collecting for it')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'New goal' }));
    // The new goal comes back here, onto this page.
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/goal-calculator',
      params: { from: 'send' },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Keep it in savings' }));
    expect(router.back).toHaveBeenCalled();
  });
});

describe('the Sent page', () => {
  it('reads as design 4 from the batch’s own moves, one line per goal', async () => {
    mockParams = { batch: 'b1' };
    mockActive = [
      { ...TRIP, saved: 700, percent: 58 },
      { ...EMERGENCY, saved: 720, percent: 72 },
    ];
    mockReady = 150;
    // Trip's $400 drew on two pots: one line all the same.
    mockMoves = [
      move({ id: 's1', goal_id: 'trip', amount: 210, pot_id: 'jul', batch_id: 'b1' }),
      move({ id: 's2', goal_id: 'trip', amount: 190, pot_id: 'sep', batch_id: 'b1' }),
      move({ id: 's3', goal_id: 'ef', amount: 300, pot_id: 'sep', batch_id: 'b1' }),
      move({ id: 'old', goal_id: 'ef', amount: 420, pot_id: 'aug', batch_id: 'b0' }),
    ];
    await render(<GoalsSentScreen />);

    for (const line of [
      'Sent to your goals',
      '$700 moved from savings. Nicely done.',
      '+$400',
      'Now $700 of $1,200',
      '+$300',
      'Now $720 of $1,000',
      '$150.00',
    ]) {
      expect([line, screen.queryAllByText(line).length]).toEqual([line, 1]);
    }

    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(router.back).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'View goals' }));
    expect(mockFinish).toHaveBeenCalledWith('/goals');
  });
});

describe('the Sent page, from the send’s own answer', () => {
  it('lists the goals in the Send page’s order, with what stayed, before any reload lands', async () => {
    // Goals list Emergency fund first; the send went Trip first. No move has reloaded yet.
    mockActive = [EMERGENCY, TRIP];
    mockMoves = [];
    mockReady = 850;
    mockParams = { batch: 'b1', sent: 'trip:400:700,ef:300:720', stays: '150' };
    await render(<GoalsSentScreen />);

    expect(screen.getByText('$700 moved from savings. Nicely done.')).toBeTruthy();
    const names = screen
      .getAllByText(/^(Trip|Emergency fund)$/)
      .map((node) => node.props.children as string);
    expect(names).toEqual(['Trip', 'Emergency fund']);
    expect(screen.getByText('Now $700 of $1,200')).toBeTruthy();
    expect(screen.getByText('$150.00')).toBeTruthy();
  });
});

describe('the wrap-up', () => {
  it('reads as design 5, marks itself seen once, and sends in its own place', async () => {
    mockParams = { month: '2026-09' };
    mockPots = [{ ...SEPTEMBER, wrap_up_seen_at: null }];
    await render(<WrapUpScreen />);

    for (const line of [
      'September wrap-up',
      'Congrats, you saved $640!',
      'Here’s how your September went.',
      'It’s waiting in Savings. Send it to your goals whenever you like.',
    ]) {
      expect([line, screen.queryAllByText(line).length]).toEqual([line, 1]);
    }
    expect(screen.getByLabelText('You earned, $3,700.00')).toBeTruthy();
    expect(screen.getByLabelText('You spent, $3,060.00')).toBeTruthy();
    expect(screen.getByLabelText('Moving to savings, $640.00')).toBeTruthy();
    expect(mockMarkSeen).toHaveBeenCalledTimes(1);
    expect(mockMarkSeen).toHaveBeenCalledWith('2026-09');

    await fireEvent.press(screen.getByRole('button', { name: 'Send to my goals' }));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/send-to-goals',
      params: { pot: 'sep' },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Maybe later' }));
    expect(router.back).toHaveBeenCalled();
  });

  it('is kind about an overspent month: nothing moved, a fresh start, one Got it', async () => {
    mockParams = { month: '2026-09' };
    mockPots = [
      {
        ...SEPTEMBER,
        spent: 3800,
        amount: 0,
        leftOver: -100,
        status: 'overspent',
        left: 0,
      },
    ];
    await render(<WrapUpScreen />);
    expect(screen.getByText('You spent $100.00 more than you earned')).toBeTruthy();
    expect(screen.getByText('Nothing moved to savings. October is a fresh start.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send to my goals' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(router.back).toHaveBeenCalled();
  });

  it('waits calmly for a month still closing, and goes back if it never comes', async () => {
    jest.useFakeTimers();
    try {
      mockParams = { month: '2026-09' };
      mockPots = [];
      await render(<WrapUpScreen />);
      expect(screen.getByText('Getting your September ready')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(8_000);
      });
      expect(mockRefetch).toHaveBeenCalled();
      expect(router.back).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      expect(router.back).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('goes back from a month it cannot read', async () => {
    mockParams = { month: 'September' };
    await render(<WrapUpScreen />);
    expect(router.back).toHaveBeenCalled();
  });
});

describe('the wrap-up opening itself', () => {
  function AutoShow() {
    useWrapUpAutoShow();
    return null;
  }

  it('opens last month’s wrap-up once, from a tab', async () => {
    mockDue = '2026-08';
    const { rerender } = await render(<AutoShow />);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/wrap-up',
      params: { month: '2026-08' },
    });
    await rerender(<AutoShow />);
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('never opens over a form, sign-in or setup, nor over the wrap-up already open', async () => {
    mockDue = '2026-07';
    mockPathname = '/add-receipt';
    await render(<AutoShow />);
    mockPathname = '/wrap-up';
    await render(<AutoShow />);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('remembers per person: someone else on this phone still gets their own', async () => {
    mockDue = '2026-05';
    noteWrapUpShown('user-1', '2026-05');
    mockUserId = 'user-2';
    try {
      await render(<AutoShow />);
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/wrap-up',
        params: { month: '2026-05' },
      });
    } finally {
      mockUserId = 'user-1';
    }
  });

  it('does not open a month the notification already showed', async () => {
    mockDue = '2026-06';
    noteWrapUpShown('user-1', '2026-06');
    await render(<AutoShow />);
    expect(router.push).not.toHaveBeenCalled();
  });
});
