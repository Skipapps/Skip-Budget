import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import SourceDetailScreen from '@/app/source/[id]';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { ToastContext } from '@/providers/toast-context';

/**
 * A card's and an account's own page in English, Spanish and French: summary, rows, actions and
 * states. Money moves between a person's own cards and accounts are named by their other side
 * ("From Savings", "To Visa"), pay is a row of its own, and one payment row stands behind both
 * sides of a move.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// The real SDK starts a cleanup interval that holds Jest open.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
// The filter page reads insets outside any provider.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockConfirm = jest.fn(async (_options: Record<string, unknown>) => false);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'src-1' }),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

// A screen raises a toast through the context; outside a provider it does nothing, so this one records.
const mockToast = jest.fn();
function Toasts({ children }: { children: ReactNode }) {
  return <ToastContext.Provider value={mockToast}>{children}</ToastContext.Provider>;
}

const mockDeletePayment = jest.fn();
jest.mock('@/api/mutations', () => ({
  useDeletePayment: () => ({ mutate: mockDeletePayment, isPending: false }),
}));

const card = {
  id: 'src-1',
  holder: 'Everyday Visa',
  network: 'VISA',
  last4: '4242',
  color: '#000000',
  balance: 100,
  balance_as_of: '2026-09-01',
};
const account = {
  id: 'src-1',
  bank_name: 'Banque',
  nickname: 'Courant',
  account_type: 'checking',
  last4: '1111',
  color: '#000000',
  balance: 900,
  balance_as_of: null,
};

const ENTRIES = [
  { id: 'receipt-r1', label: 'Bakery', amount: -6.5, date: '2026-09-03', kind: 'receipt' },
  { id: 'bill-b1@2026-09-04', label: 'Rent', amount: -1030, date: '2026-09-04', kind: 'bill' },
  // A payment with no note, which the ledger names in English.
  { id: 'payment-p1', label: 'Payment', amount: 500, date: '2026-09-05', kind: 'payment' },
];

// The other side of a move is the name the book gives its source.
const FROM_ACCOUNT = 'Courant ••1111';
const VISA = 'Everyday Visa ••4242';

const CARD_MOVES = [
  {
    id: 'payment-p2',
    label: 'Payment',
    amount: 120.25,
    date: '2026-09-06',
    kind: 'payment',
    counterpart: FROM_ACCOUNT,
  },
  {
    id: 'payment-p3',
    label: 'Mortgage top-up',
    amount: 75,
    date: '2026-09-07',
    kind: 'payment',
    counterpart: FROM_ACCOUNT,
  },
];

const ACCOUNT_MOVES = [
  { id: 'income-s1@2026-09-15', label: 'Acme', amount: 1880, date: '2026-09-15', kind: 'income' },
  {
    id: 'payment-p4',
    label: 'Payment',
    amount: 250,
    date: '2026-09-08',
    kind: 'payment',
    counterpart: 'Épargne ••2222',
  },
  {
    id: 'payment-p5:out',
    label: 'Payment',
    amount: -300,
    date: '2026-09-09',
    kind: 'payment',
    counterpart: VISA,
  },
  // New money: the other side is not one of the person's own.
  {
    id: 'payment-p6',
    label: 'Payment',
    amount: 40,
    date: '2026-09-10',
    kind: 'payment',
    counterpart: null,
  },
];

let mockKind: 'card' | 'account' = 'card';
let mockEntries: object[] = ENTRIES;

jest.mock('@/api/queries', () => ({
  useSourceLedger: () => ({
    source: mockKind === 'card' ? card : account,
    kind: mockKind,
    card: mockKind === 'card' ? card : null,
    account: mockKind === 'account' ? account : null,
    ledger: { entries: mockEntries, balance: 636.5, charged: 1036.5, paid: 500 },
    isLoading: false,
    isError: false,
  }),
}));

const NBSP = '\u00a0';
// Text queries fold whitespace and count a no-break space as whitespace, so they would pass
// "1 030,00 $" written with ordinary spaces. RAW compares the characters as drawn.
const RAW = { normalizer: (text: string) => text };
/** The second argument of a removal: what runs once it has gone through. */
const REMOVAL = expect.objectContaining({ onSuccess: expect.any(Function) });
const RAW_KEY = /^[a-z]+\.[a-zA-Z]+\./;
const PARAM = /\{\w+\}/;

type Screen = Awaited<ReturnType<typeof render>>;
type Json = { props: Record<string, unknown>; children: (Json | string)[] | null };

/** Every line a person can see or hear: text, labels, hints and placeholders. */
function everyLine(screen: Screen): string[] {
  const lines: string[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') {
      lines.push(node);
      return;
    }
    for (const prop of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      const value = node.props[prop];
      if (typeof value === 'string') lines.push(value);
    }
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as Json | Json[] | null;
  (Array.isArray(tree) ? tree : tree ? [tree] : []).forEach(walk);
  return lines;
}

function expectNoLeftovers(screen: Screen) {
  const lines = everyLine(screen);
  expect(lines.length).toBeGreaterThan(0);
  expect(lines.filter((line) => RAW_KEY.test(line) || PARAM.test(line))).toEqual([]);
}

beforeEach(() => {
  resetLocaleForTests();
  mockKind = 'card';
  mockEntries = ENTRIES;
  mockConfirm.mockReset();
  mockConfirm.mockResolvedValue(false);
  mockDeletePayment.mockClear();
  mockToast.mockClear();
  jest.mocked(router.push).mockClear();
});
afterAll(() => resetLocaleForTests());

describe("A card's page in English", () => {
  it('names the other side of a payment, and keeps a note over it', async () => {
    mockEntries = [...ENTRIES, ...CARD_MOVES];
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    expect(
      screen.getByLabelText(`From ${FROM_ACCOUNT}, $120.25, Payment · 6 Sep 2026`),
    ).toBeTruthy();
    expect(screen.getByLabelText('Mortgage top-up, $75.00, Payment · 7 Sep 2026')).toBeTruthy();
    // No other side to name: the plain word.
    expect(screen.getByLabelText('Payment, $500.00, Payment · 5 Sep 2026')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('opens the payment page for this card, not an amount pad', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Make a payment'));

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/source-payment',
      params: { id: 'src-1' },
    });
    expect(screen.queryByLabelText('Delete last digit')).toBeNull();
    expect(screen.queryByText('Done')).toBeNull();
  });

  it('keeps "Charged since" and offers no Pay filter, as a card is never paid into', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    expect(screen.getByText('Charged since')).toBeTruthy();
    expect(screen.queryByText('Money out')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Filter transactions'));

    expect(screen.getAllByText('Payments').length).toBeGreaterThan(1);
    expect(screen.queryByText('Pay')).toBeNull();
  });
});

describe("An account's page in English", () => {
  beforeEach(() => {
    mockKind = 'account';
    mockEntries = ACCOUNT_MOVES;
  });

  it('says what went out as "Money out", never "Spent since"', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    expect(screen.getByText('Money out')).toBeTruthy();
    expect(screen.getByText('-$1,036.50')).toBeTruthy();
    expect(screen.getByText('Money in')).toBeTruthy();
    expect(screen.queryByText('Spent since')).toBeNull();
    expect(screen.queryByText('Charged since')).toBeNull();
  });

  it('shows pay as its own kind of row, named for the pay, that opens nothing', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    const pay = screen.getByLabelText('Acme, $1,880.00, Pay · 15 Sep 2026');
    expect(pay.props.accessibilityRole).toBe('text');
    await fireEvent.press(pay);

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockDeletePayment).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('says where each payment came from and where it went', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    expect(
      screen.getByLabelText('From Épargne ••2222, $250.00, Payment · 8 Sep 2026'),
    ).toBeTruthy();
    expect(screen.getByLabelText(`To ${VISA}, -$300.00, Payment · 9 Sep 2026`)).toBeTruthy();
    // New money has no other side of its own.
    expect(screen.getByLabelText('Payment, $40.00, Payment · 10 Sep 2026')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('opens the payment page for this account from "Add money"', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Add a deposit'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/source-payment',
      params: { id: 'src-1' },
    });
    expect(screen.queryByLabelText('Delete last digit')).toBeNull();
  });

  it('offers the Pay kind on the filter page, and filtering to it leaves only pay', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Filter transactions'));
    await fireEvent.press(screen.getByText('Pay'));
    await fireEvent.press(screen.getByText('Apply'));

    expect(screen.getByLabelText('Filters, 1 active')).toBeTruthy();
    expect(screen.getByLabelText('Acme, $1,880.00, Pay · 15 Sep 2026')).toBeTruthy();
    expect(screen.queryByLabelText(/^Payment,/)).toBeNull();
    expect(screen.queryByLabelText(/^From /)).toBeNull();
  });

  it('filters money in apart from money sent out of the account', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Filter transactions'));
    // The summary says "Money in" too; the filter page draws after it.
    await fireEvent.press(screen.getAllByText('Money in').at(-1)!);
    await fireEvent.press(screen.getByText('Apply'));

    expect(
      screen.getByLabelText('From Épargne ••2222, $250.00, Payment · 8 Sep 2026'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Payment, $40.00, Payment · 10 Sep 2026')).toBeTruthy();
    expect(screen.queryByLabelText(`To ${VISA}, -$300.00, Payment · 9 Sep 2026`)).toBeNull();
  });

  it('filters to money sent out, and only that', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Filter transactions'));
    await fireEvent.press(screen.getByText('Money sent'));
    await fireEvent.press(screen.getByText('Apply'));

    expect(screen.getByLabelText(`To ${VISA}, -$300.00, Payment · 9 Sep 2026`)).toBeTruthy();
    expect(screen.queryByLabelText(/^From /)).toBeNull();
    expect(screen.queryByLabelText(/^Payment,/)).toBeNull();
    expect(screen.queryByLabelText(/Pay · /)).toBeNull();
  });

  it('says the balance goes down when money that came in is removed, and up when money sent out is', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(
      screen.getByLabelText('From Épargne ••2222, $250.00, Payment · 8 Sep 2026'),
    );
    await waitFor(() =>
      expect(mockConfirm).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: 'The balance goes down by that amount.' }),
      ),
    );

    await fireEvent.press(screen.getByLabelText(`To ${VISA}, -$300.00, Payment · 9 Sep 2026`));
    await waitFor(() =>
      expect(mockConfirm).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: 'The balance goes back up by that amount.' }),
      ),
    );
  });

  it('removes the one payment behind either side of a move', async () => {
    mockConfirm.mockResolvedValue(true);
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    // The row that took money out of this account ("payment-p5:out")...
    await fireEvent.press(screen.getByLabelText(`To ${VISA}, -$300.00, Payment · 9 Sep 2026`));
    await waitFor(() => expect(mockDeletePayment).toHaveBeenCalledWith('p5', REMOVAL));
    // ...and the row that brought money in ("payment-p4").
    await fireEvent.press(
      screen.getByLabelText('From Épargne ••2222, $250.00, Payment · 8 Sep 2026'),
    );
    await waitFor(() => expect(mockDeletePayment).toHaveBeenCalledWith('p4', REMOVAL));

    expect(mockDeletePayment).toHaveBeenCalledTimes(2);
    // A move reads as an unnamed payment: it is asked about as one.
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Remove payment?' }));
  });

  it('says "Payment deleted" only once the removal has gone through', async () => {
    mockConfirm.mockResolvedValue(true);
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText(`To ${VISA}, -$300.00, Payment · 9 Sep 2026`));
    await waitFor(() => expect(mockDeletePayment).toHaveBeenCalledTimes(1));

    expect(mockToast).not.toHaveBeenCalled();
    const [, options] = mockDeletePayment.mock.calls[0] as [string, { onSuccess: () => void }];
    options.onSuccess();

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.payment.deleted', 'deleted');
  });

  it('says nothing when the person keeps the payment', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText(`To ${VISA}, -$300.00, Payment · 9 Sep 2026`));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));

    expect(mockDeletePayment).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('asks about a payment by its note, and removes nothing when the answer is no', async () => {
    mockEntries = CARD_MOVES;
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Mortgage top-up, $75.00, Payment · 7 Sep 2026'));

    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Remove mortgage top-up?' }),
      ),
    );
    expect(mockDeletePayment).not.toHaveBeenCalled();
  });

  it('finds a move by the name of its other side', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.changeText(screen.getByPlaceholderText('Search transactions'), 'visa');

    expect(screen.getByLabelText(`To ${VISA}, -$300.00, Payment · 9 Sep 2026`)).toBeTruthy();
    expect(screen.queryByLabelText(/^Acme/)).toBeNull();
    expect(screen.queryByLabelText(/^From /)).toBeNull();
  });
});

describe("A card's page in Spanish", () => {
  beforeEach(() => setLanguage('es'));

  it('reads the summary, rows and actions in Spanish', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    expect(screen.getByLabelText('Editar Everyday Visa')).toBeTruthy();
    expect(screen.getByLabelText('Hacer un pago')).toBeTruthy();
    expect(screen.getByText('Hacer un pago')).toBeTruthy();

    expect(screen.getByText('Saldo al 1 sep 2026')).toBeTruthy();
    expect(screen.getByText('$100.00')).toBeTruthy();
    expect(screen.getByText('Cargos desde entonces')).toBeTruthy();
    expect(screen.getByText('-$1,036.50')).toBeTruthy();
    expect(screen.getByText('Pagos')).toBeTruthy();
    expect(screen.getByText('Adeudo actual')).toBeTruthy();
    // The face's own caption, from the card component.
    expect(screen.getByText('Adeudo')).toBeTruthy();

    expect(screen.getByText('Movimientos')).toBeTruthy();
    expect(screen.getByPlaceholderText('Buscar movimientos')).toBeTruthy();
    expect(screen.getByLabelText('Filtrar movimientos')).toBeTruthy();
    expect(screen.getByLabelText('Bakery, -$6.50, Recibo · 3 sep 2026')).toBeTruthy();
    expect(screen.getByLabelText('Rent, -$1,030.00, Factura · 4 sep 2026')).toBeTruthy();
    expect(screen.getByLabelText('Pago, $500.00, Pago · 5 sep 2026')).toBeTruthy();
    expect(screen.queryByText('Payment')).toBeNull();
    expectNoLeftovers(screen);
  });

  it('opens the payment page for this card from "Hacer un pago"', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Hacer un pago'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/source-payment',
      params: { id: 'src-1' },
    });
    expect(screen.queryByLabelText('Borrar el último dígito')).toBeNull();
    expect(screen.queryByText('Listo')).toBeNull();
  });

  it('names where a payment came from in Spanish, and keeps a note over it', async () => {
    mockEntries = CARD_MOVES;
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    expect(screen.getByLabelText(`Desde ${FROM_ACCOUNT}, $120.25, Pago · 6 sep 2026`)).toBeTruthy();
    expect(screen.getByLabelText('Mortgage top-up, $75.00, Pago · 7 sep 2026')).toBeTruthy();
    expect(screen.queryByText(/^From /)).toBeNull();
    expectNoLeftovers(screen);
  });

  it('asks before removing a payment, in Spanish', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Pago, $500.00, Pago · 5 sep 2026'));

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '¿Quitar este pago?',
        message: 'El saldo vuelve a subir en esa cantidad.',
        confirmLabel: 'Quitar',
      }),
    );
  });

  it('asks about a payment that names its other side as an unnamed one', async () => {
    mockEntries = CARD_MOVES;
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(
      screen.getByLabelText(`Desde ${FROM_ACCOUNT}, $120.25, Pago · 6 sep 2026`),
    );

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: '¿Quitar este pago?' }),
    );
  });

  it('finds the payment by its Spanish name', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.changeText(screen.getByPlaceholderText('Buscar movimientos'), 'pago');

    expect(screen.getByLabelText('Pago, $500.00, Pago · 5 sep 2026')).toBeTruthy();
    expect(screen.queryByText('Bakery')).toBeNull();
  });

  it('finds a move by the Spanish word for where it came from', async () => {
    mockEntries = [...ENTRIES, ...CARD_MOVES];
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.changeText(screen.getByPlaceholderText('Buscar movimientos'), 'desde');

    expect(screen.getByLabelText(`Desde ${FROM_ACCOUNT}, $120.25, Pago · 6 sep 2026`)).toBeTruthy();
    expect(screen.queryByLabelText(/^Pago, /)).toBeNull();
    expect(screen.queryByText('Bakery')).toBeNull();
  });

  it('offers no Pay kind on a card’s filter page', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Filtrar movimientos'));

    expect(screen.getAllByText('Pagos').length).toBeGreaterThan(1);
    expect(screen.queryByText('Sueldo')).toBeNull();
  });
});

describe("An account's page in Spanish", () => {
  beforeEach(() => {
    setLanguage('es');
    mockKind = 'account';
    mockEntries = ACCOUNT_MOVES;
  });

  it('reads money out, pay and the moves in Spanish', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    expect(screen.getByText('Dinero que salió')).toBeTruthy();
    expect(screen.getByText('-$1,036.50')).toBeTruthy();
    expect(screen.getByText('Dinero recibido')).toBeTruthy();
    expect(screen.queryByText('Gastos desde entonces')).toBeNull();

    expect(screen.getByLabelText('Acme, $1,880.00, Sueldo · 15 sep 2026')).toBeTruthy();
    expect(screen.getByLabelText('Desde Épargne ••2222, $250.00, Pago · 8 sep 2026')).toBeTruthy();
    expect(screen.getByLabelText(`A ${VISA}, -$300.00, Pago · 9 sep 2026`)).toBeTruthy();
    expect(screen.getByLabelText('Pago, $40.00, Pago · 10 sep 2026')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('opens the payment page for this account from "Agregar dinero"', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Agregar un depósito'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/source-payment',
      params: { id: 'src-1' },
    });
  });

  it('offers the Pay kind on the filter page in Spanish', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Filtrar movimientos'));
    await fireEvent.press(screen.getByText('Sueldo'));
    await fireEvent.press(screen.getByText('Aplicar'));

    expect(screen.getByLabelText('Acme, $1,880.00, Sueldo · 15 sep 2026')).toBeTruthy();
    expect(screen.queryByLabelText(/^Pago, /)).toBeNull();
  });

  it('removes the one payment behind a row that took money out, in Spanish', async () => {
    mockConfirm.mockResolvedValue(true);
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText(`A ${VISA}, -$300.00, Pago · 9 sep 2026`));

    await waitFor(() => expect(mockDeletePayment).toHaveBeenCalledWith('p5', REMOVAL));
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: '¿Quitar este pago?' }),
    );
  });
});

describe("An account's page in French", () => {
  beforeEach(() => {
    setLanguage('fr');
    setCurrency('CAD');
    mockKind = 'account';
  });

  it('reads the summary and actions in French', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    expect(screen.getByLabelText('Modifier Courant')).toBeTruthy();
    expect(screen.getByLabelText('Ajouter un dépôt')).toBeTruthy();
    expect(screen.getByText('Ajouter de l’argent')).toBeTruthy();

    expect(screen.getByText('Solde de départ')).toBeTruthy();
    expect(screen.getByText(`900,00${NBSP}$`, RAW)).toBeTruthy();
    expect(screen.getByText('Argent sorti')).toBeTruthy();
    expect(screen.queryByText('Dépensé depuis')).toBeNull();
    expect(screen.getByText('Argent reçu')).toBeTruthy();
    expect(screen.getByText('Solde actuel')).toBeTruthy();
    expect(screen.getByText(`636,50${NBSP}$`, RAW)).toBeTruthy();
    expect(screen.getByText('Chèques')).toBeTruthy();
    expect(screen.getByText('Transactions')).toBeTruthy();
    expect(
      screen.getByLabelText(`Rent, -1${NBSP}030,00${NBSP}$, Facture · 4 sept. 2026`, RAW),
    ).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('opens the payment page for this account from "Ajouter de l’argent"', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Ajouter un dépôt'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/source-payment',
      params: { id: 'src-1' },
    });
    expect(screen.queryByLabelText('Effacer le dernier chiffre')).toBeNull();
  });

  it('reads pay and the moves in French, with the figures written the French way', async () => {
    mockEntries = ACCOUNT_MOVES;
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    expect(
      screen.getByLabelText(`Acme, 1${NBSP}880,00${NBSP}$, Paie · 15 sept. 2026`, RAW),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(`Depuis Épargne ••2222, 250,00${NBSP}$, Paiement · 8 sept. 2026`, RAW),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(`Vers ${VISA}, -300,00${NBSP}$, Paiement · 9 sept. 2026`, RAW),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(`Paiement, 40,00${NBSP}$, Paiement · 10 sept. 2026`, RAW),
    ).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('asks before removing either side of a move, in French, and removes the one payment', async () => {
    mockEntries = ACCOUNT_MOVES;
    mockConfirm.mockResolvedValue(true);
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(
      screen.getByLabelText(`Vers ${VISA}, -300,00${NBSP}$, Paiement · 9 sept. 2026`, RAW),
    );
    await waitFor(() => expect(mockDeletePayment).toHaveBeenCalledWith('p5', REMOVAL));
    await fireEvent.press(
      screen.getByLabelText(`Depuis Épargne ••2222, 250,00${NBSP}$, Paiement · 8 sept. 2026`, RAW),
    );
    await waitFor(() => expect(mockDeletePayment).toHaveBeenCalledWith('p4', REMOVAL));

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: `Retirer ce paiement${NBSP}?`,
        message: 'Le solde remonte de ce montant.',
        confirmLabel: 'Retirer',
      }),
    );
  });

  it('lets the money button and the summary grow at large text, nothing cut', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    // The button's height is a minimum, so a label on two lines still fits inside it.
    const button = screen.getByLabelText('Ajouter un dépôt');
    expect(String(button.props.className)).toContain('min-h-14');
    expect(String(button.props.className)).not.toMatch(/(^|\s)h-14(\s|$)/);
    const words = screen.getByText('Ajouter de l’argent');
    expect(String(words.props.className)).toContain('shrink');
    expect(words.props.maxFontSizeMultiplier).toBe(1.4);

    // Once one label cannot sit beside its figure, every figure in the card goes under its label.
    const layout = async (testID: string, width: number) =>
      fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
      });
    const lines = ['start', 'charged', 'paid', 'now'];
    for (const id of lines) {
      await layout(`fit-slot-${id}-label`, 160);
      await layout(`fit-copy-${id}-label`, id === 'charged' ? 170 : 70);
    }
    await layout('source-sums', 295);
    for (const id of lines) {
      const row = screen.getByTestId(`fit-slot-${id}-label`).parent;
      expect([id, String(row?.props.className).includes('flex-row')]).toEqual([id, false]);
    }
    expect(screen.getByText(`636,50${NBSP}$`, RAW)).toBeTruthy();
  });

  it('offers the account kinds, pay among them, on the filter page in French', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Filtrer les transactions'));

    expect(screen.getByText('Reçus')).toBeTruthy();
    expect(screen.getByText('Factures mensuelles')).toBeTruthy();
    expect(screen.getByText('Abonnements')).toBeTruthy();
    expect(screen.getAllByText('Argent reçu').length).toBeGreaterThan(1);
    expect(screen.getByText('Paie')).toBeTruthy();

    await fireEvent.press(screen.getByText('Reçus'));
    await fireEvent.press(screen.getByText('Appliquer'));

    expect(screen.getByLabelText('Filtres, 1 actif')).toBeTruthy();
    expect(screen.queryByText('Rent')).toBeNull();
  });

  it('says nothing matches and offers to clear the search', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.changeText(screen.getByPlaceholderText('Rechercher des transactions'), 'zzz');

    expect(screen.getByText('Aucun résultat')).toBeTruthy();
    expect(
      screen.getByText('Aucune transaction ici ne correspond à cette recherche et à ces filtres.'),
    ).toBeTruthy();
    expect(screen.getByText('Effacer la recherche')).toBeTruthy();
  });

  it('explains an empty account in French', async () => {
    mockEntries = [];
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    expect(screen.getByText('Rien ici pour l’instant')).toBeTruthy();
    expect(
      screen.getByText('Tout ce qui est payé depuis ce compte s’affiche ici à sa date.'),
    ).toBeTruthy();
    expectNoLeftovers(screen);
  });
});

describe("A card's page in French", () => {
  beforeEach(() => {
    setLanguage('fr');
    setCurrency('CAD');
  });

  it('names where a payment came from in French', async () => {
    mockEntries = CARD_MOVES;
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    expect(
      screen.getByLabelText(`Depuis ${FROM_ACCOUNT}, 120,25${NBSP}$, Paiement · 6 sept. 2026`, RAW),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(`Mortgage top-up, 75,00${NBSP}$, Paiement · 7 sept. 2026`, RAW),
    ).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('opens the payment page for this card from "Faire un paiement"', async () => {
    const screen = await render(<SourceDetailScreen />, { wrapper: Toasts });

    await fireEvent.press(screen.getByLabelText('Faire un paiement'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/source-payment',
      params: { id: 'src-1' },
    });
  });
});
