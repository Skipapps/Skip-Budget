import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import AddBillScreen from '@/app/add-bill';
import { billCategoryLabel } from '@/components/bills/bill-row';
import { BILL_CATEGORIES } from '@/data/bill-categories';
import { LOGO_COPY } from '@/components/brands/logo-choices';
import { t } from '@/i18n';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Adding and editing a bill in Spanish and French, with every real page: the category grid and the
 * icon picker, the keypad, the final page, the one-field pages and their calendar, reminder chips
 * and card tiles. The words follow the language; what is saved (category id, schedule, amount) does
 * not. The one exception is the name: a new bill is pre-named with its category as read, and from
 * then on that text is the person's own.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/lib/haptics', () => ({
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
  tap: jest.fn(),
}));

jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/ui/calculator-pad', () => ({ CalculatorPad: () => null }));
jest.mock('@/components/calculators/schedule-card', () => ({ ScheduleCard: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#222222',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    danger: '#CC0000',
    accentInk: '#905479',
    onControl: '#FFFFFF',
  }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockConfirm = jest.fn(async (_: object) => true);
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
  useDialog: () => async () => undefined,
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

jest.mock('@/api/past-charges', () => ({
  usePastCharges: () => ({
    lastChargedOn: null,
    ready: true,
    saving: false,
    choose: async () => 'upcoming',
    apply: jest.fn(),
    retry: jest.fn(),
  }),
}));

// The real choices and lead conversion, so the reminder reads in the language on screen.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => async () => {},
  useReminderChoice: () => ({ choice: 'off', remindAt: '09:00' }),
}));

const BRANDS = [
  { id: 'b-greystar', name: 'Greystar', domain: 'greystar.com', category_id: 'housing' },
];
jest.mock('@/api/brands', () => ({
  ...jest.requireActual('@/api/brands'),
  useBrandSearch: (query: string) => ({
    data:
      query.trim().length >= 2
        ? BRANDS.filter((brand) => brand.name.toLowerCase().includes(query.trim().toLowerCase()))
        : [],
    isFetching: false,
  }),
  useBrandDirectory: () => ({ data: BRANDS }),
}));
jest.mock('@/api/logos', () => ({
  useLogoMatch: () => ({ data: null, isLoading: false, isFetching: false }),
}));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateBill: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateBill: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteBill: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

let mockBill: { data: unknown; isError: boolean; isFetched: boolean };
jest.mock('@/api/queries', () => ({
  useBill: () => ({ ...mockBill, refetch: jest.fn() }),
  useLoanForBill: () => ({ data: null }),
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

const POWER = {
  id: 'bill-1',
  name: 'CFE',
  amount: 1234.56,
  category_id: 'energy',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2026-10-15',
  starts_on: '2026-10-15',
  ends_on: null,
  card_id: null,
  bank_account_id: null,
  note: null,
  brand_id: null,
  brands: null,
};

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

type Rendered = Awaited<ReturnType<typeof render>>;

const press = (screen: Rendered, label: string | RegExp) =>
  fireEvent.press(screen.getByLabelText(label));

/** One keypad key at a time, the decimal key by its name in the language on screen. */
async function typeAmount(screen: Rendered, digits: string) {
  for (const key of digits) {
    await press(screen, key === '.' ? t('loan.keypad.decimal') : key);
  }
}

/** Picks a company the catalogue knows from the box on the final page. */
async function chooseCompany(screen: Rendered, placeholder: string, text: string) {
  const input = screen.getByPlaceholderText(placeholder);
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
  await fireEvent.press(await screen.findByLabelText(text));
}

/** The words each page is pressed by, per language. */
const WORDS: Record<Language, Record<string, string>> = {
  en: {
    housingTile: 'Housing. Rent, mortgage, HOA fees',
    continue: 'Continue',
    done: 'Done',
    dueNeeded: 'Due on, needed',
    day: 'Thursday 15 October 2026',
    quarterly: 'Every 3 months',
    save: 'Save bill',
    housing: 'Housing',
    name: 'Name',
    nameRow: 'Name, Housing',
    companyLabel: 'Company · Optional',
    companySearch: 'Letting agent or management company',
  },
  es: {
    housingTile: 'Vivienda. Renta, hipoteca, cuotas de mantenimiento',
    continue: 'Continuar',
    done: 'Listo',
    dueNeeded: 'Fecha de vencimiento, obligatorio',
    day: 'jueves 15 de octubre de 2026',
    quarterly: 'Cada 3 meses',
    save: 'Guardar factura',
    housing: 'Vivienda',
    name: 'Nombre',
    nameRow: 'Nombre, Vivienda',
    companyLabel: 'Empresa · Opcional',
    companySearch: 'Inmobiliaria o administradora',
  },
  fr: {
    housingTile: 'Logement. Loyer, hypothèque, frais de copropriété',
    continue: 'Continuer',
    done: 'Terminé',
    dueNeeded: 'Date d’échéance, requis',
    day: 'jeudi 15 octobre 2026',
    quarterly: 'Tous les 3 mois',
    save: 'Enregistrer la facture',
    housing: 'Logement',
    name: 'Nom',
    nameRow: 'Nom, Logement',
    companyLabel: 'Entreprise · Facultatif',
    companySearch: 'Propriétaire ou gestionnaire immobilier',
  },
};

const LANGUAGES = ['en', 'es', 'fr'] as const;

/**
 * A new Housing bill, every page pressed by the words of `language`. `onFinal` runs on the final
 * page, before the date is given, where the lines to change are.
 */
async function addHousing(
  language: Language,
  words: Record<string, string>,
  onFinal?: (screen: Rendered) => Promise<void>,
) {
  setLanguage(language);
  const screen = await render(<AddBillScreen />);

  await press(screen, words.housingTile);
  await typeAmount(screen, '1234.56');
  await press(screen, words.continue);
  if (onFinal) await onFinal(screen);
  await press(screen, words.dueNeeded);
  await press(screen, words.day);
  await press(screen, words.done);
  await press(screen, words.quarterly);
  await press(screen, words.save);

  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  const saved = mockCreate.mock.calls[0][0];
  await screen.unmount();
  return saved;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockParams = {};
  mockBill = { data: null, isError: false, isFetched: false };
  mockCreate.mockResolvedValue({ id: 'bill-new' });
});
afterAll(() => resetLocaleForTests());

describe('Add a bill in Spanish', () => {
  it('reads the chooser and the keypad in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Agregar una factura')).toBeTruthy();
    expect(screen.getByText('¿De qué es esta factura?')).toBeTruthy();
    expect(screen.getByText('Vivienda')).toBeTruthy();
    expect(screen.getByText('Renta, hipoteca, cuotas de mantenimiento')).toBeTruthy();
    expect(screen.getByText('Otra factura')).toBeTruthy();
    expect(
      screen.getByLabelText('Transporte. Auto, transporte público, estacionamiento, casetas'),
    ).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Vivienda. Renta, hipoteca, cuotas de mantenimiento');
    expect(screen.getByText('¿De cuánto es la factura?')).toBeTruthy();
    expect(screen.getByLabelText('Calculadora')).toBeTruthy();
    expect(screen.getByLabelText('Continuar')).toBeDisabled();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expectNoRawText(screen.toJSON());
  });

  it('reads the final page in Spanish, the amount, dates and chips included', async () => {
    setLanguage('es');
    const screen = await render(<AddBillScreen />);
    await press(screen, 'Vivienda. Renta, hipoteca, cuotas de mantenimiento');
    await typeAmount(screen, '80');
    await press(screen, 'Continuar');

    expect(screen.getByRole('button', { name: 'Importe, $80.00' })).toBeTruthy();
    expect(screen.getByText('Toca para editar')).toBeTruthy();
    expect(screen.getByText('Empresa · Opcional')).toBeTruthy();
    expect(screen.getByPlaceholderText('Inmobiliaria o administradora')).toBeTruthy();
    // Pre-named in the language on screen; the category id stays 'housing'.
    expect(screen.getByLabelText('Nombre, Vivienda')).toBeTruthy();
    expect(screen.getByLabelText('Categoría, Vivienda')).toBeTruthy();
    expect(screen.getByLabelText('Fecha de vencimiento, obligatorio')).toBeTruthy();
    expect(screen.getByText('Toca para agregar')).toBeTruthy();
    expect(screen.getByText('Se repite')).toBeTruthy();
    for (const chip of ['Semanal', 'Mensual', 'Cada 3 meses', 'Anual', 'Periodo específico']) {
      expect(screen.getByLabelText(chip)).toBeTruthy();
    }
    expect(screen.getByLabelText('Se paga con, sin definir, opcional')).toBeTruthy();
    expect(screen.getByLabelText('Recordatorio, sin definir, opcional')).toBeTruthy();
    expect(screen.getByText('Desactivado')).toBeTruthy();
    expect(screen.getByLabelText('Nota, sin definir, opcional')).toBeTruthy();
    expect(screen.getByText('Agregar una nota')).toBeTruthy();
    expect(screen.getByText('Puedes editarlo más tarde.')).toBeTruthy();
    expect(screen.getByLabelText('Guardar factura')).toBeDisabled();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Periodo específico');
    expect(screen.getByLabelText('Empieza el, obligatorio')).toBeTruthy();
    expect(screen.getByLabelText('Hasta, sin definir, opcional')).toBeTruthy();
    expect(screen.getByText('Continúa — sin fecha de fin')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads the one-field pages in Spanish', async () => {
    setLanguage('es');
    mockParams = { prefillCategory: 'housing', prefillAmount: '80' };
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Nombre, Vivienda');
    expect(screen.getByDisplayValue('Vivienda')).toBeTruthy();
    // The company is chosen on the final page, not here.
    expect(screen.queryByText(/^Empresa/)).toBeNull();
    expect(screen.queryByPlaceholderText('Inmobiliaria o administradora')).toBeNull();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Atrás');

    await press(screen, 'Categoría, Vivienda');
    expect(screen.getByText('¿De qué es esta factura?')).toBeTruthy();
    expect(screen.getByLabelText(/^Luz y gas\. /)).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Atrás');

    await press(screen, 'Fecha de vencimiento, obligatorio');
    expect(screen.getByText('¿Cuándo vence?')).toBeTruthy();
    expect(screen.getByText('octubre de 2026')).toBeTruthy();
    expect(screen.getByLabelText('Mes siguiente')).toBeTruthy();
    expect(screen.getByLabelText('Hoy, miércoles 7 de octubre de 2026')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Atrás');

    await press(screen, 'Se paga con, sin definir, opcional');
    expect(screen.getByText('¿Con qué pagaste?')).toBeTruthy();
    await press(screen, 'VISA ••4421');
    expect(screen.getByLabelText('Sin tarjeta ni cuenta')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Atrás');

    await press(screen, 'Recordatorio, sin definir, opcional');
    expect(screen.getByText('Antes de que venza la factura')).toBeTruthy();
    for (const chip of ['Desactivado', 'El mismo día', '1 día', '3 días', '1 semana']) {
      expect(screen.getByLabelText(chip)).toBeTruthy();
    }
    expectNoRawText(screen.toJSON());
    await press(screen, 'Atrás');

    await press(screen, 'Nota, sin definir, opcional');
    expect(screen.getByPlaceholderText('Algo que quieras recordar')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('puts the period’s start and end in Spanish, in the language’s own order', async () => {
    setLanguage('es');
    mockParams = { id: 'bill-1' };
    mockBill = {
      data: { ...POWER, recurrence: 'period', ends_on: '2026-12-31' },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Empieza el, jue 15 oct')).toBeTruthy();
    expect(screen.getByLabelText('Hasta, jue 31 dic')).toBeTruthy();
    await press(screen, 'Empieza el, jue 15 oct');
    expect(screen.getByText('¿Cuándo empieza?')).toBeTruthy();
    await press(screen, 'Atrás');
    await press(screen, 'Hasta, jue 31 dic');
    expect(screen.getByLabelText('Borrar — sin fecha de fin')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads a day in Spanish, and Hoy for today', async () => {
    setLanguage('es');
    mockParams = { id: 'bill-1' };
    mockBill = {
      data: { ...POWER, next_due_on: '2026-10-07' },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Fecha de vencimiento, Hoy, mié 7 oct')).toBeTruthy();
  });

  it('reads a reminder in Spanish', async () => {
    setLanguage('es');
    mockParams = { id: 'bill-1' };
    mockBill = { data: POWER, isError: false, isFetched: true };
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Recordatorio, sin definir, opcional');
    await press(screen, '3 días');
    expect(screen.getByLabelText(/^Hora de envío: /)).toBeTruthy();
    await press(screen, 'Listo');

    expect(screen.getByLabelText('Recordatorio, 3 días antes · 9:00 a. m.')).toBeTruthy();
    await press(screen, 'Recordatorio, 3 días antes · 9:00 a. m.');
    await press(screen, 'El mismo día');
    await press(screen, 'Listo');
    expect(screen.getByLabelText('Recordatorio, El mismo día · 9:00 a. m.')).toBeTruthy();
  });

  it('says the one failure line when the bill to edit cannot be read', async () => {
    setLanguage('es');
    mockParams = { id: 'bill-1' };
    mockBill = { data: null, isError: true, isFetched: true };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Algo salió mal. Inténtalo de nuevo.')).toBeTruthy();
    expect(screen.getByText('Intentar de nuevo')).toBeTruthy();
    expect(screen.getByText('Regresar')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads the checks inside Save in Spanish', async () => {
    setLanguage('es');
    mockParams = { id: 'bill-1' };
    mockBill = {
      data: {
        ...POWER,
        recurrence: 'period',
        starts_on: '2026-10-10',
        next_due_on: '2026-10-10',
        ends_on: '2026-10-01',
      },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Guardar cambios');

    expect(
      screen.getByText('La fecha de fin no puede ser anterior a la fecha de inicio.'),
    ).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('Add a bill in French', () => {
  it('offers the icons by name for a bill of its own', async () => {
    setLanguage('fr');
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Ajouter une facture')).toBeTruthy();
    expect(screen.getByText('Cette facture, c’est pour quoi ?')).toBeTruthy();
    expect(screen.getByText('Électricité et gaz')).toBeTruthy();

    await press(screen, 'Autre facture. Donne-lui un nom et choisis une icône');
    expect(screen.getByText('De combien est la facture ?')).toBeTruthy();
    await typeAmount(screen, '15.99');
    await press(screen, 'Continuer');

    // Nothing names an Other bill until someone does.
    expect(screen.getByLabelText('Nom, requis')).toBeTruthy();
    expect(screen.getByRole('button', { name: `Montant, 15,99${NBSP}$` })).toBeTruthy();
    expect(screen.getByLabelText('Payée avec, non défini, facultatif')).toBeTruthy();
  });

  it('reads the name page, with its icons, in French', async () => {
    setLanguage('fr');
    mockParams = { prefillCategory: 'other', prefillAmount: '15.99' };
    const screen = await render(<AddBillScreen />);
    expect(screen.getByText('Entreprise · Facultatif')).toBeTruthy();
    expect(screen.getByPlaceholderText('Cherche une entreprise')).toBeTruthy();

    await press(screen, 'Nom, requis');

    expect(screen.queryByText(/^Entreprise/)).toBeNull();
    expect(screen.getByText('Icône')).toBeTruthy();
    expect(screen.getByLabelText('Éducation')).toBeTruthy();
    expect(screen.getByLabelText('Télé')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads the final page in French', async () => {
    setLanguage('fr');
    mockParams = { prefillCategory: 'housing', prefillAmount: '80' };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByRole('button', { name: `Montant, 80,00${NBSP}$` })).toBeTruthy();
    expect(screen.getByText('Entreprise · Facultatif')).toBeTruthy();
    expect(screen.getByPlaceholderText('Propriétaire ou gestionnaire immobilier')).toBeTruthy();
    expect(screen.getByLabelText('Nom, Logement')).toBeTruthy();
    expect(screen.getByLabelText('Date d’échéance, requis')).toBeTruthy();
    expect(screen.getByText('Récurrence')).toBeTruthy();
    for (const chip of [
      'Chaque semaine',
      'Chaque mois',
      'Tous les 3 mois',
      'Chaque année',
      'Période précise',
    ]) {
      expect(screen.getByLabelText(chip)).toBeTruthy();
    }
    expect(screen.getByLabelText('Payée avec, non défini, facultatif')).toBeTruthy();
    expect(screen.getByLabelText('Rappel, non défini, facultatif')).toBeTruthy();
    expect(screen.getByText('Tu pourras le modifier plus tard.')).toBeTruthy();
    expect(screen.getByLabelText('Enregistrer la facture')).toBeDisabled();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Période précise');
    expect(screen.getByLabelText('Commence le, requis')).toBeTruthy();
    expect(screen.getByLabelText('Jusqu’au, non défini, facultatif')).toBeTruthy();
    expect(screen.getByText('En cours — sans date de fin')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads a day and a reminder in French', async () => {
    setLanguage('fr');
    mockParams = { id: 'bill-1' };
    mockBill = { data: POWER, isError: false, isFetched: true };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Date d’échéance, jeu. 15 oct.')).toBeTruthy();
    await press(screen, 'Rappel, non défini, facultatif');
    await press(screen, '1 semaine');
    await press(screen, 'Terminé');

    expect(screen.getByLabelText('Rappel, 1 semaine avant · 9 h 00')).toBeTruthy();
  });

  it('edits and deletes in French', async () => {
    setLanguage('fr');
    mockParams = { id: 'bill-1' };
    mockBill = { data: POWER, isError: false, isFetched: true };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Modifier la facture')).toBeTruthy();
    expect(screen.getByText('Enregistrer les modifications')).toBeTruthy();
    expect(screen.getByText('Supprimer la facture')).toBeTruthy();
    expect(screen.getByText('Tu pourras le modifier plus tard.')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Date d’échéance, jeu. 15 oct.');
    expect(screen.getByText('Quelle est la date d’échéance ?')).toBeTruthy();
    await press(screen, 'Retour');

    await press(screen, 'Supprimer cette facture');
    expect(mockConfirm).toHaveBeenCalledWith({
      title: `Supprimer cette facture${NBSP}?`,
      message: 'Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
  });

  it('asks before closing in French', async () => {
    setLanguage('fr');
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Fermer');

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: `Annuler l’ajout de cette facture${NBSP}?` }),
    );
  });
});

describe('The company box in Spanish and French', () => {
  it.each([
    [
      'es',
      {
        label: 'Empresa · Opcional',
        placeholder: 'Inmobiliaria o administradora',
        addLabel: 'Agregar Casa Verde como empresa nueva',
        addText: 'Agregar “Casa Verde”',
        change: 'Cambiar empresa, ahora es Casa Verde',
        nameRow: 'Nombre, Casa Verde',
      },
    ],
    [
      'fr',
      {
        label: 'Entreprise · Facultatif',
        placeholder: 'Propriétaire ou gestionnaire immobilier',
        addLabel: 'Ajouter Casa Verde comme nouvelle entreprise',
        addText: 'Ajouter « Casa Verde »',
        change: 'Changer d’entreprise, actuellement Casa Verde',
        nameRow: 'Nom, Casa Verde',
      },
    ],
  ] as const)(
    'reads the box, an unknown company and its logo question in %s',
    async (language, words) => {
      setLanguage(language);
      mockParams = { prefillCategory: 'housing', prefillAmount: '80' };
      const screen = await render(<AddBillScreen />);

      expect(screen.getByText(words.label)).toBeTruthy();
      const search = screen.getByPlaceholderText(words.placeholder);
      await fireEvent(search, 'focus');
      await fireEvent.changeText(search, 'Casa Verde');
      expect(await screen.findByLabelText(words.addLabel)).toBeTruthy();
      expect(screen.getByText(words.addText)).toBeTruthy();
      expectNoRawText(screen.toJSON());

      await press(screen, words.addLabel);
      // Named after the company, with the logo question asked in place, in the same language.
      expect(screen.getByLabelText(words.nameRow)).toBeTruthy();
      expect(screen.getByLabelText(words.change)).toBeTruthy();
      expect(screen.getByLabelText(LOGO_COPY.addWebsite)).toBeTruthy();
      expectNoRawText(screen.toJSON());

      await press(screen, words.change);
      expect(screen.getByPlaceholderText(words.placeholder)).toBeTruthy();
      // Taking the company off keeps the name it gave.
      expect(screen.getByLabelText(words.nameRow)).toBeTruthy();
    },
  );
});

describe('What a bill saves', () => {
  it('is the same in every language but for the name it was pre-filled with', async () => {
    const english = await addHousing('en', WORDS.en);
    mockCreate.mockClear();
    const spanish = await addHousing('es', WORDS.es);
    mockCreate.mockClear();
    const french = await addHousing('fr', WORDS.fr);

    expect(english).toMatchObject({
      name: 'Housing',
      amount: 1234.56,
      category_id: 'housing',
      recurrence: 'quarterly',
      next_due_on: '2026-10-15',
    });
    expect(spanish).toEqual({ ...english, name: 'Vivienda' });
    expect(french).toEqual({ ...english, name: 'Logement' });
  });

  it.each(LANGUAGES)(
    'saves the amount to the cent on a keypad that reads in %s',
    async (language) => {
      const saved = await addHousing(language, WORDS[language]);

      expect(saved.amount).toBe(1234.56);
    },
  );
});

const GREYSTAR = {
  brandId: 'b-greystar',
  name: 'Greystar',
  domain: 'greystar.com',
  categoryId: 'housing',
};

describe('A new bill’s name', () => {
  it.each(LANGUAGES)('is the category as read in %s, and is saved so', async (language) => {
    const words = WORDS[language];
    const saved = await addHousing(language, words, async (screen) => {
      expect(screen.getByLabelText(words.nameRow)).toBeTruthy();
    });

    expect(saved).toMatchObject({ name: words.housing, category_id: 'housing' });
  });

  it.each(LANGUAGES)(
    'keeps a name typed by hand in %s, a company picked after it too',
    async (language) => {
      const words = WORDS[language];
      const saved = await addHousing(language, words, async (screen) => {
        await press(screen, words.nameRow);
        await fireEvent.changeText(screen.getByDisplayValue(words.housing), 'Casa de mamá');
        await press(screen, words.done);
        await chooseCompany(screen, words.companySearch, GREYSTAR.name);
        expect(screen.getByLabelText(`${words.name}, Casa de mamá`)).toBeTruthy();
      });

      expect(saved).toMatchObject({
        name: 'Casa de mamá',
        category_id: 'housing',
        brand_id: 'b-greystar',
      });
    },
  );

  it.each(LANGUAGES)('gives way to a company in %s, since nobody typed it', async (language) => {
    const words = WORDS[language];
    const saved = await addHousing(language, words, async (screen) => {
      await chooseCompany(screen, words.companySearch, GREYSTAR.name);
      expect(screen.getByLabelText(`${words.name}, Greystar`)).toBeTruthy();
    });

    expect(saved).toMatchObject({ name: 'Greystar', category_id: 'housing' });
  });

  it.each(LANGUAGES)(
    'is the category as read in %s on a bill handed over by voice',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      mockParams = { from: 'voice', prefillCategory: 'housing', prefillAmount: '80' };
      const screen = await render(<AddBillScreen />);

      // The voice page already named the category, so the form opens on the final page.
      expect(screen.getByLabelText(words.nameRow)).toBeTruthy();
    },
  );

  it.each([
    ['es', 'Vivienda', 'Seguros'],
    ['fr', 'Logement', 'Assurances'],
  ] as const)(
    'follows the category as read in %s while it is still its default',
    async (language, housing, insurance) => {
      setLanguage(language);
      const screen = await render(<AddBillScreen />);
      await press(screen, WORDS[language].housingTile);
      await typeAmount(screen, '80');
      await press(screen, WORDS[language].continue);
      expect(screen.getByLabelText(WORDS[language].nameRow)).toBeTruthy();

      await press(screen, `${t('bills.field.category')}, ${housing}`);
      await press(screen, new RegExp(`^${insurance}\\. `));

      expect(screen.getByLabelText(`${t('bills.field.name')}, ${insurance}`)).toBeTruthy();
    },
  );

  it('is word for word the English label in English', () => {
    setLanguage('en');
    for (const category of BILL_CATEGORIES) {
      expect(billCategoryLabel(category.id)).toBe(category.label);
    }
  });

  it('is never renamed on a bill saved before, whatever the language now', async () => {
    setLanguage('fr');
    mockParams = { id: 'bill-2' };
    mockBill = {
      data: { ...POWER, id: 'bill-2', name: 'Vivienda', category_id: 'housing' },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Nom, Vivienda')).toBeTruthy();
    await press(screen, 'Enregistrer les modifications');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      id: 'bill-2',
      values: { name: 'Vivienda', category_id: 'housing' },
    });
  });
});
