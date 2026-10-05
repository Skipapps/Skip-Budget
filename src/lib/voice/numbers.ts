/**
 * Step 3a: one number, said in words or written in digits, as exact cents.
 *
 * This reads a single *group*: "forty five", "two hundred and five",
 * "thirty seven hundred", "a grand", "one point two k", "$1,800", "1.2k",
 * "12 hundred". Deciding what a run of groups means as money (is "twelve
 * fifty" one amount or two? dollars-and-cents or hundreds?) is amount.ts.
 *
 * All arithmetic is in whole cents. Where a decimal has to be scaled
 * ("1.2k", "one point two five thousand") the figure goes through toCents,
 * which decides the half on 12 significant digits (src/lib/money.ts), so no
 * float drift reaches a figure.
 */
import { toCents } from '@/lib/money';

import type { Token } from './clean';

export const UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

export const TEENS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

export const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const THOUSANDS: Record<string, number> = { thousand: 1000, grand: 1000, k: 1000 };

export function isNumberWord(key: string): boolean {
  return (
    key in UNITS ||
    key in TEENS ||
    key in TENS ||
    key in THOUSANDS ||
    key === 'hundred' ||
    key === 'million'
  );
}

export type Group = {
  start: number;
  /** Exclusive. */
  end: number;
  /** Exact cents. */
  cents: number;
  /** Whole dollars when the group has no decimals; null otherwise. */
  whole: number | null;
  /**
   * 1–99 with no "$", no decimals, no scale word, and at most two words or
   * two digits — the shape that can be the first half of "twelve fifty".
   */
  simple: boolean;
  /** Simple and written or said as two digits (10–99, or "05"): a possible second half. */
  twoDigit: boolean;
  dollar: boolean;
  decimals: number;
  /** "k", "grand" or "thousand" was used: a money marker in speech ("a grand"). */
  thousands: boolean;
  /** Any scale word or suffix was used ("hundred", "thousand", "k"). */
  scaled: boolean;
  /**
   * Whole cents as said: no digit past the cent after any scale ("$3.459" and
   * "twelve point nine nine nine" are not; "one point two three four five k"
   * is $1,234.50 and is). amount.ts never takes an inexact group as money.
   */
  exact: boolean;
};

/** Decimal places a scale moves the point by: 100 → 2, 1000 → 3. */
function placesOf(multiplier: number): number {
  return Math.round(Math.log10(multiplier));
}

type Usable = (index: number) => boolean;

type Last = 'none' | 'a' | 'unit' | 'teen' | 'tens' | 'tensUnit' | 'hundred' | 'thousand' | 'and';

const NUMERIC_LAST = new Set<Last>(['unit', 'teen', 'tens', 'tensUnit', 'hundred', 'thousand']);

function keyAt(tokens: readonly Token[], index: number, usable: Usable): string | null {
  const token = tokens[index];
  return token && token.type === 'word' && usable(index) ? token.key : null;
}

/** "point five" → "5", "point ninety nine" → "99", "point oh five" → "05". */
function readDecimals(
  tokens: readonly Token[],
  start: number,
  usable: Usable,
): { digits: string; end: number } | null {
  const first = keyAt(tokens, start, usable);
  if (first === null) return null;

  if (first in TENS) {
    const unit = keyAt(tokens, start + 1, usable);
    if (unit !== null && unit in UNITS && UNITS[unit] > 0) {
      return { digits: String(TENS[first] + UNITS[unit]), end: start + 2 };
    }
    return { digits: String(TENS[first]), end: start + 1 };
  }
  if (first in TEENS) return { digits: String(TEENS[first]), end: start + 1 };

  let digits = '';
  let index = start;
  for (;;) {
    const key = keyAt(tokens, index, usable);
    if (key === null) break;
    if (key in UNITS) digits += String(UNITS[key]);
    else if (key === 'oh') digits += '0';
    else break;
    index += 1;
  }
  return digits ? { digits, end: index } : null;
}

function scaleOf(key: string | null): number | null {
  if (key === null) return null;
  if (key in THOUSANDS) return THOUSANDS[key];
  if (key === 'million') return 1_000_000;
  return null;
}

/** A digit token, with a scale word after it: "1800", "$15.99", "12 hundred", "1.2 k". */
function readDigits(tokens: readonly Token[], start: number, usable: Usable): Group | null {
  const literal = tokens[start].num;
  if (!literal) return null;

  let cents = literal.cents;
  let end = start + 1;
  let scaled = literal.thousands;
  let thousands = literal.thousands;
  let exact = literal.exact;

  if (!literal.thousands) {
    const next = keyAt(tokens, end, usable);
    const multiplier = next === 'hundred' ? 100 : scaleOf(next);
    if (multiplier !== null) {
      // From the figure as written, not its rounded cents: "1.2345 thousand"
      // is $1,234.50.
      cents = toCents(literal.value * multiplier);
      exact = literal.significantDecimals - placesOf(multiplier) <= 2;
      end += 1;
      scaled = true;
      thousands = multiplier >= 1000;
    }
  }

  const simple =
    !literal.dollar &&
    !literal.grouped &&
    !scaled &&
    literal.integer !== null &&
    literal.integer >= 1 &&
    literal.integer <= 99 &&
    literal.digits <= 2;

  return {
    start,
    end,
    cents,
    whole: cents % 100 === 0 && literal.decimals === 0 ? cents / 100 : null,
    simple,
    // "12 05" reads like "twelve oh five", so a written leading zero counts.
    twoDigit:
      !literal.dollar &&
      !literal.grouped &&
      !scaled &&
      literal.integer !== null &&
      literal.digits === 2,
    dollar: literal.dollar,
    decimals: literal.decimals,
    thousands,
    scaled,
    exact,
  };
}

/**
 * Number words, the standard English way: units after tens ("forty five"),
 * "hundred" multiplies what came before ("thirty seven hundred" = 3,700,
 * "two hundred" = 200), "thousand"/"grand"/"k" close off a thousands part,
 * "and" may follow a scale ("two hundred and five"), "a" may start one
 * ("a hundred", "a grand").
 *
 * The group stops at the first word that cannot continue it. That is what
 * splits "twelve fifty" into twelve | fifty (a tens word cannot follow a
 * teen) and "one fifty" into one | fifty, leaving amount.ts to decide what
 * the pair means.
 */
function readWords(tokens: readonly Token[], start: number, usable: Usable): Group | null {
  let total = 0;
  let current = 0;
  let last: Last = 'none';
  let index = start;
  let scaled = false;
  let thousands = false;
  let words = 0;

  for (;;) {
    const key = keyAt(tokens, index, usable);
    if (key === null) break;
    const afterScale =
      last === 'none' || last === 'hundred' || last === 'thousand' || last === 'and';

    if (key in UNITS) {
      if (last === 'tens') {
        if (UNITS[key] === 0) break;
        current += UNITS[key];
        last = 'tensUnit';
      } else if (afterScale) {
        current += UNITS[key];
        last = 'unit';
      } else break;
    } else if (key in TEENS) {
      if (!afterScale) break;
      current += TEENS[key];
      last = 'teen';
    } else if (key in TENS) {
      if (!afterScale) break;
      current += TENS[key];
      last = 'tens';
    } else if (key === 'hundred') {
      if (last === 'none' || last === 'hundred' || last === 'thousand' || last === 'and') break;
      if (current < 1 || current > 99) break;
      current *= 100;
      last = 'hundred';
      scaled = true;
    } else if (scaleOf(key) !== null) {
      if (last === 'none' || last === 'thousand' || last === 'and') break;
      if (current < 1) break;
      total += current * (scaleOf(key) as number);
      current = 0;
      last = 'thousand';
      scaled = true;
      thousands = true;
      if (key === 'grand' || key === 'k') {
        index += 1;
        words += 1;
        break;
      }
    } else if (key === 'and') {
      const next = keyAt(tokens, index + 1, usable);
      const numberNext = next !== null && (next in UNITS || next in TEENS || next in TENS);
      if ((last === 'hundred' || last === 'thousand') && numberNext) last = 'and';
      else break;
    } else if (key === 'a' || key === 'an') {
      const next = keyAt(tokens, index + 1, usable);
      if (last !== 'none' || (next !== 'hundred' && scaleOf(next) === null)) break;
      current = 1;
      last = 'a';
    } else break;

    index += 1;
    if (key !== 'and' && key !== 'a' && key !== 'an') words += 1;
  }

  if (!NUMERIC_LAST.has(last) || words === 0) return null;

  const whole = total + current;
  let cents = whole * 100;
  let decimals = 0;
  let exact = true;
  let end = index;

  // "twelve point five", "one point two k".
  if (keyAt(tokens, end, usable) === 'point' && last !== 'thousand') {
    const fraction = readDecimals(tokens, end + 1, usable);
    if (fraction) {
      decimals = fraction.digits.length;
      end = fraction.end;
      const scale = scaleOf(keyAt(tokens, end, usable));
      const value = Number(`${whole}.${fraction.digits}`);
      const significant = fraction.digits.replace(/0+$/, '').length;
      exact = significant - (scale === null ? 0 : placesOf(scale)) <= 2;
      if (scale !== null) {
        cents = toCents(value * scale);
        end += 1;
        scaled = true;
        thousands = true;
      } else {
        cents = toCents(value);
      }
    }
  }

  const simple = !scaled && decimals === 0 && whole >= 1 && whole <= 99 && words <= 2;

  return {
    start,
    end,
    cents,
    whole: decimals === 0 ? cents / 100 : null,
    simple,
    twoDigit: simple && whole >= 10,
    dollar: false,
    decimals,
    thousands,
    scaled,
    exact,
  };
}

/** One number group starting at `start`, or null when no number starts there. */
export function readGroup(tokens: readonly Token[], start: number, usable: Usable): Group | null {
  const token = tokens[start];
  if (!token || !usable(start)) return null;
  if (token.type === 'number') return readDigits(tokens, start, usable);
  if (token.type === 'word') return readWords(tokens, start, usable);
  return null;
}
