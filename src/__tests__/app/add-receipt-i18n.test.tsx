import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import AddReceiptScreen from '@/app/add-receipt';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Add receipt read in Spanish and French: the amount page, the final page (the Store box, the Paid
 * with pills and Save that names what is missing) and every page a line of it opens, what a scan
 * read (a list whose articles change with the language), the dates in each language's own order,
 * and the dialogs it raises.
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
    card: '#FFFFFF',
    accent: '#905479',
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

const mockCreate = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateReceipt: () => ({ mutateAsync: mockCreate, isPending: false }),
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
// This month's receipts, which the free scan and upload allowances count.
let mockReceiptsList: { data: { source: string; created_at: string }[]; isFetched: boolean } = {
  data: [],
  isFetched: true,
};
let mockSources: { id: string; label: string; color: string; kind: string }[] = [];
jest.mock('@/api/queries', () => ({
  useReceipts: () => mockReceiptsList,
  useReceipt: () => ({ ...mockReceipt, refetch: jest.fn() }),
  usePaymentSources: () => ({ sources: mockSources }),
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
const CARD = 'VISA ••4421';
const CARD_SOURCE = { id: 'card-1', label: CARD, color: '#111111', kind: 'card' };

/** A scan from the receipts list that read the store and the total, not the date or the card. */
const PARTIAL_SCAN = {
  scannedStore: 'Oxxo',
  scannedCategory: 'groceries',
  scannedAmount: '1234.5',
  scannedRead: 'store,amount',
};

/** The same scan, which also matched the card by its last four digits. */
const CARD_SCAN = { ...PARTIAL_SCAN, scannedSource: 'card-1', scannedRead: 'store,amount,card' };

/** A hand-off that carries only a day: no amount, no store, no card. */
const BARE_SCAN = { scannedRead: 'date', scannedDate: '2026-09-28' };

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

/** A pill or chip by its name, and whether it is the lit one. */
const radio = (screen: Screen, name: string, checked: boolean) =>
  screen.getByRole('radio', { name, checked });

/** Types into the Store box without picking anything from the list. */
const typeStore = (screen: Screen, placeholder: string, text: string) =>
  fireEvent.changeText(screen.getByPlaceholderText(placeholder), text);

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

/**
 * The line above Save that names what is still empty, as written (queries fold a no-break space
 * into a plain one, so only the raw text shows French set it). The Save button's label is not it.
 */
const lineAboveSave = (screen: Screen) =>
  shownText(screen.toJSON()).filter((line) =>
    /^(Para guardar el recibo|Pour enregistrer le reçu)/.test(line),
  );

/** The words the Spanish and French tests below read, by language. */
const WORDS = {
  es: {
    store: 'Tienda',
    storePlaceholder: 'Escribe el nombre de la tienda',
    oldStorePlaceholder: 'Busca una tienda',
    paidWith: 'Pagado con',
    skip: 'Omitir',
    save: 'Guardar recibo',
    missing: (fields: string) => `Para guardar el recibo, completa: ${fields}.`,
    // How the Paid with row used to read, before it became pills.
    optional: 'Opcional',
    notSet: 'Sin definir',
  },
  fr: {
    store: 'Magasin',
    storePlaceholder: 'Écris le nom du magasin',
    oldStorePlaceholder: 'Cherche un magasin',
    paidWith: 'Payé avec',
    skip: 'Passer',
    save: 'Enregistrer le reçu',
    missing: (fields: string) => `Pour enregistrer le reçu, remplis${NBSP}: ${fields}.`,
    optional: 'Facultatif',
    notSet: 'Non défini',
  },
} as const;

const LOCALIZED = ['es', 'fr'] as const;

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockParams = {};
  mockPro = { pro: true, ready: true };
  mockReceiptsList = { data: [], isFetched: true };
  mockScanner.capture = true;
  mockScanner.recognition = true;
  mockReceipt = { data: null, isError: false, isFetched: false };
  mockSources = [CARD_SOURCE];
  mockCreate.mockResolvedValue({ id: 'receipt-new' });
});
afterAll(() => resetLocaleForTests());

describe('Add receipt in Spanish', () => {
  it('reports what a scan read, with each field’s article', async () => {
    setLanguage('es');
    mockParams = PARTIAL_SCAN;
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Agregar un recibo')).toBeTruthy();
    expect(screen.getByText('Leímos la tienda y el importe.')).toBeTruthy();
    expect(screen.getByText('Revisa la fecha y la tarjeta abajo.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Importe.*\$1,234\.50/ })).toBeTruthy();
    expect(screen.getByLabelText('Cambiar tienda, ahora es Oxxo')).toBeTruthy();
    // The scan did not read the card, so none of the Paid with pills is lit.
    expect(screen.getByText('Pagado con')).toBeTruthy();
    expect(radio(screen, CARD, false)).toBeTruthy();
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
    mockParams = BARE_SCAN;
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByPlaceholderText('Escribe el nombre de la tienda')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Busca una tienda')).toBeNull();
    expect(screen.getByLabelText('Importe, obligatorio').props.accessibilityHint).toBe(
      'Hace falta para guardar. Abre «importe» para agregarlo.',
    );
    expect(screen.getByText('Toca para agregar el importe')).toBeTruthy();
    expect(screen.getByLabelText('Fecha, lun 28 sep')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('words the store box: the search, its results, the added store and the category line', async () => {
    setLanguage('es');
    mockParams = BARE_SCAN;
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Tienda')).toBeTruthy();
    const input = screen.getByPlaceholderText('Escribe el nombre de la tienda');
    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, 'Oxxo');
    expect(screen.getByText('Agregar “Oxxo”')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Agregar Oxxo como tienda nueva');

    expect(screen.getByLabelText('Cambiar tienda, ahora es Oxxo')).toBeTruthy();
    expect(screen.getByText('Archivado en Otros')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Cambiar tienda, ahora es Oxxo');
    expect(screen.getByPlaceholderText('Escribe el nombre de la tienda')).toBeTruthy();
    expect(screen.queryByText('Archivado en', { exact: false })).toBeNull();
  });

  it('says what a free account has left this month, and asks the amount', async () => {
    setLanguage('es');
    mockPro = { pro: false, ready: true };
    mockReceiptsList = {
      data: Array.from({ length: 14 }, () => ({
        source: 'scan',
        created_at: '2026-10-02T15:00:00.000Z',
      })),
      isFetched: true,
    };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('¿Cuánto gastaste?')).toBeTruthy();
    expect(screen.getByText('Continuar')).toBeTruthy();
    expect(screen.getByText('Gratis este mes: quedan 1 escaneo y 15 subidas')).toBeTruthy();
    expect(screen.getByLabelText('Escanear').props.accessibilityHint).toBe(
      'Apunta la cámara a un recibo de papel',
    );
    expectNoRawText(screen.toJSON());
  });

  it('offers Scan and Upload as Pro once the month’s free ones are used, in French too', async () => {
    setLanguage('es');
    mockPro = { pro: false, ready: true };
    mockReceiptsList = {
      data: ['scan', 'upload'].flatMap((source) =>
        Array.from({ length: 15 }, () => ({ source, created_at: '2026-10-02T15:00:00.000Z' })),
      ),
      isFetched: true,
    };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByLabelText('Escanear').props.accessibilityHint).toBe(
      'Apunta la cámara a un recibo de papel. Parte de Skip Pro.',
    );
    expect(screen.getByLabelText('Subir').props.accessibilityHint).toBe(
      'Sube una foto o un PDF de un recibo. Parte de Skip Pro.',
    );
    expect(screen.getByText('Gratis este mes: quedan 0 escaneos y 0 subidas')).toBeTruthy();

    setLanguage('fr');
    await screen.rerender(<AddReceiptScreen />);
    expect(
      screen.getByText('Gratuit ce mois-ci\u00a0: il reste 0 numérisation et 0 import'),
    ).toBeTruthy();
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
    // An edit opens on the card it was saved with.
    expect(radio(screen, CARD, true)).toBeTruthy();
    expect(radio(screen, 'Omitir', false)).toBeTruthy();
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
    expect(screen.getByText('Vérifie la date et la carte ci-dessous.')).toBeTruthy();
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

    await press(screen, 'Note, non défini, facultatif');
    expect(screen.getByPlaceholderText('Quelque chose à retenir')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Retour');

    expect(screen.getByText('Tu pourras le modifier plus tard.')).toBeTruthy();
  });

  // A line must not wrap onto a lone "?" or a lone guillemet.
  it('words the store box: the search, its results, the added store and the category line', async () => {
    setLanguage('fr');
    mockParams = BARE_SCAN;
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Magasin')).toBeTruthy();
    const input = screen.getByPlaceholderText('Écris le nom du magasin');
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
      ['Note, non défini, facultatif', 'Retour'],
    ]) {
      await press(screen, open);
      faults.push(...frenchSpacingFaults(screen.toJSON()));
      await press(screen, back);
    }
    // The row hints are only on the final page, for a line that is set and for one still to add.
    mockParams = BARE_SCAN;
    const gaps = await render(<AddReceiptScreen />);
    faults.push(...frenchSpacingFaults(gaps.toJSON()));
    // And the line Save puts there when something is missing: its colon follows a no-break space.
    await press(gaps, 'Enregistrer le reçu');
    expect(lineAboveSave(gaps)).toHaveLength(1);
    faults.push(...frenchSpacingFaults(gaps.toJSON()));

    expect(faults).toEqual([]);
  });

  it('lists three fields with commas and "et"', async () => {
    setLanguage('fr');
    mockParams = { ...PARTIAL_SCAN, scannedRead: 'store,amount,date' };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Nous avons lu le magasin, le montant et la date.')).toBeTruthy();
    expect(screen.getByText('Vérifie la carte ci-dessous.')).toBeTruthy();
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

describe('Paid with in Spanish and French', () => {
  it.each(LOCALIZED)(
    'offers the card and Skip as pills, nothing lit until one is pressed, in %s',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      mockParams = PARTIAL_SCAN;
      const screen = await render(<AddReceiptScreen />);

      expect(screen.getByText(words.paidWith)).toBeTruthy();
      for (const pill of [CARD, words.skip]) expect(radio(screen, pill, false)).toBeTruthy();

      await press(screen, words.skip);
      expect(radio(screen, words.skip, true)).toBeTruthy();
      expect(radio(screen, CARD, false)).toBeTruthy();

      await press(screen, CARD);
      expect(radio(screen, CARD, true)).toBeTruthy();
      expect(radio(screen, words.skip, false)).toBeTruthy();
      expectNoRawText(screen.toJSON());
    },
  );

  it.each(LOCALIZED)(
    'is a row of pills, not an optional row with a page, in %s',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      mockParams = PARTIAL_SCAN;
      const screen = await render(<AddReceiptScreen />);

      expect(screen.queryByLabelText(new RegExp(`^${words.paidWith}, `))).toBeNull();
      expect(screen.queryByText(`${words.paidWith} · ${words.optional}`)).toBeNull();
      expect(screen.queryByText(words.notSet)).toBeNull();
    },
  );

  it.each(LOCALIZED)(
    'offers only Skip when there is no card or account, in %s',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      mockSources = [];
      mockParams = PARTIAL_SCAN;
      const screen = await render(<AddReceiptScreen />);

      expect(screen.getByText(words.paidWith)).toBeTruthy();
      expect(radio(screen, words.skip, false)).toBeTruthy();
      expect(screen.queryByRole('radio', { name: CARD })).toBeNull();
    },
  );

  it.each(LOCALIZED)('lights the card a scan matched, in %s', async (language) => {
    const words = WORDS[language];
    setLanguage(language);
    mockParams = CARD_SCAN;
    const screen = await render(<AddReceiptScreen />);

    expect(radio(screen, CARD, true)).toBeTruthy();
    expect(radio(screen, words.skip, false)).toBeTruthy();
  });

  it.each(LOCALIZED)('opens a saved receipt with no card on Skip, in %s', async (language) => {
    const words = WORDS[language];
    setLanguage(language);
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: { ...SAVED, card_id: null }, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    expect(radio(screen, words.skip, true)).toBeTruthy();
    expect(radio(screen, CARD, false)).toBeTruthy();
  });
});

describe('The Store box in Spanish and French', () => {
  it.each(LOCALIZED)('asks for the name of the store, not a search, in %s', async (language) => {
    const words = WORDS[language];
    setLanguage(language);
    mockParams = BARE_SCAN;
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText(words.store)).toBeTruthy();
    expect(screen.getByPlaceholderText(words.storePlaceholder)).toBeTruthy();
    expect(screen.queryByPlaceholderText(words.oldStorePlaceholder)).toBeNull();
    expectNoRawText(screen.toJSON());
  });
});

describe('Save with gaps in Spanish and French', () => {
  it.each([
    ['es', 'Para guardar el recibo, completa: Importe, Tienda, Pagado con.'],
    ['fr', `Pour enregistrer le reçu, remplis${NBSP}: Montant, Magasin, Payé avec.`],
  ] as const)(
    'names every empty box in %s, in the page’s order, and writes nothing',
    async (language, line) => {
      setLanguage(language);
      mockParams = BARE_SCAN;
      const screen = await render(<AddReceiptScreen />);

      await press(screen, WORDS[language].save);

      expect(lineAboveSave(screen)).toEqual([line]);
      expect(mockCreate).not.toHaveBeenCalled();
      expectNoRawText(screen.toJSON());
    },
  );

  it.each([
    ['es', 'Pagado con'],
    ['fr', 'Payé avec'],
  ] as const)(
    'names only Paid with when the scan read the rest, in %s',
    async (language, field) => {
      const words = WORDS[language];
      setLanguage(language);
      mockParams = PARTIAL_SCAN;
      const screen = await render(<AddReceiptScreen />);

      await press(screen, words.save);

      expect(lineAboveSave(screen)).toEqual([words.missing(field)]);
      expect(mockCreate).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['es', 'Tienda, Pagado con', 'Pagado con'],
    ['fr', 'Magasin, Payé avec', 'Payé avec'],
  ] as const)(
    'lists only what is still empty in %s, and the line goes with the next answer',
    async (language, afterAmount, afterStore) => {
      const words = WORDS[language];
      setLanguage(language);
      mockParams = { scannedAmount: '12.5', scannedRead: 'amount' };
      const screen = await render(<AddReceiptScreen />);

      await press(screen, words.save);
      expect(lineAboveSave(screen)).toEqual([words.missing(afterAmount)]);

      // What is typed in the box names the store without being picked from the list.
      await typeStore(screen, words.storePlaceholder, 'Zed Mart');
      expect(lineAboveSave(screen)).toEqual([]);

      await press(screen, words.save);
      expect(lineAboveSave(screen)).toEqual([words.missing(afterStore)]);
      await press(screen, words.skip);
      expect(lineAboveSave(screen)).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();

      await press(screen, words.save);
      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      expect(lineAboveSave(screen)).toEqual([]);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: 'Zed Mart',
          brand_id: null,
          amount: 12.5,
          card_id: null,
          bank_account_id: null,
        }),
      );
    },
  );

  it.each(LOCALIZED)(
    'goes when a card is pressed, and the receipt saves on it, in %s',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      mockParams = PARTIAL_SCAN;
      const screen = await render(<AddReceiptScreen />);

      await press(screen, words.save);
      expect(lineAboveSave(screen)).toHaveLength(1);
      await press(screen, CARD);
      expect(lineAboveSave(screen)).toEqual([]);

      await press(screen, words.save);
      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ merchant: 'Oxxo', amount: 1234.5, card_id: 'card-1' }),
      );
    },
  );
});
