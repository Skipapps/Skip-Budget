import { fireEvent, render, waitFor } from '@testing-library/react-native';

import PreferencesScreen from '@/app/settings/preferences';
import { authenticate, lockCapability } from '@/lib/app-lock';
import { PreferencesProvider } from '@/providers/preferences-provider';
import { ThemeProvider } from '@/providers/theme-provider';

/**
 * The Preferences page with the real theme and preference stores over a fake phone storage: a
 * choice made there is written down and is still there when the page is opened again.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map((key) => [key, mockStore.get(key) ?? null])),
    ),
  },
}));

jest.mock('@/lib/app-lock', () => ({
  lockCapability: jest.fn(),
  authenticate: jest.fn(),
  unavailableMessage: jest.requireActual('@/lib/app-lock').unavailableMessage,
}));

const mockAsk = jest.fn(() => Promise.resolve(null));
jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => mockAsk }));

const open = () =>
  render(
    <ThemeProvider>
      <PreferencesProvider>
        <PreferencesScreen />
      </PreferencesProvider>
    </ThemeProvider>,
  );

type View = Awaited<ReturnType<typeof open>>;

const chip = (view: View, name: string) => view.getByRole('radio', { name });
const haptics = (view: View) =>
  view.getByRole('switch', { name: 'Haptics. A tap when you press something' });
const appLock = (view: View) =>
  view.getByRole('switch', { name: 'App lock. Face ID before Skip opens' });
const isOn = (node: { props: { accessibilityState?: { checked?: boolean } } }) =>
  node.props.accessibilityState?.checked;

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('Preferences, kept on the phone', () => {
  it('keeps the appearance chosen with the chips', async () => {
    const first = await open();
    await waitFor(() => expect(first.getByText('Follows your phone')).toBeTruthy());

    await fireEvent.press(chip(first, 'Dark'));

    expect(first.getByText('Always dark')).toBeTruthy();
    expect(mockStore.get('skip.theme.mode')).toBe('dark');
    await first.unmount();

    const again = await open();
    await waitFor(() => expect(again.getByText('Always dark')).toBeTruthy());
    expect(chip(again, 'Dark').props.accessibilityState).toMatchObject({ selected: true });
    expect(chip(again, 'System').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('keeps haptics off once switched off', async () => {
    const first = await open();
    await waitFor(() => expect(isOn(haptics(first))).toBe(true));

    await fireEvent.press(haptics(first));

    expect(isOn(haptics(first))).toBe(false);
    expect(mockStore.get('skip.prefs.haptics')).toBe('false');
    await first.unmount();

    const again = await open();
    await waitFor(() => expect(isOn(haptics(again))).toBe(false));
  });
});

describe('Preferences, app lock', () => {
  it('says why when the phone cannot lock, and stays off', async () => {
    jest.mocked(lockCapability).mockResolvedValue({ available: false, reason: 'not-enrolled' });
    const view = await open();

    await fireEvent.press(appLock(view));

    await waitFor(() =>
      expect(mockAsk).toHaveBeenCalledWith({
        title: 'App lock is not available',
        message: 'Set up Face ID or Touch ID in your phone’s settings first, then come back.',
        cancelLabel: null,
      }),
    );
    expect(authenticate).not.toHaveBeenCalled();
    expect(isOn(appLock(view))).toBe(false);
    expect(mockStore.has('skip.prefs.appLock')).toBe(false);
  });

  it('turns on only after a scan, is kept, and turns off without one', async () => {
    jest.mocked(lockCapability).mockResolvedValue({ available: true, label: 'Face ID' });
    jest.mocked(authenticate).mockResolvedValue(true);
    const first = await open();

    await fireEvent.press(appLock(first));

    await waitFor(() => expect(isOn(appLock(first))).toBe(true));
    expect(authenticate).toHaveBeenCalledWith('Turn on Face ID for Skip');
    expect(mockStore.get('skip.prefs.appLock')).toBe('true');
    await first.unmount();

    const again = await open();
    await waitFor(() => expect(isOn(appLock(again))).toBe(true));

    await fireEvent.press(appLock(again));

    expect(isOn(appLock(again))).toBe(false);
    expect(mockStore.get('skip.prefs.appLock')).toBe('false');
    expect(authenticate).toHaveBeenCalledTimes(1);
  });

  it('stays off when the scan fails', async () => {
    jest.mocked(lockCapability).mockResolvedValue({ available: true, label: 'Face ID' });
    jest.mocked(authenticate).mockResolvedValue(false);
    const view = await open();

    await fireEvent.press(appLock(view));

    await waitFor(() => expect(authenticate).toHaveBeenCalledTimes(1));
    expect(isOn(appLock(view))).toBe(false);
    expect(mockStore.has('skip.prefs.appLock')).toBe(false);
  });
});
