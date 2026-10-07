import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import AddSubscriptionScreen from '@/app/add-subscription';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Adding and editing a subscription in Spanish and French, page by page: the amount page, the final
 * page and every page a line opens. The words, the dates, the times of day and the service's category
 * follow the language; what is saved (cycle, amount, category id, renewal) does not.
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
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useReminderChoice: () => mockSavedReminder,
  useApplyReminder: () => async () => {},
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
jest.mock('@/api/mutations', () => ({
  useCreateSubscription: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSubscription: () => ({ mutateAsync: jest.fn(), isPending: false }),
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

const NBSP = '\u00a0';

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

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));

async function typeAmount(screen: Screen, digits: string, decimal: string) {
  for (const key of digits) await press(screen, key === '.' ? decimal : key);
}

const isChecked = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.checked);

/** Types into the service field the way a finger does: a tap into it, then the letters. */
async function searchService(screen: Screen, placeholder: string, text: string) {
  const input = screen.getByPlaceholderText(placeholder);
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
}

/** The words a new yearly Netflix is walked through in, per language. */
const WORDS: Record<
  Language,
  {
    decimal: string;
    continue: string;
    search: string;
    done: string;
    renewal: string;
    day: string;
    yearly: string;
    save: string;
  }
> = {
  en: {
    decimal: 'Decimal point',
    continue: 'Continue',
    search: 'Search for a service',
    done: 'Done',
    renewal: 'Next renewal, not set, optional',
    day: 'Monday 12 October 2026',
    yearly: 'Yearly',
    save: 'Save subscription',
  },
  es: {
    decimal: 'Punto decimal',
    continue: 'Continuar',
    search: 'Busca un servicio',
    done: 'Listo',
    renewal: 'Próxima renovación, sin definir, opcional',
    day: 'lunes 12 de octubre de 2026',
    yearly: 'Anual',
    save: 'Guardar suscripción',
  },
  fr: {
    decimal: 'Virgule décimale',
    continue: 'Continuer',
    search: 'Cherche un service',
    done: 'Terminé',
    renewal: 'Prochain renouvellement, non défini, facultatif',
    day: 'lundi 12 octobre 2026',
    yearly: 'Chaque année',
    save: 'Enregistrer l’abonnement',
  },
};

/** A new yearly Netflix at 1,234.56, every page pressed by the words of `language`. */
async function addNetflix(language: Language) {
  const words = WORDS[language];
  setLanguage(language);
  const screen = await render(<AddSubscriptionScreen />);

  await typeAmount(screen, '1234.56', words.decimal);
  await press(screen, words.continue);

  await searchService(screen, words.search, 'Net');
  await fireEvent.press(await screen.findByLabelText('Netflix'));

  await press(screen, words.renewal);
  await press(screen, words.day);
  await press(screen, words.done);

  await press(screen, words.yearly);
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

  it('reads the final page in Spanish: every line, the cycle chips and the reassurance', async () => {
    setLanguage('es');
    const screen = await render(<AddSubscriptionScreen />);

    await typeAmount(screen, '15.99', 'Punto decimal');
    await press(screen, 'Continuar');

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
    expect(screen.getByLabelText('Próxima renovación, sin definir, opcional')).toBeTruthy();
    // The renewal and the card both have nothing yet.
    expect(screen.getAllByText('Sin definir')).toHaveLength(2);
    expect(screen.getByLabelText('Se cobra a, sin definir, opcional')).toBeTruthy();
    expect(screen.getByLabelText('Recordatorio, sin definir, opcional')).toBeTruthy();
    expect(screen.getByText('Desactivado')).toBeTruthy();
    expect(screen.getByLabelText('Nota, sin definir, opcional')).toBeTruthy();
    expect(screen.getByText('Agregar una nota')).toBeTruthy();
    expect(screen.getByText('Puedes editarlo más tarde.')).toBeTruthy();
    expect(screen.getByLabelText('Guardar suscripción')).toBeDisabled();
    expectNoRawText(screen.toJSON());
  });

  it('reads the service box in Spanish, the category included', async () => {
    setLanguage('es');
    const screen = await render(<AddSubscriptionScreen />);
    await typeAmount(screen, '15.99', 'Punto decimal');
    await press(screen, 'Continuar');

    expect(screen.getByPlaceholderText('Busca un servicio')).toBeTruthy();
    expect(screen.queryByText(/^Archivada en/)).toBeNull();
    expectNoRawText(screen.toJSON());

    await searchService(screen, 'Busca un servicio', 'Net');
    await fireEvent.press(await screen.findByLabelText('Netflix'));
    expect(screen.getByText('Archivada en Entretenimiento')).toBeTruthy();
    expect(screen.getByLabelText('Cambiar servicio, ahora es Netflix')).toBeTruthy();
    expect(screen.getByLabelText('Guardar suscripción')).toBeEnabled();
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
    setLanguage('es');
    const screen = await render(<AddSubscriptionScreen />);
    await typeAmount(screen, '15.99', 'Punto decimal');
    await press(screen, 'Continuar');

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
    const sure = await render(<AddSubscriptionScreen />);
    await typeAmount(sure, '15.99', 'Punto decimal');
    await press(sure, 'Continuar');
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

  it('reads the renewal line and page in Spanish, the dates in Spanish order', async () => {
    setLanguage('es');
    const screen = await render(<AddSubscriptionScreen />);
    await typeAmount(screen, '15.99', 'Punto decimal');
    await press(screen, 'Continuar');

    await press(screen, 'Próxima renovación, sin definir, opcional');
    expect(screen.getByText('¿Cuándo se renueva?')).toBeTruthy();
    expect(screen.getByLabelText('Sin fecha de renovación')).toBeTruthy();
    expect(screen.getByLabelText('Mes siguiente')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await press(screen, 'Mes siguiente');
    await press(screen, 'viernes 6 de noviembre de 2026');
    await press(screen, 'Listo');
    expect(screen.getByLabelText('Próxima renovación, vie 6 nov')).toBeTruthy();

    await press(screen, 'Próxima renovación, vie 6 nov');
    await press(screen, 'Mes anterior');
    await press(screen, 'Hoy, miércoles 7 de octubre de 2026');
    await press(screen, 'Listo');
    expect(screen.getByLabelText('Próxima renovación, Hoy, mié 7 oct')).toBeTruthy();

    await press(screen, 'Próxima renovación, Hoy, mié 7 oct');
    await press(screen, 'martes 6 de octubre de 2026');
    await press(screen, 'Listo');
    expect(screen.getByLabelText('Próxima renovación, Ayer, mar 6 oct')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads the reminder line and page in Spanish, with the time as Spanish writes it', async () => {
    setLanguage('es');
    const screen = await render(<AddSubscriptionScreen />);
    await typeAmount(screen, '15.99', 'Punto decimal');
    await press(screen, 'Continuar');

    await press(screen, 'Recordatorio, sin definir, opcional');
    expect(screen.getByText('Antes de que se renueve')).toBeTruthy();
    for (const chip of ['Desactivado', 'El mismo día', '1 día', '3 días', '1 semana']) {
      expect(screen.getByLabelText(chip).props.accessibilityRole).toBe('radio');
    }
    await press(screen, '3 días');
    expect(screen.getByLabelText('Hora de envío: 9:00 a. m., cambiar la hora')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Listo');
    expect(screen.getByLabelText('Recordatorio, 3 días antes · 9:00 a. m.')).toBeTruthy();

    await press(screen, 'Recordatorio, 3 días antes · 9:00 a. m.');
    await press(screen, 'El mismo día');
    await press(screen, 'Listo');
    expect(screen.getByLabelText('Recordatorio, El mismo día · 9:00 a. m.')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads the card and note pages in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<AddSubscriptionScreen />);
    await typeAmount(screen, '15.99', 'Punto decimal');
    await press(screen, 'Continuar');

    await press(screen, 'Se cobra a, sin definir, opcional');
    expect(screen.getByText('¿Con qué pagaste?')).toBeTruthy();
    await press(screen, 'VISA ••4421');
    expect(screen.getByLabelText('Sin tarjeta ni cuenta')).toBeTruthy();
    await press(screen, 'Listo');
    expect(screen.getByLabelText('Se cobra a, VISA ••4421')).toBeTruthy();

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

  it('refuses a save in Spanish, the service first and then the amount', async () => {
    setLanguage('es');
    mockParams = { from: 'voice', prefillAmount: '15.99' };
    const screen = await render(<AddSubscriptionScreen />);
    expect(screen.getByLabelText('Guardar suscripción')).toBeDisabled();

    await press(screen, 'Guardar suscripción');
    expect(screen.getByText('Primero elige un servicio.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Busca un servicio')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await screen.unmount();

    mockParams = { from: 'voice', prefillName: 'Netflix' };
    const missingAmount = await render(<AddSubscriptionScreen />);
    await press(missingAmount, 'Guardar suscripción');
    expect(missingAmount.getByText('Ingresa cuánto cuesta.')).toBeTruthy();
    expect(missingAmount.getByText('Toca para agregar el importe')).toBeTruthy();
    expect(missingAmount.getByLabelText('Importe, obligatorio')).toBeTruthy();
    expectNoRawText(missingAmount.toJSON());
    expect(mockCreate).not.toHaveBeenCalled();
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
    expect(screen.getByLabelText('Prochain renouvellement, lun. 12 oct.')).toBeTruthy();
    expect(screen.getByLabelText('Prélevé sur, non défini, facultatif')).toBeTruthy();
    expect(screen.getByLabelText('Rappel, non défini, facultatif')).toBeTruthy();
    expect(screen.getByText('Désactivé')).toBeTruthy();
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

  it('lets go of the service in French and offers the search box again', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Changer de service, actuellement Netflix');

    expect(screen.getByPlaceholderText('Cherche un service')).toBeTruthy();
    expect(screen.queryByText(/^Classé dans/)).toBeNull();
    expect(screen.getByLabelText('Enregistrer les modifications')).toBeDisabled();
    expectNoRawText(screen.toJSON());
  });

  it('reads the renewal page in French', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Prochain renouvellement, lun. 12 oct.');
    expect(screen.getByText('Quand se renouvelle-t-il ?')).toBeTruthy();
    expect(screen.getByLabelText('Aucune date de renouvellement')).toBeTruthy();
    expect(screen.getByLabelText('lundi 12 octobre 2026')).toBeTruthy();
    expectNoRawText(screen.toJSON());
    await press(screen, 'Aucune date de renouvellement');
    expect(screen.getByLabelText('Prochain renouvellement, non défini, facultatif')).toBeTruthy();
  });

  it('reads the saved reminder in French, the time as Canada writes it', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByLabelText(`Rappel, 3 jours avant · 8${NBSP}h${NBSP}30`)).toBeTruthy();

    await press(screen, `Rappel, 3 jours avant · 8${NBSP}h${NBSP}30`);
    for (const chip of ['Désactivé', 'Le jour même', '1 jour', '3 jours', '1 semaine']) {
      expect(screen.getByLabelText(chip).props.accessibilityRole).toBe('radio');
    }
    expect(isChecked(screen, '3 jours')).toBe(true);
    expect(screen.getByLabelText(`Envoyé à 8${NBSP}h${NBSP}30. Changer l’heure.`)).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});

describe('Add a subscription in French', () => {
  it('refuses a save in French, the service first and then the amount', async () => {
    setLanguage('fr');
    mockParams = { from: 'voice', prefillAmount: '15.99' };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Enregistrer l’abonnement');
    expect(screen.getByText('Choisis d’abord un service.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Cherche un service')).toBeTruthy();
    await screen.unmount();

    mockParams = { from: 'voice', prefillName: 'Netflix' };
    const missingAmount = await render(<AddSubscriptionScreen />);
    await press(missingAmount, 'Enregistrer l’abonnement');
    expect(missingAmount.getByText('Indique ce que ça coûte.')).toBeTruthy();
    expect(missingAmount.getByText('Touche pour ajouter le montant')).toBeTruthy();
    expect(missingAmount.getByLabelText('Montant, requis')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('What a subscription saves', () => {
  it('is the same in every language', async () => {
    const english = await addNetflix('en');
    mockCreate.mockClear();
    const spanish = await addNetflix('es');
    mockCreate.mockClear();
    const french = await addNetflix('fr');

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
});
