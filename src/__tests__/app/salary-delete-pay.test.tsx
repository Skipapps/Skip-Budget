import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import SalaryScreen from '@/app/salary';
import type { DialogRequest } from '@/components/ui/confirm-dialog';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { ToastContext } from '@/providers/toast-context';

/**
 * Removing a pay that has paid asks the shared past question. Pinned: a saved pay's paydays are
 * counted before asking, and a count that cannot be read asks nothing; with paydays on record it is
 * Keep past pay or Remove everything, without any it is the plain Delete; backing out keeps the
 * card; the answer is done on Save, after the sweep, with the person's today, and the toast says
 * what happened; a pay never saved is not counted and nothing is deleted for it.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: () => {},
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accentInk: '#905479' }),
}));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-08', todayDate: new Date('2026-10-08T00:00:00') }),
}));

/** The app dialog: each question as asked, answered with what the test set. */
const mockAsk = jest.fn(async (_request: DialogRequest): Promise<string | null> => null);
jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => mockAsk }));

/** What happened, in the order it happened. */
let mockOrder: string[] = [];

const mockRecord = jest.fn(async (_userId: string, _today: string) => 0);
const mockCountPast = jest.fn(async (_id: string, _today: string) => 0);
type Removal = { id: string; choice: 'keep' | 'everything'; today: string };
const mockRemove = jest.fn(async (_input: Removal) => ({}));
jest.mock('@/api/pay', () => ({
  recordDuePay: (userId: string, today: string) => mockRecord(userId, today),
  usePastPay: () => ({
    choose: jest.fn(async () => 'upcoming'),
    apply: jest.fn(async () => {}),
    saving: false,
  }),
  useDeletePay: () => ({ countPast: mockCountPast, remove: mockRemove, removing: false }),
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

const mockCreate = jest.fn(async (values: Record<string, unknown>) => ({
  id: values.id as string,
}));
const mockUpdate = jest.fn(async (_input: { id: string; values: Record<string, unknown> }) => ({}));
const mockSetAccounts = jest.fn(async (_input: { salaryId: string; accountIds: string[] }) => ({}));
const mockDeleteUnseen = jest.fn(async (_id: string) => ({}));
jest.mock('@/api/mutations', () => ({
  useCreateSalarySource: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSalarySource: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteUnseenPay: () => ({ mutateAsync: mockDeleteUnseen, isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: mockSetAccounts, isPending: false }),
}));

const acme = {
  id: 's1',
  name: 'Acme',
  amount: 1880,
  frequency: 'semimonthly',
  last_payday: '2026-09-30',
  pay_type: 'fixed',
  hourly_rate: null,
  hours_per_week: null,
  overtime_hours_per_week: 0,
  overtime_multiplier: 1.5,
  deduction_percent: 0,
  account_ids: ['acc1'],
};
const sideJob = { ...acme, id: 's2', name: 'Side job', amount: 400, frequency: 'weekly' };
const oneOff = {
  ...acme,
  id: 'o1',
  name: '',
  amount: 250,
  frequency: 'once',
  last_payday: '2026-10-02',
};

let mockRows: unknown[] = [acme, sideJob];
jest.mock('@/api/queries', () => ({
  useSalaryDetails: () => ({
    data: { rows: mockRows, hourlyAvailable: true },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useBankAccounts: () => ({
    data: [{ id: 'acc1', bank_name: 'Chase', nickname: 'Chase Checking', last4: '7730' }],
  }),
}));

const mockToast = jest.fn();
function Toasts({ children }: { children: ReactNode }) {
  return <ToastContext.Provider value={mockToast}>{children}</ToastContext.Provider>;
}

const NBSP = ' ';
const RAW = { normalizer: (text: string) => text };

type Screen = Awaited<ReturnType<typeof render>>;

async function show(language: Language = 'en') {
  await act(async () => setLanguage(language));
  return render(<SalaryScreen />, { wrapper: Toasts });
}

const save = (screen: Screen) => fireEvent.press(screen.getByText('Save'));
const remove = (screen: Screen, number: number) =>
  fireEvent.press(screen.getByLabelText(`Remove source ${number}`));

function lastQuestion(): DialogRequest {
  return mockAsk.mock.calls.at(-1)![0];
}
const actions = (request: DialogRequest) =>
  (request.actions ?? []).map(({ id, label, destructive }) => ({ id, label, destructive }));

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockRows = [acme, sideJob];
  mockOrder = [];
  mockAsk.mockResolvedValue(null);
  mockCountPast.mockResolvedValue(0);
  mockRecord.mockImplementation(async () => {
    mockOrder.push('record');
    return 0;
  });
  mockRemove.mockImplementation(async ({ id, choice }) => {
    mockOrder.push(`remove:${id}:${choice}`);
    return {};
  });
  mockUpdate.mockImplementation(async ({ id }) => {
    mockOrder.push(`update:${id}`);
    return {};
  });
  mockToast.mockImplementation(() => {
    mockOrder.push('toast');
  });
  jest.mocked(router.back).mockImplementation(() => {
    mockOrder.push('back');
  });
});

afterAll(() => resetLocaleForTests());

describe('a saved pay with paydays on record', () => {
  beforeEach(() => mockCountPast.mockResolvedValue(5));

  it('counts its paydays for today, then asks to keep them or remove everything', async () => {
    const screen = await show();
    await remove(screen, 2);

    expect(mockCountPast).toHaveBeenCalledWith('s2', '2026-10-08');
    const question = lastQuestion();
    expect(question.title).toBe('Delete Side job?');
    expect(question.message).toBe(
      'Side job has paid you 5 times. Keep that pay in your history, or remove it from past months too? Either way, nothing after today is recorded.',
    );
    expect(actions(question)).toEqual([
      { id: 'keep', label: 'Keep past pay', destructive: undefined },
      { id: 'everything', label: 'Remove everything', destructive: true },
    ]);
    expect(question.cancelLabel).toBe('Cancel');
  });

  it('says once for a single payday', async () => {
    mockCountPast.mockResolvedValue(1);
    const screen = await show();
    await remove(screen, 2);

    expect(lastQuestion().message).toBe(
      'Side job has paid you once. Keep that pay in your history, or remove it from past months too? Either way, nothing after today is recorded.',
    );
  });

  it('keeps the card and deletes nothing when the person backs out', async () => {
    const screen = await show();
    await remove(screen, 2);

    expect(screen.getByText('Side job')).toBeTruthy();
    await save(screen);

    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockOrder).toEqual(['record', 'update:s1', 'update:s2', 'toast', 'back']);
    expect(mockToast).toHaveBeenCalledWith('toast.pay.saved');
  });

  it('Keep past pay: the card goes now, and Save stops it after the sweep, with a Pay stopped toast', async () => {
    mockAsk.mockResolvedValue('keep');
    const screen = await show();
    await remove(screen, 2);

    expect(screen.queryByText('Side job')).toBeNull();
    expect(mockRemove).not.toHaveBeenCalled();

    await save(screen);

    expect(mockRemove).toHaveBeenCalledWith({ id: 's2', choice: 'keep', today: '2026-10-08' });
    expect(mockOrder).toEqual(['record', 'remove:s2:keep', 'update:s1', 'toast', 'back']);
    expect(mockToast).toHaveBeenCalledWith('toast.pay.stopped');
  });

  it('Remove everything: Save deletes it with its paydays, with a red Pay deleted toast', async () => {
    mockAsk.mockResolvedValue('everything');
    const screen = await show();
    await remove(screen, 2);
    await save(screen);

    expect(mockRemove).toHaveBeenCalledWith({
      id: 's2',
      choice: 'everything',
      today: '2026-10-08',
    });
    expect(mockOrder).toEqual(['record', 'remove:s2:everything', 'update:s1', 'toast', 'back']);
    expect(mockToast).toHaveBeenCalledWith('toast.pay.deleted', 'deleted');
  });

  it('says Pay deleted when one pay was kept and another removed with everything', async () => {
    const screen = await show();
    mockAsk.mockResolvedValueOnce('keep');
    await remove(screen, 2);
    mockAsk.mockResolvedValueOnce('everything');
    await remove(screen, 1);
    await save(screen);

    expect(mockRemove.mock.calls.map(([input]) => [input.id, input.choice])).toEqual([
      ['s1', 'everything'],
      ['s2', 'keep'],
    ]);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.pay.deleted', 'deleted');
  });

  it('names a one-off pay with no name by its own words', async () => {
    mockRows = [acme, oneOff];
    mockCountPast.mockResolvedValue(1);
    const screen = await show();
    await remove(screen, 2);

    expect(lastQuestion().title).toBe('Delete One-off pay?');
  });

  it('asks once for two quick taps while the count is read', async () => {
    let answer: (count: number) => void = () => {};
    mockCountPast.mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          answer = resolve;
        }),
    );
    const screen = await show();
    await remove(screen, 2);
    await remove(screen, 2);
    await act(async () => answer(5));

    expect(mockCountPast).toHaveBeenCalledTimes(1);
    expect(mockAsk).toHaveBeenCalledTimes(1);
  });

  it('asks again on a later tap once the first question is answered', async () => {
    const screen = await show();
    await remove(screen, 2);
    await remove(screen, 2);

    expect(mockAsk).toHaveBeenCalledTimes(2);
  });
});

describe('when the count cannot be read', () => {
  it('says the one failure line, asks nothing and keeps the card', async () => {
    mockCountPast.mockRejectedValue(new Error('offline'));
    const screen = await show();
    await remove(screen, 2);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(mockAsk).not.toHaveBeenCalled();
    expect(screen.getByText('Side job')).toBeTruthy();
  });

  it('clears that line on the next try', async () => {
    mockCountPast.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(5);
    const screen = await show();
    await remove(screen, 2);
    await remove(screen, 2);

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockAsk).toHaveBeenCalledTimes(1);
  });
});

describe('a saved pay with no paydays', () => {
  it('is the plain Delete, and Save deletes it with a Pay deleted toast', async () => {
    mockAsk.mockResolvedValue('everything');
    const screen = await show();
    await remove(screen, 2);

    const question = lastQuestion();
    expect(question.title).toBe('Delete Side job?');
    expect(question.message).toBe('This can’t be undone.');
    expect(actions(question)).toEqual([{ id: 'everything', label: 'Delete', destructive: true }]);

    await save(screen);
    expect(mockRemove).toHaveBeenCalledWith({
      id: 's2',
      choice: 'everything',
      today: '2026-10-08',
    });
    expect(mockToast).toHaveBeenCalledWith('toast.pay.deleted', 'deleted');
  });
});

describe('a pay never saved', () => {
  it('is not counted, is the plain Delete by its card title, and Save deletes nothing', async () => {
    mockAsk.mockResolvedValue('everything');
    const screen = await show();
    await fireEvent.press(screen.getByLabelText('Add source'));
    await remove(screen, 3);

    expect(mockCountPast).not.toHaveBeenCalled();
    expect(lastQuestion().title).toBe('Delete Source 3?');
    expect(lastQuestion().message).toBe('This can’t be undone.');

    await save(screen);
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockDeleteUnseen).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('toast.pay.saved');
  });
});

describe('a Save that does not go through', () => {
  it('removes nothing while another pay is still missing something', async () => {
    mockCountPast.mockResolvedValue(5);
    mockAsk.mockResolvedValue('keep');
    const screen = await show();
    await remove(screen, 2);
    await fireEvent.press(screen.getByLabelText('Add source'));

    await save(screen);

    expect(screen.getByText('Source 2: fill in Name, Amount, Last payday.')).toBeTruthy();
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('says the failure line when the delete fails, with no toast, and finishes on the next Save', async () => {
    mockCountPast.mockResolvedValue(5);
    mockAsk.mockResolvedValue('keep');
    mockRemove.mockRejectedValueOnce(new Error('offline'));
    const screen = await show();
    await remove(screen, 2);

    await save(screen);
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();

    await save(screen);
    expect(mockRemove).toHaveBeenCalledTimes(2);
    expect(mockRemove).toHaveBeenLastCalledWith({ id: 's2', choice: 'keep', today: '2026-10-08' });
    expect(mockToast).toHaveBeenCalledWith('toast.pay.stopped');
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

describe('in Spanish and French', () => {
  beforeEach(() => mockCountPast.mockResolvedValue(3));

  it('asks in Spanish', async () => {
    const screen = await show('es');
    await fireEvent.press(screen.getByLabelText('Quitar fuente 2'));

    const question = lastQuestion();
    expect(question.title).toBe('¿Eliminar Side job?');
    expect(question.message).toBe(
      'Side job te pagó 3 veces. ¿Conservar esos pagos en tu historial o quitarlos también de los meses pasados? En ambos casos, no se registra nada después de hoy.',
    );
    expect(actions(question).map(({ label }) => label)).toEqual([
      'Conservar los pagos anteriores',
      'Eliminar todo',
    ]);
    expect(question.cancelLabel).toBe('Cancelar');
  });

  it('asks in French, with the no-break space before the question marks', async () => {
    const screen = await show('fr');
    await fireEvent.press(screen.getByLabelText('Retirer la source 2'));

    const question = lastQuestion();
    expect(question.title).toBe(`Supprimer Side job${NBSP}?`);
    expect(question.message).toBe(
      `Side job t’a payé 3 fois. Garder ces paies dans ton historique, ou les retirer aussi des mois passés${NBSP}? Dans les deux cas, rien n’est enregistré après aujourd’hui.`,
    );
    expect(actions(question).map(({ label }) => label)).toEqual([
      'Garder les paies passées',
      'Tout supprimer',
    ]);
    expect(screen.getAllByText('Side job', RAW).length).toBeGreaterThan(0);
  });
});
