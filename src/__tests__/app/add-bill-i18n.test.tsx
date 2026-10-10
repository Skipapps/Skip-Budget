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
 * Adding and editing a bill in Spanish and French, with every real page: the category grid, the
 * keypad, the final page (the Name box, the Payment on box and its calendar, the Paid with pills
 * and the reminder chips are all on it) and the category and note pages it opens. The words follow
 * the language; what is saved (category id, schedule, amount) does not, and neither does the name,
 * which only the person writes.
 */

// The bill category icons follow the theme, which this file's theme mock does not provide.
jest.mock('@/theme/bill-icons', () => ({
  useBillIcons: () => new Proxy({}, { get: () => () => null }),
}));
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
    card: '#FFFFFF',
    accent: '#905479',
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

const mockApplyReminder = jest.fn(async (..._: unknown[]) => {});
// The real choices and lead conversion, so the reminder reads in the language on screen.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => mockApplyReminder,
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
const CARD = 'VISA ••4421';
/** What the walk through the form types into the Name box when a test does not care. */
const TYPED_NAME = 'Casa de mamá';

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

/** Types into the Name box without picking anything from the list. */
const typeName = (screen: Rendered, placeholder: string, text: string) =>
  fireEvent.changeText(screen.getByPlaceholderText(placeholder), text);

/** Picks a name the catalogue knows from the Name box. */
async function chooseCompany(screen: Rendered, placeholder: string, text: string) {
  const input = screen.getByPlaceholderText(placeholder);
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
  await fireEvent.press(await screen.findByLabelText(text));
}

/** What one pass through the form presses, per language. */
type Walk = {
  housingTile: string;
  continue: string;
  namePlaceholder: string;
  /** The Payment on box as VoiceOver reads it before a day is picked. */
  paymentBox: string;
  day: string;
  quarterly: string;
  skip: string;
  noReminder: string;
  save: string;
};

/** Plus what the Spanish and French tests read on the final page. */
type Words = Walk & {
  nameLabel: string;
  changeName: (name: string) => string;
  useName: (name: string) => string;
  /** The text of the row that adds a name nobody listed. */
  addName: (name: string) => string;
  paymentLabel: string;
  startsLabel: string;
  pickDay: string;
  period: string;
  paidWith: string;
  reminder: string;
  reminderCaption: string;
  off: string;
  /** On the day, 1 day, 3 days, 1 week. */
  reminderChips: [string, string, string, string];
  sentAt: RegExp;
  sentAtText: string;
  /** The line above Save when boxes are empty. */
  missing: (fields: string) => string;
};

const WORDS: { en: Walk; es: Words; fr: Words } = {
  en: {
    housingTile: 'Housing. Rent, mortgage, HOA',
    continue: 'Continue',
    namePlaceholder: 'Rent, mortgage or your landlord',
    paymentBox: 'Payment on, Select a date',
    day: 'Thursday 15 October 2026',
    quarterly: 'Every 3 months',
    skip: 'Skip',
    noReminder: 'No reminder',
    save: 'Save bill',
  },
  es: {
    housingTile: 'Vivienda. Renta, hipoteca, mantenimiento',
    continue: 'Continuar',
    namePlaceholder: 'Renta, hipoteca o tu arrendador',
    paymentBox: 'Fecha de pago, Elige una fecha',
    day: 'jueves 15 de octubre de 2026',
    quarterly: 'Cada 3 meses',
    skip: 'Omitir',
    noReminder: 'Sin recordatorio',
    save: 'Guardar factura',
    nameLabel: 'Nombre',
    changeName: (name) => `Cambiar nombre, ahora es ${name}`,
    useName: (name) => `Usar ${name} como nombre`,
    addName: (name) => `Agregar “${name}”`,
    paymentLabel: 'Fecha de pago',
    startsLabel: 'Empieza el',
    pickDay: 'Elige una fecha',
    period: 'Periodo específico',
    paidWith: 'Se paga con',
    reminder: 'Recordatorio',
    reminderCaption: 'Antes de que venza la factura',
    off: 'Desactivado',
    reminderChips: ['El mismo día', '1 día', '3 días', '1 semana'],
    sentAt: /^Hora de envío: /,
    sentAtText: 'a las 9:00 a. m.',
    missing: (fields) => `Para guardar la factura, completa: ${fields}.`,
  },
  fr: {
    housingTile: 'Logement. Loyer, hypothèque, copropriété',
    continue: 'Continuer',
    namePlaceholder: 'Loyer, prêt immobilier ou ton propriétaire',
    paymentBox: 'Date de paiement, Choisis une date',
    day: 'jeudi 15 octobre 2026',
    quarterly: 'Tous les 3 mois',
    skip: 'Passer',
    noReminder: 'Aucun rappel',
    save: 'Enregistrer la facture',
    nameLabel: 'Nom',
    changeName: (name) => `Changer le nom, actuellement ${name}`,
    useName: (name) => `Utiliser ${name} comme nom`,
    addName: (name) => `Ajouter « ${name} »`,
    paymentLabel: 'Date de paiement',
    startsLabel: 'Commence le',
    pickDay: 'Choisis une date',
    period: 'Période précise',
    paidWith: 'Payée avec',
    reminder: 'Rappel',
    reminderCaption: 'Avant l’échéance de la facture',
    off: 'Désactivé',
    reminderChips: ['Le jour même', '1 jour', '3 jours', '1 semaine'],
    sentAt: /^Envoyé à /,
    sentAtText: 'à 9 h 00',
    missing: (fields) => `Pour enregistrer la facture, remplis${NBSP}: ${fields}.`,
  },
};

const LANGUAGES = ['en', 'es', 'fr'] as const;
const LOCALIZED = ['es', 'fr'] as const;

/** A new Housing bill at $1,234.56, on its final page, the way a person gets there. */
async function reachFinalPage(language: Language) {
  const words = WORDS[language];
  setLanguage(language);
  const screen = await render(<AddBillScreen />);

  await press(screen, words.housingTile);
  await typeAmount(screen, '1234.56');
  await press(screen, words.continue);
  return screen;
}

/**
 * A new Housing bill answered box by box in the words of `language` and saved. The Name box is
 * typed into unless `name` answers it; Paid with is Skip unless `paidWith` names a pill.
 */
async function addHousing(
  language: Language,
  { name, paidWith }: { name?: (screen: Rendered) => Promise<void>; paidWith?: string } = {},
) {
  const words = WORDS[language];
  mockCreate.mockClear();
  mockApplyReminder.mockClear();
  const screen = await reachFinalPage(language);

  if (name) await name(screen);
  else await typeName(screen, words.namePlaceholder, TYPED_NAME);
  await press(screen, words.paymentBox);
  await press(screen, words.day);
  await press(screen, words.quarterly);
  await press(screen, paidWith ?? words.skip);
  await press(screen, words.noReminder);
  await press(screen, words.save);

  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
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
    expect(screen.getByText('Renta, hipoteca, mantenimiento')).toBeTruthy();
    expect(screen.getByText('Elige una. Puedes cambiarla después.')).toBeTruthy();
    expect(screen.getByText('Otra')).toBeTruthy();
    expect(screen.getByText('Cualquier otra cosa')).toBeTruthy();
    expect(screen.getByLabelText('Transporte. Gasolina, transporte público, casetas')).toBeTruthy();
    expect(
      screen.getByLabelText('Salud y gastos médicos. Médico, dentista, medicinas'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Educación. Colegiaturas y cursos')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Vivienda. Renta, hipoteca, mantenimiento');
    expect(screen.getByText('¿De cuánto es la factura?')).toBeTruthy();
    expect(screen.getByLabelText('Calculadora')).toBeTruthy();
    expect(screen.getByLabelText('Continuar')).toBeDisabled();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expectNoRawText(screen.toJSON());
  });

  it('reads the final page in Spanish, the amount, dates and chips included', async () => {
    setLanguage('es');
    const screen = await render(<AddBillScreen />);
    await press(screen, 'Vivienda. Renta, hipoteca, mantenimiento');
    await typeAmount(screen, '80');
    await press(screen, 'Continuar');

    expect(screen.getByRole('button', { name: 'Importe, $80.00' })).toBeTruthy();
    expect(screen.getByText('Toca para editar')).toBeTruthy();
    // Nothing names a new bill, whatever its category is called.
    expect(screen.getByText('Nombre')).toBeTruthy();
    expect(screen.getByPlaceholderText('Renta, hipoteca o tu arrendador')).toHaveDisplayValue('');
    expect(screen.getByLabelText('Categoría, Vivienda')).toBeTruthy();
    expect(screen.getByText('Fecha de pago')).toBeTruthy();
    expect(screen.getByText('Elige una fecha')).toBeTruthy();
    expect(screen.getByLabelText('Fecha de pago, Elige una fecha')).toBeTruthy();
    expect(screen.getByText('Se repite')).toBeTruthy();
    for (const chip of ['Semanal', 'Mensual', 'Cada 3 meses', 'Anual', 'Periodo específico']) {
      expect(screen.getByLabelText(chip)).toBeTruthy();
    }
    expect(screen.getByText('Se paga con')).toBeTruthy();
    expect(screen.getByLabelText('Omitir')).toBeTruthy();
    expect(screen.getByText('Recordatorio')).toBeTruthy();
    expect(screen.getByText('Antes de que venza la factura')).toBeTruthy();
    expect(screen.getByLabelText('Sin recordatorio')).toBeTruthy();
    expect(screen.getByLabelText('Nota, sin definir, opcional')).toBeTruthy();
    expect(screen.getByText('Agregar una nota')).toBeTruthy();
    expect(screen.getByText('Puedes editarlo más tarde.')).toBeTruthy();
    expect(screen.getByLabelText('Guardar factura')).toBeEnabled();
    expectNoRawText(screen.toJSON());

    // The page has no Company box and no due-date row.
    expect(screen.queryByText(/^Empresa/)).toBeNull();
    expect(screen.queryByLabelText(/^Fecha de vencimiento/)).toBeNull();
    expect(screen.queryByLabelText(/^Nombre, /)).toBeNull();

    await press(screen, 'Periodo específico');
    expect(screen.getByLabelText('Empieza el, Elige una fecha')).toBeTruthy();
    expect(screen.getByLabelText('Hasta, Continúa — sin fecha de fin')).toBeTruthy();
    expect(screen.queryByText('Fecha de pago')).toBeNull();
    expectNoRawText(screen.toJSON());
  });

  it('reads the category and note pages in Spanish', async () => {
    setLanguage('es');
    mockParams = { prefillCategory: 'housing', prefillAmount: '80' };
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Categoría, Vivienda');
    expect(screen.getByText('¿De qué es esta factura?')).toBeTruthy();
    expect(screen.getByLabelText(/^Luz y gas\. /)).toBeTruthy();
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
    expect(screen.getByLabelText('Borrar — sin fecha de fin')).toBeTruthy();

    // The calendar opens under the box, on the month of the day it holds.
    await press(screen, 'Empieza el, jue 15 oct');
    expect(screen.getByText('octubre de 2026')).toBeTruthy();
    expect(screen.getByLabelText('Mes siguiente')).toBeTruthy();
    await press(screen, 'martes 20 de octubre de 2026');
    expect(screen.getByLabelText('Empieza el, mar 20 oct')).toBeTruthy();
    expect(screen.queryByLabelText('Mes siguiente')).toBeNull();

    await press(screen, 'Borrar — sin fecha de fin');
    expect(screen.getByLabelText('Hasta, Continúa — sin fecha de fin')).toBeTruthy();
    expect(screen.queryByLabelText('Borrar — sin fecha de fin')).toBeNull();
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

    expect(screen.getByLabelText('Fecha de pago, Hoy, mié 7 oct')).toBeTruthy();
    await press(screen, 'Fecha de pago, Hoy, mié 7 oct');
    expect(screen.getByLabelText('Hoy, miércoles 7 de octubre de 2026')).toBeTruthy();
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
  it('offers an Other bill by its hint, with nothing in its Name box', async () => {
    setLanguage('fr');
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Ajouter une facture')).toBeTruthy();
    expect(screen.getByText('Cette facture, c’est pour quoi ?')).toBeTruthy();
    expect(screen.getByText('Électricité et gaz')).toBeTruthy();
    expect(screen.getByText('Tout le reste')).toBeTruthy();

    await press(screen, 'Autre. Tout le reste');
    expect(screen.getByText('De combien est la facture ?')).toBeTruthy();
    await typeAmount(screen, '15.99');
    await press(screen, 'Continuer');

    // Nothing names an Other bill until someone does.
    expect(screen.getByPlaceholderText('Cherche ou écris un nom')).toHaveDisplayValue('');
    expect(screen.getByRole('button', { name: `Montant, 15,99${NBSP}$` })).toBeTruthy();
    expect(screen.getByText('Payée avec')).toBeTruthy();
  });

  it('reads the final page in French', async () => {
    setLanguage('fr');
    const screen = await render(<AddBillScreen />);
    await press(screen, 'Logement. Loyer, hypothèque, copropriété');
    await typeAmount(screen, '80');
    await press(screen, 'Continuer');

    expect(screen.getByRole('button', { name: `Montant, 80,00${NBSP}$` })).toBeTruthy();
    expect(screen.getByText('Nom')).toBeTruthy();
    expect(
      screen.getByPlaceholderText('Loyer, prêt immobilier ou ton propriétaire'),
    ).toHaveDisplayValue('');
    expect(screen.getByLabelText('Catégorie, Logement')).toBeTruthy();
    expect(screen.getByText('Date de paiement')).toBeTruthy();
    expect(screen.getByText('Choisis une date')).toBeTruthy();
    expect(screen.getByLabelText('Date de paiement, Choisis une date')).toBeTruthy();
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
    expect(screen.getByText('Payée avec')).toBeTruthy();
    expect(screen.getByLabelText('Passer')).toBeTruthy();
    expect(screen.getByText('Rappel')).toBeTruthy();
    expect(screen.getByText('Avant l’échéance de la facture')).toBeTruthy();
    expect(screen.getByLabelText('Aucun rappel')).toBeTruthy();
    expect(screen.getByText('Tu pourras le modifier plus tard.')).toBeTruthy();
    expect(screen.getByLabelText('Enregistrer la facture')).toBeEnabled();
    expectNoRawText(screen.toJSON());

    // The page has no Company box and no due-date row.
    expect(screen.queryByText(/^Entreprise/)).toBeNull();
    expect(screen.queryByLabelText(/^Date d’échéance/)).toBeNull();
    expect(screen.queryByText('Icône')).toBeNull();

    await press(screen, 'Période précise');
    expect(screen.getByLabelText('Commence le, Choisis une date')).toBeTruthy();
    expect(screen.getByLabelText('Jusqu’au, En cours — sans date de fin')).toBeTruthy();
    expect(screen.queryByText('Date de paiement')).toBeNull();
    expectNoRawText(screen.toJSON());
  });

  it('reads a day in French, picked in the calendar under the box', async () => {
    setLanguage('fr');
    mockParams = { id: 'bill-1' };
    mockBill = { data: POWER, isError: false, isFetched: true };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Date de paiement, jeu. 15 oct.')).toBeTruthy();
    await press(screen, 'Date de paiement, jeu. 15 oct.');
    expect(screen.getByText('octobre 2026')).toBeTruthy();
    expect(screen.getByLabelText('Aujourd’hui, mercredi 7 octobre 2026')).toBeTruthy();

    await press(screen, 'vendredi 16 octobre 2026');
    expect(screen.getByLabelText('Date de paiement, ven. 16 oct.')).toBeTruthy();
    expect(screen.queryByLabelText('Mois suivant')).toBeNull();
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
    expect(screen.getByLabelText('Changer le nom, actuellement CFE')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    // The day opens its calendar in place; the page stays.
    await press(screen, 'Date de paiement, jeu. 15 oct.');
    expect(screen.getByLabelText('Mois suivant')).toBeTruthy();
    expect(screen.getByText('Modifier la facture')).toBeTruthy();

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

describe('Paid with and the reminder in Spanish and French', () => {
  const editing = (card: string | null) => {
    mockParams = { id: 'bill-1' };
    mockBill = {
      data: { ...POWER, card_id: card },
      isError: false,
      isFetched: true,
    };
  };

  it.each(LOCALIZED)(
    'offers Skip beside the cards, unanswered at first, in %s',
    async (language) => {
      const words = WORDS[language];
      const screen = await reachFinalPage(language);
      const pill = (name: string, checked: boolean) => screen.getByRole('radio', { name, checked });

      expect(screen.getByText(words.paidWith)).toBeTruthy();
      expect(pill(CARD, false)).toBeTruthy();
      expect(pill(words.skip, false)).toBeTruthy();

      await press(screen, words.skip);
      expect(pill(words.skip, true)).toBeTruthy();
      expect(pill(CARD, false)).toBeTruthy();

      await press(screen, CARD);
      expect(pill(CARD, true)).toBeTruthy();
      expect(pill(words.skip, false)).toBeTruthy();
      expectNoRawText(screen.toJSON());
    },
  );

  it.each(LOCALIZED)(
    'shows a saved bill with no card or account as Skip in %s',
    async (language) => {
      const words = WORDS[language];
      editing(null);
      setLanguage(language);
      const screen = await render(<AddBillScreen />);

      expect(screen.getByRole('radio', { name: words.skip, checked: true })).toBeTruthy();
      expect(screen.getByRole('radio', { name: CARD, checked: false })).toBeTruthy();
    },
  );

  it.each(LOCALIZED)('shows a saved bill’s card as chosen in %s', async (language) => {
    const words = WORDS[language];
    editing('card-1');
    setLanguage(language);
    const screen = await render(<AddBillScreen />);

    expect(screen.getByRole('radio', { name: CARD, checked: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: words.skip, checked: false })).toBeTruthy();
  });

  it.each(LOCALIZED)('reads the chips, No reminder and the time in %s', async (language) => {
    const words = WORDS[language];
    editing(null);
    setLanguage(language);
    const screen = await render(<AddBillScreen />);
    const chip = (name: string, checked: boolean) => screen.getByRole('radio', { name, checked });

    expect(screen.getByText(words.reminder)).toBeTruthy();
    expect(screen.getByText(words.reminderCaption)).toBeTruthy();
    // A bill with no reminder has answered: that chip is the chosen one, and "Off" is not offered.
    expect(chip(words.noReminder, true)).toBeTruthy();
    for (const label of words.reminderChips) expect(chip(label, false)).toBeTruthy();
    expect(screen.queryByLabelText(words.off)).toBeNull();
    // Nothing to time until there is a reminder.
    expect(screen.queryByLabelText(words.sentAt)).toBeNull();

    const [, , threeDays] = words.reminderChips;
    await press(screen, threeDays);
    expect(chip(threeDays, true)).toBeTruthy();
    expect(chip(words.noReminder, false)).toBeTruthy();
    expect(screen.getByLabelText(words.sentAt)).toBeTruthy();
    expect(screen.getByText(words.sentAtText)).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, words.noReminder);
    expect(chip(words.noReminder, true)).toBeTruthy();
    expect(screen.queryByLabelText(words.sentAt)).toBeNull();
  });
});

describe('Save with gaps in Spanish and French', () => {
  const lineAboveSave = (screen: Rendered) =>
    shownText(screen.toJSON()).filter((line) =>
      /^(Para guardar la factura|Pour enregistrer la facture)/.test(line),
    );

  it.each([
    ['es', 'Para guardar la factura, completa: Nombre, Fecha de pago, Se paga con, Recordatorio.'],
    [
      'fr',
      `Pour enregistrer la facture, remplis${NBSP}: Nom, Date de paiement, Payée avec, Rappel.`,
    ],
  ] as const)(
    'names every empty box in %s, in the page’s order, and saves nothing',
    async (language, line) => {
      const screen = await reachFinalPage(language);

      await press(screen, WORDS[language].save);

      expect(lineAboveSave(screen)).toEqual([line]);
      expect(mockCreate).not.toHaveBeenCalled();
      expectNoRawText(screen.toJSON());
    },
  );

  it.each([
    ['es', 'Importe, Nombre, Categoría, Fecha de pago, Se paga con, Recordatorio'],
    ['fr', 'Montant, Nom, Catégorie, Date de paiement, Payée avec, Rappel'],
  ] as const)('names the amount and the category too in %s', async (language, fields) => {
    setLanguage(language);
    mockParams = { prefillNote: 'Test' };
    const screen = await render(<AddBillScreen />);

    await press(screen, WORDS[language].save);

    expect(lineAboveSave(screen)).toEqual([WORDS[language].missing(fields)]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['es', 'Nombre, Empieza el, Se paga con, Recordatorio'],
    ['fr', 'Nom, Commence le, Payée avec, Rappel'],
  ] as const)('asks for the start of a specific period in %s', async (language, fields) => {
    const words = WORDS[language];
    const screen = await reachFinalPage(language);
    await press(screen, words.period);

    await press(screen, words.save);

    expect(lineAboveSave(screen)).toEqual([words.missing(fields)]);
  });

  it.each([
    ['es', 'Fecha de pago, Se paga con, Recordatorio', 'Se paga con, Recordatorio', 'Recordatorio'],
    ['fr', 'Date de paiement, Payée avec, Rappel', 'Payée avec, Rappel', 'Rappel'],
  ] as const)(
    'lists only what is still empty in %s, and the line goes with the next answer',
    async (language, afterName, afterDay, afterSource) => {
      const words = WORDS[language];
      const screen = await reachFinalPage(language);

      await typeName(screen, words.namePlaceholder, TYPED_NAME);
      await press(screen, words.save);
      expect(lineAboveSave(screen)).toEqual([words.missing(afterName)]);

      await press(screen, words.paymentBox);
      expect(lineAboveSave(screen)).toEqual([words.missing(afterName)]);
      await press(screen, words.day);
      expect(lineAboveSave(screen)).toEqual([]);

      await press(screen, words.save);
      expect(lineAboveSave(screen)).toEqual([words.missing(afterDay)]);
      await press(screen, words.skip);
      expect(lineAboveSave(screen)).toEqual([]);

      await press(screen, words.save);
      expect(lineAboveSave(screen)).toEqual([words.missing(afterSource)]);
      await press(screen, words.noReminder);
      expect(lineAboveSave(screen)).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();

      await press(screen, words.save);
      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      expect(lineAboveSave(screen)).toEqual([]);
    },
  );
});

describe('The Name box in Spanish and French', () => {
  it.each(LOCALIZED)(
    'reads the box, an unknown name and its logo question in %s',
    async (language) => {
      const words = WORDS[language];
      const screen = await reachFinalPage(language);

      expect(screen.getByText(words.nameLabel)).toBeTruthy();
      const search = screen.getByPlaceholderText(words.namePlaceholder);
      await fireEvent(search, 'focus');
      await fireEvent.changeText(search, 'Casa Verde');
      expect(await screen.findByLabelText(words.useName('Casa Verde'))).toBeTruthy();
      expect(screen.getByText(words.addName('Casa Verde'))).toBeTruthy();
      expectNoRawText(screen.toJSON());

      await press(screen, words.useName('Casa Verde'));
      // The name is chosen, and the logo question is asked in place, in the same language.
      expect(screen.getByLabelText(words.changeName('Casa Verde'))).toBeTruthy();
      expect(screen.getByLabelText(LOGO_COPY.addWebsite)).toBeTruthy();
      expectNoRawText(screen.toJSON());

      await press(screen, words.changeName('Casa Verde'));
      // Taking the name off empties the box; nothing fills it again.
      expect(screen.getByPlaceholderText(words.namePlaceholder)).toHaveDisplayValue('');
      expect(screen.queryByLabelText(words.changeName('Casa Verde'))).toBeNull();
    },
  );

  // The hints name real companies where the words are the same in every language.
  it.each([
    ['es', 'Vivienda', 'Renta, hipoteca o tu arrendador'],
    ['es', 'Luz y gas', 'AEP, Duke Energy, National Grid'],
    ['es', 'Agua y basura', 'Tu compañía de agua'],
    ['es', 'Internet', 'Xfinity, Spectrum, Verizon'],
    ['es', 'Celular', 'T-Mobile, AT&T, Verizon'],
    ['es', 'Seguros', 'Geico, State Farm, Progressive'],
    ['es', 'Transporte', 'Transporte público, casetas o estacionamiento'],
    ['es', 'Salud y gastos médicos', 'Tu médico, dentista o clínica'],
    ['es', 'Educación', 'Tu escuela o universidad'],
    ['es', 'Otra', 'Busca o escribe un nombre'],
    ['fr', 'Logement', 'Loyer, prêt immobilier ou ton propriétaire'],
    ['fr', 'Électricité et gaz', 'AEP, Duke Energy, National Grid'],
    ['fr', 'Eau et déchets', 'Ton fournisseur d’eau'],
    ['fr', 'Internet', 'Xfinity, Spectrum, Verizon'],
    ['fr', 'Cellulaire', 'T-Mobile, AT&T, Verizon'],
    ['fr', 'Assurances', 'Geico, State Farm, Progressive'],
    ['fr', 'Transport', 'Transport en commun, péages ou stationnement'],
    ['fr', 'Santé et soins médicaux', 'Ton médecin, dentiste ou clinique'],
    ['fr', 'Éducation', 'Ton école ou ton collège'],
    ['fr', 'Autre', 'Cherche ou écris un nom'],
  ] as const)('in %s, a %s bill’s Name box hints “%s”', async (language, category, hint) => {
    setLanguage(language);
    const screen = await render(<AddBillScreen />);
    await press(screen, new RegExp(`^${category}\\. `));
    await typeAmount(screen, '80');
    await press(screen, WORDS[language].continue);

    expect(screen.getByPlaceholderText(hint)).toBeTruthy();
  });
});

describe('What a bill saves', () => {
  it('is the same in every language', async () => {
    const english = await addHousing('en');
    const spanish = await addHousing('es');
    const french = await addHousing('fr');

    expect(english).toMatchObject({
      name: TYPED_NAME,
      amount: 1234.56,
      category_id: 'housing',
      recurrence: 'quarterly',
      next_due_on: '2026-10-15',
      card_id: null,
      bank_account_id: null,
    });
    expect(spanish).toEqual(english);
    expect(french).toEqual(english);
  });

  it.each(LANGUAGES)('saves "No reminder" as no lead, pressed in %s', async (language) => {
    await addHousing(language);

    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', null, '09:00');
  });

  it.each(LOCALIZED)('saves the card pressed by its name in %s', async (language) => {
    const saved = await addHousing(language, { paidWith: CARD });

    expect(saved).toMatchObject({ card_id: 'card-1', bank_account_id: null });
  });

  it.each(LANGUAGES)(
    'saves the amount to the cent on a keypad that reads in %s',
    async (language) => {
      const saved = await addHousing(language);

      expect(saved.amount).toBe(1234.56);
    },
  );
});

describe('A new bill’s name', () => {
  it.each(LANGUAGES)(
    'is empty in %s until someone types, and is saved as typed',
    async (language) => {
      const words = WORDS[language];
      const saved = await addHousing(language, {
        name: async (screen) => {
          expect(screen.getByPlaceholderText(words.namePlaceholder)).toHaveDisplayValue('');
          await typeName(screen, words.namePlaceholder, TYPED_NAME);
          expect(screen.getByDisplayValue(TYPED_NAME)).toBeTruthy();
        },
      });

      expect(saved).toMatchObject({ name: TYPED_NAME, brand_id: null, category_id: 'housing' });
    },
  );

  it.each(LOCALIZED)('is a company picked from the list, in %s', async (language) => {
    const words = WORDS[language];
    const saved = await addHousing(language, {
      name: async (screen) => {
        await chooseCompany(screen, words.namePlaceholder, 'Greystar');
        expect(screen.getByLabelText(words.changeName('Greystar'))).toBeTruthy();
      },
    });

    expect(saved).toMatchObject({ name: 'Greystar', brand_id: 'b-greystar' });
  });

  it.each([
    ['es', 'Categoría, Vivienda', /^Seguros\. /, 'Categoría, Seguros'],
    ['fr', 'Catégorie, Logement', /^Assurances\. /, 'Catégorie, Assurances'],
  ] as const)(
    'is not renamed by a change of category, in %s',
    async (language, categoryRow, insurance, newCategoryRow) => {
      const words = WORDS[language];
      const saved = await addHousing(language, {
        name: async (screen) => {
          await chooseCompany(screen, words.namePlaceholder, 'Greystar');
          await press(screen, categoryRow);
          await press(screen, insurance);
          expect(screen.getByLabelText(newCategoryRow)).toBeTruthy();
          expect(screen.getByLabelText(words.changeName('Greystar'))).toBeTruthy();
        },
      });

      expect(saved).toMatchObject({ name: 'Greystar', category_id: 'insurance' });
    },
  );

  it.each(LOCALIZED)('is the name the voice review heard, in %s', async (language) => {
    const words = WORDS[language];
    setLanguage(language);
    mockParams = {
      from: 'voice',
      prefillCategory: 'housing',
      prefillAmount: '80',
      prefillName: TYPED_NAME,
    };
    const screen = await render(<AddBillScreen />);

    // The voice page already named it, so the form opens on the final page with the name in place.
    expect(screen.getByLabelText(words.changeName(TYPED_NAME))).toBeTruthy();
    expect(screen.queryByPlaceholderText(words.namePlaceholder)).toBeNull();
  });

  it.each(LOCALIZED)(
    'is left to the person when the voice review heard only a category, in %s',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      mockParams = { from: 'voice', prefillCategory: 'housing', prefillAmount: '80' };
      const screen = await render(<AddBillScreen />);

      // A category alone is not a name: the category's words stay on the Category row only.
      expect(screen.getByPlaceholderText(words.namePlaceholder)).toHaveDisplayValue('');
      expect(screen.queryByLabelText(/^(Cambiar nombre|Changer le nom)/)).toBeNull();
    },
  );

  it('is never renamed on a bill saved before, whatever the language now', async () => {
    setLanguage('fr');
    mockParams = { id: 'bill-2' };
    mockBill = {
      data: { ...POWER, id: 'bill-2', name: 'Vivienda', category_id: 'housing' },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Changer le nom, actuellement Vivienda')).toBeTruthy();
    await press(screen, 'Enregistrer les modifications');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      id: 'bill-2',
      values: { name: 'Vivienda', category_id: 'housing' },
    });
  });
});

describe('A bill’s category name', () => {
  it('is word for word the English label in English', () => {
    setLanguage('en');
    for (const category of BILL_CATEGORIES) {
      expect(billCategoryLabel(category.id)).toBe(category.label);
    }
  });
});
