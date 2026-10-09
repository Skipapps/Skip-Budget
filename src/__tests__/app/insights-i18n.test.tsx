import { render } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import InsightsScreen from '@/app/insights';
import { MESSAGES } from '@/i18n/messages';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Insights read in Spanish and French: headings, counts, category names mapped from their stored
 * ids and every figure in the language's own writing. None of it mentions Savings: the old
 * net-worth and recent-months sections are gone in every language.
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
jest.mock('@/data/bill-categories', () => ({
  BILL_CATEGORIES: [{ id: 'housing', label: 'Housing' }],
}));
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

const mockAnswer = (data: unknown) => ({ data, isError: false, refetch: jest.fn() });

jest.mock('@/api/brands', () => ({
  useSpendCategories: () =>
    mockAnswer([
      { id: 'groceries', label: 'Groceries', hint: null },
      { id: 'other', label: 'Other', hint: null },
    ]),
}));

jest.mock('@/api/queries', () => ({
  useLedger: () => ({
    entries: mockEntries,
    totals: { in: 0, out: 1230 },
    isLoading: false,
    isError: mockFailing,
    refetch: jest.fn(),
  }),
  useCards: () => mockAnswer([{ id: 'card-1', holder: 'Banorte', last4: '1004', balance: 300 }]),
  useSalarySources: () => mockAnswer(mockSalary),
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

/** What each language's "Where you stand" and "What you keep" said, empty state included. */
const REMOVED = {
  es: [
    'Tu situación',
    'Lo ahorrado, menos lo que debes',
    'Apartado',
    'Deuda en tarjetas de crédito',
    'Lo que conservas',
    'Ver todos los meses',
    'Todos los meses',
    'Aún no hay meses terminados',
    'Cuando termina un mes',
    'Ver ahorros',
  ],
  fr: [
    'Où tu en es',
    'Ton épargne, moins ce que tu dois',
    'Mis de côté',
    'Dû sur les cartes de crédit',
    'Ce que tu gardes',
    'Voir tous les mois',
    'Tous les mois',
    'Aucun mois terminé pour l’instant',
    'À la fin d’un mois',
    'Voir l’épargne',
  ],
};

/** Savings in the language's own stem, and a month written the way the old list wrote it. */
const LEFTOVERS = {
  es: [
    /ahorr/i,
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de \d{4}\b/i,
  ],
  fr: [
    /épargn/i,
    /\b(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) \d{4}\b/i,
  ],
};

/** Every line that carries one of the removed words or a pattern that only Savings produced. */
function savingsLines(tree: Node, language: 'es' | 'fr'): string[] {
  return shownText(tree).filter(
    (line) =>
      REMOVED[language].some((words) => line.includes(words)) ||
      LEFTOVERS[language].some((pattern) => pattern.test(line)),
  );
}

beforeEach(() => {
  resetLocaleForTests();
  mockFailing = false;
  mockSalary = [{ id: 'pay', amount: 4000, frequency: 'monthly' }];
});
afterAll(() => resetLocaleForTests());

describe('Insights in Spanish', () => {
  it('reads every section', async () => {
    setLanguage('es');
    const screen = await render(<InsightsScreen />);

    expect(screen.getByText('Análisis')).toBeTruthy();

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

    expect(screen.getByText('Lo que debes')).toBeTruthy();
    expect(screen.getByText('Banorte 1004')).toBeTruthy();
    // The card's own debt stays, with no total made from it beside it.
    expect(screen.getByText('$300.00')).toBeTruthy();

    expect(screen.getByText('Próximos')).toBeTruthy();
    expect(screen.getByText('$15.99/mes')).toBeTruthy();
    expect(screen.getByText('$191.88 al año')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    expect(savingsLines(screen.toJSON(), 'es')).toEqual([]);
  });

  it('asks for pay while there is none, with nothing about finished months', async () => {
    setLanguage('es');
    mockSalary = [];
    const screen = await render(<InsightsScreen />);

    expect(screen.getByText('Skip aún no sabe cuánto ganas')).toBeTruthy();
    expect(screen.getByText('Configurar día de pago')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    expect(savingsLines(screen.toJSON(), 'es')).toEqual([]);
  });
});

describe('Insights in French', () => {
  it('reads every section, figures written the Canadian way', async () => {
    setLanguage('fr');
    const screen = await render(<InsightsScreen />);

    expect(screen.getByText('Aperçu')).toBeTruthy();
    expect(screen.getByText('Ce qui entre')).toBeTruthy();
    // Queries fold a no-break space into a plain one, so the figures are compared as they are.
    const pay = `4${NBSP}000,00${NBSP}$`;
    expect(screen.getByText(pay).props.children).toBe(pay);
    expect(screen.getByText('de 1 source')).toBeTruthy();
    expect(screen.getByText('Ce mois-ci')).toBeTruthy();
    expect(screen.getByText('Épicerie')).toBeTruthy();
    expect(screen.getByText('Logement')).toBeTruthy();
    expect(screen.getByText('2 fois')).toBeTruthy();
    expect(screen.getByText('1 fois')).toBeTruthy();
    expect(screen.getByText('Ce que tu dois')).toBeTruthy();
    expect(screen.getByText('Banorte 1004')).toBeTruthy();
    expect(screen.getByText(`300,00${NBSP}$`)).toBeTruthy();
    expect(screen.getByText('À venir')).toBeTruthy();
    const perMonth = `15,99${NBSP}$/mois`;
    expect(screen.getByText(perMonth).props.children).toBe(perMonth);
    const perYear = `191,88${NBSP}$ sur un an`;
    expect(screen.getByText(perYear).props.children).toBe(perYear);
    expectNoRawText(screen.toJSON());
    expect(savingsLines(screen.toJSON(), 'fr')).toEqual([]);
  });

  it('asks for pay while there is none, with nothing about finished months', async () => {
    setLanguage('fr');
    mockSalary = [];
    const screen = await render(<InsightsScreen />);

    expect(screen.getByText('Skip ne sait pas encore combien tu gagnes')).toBeTruthy();
    expect(screen.getByText('Configurer le jour de paie')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    expect(savingsLines(screen.toJSON(), 'fr')).toEqual([]);
  });

  it('says the one failure line when a source fails', async () => {
    setLanguage('fr');
    mockFailing = true;
    const screen = await render(<InsightsScreen />);

    expect(screen.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy();
    expect(screen.getByText('Réessayer')).toBeTruthy();
    // The page draws these when nothing fails, so their absence is the failure's doing.
    expect(screen.queryByText('Ce qui entre')).toBeNull();
    expect(screen.queryByText('Ce que tu dois')).toBeNull();
  });

  it('draws the sections the failure page replaces when nothing fails', async () => {
    setLanguage('fr');
    const screen = await render(<InsightsScreen />);

    expect(screen.getByText('Ce qui entre')).toBeTruthy();
    expect(screen.getByText('Ce que tu dois')).toBeTruthy();
    expect(screen.queryByText('Une erreur est survenue. Réessaie.')).toBeNull();
  });
});

describe('Insights copy', () => {
  it('keeps no words for the removed Where you stand and What you keep sections', () => {
    expect(Object.keys(MESSAGES).filter((key) => /^insights\.(stand|keep)\./.test(key))).toEqual(
      [],
    );
  });
});
