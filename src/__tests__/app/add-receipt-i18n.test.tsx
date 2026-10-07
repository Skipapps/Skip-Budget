import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import AddReceiptScreen from '@/app/add-receipt';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Add receipt read in Spanish and French: the questions, the capture buttons, what a scan read
 * (a list whose articles change with the language) and the dialogs it raises.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/components/flow/amount-step', () => ({ AmountStep: () => null }));
jest.mock('@/components/brands/brand-field', () => {
  const { Text } = jest.requireActual('react-native');
  return { BrandField: ({ label }: { label: string }) => <Text>{label}</Text> };
});
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/ui/source-tiles', () => ({ SourceTiles: () => null }));
jest.mock('@/components/ui/text-field', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    TextField: ({ label, placeholder }: { label: string; placeholder: string }) => (
      <Text>{`${label} / ${placeholder}`}</Text>
    ),
  };
});
jest.mock('@/components/flow/inline-calendar', () => ({ InlineCalendar: () => null }));

const mockScanner = { capture: true, recognition: true };
jest.mock('../../../modules/receipt-scanner', () => ({
  captureReceipt: jest.fn(),
  isCaptureAvailable: () => mockScanner.capture,
  isRecognitionAvailable: () => mockScanner.recognition,
  isScanningAvailable: () => mockScanner.capture,
  recognizeReceipt: jest.fn(),
  recognizeText: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: async () => ({ granted: false }),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    body: '#333333',
    danger: '#CC0000',
    accentInk: '#905479',
  }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockAsk = jest.fn();
const mockConfirm = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
  useDialog: () => mockAsk,
}));

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

let mockPro = { pro: true, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));

jest.mock('@/api/mutations', () => ({
  useCreateReceipt: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateReceipt: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteReceipt: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock('@/api/brands', () => ({
  guessCategory: () => 'groceries',
  matchBrand: () => null,
  useBrandDirectory: () => ({ data: [] }),
  useSpendCategories: () => ({ data: [{ id: 'groceries', label: 'Groceries', hint: null }] }),
}));

let mockReceipt: { data: unknown; isError: boolean; isFetched: boolean } = {
  data: null,
  isError: false,
  isFetched: false,
};
jest.mock('@/api/queries', () => ({
  useReceipt: () => ({ ...mockReceipt, refetch: jest.fn() }),
  usePaymentSources: () => ({
    sources: [{ id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' }],
  }),
}));

const NBSP = ' ';

/** A scan from the receipts list that read the store and the total, not the date or the card. */
const PARTIAL_SCAN = {
  scannedStore: 'Oxxo',
  scannedCategory: 'groceries',
  scannedAmount: '1234.5',
  scannedSource: 'card-1',
  scannedRead: 'store,amount',
};

const SAVED = {
  id: 'receipt-1',
  merchant: 'Oxxo',
  amount: 12.4,
  purchased_on: '2026-09-10',
  category_id: 'groceries',
  brand_id: null,
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  source: 'manual',
  brands: null,
};

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
  jest.clearAllMocks();
  resetLocaleForTests();
  mockParams = {};
  mockPro = { pro: true, ready: true };
  mockScanner.capture = true;
  mockScanner.recognition = true;
  mockReceipt = { data: null, isError: false, isFetched: false };
});
afterAll(() => resetLocaleForTests());

describe('Add receipt in Spanish', () => {
  it('reports what a scan read, with each field’s article', async () => {
    setLanguage('es');
    mockParams = PARTIAL_SCAN;
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Agregar un recibo')).toBeTruthy();
    expect(screen.getByText('¿Cuándo fue?')).toBeTruthy();
    expect(screen.getByText('Leímos la tienda y el importe.')).toBeTruthy();
    expect(
      screen.getByText('Revisa la fecha y la tarjeta abajo: se guardará de todos modos.'),
    ).toBeTruthy();
    expect(screen.getByLabelText(/^Importe.*\$1,234\.50/)).toBeTruthy();
    expect(screen.getByLabelText(/^Tienda.*Oxxo/)).toBeTruthy();
    expect(screen.getByLabelText(/^Pagado con.*VISA ••4421/)).toBeTruthy();
    expect(screen.getByText('Guardar recibo')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('offers Scan and Upload as Pro, and asks the amount', async () => {
    setLanguage('es');
    mockPro = { pro: false, ready: true };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('¿Cuánto gastaste?')).toBeTruthy();
    expect(screen.getByText('Continuar')).toBeTruthy();
    expect(screen.getByLabelText('Escanear').props.accessibilityHint).toBe(
      'Apunta la cámara a un recibo de papel. Parte de Skip Pro.',
    );
    expect(screen.getByLabelText('Subir').props.accessibilityHint).toBe(
      'Sube una foto o un PDF de un recibo. Parte de Skip Pro.',
    );
    expectNoRawText(screen.toJSON());
  });

  it('files an edit under its category, and asks before deleting', async () => {
    setLanguage('es');
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: SAVED, isError: false, isFetched: true };
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Editar recibo')).toBeTruthy();
    await fireEvent.press(screen.getByText('Continuar'));

    expect(screen.getByText('Tienda')).toBeTruthy();
    expect(screen.getByText('Pagado con')).toBeTruthy();
    expect(screen.getByText('Nota / Algo que valga la pena recordar')).toBeTruthy();
    expect(screen.getByText('Archivado en Supermercado')).toBeTruthy();
    expect(screen.getByText('Eliminar recibo')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await fireEvent.press(screen.getByLabelText('Eliminar este recibo'));
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '¿Eliminar este recibo?',
        message: 'Esto no se puede deshacer.',
        confirmLabel: 'Eliminar',
      }),
    );
  });
});

describe('Add receipt in French', () => {
  it('reports what a scan read, the amount written the Canadian way', async () => {
    setLanguage('fr');
    mockParams = PARTIAL_SCAN;
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Ajouter un reçu')).toBeTruthy();
    expect(screen.getByText(`C’était quand${NBSP}?`)).toBeTruthy();
    expect(screen.getByText('Nous avons lu le magasin et le montant.')).toBeTruthy();
    expect(
      screen.getByText(
        `Vérifie la date et la carte ci-dessous${NBSP}: il sera enregistré quand même.`,
      ),
    ).toBeTruthy();
    // Queries fold a no-break space into a plain one, so the label is compared as it is.
    expect(screen.getByLabelText(/^Montant, /).props.accessibilityLabel).toBe(
      `Montant, 1${NBSP}234,50${NBSP}$`,
    );
    expect(screen.getByText('Enregistrer le reçu')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('lists three fields with commas and "et"', async () => {
    setLanguage('fr');
    mockParams = { ...PARTIAL_SCAN, scannedRead: 'store,amount,date' };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Nous avons lu le magasin, le montant et la date.')).toBeTruthy();
    expect(
      screen.getByText(`Vérifie la carte ci-dessous${NBSP}: il sera enregistré quand même.`),
    ).toBeTruthy();
  });

  it('says a phone without a camera cannot scan', async () => {
    setLanguage('fr');
    mockScanner.capture = false;
    const screen = await render(<AddReceiptScreen />);

    await fireEvent.press(screen.getByLabelText('Numériser'));

    await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
    expect(mockAsk).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'La numérisation nécessite une caméra',
        message: `Le simulateur n’en a pas, donc la numérisation est impossible ici. «${NBSP}Importer${NBSP}» lit une photo ou un PDF et fonctionne partout.`,
      }),
    );
  });

  it('asks where an upload is, and says when photos are not allowed', async () => {
    setLanguage('fr');
    mockAsk.mockResolvedValue('photos');
    const screen = await render(<AddReceiptScreen />);

    await fireEvent.press(screen.getByLabelText('Importer'));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Autorise l’accès aux photos dans Réglages pour lire un reçu de ta photothèque.',
        ),
      ).toBeTruthy(),
    );
    expect(mockAsk).toHaveBeenCalledWith({
      title: `Où est le reçu${NBSP}?`,
      actions: [
        { id: 'photos', label: 'Photothèque' },
        { id: 'files', label: 'Fichiers' },
      ],
    });
  });

  it('says the one failure line when the receipt cannot be read', async () => {
    setLanguage('fr');
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: null, isError: true, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy();
    expect(screen.getByText('Réessayer')).toBeTruthy();
    expect(screen.getByText('Revenir')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});
