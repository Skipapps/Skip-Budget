import { Fragment, useEffect, type ReactElement, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { readStoredChoice, writeChoice } from '@/i18n/persistence';
import {
  getLocaleSnapshot,
  hydrateLocale,
  refreshPhoneLocale,
  subscribeLocale,
  useLocale,
} from '@/i18n/store';

/**
 * Reads the stored choice once, writes every later change back, and re-reads the phone's language
 * and region whenever the app returns to the front, which is when a trip to the phone's own
 * Settings would have changed them.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const stored = await readStoredChoice();
      if (cancelled) return;

      hydrateLocale(stored);

      // After hydrating, so the read above is not written straight back.
      let saved = stored;
      unsubscribe = subscribeLocale(() => {
        saved = writeChoice(getLocaleSnapshot(), saved);
      });
    })();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPhoneLocale();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      sub.remove();
    };
  }, []);

  return <>{children}</>;
}

/**
 * Remounts what it wraps when the language or currency changes. Text and amounts are built while
 * rendering from module-level helpers, so a screen that is already on the stack would otherwise
 * keep showing the old words until it happened to render again.
 */
export function LocaleBoundary({ children }: { children: ReactNode }) {
  const { language, currency } = useLocale();
  return <Fragment key={`${language}:${currency}`}>{children}</Fragment>;
}

/**
 * For a navigator's `screenLayout`. React Navigation calls it as a plain function, so the hook
 * lives in LocaleBoundary, not here. The tab navigator is skipped by the caller: keying it would
 * send the person back to the first tab.
 */
export function localeScreenLayout({ children }: { children: ReactElement }): ReactElement {
  return <LocaleBoundary>{children}</LocaleBoundary>;
}
