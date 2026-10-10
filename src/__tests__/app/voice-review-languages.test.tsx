import { act, fireEvent, render } from '@testing-library/react-native';

import VoiceReviewScreen from '@/app/voice-review';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import type { VoiceDraft } from '@/lib/voice';
import { clearVoiceDraft, putVoiceDraft, updateVoiceEntry } from '@/lib/voice-draft';

/**
 * /voice-review in Spanish and French: the page's words and amounts follow the language, the words
 * heard stay exactly as heard, and what is saved is the same number and the same stored values in
 * every language.
 */

// The bill category icons follow the theme, which this file's theme mock does not provide.
jest.mock('@/theme/bill-icons', () => ({
  useBillIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

let mockParams: { draft?: string } = {};
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      dismissTo: jest.fn(),
      canGoBack: () => true,
    },
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => unknown) => React.useEffect(effect, [effect]),
    Stack: { Screen: () => null },
    Redirect: () => null,
  };
});

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#333333',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    onControl: '#FFFFFF',
    accentInk: '#5B3A6B',
  }),
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockConfirm = jest.fn(async () => false);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  warn: jest.fn(),
  success: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-01', todayDate: new Date('2026-10-01T00:00:00') }),
}));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/api/brands', () => ({
  useBrandDirectory: () => ({ data: [] }),
  matchBrand: () => null,
}));

const mockSources = [
  { id: 'card-1', label: 'VISA ••4821', color: '#123456', kind: 'card' as const },
];
jest.mock('@/api/queries', () => ({ usePaymentSources: () => ({ sources: mockSources }) }));

const mockCreateReceipt = jest.fn();
const mockCreateBill = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateReceipt: () => ({ mutateAsync: mockCreateReceipt }),
  useCreateBill: () => ({ mutateAsync: mockCreateBill }),
  useCreateSubscription: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('@/api/known-stores', () => ({
  matchKnownStores: () => [],
  storeKey: (name: string) => name.trim().toLowerCase(),
  useKnownStores: () => [],
  useRememberStore: () => async () => {},
}));

jest.mock('@/api/voice-aliases', () => ({
  useVoiceAliases: () => ({ aliases: {}, ready: true }),
  useLearnVoiceAlias: () => jest.fn(async () => {}),
}));

const NBSP = ' ';

const RECEIPT: VoiceDraft = {
  kind: 'receipt',
  kindSure: true,
  amount: 1234.56,
  amountChoices: [],
  merchant: { brandId: 'b-sbux', name: 'Starbucks', domain: 'starbucks.com', categoryId: 'dining' },
  merchantHeard: 'starbucks',
  merchantSource: 'catalog',
  multiple: false,
  date: '2026-10-01',
  cycle: null,
  billCategoryId: null,
  score: 9,
  confidence: 'high',
  missing: [],
  transcript: 'Spent $1,234.56 at Starbucks today',
};

const BILL: VoiceDraft = {
  ...RECEIPT,
  kind: 'bill',
  kindSure: false,
  amount: 85,
  merchant: null,
  merchantHeard: null,
  merchantSource: null,
  date: null,
  cycle: 'monthly',
  billCategoryId: 'energy',
  confidence: 'low',
  transcript: 'Electric bill $85',
};

function seed(draft: VoiceDraft): string {
  const id = putVoiceDraft(draft, [draft.transcript]);
  mockParams = { draft: id };
  return id;
}

type Screen = Awaited<ReturnType<typeof render>>;

async function press(screen: Screen, label: string) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label));
  });
}

function everyLine(screen: Screen): string[] {
  const lines: string[] = [];
  const walk = (node: unknown) => {
    if (node == null) return;
    if (typeof node === 'string') {
      lines.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const { props, children } = node as { props?: Record<string, unknown>; children?: unknown[] };
    for (const name of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      if (typeof props?.[name] === 'string') lines.push(props[name] as string);
    }
    (children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return lines;
}

function expectNoRawKeys(screen: Screen) {
  for (const line of everyLine(screen)) {
    expect(line).not.toMatch(/^[a-z]+\.[a-zA-Z]+\./);
    expect(line).not.toMatch(/\{\w+\}/);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  clearVoiceDraft();
  mockConfirm.mockImplementation(async () => false);
  mockCreateReceipt.mockResolvedValue({ id: 'r1' });
  mockCreateBill.mockResolvedValue({ id: 'b1' });
});

afterAll(() => resetLocaleForTests());

describe('/voice-review in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('asks in Spanish and keeps the heard words as heard', async () => {
    seed(RECEIPT);
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('Agregar un recibo')).toBeTruthy();
    expect(screen.getByText('¿Es correcto?')).toBeTruthy();
    expect(screen.getByText('Dijiste')).toBeTruthy();
    expect(screen.getByLabelText('Dijiste: Spent $1,234.56 at Starbucks today')).toBeTruthy();
    expect(screen.getByText('“Spent $1,234.56 at Starbucks today”')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Importe, $1,234.56' }).props.accessibilityHint).toBe(
      'Toca para editar',
    );
    expect(screen.getByText('Toca para editar')).toBeTruthy();
    expect(screen.getByLabelText('Tienda, Starbucks').props.accessibilityHint).toBe(
      'Abre «tienda» para cambiarlo.',
    );
    expect(screen.getByLabelText('Fecha, Hoy, jue 1 oct')).toBeTruthy();
    expect(screen.getByLabelText('Hoy')).toBeTruthy();
    expect(screen.getByLabelText('Ayer')).toBeTruthy();
    expect(screen.getByLabelText('Elegir fecha')).toBeTruthy();
    expect(screen.getByText('Agregar como')).toBeTruthy();
    expect(screen.getByLabelText('Recibo')).toBeTruthy();
    expect(screen.getByLabelText('Factura')).toBeTruthy();
    expect(screen.getByLabelText('Suscripción')).toBeTruthy();
    expect(screen.getByText('Pagado con · Opcional')).toBeTruthy();
    expect(screen.getByLabelText('Nota, sin definir, opcional')).toBeTruthy();
    expect(screen.getByText('Agregar una nota')).toBeTruthy();
    expect(screen.getByText('Puedes editarlo más tarde.')).toBeTruthy();
    expect(screen.getByLabelText('Dilo otra vez')).toBeTruthy();
    expect(screen.getByLabelText('Más opciones').props.accessibilityHint).toBe(
      'Abre el formulario completo con lo que Skip escuchó ya llenado.',
    );
    expectNoRawKeys(screen);
  });

  it('saves the same number it would save in English', async () => {
    seed(RECEIPT);
    const screen = await render(<VoiceReviewScreen />);
    await press(screen, 'Guardar recibo');

    expect(mockCreateReceipt).toHaveBeenCalledTimes(1);
    expect(mockCreateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ merchant: 'Starbucks', amount: 1234.56 }),
    );
  });

  it('asks before throwing an edit away, in Spanish', async () => {
    const id = seed(RECEIPT);
    const screen = await render(<VoiceReviewScreen />);
    await act(async () => {
      updateVoiceEntry(id, { sourceId: 'card-1' });
    });
    await press(screen, 'Atrás');

    expect(mockConfirm).toHaveBeenCalledWith({
      title: '¿Dejar de agregar este recibo?',
      message: 'No se guardará nada de lo que ingresaste aquí.',
      confirmLabel: 'Sí',
      cancelLabel: 'Volver',
      destructive: true,
    });
  });

  it('marks a missing amount and an unset renewal date in Spanish', async () => {
    seed({
      ...RECEIPT,
      kind: 'subscription',
      amount: null,
      date: null,
      cycle: 'monthly',
      merchant: {
        brandId: 'b-nflx',
        name: 'Netflix',
        domain: 'netflix.com',
        categoryId: 'entertainment',
      },
      transcript: 'Netflix every month',
    });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('Agregar una suscripción')).toBeTruthy();
    const amount = screen.getByLabelText('Importe, obligatorio');
    expect(amount.props.accessibilityHint).toBe(
      'Hace falta para guardar. Abre «importe» para agregarlo.',
    );
    expect(screen.getByText('Toca para agregar el importe')).toBeTruthy();
    expect(screen.getByLabelText('Próxima renovación, sin definir, opcional')).toBeTruthy();
    expect(screen.getByText('Próxima renovación · Opcional')).toBeTruthy();
    expect(screen.getAllByText('Sin definir').length).toBeGreaterThan(0);
    expect(screen.getByText('Ciclo de cobro')).toBeTruthy();
    expect(screen.getByLabelText('Semanal')).toBeTruthy();
    expect(screen.getByLabelText('Mensual').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Trimestral')).toBeTruthy();
    expect(screen.getByLabelText('Anual')).toBeTruthy();
    expect(screen.getByText('Se cobra a · Opcional')).toBeTruthy();
    expect(screen.getByText('Ingresa cuánto cuesta.')).toBeTruthy();
    expectNoRawKeys(screen);
  });

  it('sets yesterday in one tap and saves the same day it would in English', async () => {
    const id = seed(RECEIPT);
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Ayer');
    expect(screen.getByLabelText('Fecha, Ayer, mié 30 sep')).toBeTruthy();
    expect(screen.getByLabelText('Ayer').props.accessibilityState.selected).toBe(true);
    await act(async () => {
      updateVoiceEntry(id, { note: 'Comida del equipo' });
    });
    expect(screen.getByLabelText('Nota, Comida del equipo')).toBeTruthy();
    await press(screen, 'Guardar recibo');

    expect(mockCreateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ purchased_on: '2026-09-30', note: 'Comida del equipo' }),
    );
  });
});

describe('/voice-review in French', () => {
  beforeEach(() => setLanguage('fr'));

  it('writes amounts the French way and keeps the heard words as heard', async () => {
    seed(RECEIPT);
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('Ajouter un reçu')).toBeTruthy();
    expect(screen.getByText(`C’est bien ça${NBSP}?`)).toBeTruthy();
    expect(
      screen.getByLabelText(`Tu as dit${NBSP}: Spent $1,234.56 at Starbucks today`),
    ).toBeTruthy();
    expect(screen.getByText(`«${NBSP}Spent $1,234.56 at Starbucks today${NBSP}»`)).toBeTruthy();
    expect(screen.getByRole('button', { name: `Montant, 1${NBSP}234,56${NBSP}$` })).toBeTruthy();
    expect(screen.getByLabelText('Magasin, Starbucks')).toBeTruthy();
    expect(screen.getByLabelText('Date, Aujourd’hui, jeu. 1 oct.')).toBeTruthy();
    expect(screen.getByLabelText('Hier')).toBeTruthy();
    expect(screen.getByLabelText('Choisir une date')).toBeTruthy();
    expect(screen.getByText('Payé avec · Facultatif')).toBeTruthy();
    expect(screen.getByText('Ajouter une note')).toBeTruthy();
    expect(screen.getByText('Tu pourras le modifier plus tard.')).toBeTruthy();
    expectNoRawKeys(screen);
  });

  it('saves the same number it would save in English', async () => {
    seed(RECEIPT);
    const screen = await render(<VoiceReviewScreen />);
    await press(screen, 'Enregistrer le reçu');

    expect(mockCreateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ merchant: 'Starbucks', amount: 1234.56 }),
    );
  });

  it('names a bill’s category in French, and the name it would be saved under', async () => {
    seed(BILL);
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('Ajouter une facture')).toBeTruthy();
    expect(screen.getByText(`Skip t’a bien entendu${NBSP}?`)).toBeTruthy();
    expect(
      screen.getByText('Skip a deviné. Choisis-en un autre si ce n’est pas le bon.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Catégorie, Électricité et gaz')).toBeTruthy();
    // A bill with no name of its own is named after its category as read, as add-bill does.
    expect(screen.getByLabelText('Nom, Électricité et gaz')).toBeTruthy();
    const due = screen.getByLabelText('Date d’échéance, requis');
    expect(due.props.accessibilityHint).toBe(
      `Requis pour enregistrer. Ouvre «${NBSP}date d’échéance${NBSP}» pour l’ajouter.`,
    );
    expect(screen.getByText('Touche pour ajouter')).toBeTruthy();
    expect(screen.getByText('Récurrence')).toBeTruthy();
    expect(screen.getByLabelText('Chaque semaine')).toBeTruthy();
    expect(screen.getByLabelText('Chaque mois').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Tous les 3 mois')).toBeTruthy();
    expect(screen.getByLabelText('Chaque année')).toBeTruthy();
    expect(screen.getByText('Payée avec · Facultatif')).toBeTruthy();
    expect(screen.getByLabelText('Note, non défini, facultatif')).toBeTruthy();
    expectNoRawKeys(screen);
  });

  it('repeats a bill as picked on its French chips', async () => {
    seed({ ...BILL, date: '2026-10-15' });
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Chaque année');
    expect(screen.getByLabelText('Chaque année').props.accessibilityState.selected).toBe(true);
    await press(screen, 'Enregistrer la facture');
    expect(mockCreateBill).toHaveBeenCalledWith(
      expect.objectContaining({ recurrence: 'yearly', next_due_on: '2026-10-15' }),
    );
  });

  it('offers the amounts it could not choose between, written the French way', async () => {
    seed({ ...RECEIPT, amount: null, amountChoices: [12.5, 1250] });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText(`Quel montant voulais-tu dire${NBSP}?`)).toBeTruthy();
    expect(screen.getByLabelText(`12,50${NBSP}$`)).toBeTruthy();
    expect(screen.getByLabelText(`1${NBSP}250,00${NBSP}$`)).toBeTruthy();
    expect(screen.getByLabelText('Aucun, je vais le taper')).toBeTruthy();
    expectNoRawKeys(screen);
  });
});

describe('/voice-review bill names', () => {
  const WORDS = {
    en: { name: 'Name', energy: 'Electricity & Gas', save: 'Save bill' },
    es: { name: 'Nombre', energy: 'Luz y gas', save: 'Guardar factura' },
    fr: { name: 'Nom', energy: 'Électricité et gaz', save: 'Enregistrer la facture' },
  } as const;
  const DUE = { ...BILL, date: '2026-10-15' };

  async function saveBill(language: 'en' | 'es' | 'fr', billName?: string) {
    setLanguage(language);
    const id = seed(DUE);
    if (billName) updateVoiceEntry(id, { billName });
    const screen = await render(<VoiceReviewScreen />);
    const words = WORDS[language];

    expect(screen.getByLabelText(`${words.name}, ${billName ?? words.energy}`)).toBeTruthy();
    await press(screen, words.save);
    expect(mockCreateBill).toHaveBeenCalledTimes(1);
    const saved = mockCreateBill.mock.calls[0][0];
    mockCreateBill.mockClear();
    await screen.unmount();
    return saved;
  }

  it('saves a bill named after its category as read, and otherwise the same in every language', async () => {
    const english = await saveBill('en');
    const spanish = await saveBill('es');
    const french = await saveBill('fr');

    expect(english).toMatchObject({
      name: 'Electricity & Gas',
      amount: 85,
      category_id: 'energy',
      recurrence: 'monthly',
      next_due_on: '2026-10-15',
    });
    expect(spanish).toEqual({ ...english, name: 'Luz y gas' });
    expect(french).toEqual({ ...english, name: 'Électricité et gaz' });
  });

  it.each(['en', 'es', 'fr'] as const)(
    'saves a name typed by hand in %s as typed',
    async (language) => {
      const saved = await saveBill(language, 'Luz de la casa');
      expect(saved).toMatchObject({ name: 'Luz de la casa', category_id: 'energy' });
    },
  );
});
