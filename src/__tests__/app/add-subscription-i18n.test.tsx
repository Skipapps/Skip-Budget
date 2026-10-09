import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import AddSubscriptionScreen from '@/app/add-subscription';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Adding and editing a subscription in Spanish and French: the keypad, the final page (the Service
 * box, the Next renewal box and its calendar, the Charged to pills and the reminder chips are all
 * on it) and the amount and note pages it opens. The words, the dates, the times of day and the
 * service's category follow the language; what is saved (cycle, amount, category id, renewal,
 * card, reminder) does not.
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
  toggle: jest.fn(),
}));

// Accepts a press even while disabled, and still reports its state: the only way to reach the
// refusals inside Save, which the final page normally holds back.
jest.mock('@/components/ui/button', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({
      label,
      onPress,
      disabled,
    }: {
      label: string;
      onPress: () => void;
      disabled?: boolean;
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: Boolean(disabled) }}
        onPress={onPress}
      >
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});

jest.mock('@/components/brands/brand-logo', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    BrandLogo: ({ name, domain }: { name: string; domain?: string | null }) => (
      <Text>{`${name}|${domain ?? ''}`}</Text>
    ),
  };
});

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    danger: '#CC0000',
    body: '#333333',
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

// The real chips and wording; only the two hooks that read and write the reminder are replaced.
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
let mockSavedReminder = { choice: 'off', remindAt: '09:00' };
const mockApplyReminder = jest.fn(async (..._: unknown[]) => {});
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useReminderChoice: () => mockSavedReminder,
  useApplyReminder: () => mockApplyReminder,
}));

const BRANDS = [
  { id: 'netflix', name: 'Netflix', domain: 'netflix.com', category_id: 'entertainment' },
  // A category this build has no words for, and one the database no longer lists.
  { id: 'b-new', name: 'Newkind', domain: 'newkind.com', category_id: 'new-kind' },
  { id: 'b-gone', name: 'Goneco', domain: 'goneco.com', category_id: 'gone' },
];

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
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
  // The database's own labels, which are English.
  useSpendCategories: () => ({
    data: [
      { id: 'entertainment', label: 'Entertainment', hint: '' },
      { id: 'new-kind', label: 'Something new', hint: '' },
    ],
  }),
}));
// What the logo service answers for a service the catalogue does not know.
const mockLogoAnswer = jest.fn();
jest.mock('@/api/logos', () => ({
  useLogoMatch: (name: string) => ({
    data: mockLogoAnswer(name),
    isLoading: false,
    isFetching: false,
  }),
}));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateSubscription: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSubscription: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSubscription: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

let mockRow: { data: unknown; isError: boolean; isFetched: boolean };
jest.mock('@/api/queries', () => ({
  useSubscription: () => ({ ...mockRow, refetch: jest.fn() }),
  usePaymentSources: () => ({
    sources: [
      { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
      { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
    ],
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

const SAVED = {
  id: 's1',
  brand_id: 'netflix',
  name: 'Netflix',
  amount: 15.99,
  cycle: 'monthly',
  next_renewal_on: '2026-10-12',
  started_on: '2026-01-12',
  created_at: '2026-01-12T00:00:00Z',
  category_id: 'entertainment',
  card_id: null,
  bank_account_id: null,
  note: null,
  active: true,
  brands: { domain: 'netflix.com' },
};

const NBSP = ' ';
const CARD = 'VISA ••4421';
const ACCOUNT = 'Checking ••0099';

type Node = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;
type Screen = Awaited<ReturnType<typeof render>>;

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

/** The line above Save that names what is still empty; the Save button's own label is not it. */
const lineAboveSave = (screen: Screen) =>
  shownText(screen.toJSON()).filter((line) =>
    /^(Para guardar la suscripción|Pour enregistrer l’abonnement)/.test(line),
  );

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));

async function typeAmount(screen: Screen, digits: string, decimal: string) {
  for (const key of digits) await press(screen, key === '.' ? decimal : key);
}

const isChecked = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.checked);

/** A pill or chip by its name, and whether it is the lit one. */
const radio = (screen: Screen, name: string, checked: boolean) =>
  screen.getByRole('radio', { name, checked });

/** Types into the service field the way a finger does: a tap into it, then the letters. */
async function searchService(screen: Screen, placeholder: string, text: string) {
  const input = screen.getByPlaceholderText(placeholder);
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
}

/** Types into the service box without picking anything from the list. */
const typeService = (screen: Screen, placeholder: string, text: string) =>
  fireEvent.changeText(screen.getByPlaceholderText(placeholder), text);

/** What one pass through the form presses, per language. */
type Walk = {
  decimal: string;
  continue: string;
  search: string;
  /** The Next renewal box as VoiceOver reads it before a day is picked. */
  renewalBox: string;
  day: string;
  yearly: string;
  skip: string;
  noReminder: string;
  save: string;
};

/** Plus what the Spanish and French tests read on the final page. */
type Words = Walk & {
  amount: string;
  amountMissing: string;
  amountNeeded: string;
  renewal: string;
  pickDay: string;
  chargedTo: string;
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
    decimal: 'Decimal point',
    continue: 'Continue',
    search: 'Search for a service',
    renewalBox: 'Next renewal, Select a date',
    day: 'Monday 12 October 2026',
    yearly: 'Yearly',
    skip: 'Skip',
    noReminder: 'No reminder',
    save: 'Save subscription',
  },
  es: {
    decimal: 'Punto decimal',
    continue: 'Continuar',
    search: 'Busca un servicio',
    renewalBox: 'Próxima renovación, Elige una fecha',
    day: 'lunes 12 de octubre de 2026',
    yearly: 'Anual',
    skip: 'Omitir',
    noReminder: 'Sin recordatorio',
    save: 'Guardar suscripción',
    amount: 'Importe',
    amountMissing: 'Toca para agregar el importe',
    amountNeeded: 'Importe, obligatorio',
    renewal: 'Próxima renovación',
    pickDay: 'Elige una fecha',
    chargedTo: 'Se cobra a',
    reminder: 'Recordatorio',
    reminderCaption: 'Antes de que se renueve',
    off: 'Desactivado',
    reminderChips: ['El mismo día', '1 día', '3 días', '1 semana'],
    sentAt: /^Hora de envío: /,
    sentAtText: 'a las 9:00 a. m.',
    missing: (fields) => `Para guardar la suscripción, completa: ${fields}.`,
  },
  fr: {
    decimal: 'Virgule décimale',
    continue: 'Continuer',
    search: 'Cherche un service',
    renewalBox: 'Prochain renouvellement, Choisis une date',
    day: 'lundi 12 octobre 2026',
    yearly: 'Chaque année',
    skip: 'Passer',
    noReminder: 'Aucun rappel',
    save: 'Enregistrer l’abonnement',
    amount: 'Montant',
    amountMissing: 'Touche pour ajouter le montant',
    amountNeeded: 'Montant, requis',
    renewal: 'Prochain renouvellement',
    pickDay: 'Choisis une date',
    chargedTo: 'Prélevé sur',
    reminder: 'Rappel',
    reminderCaption: 'Avant le renouvellement',
    off: 'Désactivé',
    reminderChips: ['Le jour même', '1 jour', '3 jours', '1 semaine'],
    sentAt: /^Envoyé à /,
    sentAtText: `à 9${NBSP}h${NBSP}00`,
    missing: (fields) => `Pour enregistrer l’abonnement, remplis${NBSP}: ${fields}.`,
  },
};

const LANGUAGES = ['en', 'es', 'fr'] as const;
const LOCALIZED = ['es', 'fr'] as const;

/** A new subscription at `digits`, on its final page, the way a person gets there. */
async function reachFinalPage(language: Language, digits = '15.99') {
  const words = WORDS[language];
  setLanguage(language);
  const screen = await render(<AddSubscriptionScreen />);

  await typeAmount(screen, digits, words.decimal);
  await press(screen, words.continue);
  return screen;
}

/** Picks Netflix from the service box's list. */
async function pickNetflix(screen: Screen, placeholder: string) {
  await searchService(screen, placeholder, 'Net');
  await fireEvent.press(await screen.findByLabelText('Netflix'));
}

/**
 * A new yearly subscription at 1,234.56 answered box by box in the words of `language` and saved.
 * The service is Netflix from the list unless `service` answers it; Charged to is Skip and the
 * reminder is No reminder unless `chargedTo` or `reminder` name another pill.
 */
async function addSubscription(
  language: Language,
  {
    service,
    chargedTo,
    reminder,
  }: { service?: (screen: Screen) => Promise<void>; chargedTo?: string; reminder?: string } = {},
) {
  const words = WORDS[language];
  mockCreate.mockClear();
  mockApplyReminder.mockClear();
  const screen = await reachFinalPage(language, '1234.56');

  if (service) await service(screen);
  else await pickNetflix(screen, words.search);
  await press(screen, words.renewalBox);
  await press(screen, words.day);
  await press(screen, words.yearly);
  await press(screen, chargedTo ?? words.skip);
  await press(screen, reminder ?? words.noReminder);
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
  mockRow = { data: null, isError: false, isFetched: false };
  mockSavedReminder = { choice: 'off', remindAt: '09:00' };
  mockLogoAnswer.mockReturnValue(null);
  mockCreate.mockResolvedValue({ id: 'sub-new' });
});
afterAll(() => resetLocaleForTests());

describe('Add a subscription in Spanish', () => {
  it('reads the amount page in Spanish, with no step dots', async () => {
    setLanguage('es');
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Agregar una suscripción')).toBeTruthy();
    expect(screen.getByText('¿Cuánto cuesta?')).toBeTruthy();
    expect(screen.getByLabelText('Continuar')).toBeDisabled();
    expect(screen.getByLabelText('Punto decimal')).toBeTruthy();
    expect(screen.getByLabelText('Borrar el último dígito')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expectNoRawText(screen.toJSON());
  });

  it('reads the final page in Spanish: every box, the cycle chips and the reassurance', async () => {
    const screen = await reachFinalPage('es');

    expect(screen.getByText('Importe')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Importe, $15.99' })).toBeTruthy();
    expect(screen.getByText('Toca para editar')).toBeTruthy();
    // The service is a search box on the page itself.
    expect(screen.getByText('Servicio')).toBeTruthy();
    expect(screen.getByPlaceholderText('Busca un servicio')).toBeTruthy();
    expect(screen.getByText('Ciclo de cobro')).toBeTruthy();
    for (const chip of ['Semanal', 'Mensual', 'Trimestral', 'Anual']) {
      expect(screen.getByLabelText(chip).props.accessibilityRole).toBe('radio');
    }
    expect(isChecked(screen, 'Mensual')).toBe(true);
    // The renewal is a box with its calendar under it, and it is needed to save.
    expect(screen.getByText('Próxima renovación')).toBeTruthy();
    expect(screen.getByText('Elige una fecha')).toBeTruthy();
    expect(screen.getByLabelText('Próxima renovación, Elige una fecha')).toBeTruthy();
    // Nothing is answered yet, so no pill is lit.
    expect(screen.getByText('Se cobra a')).toBeTruthy();
    for (const pill of [CARD, ACCOUNT, 'Omitir']) expect(radio(screen, pill, false)).toBeTruthy();
    expect(screen.getByText('Recordatorio')).toBeTruthy();
    expect(screen.getByText('Antes de que se renueve')).toBeTruthy();
    expect(radio(screen, 'Sin recordatorio', false)).toBeTruthy();
    expect(screen.getByLabelText('Nota, sin definir, opcional')).toBeTruthy();
    expect(screen.getByText('Agregar una nota')).toBeTruthy();
    expect(screen.getByText('Puedes editarlo más tarde.')).toBeTruthy();
    // Save is never held back for a gap: it says what is missing.
    expect(screen.getByLabelText('Guardar suscripción')).toBeEnabled();
    expectNoRawText(screen.toJSON());

    // The boxes that became pages of their own, and the rows that are boxes now, are gone.
    expect(screen.queryByText('Sin definir')).toBeNull();
    expect(screen.queryByLabelText(/^Se cobra a, /)).toBeNull();
    expect(screen.queryByLabelText(/^Recordatorio, /)).toBeNull();
    expect(screen.queryByText('¿Cuándo se renueva?')).toBeNull();
  });

  it('reads the service box in Spanish, the category included', async () => {
    const screen = await reachFinalPage('es');

    expect(screen.getByPlaceholderText('Busca un servicio')).toBeTruthy();
    expect(screen.queryByText(/^Archivada en/)).toBeNull();
    expectNoRawText(screen.toJSON());

    await searchService(screen, 'Busca un servicio', 'Net');
    await fireEvent.press(await screen.findByLabelText('Netflix'));
    expect(screen.getByText('Archivada en Entretenimiento')).toBeTruthy();
    expect(screen.getByLabelText('Cambiar servicio, ahora es Netflix')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    // A category this build has no words for keeps the database's label.
    await press(screen, 'Cambiar servicio, ahora es Netflix');
    await searchService(screen, 'Busca un servicio', 'Newkind');
    await fireEvent.press(await screen.findByLabelText('Newkind'));
    expect(screen.getByText('Archivada en Something new')).toBeTruthy();

    // One the database does not list falls to Other.
    await press(screen, 'Cambiar servicio, ahora es Newkind');
    await searchService(screen, 'Busca un servicio', 'Goneco');
    await fireEvent.press(await screen.findByLabelText('Goneco'));
    expect(screen.getByText('Archivada en Otros')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('asks about the logo of a new service in Spanish, under the box', async () => {
    const screen = await reachFinalPage('es');

    // The service does not know it, and the logo service is not sure: only the quiet way in.
    await searchService(screen, 'Busca un servicio', 'Zed Zed');
    await fireEvent.press(screen.getByText('Agregar “Zed Zed”'));
    expect(screen.getByText('Archivada en Otros')).toBeTruthy();
    expect(screen.getByText('Agregar un sitio web')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await screen.unmount();

    // It is sure: the question with its choices.
    mockLogoAnswer.mockImplementation((name: string) =>
      name === 'Planet Fitness'
        ? {
            matched: true,
            name: 'Planet Fitness',
            domain: 'planetfitness.com',
            confidence: 0.97,
            margin: 0.9,
            candidates: [],
          }
        : null,
    );
    const sure = await reachFinalPage('es');
    await searchService(sure, 'Busca un servicio', 'Planet Fitness');
    await fireEvent.press(sure.getByText('Agregar “Planet Fitness”'));
    for (const choice of [
      'Sí, es ese',
      'No es este',
      'Usar el sitio web',
      'Sin logo, usar letras',
    ]) {
      expect(sure.getByText(choice)).toBeTruthy();
    }
    expect(sure.getByText('planetfitness.com')).toBeTruthy();
    expectNoRawText(sure.toJSON());
  });

  it('reads the Next renewal box in Spanish, the dates in Spanish order', async () => {
    const screen = await reachFinalPage('es');

    // The calendar opens under the box; the page stays.
    await press(screen, 'Próxima renovación, Elige una fecha');
    expect(screen.getByLabelText('Mes siguiente')).toBeTruthy();
    expect(screen.getByText('Agregar una nota')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Mes siguiente');
    await press(screen, 'viernes 6 de noviembre de 2026');
    expect(screen.getByLabelText('Próxima renovación, vie 6 nov')).toBeTruthy();
    // Picking a day folds the calendar away, and a day once picked cannot be taken off.
    expect(screen.queryByLabelText('Mes siguiente')).toBeNull();
    expect(screen.queryByLabelText('Sin fecha de renovación')).toBeNull();

    await press(screen, 'Próxima renovación, vie 6 nov');
    await press(screen, 'Mes anterior');
    await press(screen, 'Hoy, miércoles 7 de octubre de 2026');
    expect(screen.getByLabelText('Próxima renovación, Hoy, mié 7 oct')).toBeTruthy();

    await press(screen, 'Próxima renovación, Hoy, mié 7 oct');
    await press(screen, 'martes 6 de octubre de 2026');
    expect(screen.getByLabelText('Próxima renovación, Ayer, mar 6 oct')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads the note page in Spanish', async () => {
    const screen = await reachFinalPage('es');

    await press(screen, 'Nota, sin definir, opcional');
    expect(screen.getByPlaceholderText('Qué plan, por ejemplo')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByPlaceholderText('Qué plan, por ejemplo'),
      'Plan familiar',
    );
    await press(screen, 'Listo');
    expect(screen.getByLabelText('Nota, Plan familiar')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says the one failure line when the subscription to edit cannot be read', async () => {
    setLanguage('es');
    mockParams = { id: 's1' };
    mockRow = { data: null, isError: true, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Algo salió mal. Inténtalo de nuevo.')).toBeTruthy();
    expect(screen.getByText('Intentar de nuevo')).toBeTruthy();
    expect(screen.getByText('Regresar')).toBeTruthy();
  });
});

describe('Edit a subscription in French', () => {
  beforeEach(() => {
    setLanguage('fr');
    mockParams = { id: 's1' };
    mockRow = { data: SAVED, isError: false, isFetched: true };
  });

  it('reads the final page in French and asks before deleting', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Modifier l’abonnement')).toBeTruthy();
    expect(screen.getByRole('button', { name: `Montant, 15,99${NBSP}$` })).toBeTruthy();
    expect(screen.getByLabelText('Changer de service, actuellement Netflix')).toBeTruthy();
    expect(screen.getByText('Classé dans Divertissement')).toBeTruthy();
    expect(screen.getByText('Cycle de facturation')).toBeTruthy();
    for (const chip of ['Chaque semaine', 'Chaque mois', 'Chaque trimestre', 'Chaque année']) {
      expect(screen.getByLabelText(chip).props.accessibilityRole).toBe('radio');
    }
    expect(isChecked(screen, 'Chaque mois')).toBe(true);
    expect(screen.getByText('Prochain renouvellement')).toBeTruthy();
    expect(screen.getByLabelText('Prochain renouvellement, lun. 12 oct.')).toBeTruthy();
    expect(screen.getByText('Prélevé sur')).toBeTruthy();
    expect(screen.getByText('Rappel')).toBeTruthy();
    expect(screen.getByLabelText('Note, non défini, facultatif')).toBeTruthy();
    expect(screen.getByText('Ajouter une note')).toBeTruthy();
    expect(screen.getByText('Statut')).toBeTruthy();
    expect(isChecked(screen, 'Actif')).toBe(true);
    expect(screen.getByLabelText('Annulé').props.accessibilityRole).toBe('radio');
    expect(screen.getByText('Tu pourras le modifier plus tard.')).toBeTruthy();
    expect(screen.getByLabelText('Enregistrer les modifications')).toBeEnabled();
    expect(screen.getByText('Supprimer l’abonnement')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Supprimer cet abonnement');
    expect(mockConfirm).toHaveBeenCalledWith({
      title: `Supprimer cet abonnement${NBSP}?`,
      message: 'Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
  });

  it('asks in French before closing, naming the edit', async () => {
    mockConfirm.mockResolvedValueOnce(false);
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Fermer');

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: `Annuler la modification de cet abonnement${NBSP}?` }),
    );
  });

  it('lets go of the service in French, offers the search box again and names it at Save', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Changer de service, actuellement Netflix');

    expect(screen.getByPlaceholderText('Cherche un service')).toBeTruthy();
    expect(screen.queryByText(/^Classé dans/)).toBeNull();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Enregistrer les modifications');
    expect(lineAboveSave(screen)).toEqual([WORDS.fr.missing('Service')]);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('reads the Next renewal box in French, picked in the calendar under it', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Prochain renouvellement, lun. 12 oct.');
    expect(screen.getByText('octobre 2026')).toBeTruthy();
    expect(screen.getByLabelText('lundi 12 octobre 2026')).toBeTruthy();
    expect(screen.getByLabelText('Mois suivant')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, 'vendredi 16 octobre 2026');
    expect(screen.getByLabelText('Prochain renouvellement, ven. 16 oct.')).toBeTruthy();
    expect(screen.queryByLabelText('Mois suivant')).toBeNull();
    expect(screen.queryByLabelText('Aucune date de renouvellement')).toBeNull();
  });

  it('reads the saved reminder in French, the time as Canada writes it', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    const screen = await render(<AddSubscriptionScreen />);

    for (const chip of ['Aucun rappel', 'Le jour même', '1 jour', '3 jours', '1 semaine']) {
      expect(screen.getByLabelText(chip).props.accessibilityRole).toBe('radio');
    }
    expect(isChecked(screen, '3 jours')).toBe(true);
    expect(isChecked(screen, 'Aucun rappel')).toBe(false);
    expect(screen.getByLabelText(`Envoyé à 8${NBSP}h${NBSP}30. Changer l’heure.`)).toBeTruthy();
    expect(screen.getByText(`à 8${NBSP}h${NBSP}30`)).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});

describe('Add a subscription in French', () => {
  it('reads the final page in French', async () => {
    const screen = await reachFinalPage('fr');

    expect(screen.getByRole('button', { name: `Montant, 15,99${NBSP}$` })).toBeTruthy();
    expect(screen.getByText('Service')).toBeTruthy();
    expect(screen.getByPlaceholderText('Cherche un service')).toBeTruthy();
    expect(screen.getByText('Cycle de facturation')).toBeTruthy();
    expect(screen.getByText('Prochain renouvellement')).toBeTruthy();
    expect(screen.getByText('Choisis une date')).toBeTruthy();
    expect(screen.getByLabelText('Prochain renouvellement, Choisis une date')).toBeTruthy();
    expect(screen.getByText('Prélevé sur')).toBeTruthy();
    expect(screen.getByLabelText('Passer')).toBeTruthy();
    expect(screen.getByText('Rappel')).toBeTruthy();
    expect(screen.getByText('Avant le renouvellement')).toBeTruthy();
    expect(screen.getByLabelText('Aucun rappel')).toBeTruthy();
    expect(screen.getByText('Tu pourras le modifier plus tard.')).toBeTruthy();
    expect(screen.getByLabelText('Enregistrer l’abonnement')).toBeEnabled();
    expectNoRawText(screen.toJSON());

    expect(screen.queryByLabelText(/^Prélevé sur, /)).toBeNull();
    expect(screen.queryByLabelText(/^Rappel, /)).toBeNull();
    expect(screen.queryByText('Quand se renouvelle-t-il ?')).toBeNull();
  });
});

describe('Charged to and the reminder in Spanish and French', () => {
  const editing = (card: string | null) => {
    mockParams = { id: 's1' };
    mockRow = { data: { ...SAVED, card_id: card }, isError: false, isFetched: true };
  };

  it.each(LOCALIZED)(
    'offers Skip beside the cards and the accounts, unanswered at first, in %s',
    async (language) => {
      const words = WORDS[language];
      const screen = await reachFinalPage(language);

      expect(screen.getByText(words.chargedTo)).toBeTruthy();
      for (const pill of [CARD, ACCOUNT, words.skip])
        expect(radio(screen, pill, false)).toBeTruthy();

      await press(screen, words.skip);
      expect(radio(screen, words.skip, true)).toBeTruthy();
      expect(radio(screen, CARD, false)).toBeTruthy();

      await press(screen, CARD);
      expect(radio(screen, CARD, true)).toBeTruthy();
      expect(radio(screen, words.skip, false)).toBeTruthy();

      await press(screen, ACCOUNT);
      expect(radio(screen, ACCOUNT, true)).toBeTruthy();
      expect(radio(screen, CARD, false)).toBeTruthy();
      expectNoRawText(screen.toJSON());
    },
  );

  it.each(LOCALIZED)(
    'starts a saved subscription with no card or reminder on Skip and No reminder in %s',
    async (language) => {
      const words = WORDS[language];
      editing(null);
      setLanguage(language);
      const screen = await render(<AddSubscriptionScreen />);

      expect(radio(screen, words.skip, true)).toBeTruthy();
      expect(radio(screen, CARD, false)).toBeTruthy();
      expect(radio(screen, words.noReminder, true)).toBeTruthy();
    },
  );

  it.each(LOCALIZED)('starts a saved subscription on its card in %s', async (language) => {
    const words = WORDS[language];
    editing('card-1');
    setLanguage(language);
    const screen = await render(<AddSubscriptionScreen />);

    expect(radio(screen, CARD, true)).toBeTruthy();
    expect(radio(screen, words.skip, false)).toBeTruthy();
  });

  it.each(LOCALIZED)('reads the chips, No reminder and the time in %s', async (language) => {
    const words = WORDS[language];
    const screen = await reachFinalPage(language);

    expect(screen.getByText(words.reminder)).toBeTruthy();
    expect(screen.getByText(words.reminderCaption)).toBeTruthy();
    // A new subscription has not answered, so no chip is lit, and "Off" is not offered.
    expect(radio(screen, words.noReminder, false)).toBeTruthy();
    for (const label of words.reminderChips) expect(radio(screen, label, false)).toBeTruthy();
    expect(screen.queryByLabelText(words.off)).toBeNull();
    // Nothing to time until there is a reminder.
    expect(screen.queryByLabelText(words.sentAt)).toBeNull();

    const [, , threeDays] = words.reminderChips;
    await press(screen, threeDays);
    expect(radio(screen, threeDays, true)).toBeTruthy();
    expect(radio(screen, words.noReminder, false)).toBeTruthy();
    expect(screen.getByLabelText(words.sentAt)).toBeTruthy();
    expect(screen.getByText(words.sentAtText)).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, words.noReminder);
    expect(radio(screen, words.noReminder, true)).toBeTruthy();
    expect(screen.queryByLabelText(words.sentAt)).toBeNull();
  });
});

describe('Save with gaps in Spanish and French', () => {
  it.each([
    [
      'es',
      'Para guardar la suscripción, completa: Servicio, Próxima renovación, Se cobra a, Recordatorio.',
    ],
    [
      'fr',
      `Pour enregistrer l’abonnement, remplis${NBSP}: Service, Prochain renouvellement, Prélevé sur, Rappel.`,
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
    ['es', 'Importe, Servicio, Próxima renovación, Se cobra a, Recordatorio'],
    ['fr', 'Montant, Service, Prochain renouvellement, Prélevé sur, Rappel'],
  ] as const)('names the amount too in %s', async (language, fields) => {
    const words = WORDS[language];
    setLanguage(language);
    mockParams = { from: 'voice', prefillNote: 'Test' };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, words.save);

    expect(lineAboveSave(screen)).toEqual([words.missing(fields)]);
    expect(screen.getByText(words.amountMissing)).toBeTruthy();
    expect(screen.getByLabelText(words.amountNeeded)).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it.each([
    [
      'es',
      'Próxima renovación, Se cobra a, Recordatorio',
      'Se cobra a, Recordatorio',
      'Recordatorio',
    ],
    ['fr', 'Prochain renouvellement, Prélevé sur, Rappel', 'Prélevé sur, Rappel', 'Rappel'],
  ] as const)(
    'lists only what is still empty in %s, and the line goes with the next answer',
    async (language, afterService, afterDay, afterSource) => {
      const words = WORDS[language];
      const screen = await reachFinalPage(language);

      await press(screen, words.save);
      expect(lineAboveSave(screen)).toHaveLength(1);
      // What is typed in the service box answers it without being picked from the list.
      await typeService(screen, words.search, 'Zed Zed');
      expect(lineAboveSave(screen)).toEqual([]);

      await press(screen, words.save);
      expect(lineAboveSave(screen)).toEqual([words.missing(afterService)]);
      await press(screen, words.renewalBox);
      expect(lineAboveSave(screen)).toEqual([words.missing(afterService)]);
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

describe('What a subscription saves', () => {
  it('is the same in every language', async () => {
    const english = await addSubscription('en');
    const spanish = await addSubscription('es');
    const french = await addSubscription('fr');

    expect(english).toEqual({
      brand_id: 'netflix',
      name: 'Netflix',
      amount: 1234.56,
      cycle: 'yearly',
      next_renewal_on: '2026-10-12',
      started_on: '2026-10-12',
      category_id: 'entertainment',
      card_id: null,
      bank_account_id: null,
      note: null,
      active: true,
    });
    expect(spanish).toEqual(english);
    expect(french).toEqual(english);
  });

  it.each(LANGUAGES)('saves "No reminder" as no lead, pressed in %s', async (language) => {
    await addSubscription(language);

    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-new', null, '09:00');
  });

  it.each(LOCALIZED)('saves the reminder chip pressed by its name in %s', async (language) => {
    const [, , threeDays] = WORDS[language].reminderChips;

    await addSubscription(language, { reminder: threeDays });

    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-new', 3, '09:00');
  });

  it.each(LOCALIZED)('saves the card or account pressed by its name in %s', async (language) => {
    const card = await addSubscription(language, { chargedTo: CARD });
    const account = await addSubscription(language, { chargedTo: ACCOUNT });

    expect(card).toMatchObject({ card_id: 'card-1', bank_account_id: null });
    expect(account).toMatchObject({ card_id: null, bank_account_id: 'acct-1' });
  });

  it.each(LANGUAGES)(
    'saves a service typed but never picked, as typed, in %s',
    async (language) => {
      const saved = await addSubscription(language, {
        service: async (screen) => {
          await typeService(screen, WORDS[language].search, 'Zed Fitness');
        },
      });

      expect(saved).toMatchObject({
        brand_id: null,
        name: 'Zed Fitness',
        category_id: 'fitness',
      });
    },
  );

  it.each(LANGUAGES)(
    'saves the amount to the cent on a keypad that reads in %s',
    async (language) => {
      const saved = await addSubscription(language);

      expect(saved.amount).toBe(1234.56);
    },
  );
});
