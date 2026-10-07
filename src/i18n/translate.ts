import { DEFAULT_LANGUAGE, type Language } from '@/i18n/config';

/** A plain line, or a pair for text that changes with a count ("1 bill", "2 bills"). */
export type MessageText = string | { one: string; other: string };

/** All three languages are required, so a line cannot ship half-translated. */
export type Message = Record<Language, MessageText>;

export type MessageParams = Record<string, string | number>;

/** Identity at runtime; it keeps each key as a literal type so `t('typo')` fails to compile. */
export function defineMessages<const T extends Record<string, Message>>(messages: T): T {
  return messages;
}

/**
 * English and Spanish treat only 1 as singular. French treats 0 and 1 (and 1.5) as singular, so
 * "0 facture" and "1 facture" but "2 factures".
 */
export function pluralForm(language: Language, count: number): 'one' | 'other' {
  if (language === 'fr') return Math.abs(count) < 2 ? 'one' : 'other';
  return count === 1 ? 'one' : 'other';
}

const TOKEN = /\{(\w+)\}/g;

function fill(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(TOKEN, (token, name: string) =>
    name in params ? String(params[name]) : token,
  );
}

export function translate(
  language: Language,
  messages: Record<string, Message>,
  key: string,
  params?: MessageParams,
): string {
  const entry = messages[key];
  // A key the types would have refused; the key itself is a visible, searchable placeholder.
  if (!entry) return key;

  const text = entry[language] ?? entry[DEFAULT_LANGUAGE];
  if (typeof text === 'string') return fill(text, params);

  const count = typeof params?.count === 'number' ? params.count : Number(params?.count ?? 0);
  return fill(text[pluralForm(language, count)], params);
}
