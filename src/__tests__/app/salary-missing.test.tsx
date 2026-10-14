import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import SalaryScreen from '@/app/salary';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { ToastContext } from '@/providers/toast-context';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Save never leaves a pay out. Pinned: a new pay still missing something, beside pays that are
 * complete, stops Save and is named with what it needs, by the labels on its card, in card order;
 * nothing is swept, written, toasted or left until it is filled in or removed; one pay on the page
 * is not named, several are named a line each; Spanish and French say the same.
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
// Removing the unfinished pay is a plain Delete: it was never saved, so nothing is on record.
const mockAsk = jest.fn(async (_request: Record<string, unknown>) => 'everything');
jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => mockAsk }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-08', todayDate: new Date('2026-10-08T00:00:00') }),
}));
jest.useFakeTimers().setSystemTime(new Date('2026-10-08T10:00:00'));

const mockRecord = jest.fn(async (_userId: string, _today: string) => 0);
const mockCountPast = jest.fn(async (_id: string, _today: string) => 0);
const mockRemove = jest.fn(async (_input: { id: string; choice: string; today: string }) => ({}));
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
jest.mock('@/api/mutations', () => ({
  useCreateSalarySource: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSalarySource: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteUnseenPay: () => ({ mutateAsync: jest.fn(), isPending: false }),
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

let mockRows: unknown[] = [acme];
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

const SAVE: Record<Language, string> = { en: 'Save', es: 'Guardar', fr: 'Enregistrer' };
const ADD: Record<Language, string> = {
  en: 'Add source',
  es: 'Agregar fuente',
  fr: 'Ajouter une source',
};

async function show(language: Language = 'en') {
  await act(async () => setLanguage(language));
  return render(<SalaryScreen />, { wrapper: Toasts });
}

const save = (screen: Screen, language: Language = 'en') =>
  fireEvent.press(screen.getByText(SAVE[language], RAW));
const addSource = (screen: Screen, language: Language = 'en') =>
  fireEvent.press(screen.getByLabelText(ADD[language]));

async function typeAmount(screen: Screen, keys: string[]) {
  await fireEvent.press(screen.getAllByText('Enter an amount')[0]);
  for (const key of keys) await fireEvent.press(screen.getByLabelText(key));
  await fireEvent.press(screen.getByText('Done'));
}

async function pickPayday(screen: Screen) {
  await fireEvent.press(screen.getAllByText('Pick the most recent one')[0]);
  await fireEvent.press(screen.getByLabelText('Friday 2 October 2026'));
}

/** The words above Save, exactly as drawn. */
const reason = (screen: Screen, text: string) => screen.getByText(text, RAW);

function expectNothingWritten() {
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockCreate).not.toHaveBeenCalled();
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(mockSetAccounts).not.toHaveBeenCalled();
  expect(mockRemove).not.toHaveBeenCalled();
  expect(mockToast).not.toHaveBeenCalled();
  expect(router.back).not.toHaveBeenCalled();
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockRows = [acme];
  mockAsk.mockResolvedValue('everything');
});

afterAll(() => resetLocaleForTests());

describe('a new pay left unfinished beside a complete one', () => {
  it('stops Save and names what it needs, rather than saving the other and dropping it', async () => {
    const screen = await show();
    await addSource(screen);

    await save(screen);

    expect(reason(screen, 'Source 2: fill in Name, Amount, Last payday.')).toBeTruthy();
    expectNothingWritten();
  });

  it('names only what is still empty as it is filled in, then saves both', async () => {
    const screen = await show();
    await addSource(screen);
    await fireEvent.changeText(screen.getByDisplayValue(''), 'Weekend job');

    await save(screen);
    expect(reason(screen, 'Weekend job: fill in Amount, Last payday.')).toBeTruthy();
    expectNothingWritten();

    await typeAmount(screen, ['4', '0', '0']);
    await save(screen);
    expect(reason(screen, 'Weekend job: fill in Last payday.')).toBeTruthy();
    expectNothingWritten();

    await pickPayday(screen);
    await save(screen);

    expect(screen.queryByText(/fill in/)).toBeNull();
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Weekend job', amount: 400, last_payday: '2026-10-02' }),
    );
    expect(mockToast).toHaveBeenCalledWith('toast.pay.saved');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('saves the others once the unfinished one is removed', async () => {
    const screen = await show();
    await addSource(screen);
    await save(screen);
    expect(screen.getByText(/^Source 2: fill in/)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Remove source 2'));
    // Never saved, so nothing on record to count, and nothing to delete on Save.
    expect(mockCountPast).not.toHaveBeenCalled();
    await save(screen);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.pay.saved');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('names an unfinished hourly pay’s rate and hours', async () => {
    const screen = await show();
    await addSource(screen);
    await fireEvent.press(screen.getAllByText('Hourly')[1]);

    await save(screen);

    expect(
      reason(screen, 'Source 2: fill in Name, Hourly rate, Hours a week, Last payday.'),
    ).toBeTruthy();
    expectNothingWritten();
  });

  it('names an unfinished one-off pay by its own words, with no name asked for', async () => {
    const screen = await show();
    await addSource(screen);
    await fireEvent.press(screen.getAllByLabelText('How often')[1]);
    await fireEvent.press(screen.getByLabelText('Just this time'));

    await save(screen);

    // Paid on starts as today for a pay just this time; only the amount is left.
    expect(reason(screen, 'One-off pay: fill in Amount.')).toBeTruthy();
    expectNothingWritten();
  });
});

describe('the words', () => {
  it('does not name the pay when it is the only one on the page', async () => {
    mockRows = [];
    const screen = await show();
    await addSource(screen);

    await save(screen);

    expect(reason(screen, 'To save your pay, fill in: Name, Amount, Last payday.')).toBeTruthy();
    expectNothingWritten();
  });

  it('gives each unfinished pay its own line, in page order, saved ones included', async () => {
    mockRows = [{ ...acme, last_payday: null }];
    const screen = await show();
    await addSource(screen);

    await save(screen);

    expect(
      reason(screen, 'Acme: fill in Last payday.\nSource 2: fill in Name, Amount, Last payday.'),
    ).toBeTruthy();
    expectNothingWritten();
  });

  it('says it above Save, in the footer, whole at large text', async () => {
    const screen = await show();
    await addSource(screen);
    await save(screen);

    const text = reason(screen, 'Source 2: fill in Name, Amount, Last payday.');
    expect(text.props.numberOfLines).toBeUndefined();
    expect(text.props.maxFontSizeMultiplier).toBe(TEXT_CAP.reading);
    const footer = text.parent as unknown as { children: unknown[] };
    const button = screen.getByRole('button', { name: 'Save' });
    let saveRow: unknown = button;
    while (saveRow && !footer.children.includes(saveRow)) {
      saveRow = (saveRow as { parent: unknown }).parent;
    }
    expect(footer.children.indexOf(text)).toBeLessThan(footer.children.indexOf(saveRow));
  });

  it('says it in Spanish', async () => {
    const screen = await show('es');
    await addSource(screen, 'es');

    await save(screen, 'es');

    expect(reason(screen, 'Fuente 2: completa Nombre, Importe, Último día de pago.')).toBeTruthy();
    expectNothingWritten();
  });

  it('says it in French, with the no-break space before the colon', async () => {
    mockRows = [];
    const screen = await show('fr');
    await addSource(screen, 'fr');

    await save(screen, 'fr');

    expect(
      reason(
        screen,
        `Pour enregistrer ta paie, remplis${NBSP}: Nom, Montant, Dernier jour de paie.`,
      ),
    ).toBeTruthy();
    expectNothingWritten();
  });

  it('names each pay in French on its own line', async () => {
    const screen = await show('fr');
    await addSource(screen, 'fr');

    await save(screen, 'fr');

    expect(
      reason(screen, `Source 2${NBSP}: remplis Nom, Montant, Dernier jour de paie.`),
    ).toBeTruthy();
  });
});
