import { render, screen, waitFor } from '@testing-library/react-native';
import { act } from 'react';
import { Text } from 'react-native';

import { t } from '@/i18n';
import { LocaleBoundary, LocaleProvider } from '@/i18n/locale-provider';
import { CURRENCY_KEY, LANGUAGE_KEY } from '@/i18n/persistence';
import {
  getLocaleSnapshot,
  resetLocaleForTests,
  setCurrency,
  setLanguage,
  useLocale,
} from '@/i18n/store';
import { formatCurrency } from '@/lib/format';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map((key) => [key, mockStorage.get(key) ?? null])),
    ),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStorage.delete(key);
      return Promise.resolve();
    }),
  },
}));

const mexico = [{ languageCode: 'es', regionCode: 'MX', languageRegionCode: 'MX' }];

beforeEach(() => {
  mockStorage.clear();
  resetLocaleForTests(mexico);
});

function Probe() {
  useLocale();
  return <Text testID="probe">{`${t('locale.language.title')} ${formatCurrency(1234.5)}`}</Text>;
}

describe('LocaleProvider', () => {
  it('reads the stored choice and is ready once it has', async () => {
    mockStorage.set(LANGUAGE_KEY, 'fr');
    mockStorage.set(CURRENCY_KEY, 'CAD');

    await render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(getLocaleSnapshot().ready).toBe(true));
    expect(screen.getByTestId('probe').props.children).toBe('Langue 1 234,50 $');
  });

  it('ignores a stored value that is not on the list', async () => {
    mockStorage.set(LANGUAGE_KEY, 'de');
    mockStorage.set(CURRENCY_KEY, 'EUR');

    await render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(getLocaleSnapshot().ready).toBe(true));
    expect(getLocaleSnapshot()).toMatchObject({ language: 'es', currency: 'MXN' });
  });

  it('writes a later choice back, and removes the key when the phone decides again', async () => {
    await render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    await waitFor(() => expect(getLocaleSnapshot().ready).toBe(true));

    await act(() => {
      setLanguage('en');
      setCurrency('GBP');
    });
    expect(mockStorage.get(LANGUAGE_KEY)).toBe('en');
    expect(mockStorage.get(CURRENCY_KEY)).toBe('GBP');

    await act(() => setLanguage(null));
    expect(mockStorage.has(LANGUAGE_KEY)).toBe(false);
    expect(mockStorage.get(CURRENCY_KEY)).toBe('GBP');
  });

  it('does not write back what it just read', async () => {
    mockStorage.set(LANGUAGE_KEY, 'fr');
    mockStorage.set(CURRENCY_KEY, 'CAD');
    const storage = jest.requireMock('@react-native-async-storage/async-storage').default;
    storage.setItem.mockClear();
    storage.removeItem.mockClear();

    await render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    await waitFor(() => expect(getLocaleSnapshot().ready).toBe(true));

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('pins the currency the phone implied the first time, and the language keeps following', async () => {
    await render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    await waitFor(() => expect(getLocaleSnapshot().ready).toBe(true));

    await waitFor(() => expect(mockStorage.get(CURRENCY_KEY)).toBe('MXN'));
    expect(mockStorage.has(LANGUAGE_KEY)).toBe(false);
    expect(getLocaleSnapshot()).toMatchObject({ chosenCurrency: 'MXN', chosenLanguage: null });
  });

  it('keeps a pinned currency when the phone region changes later', async () => {
    mockStorage.set(CURRENCY_KEY, 'GBP');

    await render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );
    await waitFor(() => expect(getLocaleSnapshot().ready).toBe(true));

    expect(getLocaleSnapshot().currency).toBe('GBP');
    expect(mockStorage.get(CURRENCY_KEY)).toBe('GBP');
  });

  it('opens on the phone defaults, without pinning, when storage never answers', async () => {
    jest.useFakeTimers();
    try {
      const storage = jest.requireMock('@react-native-async-storage/async-storage').default;
      storage.multiGet.mockReturnValueOnce(new Promise(() => {}));
      storage.setItem.mockClear();

      await render(
        <LocaleProvider>
          <Probe />
        </LocaleProvider>,
      );
      expect(getLocaleSnapshot().ready).toBe(false);

      await act(async () => {
        jest.advanceTimersByTime(1600);
      });

      expect(getLocaleSnapshot()).toMatchObject({ ready: true, language: 'es', currency: 'MXN' });
      expect(storage.setItem).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('survives storage that cannot be read', async () => {
    const storage = jest.requireMock('@react-native-async-storage/async-storage').default;
    storage.multiGet.mockRejectedValueOnce(new Error('unreadable'));

    await render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );

    await waitFor(() => expect(getLocaleSnapshot().ready).toBe(true));
    expect(getLocaleSnapshot()).toMatchObject({ language: 'es', currency: 'MXN' });
  });
});

describe('LocaleBoundary', () => {
  it('remounts what it wraps when the language changes, and not otherwise', async () => {
    let mounts = 0;
    function Counted() {
      // A mount-only effect: re-renders do not count, only a fresh mount does.
      return (
        <Text
          testID="counted"
          ref={() => {
            mounts += 1;
          }}
        >
          {t('locale.language.title')}
        </Text>
      );
    }

    await render(
      <LocaleBoundary>
        <Counted />
      </LocaleBoundary>,
    );
    expect(screen.getByTestId('counted').props.children).toBe('Idioma');

    await act(() => setLanguage('fr'));
    await waitFor(() => expect(screen.getByTestId('counted').props.children).toBe('Langue'));
    const afterLanguage = mounts;
    expect(afterLanguage).toBeGreaterThan(1);

    await act(() => setLanguage('fr'));
    expect(mounts).toBe(afterLanguage);
  });
});
