import { render } from '@testing-library/react-native';

import { BalanceSummary } from '@/components/dashboard/balance-summary';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DateSelector } from '@/components/dashboard/date-selector';
import { DestinationList } from '@/components/dashboard/destination-list';
import { InsightBanner } from '@/components/dashboard/insight-banner';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ToolCards } from '@/components/dashboard/tool-cards';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/** Home's cards on their own, in the states Home itself rarely shows, in Spanish and French. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// Both pull in react-native-reanimated, whose mock needs the native worklets module.
jest.mock('@/components/ui/rolling-number', () => ({ RollingNumber: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/ui/profile-avatar', () => ({ ProfileAvatar: () => null }));
// The real SDK starts a cleanup interval on import that keeps Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', onControl: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
// Jest turns an .svg into a number, not a component; the icons have suites of their own.
jest.mock('@/theme/home-icons', () => ({
  useHomeIcons: () => new Proxy({}, { get: () => () => null }),
}));

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

const ROWS = [
  { id: 'monthly-bills', label: 'Facturas mensuales' },
  { id: 'loan-calculator', label: 'Calculadora de préstamos' },
];

const NBSP = '\u00a0';

beforeEach(() => resetLocaleForTests());
afterEach(() => jest.useRealTimers());
afterAll(() => resetLocaleForTests());

/** The last two days of September 2026, when the card used to say "1 day left" and then "Last day". */
const END_OF_MONTH = ['2026-09-29T09:00:00', '2026-09-30T09:00:00'];

describe('the dashboard cards in English', () => {
  it.each(END_OF_MONTH)('names the current balance and no days left, on %s', async (now) => {
    jest.useFakeTimers().setSystemTime(new Date(now));
    const screen = await render(<BalanceSummary balance={10} income={0} expenses={0} />);

    expect(screen.getByText('Current balance')).toBeTruthy();
    expect(screen.getByLabelText('Current balance, $10.00')).toBeTruthy();
    expect(screen.queryByText(/days? left|Last day|Left this month/)).toBeNull();
  });
});

describe('the dashboard cards in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it.each(END_OF_MONTH)('names the saldo actual and no days left, on %s', async (now) => {
    jest.useFakeTimers().setSystemTime(new Date(now));
    const screen = await render(<BalanceSummary balance={10} income={0} expenses={0} />);

    expect(screen.getByText('Saldo actual')).toBeTruthy();
    expect(screen.getByLabelText('Saldo actual, $10.00')).toBeTruthy();
    expect(screen.queryByText(/Queda|Quedan|Último día|Te queda este mes/)).toBeNull();
    expectNoRawText(screen);
  });

  it('reads the stats as loading, and the share of the income spent', async () => {
    const loading = await render(<BalanceSummary balance={10} income={0} expenses={0} loading />);
    expect(loading.getByText('Saldo actual')).toBeTruthy();
    expect(loading.getByLabelText('Ingresos, cargando')).toBeTruthy();
    expect(loading.getByLabelText('Gastos, cargando')).toBeTruthy();
    expectNoRawText(loading);

    const spent = await render(<BalanceSummary balance={750} income={1000} expenses={250} />);
    expect(spent.getByText('Ya se gastó el 25% de los ingresos')).toBeTruthy();
    expectNoRawText(spent);
  });

  it('says the balance is unavailable when a part would not load', async () => {
    const screen = await render(<BalanceSummary balance={10} income={1000} expenses={0} error />);

    expect(screen.getByLabelText('Saldo actual, no disponible')).toBeTruthy();
    expect(screen.getByLabelText('Gastos, no disponible')).toBeTruthy();
    expect(screen.queryByLabelText(/\$10\.00/)).toBeNull();
    expectNoRawText(screen);
  });

  it('reads the header for a picture already chosen and news unread', async () => {
    const screen = await render(<DashboardHeader name="Sam" avatarId="avatar-01" unread />);
    expect(screen.getByLabelText('Cambiar tu foto de perfil')).toBeTruthy();
    expect(screen.getByLabelText('Notificaciones, nuevas')).toBeTruthy();
  });

  it('steps the days', async () => {
    const screen = await render(<DateSelector weekday="jue" date="10.09" />);
    expect(screen.getByLabelText('Día anterior')).toBeTruthy();
    expect(screen.getByLabelText('jue 10.09. Elegir una fecha')).toBeTruthy();
  });

  it('says a figure is loading, and offers to open a tool', async () => {
    const screen = await render(
      <DestinationList
        items={ROWS}
        amounts={{ 'monthly-bills': -120 }}
        loading
        onPress={() => {}}
      />,
    );
    expect(screen.getByLabelText('Facturas mensuales, cargando el importe')).toBeTruthy();
    expect(screen.getByLabelText('Calculadora de préstamos. Abre la herramienta.')).toBeTruthy();
    expect(screen.getAllByText('Abrir', { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expectNoRawText(screen);
  });

  it('names Insights without the Pro note once paid, and the loan calculator always', async () => {
    const banner = await render(<InsightBanner pro onPress={() => {}} />);
    expect(
      banner.getByLabelText('Análisis. Descubre la historia detrás de tus gastos.'),
    ).toBeTruthy();

    const tools = await render(<ToolCards onPress={() => {}} />);
    expect(tools.getByLabelText('Calculadora de préstamos. Abre la herramienta.')).toBeTruthy();
    expect(tools.getByText('Mira el pago mensual')).toBeTruthy();
    expect(tools.getByText('Mira tus patrones')).toBeTruthy();
    expectNoRawText(tools);
  });

  it('labels the four Quick add tiles and says what each does', async () => {
    const screen = await render(<QuickActions onPress={() => {}} />);
    expect(screen.getAllByRole('button').map((tile) => tile.props.accessibilityLabel)).toEqual([
      'Agregar un recibo',
      'Agregar una factura',
      'Agregar una suscripción',
      'Tu salario y a dónde llega',
    ]);
    expect(screen.getAllByText('Factura', { includeHiddenElements: true }).length).toBeGreaterThan(
      0,
    );
    for (const note of ['Foto o a mano', 'Renta, teléfono, luz', 'Netflix, Spotify']) {
      expect(screen.getByText(note)).toBeTruthy();
    }
    expect(screen.getByText('Tu día de pago')).toBeTruthy();
    expectNoRawText(screen);
  });
});

describe('the dashboard cards in French', () => {
  beforeEach(() => {
    setLanguage('fr');
    setCurrency('CAD');
  });

  it.each(END_OF_MONTH)('names the solde actuel and no days left, on %s', async (now) => {
    jest.useFakeTimers().setSystemTime(new Date(now));
    const screen = await render(<BalanceSummary balance={10} income={0} expenses={0} />);

    expect(screen.getByText('Solde actuel')).toBeTruthy();
    expect(screen.getByLabelText(`Solde actuel, 10,00${NBSP}$`)).toBeTruthy();
    expect(screen.queryByText(/restants?|Dernier jour|Reste ce mois-ci/)).toBeNull();
    expectNoRawText(screen);
  });

  it('reads the share of the income spent with a non-breaking space before the sign', async () => {
    const screen = await render(<BalanceSummary balance={750} income={1000} expenses={250} />);
    expect(screen.getByText(`25${NBSP}% des revenus sont dépensés`)).toBeTruthy();
    expectNoRawText(screen);
  });

  it('says the balance is unavailable, with the one failure line, when a part would not load', async () => {
    const screen = await render(<BalanceSummary balance={10} income={1000} expenses={0} error />);

    expect(screen.getByLabelText('Solde actuel, non disponible')).toBeTruthy();
    expect(screen.getByLabelText('Revenus, non disponible')).toBeTruthy();
    expect(screen.getByLabelText('Dépenses, non disponible')).toBeTruthy();
    expect(screen.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('reads the header and the day stepper', async () => {
    const header = await render(<DashboardHeader name="Sam" />);
    expect(header.getByLabelText('Ajouter une photo de profil')).toBeTruthy();
    expect(header.getByLabelText('Notifications')).toBeTruthy();

    const stepper = await render(<DateSelector weekday="jeu." date="10.09" atLatest />);
    expect(stepper.getByLabelText('Jour suivant')).toBeTruthy();
    expect(stepper.getByLabelText('jeu. 10.09. Choisir une date')).toBeTruthy();
  });

  it('says a figure is unavailable, with the retry beside the failure line', async () => {
    const screen = await render(
      <DestinationList
        items={[{ id: 'receipts', label: 'Reçus' }]}
        amounts={{ receipts: -45.5 }}
        error
        onRetry={() => {}}
        onPress={() => {}}
      />,
    );
    expect(screen.getByLabelText('Reçus, montant non disponible')).toBeTruthy();
    expect(screen.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy();
    expect(screen.getByText('Réessayer')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('marks Insights as Pro for someone without it, and leaves the loan calculator open', async () => {
    const banner = await render(<InsightBanner pro={false} onPress={() => {}} />);
    expect(
      banner.getByLabelText('Aperçu. Fonction Pro. Découvre l’histoire derrière tes dépenses.'),
    ).toBeTruthy();
    expect(banner.getByText('Découvre l’histoire derrière tes dépenses')).toBeTruthy();

    const tools = await render(<ToolCards onPress={() => {}} />);
    expect(tools.getByLabelText('Calculateur de prêt. Ouvre l’outil.')).toBeTruthy();
    expect(tools.getByText('Vois la mensualité')).toBeTruthy();
    expect(tools.getByText('Vois tes tendances')).toBeTruthy();
    expect(tools.queryAllByText('PRO', { includeHiddenElements: true })).toHaveLength(0);
    expectNoRawText(tools);
  });

  it('labels the four Quick add tiles', async () => {
    const screen = await render(<QuickActions onPress={() => {}} />);
    expect(screen.getByLabelText('Ton salaire et où il arrive')).toBeTruthy();
    expect(
      screen.getAllByText('Abonnement', { includeHiddenElements: true }).length,
    ).toBeGreaterThan(0);
    for (const note of ['Photo ou saisie', 'Loyer, mobile, énergie', 'Ton jour de paie']) {
      expect(screen.getByText(note)).toBeTruthy();
    }
    expectNoRawText(screen);
  });
});
