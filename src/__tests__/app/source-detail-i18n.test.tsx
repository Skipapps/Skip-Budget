import { fireEvent, render } from '@testing-library/react-native';

import SourceDetailScreen from '@/app/source/[id]';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/** A card's and an account's own page in Spanish and French: summary, rows, actions and states. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

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

jest.mock('@/api/mutations', () => ({
  useCreatePayment: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeletePayment: () => ({ mutate: jest.fn(), isPending: false }),
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

const NBSP = ' ';
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
  mockConfirm.mockClear();
});
afterAll(() => resetLocaleForTests());

describe("A card's page in Spanish", () => {
  beforeEach(() => setLanguage('es'));

  it('reads the summary, rows and actions in Spanish', async () => {
    const screen = await render(<SourceDetailScreen />);

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

  it('asks before removing a payment, in Spanish', async () => {
    const screen = await render(<SourceDetailScreen />);

    await fireEvent.press(screen.getByLabelText('Pago, $500.00, Pago · 5 sep 2026'));

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '¿Quitar este pago?',
        message: 'El saldo vuelve a subir en esa cantidad.',
        confirmLabel: 'Quitar',
      }),
    );
  });

  it('finds the payment by its Spanish name', async () => {
    const screen = await render(<SourceDetailScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Buscar movimientos'), 'pago');

    expect(screen.getByLabelText('Pago, $500.00, Pago · 5 sep 2026')).toBeTruthy();
    expect(screen.queryByText('Bakery')).toBeNull();
  });
});

describe("An account's page in French", () => {
  beforeEach(() => {
    setLanguage('fr');
    setCurrency('CAD');
    mockKind = 'account';
  });

  it('reads the summary and actions in French', async () => {
    const screen = await render(<SourceDetailScreen />);

    expect(screen.getByLabelText('Modifier Courant')).toBeTruthy();
    expect(screen.getByLabelText('Ajouter un dépôt')).toBeTruthy();
    expect(screen.getByText('Ajouter de l’argent')).toBeTruthy();

    expect(screen.getByText('Solde de départ')).toBeTruthy();
    expect(screen.getByText(`900,00${NBSP}$`)).toBeTruthy();
    expect(screen.getByText('Dépensé depuis')).toBeTruthy();
    expect(screen.getByText('Argent reçu')).toBeTruthy();
    expect(screen.getByText('Solde actuel')).toBeTruthy();
    expect(screen.getByText(`636,50${NBSP}$`)).toBeTruthy();
    expect(screen.getByText('Chèques')).toBeTruthy();
    expect(screen.getByText('Transactions')).toBeTruthy();
    expect(
      screen.getByLabelText(`Rent, -1${NBSP}030,00${NBSP}$, Facture · 4 sept. 2026`),
    ).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('offers the account kinds on the filter page in French', async () => {
    const screen = await render(<SourceDetailScreen />);

    await fireEvent.press(screen.getByLabelText('Filtrer les transactions'));

    expect(screen.getByText('Reçus')).toBeTruthy();
    expect(screen.getByText('Factures mensuelles')).toBeTruthy();
    expect(screen.getByText('Abonnements')).toBeTruthy();
    expect(screen.getAllByText('Argent reçu').length).toBeGreaterThan(1);

    await fireEvent.press(screen.getByText('Reçus'));
    await fireEvent.press(screen.getByText('Appliquer'));

    expect(screen.getByLabelText('Filtres, 1 actif')).toBeTruthy();
    expect(screen.queryByText('Rent')).toBeNull();
  });

  it('says nothing matches and offers to clear the search', async () => {
    const screen = await render(<SourceDetailScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Rechercher des transactions'), 'zzz');

    expect(screen.getByText('Aucun résultat')).toBeTruthy();
    expect(
      screen.getByText('Aucune transaction ici ne correspond à cette recherche et à ces filtres.'),
    ).toBeTruthy();
    expect(screen.getByText('Effacer la recherche')).toBeTruthy();
  });

  it('explains an empty account in French', async () => {
    mockEntries = [];
    const screen = await render(<SourceDetailScreen />);

    expect(screen.getByText('Rien ici pour l’instant')).toBeTruthy();
    expect(
      screen.getByText('Tout ce qui est payé depuis ce compte s’affiche ici à sa date.'),
    ).toBeTruthy();
    expectNoLeftovers(screen);
  });
});
