import { fireEvent, render } from '@testing-library/react-native';

import TransactionsScreen from '@/app/(tabs)/transactions';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/** The Transactions tab in Spanish and French: chips, range, summary, rows and empty states. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
// The filter page reads insets outside any provider.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/api/charges', () => ({ useCharges: () => ({ data: [] }) }));

/** A Thursday, so the week runs Sunday 6 to Saturday 12 September. */
const TODAY = '2026-09-10';

const ENTRIES = [
  { id: 'receipt-r1', label: 'Bakery', amount: -6.5, date: TODAY, kind: 'receipt' },
  { id: 'bill-b1@2026-09-08', label: 'Rent', amount: -1030, date: '2026-09-08', kind: 'bill' },
  {
    id: 'income-p1@2026-09-08',
    label: 'Payday',
    amount: 2000,
    date: '2026-09-08',
    kind: 'income',
  },
].map((row) => ({ ...row, sourceId: 's1' }));

let mockEntries = ENTRIES;
let mockFailed = false;

jest.mock('@/api/queries', () => ({
  useLedger: () => ({
    entries: mockEntries,
    totals: { in: 2000, out: 1036.5, net: 963.5, count: mockEntries.length },
    isLoading: false,
    isError: mockFailed,
    refetch: jest.fn(),
  }),
  usePaymentSources: () => ({ sources: [{ id: 's1', label: 'Everyday ••1111' }] }),
}));

// Only the clock is fixed; real timers keep the renders independent of one another.
jest.useFakeTimers({
  doNotFake: [
    'hrtime',
    'nextTick',
    'performance',
    'queueMicrotask',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'requestIdleCallback',
    'cancelIdleCallback',
    'setImmediate',
    'clearImmediate',
    'setInterval',
    'clearInterval',
    'setTimeout',
    'clearTimeout',
  ],
});
jest.setSystemTime(new Date(`${TODAY}T09:00:00`));

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
  mockEntries = ENTRIES;
  mockFailed = false;
});
afterAll(() => {
  resetLocaleForTests();
  jest.useRealTimers();
});

describe('Transactions in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('reads its title, periods, range, summary and rows in Spanish', async () => {
    const screen = await render(<TransactionsScreen />);

    expect(screen.getAllByText('Movimientos').length).toBeGreaterThan(0);
    expect(screen.getByText('Semana')).toBeTruthy();
    expect(screen.getByText('Mes')).toBeTruthy();
    expect(screen.getByText('6 – 12 sep')).toBeTruthy();
    expect(screen.getByLabelText('Anterior')).toBeTruthy();
    expect(screen.getByLabelText('Siguiente')).toBeTruthy();

    expect(screen.getByText('Te sobran')).toBeTruthy();
    expect(screen.getByText('3 movimientos')).toBeTruthy();
    expect(screen.getByText('$963.50')).toBeTruthy();

    expect(screen.getByPlaceholderText('Buscar movimientos')).toBeTruthy();
    expect(screen.getByLabelText('Filtrar movimientos')).toBeTruthy();

    expect(screen.getByText('Hoy')).toBeTruthy();
    expect(screen.getByText('Recibos · Everyday ••1111')).toBeTruthy();
    expect(screen.getByText('Facturas mensuales · Everyday ••1111')).toBeTruthy();
    expect(screen.getByText('Ingresos · Everyday ••1111')).toBeTruthy();
    expect(screen.getByText('-$1,030.00')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('counts the active filters in Spanish once some are applied', async () => {
    const screen = await render(<TransactionsScreen />);

    await fireEvent.press(screen.getByLabelText('Filtrar movimientos'));
    await fireEvent.press(screen.getByText('Recibos'));
    await fireEvent.press(screen.getByText('Aplicar'));

    expect(screen.getByLabelText('Filtros, 1 activo')).toBeTruthy();
    expect(screen.queryByText('Rent')).toBeNull();
    expect(screen.getByText('Bakery')).toBeTruthy();
  });

  it('explains an empty ledger in Spanish', async () => {
    mockEntries = [];
    const screen = await render(<TransactionsScreen />);

    expect(screen.getByText('Aún no hay nada aquí')).toBeTruthy();
    expect(
      screen.getByText(
        'Los recibos, las facturas y las suscripciones aparecen aquí juntos en cuanto agregues algunos.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Agregar un recibo')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('says nothing matches when the search finds nothing', async () => {
    const screen = await render(<TransactionsScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Buscar movimientos'), 'zzz');

    expect(screen.getByText('No hay coincidencias')).toBeTruthy();
    expect(
      screen.getByText('Ningún movimiento coincide con esa búsqueda y esos filtros.'),
    ).toBeTruthy();
    expect(screen.getByText('Borrar filtros')).toBeTruthy();
  });
});

describe('Transactions in French', () => {
  beforeEach(() => {
    setLanguage('fr');
    setCurrency('CAD');
  });

  it('reads its title, range, summary and rows in French', async () => {
    const screen = await render(<TransactionsScreen />);

    expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);
    expect(screen.getByText('Semaine')).toBeTruthy();
    expect(screen.getByText('6 – 12 sept.')).toBeTruthy();
    expect(screen.getByLabelText('Précédent')).toBeTruthy();
    expect(screen.getByLabelText('Suivant')).toBeTruthy();

    expect(screen.getByText('Il reste')).toBeTruthy();
    expect(screen.getByText('3 transactions')).toBeTruthy();
    expect(screen.getByText(`963,50${NBSP}$`)).toBeTruthy();

    expect(screen.getByPlaceholderText('Rechercher des transactions')).toBeTruthy();
    expect(screen.getByText('Aujourd’hui')).toBeTruthy();
    expect(screen.getByText('Reçus · Everyday ••1111')).toBeTruthy();
    expect(screen.getByText(`-1${NBSP}030,00${NBSP}$`)).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('says the one failure line in French', async () => {
    mockFailed = true;
    const screen = await render(<TransactionsScreen />);

    expect(screen.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy();
    expect(screen.getByText('Réessayer')).toBeTruthy();
  });
});
