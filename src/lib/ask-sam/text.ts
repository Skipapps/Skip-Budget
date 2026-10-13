import { OTHER_LIGHT_WORDS, OTHER_STOPWORDS, SHORTHAND } from './language';
import type { Language } from './types';

const CONTRACTIONS: [RegExp, string][] = [
  [/\bwhat'?s\b/g, 'what is'],
  [/\bwhere'?s\b/g, 'where is'],
  [/\bhow'?s\b/g, 'how is'],
  [/\bwhy'?s\b/g, 'why is'],
  [/\bwho'?s\b/g, 'who is'],
  [/\bthere'?s\b/g, 'there is'],
  [/\bthat'?s\b/g, 'that is'],
  [/\bit's\b/g, 'it is'],
  [/\bcan'?t\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bwon'?t\b/g, 'will not'],
  [/\bdon'?t\b/g, 'do not'],
  [/\bdoesn'?t\b/g, 'does not'],
  [/\bdidn'?t\b/g, 'did not'],
  [/\bisn'?t\b/g, 'is not'],
  [/\baren'?t\b/g, 'are not'],
  [/\bwasn'?t\b/g, 'was not'],
  [/\bhaven'?t\b/g, 'have not'],
  [/\bhasn'?t\b/g, 'has not'],
  [/\bshouldn'?t\b/g, 'should not'],
  [/\bwouldn'?t\b/g, 'would not'],
  [/\bcouldn'?t\b/g, 'could not'],
  [/\bi'm\b/g, 'i am'],
  [/\bim\b/g, 'i am'],
  [/\bi've\b/g, 'i have'],
  [/\bi'd\b/g, 'i would'],
  [/\bi'll\b/g, 'i will'],
  [/\byou're\b/g, 'you are'],
  [/\bthey're\b/g, 'they are'],
  [/\bwe're\b/g, 'we are'],
  [/\blet'?s\b/g, 'let us'],
  [/\bu\b/g, 'you'],
  [/\bur\b/g, 'your'],
  [/\by\b/g, 'why'],
  [/\br\b/g, 'are'],
  [/\bpls\b|\bplz\b/g, 'please'],
  [/\bthx\b|\bty\b|\bthanx\b|\bthnx\b/g, 'thanks'],
  [/\bwanna\b/g, 'want to'],
  [/\bgonna\b/g, 'going to'],
  [/\bgotta\b/g, 'got to'],
  [/\bhw\b/g, 'how'],
  [/\bwht\b|\bwat\b/g, 'what'],
  [/\bacct\b/g, 'account'],
  [/\bamt\b/g, 'amount'],
  [/\bbal\b/g, 'balance'],
  [/\bnotif\b|\bnotifs\b/g, 'notifications'],
  [/\bsubs\b/g, 'subscriptions'],
  [/\bsub\b/g, 'subscription'],
  [/\binfo\b/g, 'information'],
  [/\bapp's\b/g, 'app'],
  [/\bive\b/g, 'i have'],
  [/\bpya\b|\bapy\b/g, 'pay'],
  [/\bbok\b/g, 'book'],
  [/\bnxt\b/g, 'next'],
  [/\bteh\b/g, 'the'],
  [/\bdat\b/g, 'that'],
  [/\bthru\b/g, 'through'],
  [/\bbil\b/g, 'bill'],
  [/\bsav\b/g, 'save'],
  [/\bmo\b/g, 'month'],
  [/\byr\b|\byrs\b/g, 'year'],
  [/\bwk\b/g, 'week'],
  [/\bamnt\b/g, 'amount'],
  [/\bmum\b/g, 'mom'],
];

/**
 * Words too common to tell two questions apart. Question words (how, why, where, what) and
 * negations stay in: "how do I delete" and "why did it delete" want different answers.
 */
export const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'am',
  'was',
  'were',
  'be',
  'been',
  'being',
  'do',
  'does',
  'did',
  'i',
  'me',
  'my',
  'mine',
  'myself',
  'you',
  'your',
  'yours',
  'we',
  'our',
  'us',
  'to',
  'of',
  'in',
  'on',
  'at',
  'for',
  'with',
  'about',
  'and',
  'or',
  'so',
  'if',
  'then',
  'than',
  'just',
  'please',
  'um',
  'uh',
  'like',
  'really',
  'very',
  'any',
  'some',
  'there',
  'here',
  'have',
  'has',
  'had',
  'get',
  'got',
  'can',
  'could',
  'would',
  'should',
  'will',
  'shall',
  'may',
  'might',
  'must',
  'want',
  'need',
  'know',
  'tell',
  'explain',
  'help',
  'skip',
  'app',
  'ok',
  'okay',
  'thing',
  'things',
  'stuff',
  'its',
  'it',
  'this',
  'that',
  'these',
  'those',
  'by',
  'from',
  'up',
  'into',
  'out',
  'as',
  'also',
  'still',
  'even',
  'way',
  'one',
  'someone',
  'something',
  'actually',
  'mean',
  'meaning',
  'trying',
  'try',
  'question',
  'quick',
  'pls',
  'kind',
  'sort',
  'which',
  'who',
  'whom',
  'whose',
  'go',
  'going',
  'see',
  'look',
  'use',
  'using',
  'used',
  'able',
  'possible',
  'anyway',
  'good',
  'anything',
  'everything',
  'basically',
  'exactly',
  'currently',
  'now',
  'today',
  'guys',
  'dear',
  'sir',
  'madam',
]);

/** Low-signal words that still help break ties between "what is" and "how do I" questions. */
export const LIGHT_WORDS = new Set([
  'how',
  'why',
  'what',
  'where',
  'when',
  'not',
  'no',
  'all',
  'more',
  'many',
  'much',
]);

/**
 * Runs a table of word rewrites as one pass. A table of plain alternatives ("log in|login") becomes
 * a single pattern, longest first, which on a phone is many times faster than one pattern per row;
 * anything fancier (a lookahead) still runs on its own afterwards.
 */
export function compileRewrites(table: [RegExp, string][]): (text: string) => string {
  const plain = new Map<string, string>();
  const rest: [RegExp, string][] = [];
  for (const [pattern, replacement] of table) {
    const words = plainAlternatives(pattern.source);
    if (!words) {
      rest.push([pattern, replacement]);
      continue;
    }
    for (const word of words) if (!plain.has(word)) plain.set(word, replacement);
  }
  const keys = [...plain.keys()].sort((a, b) => b.length - a.length);
  const combined = keys.length
    ? new RegExp(
        `\\b(?:${keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
        'g',
      )
    : null;
  return (text) => {
    let out = combined ? text.replace(combined, (found) => plain.get(found) ?? found) : text;
    for (const [pattern, replacement] of rest) out = out.replace(pattern, replacement);
    return out;
  };
}

/** "\\b(a|b's?)\\b" or "\\ba\\b|\\bb\\b" as its words, or null for anything else. */
function plainAlternatives(source: string): string[] | null {
  const inner = /^\\b\((.*)\)\\b$/.exec(source)?.[1];
  const parts =
    inner !== undefined
      ? inner.split('|')
      : source.split('|').map((part) => /^\\b(.*)\\b$/.exec(part)?.[1]);
  const words: string[] = [];
  for (const part of parts) {
    if (part === undefined || !/^[a-z0-9 '\-]*('\?)?[a-z0-9 '\-]*$/.test(part)) return null;
    if (part.includes("'?")) words.push(part.replace("'?", "'"), part.replace("'?", ''));
    else words.push(part);
  }
  return words.length ? words : null;
}

const expandContractions = compileRewrites(CONTRACTIONS);

for (const word of OTHER_STOPWORDS) STOPWORDS.add(word);
for (const word of OTHER_LIGHT_WORDS) LIGHT_WORDS.add(word);

export function normalize(input: string, language: Language = 'en'): string {
  // Unicode normalizing is the slow part, and plain ASCII has nothing for it to do.
  let text = (/[^\x00-\x7f]/.test(input) ? input.normalize('NFKD') : input)
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, ' ');
  if (language === 'en') text = expandContractions(text).replace(/'s\b/g, '');
  // French "l'app", "qu'est-ce": the elided word becomes its own (ignored) word.
  text = text
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/[^a-z0-9$%+ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (language !== 'en')
    for (const [pattern, replacement] of SHORTHAND[language])
      text = text.replace(pattern, replacement);
  return text;
}

/**
 * A deliberately light stemmer: enough that "bills", "billing" and "billed" meet, without the
 * over-reach of Porter ("news" → "new", "pro" → "pro").
 */
export function stem(word: string): string {
  if (word.length <= 3 || /\d/.test(word)) return word;
  if (KEEP_AS_IS.has(word)) return word;
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('ied') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('ing') && word.length > 5) return undouble(word.slice(0, -3));
  if (word.endsWith('ed') && word.length > 4) return undouble(word.slice(0, -2));
  if (word.endsWith('es') && /(ss|sh|ch|x|z)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && !word.endsWith('is'))
    return word.slice(0, -1);
  if (word.endsWith('ly') && word.length > 5) return word.slice(0, -2);
  return word;
}

const KEEP_AS_IS = new Set([
  'news',
  'plus',
  'bonus',
  'status',
  'always',
  'access',
  'across',
  'less',
  'this',
  'thus',
  'yes',
  'gas',
  'its',
  'was',
  'has',
  'does',
  'goes',
  'previous',
  'various',
  'apples',
  'business',
  'address',
  'progress',
  'process',
  'lens',
]);

function undouble(word: string): string {
  // Porter's rule: a doubled final consonant came from the suffix ("scanned"), except l, s and z
  // ("billing", "passing") and a few words that really end doubled.
  if (/([bdfgmnprt])\1$/.test(word) && !REAL_DOUBLE.has(word)) return word.slice(0, -1);
  // "saving" → "sav" would miss "save"; put the e back where English drops it.
  if (/(at|iz|bl|v|c|g|s|u|r|k|d|t|m|l|n|p)$/.test(word) && SILENT_E.has(word + 'e'))
    return word + 'e';
  return word;
}

const REAL_DOUBLE = new Set(['add', 'odd', 'err', 'egg', 'inn', 'butt', 'putt']);

const SILENT_E = new Set([
  'save',
  'create',
  'delete',
  'update',
  'change',
  'move',
  'remove',
  'use',
  'type',
  'scan',
  'close',
  'calculate',
  'charge',
  'share',
  'store',
  'compare',
  'continue',
  'arrive',
  'receive',
  'leave',
  'restore',
  'manage',
  'name',
  'rename',
  'issue',
  'price',
  'score',
  'date',
  'note',
  'make',
  'take',
  'come',
  'give',
  'have',
  'live',
  'love',
  'like',
  'hate',
  'write',
  'type',
  'cause',
  'reduce',
  'include',
  'exclude',
  'renew',
  'subscribe',
  'unsubscribe',
  'decline',
  'translate',
  'pause',
  'resume',
  'schedule',
  'estimate',
  'owe',
  'require',
  'archive',
  'prepare',
  'state',
  'income',
  'pure',
  'figure',
  'enable',
  'disable',
  'debate',
  'rate',
  'refine',
  'snooze',
  'locate',
  'size',
  'rescue',
  'upgrade',
  'downgrade',
  'purchase',
  'release',
  'increase',
  'decrease',
  'balance',
  'finance',
  'combine',
  'complete',
  'retire',
  'stage',
  'manage',
  'organize',
  'organise',
  'notice',
  'choose',
  'lose',
  'refuse',
  'excuse',
  'confuse',
  'value',
  'due',
  'continue',
  'argue',
]);

export function tokenize(input: string): string[] {
  const text = normalize(input);
  return text ? text.split(' ') : [];
}
