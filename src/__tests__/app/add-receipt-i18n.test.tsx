import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import AddReceiptScreen from '@/app/add-receipt';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Add receipt read in Spanish and French: the amount page, the final page and every page a line of
 * it opens, what a scan read (a list whose articles change with the language), the dates in each
 * language's own order, and the dialogs it raises.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));

const mockScanner = { capture: true, recognition: true };
jest.mock('../../../modules/receipt-scanner', () => ({
  hasLayoutRecognition: () => true,
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
    line: '#DDDDDD',
    danger: '#CC0000',
    accentInk: '#905479',
    onControl: '#FFFFFF',
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
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
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

// The real keyword guess and brand matching; only the reads that go to the network are replaced.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/brands', () => ({
  ...jest.requireActual('@/api/brands'),
  useBrandSearch: () => ({ data: [], isFetching: false }),
  useBrandDirectory: () => ({ data: [] }),
  useSpendCategories: () => ({ data: [{ id: 'groceries', label: 'Groceries', hint: null }] }),
}));
jest.mock('@/api/logos', () => ({
  useLogoMatch: () => ({ data: null, isLoading: false, isFetching: false }),
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

// Only the clock is fixed: Wednesday, October 7 2026. Real timers keep every render independent.
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
jest.setSystemTime(new Date('2026-10-07T09:00:00'));

const NBSP = '\u00a0';

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

type Screen = Awaited<ReturnType<typeof render>>;
type Node = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));

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

/**
 * French sets a no-break space before ? : ! ; and » and after «, so the mark never starts a line of
 * its own. A plain space there is a line that can wrap to a lone "?".
 */
function frenchSpacingFaults(tree: Node): string[] {
  return shownText(tree).filter((line) => /\S [?!:;»]|« \S/.test(line));
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
    expect(screen.getByText('Leímos la tienda y el importe.')).toBeTruthy();
    expect(
      screen.getByText('Revisa la fecha y la tarjeta abajo: se guardará de todos modos.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Importe.*\$1,234\.50/ })).toBeTruthy();
    expect(screen.getByLabelText('Cambiar tienda, ahora es Oxxo')).toBeTruthy();
    expect(screen.getByLabelText(/^Pagado con.*VISA ••4421/)).toBeTruthy();
    expect(screen.getByText('Guardar recibo')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('words the final page: the lines, their hints, the chips and the reassurance', async () => {
    setLanguage('es');
    mockParams = PARTIAL_SCAN;
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Puedes editarlo más tarde.')).toBeTruthy();
    expect(screen.getByText('Toca para editar')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Importe/ }).props.accessibilityHint).toBe(
      'Toca para editar',
    );
    expect(screen.getByLabelText('Fecha, Hoy, mié 7 oct').props.accessibilityHint).toBe(
      'Abre «fecha» para cambiarlo.',
    );
    expect(screen.getByLabelText('Nota, sin definir, opcional')).toBeTruthy();
    expect(screen.getByText('Agregar una nota')).toBeTruthy();
    expect(screen.getByLabelText('Hoy')).toBeTruthy();
    expect(screen.getByLabelText('Ayer')).toBeTruthy();
    expect(screen.getByLabelText('Elegir fecha')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('words a store and an amount still to add', async () => {
    setLanguage('es');
    mockParams = { scannedRead: 'date', scannedDate: '2026-09-28' };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByPlaceholderText('Busca una tienda')).toBeTruthy();
    expect(screen.getByLabelText('Importe, obligatorio').props.accessibilityHint).toBe(
      'Hace falta para guardar. Abre «importe» para agregarlo.',
    );
    expect(screen.getByText('Toca para agregar el importe')).toBeTruthy();
    expect(screen.getByLabelText('Fecha, lun 28 sep')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('words the store box: the search, its results, the added store and the category line', async () => {
    setLanguage('es');
    mockParams = { scannedRead: 'date', scannedDate: '2026-09-28' };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Tienda')).toBeTruthy();
    const input = screen.getByPlaceholderText('Busca una tienda');
    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, 'Oxxo');
    expect(screen.getByText('Agregar “Oxxo”')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Agregar Oxxo como tienda nueva');

    expect(screen.getByLabelText('Cambiar tienda, ahora es Oxxo')).toBeTruthy();
    expect(screen.getByText('Archivado en Otros')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Cambiar tienda, ahora es Oxxo');
    expect(screen.getByPlaceholderText('Busca una tienda')).toBeTruthy();
    expect(screen.queryByText('Archivado en', { exact: false })).toBeNull();
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

  it('reads every page a line opens in Spanish', async () => {
    setLanguage('es');
    mockParams = PARTIAL_SCAN;
    const screen = await render(<AddReceiptScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Importe/ }));
    expect(screen.getByText('¿Cuánto gastaste?')).toBeTruthy();
    expect(screen.getByLabelText('Listo')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Atrás');

    await press(screen, 'Elegir fecha');
    expect(screen.getByText('¿Cuándo fue?')).toBeTruthy();
    expect(screen.getByLabelText('Mes anterior')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Atrás');

    await press(screen, 'Pagado con, VISA ••4421');
    expect(screen.getByText('¿Con qué pagaste?')).toBeTruthy();
    expect(screen.getByLabelText('Sin tarjeta ni cuenta')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Atrás');

    await press(screen, 'Nota, sin definir, opcional');
    expect(screen.getByPlaceholderText('Algo que valga la pena recordar')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Atrás');

    expect(screen.getByText('Puedes editarlo más tarde.')).toBeTruthy();
  });

  it('files an edit under its category, and asks before deleting', async () => {
    setLanguage('es');
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: SAVED, isError: false, isFetched: true };
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Editar recibo')).toBeTruthy();
    expect(screen.getByText('Guardar cambios')).toBeTruthy();
    expect(screen.getByLabelText('Cambiar tienda, ahora es Oxxo')).toBeTruthy();
    expect(screen.getByText('Archivado en Supermercado')).toBeTruthy();
    expect(screen.getByLabelText('Pagado con, VISA ••4421')).toBeTruthy();
    expect(screen.getByLabelText('Fecha, jue 10 sep')).toBeTruthy();
    expect(screen.getByText('Eliminar recibo')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Cerrar');
    expect(mockConfirm).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: '¿Dejar de editar este recibo?' }),
    );

    await press(screen, 'Eliminar este recibo');
    expect(mockConfirm).toHaveBeenLastCalledWith(
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
    expect(screen.getByText('Nous avons lu le magasin et le montant.')).toBeTruthy();
    expect(
      screen.getByText(
        `Vérifie la date et la carte ci-dessous${NBSP}: il sera enregistré quand même.`,
      ),
    ).toBeTruthy();
    // Queries fold a no-break space into a plain one, so the label is compared as it is.
    expect(screen.getByRole('button', { name: /^Montant, / }).props.accessibilityLabel).toBe(
      `Montant, 1${NBSP}234,50${NBSP}$`,
    );
    expect(screen.getByText('Enregistrer le reçu')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('words the final page: the lines, their hints, the chips and the reassurance', async () => {
    setLanguage('fr');
    mockParams = PARTIAL_SCAN;
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Tu pourras le modifier plus tard.')).toBeTruthy();
    expect(screen.getByText('Touche pour modifier')).toBeTruthy();
    expect(screen.getByLabelText('Date, Aujourd’hui, mer. 7 oct.').props.accessibilityHint).toMatch(
      /^Ouvre «\s*date\s*» pour le modifier\.$/,
    );
    expect(screen.getByLabelText(`Note, non défini, facultatif`)).toBeTruthy();
    expect(screen.getByText('Ajouter une note')).toBeTruthy();
    expect(screen.getByLabelText('Aujourd’hui')).toBeTruthy();
    expect(screen.getByLabelText('Hier')).toBeTruthy();
    expect(screen.getByLabelText('Choisir une date')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads every page a line opens in French', async () => {
    setLanguage('fr');
    mockParams = PARTIAL_SCAN;
    const screen = await render(<AddReceiptScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Montant/ }));
    expect(screen.getByText(`Combien as-tu dépensé${NBSP}?`)).toBeTruthy();
    expect(screen.getByLabelText('Terminé')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Retour');

    await press(screen, 'Choisir une date');
    expect(screen.getByText(`C’était quand${NBSP}?`)).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Retour');

    await press(screen, 'Payé avec, VISA ••4421');
    expect(screen.getByText(`Tu as payé avec quoi${NBSP}?`)).toBeTruthy();
    expect(screen.getByLabelText('Aucune carte ni aucun compte')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Retour');

    await press(screen, 'Note, non défini, facultatif');
    expect(screen.getByPlaceholderText('Quelque chose à retenir')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Retour');

    expect(screen.getByText('Tu pourras le modifier plus tard.')).toBeTruthy();
  });

  // A line must not wrap onto a lone "?" or a lone guillemet.
  it('words the store box: the search, its results, the added store and the category line', async () => {
    setLanguage('fr');
    mockParams = { scannedRead: 'date', scannedDate: '2026-09-28' };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Magasin')).toBeTruthy();
    const input = screen.getByPlaceholderText('Cherche un magasin');
    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, 'Oxxo');
    expect(screen.getByText('Ajouter « Oxxo »')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    expect(frenchSpacingFaults(screen.toJSON())).toEqual([]);

    await press(screen, 'Ajouter Oxxo comme nouveau magasin');

    expect(screen.getByLabelText('Changer de magasin, actuellement Oxxo')).toBeTruthy();
    expect(screen.getByText('Classé dans Autre')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    expect(frenchSpacingFaults(screen.toJSON())).toEqual([]);
  });

  it('sets the punctuation with no-break spaces on every page', async () => {
    setLanguage('fr');
    mockParams = PARTIAL_SCAN;
    const screen = await render(<AddReceiptScreen />);
    const faults = [...frenchSpacingFaults(screen.toJSON())];

    for (const [open, back] of [
      ['Choisir une date', 'Retour'],
      ['Payé avec, VISA ••4421', 'Retour'],
      ['Note, non défini, facultatif', 'Retour'],
    ]) {
      await press(screen, open);
      faults.push(...frenchSpacingFaults(screen.toJSON()));
      await press(screen, back);
    }
    // The row hints are only on the final page, for a line that is set and for one still to add.
    mockParams = { scannedRead: 'date', scannedDate: '2026-09-28' };
    const gaps = await render(<AddReceiptScreen />);
    faults.push(...frenchSpacingFaults(gaps.toJSON()));

    expect(faults).toEqual([]);
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

    await press(screen, 'Numériser');

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

    await press(screen, 'Importer');

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
