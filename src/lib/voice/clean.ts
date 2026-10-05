/**
 * Lowercase, split into tokens, drop filler words.
 *
 * iOS writes most numbers as digits ("$15.99", "1,800", "$1.2k", "5th", "12:50"), so each is kept
 * whole rather than split on the punctuation inside it.
 */
import { toCents } from '@/lib/money';

export type NumberLiteral = {
  /** The figure as written, before a "k" suffix. */
  value: number;
  /** Cents the digits say, after a "k" suffix. Rounded only if `exact` is false. */
  cents: number;
  /** Whole cents as written ("3.450" is, "3.459" is not, "1.2345k" is). Otherwise never an amount. */
  exact: boolean;
  /** Decimal places that carry a digit: "3.450" → 2, "3.459" → 3. */
  significantDecimals: number;
  /** The whole-number part, when there is no decimal point and no "k". */
  integer: number | null;
  /** Digits before the decimal point ("1,800" → 4). */
  digits: number;
  decimals: number;
  dollar: boolean;
  grouped: boolean;
  thousands: boolean;
};

export type Token = {
  /** Lowercased, apostrophes kept: "joe's". What a free-typed name is built from. */
  text: string;
  /** Matching key: apostrophes dropped, so "joe's" and "joes" agree. */
  key: string;
  type: 'word' | 'number' | 'ordinal' | 'time' | 'slash';
  num?: NumberLiteral;
  /** "5th" → 5. */
  ordinal?: number;
  /** "12:50" → [12, 50]. */
  time?: [number, number];
  /** "10/3/2026" → [10, 3, 2026]; the year is null when not written. */
  slash?: [number, number, number | null];
};

const FILLER_WORDS = new Set([
  'um',
  'umm',
  'ummm',
  'uh',
  'uhh',
  'uhm',
  'er',
  'erm',
  'ah',
  'ahh',
  'hmm',
  'hm',
  'mm',
  'mmm',
  'like',
  'basically',
  'literally',
  'just',
  'kinda',
  'sorta',
  'about',
  'around',
  'roughly',
  'approximately',
  'approx',
  'so',
  'okay',
  'ok',
  'alright',
  'well',
  'yeah',
  'yep',
  'hey',
  'please',
  'anyway',
  'anyways',
  'maybe',
  'probably',
]);

const FILLER_PHRASES: string[][] = [
  ['you', 'know'],
  ['i', 'guess'],
  ['i', 'think'],
  ['kind', 'of'],
  ['sort', 'of'],
  ['let', 'me', 'see'],
  ['let', 'me', 'think'],
];

/**
 * Slash dates, clock times, digit ordinals, money-shaped numbers, words, in that order, so "10/3"
 * is not two numbers and "5th" not 5. A number must not run into a letter: "5pm" stays one word.
 */
const TOKEN =
  /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?![\d/])|(\d{1,2}:\d{2})(?!\d)|(\d{1,2}(?:st|nd|rd|th))(?![a-z\d])|(\$?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)k?)(?![a-z\d])|([a-z\d]+(?:'[a-z]+)*)/g;

function normalise(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[‘’ʼ`´]/g, "'")
      // "5 p.m." → "5 pm", so the time is one word and not "p" + "m".
      .replace(/\b([ap])\.\s?m\b\.?/g, '$1m')
      .replace(/\$\s+(?=[\d.])/g, '$')
      // "$15.99/mo" → "$15.99 per mo". Digit/digit is a date and stays.
      .replace(/(\d)\s*\/\s*(?=[a-z])/g, '$1 per ')
      // Brand spellings: "AT&T" → "at and t", "Disney+" → "disney plus".
      .replace(/&/g, ' and ')
      .replace(/\+/g, ' plus ')
      .replace(/%/g, ' percent ')
      .replace(/[-‐-―_]/g, ' ')
  );
}

function readNumber(raw: string): NumberLiteral {
  const dollar = raw.startsWith('$');
  let body = dollar ? raw.slice(1) : raw;
  const thousands = body.endsWith('k');
  if (thousands) body = body.slice(0, -1);

  const grouped = body.includes(',');
  const plain = body.replace(/,/g, '');
  const [whole, fraction = ''] = plain.split('.');
  const value = Number(plain);

  const significantDecimals = fraction.replace(/0+$/, '').length;

  return {
    value,
    // toCents rounds on 12 significant digits, so "1.2k" is 120000 cents, not 119999.99999999999.
    cents: toCents(thousands ? value * 1000 : value),
    exact: significantDecimals - (thousands ? 3 : 0) <= 2,
    significantDecimals,
    integer: fraction.length === 0 && !thousands ? Number(whole) : null,
    digits: whole.length,
    decimals: fraction.length,
    dollar,
    grouped,
    thousands,
  };
}

function toToken(match: RegExpMatchArray): Token | null {
  const [, slash, time, ordinal, number, word] = match;

  if (slash) {
    const [month, day, year] = slash.split('/').map(Number);
    return {
      text: slash,
      key: slash,
      type: 'slash',
      slash: [month, day, year === undefined ? null : year < 100 ? 2000 + year : year],
    };
  }
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    return { text: time, key: time, type: 'time', time: [hours, minutes] };
  }
  if (ordinal) {
    return { text: ordinal, key: ordinal, type: 'ordinal', ordinal: parseInt(ordinal, 10) };
  }
  if (number) {
    return { text: number, key: number, type: 'number', num: readNumber(number) };
  }
  if (word) {
    return { text: word, key: word.replace(/'/g, ''), type: 'word' };
  }
  return null;
}

function dropFillers(tokens: Token[]): Token[] {
  const kept: Token[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const phrase = FILLER_PHRASES.find((words) =>
      words.every((word, offset) => tokens[i + offset]?.key === word),
    );
    if (phrase) {
      i += phrase.length - 1;
      continue;
    }
    if (tokens[i].type === 'word' && FILLER_WORDS.has(tokens[i].key)) continue;
    kept.push(tokens[i]);
  }
  return kept;
}

/** The transcript as tokens, fillers gone. Never throws on any string. */
export function tokenize(raw: string): Token[] {
  const tokens: Token[] = [];
  for (const match of normalise(String(raw ?? '')).matchAll(TOKEN)) {
    const token = toToken(match);
    if (token) tokens.push(token);
  }
  return dropFillers(tokens);
}

/** Words joined with nothing between them: "star bucks" and "starbucks" agree. */
export function joinKeys(tokens: readonly Token[], start: number, end: number): string {
  let joined = '';
  for (let i = start; i < end; i += 1) joined += tokens[i].key;
  return joined;
}
