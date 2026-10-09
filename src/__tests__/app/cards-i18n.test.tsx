import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import CardsScreen from '@/app/(tabs)/cards';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/**
 * The Cards tab in Spanish and French: title, headings, pills, empty notes, locked rows and the four
 * Money tiles, which are the real ones.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/cards/payment-card', () => ({ PaymentCard: () => null }));
jest.mock('@/components/cards/account-card', () => ({ AccountCard: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
// Jest turns an .svg into a number, not a component; the icons have a suite of their own.
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));

let mockPro = false;
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: mockPro }) }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => async () => true,
  useDialog: () => async () => undefined,
}));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));

const card = (id: string, holder: string) => ({
  id,
  holder,
  balance: 100,
  last4: '4242',
  network: 'VISA',
  color: '#000000',
});
const account = (id: string, nickname: string) => ({
  id,
  bank_name: 'A Bank',
  nickname,
  account_type: 'checking',
  balance: 900,
  last4: '1111',
  color: '#000000',
});

let mockCards: object[] = [];
let mockAccounts: object[] = [];
let mockBalancesFailed = false;
const mockRefetchBalances = jest.fn();

jest.mock('@/api/queries', () => ({
  useCards: () => ({ data: mockCards, isPending: false, isError: false }),
  useBankAccounts: () => ({ data: mockAccounts, isPending: false, isError: false }),
  useSalarySources: () => ({ data: mockSalary, isPending: false, isError: false }),
  useSourceBalances: () => ({
    balances: new Map<string, number>(),
    updated: new Map<string, string>(),
    isError: mockBalancesFailed,
    refetch: mockRefetchBalances,
  }),
}));

// 1,000 a week normalises to 4,333.33 a month.
let mockSalary: object[] = [];
let mockLoans: { billId: string; name: string }[] = [];
jest.mock('@/api/loans', () => ({
  useActiveLoans: () => ({
    loans: mockLoans,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/lib/use-today', () => ({ useToday: () => ({ today: '2026-09-12' }) }));

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
  mockPro = false;
  mockBalancesFailed = false;
  mockCards = [card('c1', 'Everyday Visa'), card('c2', 'Travel card')];
  mockAccounts = [account('a1', 'Main'), account('a2', 'Rainy day')];
  mockLoans = [];
  mockSalary = [{ amount: 1000, frequency: 'weekly' }];
  mockRefetchBalances.mockClear();
  jest.mocked(router.push).mockClear();
});
afterAll(() => resetLocaleForTests());

describe('Cards tab in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('reads its title, headings, pills and tiles in Spanish', async () => {
    const screen = await render(<CardsScreen />);

    expect(screen.getByRole('header', { name: 'Tarjetas' })).toBeTruthy();
    expect(screen.getByText('Todo tu dinero en un solo lugar.')).toBeTruthy();
    expect(screen.getByText('Tarjetas de crédito')).toBeTruthy();
    expect(screen.getAllByText('Agregar')).toHaveLength(2);
    expect(screen.getByLabelText('Nueva tarjeta de crédito')).toBeTruthy();
    expect(screen.getByText('Cuentas bancarias')).toBeTruthy();
    expect(screen.getByLabelText('Agregar cuenta')).toBeTruthy();
    expect(screen.getByText('Dinero')).toBeTruthy();
    expect(screen.getByLabelText('Salario, $4,333.33, Mensual')).toBeTruthy();
    expect(screen.getByText('$4,333.33')).toBeTruthy();
    expect(screen.getByLabelText('Préstamos, Agregar uno, Sigue lo que debes')).toBeTruthy();
    expect(screen.getByLabelText('Metas, Próximamente')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('draws the Savings tile with Abrir where a figure would be, and opens Ahorros', async () => {
    const screen = await render(<CardsScreen />);

    const tile = screen.getByLabelText('Ahorros, Abrir, Empieza a ahorrar');
    expect(screen.getByText('Abrir')).toBeTruthy();
    // The Salary figure is the only number on the tab (the faces are drawn empty here).
    expect(screen.getAllByText(/\d/)).toHaveLength(1);

    await fireEvent.press(tile);
    expect(router.push).toHaveBeenLastCalledWith('/savings');
  });

  it('counts the active loans in Spanish', async () => {
    mockLoans = [
      { billId: 'b1', name: 'Auto' },
      { billId: 'b2', name: 'Casa' },
    ];
    const screen = await render(<CardsScreen />);

    expect(screen.getByLabelText('Préstamos, 2 activos, Auto · Casa')).toBeTruthy();
  });

  it('says which rows open and which are locked on the free plan', async () => {
    const screen = await render(<CardsScreen />);

    expect(screen.getByLabelText('Everyday Visa, ver movimientos')).toBeTruthy();
    expect(
      screen.getByLabelText('Travel card, bloqueada en el plan gratis. Abre Skip Pro.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Main, ver movimientos')).toBeTruthy();
    expect(
      screen.getByLabelText('Rainy day, bloqueada en el plan gratis. Abre Skip Pro.'),
    ).toBeTruthy();
  });

  it('explains an empty wallet in Spanish', async () => {
    mockCards = [];
    mockAccounts = [];
    const screen = await render(<CardsScreen />);

    expect(
      screen.getByText(
        'Aún no hay tarjetas de crédito. Agrega una para seguir lo que gastas con ella.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Aún no hay cuentas bancarias. Agrega una para ver el dinero que entra y sale.',
      ),
    ).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('says the one failure line and its retry in Spanish', async () => {
    mockBalancesFailed = true;
    const screen = await render(<CardsScreen />);

    expect(screen.getByText('Algo salió mal. Inténtalo de nuevo.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Intentar de nuevo'));
    expect(mockRefetchBalances).toHaveBeenCalledTimes(1);
  });
});

describe('Cards tab in French', () => {
  beforeEach(() => {
    setLanguage('fr');
    setCurrency('CAD');
  });

  it('reads its title, headings, pills and tiles in French', async () => {
    const screen = await render(<CardsScreen />);

    expect(screen.getByRole('header', { name: 'Cartes' })).toBeTruthy();
    expect(screen.getByText('Tout ton argent au même endroit.')).toBeTruthy();
    expect(screen.getByText('Cartes de crédit')).toBeTruthy();
    expect(screen.getAllByText('Ajouter')).toHaveLength(2);
    expect(screen.getByLabelText('Nouvelle carte de crédit')).toBeTruthy();
    expect(screen.getByText('Comptes bancaires')).toBeTruthy();
    expect(screen.getByLabelText('Ajouter un compte')).toBeTruthy();
    expect(screen.getByText('Argent')).toBeTruthy();
    expect(screen.getByLabelText(`Salaire, 4${NBSP}333,33${NBSP}$, Chaque mois`)).toBeTruthy();
    expect(screen.getByText(`4${NBSP}333,33${NBSP}$`)).toBeTruthy();
    expect(screen.getByLabelText('Prêts, Ajouter un prêt, Suis ce que tu dois')).toBeTruthy();
    expect(screen.getByLabelText('Objectifs, Bientôt')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('draws the Savings tile with Ouvrir where a figure would be, and opens Épargne', async () => {
    const screen = await render(<CardsScreen />);

    const tile = screen.getByLabelText('Épargne, Ouvrir, Commence à épargner');
    expect(screen.getByText('Ouvrir')).toBeTruthy();
    expect(screen.getAllByText(/\d/)).toHaveLength(1);

    await fireEvent.press(tile);
    expect(router.push).toHaveBeenLastCalledWith('/savings');
  });

  it('counts one active loan in French', async () => {
    mockLoans = [{ billId: 'b1', name: 'Auto' }];
    const screen = await render(<CardsScreen />);

    expect(screen.getByLabelText('Prêts, 1 actif, Auto')).toBeTruthy();
  });

  it('offers to add pay in French when there is none', async () => {
    mockSalary = [];
    const screen = await render(<CardsScreen />);

    expect(screen.getByLabelText('Salaire, Ajouter ta paie, Ajoute ta paie')).toBeTruthy();
  });

  it('agrees a locked card and a locked account in French', async () => {
    const screen = await render(<CardsScreen />);

    expect(screen.getByLabelText('Everyday Visa, voir les transactions')).toBeTruthy();
    expect(
      screen.getByLabelText('Travel card, verrouillée avec le forfait gratuit. Ouvre Skip Pro.'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Rainy day, verrouillé avec le forfait gratuit. Ouvre Skip Pro.'),
    ).toBeTruthy();
  });

  it('explains an empty wallet in French', async () => {
    mockCards = [];
    mockAccounts = [];
    const screen = await render(<CardsScreen />);

    expect(
      screen.getByText(
        'Aucune carte de crédit pour l’instant. Ajoutes-en une pour suivre ce que tu y dépenses.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Aucun compte bancaire pour l’instant. Ajoutes-en un pour voir l’argent qui entre et qui sort.',
      ),
    ).toBeTruthy();
    expectNoLeftovers(screen);
  });
});
