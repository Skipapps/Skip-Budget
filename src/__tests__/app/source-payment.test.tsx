import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import SourcePaymentScreen from '@/app/source-payment';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { success, warn } from '@/lib/haptics';
import { ToastContext } from '@/providers/toast-context';

/**
 * A payment to a card, or money added to an account: how much, then where it came from. Pinned: the
 * second step exists only when there is another account to choose; its pills are the usable
 * accounts other than the page's own, then a last pill for money from outside; an unanswered Save
 * writes nothing and says why; what is written carries `from_bank_account_id` only when an account
 * was chosen; and the amount survives Back.
 *
 * The page is the real one, walked on its own keypad and pills; only the reads, the write, the
 * clock and the navigation are replaced.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
// The real SDK starts a cleanup interval that holds Jest open.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    danger: '#CC0000',
    body: '#333333',
    onControl: '#FFFFFF',
  }),
  useMoneyColor: () => () => '#000000',
}));

const mockConfirm = jest.fn(async (_options: Record<string, unknown>) => false);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

// A screen raises a toast through the context; outside a provider it does nothing, so this one records.
const mockToast = jest.fn();
function Toasts({ children }: { children: ReactNode }) {
  return <ToastContext.Provider value={mockToast}>{children}</ToastContext.Provider>;
}

jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-08', todayDate: new Date('2026-10-08T00:00:00') }),
}));

const mockCreate = jest.fn(async (_values: Record<string, unknown>) => ({ id: 'payment-new' }));
let mockPending = false;
jest.mock('@/api/mutations', () => ({
  useCreatePayment: () => ({ mutateAsync: mockCreate, isPending: mockPending }),
}));

type Row = { id: string };
type Source = { id: string; label: string; color: string; kind: 'card' | 'account' };

let mockCards: Row[] = [];
let mockAccounts: Row[] = [];
let mockSources: Source[] = [];
jest.mock('@/api/queries', () => ({
  useCards: () => ({ data: mockCards }),
  useBankAccounts: () => ({ data: mockAccounts }),
  usePaymentSources: () => ({ sources: mockSources, isLoading: false }),
}));

const CARD = 'card-1';
const CHECKING = 'acct-chk';
const SAVINGS = 'acct-sav';
const CAPITAL = 'acct-360';

const SOURCES: Record<string, Source> = {
  [CARD]: { id: CARD, label: 'Everyday Visa ••4242', color: '#1A1F71', kind: 'card' },
  [CHECKING]: { id: CHECKING, label: 'Chase Checking ••7730', color: '#117ACA', kind: 'account' },
  [SAVINGS]: { id: SAVINGS, label: 'Ally Savings ••9911', color: '#7B2D8E', kind: 'account' },
  [CAPITAL]: { id: CAPITAL, label: 'Capital One 360 ••2048', color: '#D03027', kind: 'account' },
};

/**
 * What the person has. `usable` is the accounts the "Paid with" pickers offer: all of them on Pro,
 * only the oldest on the free plan.
 */
function openWallet({
  cards = [CARD],
  accounts = [CHECKING, SAVINGS, CAPITAL],
  usable = accounts,
}: { cards?: string[]; accounts?: string[]; usable?: string[] } = {}) {
  mockCards = cards.map((id) => ({ id }));
  mockAccounts = accounts.map((id) => ({ id }));
  mockSources = [...cards, ...usable].map((id) => SOURCES[id]);
}

type Screen = Awaited<ReturnType<typeof render>>;

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));

/** The big button by its words: the title can say the same, and is not a button. */
const pressButton = (screen: Screen, name: string) =>
  fireEvent.press(screen.getByRole('button', { name }));

async function typeAmount(screen: Screen, digits: string) {
  for (const key of digits) await press(screen, key === '.' ? 'Decimal point' : key);
}

/** The pills on the page, in the order drawn. */
const pills = (screen: Screen) =>
  screen.queryAllByRole('radio').map((node) => node.props.accessibilityLabel as string);

/** Opens the page for a card with an amount typed and Continue pressed. */
async function toSecondStep(screen: Screen, amount = '12.50') {
  await typeAmount(screen, amount);
  await pressButton(screen, 'Continue');
}

/** A $12.50 card payment from outside: no key for the account it came out of. */
const FROM_OUTSIDE = {
  card_id: CARD,
  bank_account_id: null,
  amount: 12.5,
  paid_on: '2026-10-08',
  note: null,
};
const FROM_CHECKING = { ...FROM_OUTSIDE, from_bank_account_id: CHECKING };

/** What was handed to the write, key by key: `toEqual` would let a stray `undefined` key through. */
function written(): Record<string, unknown> {
  expect(mockCreate).toHaveBeenCalledTimes(1);
  return mockCreate.mock.calls[0][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConfirm.mockResolvedValue(false);
  mockCreate.mockResolvedValue({ id: 'payment-new' });
  mockPending = false;
  mockParams = { id: CARD };
  openWallet();
});

describe('A card payment with accounts to pay from', () => {
  it('asks how much first, over two steps, with Continue off until there is an amount', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    expect(screen.getByText('Make a payment')).toBeTruthy();
    expect(screen.getByText('How much did you pay?')).toBeTruthy();
    expect(screen.getByLabelText('Step 1 of 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await typeAmount(screen, '12.50');

    expect(screen.getByLabelText('Amount, $12.50')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it.each(['0', '0.', '0.0', '0.00'])('cannot continue on an amount of %s', async (typed) => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await typeAmount(screen, typed);
    await pressButton(screen, 'Continue');

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.getByText('How much did you pay?')).toBeTruthy();
    expect(screen.queryByText('Which account did you pay from?')).toBeNull();
  });

  it('can continue on the smallest amount, a cent', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await typeAmount(screen, '0.01');

    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    await pressButton(screen, 'Continue');
    expect(screen.getByText('Which account did you pay from?')).toBeTruthy();
  });

  it('then asks which account it came out of: every usable account, then "Somewhere else"', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await toSecondStep(screen);

    expect(screen.getByText('Which account did you pay from?')).toBeTruthy();
    expect(
      screen.getByText('The payment comes out of that account and off what the card owes.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Step 2 of 2')).toBeTruthy();
    expect(pills(screen)).toEqual([
      'Chase Checking ••7730',
      'Ally Savings ••9911',
      'Capital One 360 ••2048',
      'Somewhere else',
    ]);
    // Nothing is lit until the person answers.
    for (const label of pills(screen)) expect(screen.getByLabelText(label)).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Save payment' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });

  it('never offers a card to pay from, only accounts', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await toSecondStep(screen);

    expect(pills(screen).filter((label) => label.includes('Visa'))).toEqual([]);
  });

  it('offers only the accounts the plan lets it, on the free plan', async () => {
    openWallet({ usable: [CHECKING] });
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await toSecondStep(screen);

    expect(pills(screen)).toEqual(['Chase Checking ••7730', 'Somewhere else']);
  });

  it('saves a payment from the account chosen, then goes back', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen);

    await press(screen, 'Chase Checking ••7730');
    expect(screen.getByLabelText('Chase Checking ••7730')).toBeSelected();
    await pressButton(screen, 'Save payment');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(written()).toStrictEqual(FROM_CHECKING);
    expect(success).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.payment.added');
  });

  it('lights one pill at a time, and the last pressed wins', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen);

    await press(screen, 'Chase Checking ••7730');
    await press(screen, 'Ally Savings ••9911');

    expect(screen.getByLabelText('Chase Checking ••7730')).not.toBeSelected();
    expect(screen.getByLabelText('Ally Savings ••9911')).toBeSelected();

    await press(screen, 'Somewhere else');

    expect(screen.getByLabelText('Ally Savings ••9911')).not.toBeSelected();
    expect(screen.getByLabelText('Somewhere else')).toBeSelected();
  });

  it('saves a payment from somewhere else with no `from_bank_account_id` at all', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen);

    await press(screen, 'Somewhere else');
    await pressButton(screen, 'Save payment');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    // Not `null`, and not `undefined`: a database without the column still takes this write.
    expect(written()).toStrictEqual(FROM_OUTSIDE);
  });

  it('writes the last account pressed when the person changes their mind', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen);

    await press(screen, 'Ally Savings ••9911');
    await press(screen, 'Somewhere else');
    await press(screen, 'Capital One 360 ••2048');
    await pressButton(screen, 'Save payment');

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(written()).toStrictEqual({ ...FROM_CHECKING, from_bank_account_id: CAPITAL });
  });

  it('leaves the account off the write when the last pill pressed is somewhere else', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen);

    await press(screen, 'Capital One 360 ••2048');
    await press(screen, 'Somewhere else');
    await pressButton(screen, 'Save payment');

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(written()).toStrictEqual(FROM_OUTSIDE);
  });

  it('refuses an unanswered Save, says why, and writes nothing', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen);

    await pressButton(screen, 'Save payment');

    expect(screen.getByText('Choose where the money came from.')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    // Still on the question.
    expect(screen.getByText('Which account did you pay from?')).toBeTruthy();
  });

  it.each([['Chase Checking ••7730'], ['Somewhere else']])(
    'drops the "choose" line once %s is pressed, and then saves',
    async (pill) => {
      const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
      await toSecondStep(screen);
      await pressButton(screen, 'Save payment');
      expect(screen.getByText('Choose where the money came from.')).toBeTruthy();

      await press(screen, pill);

      expect(screen.queryByText('Choose where the money came from.')).toBeNull();
      await pressButton(screen, 'Save payment');
      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(mockCreate).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps the amount when Back steps from the second step to the first', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen, '1000.55');

    await press(screen, 'Back');

    expect(screen.getByText('How much did you pay?')).toBeTruthy();
    expect(screen.getByLabelText('Amount, $1,000.55')).toBeTruthy();
    expect(screen.getByLabelText('Step 1 of 2')).toBeTruthy();
    // Back steps back: it does not leave the page, and nothing is written.
    expect(router.back).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();

    await pressButton(screen, 'Continue');
    await press(screen, 'Somewhere else');
    await pressButton(screen, 'Save payment');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(written().amount).toBe(1000.55);
  });

  it('keeps the account chosen across Back and forward again', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen);
    await press(screen, 'Ally Savings ••9911');

    await press(screen, 'Back');
    await pressButton(screen, 'Continue');

    expect(screen.getByLabelText('Ally Savings ••9911')).toBeSelected();
  });

  it('forgets the "choose" line when Back leaves the step it belonged to', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen);
    await pressButton(screen, 'Save payment');
    expect(screen.getByText('Choose where the money came from.')).toBeTruthy();

    await press(screen, 'Back');
    expect(screen.queryByText('Choose where the money came from.')).toBeNull();

    await pressButton(screen, 'Continue');
    expect(screen.queryByText('Choose where the money came from.')).toBeNull();
  });

  it('leaves the page from Back on the first step, writing nothing', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '5');

    await press(screen, 'Back');

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('shows the one failure line when the write fails, and stays so it can be tried again', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen);
    await press(screen, 'Chase Checking ••7730');

    await pressButton(screen, 'Save payment');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.back).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    // The answer given is still there.
    expect(screen.getByLabelText('Chase Checking ••7730')).toBeSelected();
    expect(screen.getByRole('button', { name: 'Save payment' })).toBeEnabled();
    expect(log).toHaveBeenCalledWith('[failure]', expect.any(Error));

    await pressButton(screen, 'Save payment');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate).toHaveBeenLastCalledWith(FROM_CHECKING);
    expect(mockToast).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it('drops the failure line when another answer is pressed', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen);
    await press(screen, 'Chase Checking ••7730');
    await pressButton(screen, 'Save payment');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

    await press(screen, 'Somewhere else');

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    log.mockRestore();
  });

  it('says it is saving, and writes nothing more, while a write is in flight', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen);
    // The write starts after the last answer; the next render sees it pending.
    mockPending = true;
    await press(screen, 'Somewhere else');

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    await pressButton(screen, 'Saving…');

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['12.5', 12.5],
    ['1000.55', 1000.55],
    ['0.01', 0.01],
    ['19.99', 19.99],
    ['12.345', 12.34],
    ['999999999.99', 999999999.99],
  ])('writes an amount typed as %s as exactly %s', async (typed, amount) => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen, typed);
    await press(screen, 'Somewhere else');

    await pressButton(screen, 'Save payment');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(written().amount).toBe(amount);
    expect(written().paid_on).toBe('2026-10-08');
    expect(written().note).toBeNull();
  });

  it('asks before throwing the payment away, and leaves only when told to', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen);

    await press(screen, 'Close');

    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Cancel this payment?', destructive: true }),
      ),
    );
    expect(router.back).not.toHaveBeenCalled();

    mockConfirm.mockResolvedValue(true);
    await press(screen, 'Close');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('A card payment with no account to pay from', () => {
  beforeEach(() => openWallet({ accounts: [] }));

  it('is one step: the amount, and a button that saves', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    expect(screen.getByText('How much did you pay?')).toBeTruthy();
    // One step draws no "step 1 of 1".
    expect(screen.queryByLabelText(/^Step /)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save payment' })).toBeDisabled();

    await typeAmount(screen, '12.50');
    expect(screen.getByRole('button', { name: 'Save payment' })).toBeEnabled();
  });

  it('saves straight away as a payment from outside, with no question asked', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '12.50');

    await pressButton(screen, 'Save payment');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Which account did you pay from?')).toBeNull();
    expect(screen.queryByText('Choose where the money came from.')).toBeNull();
    expect(written()).toStrictEqual(FROM_OUTSIDE);
    expect(success).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.payment.added');
  });

  it('cannot save an amount of nothing', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '0.00');

    await pressButton(screen, 'Save payment');

    expect(mockCreate).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('shows the failure line on the amount step when the write fails', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '12.50');

    await pressButton(screen, 'Save payment');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.back).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(mockToast).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Amount, $12.50')).toBeTruthy();
    log.mockRestore();
  });

  it('asks before throwing the payment away from the one step too', async () => {
    mockConfirm.mockResolvedValue(true);
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await press(screen, 'Close');

    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Cancel this payment?' }),
      ),
    );
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  });

  it('says it is saving while a write is in flight', async () => {
    mockPending = true;
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '5');

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    await pressButton(screen, 'Saving…');

    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('Money added to an account that has other accounts', () => {
  beforeEach(() => {
    mockParams = { id: CHECKING };
  });

  it('asks how much came in, then where it came from', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    expect(screen.getByText('Add money')).toBeTruthy();
    expect(screen.getByText('How much came in?')).toBeTruthy();
    expect(screen.getByLabelText('Step 1 of 2')).toBeTruthy();

    await typeAmount(screen, '250');
    await pressButton(screen, 'Continue');

    expect(screen.getByText('Where did it come from?')).toBeTruthy();
    expect(
      screen.getByText(
        'Money from another of your accounts comes out of that one. New money, like a gift or a refund, adds to your balance.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Step 2 of 2')).toBeTruthy();
  });

  it('offers the other accounts, never itself, then "New money"', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await toSecondStep(screen, '250');

    expect(pills(screen)).toEqual(['Ally Savings ••9911', 'Capital One 360 ••2048', 'New money']);
    expect(screen.queryByLabelText('Chase Checking ••7730')).toBeNull();
    // The card is not somewhere money comes from.
    expect(screen.queryByLabelText('Everyday Visa ••4242')).toBeNull();
    expect(screen.queryByText('Somewhere else')).toBeNull();
  });

  it('moves money in from another account: this account is the target, that one the source', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen, '250');

    await press(screen, 'Ally Savings ••9911');
    await pressButton(screen, 'Add money');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(written()).toStrictEqual({
      card_id: null,
      bank_account_id: CHECKING,
      amount: 250,
      paid_on: '2026-10-08',
      note: null,
      from_bank_account_id: SAVINGS,
    });
    expect(success).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.money.added');
  });

  it('adds new money with no `from_bank_account_id` at all', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen, '250');

    await press(screen, 'New money');
    await pressButton(screen, 'Add money');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(written()).toStrictEqual({
      card_id: null,
      bank_account_id: CHECKING,
      amount: 250,
      paid_on: '2026-10-08',
      note: null,
    });
    expect(mockToast).toHaveBeenCalledWith('toast.money.added');
  });

  it('refuses an unanswered Add money, says why, and writes nothing', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen, '250');

    await pressButton(screen, 'Add money');

    expect(screen.getByText('Choose where the money came from.')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('keeps the amount through Back', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen, '250.75');

    await press(screen, 'Back');

    expect(screen.getByText('How much came in?')).toBeTruthy();
    expect(screen.getByLabelText('Amount, $250.75')).toBeTruthy();
  });

  it('cannot continue on an amount of nothing', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await typeAmount(screen, '0');

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await pressButton(screen, 'Continue');
    expect(screen.queryByText('Where did it come from?')).toBeNull();
  });

  it('shows the failure line when the write fails', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await toSecondStep(screen, '250');
    await press(screen, 'New money');

    await pressButton(screen, 'Add money');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.back).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('asks before throwing the money away', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await press(screen, 'Close');

    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Cancel adding this money?', destructive: true }),
      ),
    );
  });

  it('offers only the usable accounts other than itself, on the free plan', async () => {
    // The oldest account is the one the free plan lets be paid from; this is the second.
    openWallet({ usable: [CHECKING] });
    mockParams = { id: SAVINGS };
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await toSecondStep(screen, '250');

    expect(pills(screen)).toEqual(['Chase Checking ••7730', 'New money']);
  });
});

describe('Money added to the only account there is', () => {
  beforeEach(() => {
    mockParams = { id: CHECKING };
    // A free plan's single usable account is the page's own: nothing else to come from.
    openWallet({ cards: [CARD], accounts: [CHECKING, SAVINGS], usable: [CHECKING] });
  });

  it('is one step, with no question about where it came from', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    expect(screen.getByText('How much came in?')).toBeTruthy();
    expect(screen.queryByLabelText(/^Step /)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add money' })).toBeDisabled();
  });

  it('saves straight away as money from outside, with no `from_bank_account_id`', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '75.20');

    await pressButton(screen, 'Add money');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Where did it come from?')).toBeNull();
    expect(written()).toStrictEqual({
      card_id: null,
      bank_account_id: CHECKING,
      amount: 75.2,
      paid_on: '2026-10-08',
      note: null,
    });
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.money.added');
  });

  it('asks before throwing the money away from the one step too', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await press(screen, 'Close');

    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Cancel adding this money?' }),
      ),
    );
  });
});

describe('Money added to an account, when the only others are cards', () => {
  it('is still one step: a card is not somewhere money comes from', async () => {
    mockParams = { id: CHECKING };
    openWallet({ cards: [CARD], accounts: [CHECKING] });
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    expect(screen.queryByLabelText(/^Step /)).toBeNull();
    expect(screen.getByRole('button', { name: 'Add money' })).toBeDisabled();
  });
});

describe('A page for something that is neither a card nor an account', () => {
  it('says the one failure line and offers no keypad, rather than a payment to nowhere', async () => {
    mockParams = { id: 'gone' };
    openWallet({ cards: [], accounts: [] });
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByLabelText('1')).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('cannot save while it is still reading which card or account this is', async () => {
    mockParams = { id: CHECKING };
    openWallet({ cards: [], accounts: [], usable: [] });
    mockCards = undefined as unknown as Row[];
    mockAccounts = undefined as unknown as Row[];
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '10');

    await pressButton(screen, 'Add money');

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });
});
