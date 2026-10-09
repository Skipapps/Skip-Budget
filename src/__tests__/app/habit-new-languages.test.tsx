import { fireEvent, render } from '@testing-library/react-native';

import HabitNewScreen from '@/app/habit-new';
import type { HabitRow } from '@/api/habits';
import type { Language } from '@/i18n/config';
import { MESSAGES } from '@/i18n/messages';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/**
 * Starting and editing a habit in Spanish and French: every line on every page is translated, no
 * raw key or {param} reaches the screen, French keeps its no-break spaces, and the meal words match
 * the icon names (Canada: déjeuner, dîner, souper). The habit's name is copied in the language on
 * screen when it is created.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: { View }, FadeIn: { duration: () => ({}) } };
});
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/data/habit-icon-art', () => ({
  HABIT_ICON_ART: new Proxy({}, { get: () => () => null }),
}));
const mockColors = new Proxy({}, { get: () => '#000000' });
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => mockColors,
  useTheme: () => ({ scheme: 'light', colors: mockColors }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => async () => true,
  useDialog: () => async () => undefined,
}));
jest.mock('@/providers/toast-context', () => ({ useToast: () => jest.fn() }));

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/api/queries', () => ({
  usePaymentSources: () => ({
    sources: [{ id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' }],
  }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
const mockCreate = jest.fn();
let mockHabit: { data: HabitRow | undefined; isError: boolean; isFetched: boolean } = {
  data: undefined,
  isError: false,
  isFetched: false,
};
jest.mock('@/api/habits', () => ({
  ...jest.requireActual('@/api/habits'),
  useHabits: () => ({ data: [] }),
  useHabit: () => ({ ...mockHabit, refetch: jest.fn() }),
  useHabitTaps: () => ({ data: [] }),
  useCreateHabit: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateHabit: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useArchiveHabit: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

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
jest.setSystemTime(new Date('2026-10-08T09:00:00'));

type Screen = Awaited<ReturnType<typeof render>>;

const NBSP = ' ';

type Json = ReturnType<Screen['toJSON']>;

/** Every string drawn or read out, so a raw key or an unfilled {param} cannot hide anywhere. */
function wordsOn(screen: Screen): string[] {
  const found: string[] = [];
  const walk = (node: Json | string | Json[]) => {
    if (node === null) return;
    if (typeof node === 'string') return void found.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    for (const prop of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      const value = node.props[prop];
      if (typeof value === 'string') found.push(value);
    }
    node.children?.forEach(walk);
  };
  walk(screen.toJSON());
  return found;
}

function expectNoKeys(screen: Screen) {
  const words = wordsOn(screen);
  expect(words.length).toBeGreaterThan(0);
  expect(words.filter((word) => /^[a-z]+[A-Z]?[a-zA-Z]*\.[a-zA-Z]+\./.test(word))).toEqual([]);
  expect(words.filter((word) => /\{\w+\}/.test(word))).toEqual([]);
}

type Walk = {
  pick: string;
  tile: string;
  more: string;
  own: string;
  price: string;
  helper: string;
  continue: string;
  ready: string;
  preview: string;
  start: string;
  editLater: string;
  today: string;
  paidWith: string;
  missing: string;
  savedName: string;
};

const WALK: Record<Exclude<Language, 'en'>, Walk> = {
  es: {
    pick: '¿Qué quieres registrar?',
    tile: 'Desayunar fuera, Antojos de la mañana, $10.00 cada vez',
    more: 'Más',
    own: 'Crear el mío',
    price: '¿Cuánto cuesta cada vez?',
    helper: 'Cada día que tocas registra este importe.',
    continue: 'Continuar',
    ready: 'Listo para registrar',
    preview: 'Vista previa',
    start: 'Empezar a registrar',
    editLater: 'Puedes editarlo más tarde.',
    today: 'Hoy',
    paidWith: 'Pagado con',
    missing: 'Para empezar a registrar, completa: Pagado con.',
    savedName: 'Desayunar fuera',
  },
  fr: {
    pick: `Que veux-tu suivre${NBSP}?`,
    tile: 'Déjeuner au resto, Gâteries du matin, 10,00 $ chaque fois',
    more: 'Plus',
    own: 'Autre chose',
    price: `Combien ça coûte chaque fois${NBSP}?`,
    helper: 'Chaque jour touché enregistre ce montant.',
    continue: 'Continuer',
    ready: 'Prêt à suivre',
    preview: 'Aperçu',
    start: 'Commencer le suivi',
    editLater: 'Tu pourras le modifier plus tard.',
    today: 'Aujourd’hui',
    paidWith: 'Payé avec',
    missing: `Pour commencer le suivi, remplis${NBSP}: Payé avec.`,
    savedName: 'Déjeuner au resto',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockParams = {};
  mockHabit = { data: undefined, isError: false, isFetched: false };
  mockCreate.mockResolvedValue({ id: 'habit-new' });
});
afterAll(() => resetLocaleForTests());

describe.each(['es', 'fr'] as const)('New habit in %s', (language) => {
  const words = WALK[language];

  it('says every page in the language, copies the name in it, and leaves no key behind', async () => {
    setLanguage(language);
    // Words follow the language; amounts follow the currency, which stays dollars here.
    setCurrency('USD');
    const screen = await render(<HabitNewScreen />);

    expect(screen.getByText(words.pick)).toBeTruthy();
    expect(screen.getByRole('button', { name: words.more })).toBeTruthy();
    expect(screen.getByRole('button', { name: words.own })).toBeTruthy();
    expectNoKeys(screen);

    await fireEvent.press(screen.getByLabelText(words.tile));
    expect(await screen.findByText(words.price)).toBeTruthy();
    expect(screen.getByText(words.helper)).toBeTruthy();
    expectNoKeys(screen);

    await fireEvent.press(screen.getByRole('button', { name: words.continue }));
    expect(screen.getByText(words.ready)).toBeTruthy();
    expect(screen.getByText(words.preview)).toBeTruthy();
    expect(screen.getByText(words.editLater)).toBeTruthy();
    expect(screen.getByText(words.today)).toBeTruthy();
    expect(screen.getByText(words.paidWith)).toBeTruthy();
    expectNoKeys(screen);

    await fireEvent.press(screen.getByRole('button', { name: words.start }));
    expect(screen.getByText(words.missing)).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'VISA ••4421' }));
    await fireEvent.press(screen.getByRole('button', { name: words.start }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: words.savedName, price: 10, preset_id: 'breakfast' }),
    );
  });

  it('names Add my own’s pages and the icons in the language', async () => {
    setLanguage(language);
    const screen = await render(<HabitNewScreen />);
    await fireEvent.press(screen.getByRole('button', { name: words.own }));

    expect(
      screen.getByText(
        language === 'es' ? '¿Cómo quieres llamarlo?' : `Comment veux-tu l’appeler${NBSP}?`,
      ),
    ).toBeTruthy();
    expect(
      screen.getByPlaceholderText(
        language === 'es' ? 'p. ej., Té de burbujas' : 'p. ex. Thé aux perles',
      ),
    ).toBeTruthy();
    await fireEvent.changeText(
      screen.getByPlaceholderText(
        language === 'es' ? 'p. ej., Té de burbujas' : 'p. ex. Thé aux perles',
      ),
      'Boba',
    );
    await fireEvent.press(screen.getByRole('button', { name: words.continue }));

    expect(
      screen.getByText(language === 'es' ? 'Elige un ícono' : 'Choisis une icône'),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: language === 'es' ? 'Cenar fuera' : 'Souper au resto' }),
    ).toBeTruthy();
    expectNoKeys(screen);
  });

  it('edits in the language: its title, the day it began, Save changes and Delete', async () => {
    setLanguage(language);
    mockParams = { id: 'habit-1' };
    mockHabit = {
      data: {
        id: 'habit-1',
        name: 'Café',
        icon_id: 'food-dining/coffee',
        color: 'caramel',
        price: 5,
        category_id: 'dining',
        card_id: 'card-1',
        bank_account_id: null,
        preset_id: 'coffee',
        started_on: '2026-09-28',
        saved_from: '2026-09-30',
        sort_order: 0,
        archived_at: null,
        created_at: '2026-09-30T10:00:00Z',
      },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<HabitNewScreen />);

    expect(
      screen.getByText(language === 'es' ? 'Editar hábito' : 'Modifier l’habitude'),
    ).toBeTruthy();
    expect(screen.getByText(language === 'es' ? 'Inicio' : 'Début')).toBeTruthy();
    // The day it was made, in the language's own short date.
    expect(screen.getByText(/^30 \S+ 2026$/)).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: language === 'es' ? 'Guardar cambios' : 'Enregistrer les modifications',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: language === 'es' ? 'Eliminar hábito' : 'Supprimer l’habitude',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: language === 'es' ? 'Caramelo' : 'Caramel' }),
    ).toBeTruthy();
    expectNoKeys(screen);
  });
});

describe('the French and Spanish lines', () => {
  it('keep French no-break spaces before ? and :, and never a plain one', () => {
    const french = Object.entries(MESSAGES)
      .filter(([key]) => key.startsWith('habitFlow.'))
      .map(([, message]) => message.fr)
      .flatMap((text) => (typeof text === 'string' ? [text] : [text.one, text.other]));
    expect(french.length).toBeGreaterThan(0);
    for (const line of french) expect(line).not.toMatch(/ [?:!;]/);
    expect(french.some((line) => line.includes(`${NBSP}?`))).toBe(true);
  });
});
