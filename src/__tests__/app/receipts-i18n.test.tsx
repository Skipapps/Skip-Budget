import { fireEvent, render } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import ReceiptsScreen from '@/app/receipts';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** The receipts list read in Spanish and French: the words, the count and the money. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));
jest.mock('@/api/scan', () => ({
  useReceiptScan: () => ({ scan: jest.fn(), scanning: false, available: true }),
  draftToParams: () => ({}),
}));

const TODAY = '2026-09-12';
const RECEIPTS = [
  { id: 'r2', merchant: 'Oxxo', amount: 1000, purchased_on: TODAY, card_id: 'card-1' },
  { id: 'r1', merchant: 'Soriana', amount: 234.56, purchased_on: '2026-09-10', card_id: null },
].map((row) => ({ bank_account_id: null, brands: null, ...row }));

let mockState: { data: unknown[]; isLoading: boolean; isError: boolean } = {
  data: RECEIPTS,
  isLoading: false,
  isError: false,
};

jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ ...mockState, refetch: jest.fn() }),
  usePaymentSources: () => ({
    sources: [{ id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' }],
  }),
}));

jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T09:00:00`));

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
  mockState = { data: RECEIPTS, isLoading: false, isError: false };
});
afterAll(() => resetLocaleForTests());

describe('Receipts in Spanish', () => {
  it('names the page, counts the receipts and totals them', async () => {
    setLanguage('es');
    const screen = await render(<ReceiptsScreen />);

    expect(screen.getByText('Recibos')).toBeTruthy();
    expect(screen.getByPlaceholderText('Buscar recibos')).toBeTruthy();
    expect(screen.getByLabelText('Filtrar recibos')).toBeTruthy();
    expect(screen.getByLabelText('Escanear un recibo')).toBeTruthy();
    expect(screen.getByLabelText('Agregar un recibo')).toBeTruthy();
    expect(screen.getByText('2 recibos')).toBeTruthy();
    expect(screen.getByText('-$1,234.56')).toBeTruthy();
    expect(screen.getByLabelText('Oxxo, -$1,000.00, pagado con VISA ••4421')).toBeTruthy();
    expect(screen.getByLabelText('Soriana, -$234.56')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says so when nothing has been added yet', async () => {
    setLanguage('es');
    mockState = { data: [], isLoading: false, isError: false };
    const screen = await render(<ReceiptsScreen />);

    expect(screen.getByText('Aún no hay recibos')).toBeTruthy();
    expect(screen.getByText('Agrega lo que gastas día a día y aparecerá aquí.')).toBeTruthy();
    expect(screen.getByText('Agregar un recibo')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says the one failure line when the list cannot be read', async () => {
    setLanguage('es');
    mockState = { data: [], isLoading: false, isError: true };
    const screen = await render(<ReceiptsScreen />);

    expect(screen.getByText('Algo salió mal. Inténtalo de nuevo.')).toBeTruthy();
    expect(screen.getByText('Intentar de nuevo')).toBeTruthy();
  });
});

describe('Receipts in French', () => {
  it('names the page, counts the receipts and totals them the Canadian way', async () => {
    setLanguage('fr');
    const screen = await render(<ReceiptsScreen />);

    expect(screen.getByText('Reçus')).toBeTruthy();
    expect(screen.getByPlaceholderText('Rechercher des reçus')).toBeTruthy();
    expect(screen.getByLabelText('Numériser un reçu')).toBeTruthy();
    expect(screen.getByText('2 reçus')).toBeTruthy();
    // Queries fold a no-break space into a plain one, so the figures are compared as they are.
    const total = `-1${NBSP}234,56${NBSP}$`;
    expect(screen.getByText(total).props.children).toBe(total);
    expect(screen.getByLabelText(/^Oxxo, /).props.accessibilityLabel).toBe(
      `Oxxo, -1${NBSP}000,00${NBSP}$, payé avec VISA ••4421`,
    );
    expectNoRawText(screen.toJSON());
  });

  it('offers to clear a search that matches nothing', async () => {
    setLanguage('fr');
    const screen = await render(<ReceiptsScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Rechercher des reçus'), 'Walmart');

    expect(screen.getByText('Aucun résultat')).toBeTruthy();
    expect(
      screen.getByText(
        'Aucun reçu ne correspond à cette recherche et à ces filtres. Essaie un autre magasin ou efface ce que tu as choisi.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Effacer les filtres')).toBeTruthy();
    // French reads 0 and 1 as singular.
    expect(screen.getByText('0 reçu')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});
