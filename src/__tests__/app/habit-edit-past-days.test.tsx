import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import HabitNewScreen from '@/app/habit-new';
import type { HabitRow } from '@/api/habits';
import type { DialogRequest } from '@/components/ui/confirm-dialog';
import { habitIcon } from '@/data/habit-icons';
import { t } from '@/i18n';
import { resetLocaleForTests } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { success, warn } from '@/lib/haptics';

/**
 * Editing or deleting a habit that has logged days asks about them with the shared past-choice
 * dialog. The real page and the real `usePastChoice` run; only the network hooks, the drawings and
 * the dialog's answer are replaced. The shared wording is read through t() so a tweak to it does not
 * break these; only the habit's own words are written out.
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

const mockConfirm = jest.fn();
const mockAsk = jest.fn<Promise<string | null | undefined>, [DialogRequest]>();
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
  useDialog: () => mockAsk,
}));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(effect, [effect]);
  },
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
jest.mock('@/api/payment-labels', () => ({
  usePaymentLabels: () => ({ sources: [], labelOf: () => null, isLoading: false }),
}));

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
const mockUpdate = jest.fn();
const mockArchive = jest.fn();
const mockUpdateAndDays = jest.fn();
const mockDeleteAll = jest.fn();
const mockRetry = jest.fn();
// The days read as the page awaits it: the count, or the read's failure while they are unread.
const mockLoadDays = jest.fn();
let mockPastDays: { count: number | null; ready: boolean };
let mockHabit: { data: HabitRow | null | undefined; isError: boolean; isFetched: boolean };
// The real helpers (`habitCarriedChanged`, `habitCarriedValues`, `refusedHabitGone`) run; only the
// hooks that reach the network are replaced. A fake mutation is pending for as long as its call is
// out, as TanStack's is, so the page's guards against a second tap are the real ones.
jest.mock('@/api/habits', () => {
  const React = jest.requireActual('react');
  const useFakeMutation = (call: () => (...args: unknown[]) => Promise<unknown>) => {
    const [isPending, setPending] = React.useState(false);
    return {
      isPending,
      mutateAsync: async (...args: unknown[]) => {
        setPending(true);
        try {
          return await call()(...args);
        } finally {
          setPending(false);
        }
      },
    };
  };
  return {
    ...jest.requireActual('@/api/habits'),
    useHabits: () => ({ data: [] }),
    useHabit: () => ({ ...mockHabit, refetch: jest.fn() }),
    useHabitTaps: () => ({ data: [] }),
    useHabitPastDays: () => ({ ...mockPastDays, retry: mockRetry, load: mockLoadDays }),
    useCreateHabit: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useUpdateHabit: () => useFakeMutation(() => mockUpdate),
    useUpdateHabitAndDays: () => useFakeMutation(() => mockUpdateAndDays),
    useArchiveHabit: () => useFakeMutation(() => mockArchive),
    useDeleteHabitAndDays: () => useFakeMutation(() => mockDeleteAll),
  };
});

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

const habitRow = (overrides: Partial<HabitRow> = {}): HabitRow => ({
  id: 'habit-1',
  name: 'Coffee',
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
  ...overrides,
});

/** What Save writes when nothing on the page has been touched. */
const SAVED = {
  name: 'Coffee',
  icon_id: 'food-dining/coffee',
  color: 'caramel',
  price: 5,
  card_id: 'card-1',
  bank_account_id: null,
};

type Screen = Awaited<ReturnType<typeof render>>;

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));
const pressButton = (screen: Screen, name: string) =>
  fireEvent.press(screen.getByRole('button', { name }));

const PICK_QUESTION = 'What do you want to track?';

/** Past a macrotask, so every awaited step of a handler has run before a "never happened" check. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function typeAmount(screen: Screen, digits: string) {
  for (const key of digits) await press(screen, key === '.' ? 'Decimal point' : key);
}

async function clearAmount(screen: Screen, keys = 6) {
  for (let i = 0; i < keys; i += 1) await press(screen, 'Delete last digit');
}

/** The Habit line's own page: rename, Done. */
async function changeName(screen: Screen, name: string, from = 'Coffee') {
  await pressButton(screen, `Habit, ${from}`);
  await fireEvent.changeText(screen.getByDisplayValue(from), name);
  await pressButton(screen, 'Done');
}

/** The Price line's own page, on one of the preset's chips. */
async function changePrice(screen: Screen, chip: string, from = '$5.00') {
  await pressButton(screen, `Price, ${from} each time`);
  await press(screen, chip);
  await pressButton(screen, 'Done');
}

/** The Habit line's own page: its Icon line opens the picker, then Done. */
async function changeIcon(screen: Screen, icon: string, from = 'Coffee', habit = 'Coffee') {
  await pressButton(screen, `Habit, ${habit}`);
  await pressButton(screen, `Icon, ${from}`);
  await press(screen, icon);
  await pressButton(screen, 'Done');
}

/**
 * One change to a field the days copy, and what Save writes for it. With Past and upcoming the
 * server gives the days what it saves on the habit, so the page sends the same values either way.
 */
type Change = {
  apply: (screen: Screen) => Promise<void>;
  /** The name the question reads: the one typed, trimmed. */
  asks: string;
  values: Record<string, unknown>;
};

const CHANGES: Record<string, Change> = {
  name: {
    apply: (screen) => changeName(screen, '  Latte '),
    asks: 'Latte',
    values: { ...SAVED, name: 'Latte' },
  },
  price: {
    apply: (screen) => changePrice(screen, '$7'),
    asks: 'Coffee',
    values: { ...SAVED, price: 7 },
  },
  'paid with another account': {
    apply: async (screen) => void (await press(screen, 'Checking ••0099')),
    asks: 'Coffee',
    values: { ...SAVED, card_id: null, bank_account_id: 'acct-1' },
  },
  'paid with Skip': {
    apply: async (screen) => void (await press(screen, 'Skip')),
    asks: 'Coffee',
    values: { ...SAVED, card_id: null, bank_account_id: null },
  },
  'category, through the icon': {
    apply: (screen) => changeIcon(screen, 'Groceries'),
    asks: 'Coffee',
    values: { ...SAVED, icon_id: 'food-dining/groceries', category_id: 'groceries' },
  },
};
const CHANGE_CASES = Object.entries(CHANGES);

/** The order things happened in, across the hooks, the toast and leaving. */
const order: string[] = [];

/** The next call to `mock` is recorded in `order`, then fails. */
const failsOnce = (mock: jest.Mock, step: string, thrown: unknown = new Error('network down')) =>
  mock.mockImplementationOnce(async () => {
    order.push(step);
    throw thrown;
  });

const lastAsk = (): DialogRequest => mockAsk.mock.calls[mockAsk.mock.calls.length - 1][0];
const actionIds = (request: DialogRequest) => (request.actions ?? []).map((action) => action.id);
const actionLabels = (request: DialogRequest) =>
  (request.actions ?? []).map((action) => action.label);

function editing(overrides: Partial<HabitRow> = {}) {
  mockParams = { id: 'habit-1' };
  mockHabit = { data: habitRow(overrides), isError: false, isFetched: true };
}
const withDays = (count: number) => {
  mockPastDays = { count, ready: true };
};
const daysUnread = () => {
  mockPastDays = { count: null, ready: false };
};
/** The read, held until the test lets it answer with `count`. */
const daysArriveLater = () => {
  daysUnread();
  let arrive: (count: number) => void = () => {};
  mockLoadDays.mockImplementationOnce(() => new Promise<number>((resolve) => (arrive = resolve)));
  return (count: number) => act(async () => arrive(count));
};
const READ_FAILED = new Error('read failed');

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  order.length = 0;
  mockParams = {};
  editing();
  withDays(12);
  mockLoadDays.mockImplementation(async () => {
    if (mockPastDays.count === null) throw READ_FAILED;
    return mockPastDays.count;
  });
  for (const mock of [mockUpdate, mockArchive, mockUpdateAndDays, mockDeleteAll, mockAsk]) {
    mock.mockReset();
  }
  mockUpdate.mockImplementation(async () => void order.push('update'));
  mockArchive.mockImplementation(async () => void order.push('archive'));
  mockUpdateAndDays.mockImplementation(async () => void order.push('update and days'));
  mockDeleteAll.mockImplementation(async () => void order.push('delete'));
  mockToast.mockImplementation(() => void order.push('toast'));
  (router.back as jest.Mock).mockImplementation(() => void order.push('back'));
});

afterAll(() => resetLocaleForTests());

describe('Edit habit: no question when nothing the days copy has changed', () => {
  it.each([
    ['12 days logged', () => withDays(12)],
    ['the days not read yet', () => daysUnread()],
  ])('saves a colour change alone with %s, asking and counting nothing', async (_name, setup) => {
    setup();
    const screen = await render(<HabitNewScreen />);
    await press(screen, 'Blue');
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({ id: 'habit-1', values: { ...SAVED, color: 'blue' } });
    expect(mockAsk).not.toHaveBeenCalled();
    expect(mockUpdateAndDays).not.toHaveBeenCalled();
    expect(mockRetry).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.habit.updated');
    expect(order).toEqual(['update', 'toast', 'back']);
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });

  it('saves an icon change inside the same category without asking: the days keep what they copy', async () => {
    // Coffee and Breakfast are both filed under dining, so the days carry nothing new.
    expect(habitIcon('food-dining/breakfast')?.spendCategory).toBe('dining');
    const screen = await render(<HabitNewScreen />);
    await changeIcon(screen, 'Breakfast');
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'habit-1',
      values: { ...SAVED, icon_id: 'food-dining/breakfast', category_id: 'dining' },
    });
    expect(mockAsk).not.toHaveBeenCalled();
    expect(mockUpdateAndDays).not.toHaveBeenCalled();
  });

  it('asks nothing when the page is saved as it was opened', async () => {
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith({ id: 'habit-1', values: SAVED });
    expect(mockAsk).not.toHaveBeenCalled();
    expect(mockUpdateAndDays).not.toHaveBeenCalled();
  });

  it('counts a stray space on the name and the same price retyped as no change', async () => {
    const screen = await render(<HabitNewScreen />);
    await changeName(screen, 'Coffee   ');
    await pressButton(screen, 'Price, $5.00 each time');
    await clearAmount(screen);
    await typeAmount(screen, '5.00');
    await pressButton(screen, 'Done');
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith({ id: 'habit-1', values: SAVED });
    expect(mockAsk).not.toHaveBeenCalled();
    expect(mockUpdateAndDays).not.toHaveBeenCalled();
  });
});

describe.each(CHANGE_CASES)('Edit habit: %s changed', (_label, change) => {
  describe('with no day logged yet', () => {
    it('goes straight on as upcoming: no dialog, no rewrite, only the update', async () => {
      withDays(0);
      const screen = await render(<HabitNewScreen />);
      await change.apply(screen);
      await pressButton(screen, 'Save changes');

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(mockAsk).not.toHaveBeenCalled();
      expect(mockUpdateAndDays).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith({ id: 'habit-1', values: change.values });
      expect(mockToast).toHaveBeenCalledWith('toast.habit.updated');
      expect(order).toEqual(['update', 'toast', 'back']);
    });
  });

  describe('with the days not read yet', () => {
    it('says the one failure line, warns, and writes nothing when the days cannot be read', async () => {
      daysUnread();
      const log = jest.spyOn(console, 'log').mockImplementation(() => {});
      const screen = await render(<HabitNewScreen />);
      await change.apply(screen);
      await pressButton(screen, 'Save changes');

      expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
      // A real failure, reported with its cause.
      expect(log).toHaveBeenCalledWith('[failure]', READ_FAILED);
      log.mockRestore();
      expect(warn).toHaveBeenCalled();
      await settle();
      expect(mockAsk).not.toHaveBeenCalled();
      expect(mockUpdateAndDays).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalled();
      expect(router.back).not.toHaveBeenCalled();
    });

    it('waits for the days, holding Save, then asks with their count and saves', async () => {
      const arrive = daysArriveLater();
      mockAsk.mockResolvedValue('upcoming');
      const screen = await render(<HabitNewScreen />);
      await change.apply(screen);
      await pressButton(screen, 'Save changes');
      expect(
        screen.getByRole('button', { name: 'Save changes' }).props.accessibilityState,
      ).toMatchObject({ disabled: true });
      expect(mockAsk).not.toHaveBeenCalled();
      expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();

      await arrive(4);

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(mockAsk).toHaveBeenCalledTimes(1);
      expect(lastAsk().message).toBe(
        t('ui.past.change.body.days', { name: change.asks, count: 4 }),
      );
      expect(mockUpdate).toHaveBeenCalledWith({ id: 'habit-1', values: change.values });
      expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    });
  });

  describe('with 12 days logged', () => {
    it('asks the shared question, by the name typed, with Past and upcoming first', async () => {
      mockAsk.mockResolvedValue('upcoming');
      const screen = await render(<HabitNewScreen />);
      await change.apply(screen);
      await pressButton(screen, 'Save changes');

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(mockAsk).toHaveBeenCalledTimes(1);
      const request = lastAsk();
      expect(request.title).toBe(t('ui.past.change.title.days'));
      expect(request.message).toBe(t('ui.past.change.body.days', { name: change.asks, count: 12 }));
      expect(actionIds(request)).toEqual(['all', 'upcoming']);
      expect(actionLabels(request)).toEqual([
        t('ui.past.change.all'),
        t('ui.past.change.upcoming'),
      ]);
      expect(request.actions?.some((action) => action.destructive)).toBe(false);
      expect(request.cancelLabel).toBe(t('common.cancel'));
    });

    it('Past and upcoming: the habit and its days are saved in one call, with the form’s values', async () => {
      mockAsk.mockResolvedValue('all');
      const screen = await render(<HabitNewScreen />);
      await change.apply(screen);
      await pressButton(screen, 'Save changes');

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(mockUpdateAndDays).toHaveBeenCalledTimes(1);
      expect(mockUpdateAndDays).toHaveBeenCalledWith({ id: 'habit-1', values: change.values });
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(order).toEqual(['update and days', 'toast', 'back']);
      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith('toast.habit.updated');
      expect(success).toHaveBeenCalled();
    });

    it('Upcoming only: the habit alone is updated, the days are left as they landed', async () => {
      mockAsk.mockResolvedValue('upcoming');
      const screen = await render(<HabitNewScreen />);
      await change.apply(screen);
      await pressButton(screen, 'Save changes');

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(mockUpdateAndDays).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith({ id: 'habit-1', values: change.values });
      expect(order).toEqual(['update', 'toast', 'back']);
      expect(mockToast).toHaveBeenCalledWith('toast.habit.updated');
    });
  });
});

describe('Edit habit: Past and upcoming, step by step', () => {
  it('says Habit updated, and leaves, only once the one call has answered', async () => {
    mockAsk.mockResolvedValue('all');
    const saving = deferred<HabitRow>();
    mockUpdateAndDays.mockImplementation(() => {
      order.push('update and days');
      return saving.promise;
    });
    const screen = await render(<HabitNewScreen />);
    await CHANGES.price.apply(screen);
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(mockUpdateAndDays).toHaveBeenCalledTimes(1));
    await settle();
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();

    await act(async () => saving.resolve(habitRow({ price: 7 })));
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(order).toEqual(['update and days', 'toast', 'back']);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('sends every changed value in the one call, to the cent', async () => {
    mockAsk.mockResolvedValue('all');
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Habit, Coffee');
    await fireEvent.changeText(screen.getByDisplayValue('Coffee'), ' Bubble tea ');
    await pressButton(screen, 'Icon, Coffee');
    await press(screen, 'Groceries');
    await pressButton(screen, 'Done');
    await pressButton(screen, 'Price, $5.00 each time');
    await clearAmount(screen);
    await typeAmount(screen, '4.25');
    await pressButton(screen, 'Done');
    await press(screen, 'Violet');
    await press(screen, 'Checking ••0099');
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpdateAndDays.mock.calls[0][0]).toStrictEqual({
      id: 'habit-1',
      values: {
        name: 'Bubble tea',
        icon_id: 'food-dining/groceries',
        color: 'violet',
        price: 4.25,
        card_id: null,
        bank_account_id: 'acct-1',
        category_id: 'groceries',
      },
    });
    expect(lastAsk().message).toBe(
      t('ui.past.change.body.days', { name: 'Bubble tea', count: 12 }),
    );
  });

  it('reads a single day with the singular wording', async () => {
    withDays(1);
    mockAsk.mockResolvedValue('upcoming');
    const screen = await render(<HabitNewScreen />);
    await CHANGES.price.apply(screen);
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(lastAsk().message).toBe(t('ui.past.change.body.days', { name: 'Coffee', count: 1 }));
  });
});

describe('Edit habit: backing out of the question', () => {
  it.each([
    ['Cancel', null],
    ['an answer the dialog does not offer', undefined],
  ])('writes nothing, says nothing and stays on %s', async (_name, answer) => {
    mockAsk.mockResolvedValue(answer);
    const screen = await render(<HabitNewScreen />);
    await CHANGES.name.apply(screen);
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
    await settle();
    expect(mockUpdateAndDays).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    // Still the filled-in page, with the edit kept.
    expect(screen.getByRole('button', { name: 'Habit, Latte' })).toBeTruthy();
  });

  it('asks again on the next Save, and takes that answer', async () => {
    mockAsk.mockResolvedValueOnce(null).mockResolvedValueOnce('all');
    const screen = await render(<HabitNewScreen />);
    await CHANGES.name.apply(screen);
    await pressButton(screen, 'Save changes');
    await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
    await settle();

    await pressButton(screen, 'Save changes');
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockAsk).toHaveBeenCalledTimes(2);
    expect(order).toEqual(['update and days', 'toast', 'back']);
  });
});

describe('Edit habit: a write that fails', () => {
  it('stays after a failed Past and upcoming: one failure line, no toast, nothing else written', async () => {
    mockAsk.mockResolvedValue('all');
    mockUpdateAndDays.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<HabitNewScreen />);
    await CHANGES.price.apply(screen);
    await pressButton(screen, 'Save changes');

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(/network down/)).toBeNull();
    expect(mockUpdateAndDays).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });

  it('asks again on the next Save after a failure, and that answer decides', async () => {
    mockAsk.mockResolvedValueOnce('all').mockResolvedValueOnce('upcoming');
    mockUpdateAndDays.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<HabitNewScreen />);
    await CHANGES.price.apply(screen);
    await pressButton(screen, 'Save changes');
    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();

    await pressButton(screen, 'Save changes');
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockAsk).toHaveBeenCalledTimes(2);
    // The second answer was Upcoming only, so the days are not tried again.
    expect(mockUpdateAndDays).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({ id: 'habit-1', values: CHANGES.price.values });
    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('holds no answer after a failure, since nothing was written: the next Save asks and sends the form as it is now', async () => {
    mockAsk.mockResolvedValue('all');
    failsOnce(mockUpdateAndDays, 'update and days');
    const screen = await render(<HabitNewScreen />);
    await CHANGES.price.apply(screen);
    await pressButton(screen, 'Save changes');
    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();

    await changePrice(screen, '$3', '$7.00');
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockAsk).toHaveBeenCalledTimes(2);
    expect(mockUpdateAndDays).toHaveBeenCalledTimes(2);
    expect(mockUpdateAndDays).toHaveBeenLastCalledWith({
      id: 'habit-1',
      values: { ...SAVED, price: 3 },
    });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(order).toEqual(['update and days', 'update and days', 'toast', 'back']);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.habit.updated');
  });

  it('saves plainly when the form is changed back after a failed Past and upcoming: there are no days to put back', async () => {
    mockAsk.mockResolvedValue('all');
    failsOnce(mockUpdateAndDays, 'update and days');
    const screen = await render(<HabitNewScreen />);
    await CHANGES.name.apply(screen);
    await pressButton(screen, 'Save changes');
    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();

    await changeName(screen, 'Coffee', 'Latte');
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(mockUpdateAndDays).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({ id: 'habit-1', values: SAVED });
    expect(order).toEqual(['update and days', 'update', 'toast', 'back']);
  });

  it('asks on every Save after a failure, through any number of them, and says Habit updated once', async () => {
    mockAsk.mockResolvedValue('all');
    mockUpdateAndDays
      .mockRejectedValueOnce(new Error('one'))
      .mockRejectedValueOnce(new Error('two'))
      .mockRejectedValueOnce(new Error('three'))
      .mockResolvedValueOnce(habitRow({ name: 'Latte' }));
    const screen = await render(<HabitNewScreen />);
    await CHANGES.name.apply(screen);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await pressButton(screen, 'Save changes');
      await waitFor(() => expect(mockUpdateAndDays).toHaveBeenCalledTimes(attempt));
      expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    }

    await pressButton(screen, 'Save changes');
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockAsk).toHaveBeenCalledTimes(4);
    expect(mockUpdateAndDays).toHaveBeenCalledTimes(4);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('says the one failure line when the habit alone fails to update', async () => {
    withDays(0);
    mockUpdate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<HabitNewScreen />);
    await CHANGES.price.apply(screen);
    await pressButton(screen, 'Save changes');

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(mockAsk).not.toHaveBeenCalled();
    expect(mockUpdateAndDays).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('Delete habit', () => {
  const pressDelete = (screen: Screen) => pressButton(screen, 'Delete habit');

  it('with no day logged asks a plain "Delete {name}?" and removes it for good', async () => {
    withDays(0);
    mockAsk.mockResolvedValue('everything');
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(lastAsk()).toEqual({
      title: t('ui.past.delete.title', { name: 'Coffee' }),
      message: t('ui.past.delete.none'),
      actions: [{ id: 'everything', label: t('common.delete'), destructive: true }],
      cancelLabel: t('common.cancel'),
    });
    expect(mockDeleteAll).toHaveBeenCalledTimes(1);
    expect(mockDeleteAll).toHaveBeenCalledWith('habit-1');
    expect(mockArchive).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.habit.deleted', 'deleted');
    expect(order).toEqual(['delete', 'toast', 'back']);
  });

  it('with days logged offers Keep past days first and Remove everything in red', async () => {
    mockAsk.mockResolvedValue(null);
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);

    await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
    const request = lastAsk();
    expect(request.title).toBe(t('ui.past.delete.title', { name: 'Coffee' }));
    expect(request.message).toBe(t('ui.past.delete.body.days', { name: 'Coffee', count: 12 }));
    expect(request.actions).toEqual([
      { id: 'keep', label: t('ui.past.delete.keep.days') },
      { id: 'everything', label: t('ui.past.delete.everything'), destructive: true },
    ]);
    expect(request.cancelLabel).toBe(t('common.cancel'));
  });

  it('reads a single day with the singular wording', async () => {
    withDays(1);
    mockAsk.mockResolvedValue(null);
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);

    await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
    expect(lastAsk().message).toBe(t('ui.past.delete.body.days', { name: 'Coffee', count: 1 }));
  });

  it('Keep past days: archives it, says Habit stopped, and goes back', async () => {
    mockAsk.mockResolvedValue('keep');
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockArchive).toHaveBeenCalledTimes(1);
    expect(mockArchive).toHaveBeenCalledWith('habit-1');
    expect(mockDeleteAll).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledTimes(1);
    // Neither red nor "deleted": the days are still there.
    expect(mockToast).toHaveBeenCalledWith('toast.habit.stopped');
    expect(order).toEqual(['archive', 'toast', 'back']);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpdateAndDays).not.toHaveBeenCalled();
  });

  it('Remove everything: deletes the habit and its days in one call, red Habit deleted, back', async () => {
    mockAsk.mockResolvedValue('everything');
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockDeleteAll).toHaveBeenCalledTimes(1);
    expect(mockDeleteAll).toHaveBeenCalledWith('habit-1');
    expect(mockArchive).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.habit.deleted', 'deleted');
    expect(order).toEqual(['delete', 'toast', 'back']);
  });

  it.each([
    ['Cancel', null],
    ['an answer the dialog does not offer', undefined],
  ])('keeps everything on %s', async (_name, answer) => {
    mockAsk.mockResolvedValue(answer);
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);

    await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
    await settle();
    expect(mockArchive).not.toHaveBeenCalled();
    expect(mockDeleteAll).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
  });

  it('names the saved habit in the question, not a name typed and not yet saved', async () => {
    mockAsk.mockResolvedValue(null);
    const screen = await render(<HabitNewScreen />);
    await CHANGES.name.apply(screen);
    await pressDelete(screen);

    await waitFor(() => expect(mockAsk).toHaveBeenCalledTimes(1));
    expect(lastAsk().title).toBe(t('ui.past.delete.title', { name: 'Coffee' }));
    expect(lastAsk().message).toBe(t('ui.past.delete.body.days', { name: 'Coffee', count: 12 }));
  });

  it('says the one failure line, warns, and removes nothing when the days cannot be read', async () => {
    daysUnread();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(log).toHaveBeenCalledWith('[failure]', READ_FAILED);
    log.mockRestore();
    expect(warn).toHaveBeenCalled();
    await settle();
    expect(mockAsk).not.toHaveBeenCalled();
    expect(mockArchive).not.toHaveBeenCalled();
    expect(mockDeleteAll).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('waits for the days it has not read, then asks with their count', async () => {
    const arrive = daysArriveLater();
    mockAsk.mockResolvedValue('keep');
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);
    expect(mockAsk).not.toHaveBeenCalled();

    await arrive(3);

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(lastAsk().message).toBe(t('ui.past.delete.body.days', { name: 'Coffee', count: 3 }));
    expect(mockArchive).toHaveBeenCalledWith('habit-1');
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });

  it('leaves as if it worked when the habit was already removed elsewhere, with no failure line', async () => {
    mockAsk.mockResolvedValue('everything');
    mockDeleteAll.mockRejectedValueOnce({
      code: 'P0002',
      message: 'there is no such habit',
      details: null,
      hint: null,
    });
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.habit.deleted', 'deleted');
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    ['a network error', new Error('network down')],
    ['the same code with other words', { code: 'P0002', message: 'something else was missing' }],
    ['other words with another code', { code: 'P0001', message: 'there is no such habit' }],
  ])('says the one failure line and stays after %s', async (_name, thrown) => {
    mockAsk.mockResolvedValue('everything');
    mockDeleteAll.mockRejectedValueOnce(thrown);
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(warn).toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeTruthy();
  });

  it('says the one failure line and stays when keeping the days fails', async () => {
    mockAsk.mockResolvedValue('keep');
    mockArchive.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(warn).toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('can be tried again after a failure', async () => {
    mockAsk.mockResolvedValue('everything');
    mockDeleteAll.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);
    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();

    await pressDelete(screen);
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockAsk).toHaveBeenCalledTimes(2);
    expect(mockDeleteAll).toHaveBeenCalledTimes(2);
    expect(mockToast).toHaveBeenCalledTimes(1);
  });
});

describe('Delete habit: the page it leaves behind', () => {
  const pressDelete = (screen: Screen) => pressButton(screen, 'Delete habit');
  const readsBackAs = async (screen: Screen, data: HabitRow | null) => {
    mockHabit = { data, isError: false, isFetched: true };
    await screen.rerender(<HabitNewScreen />);
  };

  it('Remove everything: no "gone" page, and no blank new habit, when the habit then reads back missing', async () => {
    mockAsk.mockResolvedValue('everything');
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));

    await readsBackAs(screen, null);

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.queryByText(PICK_QUESTION)).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Habit, Coffee' })).toBeTruthy();
  });

  it('a habit already gone elsewhere: the same, no "gone" page once it reads back missing', async () => {
    mockAsk.mockResolvedValue('everything');
    mockDeleteAll.mockRejectedValueOnce({ code: 'P0002', message: 'there is no such habit' });
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));

    await readsBackAs(screen, null);

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.queryByText(PICK_QUESTION)).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
  });

  it('Keep past days: no "gone" page while the archived row reads back', async () => {
    mockAsk.mockResolvedValue('keep');
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));

    await readsBackAs(screen, habitRow({ archived_at: '2026-10-12T09:00:00Z' }));

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
  });

  it('a delete that failed leaves the page as it reads: a missing habit is then really gone', async () => {
    mockAsk.mockResolvedValue('everything');
    mockDeleteAll.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<HabitNewScreen />);
    await pressDelete(screen);
    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();

    await readsBackAs(screen, null);

    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
  });
});

describe('The words the past dialogs replaced', () => {
  const OLD_PRICE_LINE = 'New taps use the new price and card. Past receipts keep theirs.';
  const OLD_DELETE_LINE = 'Its receipts stay in your spending.';

  it('no longer says new taps only use the new price and card, before or after a price and card change', async () => {
    mockAsk.mockResolvedValue('upcoming');
    const screen = await render(<HabitNewScreen />);
    expect(screen.queryByText(OLD_PRICE_LINE)).toBeNull();

    await CHANGES.price.apply(screen);
    await press(screen, 'Checking ••0099');
    expect(screen.queryByText(OLD_PRICE_LINE)).toBeNull();
    expect(screen.queryByText(/^New taps use the new price/)).toBeNull();

    await pressButton(screen, 'Save changes');
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    for (const [request] of mockAsk.mock.calls) {
      expect(`${request.title} ${request.message}`).not.toContain(OLD_PRICE_LINE);
    }
  });

  it('no longer confirms a delete with the old dialog or its line', async () => {
    mockAsk.mockResolvedValue('keep');
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Delete habit');
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));

    expect(mockConfirm).not.toHaveBeenCalled();
    for (const [request] of mockAsk.mock.calls) {
      expect(`${request.title} ${request.message}`).not.toContain(OLD_DELETE_LINE);
    }
    expect(screen.queryByText(OLD_DELETE_LINE)).toBeNull();
  });
});

describe('Edit habit: which edits ask', () => {
  it('asks "Change past days too?" when the icon moves to another spend category', async () => {
    expect(habitIcon('food-dining/groceries')?.spendCategory).not.toBe(habitRow().category_id);
    mockAsk.mockResolvedValue('upcoming');
    const screen = await render(<HabitNewScreen />);
    await changeIcon(screen, 'Groceries');
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(lastAsk().title).toBe(t('ui.past.change.title.days'));
    expect(lastAsk().message).toBe(t('ui.past.change.body.days', { name: 'Coffee', count: 12 }));
  });

  it('never asks for a colour, beside an icon that stays in its category', async () => {
    mockAsk.mockResolvedValue('all');
    const screen = await render(<HabitNewScreen />);
    await changeIcon(screen, 'Breakfast');
    await press(screen, 'Violet');
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockAsk).not.toHaveBeenCalled();
    expect(mockUpdateAndDays).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'habit-1',
      values: {
        ...SAVED,
        icon_id: 'food-dining/breakfast',
        color: 'violet',
        category_id: 'dining',
      },
    });
  });

  it('asks once for a colour and a card together, and saves both in the one call', async () => {
    mockAsk.mockResolvedValue('all');
    const screen = await render(<HabitNewScreen />);
    await press(screen, 'Violet');
    await press(screen, 'Skip');
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(mockUpdateAndDays).toHaveBeenCalledWith({
      id: 'habit-1',
      values: { ...SAVED, color: 'violet', card_id: null, bank_account_id: null },
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('Delete habit: a second tap while a removal runs', () => {
  const deleteButton = (screen: Screen) => screen.getByRole('button', { name: 'Delete habit' });
  // It reads "Saving…" while the save itself is out.
  const saveButton = (screen: Screen) =>
    screen.getByRole('button', {
      name: new RegExp(`^(Save changes|${t('receipts.add.saving')})$`),
    });

  it.each([
    ['Remove everything', 'everything', mockDeleteAll, ['toast.habit.deleted', 'deleted']],
    ['Keep past days', 'keep', mockArchive, ['toast.habit.stopped']],
  ])(
    '%s: greys Delete out and ignores it, so there is one question, one removal, one toast, one back',
    async (_name, answer, removal, toastArgs) => {
      mockAsk.mockResolvedValue(answer);
      const removing = deferred<unknown>();
      removal.mockImplementation(() => {
        order.push('remove');
        return removing.promise;
      });
      const screen = await render(<HabitNewScreen />);
      await pressButton(screen, 'Delete habit');
      await waitFor(() => expect(removal).toHaveBeenCalledTimes(1));

      expect(deleteButton(screen).props.accessibilityState).toMatchObject({ disabled: true });
      expect(screen.getByText('Deleting…')).toBeTruthy();
      await fireEvent.press(deleteButton(screen));
      await fireEvent.press(deleteButton(screen));
      await settle();
      expect(mockAsk).toHaveBeenCalledTimes(1);
      expect(removal).toHaveBeenCalledTimes(1);
      expect(mockToast).not.toHaveBeenCalled();

      await act(async () => removing.resolve({ habitId: 'habit-1' }));
      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      await settle();
      expect(mockAsk).toHaveBeenCalledTimes(1);
      expect(removal).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith(...toastArgs);
      expect(router.back).toHaveBeenCalledTimes(1);
      expect(order).toEqual(['remove', 'toast', 'back']);
    },
  );

  it('greys Save out while a removal runs, and a tap on it asks and writes nothing', async () => {
    mockAsk.mockResolvedValue('everything');
    const removing = deferred<unknown>();
    mockDeleteAll.mockImplementation(() => removing.promise);
    const screen = await render(<HabitNewScreen />);
    await CHANGES.price.apply(screen);
    await pressButton(screen, 'Delete habit');
    await waitFor(() => expect(mockDeleteAll).toHaveBeenCalledTimes(1));

    expect(saveButton(screen).props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(saveButton(screen));
    await settle();
    // Only the delete's own question was ever asked.
    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(mockUpdateAndDays).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();

    await act(async () => removing.resolve({ habitId: 'habit-1' }));
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.habit.deleted', 'deleted');
  });

  it.each([
    ['the habit and its days are being saved', 'all', mockUpdateAndDays, mockUpdate],
    ['the habit alone is being saved', 'upcoming', mockUpdate, mockUpdateAndDays],
  ])(
    'greys Delete and Save out while %s, and taps on them do nothing',
    async (_name, answer, write, other) => {
      mockAsk.mockResolvedValue(answer);
      const writing = deferred<unknown>();
      write.mockImplementation(() => writing.promise);
      const screen = await render(<HabitNewScreen />);
      await CHANGES.price.apply(screen);
      await pressButton(screen, 'Save changes');
      await waitFor(() => expect(write).toHaveBeenCalledTimes(1));

      expect(deleteButton(screen).props.accessibilityState).toMatchObject({ disabled: true });
      expect(saveButton(screen).props.accessibilityState).toMatchObject({ disabled: true });
      await fireEvent.press(deleteButton(screen));
      await fireEvent.press(saveButton(screen));
      await settle();
      expect(mockAsk).toHaveBeenCalledTimes(1);
      expect(write).toHaveBeenCalledTimes(1);
      expect(mockArchive).not.toHaveBeenCalled();
      expect(mockDeleteAll).not.toHaveBeenCalled();

      await act(async () => writing.resolve({ id: 'habit-1' }));
      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      await settle();
      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith('toast.habit.updated');
      expect(write).toHaveBeenCalledTimes(1);
      expect(other).not.toHaveBeenCalled();
      expect(mockAsk).toHaveBeenCalledTimes(1);
    },
  );

  it('lets Delete be tried again after a removal that failed', async () => {
    mockAsk.mockResolvedValue('everything');
    mockDeleteAll.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Delete habit');
    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();

    expect(deleteButton(screen).props.accessibilityState).toMatchObject({ disabled: false });
    expect(saveButton(screen).props.accessibilityState).toMatchObject({ disabled: false });
    expect(screen.getByText('Delete habit')).toBeTruthy();
  });
});
