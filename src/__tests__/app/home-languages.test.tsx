import { render } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/home';
import type { SetupStep } from '@/api/onboarding';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/**
 * Home with its real cards, read in Spanish and in French: the headline figure and its labels,
 * Quick add, Where it goes, Go further, the day stepper, and the Recent and Coming up rows.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

// The real SDK starts a cleanup interval on import that keeps Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

// Both pull in react-native-reanimated, whose mock needs the native worklets module.
jest.mock('@/components/ui/rolling-number', () => ({ RollingNumber: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null, SkeletonList: () => null }));
jest.mock('@/components/ui/profile-avatar', () => ({ ProfileAvatar: () => null }));
jest.mock('@/components/ui/date-picker', () => ({ DatePicker: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    body: '#333333',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    onControl: '#FFFFFF',
    accentInk: '#905479',
  }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: false }) }));
jest.mock('@/api/news', () => ({ useHasUnreadNews: () => false }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
  useKeepSchedulesCurrent: () => {},
}));
jest.mock('@/api/charges', () => ({ useCharges: () => ({ data: [] }) }));

const mockSteps: SetupStep[] = [
  { id: 'salary', title: 'Pay', detail: 'Why pay', done: true, href: '/salary' },
  { id: 'wallet', title: 'Wallet', detail: 'Why wallet', done: false, href: '/add-card' },
  { id: 'bill', title: 'Bills', detail: 'd', done: false, href: '/add-bill' },
  { id: 'subscription', title: 'Subs', detail: 'd', done: false, href: '/add-subscription' },
  {
    id: 'receipt',
    title: 'Receipt',
    detail: 'd',
    done: false,
    href: '/add-receipt',
    optional: true,
  },
];

jest.mock('@/api/onboarding', () => ({
  useGettingStarted: () => ({
    steps: mockSteps,
    doneCount: 1,
    requiredDone: false,
    settled: true,
    dismissed: false,
    visible: true,
    dismiss: jest.fn(),
  }),
}));

/** A Thursday in a 30-day month: 20 days left after it. */
const TODAY = '2026-09-10';

const mockEntries = [
  { id: 'receipt-r1', label: 'Bakery', amount: -6, date: TODAY, kind: 'receipt' as const },
  { id: 'bill-b1@2026-09-09', label: 'Rent', amount: -1030, date: '2026-09-09', kind: 'bill' },
  {
    id: 'subscription-s1@2026-09-08',
    label: 'Netflix',
    amount: -15,
    date: '2026-09-08',
    kind: 'subscription',
  },
  { id: 'income-p1@2026-09-07', label: 'Payday', amount: 2000, date: '2026-09-07', kind: 'income' },
].map((row) => ({ ...row, sourceId: 's1' }));

let mockFailed = false;

jest.mock('@/api/queries', () => ({
  // No name yet, so the header stands in with a greeting.
  useProfile: () => ({ data: { display_name: null } }),
  useLedger: (range: { from: string; to: string } | undefined) => ({
    entries: mockFailed ? [] : range && range.from > '2026-09-10' ? [] : mockEntries,
    totals: { in: 2000, out: 1051, net: 949, count: 4 },
    isLoading: false,
    isError: mockFailed,
    refetch: jest.fn(),
  }),
}));

jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T09:00:00`));

type Screen = Awaited<ReturnType<typeof render>>;
type Json = ReturnType<Screen['toJSON']>;

/** Every string drawn or read out, so a raw key or an unfilled {param} cannot hide anywhere. */
function wordsOn(screen: Screen): string[] {
  const found: string[] = [];
  const walk = (node: Json | string | Json[]) => {
    if (node === null) return;
    if (typeof node === 'string') return void found.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    for (const prop of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      const value = node.props[prop];
      if (typeof value === 'string') found.push(value);
    }
    node.children?.forEach(walk);
  };
  walk(screen.toJSON());
  return found;
}

function expectNoRawText(screen: Screen) {
  const words = wordsOn(screen);
  expect(words.length).toBeGreaterThan(0);
  expect(words.filter((word) => /^[a-z]+\.[a-zA-Z]+\./.test(word))).toEqual([]);
  expect(words.filter((word) => /\{\w+\}/.test(word))).toEqual([]);
}

const NBSP = '\u00a0';
// Fitted text is drawn twice, once hidden to be measured, so these take the first of the two.
const all = { includeHiddenElements: true };

beforeEach(() => {
  resetLocaleForTests();
  mockFailed = false;
});
afterAll(() => resetLocaleForTests());

describe('Home in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('reads the headline card, Quick add and Where it goes', async () => {
    const screen = await render(<HomeScreen />);

    expect(screen.getByText('Te damos la bienvenida')).toBeTruthy();
    expect(screen.getByLabelText('Agregar una foto de perfil')).toBeTruthy();
    expect(screen.getByLabelText('Notificaciones')).toBeTruthy();

    expect(screen.getByText('Te queda este mes')).toBeTruthy();
    expect(screen.getByText('Quedan 20 días')).toBeTruthy();
    expect(screen.getByLabelText('Te queda este mes, $949.00, Quedan 20 días')).toBeTruthy();
    expect(screen.getByText('Ya se gastó el 53% de los ingresos')).toBeTruthy();
    expect(screen.getAllByText('Ingresos', all)[0]).toBeTruthy();
    expect(screen.getAllByText('Gastos', all)[0]).toBeTruthy();
    expect(screen.getByLabelText('Ingresos, $2,000.00')).toBeTruthy();
    expect(screen.getByLabelText('Gastos, -$1,051.00')).toBeTruthy();

    expect(screen.getByText('Agregar rápido')).toBeTruthy();
    expect(screen.getAllByText('Suscripción', all)[0]).toBeTruthy();
    expect(screen.getAllByText('Salario', all)[0]).toBeTruthy();
    expect(screen.getByLabelText('Tu salario y a dónde llega')).toBeTruthy();

    expect(screen.getByText('Primeros pasos')).toBeTruthy();
    expect(screen.getByText('1 de 5 listos')).toBeTruthy();
    expect(screen.getByLabelText('Pay. Listo.')).toBeTruthy();
    expect(screen.getByText('Opcional')).toBeTruthy();

    expect(screen.getByText('A dónde se va')).toBeTruthy();
    expect(screen.getByText('Este mes')).toBeTruthy();
    expect(screen.getByLabelText('Facturas mensuales, -$1,030.00, este mes')).toBeTruthy();
    expect(screen.getByLabelText('Recibos, -$6.00, este mes')).toBeTruthy();
    expect(screen.getByLabelText('Suscripciones, -$15.00, este mes')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('reads Go further, the day stepper, Recent and Coming up', async () => {
    const screen = await render(<HomeScreen />);

    expect(screen.getByText('Ve más allá')).toBeTruthy();
    expect(screen.getByText('Incluido con Pro')).toBeTruthy();
    expect(screen.getByLabelText('Calculadora de préstamos. Abre la herramienta.')).toBeTruthy();
    expect(
      screen.getByLabelText('Análisis. Función Pro. Descubre la historia detrás de tus gastos.'),
    ).toBeTruthy();

    expect(screen.getByLabelText('Día anterior')).toBeTruthy();
    expect(screen.getByLabelText('Día siguiente')).toBeTruthy();
    expect(screen.getByLabelText('jue 10.09. Elegir una fecha')).toBeTruthy();

    expect(screen.getByText('Recientes')).toBeTruthy();
    expect(screen.getByLabelText('Rent, -$1,030.00, Factura')).toBeTruthy();
    expect(screen.getByLabelText('Bakery, -$6.00, Recibo')).toBeTruthy();
    expect(screen.getByLabelText('Netflix, -$15.00, Suscripción')).toBeTruthy();
    expect(screen.getByText('Próximos')).toBeTruthy();
    expect(screen.getByText('Nada vence en lo que queda del mes.')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('says the one failure line, never a guessed figure, when the month will not load', async () => {
    mockFailed = true;
    const screen = await render(<HomeScreen />);

    expect(screen.getByLabelText('Te queda este mes, no disponible, Quedan 20 días')).toBeTruthy();
    expect(screen.getByLabelText('Ingresos, no disponible')).toBeTruthy();
    expect(screen.getByLabelText('Facturas mensuales, importe no disponible')).toBeTruthy();
    expect(screen.getAllByText('Algo salió mal. Inténtalo de nuevo.').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Intentar de nuevo').length).toBeGreaterThan(1);
    expectNoRawText(screen);
  });
});

describe('Home in French', () => {
  beforeEach(() => {
    setLanguage('fr');
    setCurrency('CAD');
  });

  it('reads the headline card with French figures', async () => {
    const screen = await render(<HomeScreen />);

    expect(screen.getByText('Bienvenue')).toBeTruthy();
    expect(screen.getByText('Reste ce mois-ci')).toBeTruthy();
    expect(screen.getByText('20 jours restants')).toBeTruthy();
    expect(
      screen.getByLabelText(`Reste ce mois-ci, 949,00${NBSP}$, 20 jours restants`),
    ).toBeTruthy();
    expect(screen.getByText(`53${NBSP}% des revenus sont dépensés`)).toBeTruthy();
    expect(screen.getByLabelText(`Revenus, 2${NBSP}000,00${NBSP}$`)).toBeTruthy();
    expect(screen.getByLabelText(`Dépenses, -1${NBSP}051,00${NBSP}$`)).toBeTruthy();
    expect(screen.getByText('Ajout rapide')).toBeTruthy();
    expect(screen.getAllByText('Reçu', all)[0]).toBeTruthy();
    expect(screen.getByLabelText('Ajouter un abonnement')).toBeTruthy();
    expect(screen.getByText('Premiers pas')).toBeTruthy();
    expect(screen.getByText('1 sur 5 terminées')).toBeTruthy();
    expect(screen.getByLabelText('Masquer le guide Premiers pas')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('reads Where it goes, Go further, Recent and Coming up', async () => {
    const screen = await render(<HomeScreen />);

    expect(screen.getByText('Où va ton argent')).toBeTruthy();
    expect(screen.getByText('Ce mois-ci')).toBeTruthy();
    expect(screen.getAllByText('Factures mensuelles', all)[0]).toBeTruthy();
    expect(
      screen.getByLabelText(`Factures mensuelles, -1${NBSP}030,00${NBSP}$, ce mois-ci`),
    ).toBeTruthy();
    expect(screen.getByText('Va plus loin')).toBeTruthy();
    expect(screen.getByText('Inclus avec Pro')).toBeTruthy();
    expect(screen.getByLabelText('Calculateur de prêt. Ouvre l’outil.')).toBeTruthy();
    expect(screen.getByText('Aperçu')).toBeTruthy();
    expect(screen.getByLabelText('jeu. 10.09. Choisir une date')).toBeTruthy();
    expect(screen.getByText('Récents')).toBeTruthy();
    expect(screen.getByLabelText(`Rent, -1${NBSP}030,00${NBSP}$, Facture`)).toBeTruthy();
    expect(screen.getByText('À venir')).toBeTruthy();
    expect(screen.getByText('Rien à payer jusqu’à la fin du mois.')).toBeTruthy();
    expectNoRawText(screen);
  });
});
