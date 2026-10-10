import { fireEvent, render, within } from '@testing-library/react-native';

import SalaryScreen from '@/app/salary';

/**
 * The Salary page's "Total per month" card carries the salary gradient icon, the same light/dark
 * pair as the Cards tab, picked by the app's own Light/Dark/System setting. The icon is decoration:
 * VoiceOver reads the label and the figure, never the drawing. Under a line, it says the soonest
 * payday of any schedule and how many schedules there are; one-off pays are neither.
 */

function mockSvg(file: string) {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => createElement(View, { testID: `svg-${file}` }) };
}
jest.mock('../../../assets/gradient-icons/salary.svg', () => mockSvg('salary'));
jest.mock('../../../assets/gradient-icons/salary-dark.svg', () => mockSvg('salary-dark'));

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: mockScheme }),
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accentInk: '#905479' }),
}));

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// The real SDK starts a cleanup interval that holds Jest open.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: () => {},
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => true) }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-08', todayDate: new Date('2026-10-08T00:00:00') }),
}));
jest.mock('@/api/pay', () => ({
  recordDuePay: jest.fn(async () => 0),
  usePastPay: () => ({ choose: jest.fn(), apply: jest.fn(), saving: false }),
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('@/api/mutations', () => {
  const idle = () => ({ mutateAsync: jest.fn(), isPending: false });
  return {
    useCreateSalarySource: idle,
    useUpdateSalarySource: idle,
    useDeleteSalarySource: idle,
    useSetSalaryAccounts: idle,
  };
});

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
    data: [{ id: 'acc1', bank_name: 'Chase', nickname: 'Chase', last4: '7010' }],
  }),
}));

type Node = { props: Record<string, unknown>; parent: Node | null };

function hiddenFromVoiceOver(node: Node | null): boolean {
  for (let at = node; at; at = at.parent) {
    if (at.props.accessibilityElementsHidden) return true;
  }
  return false;
}

// 8 October 2026: the next paydays count forward from today.
jest.useFakeTimers().setSystemTime(new Date('2026-10-08T10:00:00'));

beforeEach(() => {
  mockScheme = 'light';
  mockRows = [row];
});

describe.each([
  ['light', 'salary', 'salary-dark'],
  ['dark', 'salary-dark', 'salary'],
] as const)('in %s mode', (scheme, drawn, other) => {
  it(`draws ${drawn} in the Total per month card, hidden from VoiceOver`, async () => {
    mockScheme = scheme;
    const screen = await render(<SalaryScreen />);

    const card = screen.getByTestId('salary-total-card');
    const icon = within(card).getByTestId(`svg-${drawn}`, { includeHiddenElements: true });
    expect(screen.queryByTestId(`svg-${other}`, { includeHiddenElements: true })).toBeNull();
    // Out of reach of VoiceOver, while the words beside it are not.
    expect(screen.queryByTestId(`svg-${drawn}`)).toBeNull();
    expect(hiddenFromVoiceOver(icon)).toBe(true);
    expect(hiddenFromVoiceOver(within(card).getByText('Total per month'))).toBe(false);
    expect(within(card).getByText('Total per month')).toBeTruthy();
    // Twice a month: 2 × $1,850.
    expect(within(card).getByText('$3,700.00')).toBeTruthy();
  });
});

it('keeps what one-off pays added this month inside the card, under the total', async () => {
  mockRows = [
    row,
    { ...row, id: 'o1', name: '', amount: 400, frequency: 'once', last_payday: '2026-10-02' },
  ];
  const screen = await render(<SalaryScreen />);

  const card = screen.getByTestId('salary-total-card');
  expect(within(card).getByText('$3,700.00')).toBeTruthy();
  expect(within(card).getByText('+ $400.00 paid once this month')).toBeTruthy();
});

describe('The line under the total', () => {
  const footer = (screen: Awaited<ReturnType<typeof render>>) =>
    within(screen.getByTestId('salary-total-card')).queryByText(/source/);

  it('says the next payday and the one source, as the design shows it', async () => {
    const screen = await render(<SalaryScreen />);

    // Twice a month from 30 September: the 15th is next.
    expect(footer(screen)?.props.children).toBe('Next payday 15 Oct · 1 source');
  });

  it('says the soonest payday of all the sources, and counts them', async () => {
    mockRows = [
      row,
      { ...row, id: 's2', name: 'Weekend job', frequency: 'weekly', last_payday: '2026-10-03' },
    ];
    const screen = await render(<SalaryScreen />);

    expect(footer(screen)?.props.children).toBe('Next payday 10 Oct · 2 sources');
  });

  it('counts no one-off pay as a source, nor takes its day as a payday', async () => {
    mockRows = [
      row,
      { ...row, id: 'o1', name: '', amount: 400, frequency: 'once', last_payday: '2026-10-09' },
    ];
    const screen = await render(<SalaryScreen />);

    expect(footer(screen)?.props.children).toBe('Next payday 15 Oct · 1 source');
  });

  it('counts the sources alone while none has a last payday', async () => {
    mockRows = [{ ...row, last_payday: null }];
    const screen = await render(<SalaryScreen />);

    expect(footer(screen)?.props.children).toBe('1 source');
  });

  it('counts a source only once Save would keep it, not as soon as Add source is tapped', async () => {
    const screen = await render(<SalaryScreen />);

    await fireEvent.press(screen.getByLabelText('Add source'));

    expect(footer(screen)?.props.children).toBe('Next payday 15 Oct · 1 source');
  });

  it('draws no line when there are only one-off pays', async () => {
    mockRows = [{ ...row, id: 'o1', frequency: 'once', last_payday: '2026-10-02' }];
    const screen = await render(<SalaryScreen />);

    expect(footer(screen)).toBeNull();
  });
});
