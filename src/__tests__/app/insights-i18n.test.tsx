import { render } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import InsightsScreen from '@/app/insights';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Insights read in Spanish and French: headings, counts, category names mapped from their stored
 * ids, month names and every figure in the language's own writing.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/transactions/flow-chart', () => ({ FlowChart: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/pro/pro-gate', () => ({ useProGate: () => null }));
// The real list imports SVGs that jest cannot resolve; the stored id and label are what matter.
jest.mock('@/data/bills-mock', () => ({ BILL_CATEGORIES: [{ id: 'housing', label: 'Housing' }] }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', moneyOut: '#B85040' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));

const MONTHS = [
  { month: '2026-06-01', saved: 1000 },
  { month: '2026-07-01', saved: 1100 },
  { month: '2026-08-01', saved: 1200 },
].map((row) => ({
  ...row,
  income: 4000,
  spent: 4000 - row.saved,
  adjusted_saved: null,
  note: null,
  excluded_at: null,
}));

const spend = (id: string, label: string, amount: number, over: object = {}) => ({
  id,
  label,
  amount: -amount,
  date: '2026-08-10',
  kind: 'receipt',
  sourceId: 'card-1',
  domain: null,
  categoryId: 'groceries',
  ...over,
});

const mockEntries = [
  spend('o1', 'Oxxo', 10),
  spend('o2', 'Oxxo', 20),
  spend('r1', 'Rent', 1200, { kind: 'bill', categoryId: 'housing' }),
];

let mockFailing = false;
let mockSalary: object[] = [];
let mockSavings: object[] = [];

const mockAnswer = (data: unknown) => ({ data, isError: false, refetch: jest.fn() });

jest.mock('@/api/brands', () => ({
  useSpendCategories: () =>
    mockAnswer([
      { id: 'groceries', label: 'Groceries', hint: null },
      { id: 'other', label: 'Other', hint: null },
    ]),
}));

jest.mock('@/api/queries', () => ({
  savedFor: (month: { saved: number }) => Number(month.saved),
  useLedger: () => ({
    entries: mockEntries,
    totals: { in: 0, out: 1230 },
    isLoading: false,
    isError: mockFailing,
    refetch: jest.fn(),
  }),
  useCards: () => mockAnswer([{ id: 'card-1', holder: 'Banorte', last4: '1004', balance: 300 }]),
  useSalarySources: () => mockAnswer(mockSalary),
  useMonthlySavings: () => mockAnswer(mockSavings),
  useSubscriptions: () => mockAnswer([{ id: 's1', amount: 15.99, active: true }]),
  useSourceBalances: () => ({ balances: new Map(), isError: false, refetch: jest.fn() }),
}));

const NBSP = ' ';

type Node = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;

/** Every line a person can see or hear: text, labels, hints and placeholders. */
function shownText(node: Node): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(shownText);
  const props = node.props ?? {};
  const spoken = ['accessibilityLabel', 'accessibilityHint', 'placeholder'].flatMap((name) =>
    typeof props[name] === 'string' ? [props[name] as string] : [],
  );
  return [...spoken, ...(node.children ?? []).flatMap((child) => shownText(child as Node))];
}

function expectNoRawText(tree: Node) {
  const lines = shownText(tree);
  expect(lines.filter((line) => /^[a-z]+\.[a-zA-Z]+\./.test(line))).toEqual([]);
  expect(lines.filter((line) => /\{\w+\}/.test(line))).toEqual([]);
}

beforeEach(() => {
  resetLocaleForTests();
  mockFailing = false;
  mockSalary = [{ id: 'pay', amount: 4000, frequency: 'monthly' }];
  mockSavings = MONTHS;
});
afterAll(() => resetLocaleForTests());

describe('Insights in Spanish', () => {
  it('reads every section', async () => {
    setLanguage('es');
    const screen = await render(<InsightsScreen />);

    expect(screen.getByText('Análisis')).toBeTruthy();
    expect(screen.getByText('Tu situación')).toBeTruthy();
    expect(screen.getByText('Lo ahorrado, menos lo que debes')).toBeTruthy();
    // 1,000 + 1,100 + 1,200 put aside, less 300 on the card.
    expect(screen.getByText('$3,000.00')).toBeTruthy();
    expect(screen.getByText('Apartado')).toBeTruthy();
    expect(screen.getByText('Deuda en tarjetas de crédito')).toBeTruthy();

    expect(screen.getByText('Lo que entra')).toBeTruthy();
    expect(screen.getByText('Cada mes')).toBeTruthy();
    expect(screen.getByText('de 1 fuente')).toBeTruthy();

    expect(screen.getByText('Lo que sale')).toBeTruthy();
    expect(screen.getByText('Este mes')).toBeTruthy();
    expect(screen.getByText('Recibos de compras')).toBeTruthy();
    expect(screen.getByText('Registrado en este periodo')).toBeTruthy();

    expect(screen.getByText('A dónde se va')).toBeTruthy();
    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByText('Vivienda')).toBeTruthy();

    expect(screen.getByText('Dónde gastas más')).toBeTruthy();
    expect(screen.getByText('2 veces')).toBeTruthy();
    expect(screen.getByText('1 vez')).toBeTruthy();

    expect(screen.getByText('Lo que conservas')).toBeTruthy();
    expect(screen.getAllByText(/de 2026$/).map((node) => node.props.children as string)).toEqual([
      'Junio de 2026',
      'Julio de 2026',
      'Agosto de 2026',
    ]);
    expect(screen.getByLabelText('Ver todos los meses')).toBeTruthy();
    expect(screen.getByText('Todos los meses')).toBeTruthy();

    expect(screen.getByText('Lo que debes')).toBeTruthy();
    expect(screen.getByText('Banorte 1004')).toBeTruthy();

    expect(screen.getByText('Próximos')).toBeTruthy();
    expect(screen.getByText('$15.99/mes')).toBeTruthy();
    expect(screen.getByText('$191.88 al año')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('asks for pay and explains savings while there is none', async () => {
    setLanguage('es');
    mockSalary = [];
    mockSavings = [];
    const screen = await render(<InsightsScreen />);

    expect(screen.getByText('Skip aún no sabe cuánto ganas')).toBeTruthy();
    expect(screen.getByText('Configurar día de pago')).toBeTruthy();
    expect(screen.getByText('Aún no hay meses terminados')).toBeTruthy();
    expect(screen.getByText('Ver ahorros')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});

describe('Insights in French', () => {
  it('reads every section, figures written the Canadian way', async () => {
    setLanguage('fr');
    const screen = await render(<InsightsScreen />);

    expect(screen.getByText('Aperçu')).toBeTruthy();
    expect(screen.getByText('Où tu en es')).toBeTruthy();
    // Queries fold a no-break space into a plain one, so the figures are compared as they are.
    const worth = `3${NBSP}000,00${NBSP}$`;
    expect(screen.getByText(worth).props.children).toBe(worth);
    expect(screen.getByText('de 1 source')).toBeTruthy();
    expect(screen.getByText('Ce mois-ci')).toBeTruthy();
    expect(screen.getByText('Épicerie')).toBeTruthy();
    expect(screen.getByText('Logement')).toBeTruthy();
    expect(screen.getByText('2 fois')).toBeTruthy();
    expect(screen.getByText('1 fois')).toBeTruthy();
    expect(screen.getAllByText(/ 2026$/).map((node) => node.props.children as string)).toEqual([
      'Juin 2026',
      'Juillet 2026',
      'Août 2026',
    ]);
    expect(screen.getByText('À venir')).toBeTruthy();
    const perMonth = `15,99${NBSP}$/mois`;
    expect(screen.getByText(perMonth).props.children).toBe(perMonth);
    const perYear = `191,88${NBSP}$ sur un an`;
    expect(screen.getByText(perYear).props.children).toBe(perYear);
    expectNoRawText(screen.toJSON());
  });

  it('says the one failure line when a source fails', async () => {
    setLanguage('fr');
    mockFailing = true;
    const screen = await render(<InsightsScreen />);

    expect(screen.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy();
    expect(screen.getByText('Réessayer')).toBeTruthy();
    expect(screen.queryByText('Ton épargne, moins ce que tu dois')).toBeNull();
  });
});
