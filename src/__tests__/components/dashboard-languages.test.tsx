import { render } from '@testing-library/react-native';

import { BalanceSummary } from '@/components/dashboard/balance-summary';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DateSelector } from '@/components/dashboard/date-selector';
import { DestinationList } from '@/components/dashboard/destination-list';
import { InsightBanner } from '@/components/dashboard/insight-banner';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ToolCards } from '@/components/dashboard/tool-cards';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

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

beforeEach(() => resetLocaleForTests());
afterAll(() => {
  jest.useRealTimers();
  resetLocaleForTests();
});

describe('the dashboard cards in English', () => {
  it('says one day left in the singular', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-29T09:00:00'));
    const screen = await render(<BalanceSummary leftThisMonth={10} payday={0} expenses={0} />);
    expect(screen.getByText('1 day left')).toBeTruthy();
    jest.useRealTimers();
  });
});

describe('the dashboard cards in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('counts the days left, one of them singular, and the last day by name', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-29T09:00:00'));
    const oneLeft = await render(<BalanceSummary leftThisMonth={10} payday={0} expenses={0} />);
    expect(oneLeft.getByText('Queda 1 día')).toBeTruthy();

    jest.setSystemTime(new Date('2026-09-30T09:00:00'));
    const lastDay = await render(
      <BalanceSummary leftThisMonth={10} payday={0} expenses={0} loading />,
    );
    expect(lastDay.getByText('Último día')).toBeTruthy();
    expect(lastDay.getByLabelText('Gastos, cargando')).toBeTruthy();
    expectNoRawText(lastDay);
    jest.useRealTimers();
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
        pro
        loading
        onPress={() => {}}
      />,
    );
    expect(screen.getByLabelText('Facturas mensuales, cargando el importe')).toBeTruthy();
    expect(screen.getByLabelText('Calculadora de préstamos. Abre la herramienta.')).toBeTruthy();
    expect(screen.getAllByText('Abrir', { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expectNoRawText(screen);
  });

  it('names Insights and the loan calculator without the Pro note once paid', async () => {
    const banner = await render(<InsightBanner pro onPress={() => {}} />);
    expect(
      banner.getByLabelText('Análisis. Descubre la historia detrás de tus gastos.'),
    ).toBeTruthy();

    const tools = await render(<ToolCards pro onPress={() => {}} />);
    expect(tools.getByLabelText('Calculadora de préstamos. Abre la herramienta.')).toBeTruthy();
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
    expectNoRawText(screen);
  });
});

describe('the dashboard cards in French', () => {
  beforeEach(() => setLanguage('fr'));

  it('counts the days left, with French singular for one', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-29T09:00:00'));
    const screen = await render(
      <BalanceSummary leftThisMonth={10} payday={0} expenses={0} error />,
    );
    expect(screen.getByText('1 jour restant')).toBeTruthy();
    expect(screen.getByLabelText('Reste ce mois-ci, non disponible, 1 jour restant')).toBeTruthy();
    expect(screen.getByLabelText('Revenus, non disponible')).toBeTruthy();
    expect(screen.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy();
    expectNoRawText(screen);
    jest.useRealTimers();
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
        pro
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

  it('marks the locked tools for someone without Pro', async () => {
    const banner = await render(<InsightBanner pro={false} onPress={() => {}} />);
    expect(
      banner.getByLabelText('Aperçu. Fonction Pro. Découvre l’histoire derrière tes dépenses.'),
    ).toBeTruthy();
    expect(banner.getByText('Découvre l’histoire derrière tes dépenses')).toBeTruthy();

    const tools = await render(<ToolCards pro={false} onPress={() => {}} />);
    expect(tools.getByLabelText('Calculateur de prêt. Fonction Pro. Ouvre l’outil.')).toBeTruthy();
  });

  it('labels the four Quick add tiles', async () => {
    const screen = await render(<QuickActions onPress={() => {}} />);
    expect(screen.getByLabelText('Ton salaire et où il arrive')).toBeTruthy();
    expect(
      screen.getAllByText('Abonnement', { includeHiddenElements: true }).length,
    ).toBeGreaterThan(0);
    expectNoRawText(screen);
  });
});
