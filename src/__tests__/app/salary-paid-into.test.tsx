import { fireEvent, render, within } from '@testing-library/react-native';

import SalaryScreen from '@/app/salary';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/**
 * "Paid into" on the Salary page: one account, because pay lands in the first of its linked
 * accounts and nowhere else. Pinned: every account in account order, then "No account"; the one lit
 * is the first linked account in account order, however many were saved; picking writes exactly that
 * account, "No account" writes none; and the hint about where pay lands shows only while none is
 * picked. Nothing changes until the person picks, so saving as it stands keeps the links as saved.
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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
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

let mockPro = false;
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: mockPro, ready: true }) }));

const mockCreate = jest.fn(async (_values: Record<string, unknown>) => ({ id: 'new' }));
const mockUpdate = jest.fn(async (_input: { id: string; values: Record<string, unknown> }) => ({}));
const mockSetAccounts = jest.fn(async (_input: { salaryId: string; accountIds: string[] }) => ({}));
jest.mock('@/api/mutations', () => ({
  useCreateSalarySource: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSalarySource: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSalarySource: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: mockSetAccounts, isPending: false }),
}));

const CHECKING = { id: 'acc1', bank_name: 'Chase', nickname: 'Chase Checking', last4: '7730' };
const SAVINGS = { id: 'acc2', bank_name: 'Ally', nickname: 'Ally Savings', last4: '9911' };
// No nickname and no last four: named by its bank alone.
const CAPITAL = { id: 'acc3', bank_name: 'Capital One', nickname: null, last4: null };

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
jest.mock('@/api/queries', () => ({
  useSalaryDetails: () => ({
    data: { rows: mockRows, hourlyAvailable: true },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useBankAccounts: () => ({ data: mockAccounts }),
}));

// Text queries fold whitespace; this compares the characters as drawn.
const RAW = { normalizer: (text: string) => text };
const ACCOUNT_LABELS = ['Chase Checking ••7730', 'Ally Savings ••9911', 'Capital One'];
const HINT = 'Pick the account it lands in, and each payday adds to that account.';

type Screen = Awaited<ReturnType<typeof render>>;

/** The chips under "Paid into" for the nth salary on the page: the group that holds "No account". */
function paidInto(screen: Screen, nth = 0, noAccount = 'No account') {
  const group = screen.getAllByLabelText(noAccount, RAW)[nth].parent;
  if (!group) throw new Error('Paid into has no chip group');
  const chips = within(group).getAllByRole('radio');
  return {
    labels: chips.map((chip) => chip.props.accessibilityLabel as string),
    lit: chips
      .filter((chip) => chip.props.accessibilityState?.selected)
      .map((chip) => chip.props.accessibilityLabel as string),
  };
}

const save = (screen: Screen, label = 'Save') => fireEvent.press(screen.getByText(label, RAW));

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
  mockPro = false;
  mockRows = [row];
  mockAccounts = [CHECKING, SAVINGS, CAPITAL];
});
afterAll(() => resetLocaleForTests());

describe('Paid into', () => {
  it('offers every account in account order, then "No account"', async () => {
    const screen = await render(<SalaryScreen />);

    expect(screen.getByText('Paid into')).toBeTruthy();
    expect(paidInto(screen).labels).toEqual([...ACCOUNT_LABELS, 'No account']);
  });

  it('names an account by its nickname and last four, or its bank when it has neither', async () => {
    mockAccounts = [CAPITAL, { ...CHECKING, nickname: null }];
    const screen = await render(<SalaryScreen />);

    expect(paidInto(screen).labels).toEqual(['Capital One', 'Chase ••7730', 'No account']);
  });

  it('lights "No account", and only it, for a salary paid into none', async () => {
    const screen = await render(<SalaryScreen />);

    expect(paidInto(screen).lit).toEqual(['No account']);
  });

  it('lights the one account a salary is paid into, and only it', async () => {
    mockRows = [linkedTo('acc2')];
    const screen = await render(<SalaryScreen />);

    expect(paidInto(screen).lit).toEqual(['Ally Savings ••9911']);
  });

  it.each([
    [['acc3', 'acc2'], 'Ally Savings ••9911'],
    [['acc2', 'acc1'], 'Chase Checking ••7730'],
    [['acc3', 'acc2', 'acc1'], 'Chase Checking ••7730'],
    [['acc3', 'acc1'], 'Chase Checking ••7730'],
  ])(
    'lights the first account in account order for a salary saved with %j, not the first saved',
    async (ids, shown) => {
      mockRows = [linkedTo(...ids)];
      const screen = await render(<SalaryScreen />);

      expect(paidInto(screen).lit).toEqual([shown]);
    },
  );

  it('ignores a link to an account that is gone, and lights "No account"', async () => {
    mockRows = [linkedTo('acc-deleted')];
    const screen = await render(<SalaryScreen />);

    expect(paidInto(screen).lit).toEqual(['No account']);
    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it('offers only "No account", lit, when there is no account to pay into', async () => {
    mockAccounts = [];
    const screen = await render(<SalaryScreen />);

    expect(paidInto(screen)).toEqual({ labels: ['No account'], lit: ['No account'] });
    expect(screen.getByText(HINT)).toBeTruthy();

    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: [] });
  });

  it('lights one account at a time as the person picks', async () => {
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('Chase Checking ••7730'));
    expect(paidInto(screen).lit).toEqual(['Chase Checking ••7730']);

    await fireEvent.press(screen.getByLabelText('Capital One'));
    expect(paidInto(screen).lit).toEqual(['Capital One']);

    await fireEvent.press(screen.getByLabelText('No account'));
    expect(paidInto(screen).lit).toEqual(['No account']);
  });

  it('saves exactly the account picked', async () => {
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('Ally Savings ••9911'));
    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledTimes(1);
    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc2'] });
  });

  it('saves the account picked in place of every account saved before', async () => {
    mockRows = [linkedTo('acc1', 'acc2')];
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('Capital One'));
    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc3'] });
  });

  it('saves the account lit again when the lit chip is pressed', async () => {
    mockRows = [linkedTo('acc2')];
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('Ally Savings ••9911'));
    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc2'] });
  });

  it('saves no account at all for "No account", and unlinks what was linked', async () => {
    mockRows = [linkedTo('acc1', 'acc2')];
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('No account'));
    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: [] });
  });

  it('saves the last choice made', async () => {
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('Chase Checking ••7730'));
    await fireEvent.press(screen.getByLabelText('No account'));
    await fireEvent.press(screen.getByLabelText('Ally Savings ••9911'));
    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc2'] });
  });

  it('leaves the links as saved when the person picks nothing, several included', async () => {
    mockRows = [linkedTo('acc3', 'acc2')];
    const screen = await render(<SalaryScreen />);

    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc3', 'acc2'] });
  });

  it('keeps each salary’s account to itself', async () => {
    mockPro = true;
    mockRows = [
      linkedTo('acc1'),
      { ...linkedTo('acc2'), id: 's2', name: 'Side job', frequency: 'weekly' },
    ];
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getAllByLabelText('Capital One')[1]);

    expect(paidInto(screen, 0).lit).toEqual(['Chase Checking ••7730']);
    expect(paidInto(screen, 1).lit).toEqual(['Capital One']);

    await save(screen);

    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc1'] });
    expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's2', accountIds: ['acc3'] });
  });

  it('starts a new pay on "No account", and saves the account picked for it', async () => {
    mockRows = [];
    const screen = await render(<SalaryScreen />);
    await fireEvent.press(screen.getByLabelText('Add a one-off pay'));

    expect(paidInto(screen).lit).toEqual(['No account']);

    await fireEvent.press(screen.getByText('Enter an amount'));
    for (const key of ['2', '5', '0', '0']) await fireEvent.press(screen.getByLabelText(key));
    await fireEvent.press(screen.getByText('Done'));
    await fireEvent.press(screen.getByLabelText('Chase Checking ••7730'));
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

    await fireEvent.press(screen.getByLabelText('Ally Savings ••9911'));
    expect(screen.queryByText(HINT)).toBeNull();

    await fireEvent.press(screen.getByLabelText('No account'));
    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it('is shown once for each salary that has no account', async () => {
    mockPro = true;
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

describe.each([
  {
    language: 'es' as const,
    currency: 'MXN' as const,
    paidInto: 'Se deposita en',
    noAccount: 'Ninguna cuenta',
    hint: 'Elige la cuenta donde llega y cada día de pago se sumará a esa cuenta.',
    save: 'Guardar',
  },
  {
    language: 'fr' as const,
    currency: 'CAD' as const,
    paidInto: 'Versée dans',
    noAccount: 'Aucun compte',
    hint: 'Choisis le compte où elle arrive, et chaque jour de paie s’y ajoutera.',
    save: 'Enregistrer',
  },
])('Paid into in $language', (w) => {
  beforeEach(() => {
    setLanguage(w.language);
    setCurrency(w.currency);
  });

  it('reads in the language, with the same accounts', async () => {
    const screen = await render(<SalaryScreen />);

    expect(screen.getByText(w.paidInto, RAW)).toBeTruthy();
    expect(paidInto(screen, 0, w.noAccount)).toEqual({
      labels: [...ACCOUNT_LABELS, w.noAccount],
      lit: [w.noAccount],
    });
    expect(screen.getByText(w.hint, RAW)).toBeTruthy();
    expect(screen.queryByText(HINT, RAW)).toBeNull();
    expect(screen.queryByText('No account', RAW)).toBeNull();
  });

  it('lights the first linked account in account order, and hides the hint', async () => {
    mockRows = [linkedTo('acc3', 'acc2')];
    const screen = await render(<SalaryScreen />);

    expect(paidInto(screen, 0, w.noAccount).lit).toEqual(['Ally Savings ••9911']);
    expect(screen.queryByText(w.hint, RAW)).toBeNull();
  });

  it('saves the same account ids English saves', async () => {
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('Capital One'));
    await save(screen, w.save);
    expect(mockSetAccounts).toHaveBeenLastCalledWith({ salaryId: 's1', accountIds: ['acc3'] });

    await fireEvent.press(screen.getByLabelText(w.noAccount, RAW));
    await save(screen, w.save);
    expect(mockSetAccounts).toHaveBeenLastCalledWith({ salaryId: 's1', accountIds: [] });
  });
});
