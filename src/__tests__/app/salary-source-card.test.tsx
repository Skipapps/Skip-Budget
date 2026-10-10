import { fireEvent, render } from '@testing-library/react-native';

import SalaryScreen from '@/app/salary';

/**
 * A salary source's card, as the design draws it. Pinned:
 * - "Source 1" over the name, with a pencil that renames it in place; a source with no name yet
 *   shows its name field, optional for a one-off pay.
 * - Fixed pay / Hourly is one two-part switch.
 * - The Amount box opens the keypad, its calculator glyph opens the calculator.
 * - How often and Last payday open their choices inside the card, never over the page, one at a
 *   time, and close on a pick; each row says what is chosen and whether it is open.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// The real SDK starts a cleanup interval that holds Jest open.
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
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => true) }));
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

const mockUpdate = jest.fn(async (_input: { id: string; values: Record<string, unknown> }) => ({}));
jest.mock('@/api/mutations', () => ({
  useCreateSalarySource: () => ({ mutateAsync: jest.fn(async () => ({ id: 'new' })) }),
  useUpdateSalarySource: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSalarySource: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: jest.fn(async () => ({})), isPending: false }),
}));

const row = {
  id: 's1',
  name: 'Komal Chase',
  amount: 1850,
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

let mockRows: unknown[] = [row];
jest.mock('@/api/queries', () => ({
  useSalaryDetails: () => ({
    data: { rows: mockRows, hourlyAvailable: true },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useBankAccounts: () => ({
    data: [{ id: 'acc1', bank_name: 'Chase', nickname: null, last4: '7010', color: '#1D6FD8' }],
  }),
}));

// 8 October 2026.
jest.useFakeTimers().setSystemTime(new Date('2026-10-08T10:00:00'));

type Screen = Awaited<ReturnType<typeof render>>;

/** Every kind of view drawn, so a test can tell whether anything opened over the page. */
function drawnTypes(screen: Screen): string[] {
  const types: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const { type, children } = node as { type?: unknown; children?: unknown };
    if (typeof type === 'string') types.push(type);
    walk(children);
  };
  walk(screen.toJSON());
  return types;
}
const overPage = (screen: Screen) => drawnTypes(screen).filter((type) => /Modal/.test(type));

/** The Last payday row, whose spoken label carries its note. */
const LAST_PAYDAY = /^Last payday/;

const valueOf = (screen: Screen, label: string | RegExp, nth = 0) =>
  screen.getAllByLabelText(label)[nth].props.accessibilityValue?.text as string;
const expandedOf = (screen: Screen, label: string | RegExp, nth = 0) =>
  screen.getAllByLabelText(label)[nth].props.accessibilityState?.expanded as boolean | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  mockRows = [row];
});

describe('The card header', () => {
  it('shows "Source 1" over the name, with rename and remove buttons', async () => {
    const screen = await render(<SalaryScreen />);

    expect(screen.getByText('Source 1')).toBeTruthy();
    expect(screen.getByText('Komal Chase')).toBeTruthy();
    expect(screen.queryByDisplayValue('Komal Chase')).toBeNull();
    expect(screen.getByLabelText('Rename Komal Chase')).toBeTruthy();
    expect(screen.getByLabelText('Remove source 1')).toBeTruthy();
  });

  it('renames in place: the pencil opens the name, and leaving it shows the new title', async () => {
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('Rename Komal Chase'));
    const field = screen.getByDisplayValue('Komal Chase');
    expect(field.props.autoFocus).toBe(true);
    expect(screen.queryByLabelText('Rename Komal Chase')).toBeNull();

    await fireEvent.changeText(field, 'Komal Chase Bank');
    await fireEvent(screen.getByDisplayValue('Komal Chase Bank'), 'blur');

    expect(screen.queryByDisplayValue('Komal Chase Bank')).toBeNull();
    expect(screen.getByText('Komal Chase Bank')).toBeTruthy();

    await fireEvent.press(screen.getByText('Save'));
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 's1',
      values: expect.objectContaining({ name: 'Komal Chase Bank' }),
    });
  });

  it('keeps the name a field while it is empty, so a source is never left with no title', async () => {
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('Rename Komal Chase'));
    await fireEvent.changeText(screen.getByDisplayValue('Komal Chase'), '');
    await fireEvent(screen.getByDisplayValue(''), 'submitEditing');

    expect(screen.getByDisplayValue('')).toBeTruthy();
    expect(screen.getByText('Name')).toBeTruthy();

    // Still a field as the new name is typed: the first letter does not turn it into a title.
    await fireEvent.changeText(screen.getByDisplayValue(''), 'K');
    expect(screen.getByDisplayValue('K')).toBeTruthy();
  });

  it('opens a new source on its name field, not focused, and a one-off pay’s as optional', async () => {
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('Add source'));

    expect(screen.getByText('Source 2')).toBeTruthy();
    expect(screen.getByDisplayValue('').props.autoFocus).toBe(false);
    expect(screen.queryByText('(optional)')).toBeNull();

    await fireEvent.press(screen.getAllByLabelText('How often')[1]);
    await fireEvent.press(screen.getByLabelText('Just this time'));

    expect(screen.getByText('One-off pay')).toBeTruthy();
    expect(screen.getByText('(optional)')).toBeTruthy();
  });
});

describe('The pay', () => {
  it('is one two-part switch for fixed pay or hourly', async () => {
    const screen = await render(<SalaryScreen />);

    const fixed = screen.getByLabelText('Fixed pay');
    const hourly = screen.getByLabelText('Hourly');
    expect(fixed.props.accessibilityRole).toBe('radio');
    expect(fixed.props.accessibilityState).toEqual({ selected: true, checked: true });
    expect(hourly.props.accessibilityState).toEqual({ selected: false, checked: false });

    await fireEvent.press(hourly);

    expect(screen.getByLabelText('Hourly').props.accessibilityState.selected).toBe(true);
    expect(screen.getByText('Hourly rate')).toBeTruthy();
    expect(screen.queryByLabelText('Amount')).toBeNull();
  });

  it('shows the amount in its box, which opens the keypad, and the calculator its own page', async () => {
    const screen = await render(<SalaryScreen />);

    expect(valueOf(screen, 'Amount')).toBe('$1,850.00');

    await fireEvent.press(screen.getByLabelText('Amount'));
    expect(screen.getByText('Salary amount')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Back'));

    await fireEvent.press(screen.getByLabelText('Open calculator'));
    expect(overPage(screen).length).toBeGreaterThan(0);
    expect(screen.getByText('=')).toBeTruthy();
  });
});

describe('The rows', () => {
  it('say what is chosen, as the design shows it', async () => {
    const screen = await render(<SalaryScreen />);

    expect(valueOf(screen, 'How often')).toBe('Twice a month');
    expect(valueOf(screen, LAST_PAYDAY)).toBe('30 Sep 2026');
    expect(screen.getByText('Next payday 15 Oct 2026')).toBeTruthy();
    expect(valueOf(screen, 'Paid into')).toBe('Chase ••7010');
  });

  it('opens How often inside the card, not over the page, and closes on a pick', async () => {
    const screen = await render(<SalaryScreen />);
    expect(expandedOf(screen, 'How often')).toBe(false);
    expect(screen.queryByLabelText('Weekly')).toBeNull();

    await fireEvent.press(screen.getByLabelText('How often'));

    expect(expandedOf(screen, 'How often')).toBe(true);
    expect(overPage(screen)).toEqual([]);
    expect(screen.getByLabelText('Twice a month').props.accessibilityState.selected).toBe(true);

    await fireEvent.press(screen.getByLabelText('Weekly'));

    expect(expandedOf(screen, 'How often')).toBe(false);
    expect(screen.queryByLabelText('Monthly')).toBeNull();
    expect(valueOf(screen, 'How often')).toBe('Weekly');
  });

  it('opens a calendar inside the card for the last payday, and closes on a day', async () => {
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText(LAST_PAYDAY));

    expect(expandedOf(screen, LAST_PAYDAY)).toBe(true);
    expect(overPage(screen)).toEqual([]);

    await fireEvent.press(screen.getByLabelText('Next month'));
    await fireEvent.press(screen.getByLabelText(/Friday 2 October 2026$/));

    expect(expandedOf(screen, LAST_PAYDAY)).toBe(false);
    expect(valueOf(screen, LAST_PAYDAY)).toBe('2 Oct 2026');
    expect(screen.getByText('Next payday 15 Oct 2026')).toBeTruthy();
  });

  it('keeps one row open at a time, and a second press closes it', async () => {
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('How often'));
    await fireEvent.press(screen.getByLabelText(LAST_PAYDAY));

    expect(expandedOf(screen, 'How often')).toBe(false);
    expect(expandedOf(screen, LAST_PAYDAY)).toBe(true);

    await fireEvent.press(screen.getByLabelText(LAST_PAYDAY));
    expect(expandedOf(screen, LAST_PAYDAY)).toBe(false);
  });

  it('reads the note under a label to VoiceOver with the label', async () => {
    const screen = await render(<SalaryScreen />);

    expect(screen.getByLabelText('Last payday, Next payday 15 Oct 2026')).toBeTruthy();
    // A row with no note is its label alone.
    expect(screen.getByLabelText('How often')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('How often'));
    await fireEvent.press(screen.getByLabelText('Just this time'));
    expect(screen.getByLabelText('Paid on, Counts once, in the month it was paid')).toBeTruthy();
  });

  it('asks for a last payday a new source does not have yet', async () => {
    mockRows = [];
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('Add source'));

    expect(valueOf(screen, 'How often')).toBe('Monthly');
    expect(valueOf(screen, LAST_PAYDAY)).toBe('Pick the most recent one');
    expect(valueOf(screen, 'Paid into')).toBe('No account');
  });
});
