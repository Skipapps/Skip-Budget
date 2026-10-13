import { fireEvent, render, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { Linking } from 'react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import AboutScreen from '@/app/settings/about';
import PreferencesScreen from '@/app/settings/preferences';
import SupportScreen from '@/app/settings/support';
import YourMoneyScreen from '@/app/settings/your-money';
import { deleteAccount, signOut } from '@/api/auth';
import type { DialogRequest } from '@/components/ui/confirm-dialog';
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

// No store answer: the price line falls back to the US dollar labels.
let mockPro = { pro: false, ready: true };
jest.mock('@/api/pro-offer', () => ({ resetExitOfferForDev: jest.fn(async () => true) }));
jest.mock('@/api/pro', () => ({
  usePro: () => mockPro,
  useProPrices: () => ({ data: undefined }),
}));

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
  return { data: count === undefined ? undefined : Array.from({ length: count }, () => ({})) };
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
  { title: 'Support and feedback', href: '/settings/support' },
];

/** The tip link sits under Support: it opens a web page, so it has a small line and no route. */
const COFFEE = 'Buy a coffee for team. Keep Skip brewing';

/** What the first delete dialog says for the rows set in beforeEach, plus five recorded charges. */
const HELD =
  'This removes your account and everything you added. That includes 1 card, 2 bank accounts, 2 bills, 3 subscriptions, 4 receipts, 5 recorded charges, 1 salary source, and everything else, such as loans, savings, goals and spending habits. It cannot be undone.';

const PRO_TITLE = 'Cancel Skip Pro first?';
const MANAGE = 'Manage in the App Store';
const CONTINUE = 'Continue to delete';

/** Answers the next app dialog with the choice labelled so; null is the way out, "Keep my account". */
const answerDialog = (label: string | null) =>
  mockAsk.mockImplementationOnce(async (request: DialogRequest) =>
    label === null
      ? null
      : (request.actions?.find((action) => action.label === label)?.id ?? 'no such choice'),
  );

/** Every line of text on the page, top to bottom. */
const textsOf = (screen: Awaited<ReturnType<typeof render>>) =>
  screen.getAllByText(/./).map((node) => String(node.props.children));

const buttonLabels = (screen: Awaited<ReturnType<typeof render>>) =>
  screen.getAllByRole('button').map((node) => node.props.accessibilityLabel);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  mockPro = { pro: false, ready: true };
  mockRows = { bills: 2, subscriptions: 3, cards: 1, accounts: 2, salary: 1, receipts: 4 };
});

describe('Settings, the main page', () => {
  it('keeps Skip Pro and Profile above four rows and the coffee link, the account actions below, and Ask Sam last', async () => {
    const screen = await render(<SettingsScreen />);

    expect(buttonLabels(screen)).toEqual([
      'Skip Pro. Voice, Insights and more, $1.99/mo or $19.99/yr',
      // Development builds only, under Developer.
      'Show the one-time offer again. Leave the Pro page without buying to see it',
      'Profile picture. Pick one to show on your dashboard',
      ...PAGES.map((page) => page.title),
      COFFEE,
      'Sign out',
      'Delete account. Permanent, and it cannot be undone',
      'Ask Sam. Questions about Skip, answered right away',
    ]);
    expect(screen.getByDisplayValue('Sam')).toBeTruthy();
    // The development switches stay where they were, in development builds.
    expect(screen.getAllByRole('switch').map((node) => node.props.accessibilityLabel)).toEqual([
      'Fake Pro. Unlock Pro screens for testing, without buying',
      'Fake Free. See the free experience, even with an entitlement active',
    ]);
  });

  it('draws the four page rows with a title only, no summary line', async () => {
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
    ]) {
      expect(screen.queryByText(moved)).toBeNull();
    }
  });

  it('puts the coffee link directly under Support and feedback, in the same list', async () => {
    const screen = await render(<SettingsScreen />);

    const labels = buttonLabels(screen);
    expect(labels.indexOf(COFFEE)).toBe(labels.indexOf('Support and feedback') + 1);

    // Its small line sits under its title, as it did on the Support page.
    const row = screen.getByRole('button', { name: COFFEE });
    expect(
      within(row)
        .getAllByText(/./)
        .map((node) => node.props.children),
    ).toEqual(['Buy a coffee for team', 'Keep Skip brewing']);
  });

  it('opens the coffee page in the browser, not as a route of its own', async () => {
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: COFFEE }));

    expect(openBrowserAsync).toHaveBeenCalledTimes(1);
    expect(openBrowserAsync).toHaveBeenCalledWith('https://buymeacoffee.com/Weknd_team');
    expect(router.push).not.toHaveBeenCalled();
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

  it('opens Ask Sam from its button at the bottom', async () => {
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Ask Sam/ }));

    expect(router.push).toHaveBeenCalledWith('/ask-sam');
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
    expect(mockConfirm.mock.calls[0][0].message).toBe(HELD);
  });
});

describe('Settings, deleting the account', () => {
  const pressDelete = async (screen: Awaited<ReturnType<typeof render>>) =>
    fireEvent.press(screen.getByRole('button', { name: /^Delete account/ }));

  beforeEach(() => {
    mockRows.charges = 5;
  });

  it('takes a free account straight to the counts, with no Skip Pro question', async () => {
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<SettingsScreen />);

    await pressDelete(screen);

    expect(mockAsk).not.toHaveBeenCalled();
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockConfirm.mock.calls[0][0]).toMatchObject({
      title: 'Delete your account?',
      message: HELD,
      confirmLabel: 'Continue',
      cancelLabel: 'Keep my account',
      destructive: true,
    });
  });

  it('does not hold an account whose Skip Pro answer has not landed', async () => {
    mockPro = { pro: false, ready: false };
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<SettingsScreen />);

    await pressDelete(screen);

    expect(mockAsk).not.toHaveBeenCalled();
    expect(mockConfirm.mock.calls[0][0].title).toBe('Delete your account?');
  });

  it('asks a Skip Pro account to cancel first, before the counts', async () => {
    mockPro = { pro: true, ready: true };
    answerDialog(null);
    const screen = await render(<SettingsScreen />);

    await pressDelete(screen);

    expect(mockAsk).toHaveBeenCalledTimes(1);
    const request: DialogRequest = mockAsk.mock.calls[0][0];
    expect(request).toMatchObject({
      title: PRO_TITLE,
      message:
        'Deleting your account does not cancel Skip Pro. Apple keeps billing you until you cancel. Cancel it in your App Store subscriptions first. If you have already cancelled, you can go on.',
      cancelLabel: 'Keep my account',
    });
    // The safe choice is first, so it is the filled one; neither is red.
    expect(request.actions?.map((action) => action.label)).toEqual([MANAGE, CONTINUE]);
    expect(request.actions?.some((action) => action.destructive)).toBe(false);

    // "Keep my account" ends it there.
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(resetTo).not.toHaveBeenCalled();
  });

  it('opens the App Store subscriptions from Manage, and deletes nothing', async () => {
    mockPro = { pro: true, ready: true };
    answerDialog(MANAGE);
    const screen = await render(<SettingsScreen />);

    await pressDelete(screen);

    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith('https://apps.apple.com/account/subscriptions');
    expect(openBrowserAsync).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(resetTo).not.toHaveBeenCalled();
  });

  it('says the one failure line when the App Store cannot be opened, and deletes nothing', async () => {
    mockPro = { pro: true, ready: true };
    answerDialog(MANAGE);
    mockAsk.mockResolvedValueOnce('ok');
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('Unable to open URL'));
    // Development builds log the cause to Metro.
    const quiet = jest.spyOn(console, 'log').mockImplementation(() => {});
    const screen = await render(<SettingsScreen />);

    await pressDelete(screen);

    expect(Linking.openURL).toHaveBeenCalledWith('https://apps.apple.com/account/subscriptions');
    expect(mockAsk).toHaveBeenCalledTimes(2);
    expect(mockAsk.mock.calls[1][0]).toEqual({
      title: 'Something went wrong. Please try again.',
      cancelLabel: null,
    });
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(resetTo).not.toHaveBeenCalled();
    quiet.mockRestore();
  });

  it('asks again when they come back from the App Store and tap Delete account', async () => {
    mockPro = { pro: true, ready: true };
    answerDialog(MANAGE);
    answerDialog(CONTINUE);
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<SettingsScreen />);

    await pressDelete(screen);
    await pressDelete(screen);

    expect(mockAsk.mock.calls.map(([request]) => request.title)).toEqual([PRO_TITLE, PRO_TITLE]);
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('goes on to the counts from Continue to delete', async () => {
    mockPro = { pro: true, ready: true };
    answerDialog(CONTINUE);
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<SettingsScreen />);

    await pressDelete(screen);

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockConfirm.mock.calls[0][0]).toMatchObject({
      title: 'Delete your account?',
      message: HELD,
    });
    expect(mockAsk.mock.invocationCallOrder[0]).toBeLessThan(
      mockConfirm.mock.invocationCallOrder[0],
    );
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('deletes a Skip Pro account only after Continue, the counts and the final warning', async () => {
    mockPro = { pro: true, ready: true };
    answerDialog(CONTINUE);
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    const screen = await render(<SettingsScreen />);

    await pressDelete(screen);

    expect(mockConfirm.mock.calls.map(([options]) => options.title)).toEqual([
      'Delete your account?',
      'Delete everything, for good?',
    ]);
    expect(mockConfirm.mock.calls[1][0]).toMatchObject({
      message:
        'There is no way back from here. A few records outside Skip, such as crash reports, can stay.',
      confirmLabel: 'Delete everything',
      cancelLabel: 'Keep my account',
      destructive: true,
    });
    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(resetTo).toHaveBeenCalledWith('/welcome');
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('says it removes the account and everything added, when nothing is counted', async () => {
    mockRows = {};
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<SettingsScreen />);

    await pressDelete(screen);

    expect(mockConfirm.mock.calls[0][0].message).toBe(
      'This removes your account and everything you added to Skip. It cannot be undone.',
    );
  });
});

describe('Settings, Preferences', () => {
  it('shows exactly its six items, each with its small line and control', async () => {
    const screen = await render(<PreferencesScreen />);

    expect(textsOf(screen)).toEqual([
      'Preferences',
      'Appearance',
      'Follows your phone',
      'Light',
      'Dark',
      'System',
      'Language',
      'English',
      'Same as my phone',
      'English',
      'Español',
      'Français',
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
      '/bills',
      '/subscriptions',
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
  it('shows exactly its four items, each with its small line', async () => {
    const screen = await render(<SupportScreen />);

    expect(textsOf(screen)).toEqual([
      'Support and feedback',
      'Getting started',
      'Put the setup steps back on Home',
      'Ask Sam',
      'Questions about Skip, answered right away',
      'Email support',
      'Something is wrong or unclear',
      'Share an idea',
      'What should Skip do next?',
    ]);
    // The tip link moved to the main Settings page, under this one.
    expect(screen.queryByText('Buy a coffee for team')).toBeNull();
  });

  it('puts the setup steps back and lands on the Home tab', async () => {
    const screen = await render(<SupportScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /^Getting started/ }));

    // The second argument carries the toast that says it worked.
    expect(mockMutate).toHaveBeenCalledWith(
      { getting_started_dismissed_at: null },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(router.dismissTo).toHaveBeenCalledWith('/home');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('opens each help page, and has no coffee link of its own', async () => {
    const screen = await render(<SupportScreen />);

    for (const name of [/^Ask Sam/, /^Email support/, /^Share an idea/]) {
      await fireEvent.press(screen.getByRole('button', { name }));
    }

    expect(jest.mocked(router.push).mock.calls.map(([href]) => href)).toEqual([
      '/ask-sam',
      '/contact?topic=support',
      '/contact?topic=idea',
    ]);
    expect(openBrowserAsync).not.toHaveBeenCalled();
  });

  it('no longer offers the What Skip can do tour', async () => {
    const screen = await render(<SupportScreen />);

    expect(screen.queryByText('What Skip can do')).toBeNull();
  });
});
