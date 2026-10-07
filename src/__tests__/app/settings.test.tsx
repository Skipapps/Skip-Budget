import { fireEvent, render, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';

import SettingsScreen from '@/app/(tabs)/settings';
import AboutScreen from '@/app/settings/about';
import PreferencesScreen from '@/app/settings/preferences';
import SupportScreen from '@/app/settings/support';
import YourMoneyScreen from '@/app/settings/your-money';
import { signOut } from '@/api/auth';
import { resetTo } from '@/lib/nav';

/**
 * Settings is one short page: Skip Pro, Profile, four rows that each open a page of their own, and
 * the account actions. Every item the four sections used to hold lives on exactly one of those
 * pages, with its small line, and still goes where it went.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: () => true,
  },
}));

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.4.2' } },
}));

// Both draw bundled images, which Jest's @/ mapping cannot reach outside src.
jest.mock('@/components/settings/coffee-mark', () => ({ CoffeeMark: () => null }));
jest.mock('@/components/ui/profile-avatar', () => ({ ProfileAvatar: () => null }));
jest.mock('@/theme/avatars', () => ({ findAvatar: () => undefined }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#333333',
    muted: '#777777',
    line: '#DDDDDD',
    danger: '#DC2626',
    moneyIn: '#16A34A',
  }),
  useTheme: () => ({ mode: 'system', setMode: jest.fn() }),
}));

jest.mock('@/providers/preferences-provider', () => ({
  usePreferences: () => ({
    haptics: true,
    setHaptics: jest.fn(),
    appLock: false,
    setAppLock: jest.fn(),
  }),
}));

const mockAsk = jest.fn();
const mockConfirm = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({
  useDialog: () => mockAsk,
  useConfirm: () => mockConfirm,
}));

jest.mock('@/api/auth', () => ({
  signOut: jest.fn(() => Promise.resolve()),
  deleteAccount: jest.fn(() => Promise.resolve({ error: null })),
}));

jest.mock('@/lib/nav', () => ({ resetTo: jest.fn() }));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: false }) }));

jest.mock('@/lib/pro-bypass', () => ({
  useProOverride: () => 'off',
  setProOverride: jest.fn(),
}));

const mockMutate = jest.fn();
jest.mock('@/api/mutations', () => ({
  useUpdateProfile: () => ({ mutate: mockMutate, isPending: false }),
}));

/** Row counts per table, set per test; undefined is a read that has not landed. */
let mockRows: Record<string, number | undefined> = {};
// A declaration, so it is defined when the hoisted factories below run.
function mockRead(table: string) {
  const count = mockRows[table];
  return { data: count === undefined ? undefined : Array.from({ length: count }) };
}
jest.mock('@/api/queries', () => ({
  useProfile: () => ({ data: { display_name: 'Sam', avatar_id: null } }),
  useBills: () => mockRead('bills'),
  useSubscriptions: () => mockRead('subscriptions'),
  useCards: () => mockRead('cards'),
  useBankAccounts: () => mockRead('accounts'),
  useSalarySources: () => mockRead('salary'),
  useReceipts: () => mockRead('receipts'),
}));
jest.mock('@/api/charges', () => ({ useCharges: () => mockRead('charges') }));

const PAGES = [
  { title: 'Preferences', href: '/settings/preferences' },
  { title: 'Your money', href: '/settings/your-money' },
  { title: 'About', href: '/settings/about' },
  { title: 'Support', href: '/settings/support' },
];

/** Every line of text on the page, top to bottom. */
const textsOf = (screen: Awaited<ReturnType<typeof render>>) =>
  screen.getAllByText(/./).map((node) => String(node.props.children));

const buttonLabels = (screen: Awaited<ReturnType<typeof render>>) =>
  screen.getAllByRole('button').map((node) => node.props.accessibilityLabel);

beforeEach(() => {
  jest.clearAllMocks();
  mockRows = { bills: 2, subscriptions: 3, cards: 1, accounts: 2, salary: 1, receipts: 4 };
});

describe('Settings, the main page', () => {
  it('keeps Skip Pro and Profile above four rows, and the account actions below them', async () => {
    const screen = await render(<SettingsScreen />);

    expect(buttonLabels(screen)).toEqual([
      'Skip Pro. Unlimited everything, $1.99/mo or $19.99/yr',
      'Profile picture. Pick one to show on your dashboard',
      ...PAGES.map((page) => page.title),
      'Sign out',
      'Delete account. Permanent, and it cannot be undone',
    ]);
    expect(screen.getByDisplayValue('Sam')).toBeTruthy();
    // The development switches stay where they were, in development builds.
    expect(screen.getAllByRole('switch').map((node) => node.props.accessibilityLabel)).toEqual([
      'Fake Pro. Unlock Pro screens for testing, without buying',
      'Fake Free. See the free experience, even with an entitlement active',
    ]);
  });

  it('draws the four rows with a title only, no summary line', async () => {
    const screen = await render(<SettingsScreen />);

    for (const page of PAGES) {
      const row = screen.getByRole('button', { name: page.title });
      expect(
        within(row)
          .getAllByText(/./)
          .map((node) => node.props.children),
      ).toEqual([page.title]);
    }
  });

  it('holds none of the items that moved onto the four pages', async () => {
    const screen = await render(<SettingsScreen />);

    for (const moved of [
      'Appearance',
      'Haptics',
      'App lock',
      'Reminders',
      'Bills',
      'Subscriptions',
      'Cards and accounts',
      'Payday',
      'Privacy policy',
      'Terms of service',
      'Version',
      'Getting started',
      'Common questions',
      'What Skip can do',
      'Email support',
      'Share an idea',
      'Buy a coffee for team',
      'Support and feedback',
    ]) {
      expect(screen.queryByText(moved)).toBeNull();
    }
  });

  it('opens each page from its row, pushed above the tabs', async () => {
    const screen = await render(<SettingsScreen />);

    for (const page of PAGES) {
      await fireEvent.press(screen.getByRole('button', { name: page.title }));
    }

    expect(jest.mocked(router.push).mock.calls.map(([href]) => href)).toEqual(
      PAGES.map((page) => page.href),
    );
  });

  it('still opens Skip Pro and the profile picture', async () => {
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Skip Pro/ }));
    await fireEvent.press(screen.getByRole('button', { name: /^Profile picture/ }));

    expect(jest.mocked(router.push).mock.calls.map(([href]) => href)).toEqual(['/pro', '/avatar']);
  });

  it('signs out to the welcome page', async () => {
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(resetTo).toHaveBeenCalledWith('/welcome');
  });

  it('still counts everything held before deleting the account', async () => {
    mockConfirm.mockResolvedValue(false);
    mockRows.charges = 5;
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Delete account/ }));

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockConfirm.mock.calls[0][0].message).toBe(
      'This removes 1 card, 2 bank accounts, 2 bills, 3 subscriptions, 4 receipts, 5 recorded charges, 1 salary source — everything Skip holds for you. It cannot be undone.',
    );
  });
});

describe('Settings, Preferences', () => {
  it('shows exactly its four items, each with its small line and control', async () => {
    const screen = await render(<PreferencesScreen />);

    expect(textsOf(screen)).toEqual([
      'Preferences',
      'Appearance',
      'Follows your phone',
      'Light',
      'Dark',
      'System',
      'Haptics',
      'A tap when you press something',
      'App lock',
      'Face ID before Skip opens',
      'Reminders',
      'Before a renewal, a bill or payday',
    ]);
    expect(screen.getAllByRole('switch').map((node) => node.props.accessibilityLabel)).toEqual([
      'Haptics. A tap when you press something',
      'App lock. Face ID before Skip opens',
    ]);
    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();
  });

  it('opens Reminders', async () => {
    const screen = await render(<PreferencesScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Reminders/ }));

    expect(router.push).toHaveBeenCalledWith('/reminders');
  });
});

describe('Settings, Your money', () => {
  it('shows exactly its four items, with their counts', async () => {
    const screen = await render(<YourMoneyScreen />);

    expect(textsOf(screen)).toEqual([
      'Your money',
      'Bills',
      '2 recurring bills',
      'Subscriptions',
      '3 tracked',
      'Cards and accounts',
      '1 card · 2 bank accounts',
      'Payday',
      '1 salary source',
    ]);
  });

  it('says so when there is nothing yet, as before', async () => {
    mockRows = {};
    const screen = await render(<YourMoneyScreen />);

    expect(textsOf(screen)).toEqual([
      'Your money',
      'Bills',
      'None yet',
      'Subscriptions',
      'None yet',
      'Cards and accounts',
      '0 cards · 0 bank accounts',
      'Payday',
      'Not set up yet',
    ]);
  });

  it('opens each list, and the Cards tab without stacking a second tab bar', async () => {
    const screen = await render(<YourMoneyScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Bills/ }));
    await fireEvent.press(screen.getByRole('button', { name: /^Subscriptions/ }));
    await fireEvent.press(screen.getByRole('button', { name: /^Cards and accounts/ }));
    await fireEvent.press(screen.getByRole('button', { name: /^Payday/ }));

    expect(jest.mocked(router.push).mock.calls.map(([href]) => href)).toEqual([
      '/bill-plans',
      '/subscription-plans',
      '/salary',
    ]);
    expect(router.dismissTo).toHaveBeenCalledWith('/cards');
  });
});

describe('Settings, About', () => {
  it('shows exactly its three items, with the version', async () => {
    const screen = await render(<AboutScreen />);

    expect(textsOf(screen)).toEqual([
      'About',
      'Privacy policy',
      'What is stored, and who else can see it',
      'Terms of service',
      'Version',
      '1.4.2',
    ]);
    expect(screen.queryByRole('button', { name: 'Version' })).toBeNull();
  });

  it('opens the policy and the terms', async () => {
    const screen = await render(<AboutScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Privacy policy/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Terms of service' }));

    expect(jest.mocked(router.push).mock.calls.map(([href]) => href)).toEqual([
      '/privacy',
      '/terms',
    ]);
  });
});

describe('Settings, Support', () => {
  it('shows exactly its six items, each with its small line', async () => {
    const screen = await render(<SupportScreen />);

    expect(textsOf(screen)).toEqual([
      'Support',
      'Getting started',
      'Put the setup steps back on Home',
      'Common questions',
      'Short answers, no waiting',
      'What Skip can do',
      'The five things, each a tap away',
      'Email support',
      'Something is wrong or unclear',
      'Share an idea',
      'What should Skip do next?',
      'Buy a coffee for team',
      'Keep Skip brewing',
    ]);
  });

  it('puts the setup steps back and lands on the Home tab', async () => {
    const screen = await render(<SupportScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Getting started/ }));

    expect(mockMutate).toHaveBeenCalledWith({ getting_started_dismissed_at: null });
    expect(router.dismissTo).toHaveBeenCalledWith('/home');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('opens each help page, and the coffee page in the browser', async () => {
    const screen = await render(<SupportScreen />);

    for (const name of [
      /^Common questions/,
      /^What Skip can do/,
      /^Email support/,
      /^Share an idea/,
      /^Buy a coffee/,
    ]) {
      await fireEvent.press(screen.getByRole('button', { name }));
    }

    expect(jest.mocked(router.push).mock.calls.map(([href]) => href)).toEqual([
      '/faq',
      '/tour',
      '/contact?topic=support',
      '/contact?topic=idea',
    ]);
    expect(openBrowserAsync).toHaveBeenCalledWith('https://buymeacoffee.com/Weknd_team');
  });
});
