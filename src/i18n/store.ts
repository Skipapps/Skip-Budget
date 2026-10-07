import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';

import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  type CurrencyCode,
  type Language,
} from '@/i18n/config';
import { detectCurrency, detectLanguage, type PhoneLocale } from '@/i18n/detect';

/**
 * Nothing here touches storage, so the many modules that format money stay free of native modules
 * (and their tests free of mocks); src/i18n/persistence.ts keeps the choice on the phone.
 */
export type LocaleSnapshot = {
  /** What the app shows: the person's choice, else what the phone implies. */
  language: Language;
  currency: CurrencyCode;
  /** What the person picked, or null while the phone decides. */
  chosenLanguage: Language | null;
  chosenCurrency: CurrencyCode | null;
  phoneLanguage: Language;
  phoneCurrency: CurrencyCode;
  /** True once the stored choice has been read, so the first frame is in the right language. */
  ready: boolean;
};

type Phone = { language: Language; currency: CurrencyCode };

function readPhone(): Phone {
  try {
    return phoneFrom(getLocales());
  } catch {
    // No native module (a test, a bare simulator) is a working app in English and dollars.
    return { language: DEFAULT_LANGUAGE, currency: DEFAULT_CURRENCY };
  }
}

function phoneFrom(locales: readonly PhoneLocale[]): Phone {
  return { language: detectLanguage(locales), currency: detectCurrency(locales) };
}

let phone: Phone = readPhone();
let chosenLanguage: Language | null = null;
let chosenCurrency: CurrencyCode | null = null;
let ready = false;

function build(): LocaleSnapshot {
  return {
    language: chosenLanguage ?? phone.language,
    currency: chosenCurrency ?? phone.currency,
    chosenLanguage,
    chosenCurrency,
    phoneLanguage: phone.language,
    phoneCurrency: phone.currency,
    ready,
  };
}

let snapshot = build();
const listeners = new Set<() => void>();

function commit() {
  snapshot = build();
  listeners.forEach((listener) => listener());
}

/** Stable between changes, so it is safe for useSyncExternalStore. */
export function getLocaleSnapshot(): LocaleSnapshot {
  return snapshot;
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type StoredChoice = { language: Language | null; currency: CurrencyCode | null };

/** Applies the choice read from storage and marks the store ready. */
export function hydrateLocale(choice: StoredChoice) {
  chosenLanguage = choice.language;
  chosenCurrency = choice.currency;
  ready = true;
  commit();
}

/** Pass null to follow the phone again. */
export function setLanguage(language: Language | null) {
  if (language === chosenLanguage) return;
  chosenLanguage = language;
  commit();
}

/** Pass null to follow the phone again. */
export function setCurrency(currency: CurrencyCode | null) {
  if (currency === chosenCurrency) return;
  chosenCurrency = currency;
  commit();
}

/** For when the person returns from the phone's own Settings, where the language or region may have moved. */
export function refreshPhoneLocale() {
  const next = readPhone();
  if (next.language === phone.language && next.currency === phone.currency) return;
  phone = next;
  commit();
}

export function useLocale(): LocaleSnapshot {
  return useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getLocaleSnapshot);
}

/** Test seam: back to a phone that implies the given locales and nothing chosen. */
export function resetLocaleForTests(locales?: readonly PhoneLocale[]) {
  phone = locales ? phoneFrom(locales) : readPhone();
  chosenLanguage = null;
  chosenCurrency = null;
  ready = false;
  commit();
}
