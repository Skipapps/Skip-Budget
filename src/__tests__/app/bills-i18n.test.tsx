import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  getDefaultNormalizer,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import BillDetailScreen from '@/app/bill/[id]';
import BillsScreen from '@/app/bills';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Monthly bills and one bill's page read in Spanish and French: the words, the schedules and
 * categories mapped from their stored values, the counts, the dates and the money. The month page
 * runs its own hook, `usePlanMonth`, over the real ledger; only the reads under it are fakes.
 */

// The bill category icons follow the theme, which this file's theme mock does not provide.
jest.mock('@/theme/bill-icons', () => ({
  useBillIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
let mockParams: Record<string, string> = { id: 'b1' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null, SkeletonList: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#222222',
    muted: '#777777',
    line: '#DDDDDD',
    accentInk: '#905479',
  }),
  useMoneyColor: () => () => '#000000',
  useTheme: () => ({ scheme: 'light' }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

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
    created_at: '2026-07-20T12:00:00Z',
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
    created_at: '2026-07-20T12:00:00Z',
    note: null,
    brands: null,
  },
];

// What was recorded: Renta on 15 Sep, CFE on 1 Aug. Today is 3 Oct, so 15 Oct is still to come.
const CHARGES = [
  {
    id: 'c1',
    bill_id: 'b1',
    subscription_id: null,
    label: 'Renta',
    amount: 1100,
    charged_on: '2026-09-15',
    card_id: 'card-1',
    bank_account_id: null,
  },
  {
    id: 'c2',
    bill_id: 'b2',
    subscription_id: null,
    label: 'CFE',
    amount: 30.5,
    charged_on: '2026-08-01',
    card_id: null,
    bank_account_id: null,
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

type Read = {
  data: unknown[] | undefined;
  isPending: boolean;
  isLoading: boolean;
  isError: boolean;
};
let mockBills: Read;
let mockCharges: unknown[];
let mockEntries: ReturnType<typeof charge>[];

// No loan behind these bills: the page stays a bill page.
// The stopped-plan Delete reads the charges and deletes; neither is reached on a running plan.
jest.mock('@/api/past-charges', () => ({
  usePastCharges: () => ({
    ready: true,
    count: 0,
    lastChargedOn: null,
    chooseDelete: jest.fn(),
    retry: jest.fn(),
  }),
}));
jest.mock('@/api/mutations', () => ({
  useDeleteBill: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteSubscription: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => jest.fn() }));

jest.mock('@/api/loans', () => ({
  useLoanDetail: () => ({ data: { kind: 'bill' }, isPending: false, isError: false }),
  // No loan here: a stopped loan's row reads these, and none is shown.
  useLoans: () => ({ loans: [], isPending: false, isError: false, refetch: jest.fn() }),
  loanTermsOf: () => null,
}));
jest.mock('@/api/charges', () => ({
  ...jest.requireActual('@/api/charges'),
  useCharges: () => ({
    data: mockCharges,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/api/payment-labels', () => ({
  usePaymentLabels: () => ({
    sources: [],
    labelOf: (id: string) => (id === 'card-1' ? 'VISA ••4421' : null),
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/api/queries', () => ({
  ...jest.requireActual('@/api/queries'),
  useBills: () => ({ ...mockBills, refetch: jest.fn() }),
  useSubscriptions: () => ({
    data: [],
    isPending: false,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useLoanPayoffRows: () => ({
    data: [],
    isPending: false,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  usePaymentSources: () => ({
    sources: [{ id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' }],
  }),
  useLedger: () => ({
    entries: mockEntries,
    // On Pro the whole window and the list are the same rows.
    allEntries: mockEntries,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.useFakeTimers({
  now: new Date('2026-10-03T12:00:00'),
  doNotFake: ['nextTick', 'setImmediate'],
});

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

const textOf = (node: { props: Record<string, unknown> }) =>
  [node.props.children as unknown]
    .flat(Infinity)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');
/** Every line a node draws, top to bottom. */
const linesIn = (node: Parameters<typeof within>[0]) => within(node).getAllByText(/./).map(textOf);

/** The page, with what its refresh needs around it. */
function show(page: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockParams = { id: 'b1' };
  mockBills = { data: BILLS, isPending: false, isLoading: false, isError: false };
  mockCharges = CHARGES;
  mockEntries = [charge('2026-09-15'), charge('2026-10-15'), charge('2026-10-01', 'b2')];
  const window = { width: 390, height: 844, scale: 3, fontScale: 1 };
  Dimensions.set({ window, screen: window });
});
afterAll(() => resetLocaleForTests());

describe('Monthly bills', () => {
  it('reads in Spanish: the card, Coming up and every bill, with each schedule from its stored value', async () => {
    setLanguage('es');
    await show(<BillsScreen />);

    expect(screen.getByRole('header', { name: 'Facturas mensuales' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agregar factura' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Buscar pagos' })).toBeTruthy();
    expect(linesIn(screen.getByTestId('month-card-summary'))).toEqual([
      'A pagar en octubre',
      '$1,100.00',
      '1 factura · pagadas: 0 · por pagar: 1',
      'Próximo: Renta · 15 oct',
    ]);
    expect(screen.getByTestId('month-card-summary').props.accessibilityLabel).toBe(
      'A pagar en octubre: $1,100.00. 1 factura · pagadas: 0 · por pagar: 1. Próximo: Renta · 15 oct',
    );
    expect(
      screen.getByRole('button', { name: 'Mes: octubre de 2026. Elige otro mes' }),
    ).toBeTruthy();

    const coming = within(screen.getByTestId('coming-up'));
    expect(coming.getByRole('header', { name: 'Próximos, 1' })).toBeTruthy();
    expect(
      coming.getByLabelText('Renta, $1,100.00, vence el 15 oct, en 12 días, VISA ••4421'),
    ).toBeTruthy();

    const all = within(screen.getByTestId('all-plans'));
    expect(all.getByRole('header', { name: 'Todas las facturas, 2' })).toBeTruthy();
    // Each schedule is the stored value in words: monthly, and every 3 months for quarterly.
    expect(linesIn(screen.getByTestId('plan-row-b1'))).toEqual([
      'Renta',
      'Mensual · VISA ••4421',
      '$1,100.00',
      'Próximo: 15 oct',
    ]);
    expect(linesIn(screen.getByTestId('plan-row-b2'))).toEqual([
      'CFE',
      'Cada 3 meses ·',
      'Agregar una tarjeta',
      '$30.50',
      'Próximo: 1 nov 2026',
    ]);
    expect(
      all.getByLabelText('Renta, $1,100.00, Mensual, VISA ••4421, Próximo: 15 oct'),
    ).toBeTruthy();
    expect(
      all.getByLabelText('CFE, $30.50, Cada 3 meses, Sin tarjeta, Próximo: 1 nov 2026'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver historial de pagos' })).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads in French, the money with its no-break spaces', async () => {
    setLanguage('fr');
    await show(<BillsScreen />);

    expect(screen.getByRole('header', { name: 'Factures mensuelles' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ajouter une facture' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rechercher des paiements' })).toBeTruthy();
    expect(screen.getByTestId('month-card-summary').props.accessibilityLabel).toBe(
      `À payer en octobre${NBSP}: 1${NBSP}100,00${NBSP}$. 1 facture · payées${NBSP}: 0 · à venir${NBSP}: 1. Prochain${NBSP}: Renta · 15 oct.`,
    );
    // Matched without folding spaces, so the no-break spaces are proven.
    expect(
      within(screen.getByTestId('fit-figure-month-card-figure')).getByText(
        `1${NBSP}100,00${NBSP}$`,
        {
          normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
        },
      ),
    ).toBeTruthy();
    expect(screen.getByText('1 facture · payées : 0 · à venir : 1')).toBeTruthy();
    expect(screen.getByText('À venir')).toBeTruthy();
    expect(screen.getByText('Toutes les factures')).toBeTruthy();
    expect(screen.getByText('Chaque mois · VISA ••4421')).toBeTruthy();
    expect(screen.getByText('Tous les 3 mois ·')).toBeTruthy();
    expect(screen.getByText('Ajouter une carte')).toBeTruthy();
    expect(screen.getByText('Prochain : 1 nov. 2026')).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Renta, 1${NBSP}100,00${NBSP}$, Chaque mois, VISA ••4421, Prochain : 15 oct.`,
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Renta, 1${NBSP}100,00${NBSP}$, à payer le 15 oct., dans 12 jours, VISA ••4421`,
      ),
    ).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says a paid bill is Payé in a month already gone, with nothing coming up', async () => {
    setLanguage('fr');
    mockParams = { month: '2026-09' };
    await show(<BillsScreen />);

    expect(screen.getByText('1 facture · payées : 1 · à venir : 0')).toBeTruthy();
    expect(screen.queryByTestId('coming-up')).toBeNull();
    expect(
      screen.getByLabelText(`Renta, 1${NBSP}100,00${NBSP}$, Chaque mois, VISA ••4421, Payé`),
    ).toBeTruthy();
    expect(screen.getByTestId('month-chip')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says in French what is due when no bill falls in the month, and lists the bill with its next date', async () => {
    setLanguage('fr');
    mockBills = { ...mockBills, data: [BILLS[1]] };
    await show(<BillsScreen />);

    expect(linesIn(screen.getByTestId('month-card-summary'))).toEqual([
      'À payer en octobre',
      `0,00${NBSP}$`,
      'Rien à payer en octobre',
    ]);
    expect(screen.queryByTestId('coming-up')).toBeNull();
    expect(screen.getByText('Prochain : 1 nov. 2026')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says so in French when there are no bills, and when the page cannot be read', async () => {
    setLanguage('fr');
    mockBills = { ...mockBills, data: [] };
    mockCharges = [];
    const empty = await show(<BillsScreen />);

    expect(screen.getByText('Pas encore de factures')).toBeTruthy();
    // The page's own button, and the + in the header.
    expect(screen.getAllByRole('button', { name: 'Ajouter une facture' })).toHaveLength(2);
    expectNoRawText(screen.toJSON());
    await empty.unmount();

    mockBills = { data: undefined, isPending: false, isLoading: false, isError: true };
    await show(<BillsScreen />);
    expect(screen.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy();
    expect(screen.getByText('Réessayer')).toBeTruthy();
  });

  it('keeps the figure whole at large text, in French too, and shrinks it alone if it must', async () => {
    setLanguage('fr');
    const window = { width: 375, height: 812, scale: 3, fontScale: 1.3 };
    Dimensions.set({ window, screen: window });
    await show(<BillsScreen />);

    const total = `1${NBSP}100,00${NBSP}$`;
    const figure = within(screen.getByTestId('fit-figure-month-card-figure')).getByText(total, {
      normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
    });
    expect(figure.props.numberOfLines).toBeUndefined();
    expect(figure.props.adjustsFontSizeToFit).toBeUndefined();
    expect(figure.props.maxFontSizeMultiplier).toBe(TEXT_CAP.figure);
    // Measured as one piece: its no-break spaces are not places to wrap.
    const copy = screen.getByTestId('fit-copy-month-card-figure', { includeHiddenElements: true });
    expect(copy.props.children).toBe(total);

    for (const [testID, width] of [
      ['fit-slot-month-card-figure', 150],
      ['fit-copy-month-card-figure', 200],
      ['fit-figure-month-card-figure', 150],
    ] as const) {
      await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width, height: 30 } },
      });
    }
    expect(
      StyleSheet.flatten(
        within(screen.getByTestId('fit-figure-month-card-figure')).getByText(total, {
          normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
        }).props.style,
      ).fontSize,
    ).toBeCloseTo(36 * 0.74, 5);
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
