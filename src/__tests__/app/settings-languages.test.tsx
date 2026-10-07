import { fireEvent, render } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import AboutScreen from '@/app/settings/about';
import SupportScreen from '@/app/settings/support';
import YourMoneyScreen from '@/app/settings/your-money';
import { plural } from '@/components/settings/use-money-counts';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { proMonthlyLabel, proYearlyLabel } from '@/lib/wall';

/**
 * Settings and the three pages it opens, in Spanish and French: every line from the messages,
 * counts worded by each language's plural rule, and the Pro price from the store when it answers.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true },
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.4.2' } },
}));
jest.mock('@/components/settings/coffee-mark', () => ({ CoffeeMark: () => null }));
jest.mock('@/components/ui/profile-avatar', () => ({ ProfileAvatar: () => null }));
jest.mock('@/theme/avatars', () => ({ findAvatar: () => undefined }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#333333',
    muted: '#777777',
    line: '#DDDDDD',
    danger: '#DC2626',
    moneyIn: '#16A34A',
  }),
}));

const mockConfirm = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({
  useDialog: () => jest.fn(),
  useConfirm: () => mockConfirm,
}));
jest.mock('@/api/auth', () => ({
  signOut: jest.fn(() => Promise.resolve()),
  deleteAccount: jest.fn(() => Promise.resolve({ error: null })),
}));
jest.mock('@/lib/nav', () => ({ resetTo: jest.fn() }));

let mockPro = false;
let mockPrices: { data?: unknown } = {};
jest.mock('@/api/pro', () => ({
  usePro: () => ({ pro: mockPro }),
  useProPrices: () => mockPrices,
}));
jest.mock('@/lib/pro-bypass', () => ({ useProOverride: () => 'off', setProOverride: jest.fn() }));
jest.mock('@/api/mutations', () => ({
  useUpdateProfile: () => ({ mutate: jest.fn(), isPending: false }),
}));

let mockRows: Record<string, number | undefined> = {};
function mockRead(table: string) {
  const count = mockRows[table];
  return { data: count === undefined ? undefined : Array.from({ length: count }) };
}
jest.mock('@/api/queries', () => ({
  useProfile: () => ({ data: { display_name: 'Sam', avatar_id: null } }),
  useBills: () => mockRead('bills'),
  useSubscriptions: () => mockRead('subscriptions'),
  useCards: () => mockRead('cards'),
  useBankAccounts: () => mockRead('accounts'),
  useSalarySources: () => mockRead('salary'),
  useReceipts: () => mockRead('receipts'),
}));
jest.mock('@/api/charges', () => ({ useCharges: () => mockRead('charges') }));

type Screen = Awaited<ReturnType<typeof render>>;

const RAW_KEY = /^[a-z]+\.[a-zA-Z]+\./;

const textsOf = (screen: Screen) =>
  screen.getAllByText(/./).map((node) => String(node.props.children));

const labelsOf = (screen: Screen) =>
  screen
    .getAllByRole('button')
    .map((node) => node.props.accessibilityLabel as string | undefined)
    .filter((label): label is string => Boolean(label));

/** Nothing on screen is a message key or a `{param}` left unfilled. */
function expectAllWorded(lines: string[]) {
  for (const line of lines) {
    expect(line).not.toMatch(RAW_KEY);
    expect(line).not.toMatch(/\{\w+\}/);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockPro = false;
  mockPrices = {};
  mockRows = { bills: 2, subscriptions: 3, cards: 1, accounts: 2, salary: 1, receipts: 4 };
});

describe('Settings, the main page', () => {
  it('reads in Spanish, with the fallback Pro price', async () => {
    setLanguage('es');
    const screen = await render(<SettingsScreen />);

    const texts = textsOf(screen);
    for (const line of [
      'Ajustes',
      'Perfil',
      'Foto de perfil',
      'Elige una para mostrarla en tu panel',
      'Nombre visible',
      'Preferencias',
      'Tu dinero',
      'Acerca de',
      'Soporte y comentarios',
      // The tip link sits under it, worded in Spanish too.
      'Invita un café al equipo',
      'Para que Skip siga con energía',
      'Cuenta',
      'Cerrar sesión',
      'Eliminar cuenta',
      'Es permanente y no se puede deshacer',
    ]) {
      expect(texts).toContain(line);
    }
    expect(screen.getByText('Todo ilimitado, $1.99/mes o $19.99/año')).toBeTruthy();
    expect(screen.getByPlaceholderText('Tu nombre')).toBeTruthy();
    expectAllWorded([...texts, ...labelsOf(screen)]);
  });

  it('reads in French, with the fallback Pro price', async () => {
    setLanguage('fr');
    const screen = await render(<SettingsScreen />);

    const texts = textsOf(screen);
    for (const line of [
      'Réglages',
      'Profil',
      'Photo de profil',
      'Préférences',
      'Ton argent',
      'À propos',
      'Assistance et commentaires',
      'Offre un café à l’équipe',
      'Pour que Skip continue de carburer',
      'Compte',
      'Se déconnecter',
      'Supprimer le compte',
    ]) {
      expect(texts).toContain(line);
    }
    expect(
      screen.getByText(`Tout en illimité, ${proMonthlyLabel()} ou ${proYearlyLabel()}`),
    ).toBeTruthy();
    expect(proMonthlyLabel()).toMatch(/^1,99\s\$\/mois$/);
    expectAllWorded([...texts, ...labelsOf(screen)]);
  });

  it('quotes the store’s own prices once the store answers', async () => {
    setLanguage('es');
    mockPrices = {
      data: {
        monthly: { product: { priceString: '$39.00 MXN' } },
        yearly: { product: { priceString: '$399.00 MXN' } },
      },
    };
    const screen = await render(<SettingsScreen />);

    expect(screen.getByText('Todo ilimitado, $39.00 MXN/mes o $399.00 MXN/año')).toBeTruthy();
  });

  it('says Pro is active in the language on screen', async () => {
    mockPro = true;
    setLanguage('fr');
    const screen = await render(<SettingsScreen />);

    expect(screen.getByText('Skip Pro — actif')).toBeTruthy();
    expect(screen.getByText('Tout est débloqué · gère-le dans l’App Store')).toBeTruthy();
  });

  it('counts what deleting the account removes, in Spanish', async () => {
    setLanguage('es');
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockRows.charges = 5;
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Eliminar cuenta/ }));

    expect(mockConfirm).toHaveBeenCalledTimes(2);
    expect(mockConfirm.mock.calls[0][0]).toMatchObject({
      title: '¿Eliminar tu cuenta?',
      message:
        'Esto elimina 1 tarjeta, 2 cuentas bancarias, 2 facturas, 3 suscripciones, 4 recibos, 5 cargos registrados, 1 fuente de ingresos: todo lo que Skip guarda para ti. No se puede deshacer.',
      confirmLabel: 'Continuar',
      cancelLabel: 'Conservar mi cuenta',
    });
    expect(mockConfirm.mock.calls[1][0]).toMatchObject({
      title: '¿Eliminar todo para siempre?',
      message: 'No hay vuelta atrás y no se guarda ninguna copia.',
      confirmLabel: 'Eliminar todo',
      cancelLabel: 'Conservar mi cuenta',
    });
  });

  it('counts what deleting the account removes, in French', async () => {
    setLanguage('fr');
    mockConfirm.mockResolvedValue(false);
    mockRows = { cards: 1, accounts: 2 };
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Supprimer le compte/ }));

    expect(mockConfirm.mock.calls[0][0]).toMatchObject({
      title: 'Supprimer ton compte ?',
      message:
        'Cela supprime 1 carte, 2 comptes bancaires — tout ce que Skip conserve pour toi. C’est irréversible.',
      confirmLabel: 'Continuer',
      cancelLabel: 'Garder mon compte',
    });
  });
});

describe('Settings, Your money', () => {
  it('words its counts in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<YourMoneyScreen />);

    expect(textsOf(screen)).toEqual([
      'Tu dinero',
      'Facturas',
      '2 facturas recurrentes',
      'Suscripciones',
      '3 registradas',
      'Tarjetas y cuentas',
      '1 tarjeta · 2 cuentas bancarias',
      'Día de pago',
      '1 fuente de ingresos',
    ]);
  });

  it('words its counts in French, where zero is singular', async () => {
    setLanguage('fr');
    mockRows = {};
    const screen = await render(<YourMoneyScreen />);

    expect(textsOf(screen)).toEqual([
      'Ton argent',
      'Factures',
      'Aucune pour l’instant',
      'Abonnements',
      'Aucun pour l’instant',
      'Cartes et comptes',
      '0 carte · 0 compte bancaire',
      'Jour de paie',
      'Pas encore configuré',
    ]);
  });

  it('counts with the message, not with an English "s"', () => {
    expect(plural(1, 'bankAccount')).toBe('1 bank account');
    expect(plural(2, 'salarySource')).toBe('2 salary sources');
    setLanguage('es');
    expect(plural(2, 'recordedCharge')).toBe('2 cargos registrados');
    setLanguage('fr');
    expect(plural(1, 'receipt')).toBe('1 reçu');
    expect(plural(3, 'subscription')).toBe('3 abonnements');
  });
});

describe('Settings, About', () => {
  it.each([
    [
      'es',
      [
        'Acerca de',
        'Política de privacidad',
        'Qué se guarda y quién más puede verlo',
        'Términos del servicio',
        'Versión',
        '1.4.2',
      ],
    ],
    [
      'fr',
      [
        'À propos',
        'Politique de confidentialité',
        'Ce qui est conservé, et qui d’autre peut le voir',
        'Conditions d’utilisation',
        'Version',
        '1.4.2',
      ],
    ],
  ] as const)('reads in %s', async (language, lines) => {
    setLanguage(language);
    const screen = await render(<AboutScreen />);

    expect(textsOf(screen)).toEqual(lines);
  });
});

describe('Settings, Support', () => {
  it('reads in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<SupportScreen />);

    expect(textsOf(screen)).toEqual([
      'Soporte y comentarios',
      'Primeros pasos',
      'Vuelve a mostrar los pasos de configuración en Inicio',
      'Preguntas frecuentes',
      'Respuestas cortas, sin esperar',
      'Lo que Skip puede hacer',
      'Las cinco cosas, cada una a un toque',
      'Escribir a soporte',
      'Algo falla o no está claro',
      'Comparte una idea',
      '¿Qué debería hacer Skip ahora?',
    ]);
  });

  it('reads in French', async () => {
    setLanguage('fr');
    const screen = await render(<SupportScreen />);

    const texts = textsOf(screen);
    for (const line of [
      'Assistance et commentaires',
      'Premiers pas',
      'Questions fréquentes',
      'Ce que Skip peut faire',
      'Écrire à l’assistance',
      'Partage une idée',
      'Que devrait faire Skip ensuite ?',
    ]) {
      expect(texts).toContain(line);
    }
    // The tip link moved to the main Settings page.
    expect(texts).not.toContain('Offre un café à l’équipe');
    expectAllWorded([...texts, ...labelsOf(screen)]);
  });
});
