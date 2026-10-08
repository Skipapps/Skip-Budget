import { fireEvent, render, waitFor } from '@testing-library/react-native';

import PreferencesScreen from '@/app/settings/preferences';
import { LocaleProvider } from '@/i18n/locale-provider';
import { CURRENCY_KEY, LANGUAGE_KEY } from '@/i18n/persistence';
import { getLocaleSnapshot, resetLocaleForTests } from '@/i18n/store';
import { PreferencesProvider } from '@/providers/preferences-provider';
import { ThemeProvider } from '@/providers/theme-provider';

/**
 * Language in Preferences: a choice is applied at once, written to the phone, and "Same as my
 * phone" hands the decision back to the phone. There is no currency choice: the currency is the one
 * the phone implied at first launch, pinned, and never offered.
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
    removeItem: jest.fn((key: string) => {
      mockStore.delete(key);
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
  unavailableMessage: jest.fn(),
}));

jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => jest.fn() }));

const open = () =>
  render(
    <ThemeProvider>
      <PreferencesProvider>
        <LocaleProvider>
          <PreferencesScreen />
        </LocaleProvider>
      </PreferencesProvider>
    </ThemeProvider>,
  );

type View = Awaited<ReturnType<typeof open>>;

const mexicoSpanish = [{ languageCode: 'es', regionCode: 'MX', languageRegionCode: 'MX' }];

beforeEach(() => {
  mockStore.clear();
  resetLocaleForTests(mexicoSpanish);
});

const chip = (view: View, name: string | RegExp) => view.getAllByRole('radio', { name });

describe('a Spanish phone set to Mexico', () => {
  it('opens in Spanish, the language following the phone, and offers no currency', async () => {
    const view = await open();

    await waitFor(() => expect(getLocaleSnapshot().ready).toBe(true));
    expect(view.getByText('Preferencias')).toBeTruthy();
    expect(view.getByText('Idioma')).toBeTruthy();
    // The row's caption and its chip.
    expect(view.getAllByText('Español')).toHaveLength(2);

    const automatic = chip(view, 'Igual que mi teléfono');
    expect(automatic).toHaveLength(1);
    expect(automatic[0].props.accessibilityState).toMatchObject({ selected: true });

    // Nothing to choose, but amounts still read in what the phone implied at first launch.
    expect(view.queryByText('Moneda')).toBeNull();
    expect(view.queryAllByRole('radio', { name: /Peso mexicano|\(MXN /i })).toHaveLength(0);
    expect(getLocaleSnapshot().currency).toBe('MXN');
    await waitFor(() => expect(mockStore.get(CURRENCY_KEY)).toBe('MXN'));
    expect(mockStore.has(LANGUAGE_KEY)).toBe(false);
  });
});

describe('choosing a language', () => {
  it('switches the page to French at once and remembers it', async () => {
    const view = await open();
    await waitFor(() => expect(getLocaleSnapshot().ready).toBe(true));

    await fireEvent.press(chip(view, 'Français')[0]);

    await waitFor(() => expect(view.getByText('Préférences')).toBeTruthy());
    expect(view.getByText('Apparence')).toBeTruthy();
    expect(mockStore.get(LANGUAGE_KEY)).toBe('fr');
    expect(chip(view, 'Français')[0].props.accessibilityState).toMatchObject({ selected: true });
    // The currency did not move with the language.
    expect(mockStore.get(CURRENCY_KEY)).toBe('MXN');
  });

  it('goes back to the phone when asked', async () => {
    const view = await open();
    await waitFor(() => expect(getLocaleSnapshot().ready).toBe(true));
    await fireEvent.press(chip(view, 'English')[0]);
    await waitFor(() => expect(view.getByText('Preferences')).toBeTruthy());

    await fireEvent.press(chip(view, 'Same as my phone')[0]);

    await waitFor(() => expect(view.getByText('Preferencias')).toBeTruthy());
    expect(mockStore.has(LANGUAGE_KEY)).toBe(false);
  });
});

describe('the currency', () => {
  it('is never offered, in English or French', async () => {
    const view = await open();
    await waitFor(() => expect(getLocaleSnapshot().ready).toBe(true));

    await fireEvent.press(chip(view, 'English')[0]);
    await waitFor(() => expect(view.getByText('Preferences')).toBeTruthy());
    expect(view.queryByText('Currency')).toBeNull();
    expect(view.queryByText(/does not convert them/)).toBeNull();
    expect(view.queryAllByRole('radio', { name: /\((USD|GBP|CAD|MXN|AUD) /i })).toHaveLength(0);

    await fireEvent.press(chip(view, 'Français')[0]);
    await waitFor(() => expect(view.getByText('Préférences')).toBeTruthy());
    expect(view.queryByText('Devise')).toBeNull();
  });

  it('follows a British phone into pounds without being asked', async () => {
    resetLocaleForTests([{ languageCode: 'en', regionCode: 'GB', languageRegionCode: 'GB' }]);
    const view = await open();

    await waitFor(() => expect(getLocaleSnapshot().ready).toBe(true));
    expect(getLocaleSnapshot().currency).toBe('GBP');
    await waitFor(() => expect(mockStore.get(CURRENCY_KEY)).toBe('GBP'));
    expect(view.queryByText('Currency')).toBeNull();
  });
});
