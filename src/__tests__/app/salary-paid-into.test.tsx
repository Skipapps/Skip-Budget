import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import SalaryScreen from '@/app/salary';
import SalaryPaidIntoScreen from '@/app/salary-paid-into';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { pickPaidInto } from '@/lib/paid-into-pick';

/**
 * "Paid into" on the Salary page: one account, because pay lands in the first of its linked
 * accounts and nowhere else. The row shows that account, the first linked in account order however
 * many were saved, or "No account" with a hint about where pay lands. It opens a page of its own
 * that lists every account in account order, then "No account", with the shown one lit; picking
 * there hands the choice back to the editor that opened it, and Save writes exactly that account, or
 * none for "No account". Nothing changes until the person picks, so saving as it stands keeps the
 * links as saved.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
// The real SDK starts a cleanup interval that holds Jest open.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
let mockParams: Record<string, string> = {};
let mockRefocus: () => void = () => {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  // Kept so a test can bring this screen back into focus, as returning from a page does.
  useFocusEffect: (effect: () => void) => {
    mockRefocus = effect;
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accentInk: '#905479' }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => true) }));

// Pay that has already landed is written down before a save changes anything; none of that is under
// test in this file, so the sweep finds nothing and an edit to a salary that has paid is not asked.
jest.mock('@/api/pay', () => ({
  recordDuePay: jest.fn(async () => 0),
  usePastPay: () => ({
    choose: jest.fn(async () => 'upcoming'),
    apply: jest.fn(async () => {}),
    saving: false,
  }),
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));

const mockCreate = jest.fn(async (_values: Record<string, unknown>) => ({ id: 'new' }));
const mockUpdate = jest.fn(async (_input: { id: string; values: Record<string, unknown> }) => ({}));
const mockSetAccounts = jest.fn(async (_input: { salaryId: string; accountIds: string[] }) => ({}));
jest.mock('@/api/mutations', () => ({
  useCreateSalarySource: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSalarySource: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSalarySource: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: mockSetAccounts, isPending: false }),
}));

const CHECKING = {
  id: 'acc1',
  bank_name: 'Chase',
  nickname: 'Chase Checking',
  last4: '7730',
  color: '#1D4ED8',
};
const SAVINGS = {
  id: 'acc2',
  bank_name: 'Ally',
  nickname: 'Ally Savings',
  last4: '9911',
  color: '#7C3AED',
};
// No nickname and no last four: named by its bank alone.
const CAPITAL = {
  id: 'acc3',
  bank_name: 'Capital One',
  nickname: null,
  last4: null,
  color: '#0F766E',
};

const row = {
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
  account_ids: [] as string[],
};
const linkedTo = (...ids: string[]) => ({ ...row, account_ids: ids });

let mockRows: unknown[] = [row];
let mockAccounts: unknown[] = [CHECKING, SAVINGS, CAPITAL];
let mockAccountsPending = false;
let mockAccountsFailed = false;
const mockRefetchAccounts = jest.fn();
jest.mock('@/api/queries', () => ({
  useSalaryDetails: () => ({
    data: { rows: mockRows, hourlyAvailable: true },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useBankAccounts: () => ({
    data: mockAccounts,
    isPending: mockAccountsPending,
    isError: mockAccountsFailed,
    refetch: mockRefetchAccounts,
  }),
}));

// Text queries fold whitespace; this compares the characters as drawn.
const RAW = { normalizer: (text: string) => text };
const ACCOUNT_LABELS = ['Chase Checking ••7730', 'Ally Savings ••9911', 'Capital One'];
const HINT = 'Pick the account it lands in, and each payday adds to that account.';

type Screen = Awaited<ReturnType<typeof render>>;

/** The nth salary's Paid into row: what it says, read as VoiceOver reads it. */
function shown(screen: Screen, nth = 0, label = 'Paid into') {
  return screen.getAllByLabelText(label, RAW)[nth].props.accessibilityValue?.text as string;
}

/** Opens the nth salary's Paid into page and returns what the row sent it. */
async function openPaidInto(screen: Screen, nth = 0, label = 'Paid into') {
  await fireEvent.press(screen.getAllByLabelText(label, RAW)[nth]);
  const [call] = jest.mocked(router.push).mock.calls.at(-1) as unknown as [
    { pathname: string; params: { editor: string; source: string; selected: string } },
  ];
  return call;
}

/** Picks an account as the page does: it hands the pick back to the editor that opened it. */
async function payInto(screen: Screen, accountId: string | null, nth = 0, label = 'Paid into') {
  const { params } = await openPaidInto(screen, nth, label);
  await act(async () => pickPaidInto({ editor: params.editor, source: params.source, accountId }));
  // The page goes back, and this screen is in focus again.
  await act(async () => mockRefocus());
}

/** The page's choices, in order, and the one lit. */
function choices(page: Screen) {
  const radios = page.getAllByRole('radio');
  return {
    labels: radios.map((radio) => radio.props.accessibilityLabel as string),
    lit: radios
      .filter((radio) => radio.props.accessibilityState?.selected)
      .map((radio) => radio.props.accessibilityLabel as string),
  };
}

const save = (screen: Screen, label = 'Save') => fireEvent.press(screen.getByText(label, RAW));

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
  mockRows = [row];
  mockAccounts = [CHECKING, SAVINGS, CAPITAL];
  mockAccountsPending = false;
  mockAccountsFailed = false;
  mockParams = {};
});
afterAll(() => resetLocaleForTests());

describe('The Paid into row', () => {
  it('says "No account" for a salary paid into none', async () => {
    const screen = await render(<SalaryScreen />);

    expect(screen.getByText('Paid into')).toBeTruthy();
    expect(shown(screen)).toBe('No account');
  });

  it('names the one account a salary is paid into, by nickname and last four', async () => {
    mockRows = [linkedTo('acc2')];
    const screen = await render(<SalaryScreen />);

    expect(shown(screen)).toBe('Ally Savings ••9911');
    expect(screen.getByText('Ally Savings ••9911')).toBeTruthy();
  });

  it('names an account by its bank when it has no nickname and no last four', async () => {
    mockRows = [linkedTo('acc3')];
    const screen = await render(<SalaryScreen />);

    expect(shown(screen)).toBe('Capital One');
  });

  it.each([
    [['acc3', 'acc2'], 'Ally Savings ••9911'],
    [['acc2', 'acc1'], 'Chase Checking ••7730'],
    [['acc3', 'acc2', 'acc1'], 'Chase Checking ••7730'],
    [['acc3', 'acc1'], 'Chase Checking ••7730'],
  ])(
    'shows the first account in account order for a salary saved with %j, not the first saved',
    async (ids, account) => {
      mockRows = [linkedTo(...ids)];
      const screen = await render(<SalaryScreen />);

      expect(shown(screen)).toBe(account);
    },
  );

  it('ignores a link to an account that is gone, and says "No account"', async () => {
    mockRows = [linkedTo('acc-deleted')];
    const screen = await render(<SalaryScreen />);

    expect(shown(screen)).toBe('No account');
    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it('opens the Paid into page, a page and not a sheet, with the account shown', async () => {
    mockRows = [linkedTo('acc3', 'acc2')];
    const screen = await render(<SalaryScreen />);

    const { pathname, params } = await openPaidInto(screen);

    expect(pathname).toBe('/salary-paid-into');
    expect(params).toEqual({ editor: expect.any(String), source: 's1', selected: 'acc2' });
  });

  it('opens one page for a double tap, and opens again once the person is back', async () => {
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('Paid into'));
    await fireEvent.press(screen.getByLabelText('Paid into'));
    expect(router.push).toHaveBeenCalledTimes(1);

    // Back from the page without picking: the row works again.
    await act(async () => mockRefocus());
    await fireEvent.press(screen.getByLabelText('Paid into'));
    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('sends no account to the page for a salary paid into none', async () => {
    const screen = await render(<SalaryScreen />);

    const { params } = await openPaidInto(screen);

    expect(params.selected).toBe('');
  });
});

describe('Picking on the page', () => {
  it('shows each pick on the row as it comes back', async () => {
    const screen = await render(<SalaryScreen />);

    await payInto(screen, 'acc1');
    expect(shown(screen)).toBe('Chase Checking ••7730');

    await payInto(screen, 'acc3');
    expect(shown(screen)).toBe('Capital One');

    await payInto(screen, null);
    expect(shown(screen)).toBe('No account');
  });

  it('saves exactly the account picked', async () => {
    const screen = await render(<SalaryScreen />);

    await payInto(screen, 'acc2');
    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledTimes(1);
    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc2'] });
  });

  it('saves the account picked in place of every account saved before', async () => {
    mockRows = [linkedTo('acc1', 'acc2')];
    const screen = await render(<SalaryScreen />);

    await payInto(screen, 'acc3');
    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc3'] });
  });

  it('saves the account shown again when it is picked again', async () => {
    mockRows = [linkedTo('acc2')];
    const screen = await render(<SalaryScreen />);

    await payInto(screen, 'acc2');
    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc2'] });
  });

  it('saves no account at all for "No account", and unlinks what was linked', async () => {
    mockRows = [linkedTo('acc1', 'acc2')];
    const screen = await render(<SalaryScreen />);

    await payInto(screen, null);
    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: [] });
  });

  it('saves the last choice made', async () => {
    const screen = await render(<SalaryScreen />);

    await payInto(screen, 'acc1');
    await payInto(screen, null);
    await payInto(screen, 'acc2');
    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc2'] });
  });

  it('leaves the links as saved when the person picks nothing, several included', async () => {
    mockRows = [linkedTo('acc3', 'acc2')];
    const screen = await render(<SalaryScreen />);

    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc3', 'acc2'] });
  });

  it('saves no account when there is none to pay into', async () => {
    mockAccounts = [];
    const screen = await render(<SalaryScreen />);

    expect(shown(screen)).toBe('No account');
    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: [] });
  });

  it('keeps each salary’s account to itself', async () => {
    mockRows = [
      linkedTo('acc1'),
      { ...linkedTo('acc2'), id: 's2', name: 'Side job', frequency: 'weekly' },
    ];
    const screen = await render(<SalaryScreen />);

    await payInto(screen, 'acc3', 1);

    expect(shown(screen, 0)).toBe('Chase Checking ••7730');
    expect(shown(screen, 1)).toBe('Capital One');

    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc1'] });
    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's2', accountIds: ['acc3'] });
  });

  it('ignores a pick made for another editor', async () => {
    const screen = await render(<SalaryScreen />);
    const { params } = await openPaidInto(screen);

    await act(async () =>
      pickPaidInto({ editor: `${params.editor}-other`, source: 's1', accountId: 'acc1' }),
    );

    expect(shown(screen)).toBe('No account');
  });

  it('starts a new pay on "No account", and saves the account picked for it', async () => {
    mockRows = [];
    const screen = await render(<SalaryScreen />);
    await fireEvent.press(screen.getByLabelText('Add source'));
    await fireEvent.press(screen.getByLabelText('How often'));
    await fireEvent.press(screen.getByLabelText('Just this time'));

    expect(shown(screen)).toBe('No account');

    await fireEvent.press(screen.getByText('Enter an amount'));
    for (const key of ['2', '5', '0', '0']) await fireEvent.press(screen.getByLabelText(key));
    await fireEvent.press(screen.getByText('Done'));
    await payInto(screen, 'acc1');
    await save(screen);

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 2500 }));
    expect(mockSetAccounts).toHaveBeenCalledTimes(1);
    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 'new', accountIds: ['acc1'] });
  });
});

describe('The hint under Paid into', () => {
  it('shows while no account is picked', async () => {
    const screen = await render(<SalaryScreen />);

    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it('is gone once the salary is paid into an account', async () => {
    mockRows = [linkedTo('acc1')];
    const screen = await render(<SalaryScreen />);

    expect(screen.queryByText(HINT)).toBeNull();
  });

  it('is gone for a salary saved with several accounts', async () => {
    mockRows = [linkedTo('acc2', 'acc3')];
    const screen = await render(<SalaryScreen />);

    expect(screen.queryByText(HINT)).toBeNull();
  });

  it('goes when an account is picked and comes back with "No account"', async () => {
    const screen = await render(<SalaryScreen />);

    await payInto(screen, 'acc2');
    expect(screen.queryByText(HINT)).toBeNull();

    await payInto(screen, null);
    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it('is shown once for each salary that has no account', async () => {
    mockRows = [
      linkedTo('acc1'),
      { ...row, id: 's2', name: 'Side job', frequency: 'weekly' },
      { ...row, id: 's3', name: 'Weekend job', frequency: 'weekly' },
    ];
    const screen = await render(<SalaryScreen />);

    expect(screen.getAllByText(HINT)).toHaveLength(2);
  });

  it('no longer asks for an account to be linked', async () => {
    const screen = await render(<SalaryScreen />);

    expect(
      screen.queryByText('Link at least one account so Skip knows where this lands.'),
    ).toBeNull();
  });
});

describe('The Paid into page', () => {
  const open = (params: Record<string, string>) => {
    mockParams = { editor: 'e1', source: 's1', ...params };
    return render(<SalaryPaidIntoScreen />);
  };

  it('offers every account in account order, then "No account", with the shown one lit', async () => {
    const page = await open({ selected: 'acc2' });

    expect(page.getByText('Paid into')).toBeTruthy();
    expect(page.getByText(HINT)).toBeTruthy();
    expect(choices(page)).toEqual({
      labels: [...ACCOUNT_LABELS, 'No account'],
      lit: ['Ally Savings ••9911'],
    });
  });

  it('names an account by its nickname and last four, or its bank when it has neither', async () => {
    mockAccounts = [CAPITAL, { ...CHECKING, nickname: null }];
    const page = await open({ selected: '' });

    expect(choices(page).labels).toEqual(['Capital One', 'Chase ••7730', 'No account']);
  });

  it('lights "No account" for none, or for an account that is gone', async () => {
    expect(choices(await open({ selected: '' })).lit).toEqual(['No account']);
    expect(choices(await open({ selected: 'acc-deleted' })).lit).toEqual(['No account']);
  });

  it('offers only "No account" when there is no account to pay into', async () => {
    mockAccounts = [];
    const page = await open({ selected: '' });

    expect(choices(page)).toEqual({ labels: ['No account'], lit: ['No account'] });
  });

  it('hands the pick back to the editor that opened it, then goes back', async () => {
    const heard: unknown[] = [];
    const { onPaidIntoPicked } = jest.requireActual('@/lib/paid-into-pick');
    const stop = onPaidIntoPicked((pick: unknown) => heard.push(pick));
    const page = await open({ selected: 'acc1' });

    await fireEvent.press(page.getByLabelText('No account'));

    expect(heard).toEqual([{ editor: 'e1', source: 's1', accountId: null }]);
    expect(router.back).toHaveBeenCalledTimes(1);
    stop();
  });

  it('leaves once: a second press picks nothing and does not go back again', async () => {
    const heard: unknown[] = [];
    const { onPaidIntoPicked } = jest.requireActual('@/lib/paid-into-pick');
    const stop = onPaidIntoPicked((pick: unknown) => heard.push(pick));
    const page = await open({ selected: '' });

    // A double tap, or a quick tap on another account before the page has gone: a second back
    // would close the Salary page too, with its edits.
    await fireEvent.press(page.getByLabelText('Capital One'));
    await fireEvent.press(page.getByLabelText('Capital One'));
    await fireEvent.press(page.getByLabelText('Chase Checking ••7730'));

    expect(heard).toEqual([{ editor: 'e1', source: 's1', accountId: 'acc3' }]);
    expect(router.back).toHaveBeenCalledTimes(1);
    stop();
  });

  it('only goes back when it was reached without an editor to hand the pick to', async () => {
    const heard = jest.fn();
    const { onPaidIntoPicked } = jest.requireActual('@/lib/paid-into-pick');
    const stop = onPaidIntoPicked(heard);
    mockParams = {};
    const page = await render(<SalaryPaidIntoScreen />);

    await fireEvent.press(page.getByLabelText('Chase Checking ••7730'));

    expect(heard).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
    stop();
  });

  it('offers to add an account, on a page of the account form that asks nothing about pay', async () => {
    const page = await open({ selected: '' });

    await fireEvent.press(page.getByLabelText('Add an account'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/add-account',
      params: { from: 'salary' },
    });
    expect(router.back).not.toHaveBeenCalled();
  });

  it('offers to add one when there is no account, and lists it once the person is back', async () => {
    mockAccounts = [];
    const heard = jest.fn();
    const { onPaidIntoPicked } = jest.requireActual('@/lib/paid-into-pick');
    const stop = onPaidIntoPicked(heard);
    const page = await open({ selected: '' });
    expect(choices(page).labels).toEqual(['No account']);

    await fireEvent.press(page.getByLabelText('Add an account'));
    // A second tap before the form has opened opens nothing more, and picks nothing.
    await fireEvent.press(page.getByLabelText('Add an account'));
    await fireEvent.press(page.getByLabelText('No account'));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(heard).not.toHaveBeenCalled();

    // The account is saved on the form, which comes back here.
    mockAccounts = [CHECKING];
    await act(async () => mockRefocus());
    await page.rerender(<SalaryPaidIntoScreen />);

    expect(choices(page).labels).toEqual(['Chase Checking ••7730', 'No account']);
    await fireEvent.press(page.getByLabelText('Chase Checking ••7730'));
    expect(heard).toHaveBeenCalledWith({ editor: 'e1', source: 's1', accountId: 'acc1' });
    expect(router.back).toHaveBeenCalledTimes(1);
    stop();
  });

  it('waits for the accounts, and offers Try again when they cannot be read', async () => {
    mockAccountsPending = true;
    const waiting = await open({ selected: '' });
    expect(waiting.queryByRole('radio')).toBeNull();

    mockAccountsPending = false;
    mockAccountsFailed = true;
    const failed = await open({ selected: '' });
    expect(failed.queryByRole('radio')).toBeNull();
    await fireEvent.press(failed.getByText('Try again'));
    expect(mockRefetchAccounts).toHaveBeenCalled();
  });
});

describe.each([
  {
    language: 'es' as const,
    currency: 'MXN' as const,
    paidInto: 'Se deposita en',
    noAccount: 'Ninguna cuenta',
    hint: 'Elige la cuenta donde llega y cada día de pago se sumará a esa cuenta.',
    addAccount: 'Agregar una cuenta',
    save: 'Guardar',
  },
  {
    language: 'fr' as const,
    currency: 'CAD' as const,
    paidInto: 'Versée dans',
    noAccount: 'Aucun compte',
    hint: 'Choisis le compte où elle arrive, et chaque jour de paie s’y ajoutera.',
    addAccount: 'Ajouter un compte',
    save: 'Enregistrer',
  },
])('Paid into in $language', (w) => {
  beforeEach(() => {
    setLanguage(w.language);
    setCurrency(w.currency);
  });

  it('reads in the language on the row', async () => {
    const screen = await render(<SalaryScreen />);

    expect(screen.getByText(w.paidInto, RAW)).toBeTruthy();
    expect(shown(screen, 0, w.paidInto)).toBe(w.noAccount);
    expect(screen.getByText(w.hint, RAW)).toBeTruthy();
    expect(screen.queryByText(HINT, RAW)).toBeNull();
    expect(screen.queryByText('No account', RAW)).toBeNull();
  });

  it('shows the first linked account in account order, and hides the hint', async () => {
    mockRows = [linkedTo('acc3', 'acc2')];
    const screen = await render(<SalaryScreen />);

    expect(shown(screen, 0, w.paidInto)).toBe('Ally Savings ••9911');
    expect(screen.queryByText(w.hint, RAW)).toBeNull();
  });

  it('reads in the language on the page, with the same accounts', async () => {
    mockParams = { editor: 'e1', source: 's1', selected: '' };
    const page = await render(<SalaryPaidIntoScreen />);

    expect(page.getByText(w.paidInto, RAW)).toBeTruthy();
    expect(page.getByText(w.hint, RAW)).toBeTruthy();
    expect(page.getByText(w.addAccount, RAW)).toBeTruthy();
    expect(choices(page)).toEqual({
      labels: [...ACCOUNT_LABELS, w.noAccount],
      lit: [w.noAccount],
    });
  });

  it('saves the same account ids English saves', async () => {
    const screen = await render(<SalaryScreen />);

    await payInto(screen, 'acc3', 0, w.paidInto);
    await save(screen, w.save);
    expect(mockSetAccounts).toHaveBeenLastCalledWith({ salaryId: 's1', accountIds: ['acc3'] });

    await payInto(screen, null, 0, w.paidInto);
    await save(screen, w.save);
    expect(mockSetAccounts).toHaveBeenLastCalledWith({ salaryId: 's1', accountIds: [] });
  });
});
