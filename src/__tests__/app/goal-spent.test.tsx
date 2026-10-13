import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import GoalSpentScreen from '@/app/goal-spent';
import { goalView } from '@/components/savings/__fixtures__/design';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import type { GoalView } from '@/lib/goals';

/**
 * "I spent it": what the goal held, filed as a receipt in the same step as the goal ends; a
 * receipt already added picked instead; or the goal just removed. New TV holds $662.47: $150.00
 * it started with and $512.47 from savings.
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
// The calendar page's module also holds the reminder page, which reaches the database.
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: 'light' }),
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/goal-icons', () => ({
  useGoalTypeIcons: () => new Proxy({}, { get: () => () => null }),
  useSavingsIcons: () => new Proxy({}, { get: () => () => null }),
}));
let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${(mockUuid += 1)}` }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-09', todayDate: new Date(2026, 9, 9) }),
}));

let mockParams: Record<string, string> = {};
let mockFocused = true;
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => mockFocused,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => async () => true,
  useDialog: () => async () => undefined,
}));

/**
 * The store field as the page uses it: the box starts with what was typed, and a catalog store
 * can be picked. Its own search and logo check are BrandField's, tested where it lives.
 */
jest.mock('@/components/brands/brand-field', () => {
  const { createElement: h } = jest.requireActual('react');
  const { Pressable, Text, TextInput, View } = jest.requireActual('react-native');
  return {
    BrandField: (props: {
      label: string;
      value: { name: string } | null;
      initialQuery: string;
      onChange: (value: unknown) => void;
      onQueryChange: (query: string) => void;
    }) =>
      h(
        View,
        null,
        h(Text, null, props.label),
        props.value
          ? h(Text, null, `Picked ${props.value.name}`)
          : h(TextInput, {
              accessibilityLabel: 'Store box',
              defaultValue: props.initialQuery,
              onChangeText: props.onQueryChange,
            }),
        h(
          Pressable,
          {
            accessibilityLabel: 'Pick Best Buy',
            onPress: () =>
              props.onChange({
                brandId: 'bestbuy',
                name: 'Best Buy',
                domain: 'bestbuy.com',
                categoryId: 'electronics',
                logoDomain: null,
                logoHidden: false,
              }),
          },
          h(Text, null, 'Pick Best Buy'),
        ),
      ),
  };
});
jest.mock('@/api/brands', () => ({
  guessCategory: (name: string) => (/\btv\b/i.test(name) ? 'electronics' : 'other'),
}));

let mockGoals: GoalView[];
let mockGoalsPending = false;
let mockGoalsFailed = false;
/** Every goal's moves as read: 'read', still on its way, or a first read that failed. */
let mockMoves: 'read' | 'pending' | 'failed' = 'read';
const mockRefetchGoal = jest.fn();
const mockSpend = jest.fn();
const mockDelete = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/api/goals', () => ({
  useGoal: (id: string | undefined) => ({
    goal: mockGoals.find((goal) => goal.id === id) ?? null,
    moves: [],
    isPending: mockGoalsPending || mockMoves === 'pending',
    isError: mockGoalsFailed || mockMoves === 'failed',
    refetch: mockRefetchGoal,
  }),
  useSpendGoal: () => ({ mutateAsync: mockSpend, isPending: false }),
  useDeleteGoal: () => ({ mutateAsync: mockDelete, isPending: false }),
}));
jest.mock('@/api/mutations', () => ({
  useUpdateReceipt: () => ({ mutateAsync: mockUpdate, isPending: false }),
}));
jest.mock('@/api/savings', () => ({
  savingsRefusal: (thrown: { refusal?: unknown }) => thrown?.refusal ?? null,
  useGoalMoves: () => ({ data: mockMoves === 'read' ? [] : undefined }),
}));
const VISA = {
  id: 'visa',
  label: 'Visa ••4242',
  name: 'Visa',
  last4: '4242',
  color: '#1A1F71',
  kind: 'card',
};
const CHASE = {
  id: 'chase',
  label: 'Chase',
  name: 'Chase',
  last4: null,
  color: '#117ACA',
  kind: 'account',
};
let mockSources: (typeof VISA | typeof CHASE)[] = [];
jest.mock('@/api/queries', () => ({
  usePaymentSources: () => ({ sources: mockSources, isLoading: false }),
}));
type Book = { id: string; name: string; card_id: string | null; bank_account_id: string | null };
let mockBooks: Book[] = [];
let mockBookDefault: string | null = null;
let mockBooksState: 'ready' | 'loading' | 'failed' = 'ready';
const mockRefetchBooks = jest.fn();
jest.mock('@/api/receipt-books', () => ({
  useReceiptBooks: () => ({
    data: mockBooksState === 'ready' ? mockBooks : undefined,
    isSuccess: mockBooksState === 'ready',
    isError: mockBooksState === 'failed',
    refetch: mockRefetchBooks,
  }),
  useReceiptBookDefault: () => ({
    data: mockBookDefault,
    isSuccess: true,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const TV = goalView({
  id: 'tv',
  name: 'New TV',
  icon_id: 'other',
  target: 1000,
  start_amount: 150,
  saved: 662.47,
  fromSavings: 512.47,
  percent: 66,
});

const press = (label: string) => fireEvent.press(screen.getByLabelText(label));
const add = () => fireEvent.press(screen.getByRole('button', { name: 'Add receipt' }));
const FAILURE = 'Something went wrong. Please try again.';

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockUuid = 0;
  mockParams = { id: 'tv' };
  mockFocused = true;
  mockGoals = [TV];
  mockGoalsPending = false;
  mockGoalsFailed = false;
  mockMoves = 'read';
  mockSources = [VISA, CHASE];
  mockBooks = [];
  mockBookDefault = null;
  mockBooksState = 'ready';
  mockSpend.mockResolvedValue({ id: 'tv', receiptId: 'uuid-1' });
  mockDelete.mockResolvedValue({ id: 'tv', returnMoney: false });
  mockUpdate.mockResolvedValue({ id: 'uuid-1' });
});

describe('the page', () => {
  it('shows what the goal held, says it counts once, and starts the store at the goal’s name', async () => {
    await render(<GoalSpentScreen />);
    for (const line of [
      'I spent it',
      'Add what you bought as a receipt here, so it counts once. Adding it again from Receipts would count it twice.',
      'New TV',
      'Everything in this goal',
      '$662.47',
      '$150.00 already saved when you started',
      'Store',
      'Date',
      'Today, Fri Oct 9',
      'Paid with',
    ]) {
      expect([line, screen.queryAllByText(line).length > 0]).toEqual([line, true]);
    }
    expect(screen.getByDisplayValue('New TV')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add receipt' })).toBeTruthy();
  });

  it('offers the receipt already added in accent, and removing in red', async () => {
    await render(<GoalSpentScreen />);
    expect(screen.getByText('I already added it').props.className).toContain('text-accent-ink');
    expect(screen.getByText('Just remove it').props.className).toContain('text-danger');
  });

  it('says nothing about money from before when all of it came from savings', async () => {
    mockGoals = [goalView({ id: 'tv', name: 'New TV', saved: 300, fromSavings: 300 })];
    await render(<GoalSpentScreen />);
    expect(screen.getByText('$300.00')).toBeTruthy();
    expect(screen.queryByText(/already saved when you started/)).toBeNull();
  });

  it('goes back quietly when the goal is no longer open', async () => {
    mockGoals = [];
    await render(<GoalSpentScreen />);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(FAILURE)).toBeNull();
  });

  it('waits, without going back, while the goal is still being read', async () => {
    mockGoals = [];
    mockGoalsPending = true;
    await render(<GoalSpentScreen />);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('draws no figure while the goal’s moves are on their way: it would be only the start', async () => {
    mockMoves = 'pending';
    await render(<GoalSpentScreen />);
    expect(screen.queryByText('$662.47')).toBeNull();
    expect(screen.queryByText('$150.00')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add receipt' })).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('says so, with Try again, when the moves cannot be read', async () => {
    mockMoves = 'failed';
    await render(<GoalSpentScreen />);
    expect(screen.queryByRole('button', { name: 'Add receipt' })).toBeNull();
    expect(screen.getByText(FAILURE)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetchGoal).toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('Add receipt', () => {
  it('lists what is missing, and sends nothing', async () => {
    await render(<GoalSpentScreen />);
    await fireEvent.changeText(screen.getByLabelText('Store box'), '   ');
    await add();
    expect(screen.getByTestId('goal-spent-error').props.children).toBe(
      'To save this receipt, fill in: Store, Paid with.',
    );
    expect(mockSpend).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('files the goal’s money as one receipt with the goal, and lands on Goals with a check', async () => {
    await render(<GoalSpentScreen />);
    await fireEvent.changeText(screen.getByLabelText('Store box'), '  Corner Shop ');
    await press('Yesterday');
    await press('Visa, ending in 4242');
    await add();

    expect(mockSpend).toHaveBeenCalledTimes(1);
    expect(mockSpend).toHaveBeenCalledWith({
      id: 'tv',
      receipt: {
        receiptId: 'uuid-1',
        merchant: 'Corner Shop',
        purchasedOn: '2026-10-08',
        cardId: 'visa',
        bankAccountId: null,
        bookId: null,
      },
    });
    // A typed name with no category of its own needs nothing more written.
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('toast.goal.spent');
    expect(router.dismissTo).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).toHaveBeenCalledWith('/goals');
  });

  it('gives a store picked from the catalog its brand and category on the receipt', async () => {
    await render(<GoalSpentScreen />);
    await press('Pick Best Buy');
    await press('Skip');
    await add();
    expect(mockSpend.mock.calls[0][0].receipt.merchant).toBe('Best Buy');
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'uuid-1',
      values: { brand_id: 'bestbuy', category_id: 'electronics' },
    });
    expect(mockSpend.mock.invocationCallOrder[0]).toBeLessThan(
      mockUpdate.mock.invocationCallOrder[0],
    );
    expect(mockToast).toHaveBeenCalledWith('toast.goal.spent');
  });

  it('files a typed store under the category its name suggests, as the receipt page does', async () => {
    await render(<GoalSpentScreen />);
    await fireEvent.changeText(screen.getByLabelText('Store box'), 'TV World');
    await press('Skip');
    await add();
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'uuid-1',
      values: { brand_id: null, category_id: 'electronics' },
    });
  });

  it('says the failure line when the store could not be written, and tries both again', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('offline'));
    await render(<GoalSpentScreen />);
    await press('Pick Best Buy');
    await press('Skip');
    await add();
    expect(screen.getByTestId('goal-spent-error').props.children).toBe(FAILURE);
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();

    await add();
    expect(mockSpend).toHaveBeenCalledTimes(2);
    expect(mockSpend.mock.calls[1][0].receipt.receiptId).toBe('uuid-1');
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockToast).toHaveBeenCalledWith('toast.goal.spent');
  });

  it('takes an account, or Skip, as what paid', async () => {
    await render(<GoalSpentScreen />);
    await press('Chase');
    await add();
    expect(mockSpend.mock.calls[0][0].receipt).toMatchObject({
      cardId: null,
      bankAccountId: 'chase',
    });

    await press('Skip');
    await add();
    expect(mockSpend.mock.calls[1][0].receipt).toMatchObject({
      merchant: 'New TV',
      purchasedOn: '2026-10-09',
      cardId: null,
      bankAccountId: null,
    });
  });

  it('asks again for a card no longer offered, rather than filing it as Skip', async () => {
    const { rerender } = await render(<GoalSpentScreen />);
    await press('Visa, ending in 4242');
    // Locked or deleted on another phone while the page was open.
    mockSources = [CHASE];
    await rerender(<GoalSpentScreen />);
    await add();
    expect(mockSpend).not.toHaveBeenCalled();
    expect(screen.getByTestId('goal-spent-error').props.children).toBe(
      'To save this receipt, fill in: Paid with.',
    );
  });

  it('takes a day from the calendar', async () => {
    await render(<GoalSpentScreen />);
    await press('Pick date');
    await press('Thursday 1 October 2026');
    await press('Done');
    expect(screen.getByText('Thu Oct 1')).toBeTruthy();
    // What was typed in the store box comes back after the calendar.
    expect(screen.getByDisplayValue('New TV')).toBeTruthy();
    await press('Skip');
    await add();
    expect(mockSpend.mock.calls[0][0].receipt.purchasedOn).toBe('2026-10-01');
  });

  it('files it in the default book, paid with that book’s card until another is picked', async () => {
    mockBooks = [{ id: 'book-home', name: 'Home', card_id: 'visa', bank_account_id: null }];
    mockBookDefault = 'book-home';
    await render(<GoalSpentScreen />);
    expect(screen.getByLabelText('Visa, ending in 4242').props.accessibilityState).toMatchObject({
      selected: true,
    });
    await add();
    expect(mockSpend.mock.calls[0][0].receipt).toMatchObject({
      cardId: 'visa',
      bankAccountId: null,
      bookId: 'book-home',
    });

    await press('Chase');
    await add();
    expect(mockSpend.mock.calls[1][0].receipt).toMatchObject({
      cardId: null,
      bankAccountId: 'chase',
    });
  });

  it('fills in nothing from a book whose card is not offered', async () => {
    mockBooks = [{ id: 'book-home', name: 'Home', card_id: 'old-card', bank_account_id: null }];
    mockBookDefault = 'book-home';
    await render(<GoalSpentScreen />);
    await add();
    expect(mockSpend).not.toHaveBeenCalled();
    expect(screen.getByTestId('goal-spent-error').props.children).toBe(
      'To save this receipt, fill in: Paid with.',
    );
  });

  it('files it in General when books exist but none is the default', async () => {
    mockBooks = [{ id: 'book-home', name: 'Home', card_id: null, bank_account_id: null }];
    await render(<GoalSpentScreen />);
    await press('Skip');
    await add();
    expect(mockSpend.mock.calls[0][0].receipt.bookId).toBeNull();
  });

  it('waits for the books before filing, and says so when they cannot be read', async () => {
    mockBooksState = 'loading';
    const { rerender } = await render(<GoalSpentScreen />);
    await press('Skip');
    expect(
      screen.getByRole('button', { name: 'Add receipt' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    await add();
    expect(mockSpend).not.toHaveBeenCalled();

    mockBooksState = 'failed';
    await rerender(<GoalSpentScreen />);
    await add();
    expect(mockSpend).not.toHaveBeenCalled();
    expect(screen.getByTestId('goal-spent-error').props.children).toBe(FAILURE);
    expect(mockRefetchBooks).toHaveBeenCalled();

    mockBooksState = 'ready';
    await rerender(<GoalSpentScreen />);
    await add();
    expect(mockSpend).toHaveBeenCalledTimes(1);
  });

  it('says the one failure line, stays, and tries again with the same receipt', async () => {
    mockSpend.mockRejectedValueOnce({ code: '08006', message: 'connection failure' });
    await render(<GoalSpentScreen />);
    await press('Skip');
    await add();
    expect(screen.getByTestId('goal-spent-error').props.children).toBe(FAILURE);
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();

    await add();
    expect(mockSpend).toHaveBeenCalledTimes(2);
    expect(mockSpend.mock.calls[1][0].receipt.receiptId).toBe('uuid-1');
    expect(mockToast).toHaveBeenCalledWith('toast.goal.spent');
  });

  it('treats a goal spent or deleted on another phone as done', async () => {
    mockSpend.mockRejectedValueOnce({ refusal: { kind: 'gone', amount: null, id: 'tv' } });
    await render(<GoalSpentScreen />);
    await press('Skip');
    await add();
    expect(router.dismissTo).toHaveBeenCalledWith('/goals');
    expect(mockToast).not.toHaveBeenCalled();
    expect(screen.queryByTestId('goal-spent-error')).toBeNull();
  });

  it('keeps the page drawn as the goal leaves the list, and moves once', async () => {
    mockSpend.mockImplementation(async () => {
      mockGoals = [];
      return { id: 'tv', receiptId: 'uuid-1' };
    });
    const { rerender } = await render(<GoalSpentScreen />);
    await press('Skip');
    await add();
    await rerender(<GoalSpentScreen />);
    expect(router.dismissTo).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.getByText('$662.47')).toBeTruthy();
    expect(screen.queryByText(FAILURE)).toBeNull();
  });
});

describe('I already added it', () => {
  it('opens the receipt picker for this goal, and ends nothing here', async () => {
    await render(<GoalSpentScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'I already added it' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/goal-receipt', params: { id: 'tv' } });
    expect(mockSpend).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe('Just remove it', () => {
  it('ends the goal as spent with no receipt, and lands on Goals with a red X', async () => {
    await render(<GoalSpentScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Just remove it' }));
    expect(mockDelete).toHaveBeenCalledWith({ id: 'tv', returnMoney: false });
    expect(mockSpend).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('toast.goal.deleted', 'deleted');
    expect(router.dismissTo).toHaveBeenCalledWith('/goals');
  });

  it('says the one failure line when it fails', async () => {
    mockDelete.mockRejectedValueOnce(new Error('offline'));
    await render(<GoalSpentScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Just remove it' }));
    expect(screen.getByTestId('goal-spent-error').props.children).toBe(FAILURE);
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });
});

type Node = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;

/** Every line a person can see or hear: text, labels and hints. */
function shownText(node: Node): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(shownText);
  const props = node.props ?? {};
  const spoken = ['accessibilityLabel', 'accessibilityHint'].flatMap((name) =>
    typeof props[name] === 'string' ? [props[name] as string] : [],
  );
  return [...spoken, ...(node.children ?? []).flatMap((child) => shownText(child as Node))];
}

describe.each<[Language, string[]]>([
  [
    'es',
    [
      'Ya lo gasté',
      'Agrega aquí lo que compraste como recibo, para que cuente una sola vez. Si lo agregas otra vez desde Recibos, contaría dos veces.',
      'Todo lo de esta meta',
      'Agregar recibo',
      'Ya lo agregué',
      'Solo eliminarla',
      'Pagado con',
    ],
  ],
  [
    'fr',
    [
      'Je l’ai dépensé',
      'Ajoute ici ce que tu as acheté comme reçu, pour qu’il compte une seule fois. L’ajouter encore depuis Reçus le compterait deux fois.',
      'Tout ce qu’il y a dans cet objectif',
      'Ajouter le reçu',
      'Je l’ai déjà ajouté',
      'Juste le supprimer',
      'Payé avec',
    ],
  ],
])('in %s', (language, lines) => {
  beforeEach(() => setLanguage(language));

  it('reads in the language, with no message key or unfilled {parameter}', async () => {
    await render(<GoalSpentScreen />);
    const shown = shownText(screen.toJSON() as Node);
    for (const line of lines) expect([line, shown.includes(line)]).toEqual([line, true]);
    expect(shown.filter((text) => /\{\w+\}|^(goals|receipts|toast)\.[a-z.]+$/i.test(text))).toEqual(
      [],
    );
    expect(shown).not.toContain('Add receipt');
    expect(shown).not.toContain('I already added it');
  });

  it('lists what is missing in the language', async () => {
    await render(<GoalSpentScreen />);
    await fireEvent.changeText(screen.getByLabelText('Store box'), '');
    await fireEvent.press(screen.getByRole('button', { name: lines[3] }));
    expect(screen.getByTestId('goal-spent-error').props.children).toMatch(
      language === 'es'
        ? /^Para guardar el recibo, completa: Tienda, Pagado con\.$/
        : /^Pour enregistrer le reçu, remplis\s: Magasin, Payé avec\.$/,
    );
  });
});
