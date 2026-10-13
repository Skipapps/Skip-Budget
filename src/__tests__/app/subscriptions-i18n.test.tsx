import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  getDefaultNormalizer,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import SubscriptionDetailScreen from '@/app/subscription/[id]';
import SubscriptionsScreen from '@/app/subscriptions';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Subscriptions and one subscription's page read in Spanish and French: the words, the cycles
 * mapped from their stored values, the counts, the dates and the money. The month page runs its own
 * hook, `usePlanMonth`, over the real ledger; only the reads under it are fakes.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
let mockParams: Record<string, string> = { id: 's1' };
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

const SUBSCRIPTIONS = [
  {
    id: 's1',
    name: 'Netflix',
    amount: 15.99,
    cycle: 'monthly',
    next_renewal_on: '2026-10-12',
    started_on: '2026-01-12',
    created_at: '2026-01-12T12:00:00Z',
    category_id: 'entertainment',
    card_id: 'card-1',
    bank_account_id: null,
    note: 'Plan estándar',
    active: true,
    brands: null,
  },
  {
    id: 's2',
    name: 'Costco',
    amount: 1200,
    cycle: 'yearly',
    next_renewal_on: '2027-03-01',
    started_on: '2026-03-01',
    created_at: '2026-03-01T12:00:00Z',
    category_id: 'shopping',
    card_id: null,
    bank_account_id: null,
    note: null,
    active: true,
    brands: null,
  },
  {
    id: 's3',
    name: 'Calm',
    amount: 14.99,
    cycle: 'quarterly',
    next_renewal_on: '2026-11-01',
    started_on: null,
    created_at: '2026-01-12T12:00:00Z',
    category_id: 'entertainment',
    card_id: 'card-1',
    bank_account_id: null,
    note: null,
    active: false,
    brands: null,
  },
];

const record = (
  id: string,
  plan: string,
  on: string,
  label: string,
  amount: number,
  card = '',
) => ({
  id,
  bill_id: null,
  subscription_id: plan,
  label,
  amount,
  charged_on: on,
  card_id: card || null,
  bank_account_id: null,
});

// What was recorded: Netflix on 12 Sep, Costco on 1 Mar, Calm (cancelled) last on 1 Aug. Today is
// 3 Oct, so Netflix's 12 Oct is still to come.
const CHARGES = [
  record('c1', 's1', '2026-09-12', 'Netflix', 15.99, 'card-1'),
  record('c2', 's2', '2026-03-01', 'Costco', 1200),
  record('c3', 's3', '2026-08-01', 'Calm', 14.99, 'card-1'),
  record('c4', 's3', '2026-05-01', 'Calm', 14.99, 'card-1'),
];

const renewal = (date: string, planId = 's1') => ({
  id: `subscription-${planId}@${date}`,
  label: planId === 's1' ? 'Netflix' : 'Costco',
  amount: planId === 's1' ? -15.99 : -1200,
  date,
  kind: 'subscription',
  sourceId: planId === 's1' ? 'card-1' : '',
  planId,
});

type Read = { data: unknown[] | undefined; isLoading: boolean; isError: boolean };
let mockSubscriptions: Read;
let mockCharges: unknown[];
let mockEntries: ReturnType<typeof renewal>[];

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
jest.mock('@/api/charges', () => ({
  ...jest.requireActual('@/api/charges'),
  useCharges: () => ({
    data: mockCharges,
    isSuccess: true,
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
  useSubscriptions: () => ({
    ...mockSubscriptions,
    isPending: mockSubscriptions.isLoading,
    refetch: jest.fn(),
  }),
  useBills: () => ({
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

const textOf = (node: { props: Record<string, unknown> }) =>
  [node.props.children as unknown]
    .flat(Infinity)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');
/** Every line a node draws, top to bottom. */
const linesIn = (node: Parameters<typeof within>[0]) => within(node).getAllByText(/./).map(textOf);

/** The page, with what its refresh needs around it. */
function show(page: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockParams = { id: 's1' };
  mockSubscriptions = { data: SUBSCRIPTIONS, isLoading: false, isError: false };
  mockCharges = CHARGES;
  mockEntries = [renewal('2026-09-12'), renewal('2026-10-01', 's2')];
  const window = { width: 390, height: 844, scale: 3, fontScale: 1 };
  Dimensions.set({ window, screen: window });
});
afterAll(() => resetLocaleForTests());

describe('Subscriptions', () => {
  it('reads in Spanish: the card, Coming up, every subscription with its cycle, and the cancelled one', async () => {
    setLanguage('es');
    await show(<SubscriptionsScreen />);

    expect(screen.getByRole('header', { name: 'Suscripciones' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agregar suscripción' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Buscar pagos' })).toBeTruthy();
    // 15.99 a month is what is due in October: the yearly Costco is not due until March, and the
    // cancelled Calm adds nothing.
    expect(linesIn(screen.getByTestId('month-card-summary'))).toEqual([
      'A pagar en octubre',
      '$15.99',
      '1 suscripción · pagadas: 0 · por pagar: 1',
      'Próximo: Netflix · 12 oct',
    ]);

    const coming = within(screen.getByTestId('coming-up'));
    expect(coming.getByRole('header', { name: 'Próximos, 1' })).toBeTruthy();
    expect(
      coming.getByLabelText('Netflix, $15.99, vence el 12 oct, en 9 días, VISA ••4421'),
    ).toBeTruthy();

    // The cancelled one is not counted: it is listed under Canceladas.
    const all = within(screen.getByTestId('all-plans'));
    expect(all.getByRole('header', { name: 'Todas las suscripciones, 2' })).toBeTruthy();
    expect(linesIn(screen.getByTestId('plan-row-s1'))).toEqual([
      'Netflix',
      'Mensual · VISA ••4421',
      '$15.99',
      'Próximo: 12 oct',
    ]);
    expect(linesIn(screen.getByTestId('plan-row-s2'))).toEqual([
      'Costco',
      'Anual ·',
      'Agregar una tarjeta',
      '$1,200.00',
      'Próximo: 1 mar 2027',
    ]);
    expect(
      all.getByLabelText('Netflix, $15.99, Mensual, VISA ••4421, Próximo: 12 oct'),
    ).toBeTruthy();
    expect(
      all.getByLabelText('Costco, $1,200.00, Anual, Sin tarjeta, Próximo: 1 mar 2027'),
    ).toBeTruthy();

    const cancelled = within(screen.getByTestId('stopped-plans'));
    expect(cancelled.getByRole('header', { name: 'Canceladas, 1' })).toBeTruthy();
    expect(cancelled.getByText('Cancelada · último cargo el 1 ago 2026')).toBeTruthy();
    expect(
      cancelled.getByLabelText(
        'Calm, $14.99, Trimestral, VISA ••4421, Cancelada, último cargo el 1 ago 2026',
      ),
    ).toBeTruthy();
    expect(cancelled.queryByText('Netflix')).toBeNull();
    expectNoRawText(screen.toJSON());
  });

  it('reads in French, the money with its no-break spaces and the cancelled one as Annulé', async () => {
    setLanguage('fr');
    await show(<SubscriptionsScreen />);

    expect(screen.getByRole('header', { name: 'Abonnements' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ajouter un abonnement' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rechercher des paiements' })).toBeTruthy();
    expect(screen.getByText('1 abonnement · payés : 0 · à venir : 1')).toBeTruthy();
    // Matched without folding spaces, so the no-break space before the mark is proven.
    expect(
      within(screen.getByTestId('fit-figure-month-card-figure')).getByText(`15,99${NBSP}$`, {
        normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
      }),
    ).toBeTruthy();
    expect(screen.getByText('Tous les abonnements')).toBeTruthy();
    expect(screen.getByText('Chaque mois · VISA ••4421')).toBeTruthy();
    expect(screen.getByText('Chaque année ·')).toBeTruthy();
    expect(screen.getByText('Prochain : 1 mars 2027')).toBeTruthy();
    expect(
      screen.getByLabelText(`Netflix, 15,99${NBSP}$, Chaque mois, VISA ••4421, Prochain : 12 oct.`),
    ).toBeTruthy();
    expect(screen.getByText('Annulés')).toBeTruthy();
    expect(screen.getByText('Annulé · dernier prélèvement le 1 août 2026')).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Calm, 14,99${NBSP}$, Chaque trimestre, VISA ••4421, Annulé, dernier prélèvement le 1 août 2026`,
      ),
    ).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says a paid subscription is Payé in a month already gone, with nothing coming up', async () => {
    setLanguage('fr');
    mockParams = { month: '2026-03' };
    await show(<SubscriptionsScreen />);

    expect(screen.getByText('1 abonnement · payés : 1 · à venir : 0')).toBeTruthy();
    expect(screen.queryByTestId('coming-up')).toBeNull();
    expect(
      screen.getByLabelText(`Costco, 1${NBSP}200,00${NBSP}$, Chaque année, Aucune carte, Payé`),
    ).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says in French what is due when only a cancelled one is left, and that it never charged', async () => {
    setLanguage('fr');
    mockSubscriptions = { ...mockSubscriptions, data: [SUBSCRIPTIONS[2]] };
    mockCharges = [];
    await show(<SubscriptionsScreen />);

    expect(linesIn(screen.getByTestId('month-card-summary'))).toEqual([
      'À payer en octobre',
      `0,00${NBSP}$`,
      'Rien à payer en octobre',
    ]);
    expect(screen.queryByTestId('coming-up')).toBeNull();
    expect(screen.queryByTestId('all-plans')).toBeNull();
    // Never charged: no last charge to give.
    expect(within(screen.getByTestId('stopped-plans')).getByText('Annulé')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says so in French when there are none yet, and when the page cannot be read', async () => {
    setLanguage('fr');
    mockSubscriptions = { ...mockSubscriptions, data: [] };
    mockCharges = [];
    const empty = await show(<SubscriptionsScreen />);

    expect(screen.getByText('Pas encore d’abonnements')).toBeTruthy();
    expect(
      screen.getByText(
        'Ajoute ceux que tu paies et Skip te montrera ce qu’ils te coûtent chaque mois.',
      ),
    ).toBeTruthy();
    // The page's own button, and the + in the header.
    expect(screen.getAllByRole('button', { name: 'Ajouter un abonnement' })).toHaveLength(2);
    expectNoRawText(screen.toJSON());
    await empty.unmount();

    mockSubscriptions = { data: undefined, isLoading: false, isError: true };
    await show(<SubscriptionsScreen />);
    expect(screen.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy();
    expect(screen.getByText('Réessayer')).toBeTruthy();
  });

  it('keeps the figure whole at large text, wrapping a row rather than cutting it', async () => {
    setLanguage('fr');
    const window = { width: 375, height: 812, scale: 3, fontScale: 1.3 };
    Dimensions.set({ window, screen: window });
    await show(<SubscriptionsScreen />);

    const total = `15,99${NBSP}$`;
    const normalizer = getDefaultNormalizer({ collapseWhitespace: false });
    const figure = within(screen.getByTestId('fit-figure-month-card-figure')).getByText(total, {
      normalizer,
    });
    expect(figure.props.numberOfLines).toBeUndefined();
    expect(figure.props.adjustsFontSizeToFit).toBeUndefined();
    expect(figure.props.maxFontSizeMultiplier).toBe(TEXT_CAP.figure);
    expect(
      screen.getByTestId('fit-copy-month-card-figure', { includeHiddenElements: true }).props
        .children,
    ).toBe(total);
    // Each row draws its name and amount whole as well.
    for (const row of ['plan-row-s1', 'plan-row-s2']) {
      for (const line of within(screen.getByTestId(row)).getAllByText(/./)) {
        expect([row, line.props.numberOfLines]).toEqual([row, undefined]);
        expect([row, line.props.adjustsFontSizeToFit]).toEqual([row, undefined]);
      }
    }

    for (const [testID, width] of [
      ['fit-slot-month-card-figure', 100],
      ['fit-copy-month-card-figure', 160],
      ['fit-figure-month-card-figure', 100],
    ] as const) {
      await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width, height: 30 } },
      });
    }
    // Shrunk on its own, in step with the room it has.
    expect(
      StyleSheet.flatten(
        within(screen.getByTestId('fit-figure-month-card-figure')).getByText(total, { normalizer })
          .props.style,
      ).fontSize,
    ).toBeCloseTo(36 * 0.61, 5);
  });
});

describe("A subscription's own page", () => {
  it('reads in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<SubscriptionDetailScreen />);

    expect(screen.getByText('$15.99')).toBeTruthy();
    expect(screen.getByText('Mensual')).toBeTruthy();
    expect(screen.getByText('Próxima renovación')).toBeTruthy();
    expect(screen.getByText('12 oct 2026')).toBeTruthy();
    expect(screen.getByText('Se paga con')).toBeTruthy();
    expect(screen.getByText('Inicio')).toBeTruthy();
    expect(screen.getByText('12 ene 2026')).toBeTruthy();
    expect(screen.getByText('Nota')).toBeTruthy();
    expect(screen.getByText('Pagados')).toBeTruthy();
    expect(screen.getByLabelText('Editar Netflix')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads in French for a cancelled subscription', async () => {
    setLanguage('fr');
    mockSubscriptions = {
      data: [{ ...SUBSCRIPTIONS[0], active: false, card_id: null }],
      isLoading: false,
      isError: false,
    };
    mockEntries = [];
    const screen = await render(<SubscriptionDetailScreen />);

    expect(screen.getByText(`15,99${NBSP}$`)).toBeTruthy();
    // Under the amount; there is no renewal to come.
    expect(screen.getByText('Annulé')).toBeTruthy();
    expect(screen.queryByText('Prochain renouvellement')).toBeNull();
    // Final: no pencil, and Delete on the page.
    expect(screen.queryByLabelText('Modifier Netflix')).toBeNull();
    expect(screen.getByRole('button', { name: 'Supprimer l’abonnement' })).toBeTruthy();
    expect(screen.getByText('Payé avec')).toBeTruthy();
    expect(screen.getByText('Aucun mode de paiement')).toBeTruthy();
    expect(
      screen.getByText('Aucun prélèvement pour cet abonnement dans cette période.'),
    ).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});
