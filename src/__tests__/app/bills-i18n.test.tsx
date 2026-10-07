import { fireEvent, getDefaultNormalizer, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import BillPlansScreen from '@/app/bill-plans';
import BillDetailScreen from '@/app/bill/[id]';
import BillsScreen from '@/app/bills';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The bill list, the charged bills and one bill's page read in Spanish and French: the words, the
 * schedules and categories mapped from their stored values, the counts, the dates and the money.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'b1' }),
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null, SkeletonList: () => null }));
jest.mock('@/components/ui/range-dropdown', () => ({ RangeDropdown: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#222222',
    muted: '#777777',
    line: '#DDDDDD',
    accentInk: '#905479',
  }),
  useMoneyColor: () => () => '#000000',
}));

const BILLS = [
  {
    id: 'b1',
    name: 'Renta',
    amount: 1100,
    category_id: 'housing',
    icon_id: null,
    recurrence: 'monthly',
    next_due_on: '2026-10-15',
    starts_on: '2026-09-15',
    ends_on: null,
    card_id: 'card-1',
    bank_account_id: null,
    note: 'Depto 4',
    brands: null,
  },
  {
    id: 'b2',
    name: 'CFE',
    amount: 30.5,
    category_id: 'energy',
    icon_id: null,
    recurrence: 'quarterly',
    next_due_on: '2026-11-01',
    starts_on: null,
    ends_on: null,
    card_id: null,
    bank_account_id: null,
    note: null,
    brands: null,
  },
];

const charge = (date: string, planId = 'b1') => ({
  id: `bill-${planId}@${date}`,
  label: planId === 'b1' ? 'Renta' : 'CFE',
  amount: planId === 'b1' ? -1100 : -30.5,
  date,
  kind: 'bill',
  sourceId: planId === 'b1' ? 'card-1' : '',
  planId,
});

let mockBills: { data: unknown[] | undefined; isPending: boolean; isError: boolean };
let mockEntries: ReturnType<typeof charge>[];

jest.mock('@/api/queries', () => ({
  useBills: () => ({ ...mockBills, refetch: jest.fn() }),
  usePaymentSources: () => ({
    sources: [{ id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' }],
  }),
  useLedger: () => ({
    entries: mockEntries,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.useFakeTimers({
  now: new Date('2026-10-03T12:00:00'),
  doNotFake: ['nextTick', 'setImmediate'],
});

const NBSP = '\u00a0';

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
  mockBills = { data: BILLS, isPending: false, isError: false };
  mockEntries = [charge('2026-09-15'), charge('2026-10-15'), charge('2026-10-01', 'b2')];
});
afterAll(() => resetLocaleForTests());

describe('Your bills', () => {
  it('reads in Spanish, with each schedule and category from its stored value', async () => {
    setLanguage('es');
    const screen = await render(<BillPlansScreen />);

    expect(screen.getByText('Tus facturas')).toBeTruthy();
    expect(screen.getByLabelText('Agregar factura')).toBeTruthy();
    expect(screen.getByPlaceholderText('Buscar facturas')).toBeTruthy();
    expect(screen.getByLabelText('Filtrar facturas')).toBeTruthy();
    expect(screen.getByText('2 facturas')).toBeTruthy();
    expect(screen.getByText('-$1,130.50')).toBeTruthy();
    expect(screen.getByText('Mensual · VISA ••4421')).toBeTruthy();
    expect(screen.getByText('Cada 3 meses')).toBeTruthy();
    // The row's due date, and the day heading over it.
    expect(screen.getAllByText('15 oct 2026').length).toBeGreaterThan(0);
    expect(
      screen.getByLabelText('Renta, -$1,100.00, Mensual, se paga con VISA ••4421'),
    ).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('finds a bill by the category name read on screen, and says when nothing matches', async () => {
    setLanguage('es');
    const screen = await render(<BillPlansScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Buscar facturas'), 'vivienda');
    expect(screen.getByText('1 de 2 facturas')).toBeTruthy();
    expect(screen.getByText('Renta')).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText('Buscar facturas'), 'zzz');
    expect(screen.getByText('Nada coincide')).toBeTruthy();
    expect(
      screen.getByText(
        'Ninguna factura coincide con esa búsqueda y esos filtros. Prueba otro nombre o borra lo que elegiste.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Borrar filtros')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads in French, filters through the sheet and counts what is left', async () => {
    setLanguage('fr');
    const screen = await render(<BillPlansScreen />);

    expect(screen.getByText('Tes factures')).toBeTruthy();
    expect(screen.getByText('2 factures')).toBeTruthy();
    // Matched without folding spaces, so the no-break spaces are proven.
    expect(
      screen.getByText(`-1${NBSP}130,50${NBSP}$`, {
        normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
      }),
    ).toBeTruthy();
    expect(screen.getByText('Chaque mois · VISA ••4421')).toBeTruthy();
    expect(screen.getByText('Tous les 3 mois')).toBeTruthy();
    expect(screen.getAllByText('1 nov. 2026').length).toBeGreaterThan(0);
    expect(
      screen.getByLabelText(`Renta, -1${NBSP}100,00${NBSP}$, Chaque mois, payée avec VISA ••4421`),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Filtrer les factures'));
    expect(screen.getByLabelText('Fermer les filtres')).toBeTruthy();
    expect(screen.getByText('Catégorie')).toBeTruthy();
    expect(screen.getByText('Toutes les catégories sont affichées.')).toBeTruthy();
    expect(screen.getByText('Payée avec')).toBeTruthy();
    expect(screen.getByText('Fréquence')).toBeTruthy();
    expect(screen.getByText('Chaque année')).toBeTruthy();
    expect(screen.getByText('Effacer')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await fireEvent.press(screen.getByLabelText('Logement'));
    await fireEvent.press(screen.getByText('Appliquer'));

    expect(screen.getByLabelText('Filtres, 1 actif')).toBeTruthy();
    expect(screen.getByText('1 sur 2 factures')).toBeTruthy();
    expect(screen.queryByText('CFE')).toBeNull();
    expectNoRawText(screen.toJSON());
  });

  it('says so in French when there are no bills, and when the list cannot be read', async () => {
    setLanguage('fr');
    mockBills = { data: [], isPending: false, isError: false };
    const empty = await render(<BillPlansScreen />);

    expect(empty.getByText('Pas encore de factures')).toBeTruthy();
    expect(empty.getByText('Ajouter une facture')).toBeTruthy();
    expectNoRawText(empty.toJSON());
    await empty.unmount();

    mockBills = { data: undefined, isPending: false, isError: true };
    const failed = await render(<BillPlansScreen />);
    expect(failed.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy();
    expect(failed.getByText('Réessayer')).toBeTruthy();
  });
});

describe('Monthly bills', () => {
  it('reads in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<BillsScreen />);

    expect(screen.getByText('Facturas mensuales')).toBeTruthy();
    expect(screen.getByText('Facturas cobradas')).toBeTruthy();
    expect(screen.getByText('3 cargos')).toBeTruthy();
    expect(screen.getByText('-$2,230.50')).toBeTruthy();
    expect(screen.getByText('Sin forma de pago')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads in French, empty and with no bills at all', async () => {
    setLanguage('fr');
    mockEntries = [charge('2026-10-01', 'b2')];
    const one = await render(<BillsScreen />);
    expect(one.getByText('Factures mensuelles')).toBeTruthy();
    expect(one.getByText('1 prélèvement')).toBeTruthy();
    expect(one.getByText('Aucun mode de paiement')).toBeTruthy();
    await one.unmount();

    mockEntries = [];
    const quiet = await render(<BillsScreen />);
    expect(quiet.getAllByText('Rien dans cette période')).toHaveLength(2);
    expect(
      quiet.getByText(
        'Aucune de tes factures n’est arrivée dans cette période. Essaie une période plus longue.',
      ),
    ).toBeTruthy();
    expectNoRawText(quiet.toJSON());
    await quiet.unmount();

    mockBills = { data: [], isPending: false, isError: false };
    const none = await render(<BillsScreen />);
    expect(none.getByText('Pas encore de factures')).toBeTruthy();
    expect(none.getByText('Ajouter une facture')).toBeTruthy();
    expectNoRawText(none.toJSON());
  });

  it('keeps the total whole at large text, in French too, and shrinks it alone if it must', async () => {
    setLanguage('fr');
    const window = { width: 375, height: 812, scale: 3, fontScale: 1.3 };
    Dimensions.set({ window, screen: window });
    const screen = await render(<BillsScreen />);

    const total = `-2${NBSP}230,50${NBSP}$`;
    const figure = screen.getByText(total);
    expect(figure.props.numberOfLines).toBeUndefined();
    expect(figure.props.adjustsFontSizeToFit).toBeUndefined();
    expect(figure.props.maxFontSizeMultiplier).toBe(1.2);
    // Measured as one piece: its no-break spaces are not places to wrap.
    const copy = screen.getByTestId('fit-copy-total', { includeHiddenElements: true });
    expect(copy.props.children).toBe(total);

    for (const [testID, width] of [
      ['fit-slot-total', 150],
      ['fit-copy-total', 200],
      ['fit-figure-total', 150],
    ] as const) {
      await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width, height: 30 } },
      });
    }
    expect(StyleSheet.flatten(screen.getByText(total).props.style).fontSize).toBeCloseTo(
      26 * 0.74,
      5,
    );
  });
});

describe("A bill's own page", () => {
  it('reads in Spanish, details and charges', async () => {
    setLanguage('es');
    const screen = await render(<BillDetailScreen />);

    expect(screen.getByText('$1,100.00')).toBeTruthy();
    expect(screen.getByText('Mensual')).toBeTruthy();
    expect(screen.getByText('Próximo vencimiento')).toBeTruthy();
    expect(screen.getByText('Se paga con')).toBeTruthy();
    expect(screen.getByText('Categoría')).toBeTruthy();
    expect(screen.getByText('Vivienda')).toBeTruthy();
    expect(screen.getByText('Inicio')).toBeTruthy();
    expect(screen.getByText('Nota')).toBeTruthy();
    expect(screen.getByText('Pagados')).toBeTruthy();
    expect(screen.getByText('Pagado')).toBeTruthy();
    expect(screen.getByText('Próximos')).toBeTruthy();
    expect(screen.getByText('Vence')).toBeTruthy();
    expect(screen.getByLabelText('Mes')).toBeTruthy();
    expect(screen.getByLabelText('Año')).toBeTruthy();
    expect(screen.getByLabelText('Editar Renta')).toBeTruthy();
    expect(screen.getAllByText('15 oct 2026').length).toBeGreaterThan(0);
    expectNoRawText(screen.toJSON());
  });

  it('reads in French, and says when nothing was charged', async () => {
    setLanguage('fr');
    mockEntries = [];
    const screen = await render(<BillDetailScreen />);

    expect(screen.getByText(`1${NBSP}100,00${NBSP}$`)).toBeTruthy();
    expect(screen.getByText('Chaque mois')).toBeTruthy();
    expect(screen.getByText('Prochaine échéance')).toBeTruthy();
    expect(screen.getByText('15 oct. 2026')).toBeTruthy();
    expect(screen.getByText('Payée avec')).toBeTruthy();
    expect(screen.getByText('Logement')).toBeTruthy();
    expect(screen.getByText('Début')).toBeTruthy();
    expect(screen.getByLabelText('Modifier Renta')).toBeTruthy();
    expect(
      screen.getByText('Aucun prélèvement pour cette facture dans cette période.'),
    ).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});
