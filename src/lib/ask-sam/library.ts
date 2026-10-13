import { ALL_INTENTS } from './knowledge';
import { createMatcher, type Matcher, type Prepared } from './matcher';
import { TEXTS_ES } from './knowledge/es';
import { TEXTS_FR } from './knowledge/fr';
import type { Intent, IntentText, Language } from './types';

const TEXTS: Record<Exclude<Language, 'en'>, IntentText[]> = { es: TEXTS_ES, fr: TEXTS_FR };
const built = new Map<Language, Intent[]>();

/**
 * The library in one language: the English intents' topics, links and screens, with that
 * language's own title, questions and answer. An intent not translated yet stays English rather
 * than going missing.
 */
export function intentsFor(language: Language): Intent[] {
  if (language === 'en') return ALL_INTENTS;
  const cached = built.get(language);
  if (cached) return cached;
  const texts = new Map(TEXTS[language].map((text) => [text.id, text]));
  const intents = ALL_INTENTS.map((intent) => {
    const text = texts.get(intent.id);
    return text
      ? {
          ...intent,
          title: text.title,
          questions: text.questions,
          answer: text.answer,
          keywords: text.keywords,
        }
      : intent;
  });
  built.set(language, intents);
  return intents;
}

// Each language's terms are a large literal; requiring them on demand loads only the one in use.
/* eslint-disable @typescript-eslint/no-require-imports */
const PREPARED: Record<Language, () => Prepared> = {
  en: () => require('./prepared/en').PREPARED_EN,
  es: () => require('./prepared/es').PREPARED_ES,
  fr: () => require('./prepared/fr').PREPARED_FR,
};
/* eslint-enable @typescript-eslint/no-require-imports */
const matchers = new Map<Language, Matcher>();

/**
 * The matcher for one language, built once per app run from the cleaned texts shipped with the
 * app. Only the language in use is ever loaded.
 */
export function matcherFor(language: Language): Matcher {
  let matcher = matchers.get(language);
  if (!matcher) {
    matcher = createMatcher(intentsFor(language), {}, language, PREPARED[language]());
    matchers.set(language, matcher);
  }
  return matcher;
}
