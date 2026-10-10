import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import SalaryScreen from '@/app/salary';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { pickPaidInto } from '@/lib/paid-into-pick';
import { ToastContext } from '@/providers/toast-context';

/**
 * What Save does about pay already received. Pinned: the pay that has come due is written down
 * before any change can reprice it; a saved salary whose name, pay or landing account changed asks
 * whether the pay it already paid changes too, once, before anything is written; "upcoming" saves
 * and leaves the past alone, "all" saves and then rewrites the past with what the salary now says,
 * and backing out saves nothing; a change of frequency or payday, a new salary and a removed one
 * never ask.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
// The real SDK starts a cleanup interval that holds Jest open.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
let mockRefocus: () => void = () => {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  // Kept so a test can bring this screen back into focus, as returning from a page does.
  useFocusEffect: (effect: () => void) => {
    mockRefocus = effect;
  },
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accentInk: '#905479' }),
}));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-08', todayDate: new Date('2026-10-08T00:00:00') }),
}));

const mockRemove = jest.fn(async (_options: Record<string, unknown>) => true);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockRemove }));

jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));

/** What happened, in the order it happened. */
let mockOrder: string[] = [];
/** A save that goes through ends by saying so, then leaving the page. */
const LEAVE = ['toast', 'back'];

type Scope = 'all' | 'upcoming' | null;
type Carried = { label: string; amount: number; bank_account_id: string | null };

const mockRecord = jest.fn(async (_userId: string, _today: string) => 0);
const mockChoose = jest.fn(async (_id: string, _name: string): Promise<Scope> => 'upcoming');
const mockApply = jest.fn(async (_id: string, _values: Carried) => {});
jest.mock('@/api/pay', () => ({
  recordDuePay: (userId: string, today: string) => mockRecord(userId, today),
  usePastPay: () => ({ choose: mockChoose, apply: mockApply, saving: false }),
}));

// A screen raises a toast through the context; outside a provider it does nothing, so this one records.
const mockToast = jest.fn();
function Toasts({ children }: { children: ReactNode }) {
  return <ToastContext.Provider value={mockToast}>{children}</ToastContext.Provider>;
}

let mockUserId: string | null = 'user-1';
jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));

const mockInvalidate = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));

const mockCreate = jest.fn(async (_values: Record<string, unknown>) => ({ id: 'new' }));
const mockUpdate = jest.fn(async (_input: { id: string; values: Record<string, unknown> }) => ({}));
const mockDelete = jest.fn(async (_id: string) => ({}));
const mockSetAccounts = jest.fn(async (_input: { salaryId: string; accountIds: string[] }) => ({}));
jest.mock('@/api/mutations', () => ({
  useCreateSalarySource: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSalarySource: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSalarySource: () => ({ mutateAsync: mockDelete, isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: mockSetAccounts, isPending: false }),
}));

const CHECKING = { id: 'acc1', bank_name: 'Chase', nickname: 'Chase Checking', last4: '7730' };
const SAVINGS = { id: 'acc2', bank_name: 'Ally', nickname: 'Ally Savings', last4: '9911' };

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
const oneOff = (id: string, payday: string, amount: number) => ({
  ...acme,
  id,
  name: '',
  amount,
  frequency: 'once',
  last_payday: payday,
});

let mockRows: unknown[] = [acme];
let mockAccounts: unknown[] = [CHECKING, SAVINGS];
jest.mock('@/api/queries', () => ({
  useSalaryDetails: () => ({
    data: { rows: mockRows, hourlyAvailable: true },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useBankAccounts: () => ({ data: mockAccounts }),
}));

type Screen = Awaited<ReturnType<typeof render>>;

const save = (screen: Screen) => fireEvent.press(screen.getByText('Save'));

/** Types a new amount on the salary's keypad: the digits it held come off, the new ones go on. */
async function retype(screen: Screen, shown: string, held: number, keys: string[]) {
  await fireEvent.press(screen.getByText(shown));
  for (let i = 0; i < held; i += 1) {
    await fireEvent.press(screen.getByLabelText('Delete last digit'));
  }
  for (const key of keys) {
    await fireEvent.press(screen.getByLabelText(key === '.' ? 'Decimal point' : key));
  }
  await fireEvent.press(screen.getByText('Done'));
}

/** Opens a name with its pencil and types the new one. */
async function rename(screen: Screen, from: string, to: string) {
  await fireEvent.press(screen.getByLabelText(`Rename ${from}`));
  await fireEvent.changeText(screen.getByDisplayValue(from), to);
}

/** Picks an account for a salary as the Paid into page does: it hands the pick to this editor. */
async function payInto(screen: Screen, accountId: string | null, index = 0) {
  await fireEvent.press(screen.getAllByLabelText('Paid into')[index]);
  const [{ params }] = jest.mocked(router.push).mock.calls.at(-1) as unknown as [
    { params: { editor: string; source: string } },
  ];
  await act(async () => pickPaidInto({ editor: params.editor, source: params.source, accountId }));
  // The page goes back, and this screen is in focus again.
  await act(async () => mockRefocus());
}

/** Opens a source's How often choices and picks one. */
async function chooseFrequency(screen: Screen, label: string, index = 0) {
  await fireEvent.press(screen.getAllByLabelText('How often')[index]);
  await fireEvent.press(screen.getByLabelText(label));
}

/** Opens the calendar on the last payday shown (September) and picks 2 October. */
async function pickSecondOfOctober(screen: Screen) {
  await fireEvent.press(screen.getByText('30 Sep 2026'));
  await fireEvent.press(screen.getByLabelText('Next month'));
  await fireEvent.press(screen.getByLabelText(/Friday 2 October 2026$/));
}

beforeEach(() => {
  jest.clearAllMocks();
  [mockRecord, mockChoose, mockApply, mockCreate, mockUpdate, mockDelete, mockSetAccounts].forEach(
    (fn) => fn.mockReset(),
  );
  mockOrder = [];
  mockUserId = 'user-1';
  mockRows = [acme];
  mockAccounts = [CHECKING, SAVINGS];
  mockRemove.mockResolvedValue(true);
  mockToast.mockReset();
  mockToast.mockImplementation(() => {
    mockOrder.push('toast');
  });
  jest.mocked(router.back).mockImplementation(() => {
    mockOrder.push('back');
  });

  mockRecord.mockImplementation(async () => {
    mockOrder.push('record');
    return 0;
  });
  mockChoose.mockImplementation(async (id) => {
    mockOrder.push(`choose:${id}`);
    return 'upcoming';
  });
  mockApply.mockImplementation(async (id) => {
    mockOrder.push(`apply:${id}`);
  });
  mockCreate.mockImplementation(async () => {
    mockOrder.push('create');
    return { id: 'new' };
  });
  mockUpdate.mockImplementation(async ({ id }) => {
    mockOrder.push(`update:${id}`);
    return {};
  });
  mockDelete.mockImplementation(async (id) => {
    mockOrder.push(`delete:${id}`);
    return {};
  });
  mockSetAccounts.mockImplementation(async ({ salaryId }) => {
    mockOrder.push(`accounts:${salaryId}`);
    return {};
  });
});

describe('Saving writes down the pay that has come due first', () => {
  it('sweeps with the person and the day, before the salary is written', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });

    await save(screen);

    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith('user-1', '2026-10-08');
    expect(mockOrder).toEqual(['record', 'update:s1', 'accounts:s1', ...LEAVE]);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('sweeps before a change is asked about, so a raise cannot reprice what was owed', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', 'Acme Corp');

    await save(screen);

    expect(mockOrder).toEqual(['record', 'choose:s1', 'update:s1', 'accounts:s1', ...LEAVE]);
  });

  it('sweeps before a salary is removed, so its unwritten paydays are kept', async () => {
    mockRows = [acme, sideJob];
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await fireEvent.press(screen.getByLabelText('Remove source 2'));

    await save(screen);

    expect(mockOrder).toEqual(['record', 'delete:s2', 'update:s1', 'accounts:s1', ...LEAVE]);
  });

  it('refreshes the pay list when the sweep wrote some', async () => {
    mockRecord.mockResolvedValue(3);
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });

    await save(screen);

    expect(mockInvalidate).toHaveBeenCalledTimes(1);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['pay_received'] });
  });

  it('leaves the pay list alone when the sweep wrote none', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });

    await save(screen);

    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('still saves, without a sweep, when nobody is signed in', async () => {
    mockUserId = null;
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });

    await save(screen);

    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('does not sweep for a page it refuses to save', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', '');

    await save(screen);

    expect(screen.getByText('Give each source a name and its pay.')).toBeTruthy();
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockChoose).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('says the one failure line, and writes nothing, when the sweep throws', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockRecord.mockRejectedValue(new Error('network down'));
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });

    await save(screen);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(mockOrder).toEqual([]);
    expect(router.back).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('Saying the pay is saved', () => {
  it('says "Pay saved" once, after the last write, and then leaves', async () => {
    mockChoose.mockResolvedValue('all');
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', 'Acme Corp');

    await save(screen);

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.pay.saved');
    expect(mockOrder.slice(-3)).toEqual(['apply:s1', 'toast', 'back']);
  });

  it.each([
    ['the page is refused', async (screen: Screen) => rename(screen, 'Acme', '')],
    [
      'the person backs out of the question',
      async (screen: Screen) => {
        mockChoose.mockResolvedValue(null);
        await rename(screen, 'Acme', 'Acme Corp');
      },
    ],
    [
      'a write fails',
      async (screen: Screen) => {
        mockUpdate.mockRejectedValue(new Error('network down'));
        await rename(screen, 'Acme', 'Acme Corp');
      },
    ],
    [
      'rewriting the past fails',
      async (screen: Screen) => {
        mockChoose.mockResolvedValue('all');
        mockApply.mockRejectedValue(new Error('network down'));
        await rename(screen, 'Acme', 'Acme Corp');
      },
    ],
  ])('says nothing when %s', async (_case, set) => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await set(screen);

    await save(screen);

    expect(mockToast).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('A saved salary whose name, pay or account changed asks about the pay it already paid', () => {
  it('asks when the name changes, naming the new one', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', 'Acme Corp');

    await save(screen);

    expect(mockChoose).toHaveBeenCalledTimes(1);
    expect(mockChoose).toHaveBeenCalledWith('s1', 'Acme Corp');
  });

  it('asks when the pay changes', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await retype(screen, '$1,880.00', 4, ['1', '9', '0', '0']);

    await save(screen);

    expect(mockChoose).toHaveBeenCalledWith('s1', 'Acme');
  });

  it('asks when the pay changes by a single cent', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await retype(screen, '$1,880.00', 4, ['1', '8', '8', '0', '.', '0', '1']);

    await save(screen);

    expect(mockChoose).toHaveBeenCalledTimes(1);
  });

  it('asks when the account it lands in changes', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await payInto(screen, 'acc2');

    await save(screen);

    expect(mockChoose).toHaveBeenCalledWith('s1', 'Acme');
  });

  it('asks when it stops landing in an account', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await payInto(screen, null);

    await save(screen);

    expect(mockChoose).toHaveBeenCalledTimes(1);
  });

  it('asks when it starts landing in an account', async () => {
    mockRows = [{ ...acme, account_ids: [] }];
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await payInto(screen, 'acc1');

    await save(screen);

    expect(mockChoose).toHaveBeenCalledTimes(1);
  });

  it('asks when the hours of an hourly salary move what a paycheck comes to', async () => {
    mockRows = [
      {
        ...acme,
        frequency: 'biweekly',
        pay_type: 'hourly',
        hourly_rate: 20,
        hours_per_week: 40,
        overtime_hours_per_week: 5,
      },
    ];
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await fireEvent.changeText(screen.getByDisplayValue('40'), '30');

    await save(screen);

    expect(mockChoose).toHaveBeenCalledTimes(1);
  });

  it('names an unnamed one-off pay by its own words', async () => {
    mockRows = [oneOff('o1', '2026-10-02', 400)];
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await retype(screen, '$400.00', 3, ['4', '5', '0']);

    await save(screen);

    expect(mockChoose).toHaveBeenCalledWith('o1', 'One-off pay');
  });

  it('asks once for each salary that changed, in the order of the page', async () => {
    mockRows = [acme, sideJob];
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Side job', 'Weekend job');
    await rename(screen, 'Acme', 'Acme Corp');

    await save(screen);

    expect(mockChoose.mock.calls).toEqual([
      ['s1', 'Acme Corp'],
      ['s2', 'Weekend job'],
    ]);
  });
});

describe('A change that does not touch what a pay copies does not ask', () => {
  it('saves a salary as it stands without asking', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });

    await save(screen);

    expect(mockChoose).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('does not ask for a change of frequency alone', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await chooseFrequency(screen, 'Weekly');

    await save(screen);

    expect(mockChoose).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 's1',
      values: expect.objectContaining({ frequency: 'weekly' }),
    });
  });

  it('does not ask for a change of last payday alone', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await pickSecondOfOctober(screen);

    await save(screen);

    expect(mockChoose).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 's1',
      values: expect.objectContaining({ last_payday: '2026-10-02' }),
    });
  });

  it('does not ask when both change together', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await chooseFrequency(screen, 'Weekly');
    await pickSecondOfOctober(screen);

    await save(screen);

    expect(mockChoose).not.toHaveBeenCalled();
  });

  it('does not ask when the pay is typed again to the same amount', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await retype(screen, '$1,880.00', 4, ['1', '8', '8', '0']);

    await save(screen);

    expect(mockChoose).not.toHaveBeenCalled();
  });

  it('does not ask when only spaces were added around the name', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', '  Acme  ');

    await save(screen);

    expect(mockChoose).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 's1',
      values: expect.objectContaining({ name: 'Acme' }),
    });
  });

  it('does not ask when an extra account goes but the pay still lands in the same one', async () => {
    mockRows = [{ ...acme, account_ids: ['acc1', 'acc2'] }];
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await payInto(screen, 'acc1');

    await save(screen);

    expect(mockChoose).not.toHaveBeenCalled();
    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc1'] });
  });

  it('does not ask when the account picked is the one the pay already lands in', async () => {
    mockRows = [{ ...acme, account_ids: ['acc2', 'acc1'] }];
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await payInto(screen, 'acc1');

    await save(screen);

    expect(mockChoose).not.toHaveBeenCalled();
  });

  it('does not ask about a new salary, or about the saved one beside it', async () => {
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await fireEvent.press(screen.getByLabelText('Add source'));
    await chooseFrequency(screen, 'Just this time', 1);
    await fireEvent.press(screen.getByText('Enter an amount'));
    for (const key of ['2', '5', '0']) await fireEvent.press(screen.getByLabelText(key));
    await fireEvent.press(screen.getByText('Done'));

    await save(screen);

    expect(mockChoose).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 250 }));
    expect(mockOrder).toEqual([
      'record',
      'update:s1',
      'accounts:s1',
      'create',
      'accounts:new',
      ...LEAVE,
    ]);
  });

  it('does not ask about a salary that is removed', async () => {
    mockRows = [acme, sideJob];
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await fireEvent.press(screen.getByLabelText('Remove source 2'));

    await save(screen);

    expect(mockChoose).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith('s2');
    expect(mockApply).not.toHaveBeenCalled();
  });

  it('does not ask about earlier one-off pays that were opened and left alone', async () => {
    mockRows = [acme, oneOff('old1', '2026-08-14', 400), oneOff('old2', '2026-09-20', 300)];
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await fireEvent.press(screen.getByLabelText('2 earlier one-off pays'));

    await save(screen);

    expect(mockChoose).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(3);
  });
});

describe('The answer', () => {
  it('"upcoming" saves the salary and its account and leaves the past pay alone', async () => {
    mockChoose.mockImplementation(async (id) => {
      mockOrder.push(`choose:${id}`);
      return 'upcoming';
    });
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', 'Acme Corp');

    await save(screen);

    expect(mockUpdate).toHaveBeenCalledWith({
      id: 's1',
      values: expect.objectContaining({ name: 'Acme Corp' }),
    });
    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc1'] });
    expect(mockApply).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('"all" saves first, then rewrites the past with the name, pay and account now', async () => {
    mockChoose.mockResolvedValue('all');
    mockChoose.mockImplementation(async (id) => {
      mockOrder.push(`choose:${id}`);
      return 'all';
    });
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', 'Acme Corp');
    await retype(screen, '$1,880.00', 4, ['1', '9', '5', '0', '.', '2', '5']);
    await payInto(screen, 'acc2');

    await save(screen);

    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(mockApply).toHaveBeenCalledWith('s1', {
      label: 'Acme Corp',
      amount: 1950.25,
      bank_account_id: 'acc2',
    });
    expect(mockOrder).toEqual([
      'record',
      'choose:s1',
      'update:s1',
      'accounts:s1',
      'apply:s1',
      ...LEAVE,
    ]);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('"all" sends no account when the salary now lands in none', async () => {
    mockChoose.mockResolvedValue('all');
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await payInto(screen, null);

    await save(screen);

    expect(mockApply).toHaveBeenCalledWith('s1', {
      label: 'Acme',
      amount: 1880,
      bank_account_id: null,
    });
  });

  it('"all" sends the account the pay lands in, the first in account order, not every one', async () => {
    mockChoose.mockResolvedValue('all');
    mockRows = [{ ...acme, account_ids: ['acc2', 'acc1'] }];
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', 'Acme Corp');

    await save(screen);

    expect(mockApply).toHaveBeenCalledWith('s1', {
      label: 'Acme Corp',
      amount: 1880,
      bank_account_id: 'acc1',
    });
  });

  it('"all" sends the pay an hourly salary now works out to', async () => {
    mockChoose.mockResolvedValue('all');
    mockRows = [
      {
        ...acme,
        frequency: 'biweekly',
        pay_type: 'hourly',
        hourly_rate: 20,
        hours_per_week: 40,
        overtime_hours_per_week: 5,
      },
    ];
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await fireEvent.changeText(screen.getByDisplayValue('40'), '30');

    await save(screen);

    // (30 × $20 + 5 × $30) × 2 weeks.
    expect(mockApply).toHaveBeenCalledWith('s1', {
      label: 'Acme',
      amount: 1500,
      bank_account_id: 'acc1',
    });
  });

  it('"all" sends an unnamed one-off pay’s empty name, which the ledger reads as Income', async () => {
    mockChoose.mockResolvedValue('all');
    mockRows = [oneOff('o1', '2026-10-02', 400)];
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await retype(screen, '$400.00', 3, ['4', '5', '0']);

    await save(screen);

    expect(mockApply).toHaveBeenCalledWith('o1', {
      label: '',
      amount: 450,
      bank_account_id: 'acc1',
    });
  });

  it('applies "all" only to the salary it was said for', async () => {
    mockRows = [acme, sideJob];
    mockChoose.mockImplementation(async (id) => (id === 's1' ? 'all' : 'upcoming'));
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', 'Acme Corp');
    await rename(screen, 'Side job', 'Weekend job');

    await save(screen);

    expect(mockChoose).toHaveBeenCalledTimes(2);
    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(mockApply).toHaveBeenCalledWith('s1', expect.objectContaining({ label: 'Acme Corp' }));
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('saves nothing when the person backs out', async () => {
    mockChoose.mockResolvedValue(null);
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', 'Acme Corp');

    await save(screen);

    expect(mockChoose).toHaveBeenCalledTimes(1);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockSetAccounts).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    // A refusal is the person's choice, not a failure.
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('saves nothing for any salary when the person backs out on the second', async () => {
    mockRows = [acme, sideJob];
    mockChoose.mockImplementation(async (id) => (id === 's1' ? 'all' : null));
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', 'Acme Corp');
    await rename(screen, 'Side job', 'Weekend job');

    await save(screen);

    expect(mockChoose).toHaveBeenCalledTimes(2);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSetAccounts).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('asks again on the next Save after backing out, and saves when told to', async () => {
    mockChoose.mockResolvedValueOnce(null);
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', 'Acme Corp');
    await save(screen);
    expect(mockUpdate).not.toHaveBeenCalled();

    await save(screen);

    expect(mockChoose).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('says the one failure line, and writes nothing, when the question itself fails', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockChoose.mockRejectedValue(new Error('network down'));
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', 'Acme Corp');

    await save(screen);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('stays on the page with the failure line when rewriting the past fails', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockChoose.mockResolvedValue('all');
    mockApply.mockRejectedValue(new Error('network down'));
    const screen = await render(<SalaryScreen />, { wrapper: Toasts });
    await rename(screen, 'Acme', 'Acme Corp');

    await save(screen);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
