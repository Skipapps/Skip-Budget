/**
 * Which words are "plain": not a number, a unit, a keyword, a date, a cycle,
 * a correction or a small function word. Only plain words can be the edge of
 * a merchant name, so "rent" is never fuzzy-matched to a brand and "the" is
 * never the start of one.
 */
import { CENT_UNITS, DOLLAR_UNITS } from './amount';
import { SINGLE_CATEGORY_WORDS } from './bill-category';
import type { Token } from './clean';
import { CYCLE_WORDS } from './cycle';
import { DATE_WORDS } from './date';
import { KIND_WORDS } from './kind';
import { isNumberWord } from './numbers';

/** Words that start or make a self-correction. */
export const TRIGGER_WORDS = new Set([
  'no',
  'nope',
  'not',
  'wait',
  'actually',
  'sorry',
  'mean',
  'meant',
  'scratch',
  'rather',
  'correction',
  'oops',
  'hold',
]);

export const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'i',
  'im',
  'ive',
  'id',
  'me',
  'my',
  'mine',
  'we',
  'us',
  'our',
  'you',
  'your',
  'it',
  'its',
  'is',
  'was',
  'were',
  'be',
  'been',
  'am',
  'are',
  'for',
  'at',
  'on',
  'in',
  'to',
  'from',
  'of',
  'and',
  'or',
  'with',
  'by',
  'via',
  'this',
  'that',
  'these',
  'those',
  'some',
  'got',
  'get',
  'gets',
  'had',
  'have',
  'has',
  'did',
  'do',
  'does',
  'paid',
  'pay',
  'pays',
  'paying',
  'put',
  'charged',
  'charge',
  'charges',
  'billed',
  'made',
  'make',
  'total',
  'came',
  'went',
  'out',
  'up',
  'off',
  'back',
  'again',
  'also',
  'too',
  'then',
  'there',
  'here',
  'what',
  'which',
  'who',
  'how',
  'much',
  'many',
  'cost',
  'costs',
  'new',
  'another',
  'all',
  'only',
  'more',
  'less',
  'than',
  'into',
  'onto',
  'over',
  'under',
  'after',
  'before',
  'oh',
  'point',
  'percent',
  'will',
  'gonna',
  'going',
  'should',
  'would',
  'could',
  'he',
  'she',
  'they',
  'them',
  'his',
  'her',
  'their',
  'thing',
  'stuff',
  'one',
]);

/** A word that could belong to a name. */
export function isPlainWord(token: Token | undefined): boolean {
  if (!token || token.type !== 'word') return false;
  const { key } = token;
  return !(
    STOPWORDS.has(key) ||
    TRIGGER_WORDS.has(key) ||
    KIND_WORDS.has(key) ||
    SINGLE_CATEGORY_WORDS.has(key) ||
    CYCLE_WORDS.has(key) ||
    DATE_WORDS.has(key) ||
    DOLLAR_UNITS.has(key) ||
    CENT_UNITS.has(key) ||
    isNumberWord(key)
  );
}
