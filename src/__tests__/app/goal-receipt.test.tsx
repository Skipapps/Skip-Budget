import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import GoalReceiptScreen from '@/app/goal-receipt';
import { goalView } from '@/components/savings/__fixtures__/design';
import type { Language } from '@/i18n/config';
import { formatCurrency } from '@/lib/format';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import type { GoalView } from '@/lib/goals';

/**
 * "I already added it": the receipt already on the record is picked and named by the goal as it
 * ends, in one step. New TV holds $662.47; the plan lists from 11 Jul 2026.
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
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: 'light' }),
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => true,
}));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));
const mockConfirm = jest.fn(async (_options: Record<string, unknown>) => true);
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
  useDialog: () => async () => undefined,
}));

let mockGoals: GoalView[];
let mockMoves: 'read' | 'pending' | 'failed' = 'read';
const mockRefetchGoal = jest.fn();
const mockLink = jest.fn();
jest.mock('@/api/goals', () => ({
  useGoal: (id: string | undefined) => ({
    goal: mockGoals.find((goal) => goal.id === id) ?? null,
    moves: [],
    isPending: mockMoves === 'pending',
    isError: mockMoves === 'failed',
    refetch: mockRefetchGoal,
  }),
  useLinkGoalReceipt: () => ({ mutateAsync: mockLink, isPending: false }),
}));
jest.mock('@/api/savings', () => ({
  savingsRefusal: (thrown: { refusal?: unknown }) => thrown?.refusal ?? null,
  useGoalMoves: () => ({ data: mockMoves === 'read' ? [] : undefined }),
}));
jest.mock('@/api/history', () => ({
  useHistoryFloor: () => ({ floor: '2026-07-11', free: true }),
}));

type Receipt = {
  id: string;
  merchant: string;
  amount: number;
  purchased_on: string;
  created_at: string;
  habit_id?: string | null;
  brands: null;
};
const receipt = (
  id: string,
  merchant: string,
  amount: number,
  purchasedOn: string,
  extra: Partial<Receipt> = {},
): Receipt => ({
  id,
  merchant,
  amount,
  purchased_on: purchasedOn,
  created_at: `${purchasedOn}T12:00:00Z`,
  brands: null,
  ...extra,
});

let mockReceipts: Receipt[] | undefined;
let mockReceiptsFailed = false;
let mockLinked: { goal_id: string; receipt_id: string; start_amount: number }[];
const mockRefetchReceipts = jest.fn();
const mockRefetchPurchases = jest.fn();
jest.mock('@/api/queries', () => ({
  useReceipts: () => ({
    data: mockReceiptsFailed ? undefined : mockReceipts,
    isError: mockReceiptsFailed,
    refetch: mockRefetchReceipts,
  }),
}));
jest.mock('@/api/goal-purchases', () => ({
  useGoalPurchases: () => ({ data: mockLinked, isError: false, refetch: mockRefetchPurchases }),
}));

const TV = goalView({ id: 'tv', name: 'New TV', saved: 662.47, fromSavings: 512.47 });
const FAILURE = 'Something went wrong. Please try again.';
const linkButton = () => screen.getByRole('button', { name: 'Link receipt' });

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockParams = { id: 'tv' };
  mockGoals = [TV];
  mockMoves = 'read';
  mockReceiptsFailed = false;
  mockReceipts = [
    receipt('r1', 'Best Buy', 662.47, '2026-10-18'),
    receipt('r2', 'Amazon', 699, '2026-10-12'),
    receipt('r3', 'Whole Foods', 84.16, '2026-10-15'),
    receipt('r4', 'Coffee', 4.5, '2026-10-16', { habit_id: 'habit-coffee' }),
    receipt('r5', 'Old TV', 650, '2026-05-01'),
    receipt('r6', 'Sofa shop', 662.47, '2026-10-10'),
  ];
  mockLinked = [{ goal_id: 'sofa', receipt_id: 'r6', start_amount: 0 }];
  mockLink.mockResolvedValue({ id: 'tv', receiptId: 'r1' });
});

describe('the list', () => {
  it('offers receipts near what the goal held first, then recent ones, newest first', async () => {
    await render(<GoalReceiptScreen />);
    expect(screen.getByText('Pick the receipt')).toBeTruthy();
    expect(
      screen.getByText(
        'Pick the receipt you added for what you bought. The goal ends, and the money counts once.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Close to $662.47')).toBeTruthy();
    expect(screen.getByText('Recent')).toBeTruthy();
    expect(
      screen.getAllByRole('radio').map((row) => row.props.accessibilityLabel.split(',')[0]),
    ).toEqual(['Best Buy', 'Amazon', 'Whole Foods']);
    // A habit's day, a receipt before the plan's history, and one another goal names.
    for (const left of ['Coffee', 'Old TV', 'Sofa shop'])
      expect(screen.queryByText(left)).toBeNull();
  });

  it('says there is nothing to pick, with no button, when no receipt can be picked', async () => {
    mockReceipts = [receipt('r4', 'Coffee', 4.5, '2026-10-16', { habit_id: 'habit-coffee' })];
    await render(<GoalReceiptScreen />);
    expect(screen.getByText('There are no receipts to pick yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Link receipt' })).toBeNull();
  });

  it('says so, with Try again, when the receipts cannot be read', async () => {
    mockReceiptsFailed = true;
    await render(<GoalReceiptScreen />);
    expect(screen.getByText(FAILURE)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetchReceipts).toHaveBeenCalled();
    expect(mockRefetchPurchases).toHaveBeenCalled();
  });

  it('goes back quietly when the goal is no longer open', async () => {
    mockGoals = [];
    await render(<GoalReceiptScreen />);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('keeps this goal’s own receipt on offer, so a lost answer can be answered', async () => {
    mockLinked = [
      { goal_id: 'sofa', receipt_id: 'r6', start_amount: 0 },
      { goal_id: 'tv', receipt_id: 'r1', start_amount: 150 },
    ];
    await render(<GoalReceiptScreen />);
    expect(screen.getByText('Best Buy')).toBeTruthy();
    expect(screen.queryByText('Sofa shop')).toBeNull();
  });

  it('draws nothing near the goal’s figure until its moves are read', async () => {
    mockMoves = 'pending';
    await render(<GoalReceiptScreen />);
    expect(screen.queryByText('Close to $662.47')).toBeNull();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('says so, with Try again, when the moves cannot be read', async () => {
    mockMoves = 'failed';
    await render(<GoalReceiptScreen />);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetchGoal).toHaveBeenCalled();
  });
});

describe('Link receipt', () => {
  it('asks for a receipt first, and sends nothing', async () => {
    await render(<GoalReceiptScreen />);
    await fireEvent.press(linkButton());
    expect(screen.getByTestId('goal-receipt-error').props.children).toBe('Pick a receipt first.');
    expect(mockLink).not.toHaveBeenCalled();
  });

  it('names the picked receipt with the goal in one step, and lands on Goals with a check', async () => {
    await render(<GoalReceiptScreen />);
    await fireEvent.press(screen.getByText('Best Buy'));
    expect(screen.getByRole('radio', { name: /^Best Buy/ }).props.accessibilityState).toMatchObject(
      { selected: true, checked: true },
    );
    await fireEvent.press(linkButton());
    expect(mockLink).toHaveBeenCalledTimes(1);
    expect(mockLink).toHaveBeenCalledWith({ id: 'tv', receiptId: 'r1' });
    expect(mockToast).toHaveBeenCalledWith('toast.goal.linked');
    expect(router.dismissTo).toHaveBeenCalledWith('/goals');
  });

  it('says the one failure line, clears the pick and reads the list again', async () => {
    mockLink.mockRejectedValueOnce({
      code: '23505',
      message: 'Another goal already names that receipt.',
    });
    await render(<GoalReceiptScreen />);
    await fireEvent.press(screen.getByText('Amazon'));
    await fireEvent.press(linkButton());
    expect(screen.getByTestId('goal-receipt-error').props.children).toBe(FAILURE);
    expect(screen.getByRole('radio', { name: /^Amazon/ }).props.accessibilityState).toMatchObject({
      selected: false,
    });
    expect(mockRefetchReceipts).toHaveBeenCalled();
    expect(mockRefetchPurchases).toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('treats a goal spent or deleted on another phone as done', async () => {
    mockLink.mockRejectedValueOnce({ refusal: { kind: 'gone', amount: null, id: 'tv' } });
    await render(<GoalReceiptScreen />);
    await fireEvent.press(screen.getByText('Best Buy'));
    await fireEvent.press(linkButton());
    expect(router.dismissTo).toHaveBeenCalledWith('/goals');
    expect(screen.queryByTestId('goal-receipt-error')).toBeNull();
    expect(mockToast).not.toHaveBeenCalled();
  });
});

describe('a receipt for less than the goal held', () => {
  // Whole Foods 84.16 against New TV's 662.47: 578.31 less.
  it('asks first, and links only on Link anyway', async () => {
    await render(<GoalReceiptScreen />);
    await fireEvent.press(screen.getByText('Whole Foods'));
    await fireEvent.press(linkButton());
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockConfirm).toHaveBeenCalledWith({
      title: 'This receipt is $578.31 less than the goal.',
      message: 'The rest stays out of savings.',
      confirmLabel: 'Link anyway',
      cancelLabel: 'Pick another',
    });
    expect(mockLink).toHaveBeenCalledWith({ id: 'tv', receiptId: 'r3' });
    expect(mockToast).toHaveBeenCalledWith('toast.goal.linked');
    expect(router.dismissTo).toHaveBeenCalledWith('/goals');
  });

  it('keeps the page with the pick cleared on Pick another, and links nothing', async () => {
    mockConfirm.mockResolvedValueOnce(false);
    await render(<GoalReceiptScreen />);
    await fireEvent.press(screen.getByText('Whole Foods'));
    await fireEvent.press(linkButton());
    expect(mockLink).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(
      screen.getByRole('radio', { name: /^Whole Foods/ }).props.accessibilityState,
    ).toMatchObject({ selected: false });
    expect(screen.queryByTestId('goal-receipt-error')).toBeNull();
  });

  it.each([
    ['equal to it', 'Best Buy', 'r1'],
    ['more than it', 'Amazon', 'r2'],
  ])('links one %s straight away', async (_, store, id) => {
    await render(<GoalReceiptScreen />);
    await fireEvent.press(screen.getByText(store));
    await fireEvent.press(linkButton());
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockLink).toHaveBeenCalledWith({ id: 'tv', receiptId: id });
  });

  it('asks a cent short too', async () => {
    mockReceipts = [receipt('r9', 'Best Buy', 662.46, '2026-10-18')];
    await render(<GoalReceiptScreen />);
    await fireEvent.press(screen.getByText('Best Buy'));
    await fireEvent.press(linkButton());
    expect(mockConfirm.mock.calls[0][0].title).toBe('This receipt is $0.01 less than the goal.');
  });
});

describe.each<[Language, string, string, string, string]>([
  ['es', 'Elige el recibo', 'Recientes', 'Vincular recibo', 'Primero elige un recibo.'],
  ['fr', 'Choisis le reçu', 'Récents', 'Lier le reçu', 'Choisis d’abord un reçu.'],
])('in %s', (language, title, recent, button, missing) => {
  beforeEach(() => setLanguage(language));

  it('reads in the language', async () => {
    await render(<GoalReceiptScreen />);
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    expect(screen.getByText(recent)).toBeTruthy();
    expect(screen.getByText(language === 'es' ? /^Cerca de / : /^Proche de /)).toBeTruthy();
    expect(screen.queryByText(/\{\w+\}/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: button }));
    expect(screen.getByTestId('goal-receipt-error').props.children).toBe(missing);
  });
});

describe.each<[Language, string, string, string, string]>([
  [
    'es',
    'Este recibo es {difference} menos que la meta.',
    'La diferencia no vuelve a tus ahorros.',
    'Vincular igual',
    'Elegir otro',
  ],
  [
    'fr',
    'Ce reçu est inférieur de {difference} à l’objectif.',
    'La différence ne revient pas dans ton épargne.',
    'Lier quand même',
    'Choisir un autre',
  ],
])('asking in %s', (language, title, message, confirmLabel, cancelLabel) => {
  beforeEach(() => setLanguage(language));

  it('asks before linking a smaller receipt, the difference to the cent', async () => {
    await render(<GoalReceiptScreen />);
    await fireEvent.press(screen.getByText('Whole Foods'));
    await fireEvent.press(
      screen.getByRole('button', { name: language === 'es' ? 'Vincular recibo' : 'Lier le reçu' }),
    );
    expect(mockConfirm).toHaveBeenCalledWith({
      title: title.replace('{difference}', formatCurrency(578.31)),
      message,
      confirmLabel,
      cancelLabel,
    });
    expect(formatCurrency(578.31)).toMatch(/578[,.]31/);
    expect(mockLink).toHaveBeenCalledWith({ id: 'tv', receiptId: 'r3' });
  });
});
