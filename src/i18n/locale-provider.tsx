import { Fragment, useEffect, type ReactElement, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { readStoredChoice, writeChoice } from '@/i18n/persistence';
import {
  getLocaleSnapshot,
  hydrateLocale,
  refreshPhoneLocale,
  setCurrency,
  subscribeLocale,
  useLocale,
} from '@/i18n/store';

/** Longest the first frame waits for storage; the phone's own defaults are a working app. */
const READ_TIMEOUT_MS = 1500;

const TIMED_OUT = Symbol('timed out');

function readWithin(
  ms: number,
): Promise<Awaited<ReturnType<typeof readStoredChoice>> | typeof TIMED_OUT> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(TIMED_OUT), ms);
    readStoredChoice().then((choice) => {
      clearTimeout(timer);
      resolve(choice);
    });
  });
}

/**
 * Reads the stored choice once, writes every later change back, and re-reads the phone's language
 * and region whenever the app returns to the front, which is when a trip to the phone's own
 * Settings would have changed them.
 *
 * The language keeps following the phone until a choice is made. The currency is pinned the first
 * time the app opens: it labels figures a person has already typed in, so a changed Region setting
 * must never relabel last month's rent from pounds to dollars.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const read = await readWithin(READ_TIMEOUT_MS);
      if (cancelled) return;

      // A read that never answered says nothing about what is stored, so nothing is pinned or
      // written over it.
      const stored = read === TIMED_OUT ? { language: null, currency: null } : read;
      hydrateLocale(stored);
      if (read === TIMED_OUT) return;

      // After hydrating, so the read above is not written straight back.
      let saved = stored;
      unsubscribe = subscribeLocale(() => {
        saved = writeChoice(getLocaleSnapshot(), saved);
      });

      if (stored.currency === null) setCurrency(getLocaleSnapshot().phoneCurrency);
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
 * lives in LocaleBoundary, not here.
 */
export function localeScreenLayout({ children }: { children: ReactElement }): ReactElement {
  return <LocaleBoundary>{children}</LocaleBoundary>;
}

/**
 * The root stack's layout. The tab navigator is left alone: keying it would send the person back
 * to the first tab, and it remounts its own screens through localeScreenLayout instead.
 */
export function rootScreenLayout({
  route,
  children,
}: {
  route: { name: string };
  children: ReactElement;
}): ReactElement {
  return route.name === '(tabs)' ? children : localeScreenLayout({ children });
}
