import AsyncStorage from '@react-native-async-storage/async-storage';

import { isCurrency, isLanguage } from '@/i18n/config';
import type { LocaleSnapshot, StoredChoice } from '@/i18n/store';

/**
 * Like haptics and app lock, these describe this phone rather than the account, so they live in
 * local storage. A key is absent while the phone decides.
 */
export const LANGUAGE_KEY = 'skip.locale.language';
export const CURRENCY_KEY = 'skip.locale.currency';

/** Whatever is stored that is still on the list; anything else means the phone decides. */
export async function readStoredChoice(): Promise<StoredChoice> {
  try {
    const stored = Object.fromEntries(await AsyncStorage.multiGet([LANGUAGE_KEY, CURRENCY_KEY]));
    const language = stored[LANGUAGE_KEY];
    const currency = stored[CURRENCY_KEY];
    return {
      language: isLanguage(language) ? language : null,
      currency: isCurrency(currency) ? currency : null,
    };
  } catch {
    // Unreadable storage leaves the phone's defaults, which is a working app.
    return { language: null, currency: null };
  }
}

function write(key: string, value: string | null) {
  const pending = value === null ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, value);
  pending.catch(() => {});
}

/** Writes only the side that moved, so choosing a language does not rewrite the currency. */
export function writeChoice(next: LocaleSnapshot, previous: StoredChoice): StoredChoice {
  if (next.chosenLanguage !== previous.language) write(LANGUAGE_KEY, next.chosenLanguage);
  if (next.chosenCurrency !== previous.currency) write(CURRENCY_KEY, next.chosenCurrency);
  return { language: next.chosenLanguage, currency: next.chosenCurrency };
}
