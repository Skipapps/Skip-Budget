import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import HabitNewScreen from '@/app/habit-new';
import type { HabitRow } from '@/api/habits';
import type { DialogRequest } from '@/components/ui/confirm-dialog';
import { t } from '@/i18n';
import type { Language } from '@/i18n/config';
import { MESSAGES } from '@/i18n/messages';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';

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
// The shared past-choice dialog resolves the id of the action the test chooses, or null to back out.
const mockAsk = jest.fn<Promise<string | null>, [DialogRequest]>();
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => async () => true,
  useDialog: () => mockAsk,
}));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));

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
    sources: [
      { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
      { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
    ],
  }),
}));
// Every card and account: card-2 is a free account's locked extra, which usePaymentSources leaves out.
jest.mock('@/api/payment-labels', () => {
  const sources = [
    { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
    { id: 'card-2', label: 'Amex ••3005', color: '#333333', kind: 'card' },
    { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
  ];
  return {
    usePaymentLabels: () => ({
      sources,
      labelOf: (id: string) => sources.find((source) => source.id === id)?.label ?? null,
      isLoading: false,
    }),
  };
});
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockArchive = jest.fn();
const mockUpdateAndDays = jest.fn();
const mockDeleteAll = jest.fn();
const mockRetry = jest.fn();
// The days read as the page awaits it: the count, or the read's failure while they are unread.
const mockLoadDays = jest.fn();
let mockPastDays: { count: number | null; ready: boolean } = { count: 0, ready: true };
let mockHabit: { data: HabitRow | null | undefined; isError: boolean; isFetched: boolean } = {
  data: undefined,
  isError: false,
  isFetched: false,
};
jest.mock('@/api/habits', () => ({
  ...jest.requireActual('@/api/habits'),
  useHabits: () => ({ data: [] }),
  useHabit: () => ({ ...mockHabit, refetch: jest.fn() }),
  useHabitTaps: () => ({ data: [] }),
  useHabitPastDays: () => ({ ...mockPastDays, retry: mockRetry, load: mockLoadDays }),
  useCreateHabit: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateHabit: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useUpdateHabitAndDays: () => ({ mutateAsync: mockUpdateAndDays, isPending: false }),
  useArchiveHabit: () => ({ mutateAsync: mockArchive, isPending: false }),
  useDeleteHabitAndDays: () => ({ mutateAsync: mockDeleteAll, isPending: false }),
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

const SAVED_HABIT: HabitRow = {
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
};

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockParams = {};
  mockHabit = { data: undefined, isError: false, isFetched: false };
  mockPastDays = { count: 0, ready: true };
  mockLoadDays.mockImplementation(async () => {
    if (mockPastDays.count === null) throw new Error('read failed');
    return mockPastDays.count;
  });
  mockCreate.mockResolvedValue({ id: 'habit-new' });
  mockUpdate.mockResolvedValue({ id: 'habit-1' });
  mockArchive.mockResolvedValue({ id: 'habit-1' });
  mockUpdateAndDays.mockResolvedValue(SAVED_HABIT);
  mockDeleteAll.mockResolvedValue({ habitId: 'habit-1' });
  mockAsk.mockReset();
  mockAsk.mockResolvedValue(null);
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
    mockHabit = { data: SAVED_HABIT, isError: false, isFetched: true };
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

  it('shows a card the free plan has locked chosen on an edit, and Save keeps it', async () => {
    setLanguage(language);
    mockParams = { id: 'habit-1' };
    mockHabit = { data: { ...SAVED_HABIT, card_id: 'card-2' }, isError: false, isFetched: true };
    const screen = await render(<HabitNewScreen />);

    expect(
      screen.getByRole('radio', { name: 'Amex ••3005' }).props.accessibilityState,
    ).toMatchObject({ checked: true });
    await fireEvent.press(
      screen.getByRole('button', {
        name: language === 'es' ? 'Guardar cambios' : 'Enregistrer les modifications',
      }),
    );

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      card_id: 'card-2',
      bank_account_id: null,
    });
  });
});

const EDIT_WORDS = {
  es: { save: 'Guardar cambios', delete: 'Eliminar hábito' },
  fr: { save: 'Enregistrer les modifications', delete: 'Supprimer l’habitude' },
} as const;

/** What `read` says in English, whatever language the page is on. */
function inEnglish<T>(language: Language, read: () => T): T {
  setLanguage('en');
  const english = read();
  setLanguage(language);
  return english;
}

/** No raw key and no unfilled {param} in anything the dialog was asked to say. */
function expectWholeSentences(request: DialogRequest) {
  const spoken = JSON.stringify(request);
  expect(spoken).not.toMatch(/\{\w+\}/);
  expect(spoken).not.toMatch(/ui\.past\./);
}

describe.each(['es', 'fr'] as const)(
  'Editing and deleting a habit that has days, in %s',
  (language) => {
    const words = EDIT_WORDS[language];
    const editing = (count: number | null = 3) => {
      setLanguage(language);
      mockParams = { id: 'habit-1' };
      mockHabit = { data: SAVED_HABIT, isError: false, isFetched: true };
      mockPastDays = count === null ? { count: null, ready: false } : { count, ready: true };
    };

    it('asks which days an edit reaches in the language, then saves the habit and its days in one call', async () => {
      const english = inEnglish(language, () => ({
        title: t('ui.past.change.title.days'),
        message: t('ui.past.change.body.days', { name: 'Café', count: 3 }),
        all: t('ui.past.change.all'),
        upcoming: t('ui.past.change.upcoming'),
        cancel: t('common.cancel'),
      }));
      editing(3);
      mockAsk.mockResolvedValue('all');
      const screen = await render(<HabitNewScreen />);
      await fireEvent.press(screen.getByRole('radio', { name: 'Checking ••0099' }));
      await fireEvent.press(screen.getByRole('button', { name: words.save }));

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(mockAsk).toHaveBeenCalledTimes(1);
      const request = mockAsk.mock.calls[0][0];
      expect(request.title).toBe(t('ui.past.change.title.days'));
      expect(request.title).not.toBe(english.title);
      expect(request.message).toBe(t('ui.past.change.body.days', { name: 'Café', count: 3 }));
      expect(request.message).not.toBe(english.message);
      expect(request.actions?.map((action) => action.id)).toEqual(['all', 'upcoming']);
      expect(request.actions?.map((action) => action.label)).toEqual([
        t('ui.past.change.all'),
        t('ui.past.change.upcoming'),
      ]);
      expect(request.actions?.[0].label).not.toBe(english.all);
      expect(request.actions?.[1].label).not.toBe(english.upcoming);
      expect(request.cancelLabel).toBe(t('common.cancel'));
      expect(request.cancelLabel).not.toBe(english.cancel);
      expectWholeSentences(request);

      expect(mockUpdateAndDays).toHaveBeenCalledWith({
        id: 'habit-1',
        values: {
          name: 'Café',
          icon_id: 'food-dining/coffee',
          color: 'caramel',
          price: 5,
          card_id: null,
          bank_account_id: 'acct-1',
        },
      });
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('toast.habit.updated');
    });

    it('reads one day in the singular', async () => {
      editing(1);
      mockAsk.mockResolvedValue('upcoming');
      const screen = await render(<HabitNewScreen />);
      await fireEvent.press(screen.getByRole('radio', { name: 'Checking ••0099' }));
      await fireEvent.press(screen.getByRole('button', { name: words.save }));

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      const { message } = mockAsk.mock.calls[0][0];
      expect(message).toBe(t('ui.past.change.body.days', { name: 'Café', count: 1 }));
      expect(message).not.toBe(t('ui.past.change.body.days', { name: 'Café', count: 3 }));
      expect(mockUpdateAndDays).not.toHaveBeenCalled();
    });

    it('says the one failure line in the language when the days cannot be read, and writes nothing', async () => {
      editing(null);
      const log = jest.spyOn(console, 'log').mockImplementation(() => {});
      const screen = await render(<HabitNewScreen />);
      await fireEvent.press(screen.getByRole('radio', { name: 'Checking ••0099' }));
      await fireEvent.press(screen.getByRole('button', { name: words.save }));

      expect(await screen.findByText(t('common.failure'))).toBeTruthy();
      expect(t('common.failure')).not.toBe(FAILURE_MESSAGE);
      log.mockRestore();
      expect(mockAsk).not.toHaveBeenCalled();
      expect(mockUpdateAndDays).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
      expectNoKeys(screen);
    });

    it('asks whether to keep the days on a delete in the language, and stops the habit on Keep', async () => {
      const english = inEnglish(language, () => ({
        title: t('ui.past.delete.title', { name: 'Café' }),
        message: t('ui.past.delete.body.days', { name: 'Café', count: 3 }),
        keep: t('ui.past.delete.keep.days'),
        everything: t('ui.past.delete.everything'),
      }));
      editing(3);
      mockAsk.mockResolvedValue('keep');
      const screen = await render(<HabitNewScreen />);
      await fireEvent.press(screen.getByRole('button', { name: words.delete }));

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      const request = mockAsk.mock.calls[0][0];
      expect(request.title).toBe(t('ui.past.delete.title', { name: 'Café' }));
      expect(request.title).not.toBe(english.title);
      expect(request.message).toBe(t('ui.past.delete.body.days', { name: 'Café', count: 3 }));
      expect(request.message).not.toBe(english.message);
      expect(request.actions).toEqual([
        { id: 'keep', label: t('ui.past.delete.keep.days') },
        { id: 'everything', label: t('ui.past.delete.everything'), destructive: true },
      ]);
      expect(request.actions?.[0].label).not.toBe(english.keep);
      expect(request.actions?.[1].label).not.toBe(english.everything);
      expect(request.cancelLabel).toBe(t('common.cancel'));
      expectWholeSentences(request);

      expect(mockArchive).toHaveBeenCalledWith('habit-1');
      expect(mockDeleteAll).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith('toast.habit.stopped');
    });

    it('asks a plain Delete with no day logged, in the language, and removes it for good', async () => {
      const english = inEnglish(language, () => t('ui.past.delete.none'));
      editing(0);
      mockAsk.mockResolvedValue('everything');
      const screen = await render(<HabitNewScreen />);
      await fireEvent.press(screen.getByRole('button', { name: words.delete }));

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      const request = mockAsk.mock.calls[0][0];
      expect(request.title).toBe(t('ui.past.delete.title', { name: 'Café' }));
      expect(request.message).toBe(t('ui.past.delete.none'));
      expect(request.message).not.toBe(english);
      expect(request.actions).toEqual([
        { id: 'everything', label: t('common.delete'), destructive: true },
      ]);
      expectWholeSentences(request);
      expect(mockDeleteAll).toHaveBeenCalledWith('habit-1');
      expect(mockToast).toHaveBeenCalledWith('toast.habit.deleted', 'deleted');
    });

    it('says the one failure line in the language when the delete fails', async () => {
      editing(3);
      mockAsk.mockResolvedValue('everything');
      mockDeleteAll.mockRejectedValue(new Error('network down'));
      const screen = await render(<HabitNewScreen />);
      await fireEvent.press(screen.getByRole('button', { name: words.delete }));

      expect(await screen.findByText(t('common.failure'))).toBeTruthy();
      expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
      expect(mockToast).not.toHaveBeenCalled();
      expect(router.back).not.toHaveBeenCalled();
      expectNoKeys(screen);
    });
  },
);

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
