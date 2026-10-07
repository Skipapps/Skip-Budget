import { LANGUAGES } from '@/i18n/config';
import { MESSAGE_AREAS, MESSAGES } from '@/i18n/messages';
import type { Message, MessageText } from '@/i18n/translate';

const forms = (text: MessageText): string[] =>
  typeof text === 'string' ? [text] : [text.one, text.other];

const tokensOf = (text: MessageText) =>
  [...new Set(forms(text).flatMap((form) => [...form.matchAll(/\{(\w+)\}/g)].map((m) => m[1])))]
    .sort()
    .join(',');

describe('the message catalogue', () => {
  const entries = Object.entries(MESSAGES) as [string, Message][];

  it('has a non-empty line in every language for every key', () => {
    for (const [key, message] of entries) {
      for (const language of LANGUAGES) {
        for (const form of forms(message[language])) {
          expect({ key, language, empty: form.trim() === '' }).toEqual({
            key,
            language,
            empty: false,
          });
        }
      }
    }
  });

  it('uses the same {parameters} in every language', () => {
    for (const [key, message] of entries) {
      const english = tokensOf(message.en);
      for (const language of LANGUAGES) {
        expect({ key, language, tokens: tokensOf(message[language]) }).toEqual({
          key,
          language,
          tokens: english,
        });
      }
    }
  });

  it('keeps the plural shape the same in every language', () => {
    for (const [key, message] of entries) {
      const shape = (text: MessageText) => typeof text;
      for (const language of LANGUAGES) {
        expect({ key, language, shape: shape(message[language]) }).toEqual({
          key,
          language,
          shape: shape(message.en),
        });
      }
    }
  });

  it('never defines one key in two areas', () => {
    const defined = Object.values(MESSAGE_AREAS).reduce(
      (total, area) => total + Object.keys(area).length,
      0,
    );
    expect(Object.keys(MESSAGES).length).toBe(defined);
  });

  it('keeps every key as area.name, lower-case segments', () => {
    for (const [key] of entries) expect(key).toMatch(/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/);
  });
});
