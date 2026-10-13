import { answerText, terms, type Prepared } from './matcher';
import { normalize } from './text';
import type { Intent, Language } from './types';

/** The library's texts cleaned the way the matcher would, for shipping instead of redoing. */
export function prepare(intents: Intent[], language: Language): Prepared {
  const index = new Map<string, number>();
  const words = new Map<string, number>();
  const seen = new Set<string>();
  const encode = (text: string) => {
    if (!seen.has(text)) {
      seen.add(text);
      for (const word of normalize(text, language).split(' ')) {
        if (word) words.set(word, (words.get(word) ?? 0) + 1);
      }
    }
    return terms(text, undefined, language).map((term) => {
      let at = index.get(term);
      if (at === undefined) index.set(term, (at = index.size));
      return at;
    });
  };
  const byIntent: Record<string, number[][]> = {};
  for (const intent of intents) {
    byIntent[intent.id] = [
      intent.title,
      ...intent.questions,
      ...(intent.keywords ?? []),
      answerText(intent),
    ].map(encode);
  }
  return { terms: [...index.keys()], words: [...words], intents: byIntent };
}
