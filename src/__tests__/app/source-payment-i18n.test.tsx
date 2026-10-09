import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import SourcePaymentScreen from '@/app/source-payment';
import type { CurrencyCode, Language } from '@/i18n/config';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { ToastContext } from '@/providers/toast-context';

/**
 * The payment page in Spanish and French: titles, questions, hints, pills, the Save words, the
 * refusal and the failure line, in the language on screen. What is written is not translated: an
 * amount typed with a French decimal comma is the same number English writes, and the account chosen
 * is its id. French sets a no-break space before a question mark; Spanish opens with "¿" and sets
 * none.
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

function openWallet({
  cards = [CARD],
  accounts = [CHECKING, SAVINGS, CAPITAL],
}: { cards?: string[]; accounts?: string[] } = {}) {
  mockCards = cards.map((id) => ({ id }));
  mockAccounts = accounts.map((id) => ({ id }));
  mockSources = [...cards, ...accounts].map((id) => SOURCES[id]);
}

const NBSP = ' ';
/**
 * Text queries fold whitespace and count a no-break space as whitespace, so they would pass a French
 * "Combien as-tu payé ?" written with an ordinary space. RAW compares the characters as drawn.
 */
const RAW = { normalizer: (text: string) => text };

type Screen = Awaited<ReturnType<typeof render>>;
type Json = { props: Record<string, unknown>; children: (Json | string)[] | null };

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label, RAW));
const pressButton = (screen: Screen, name: string) =>
  fireEvent.press(screen.getByRole('button', { name }));

/** Every line a person can see or hear: text, labels and hints. */
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
  expect(lines.filter((line) => /^[a-z]+\.[a-zA-Z]+\./.test(line) || /\{\w+\}/.test(line))).toEqual(
    [],
  );
}

const pills = (screen: Screen) =>
  screen.queryAllByRole('radio').map((node) => node.props.accessibilityLabel as string);

type Words = {
  language: Language;
  currency: CurrencyCode;
  cardTitle: string;
  accountTitle: string;
  howMuchCard: string;
  howMuchAccount: string;
  next: string;
  step: (step: number) => string;
  fromCard: string;
  fromCardHint: string;
  fromAccount: string;
  fromAccountHint: string;
  somewhereElse: string;
  newMoney: string;
  pickFrom: string;
  saveCard: string;
  saveAccount: string;
  saving: string;
  closeCard: string;
  closeAccount: string;
  back: string;
  close: string;
  failure: string;
  decimalKey: string;
  /** The figure a screen reader hears for $12.50, in this language. */
  amount: string;
};

const ES: Words = {
  language: 'es',
  currency: 'USD',
  cardTitle: 'Hacer un pago',
  accountTitle: 'Agregar dinero',
  howMuchCard: '¿Cuánto pagaste?',
  howMuchAccount: '¿Cuánto entró?',
  next: 'Continuar',
  step: (step) => `Paso ${step} de 2`,
  fromCard: '¿Desde qué cuenta pagaste?',
  fromCardHint: 'El pago sale de esa cuenta y se descuenta de lo que debe la tarjeta.',
  fromAccount: '¿De dónde vino?',
  fromAccountHint:
    'Si viene de otra de tus cuentas, sale de esa. El dinero nuevo, como un regalo o un reembolso, suma a tu saldo.',
  somewhereElse: 'En otro lugar',
  newMoney: 'Dinero nuevo',
  pickFrom: 'Elige de dónde vino el dinero.',
  saveCard: 'Guardar pago',
  saveAccount: 'Agregar dinero',
  saving: 'Guardando…',
  closeCard: '¿Cancelar este pago?',
  closeAccount: '¿Dejar de agregar este dinero?',
  back: 'Atrás',
  close: 'Cerrar',
  failure: 'Algo salió mal. Inténtalo de nuevo.',
  decimalKey: 'Punto decimal',
  amount: 'Importe, $12.50',
};

const FR: Words = {
  language: 'fr',
  currency: 'CAD',
  cardTitle: 'Faire un paiement',
  accountTitle: 'Ajouter de l’argent',
  howMuchCard: `Combien as-tu payé${NBSP}?`,
  howMuchAccount: `Combien est entré${NBSP}?`,
  next: 'Continuer',
  step: (step) => `Étape ${step} sur 2`,
  fromCard: `Depuis quel compte as-tu payé${NBSP}?`,
  fromCardHint: 'Le paiement sort de ce compte et réduit ce que doit la carte.',
  fromAccount: `D’où vient cet argent${NBSP}?`,
  fromAccountHint:
    'S’il vient d’un autre de tes comptes, il en sort. L’argent nouveau, comme un cadeau ou un remboursement, s’ajoute à ton solde.',
  somewhereElse: 'Ailleurs',
  newMoney: 'Nouvel argent',
  pickFrom: 'Choisis d’où vient l’argent.',
  saveCard: 'Enregistrer le paiement',
  saveAccount: 'Ajouter l’argent',
  saving: 'Enregistrement…',
  closeCard: `Annuler ce paiement${NBSP}?`,
  closeAccount: `Annuler l’ajout de cet argent${NBSP}?`,
  back: 'Retour',
  close: 'Fermer',
  failure: 'Une erreur est survenue. Réessaie.',
  decimalKey: 'Virgule décimale',
  amount: `Montant, 12,50${NBSP}$`,
};

async function typeAmount(screen: Screen, digits: string, decimalKey: string) {
  for (const key of digits) await press(screen, key === '.' ? decimalKey : key);
}

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
  mockConfirm.mockResolvedValue(false);
  mockCreate.mockResolvedValue({ id: 'payment-new' });
  mockPending = false;
  mockParams = { id: CARD };
  openWallet();
});
afterAll(() => resetLocaleForTests());

describe.each([ES, FR])('The payment page in $language', (w) => {
  beforeEach(() => {
    setLanguage(w.language);
    setCurrency(w.currency);
  });

  it('reads a card payment, both steps, in the language', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    expect(screen.getByText(w.cardTitle, RAW)).toBeTruthy();
    expect(screen.getByText(w.howMuchCard, RAW)).toBeTruthy();
    expect(screen.getByLabelText(w.step(1), RAW)).toBeTruthy();
    expect(screen.getByRole('button', { name: w.next })).toBeDisabled();
    expectNoLeftovers(screen);

    await typeAmount(screen, '12.50', w.decimalKey);
    expect(screen.getByLabelText(w.amount, RAW)).toBeTruthy();
    await pressButton(screen, w.next);

    expect(screen.getByText(w.fromCard, RAW)).toBeTruthy();
    expect(screen.getByText(w.fromCardHint, RAW)).toBeTruthy();
    expect(screen.getByLabelText(w.step(2), RAW)).toBeTruthy();
    expect(pills(screen)).toEqual([
      'Chase Checking ••7730',
      'Ally Savings ••9911',
      'Capital One 360 ••2048',
      w.somewhereElse,
    ]);
    expect(screen.getByRole('button', { name: w.saveCard })).toBeEnabled();
    expect(screen.getByLabelText(w.back, RAW)).toBeTruthy();
    expect(screen.getByLabelText(w.close, RAW)).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('reads money added to an account, both steps, in the language', async () => {
    mockParams = { id: CHECKING };
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    expect(screen.getByText(w.accountTitle, RAW)).toBeTruthy();
    expect(screen.getByText(w.howMuchAccount, RAW)).toBeTruthy();
    expectNoLeftovers(screen);

    await typeAmount(screen, '12.50', w.decimalKey);
    await pressButton(screen, w.next);

    expect(screen.getByText(w.fromAccount, RAW)).toBeTruthy();
    expect(screen.getByText(w.fromAccountHint, RAW)).toBeTruthy();
    expect(pills(screen)).toEqual(['Ally Savings ••9911', 'Capital One 360 ••2048', w.newMoney]);
    expect(screen.getByRole('button', { name: w.saveAccount })).toBeEnabled();
    expectNoLeftovers(screen);
  });

  it('refuses an unanswered Save in the language, and writes nothing', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '12.50', w.decimalKey);
    await pressButton(screen, w.next);

    await pressButton(screen, w.saveCard);

    expect(screen.getByText(w.pickFrom, RAW)).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();

    await press(screen, w.somewhereElse);
    expect(screen.queryByText(w.pickFrom, RAW)).toBeNull();
  });

  it('refuses an unanswered Add money in the language, and writes nothing', async () => {
    mockParams = { id: CHECKING };
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '12.50', w.decimalKey);
    await pressButton(screen, w.next);

    await pressButton(screen, w.saveAccount);

    expect(screen.getByText(w.pickFrom, RAW)).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('writes the same payment English writes, whatever the decimal key says', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '1000.55', w.decimalKey);
    await pressButton(screen, w.next);

    await press(screen, 'Chase Checking ••7730');
    await pressButton(screen, w.saveCard);

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toStrictEqual({
      card_id: CARD,
      bank_account_id: null,
      amount: 1000.55,
      paid_on: '2026-10-08',
      note: null,
      from_bank_account_id: CHECKING,
    });
    // The toast is told by key: the pill says it in the language on screen.
    expect(mockToast).toHaveBeenCalledWith('toast.payment.added');
  });

  it('writes money from outside with no account key, chosen by the language’s own pill', async () => {
    mockParams = { id: CHECKING };
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '75.20', w.decimalKey);
    await pressButton(screen, w.next);

    await press(screen, w.newMoney);
    await pressButton(screen, w.saveAccount);

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toStrictEqual({
      card_id: null,
      bank_account_id: CHECKING,
      amount: 75.2,
      paid_on: '2026-10-08',
      note: null,
    });
    expect(mockToast).toHaveBeenCalledWith('toast.money.added');
  });

  it('says the one failure line in the language', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '12.50', w.decimalKey);
    await pressButton(screen, w.next);
    await press(screen, w.somewhereElse);

    await pressButton(screen, w.saveCard);

    await waitFor(() => expect(screen.getByText(w.failure, RAW)).toBeTruthy());
    expect(router.back).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('says it is saving in the language, on the last step', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '12.50', w.decimalKey);
    await pressButton(screen, w.next);
    mockPending = true;
    await press(screen, w.somewhereElse);

    expect(screen.getByRole('button', { name: w.saving })).toBeDisabled();
  });

  it('asks in the language before a card payment is thrown away', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await press(screen, w.close);

    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: w.closeCard, destructive: true }),
      ),
    );
    expect(screen.getByLabelText(w.close, RAW).props.accessibilityHint).toBe(w.closeCard);
  });

  it('asks in the language before money being added is thrown away', async () => {
    mockParams = { id: CHECKING };
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await press(screen, w.close);

    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: w.closeAccount, destructive: true }),
      ),
    );
    expect(screen.getByLabelText(w.close, RAW).props.accessibilityHint).toBe(w.closeAccount);
  });

  describe('with no other account, so a single step', () => {
    it('saves a card payment from the amount step, in the language', async () => {
      openWallet({ accounts: [] });
      const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

      expect(screen.queryByLabelText(/^(Paso|Étape) /)).toBeNull();
      expect(screen.queryByRole('button', { name: w.next })).toBeNull();
      expect(screen.getByRole('button', { name: w.saveCard })).toBeDisabled();

      await typeAmount(screen, '12.50', w.decimalKey);
      await pressButton(screen, w.saveCard);

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(mockCreate.mock.calls[0][0]).toStrictEqual({
        card_id: CARD,
        bank_account_id: null,
        amount: 12.5,
        paid_on: '2026-10-08',
        note: null,
      });
    });

    it('saves money into the only account from the amount step, in the language', async () => {
      openWallet({ cards: [], accounts: [CHECKING] });
      mockParams = { id: CHECKING };
      const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

      expect(screen.getByText(w.howMuchAccount, RAW)).toBeTruthy();
      expect(screen.queryByRole('button', { name: w.next })).toBeNull();
      await typeAmount(screen, '75.20', w.decimalKey);
      await pressButton(screen, w.saveAccount);

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(mockCreate.mock.calls[0][0]).toStrictEqual({
        card_id: null,
        bank_account_id: CHECKING,
        amount: 75.2,
        paid_on: '2026-10-08',
        note: null,
      });
    });
  });
});

describe('The payment page in French: no-break space before a question mark', () => {
  beforeEach(() => {
    setLanguage('fr');
    setCurrency('CAD');
  });

  /** A question mark that follows an ordinary space or no space at all breaks the line before it. */
  function expectFrenchQuestionMarks(screen: Screen) {
    const asked = everyLine(screen).filter((line) => line.includes('?'));
    expect(asked.length).toBeGreaterThan(0);
    expect(asked.filter((line) => !line.includes(`${NBSP}?`) || /[^ ]\?/.test(line))).toEqual([]);
  }

  it('on the questions of the card page', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    expectFrenchQuestionMarks(screen);

    await typeAmount(screen, '12.50', FR.decimalKey);
    await pressButton(screen, FR.next);
    expectFrenchQuestionMarks(screen);
  });

  it('on the questions of the account page', async () => {
    mockParams = { id: CHECKING };
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    expectFrenchQuestionMarks(screen);

    await typeAmount(screen, '12.50', FR.decimalKey);
    await pressButton(screen, FR.next);
    expectFrenchQuestionMarks(screen);
  });

  it('on what the close buttons ask, as heard and as shown', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });

    await press(screen, FR.close);

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    const [{ title }] = mockConfirm.mock.calls[0] as unknown as [{ title: string }];
    expect(title).toBe(`Annuler ce paiement${NBSP}?`);
    expect(title).not.toMatch(/[^ ]\?/);
    expectFrenchQuestionMarks(screen);
  });
});

describe('The payment page in Spanish: the question opens and closes with its own marks', () => {
  beforeEach(() => {
    setLanguage('es');
  });

  it('sets no space before the closing mark, and opens each question with "¿"', async () => {
    const screen = await render(<SourcePaymentScreen />, { wrapper: Toasts });
    await typeAmount(screen, '12.50', ES.decimalKey);
    await pressButton(screen, ES.next);

    const asked = everyLine(screen).filter((line) => line.includes('?'));
    expect(asked.length).toBeGreaterThan(0);
    for (const line of asked) {
      expect(line.startsWith('¿')).toBe(true);
      expect(line).not.toMatch(/[\s ]\?/);
    }
  });
});
