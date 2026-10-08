import { fireEvent, getDefaultNormalizer, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import SubscriptionPlansScreen from '@/app/subscription-plans';
import SubscriptionDetailScreen from '@/app/subscription/[id]';
import SubscriptionsScreen from '@/app/subscriptions';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The subscription list, the renewals charged and one subscription's page read in Spanish and
 * French: the words, the cycles mapped from their stored values, the counts, the dates and the money.
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
  useLocalSearchParams: () => ({ id: 's1' }),
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

const SUBSCRIPTIONS = [
  {
    id: 's1',
    name: 'Netflix',
    amount: 15.99,
    cycle: 'monthly',
    next_renewal_on: '2026-10-12',
    started_on: '2026-01-12',
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
    next_renewal_on: null,
    started_on: null,
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
    card_id: 'card-1',
    bank_account_id: null,
    note: null,
    active: false,
    brands: null,
  },
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

let mockSubscriptions: { data: unknown[]; isLoading: boolean; isError: boolean };
let mockEntries: ReturnType<typeof renewal>[];

jest.mock('@/api/queries', () => ({
  useSubscriptions: () => ({
    ...mockSubscriptions,
    isPending: mockSubscriptions.isLoading,
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

beforeEach(() => {
  resetLocaleForTests();
  mockSubscriptions = { data: SUBSCRIPTIONS, isLoading: false, isError: false };
  mockEntries = [renewal('2026-09-12'), renewal('2026-10-01', 's2')];
});
afterAll(() => resetLocaleForTests());

describe('Your subscriptions', () => {
  it('reads in Spanish, with each cycle from its stored value', async () => {
    setLanguage('es');
    const screen = await render(<SubscriptionPlansScreen />);

    expect(screen.getByText('Tus suscripciones')).toBeTruthy();
    expect(screen.getByLabelText('Agregar suscripción')).toBeTruthy();
    expect(screen.getByPlaceholderText('Buscar suscripciones')).toBeTruthy();
    expect(screen.getByLabelText('Filtrar suscripciones')).toBeTruthy();
    expect(screen.getByText('3 suscripciones')).toBeTruthy();
    // 15.99 a month plus 1200 a year; the cancelled plan adds nothing.
    expect(screen.getByText('$115.99 / mes')).toBeTruthy();
    expect(screen.getByText('Mensual · VISA ••4421')).toBeTruthy();
    expect(screen.getByText('Anual')).toBeTruthy();
    expect(screen.getByText('Cancelada · VISA ••4421')).toBeTruthy();
    expect(screen.getByText('Sin fecha de renovación')).toBeTruthy();
    expect(screen.getByLabelText('Netflix, $15.99 Mensual, se cobra a VISA ••4421')).toBeTruthy();
    expect(screen.getByLabelText('Costco, $1,200.00 Anual')).toBeTruthy();
    expect(
      screen.getByLabelText('Calm, $14.99 Trimestral, se cobra a VISA ••4421, cancelada'),
    ).toBeTruthy();
    expect(screen.getAllByHintText('Abre esta suscripción')).toHaveLength(3);
    expectNoRawText(screen.toJSON());
  });

  it('says in Spanish when a search matches nothing', async () => {
    setLanguage('es');
    const screen = await render(<SubscriptionPlansScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Buscar suscripciones'), 'zzz');
    expect(screen.getByText('0 de 3 suscripciones')).toBeTruthy();
    expect(screen.getByText('Nada coincide')).toBeTruthy();
    expect(screen.getByText('Borrar filtros')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads in French and filters through the sheet', async () => {
    setLanguage('fr');
    const screen = await render(<SubscriptionPlansScreen />);

    expect(screen.getByText('Tes abonnements')).toBeTruthy();
    expect(screen.getByText('3 abonnements')).toBeTruthy();
    // Matched without folding spaces, so the no-break space before the mark is proven.
    expect(
      screen.getByText(`115,99${NBSP}$ / mois`, {
        normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
      }),
    ).toBeTruthy();
    expect(screen.getByText('Chaque mois · VISA ••4421')).toBeTruthy();
    expect(screen.getByText('Aucune date de renouvellement')).toBeTruthy();
    expect(
      screen.getByLabelText(`Netflix, 15,99${NBSP}$ Chaque mois, prélevé sur VISA ••4421`),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Filtrer les abonnements'));
    expect(screen.getByLabelText('Fermer les filtres')).toBeTruthy();
    expect(screen.getByText('Cycle de facturation')).toBeTruthy();
    expect(screen.getByText('Tous les cycles sont affichés.')).toBeTruthy();
    expect(screen.getByText('Prélevé sur')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await fireEvent.press(screen.getByLabelText('Chaque année'));
    await fireEvent.press(screen.getByText('Appliquer'));

    expect(screen.getByLabelText('Filtres, 1 actif')).toBeTruthy();
    expect(screen.getByText('1 sur 3 abonnements')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says so in French when there are none yet', async () => {
    setLanguage('fr');
    mockSubscriptions = { data: [], isLoading: false, isError: false };
    const screen = await render(<SubscriptionPlansScreen />);

    expect(screen.getByText('Pas encore d’abonnements')).toBeTruthy();
    expect(
      screen.getByText(
        'Ajoute ceux que tu paies et Skip te montrera ce qu’ils te coûtent chaque mois.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Ajouter un abonnement')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});

describe('Subscriptions charged', () => {
  it('reads in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<SubscriptionsScreen />);

    expect(screen.getByText('Suscripciones')).toBeTruthy();
    expect(screen.getByText('Renovaciones cobradas')).toBeTruthy();
    expect(screen.getByText('2 cargos')).toBeTruthy();
    expect(screen.getByText('-$1,215.99')).toBeTruthy();
    expect(screen.getByText('Sin forma de pago')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads in French when nothing renewed', async () => {
    setLanguage('fr');
    mockEntries = [];
    const screen = await render(<SubscriptionsScreen />);

    expect(screen.getByText('Abonnements')).toBeTruthy();
    expect(screen.getByText('Renouvellements prélevés')).toBeTruthy();
    expect(screen.getAllByText('Rien dans cette période')).toHaveLength(2);
    expect(
      screen.getByText(
        'Rien ne s’est renouvelé dans cette période. Essaie une période plus longue.',
      ),
    ).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('keeps the total whole at large text, wrapping a renewal rather than cutting it', async () => {
    setLanguage('fr');
    const window = { width: 375, height: 812, scale: 3, fontScale: 1.3 };
    Dimensions.set({ window, screen: window });
    const screen = await render(<SubscriptionsScreen />);

    const total = `-1${NBSP}215,99${NBSP}$`;
    const figure = screen.getByText(total);
    expect(figure.props.numberOfLines).toBeUndefined();
    expect(figure.props.adjustsFontSizeToFit).toBeUndefined();
    expect(figure.props.maxFontSizeMultiplier).toBe(1.2);
    expect(
      screen.getByTestId('fit-copy-total', { includeHiddenElements: true }).props.children,
    ).toBe(total);
    // Each renewal row draws its name and amount whole as well.
    for (const node of screen.getAllByText(`-15,99${NBSP}$`)) {
      expect(node.props.numberOfLines).toBeUndefined();
    }
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
    expect(screen.getByText('Statut')).toBeTruthy();
    // The heading under the amount and the status row.
    expect(screen.getAllByText('Annulé')).toHaveLength(2);
    expect(screen.getByText('Payé avec')).toBeTruthy();
    expect(screen.getByText('Aucun mode de paiement')).toBeTruthy();
    expect(
      screen.getByText('Aucun prélèvement pour cet abonnement dans cette période.'),
    ).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});
