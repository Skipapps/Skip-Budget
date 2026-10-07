import { faqMessages } from '@/i18n/messages/faq';
import { legalMessages } from '@/i18n/messages/legal';
import type { Message } from '@/i18n/translate';

/**
 * The long texts are translated clause for clause. These checks catch what a read-through misses:
 * a changed number or address, a dropped brand name, and French or Spanish punctuation written the
 * English way.
 */

const entries = Object.entries({ ...legalMessages, ...faqMessages }) as [string, Message][];
const text = (value: Message['en']): string => (typeof value === 'string' ? value : value.other);

const EMAIL = /[\w.-]+@[\w.-]+\.\w+/g;
const FIGURE = /\d+(?:[.,]\d+)?/g;
const NAMES = [
  'Weknd',
  'Supabase',
  'Sentry',
  'Apple',
  'Google',
  'Buy Me a Coffee',
  'Skip Budget',
  'Apple Push Notification service',
  'Netflix',
  'Spotify',
];

describe('the legal and common-question texts', () => {
  it('cover the whole document', () => {
    expect(entries.length).toBeGreaterThan(100);
  });

  it('are translated, not copied from the English', () => {
    for (const [key, message] of entries) {
      expect({ key, same: text(message.es) === text(message.en) }).toEqual({ key, same: false });
      expect({ key, same: text(message.fr) === text(message.en) }).toEqual({ key, same: false });
    }
  });

  it('keep every e-mail address, figure and name the English has', () => {
    for (const [key, message] of entries) {
      const english = text(message.en);
      const kept = [...(english.match(EMAIL) ?? []), ...(english.match(FIGURE) ?? [])];
      const named = NAMES.filter((name) => english.includes(name));
      for (const language of ['es', 'fr'] as const) {
        const translated = text(message[language]);
        for (const piece of [...kept, ...named]) {
          expect({ key, language, piece, kept: translated.includes(piece) }).toEqual({
            key,
            language,
            piece,
            kept: true,
          });
        }
      }
    }
  });

  it('write French punctuation with the no-break space French puts around it', () => {
    for (const [key, message] of entries) {
      const french = text(message.fr);
      expect({ key, bad: french.match(/[^ \s][:;?!»]/g) }).toEqual({ key, bad: null });
      expect({ key, bad: french.match(/ [:;?!»]/g) }).toEqual({ key, bad: null });
      expect({ key, bad: french.match(/«[^ ]/g) }).toEqual({ key, bad: null });
    }
  });

  it('use a French apostrophe and Spanish opening marks', () => {
    for (const [key, message] of entries) {
      expect({ key, bad: text(message.fr).includes("'") }).toEqual({ key, bad: false });
      const spanish = text(message.es);
      const count = (mark: RegExp) => spanish.match(mark)?.length ?? 0;
      expect({ key, questions: count(/¿/g) }).toEqual({ key, questions: count(/\?/g) });
      expect({ key, exclaims: count(/¡/g) }).toEqual({ key, exclaims: count(/!/g) });
    }
  });

  it('leave no English sentence in the translations', () => {
    const english = /\b(the|and|your|you|with|when|that|this|which)\b/i;
    // Examples a person says out loud, kept in English because dictation only understands English.
    const spoken = /« [^»]* »|“[^”]*”/g;
    for (const [key, message] of entries) {
      for (const language of ['es', 'fr'] as const) {
        const prose = text(message[language]).replace(spoken, '');
        expect({ key, language, found: prose.match(english)?.[0] ?? null }).toEqual({
          key,
          language,
          found: null,
        });
      }
    }
  });
});
