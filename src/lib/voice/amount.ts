/**
 * Step 3b: which number is the amount, and is it settled?
 *
 * ## Digits first
 * iOS writes most spoken prices as digits ("$15.99", "1,800", "45 bucks",
 * "$1.2k"). Those are taken as written: the recogniser has already decided
 * where the decimal point goes, and the cents come out of `toCents`.
 *
 * ## Words are the fallback
 * "forty five", "two hundred and five", "a grand", "thirty seven hundred",
 * "eighteen hundred", "twelve dollars and fifty cents", "ninety nine cents",
 * "one point two k" — each is one group (numbers.ts) and one settled amount.
 *
 * ## The ambiguity rule: two groups side by side are never guessed
 * When a number from 1 to 99 is followed straight away by a two-digit number
 * ("twelve fifty", "fifteen ninety nine", "one twenty", "nine ninety nine",
 * "twelve oh five", or iOS's "12:50" and "15 99"), English allows two
 * readings and nothing in the words decides between them:
 *
 *   - dollars and cents:  "twelve fifty"        → $12.50
 *   - hundreds:           "twelve fifty"        → $1,250   (as rent is said)
 *   - dollars and cents:  "fifteen ninety nine" → $15.99   (a streaming plan)
 *   - hundreds:           "fifteen ninety nine" → $1,599   (a laptop)
 *   - hundreds:           "nine ninety nine"    → $999     (how Apple says it)
 *
 * Both readings are returned in `amountChoices` (ascending) and the review
 * page asks; `missing` keeps 'amount' so the draft never counts as settled.
 * `amount` is pre-selected by kind: the hundreds reading for a bill (rent,
 * car payment and the like are said in hundreds), the dollars-and-cents
 * reading for a receipt or subscription (retail prices are said that way).
 *
 * The pair is settled — one reading — only when a unit word pins the second
 * half: "twelve dollars fifty", "twelve fifty cents", "a buck fifty",
 * "twelve and fifty cents", or "$12 50". "bucks" after the pair does not
 * settle it ("twelve fifty bucks" is said of both).
 *
 * A scale word removes the question: "eighteen hundred" is $1,800,
 * "thirty seven hundred" is $3,700, "twelve hundred fifty" is $1,250.
 *
 * ## Only whole cents are money
 * A figure with a digit past the cent — "$3.459" (a gas price per gallon),
 * "$12.345", "twelve point nine nine nine" — is never an amount and never
 * rounded into one. It is dropped, so "$3.459 a gallon, $45.20 total" is
 * $45.20 and "$3.459 at Shell" has no amount. Trailing zeros are fine
 * ("3.450"); a scale can make a figure whole ("1.2345k" is $1,234.50).
 *
 * ## More than one number
 * Dates claim their numbers first ("on the 5th", "October 3rd 2026"), and
 * cycles theirs ("every 3 months"), so "rent 1800 on the 1st" has one
 * amount. A price per something ("$3.45 a gallon", "$12 each") is never the
 * amount: beside a total the total settles, and alone it is not offered,
 * because a per-gallon price is not what was paid. Of what remains: a number
 * with a money marker ($, bucks, dollars,
 * cents, decimals, k, grand) beats a bare one; a bare count followed by a
 * noun ("2 pizzas", "300 megabits") drops out when another number is left.
 * If two different amounts still remain, they are both offered — never
 * summed, never picked silently. A bare 1–99 straight before a money figure
 * ("twelve fifty thousand") cannot be read, so neither is offered.
 */
import type { Token } from './clean';
import { readGroup, UNITS, type Group } from './numbers';
import type { VoiceKind } from './types';

export const DOLLAR_UNITS = new Set(['dollar', 'dollars', 'buck', 'bucks', 'usd']);
export const CENT_UNITS = new Set(['cent', 'cents']);
/** A number followed by one of these is a time of day, not money. */
const TIME_WORDS = new Set(['am', 'pm', 'oclock']);

export type AmountCandidate = {
  start: number;
  /** Exclusive. */
  end: number;
  /** Cents. One reading, or two (ascending) for an unsettled pair. */
  readings: number[];
  /** $, a unit word, decimals, "k" or "grand": somebody clearly said money. */
  marked: boolean;
  /** A plain whole number with no marker: could be a count ("2 pizzas"). */
  bare: boolean;
};

type Usable = (index: number) => boolean;

function key(tokens: readonly Token[], index: number, usable: Usable): string | null {
  const token = tokens[index];
  return token && usable(index) ? token.key : null;
}

/** "fifty" or "50" (two digits) after "twelve", or "oh five". Returns the two-digit value. */
function readSecondHalf(
  tokens: readonly Token[],
  start: number,
  usable: Usable,
): { value: number; end: number } | null {
  if (key(tokens, start, usable) === 'oh') {
    const unit = key(tokens, start + 1, usable);
    if (unit !== null && unit in UNITS && UNITS[unit] > 0) {
      return { value: UNITS[unit], end: start + 2 };
    }
    return null;
  }
  const group = readGroup(tokens, start, usable);
  if (group && group.twoDigit && group.whole !== null && group.whole <= 99) {
    return { value: group.whole, end: group.end };
  }
  return null;
}

/** The cents after "dollars": "and fifty cents", "fifty", "99 cents". */
function readCentsTail(
  tokens: readonly Token[],
  start: number,
  usable: Usable,
): { cents: number; end: number } | null {
  const from = key(tokens, start, usable) === 'and' ? start + 1 : start;
  const group = readGroup(tokens, from, usable);
  if (!group || group.whole === null || group.whole > 99 || group.dollar || group.scaled) {
    return null;
  }
  const end = CENT_UNITS.has(key(tokens, group.end, usable) ?? '') ? group.end + 1 : group.end;
  // "and" with no "cents" after it is a new clause ("40 dollars and 2 coffees").
  if (from !== start && end === group.end) return null;
  return { cents: group.whole, end };
}

function pairReadings(dollars: number, twoDigits: number): number[] {
  const asCents = dollars * 100 + twoDigits;
  return [asCents, asCents * 100];
}

/** A clock time read as "twelve fifty": both readings, unless am/pm follows. */
function readTime(tokens: readonly Token[], start: number, usable: Usable): AmountCandidate | null {
  const [hours, minutes] = tokens[start].time as [number, number];
  if (TIME_WORDS.has(key(tokens, start + 1, usable) ?? '')) return null;
  // Only a real clock reading is "twelve fifty". "99:99" is not a time, so it is
  // not offered as $99.99 / $9,999 either (review L1).
  if (hours < 1 || hours > 23 || minutes > 59) return null;
  return {
    start,
    end: start + 1,
    readings: pairReadings(hours, minutes),
    marked: false,
    bare: false,
  };
}

type Read = { candidate: AmountCandidate | null; end: number };

function readAmountAt(tokens: readonly Token[], start: number, usable: Usable): Read | null {
  const token = tokens[start];
  if (token.type === 'time') return { candidate: readTime(tokens, start, usable), end: start + 1 };

  // "a buck fifty", "a dollar".
  if (
    (token.key === 'a' || token.key === 'an') &&
    DOLLAR_UNITS.has(key(tokens, start + 1, usable) ?? '')
  ) {
    const tail = readCentsTail(tokens, start + 2, usable);
    const end = tail ? tail.end : start + 2;
    return {
      candidate: { start, end, readings: [100 + (tail?.cents ?? 0)], marked: true, bare: false },
      end,
    };
  }

  const group: Group | null = readGroup(tokens, start, usable);
  if (!group) return null;

  const next = key(tokens, group.end, usable) ?? '';
  if (TIME_WORDS.has(next) || next === 'percent') return { candidate: null, end: group.end + 1 };

  // A digit past the cent ("$3.459 a gallon", "twelve point nine nine nine")
  // is not an amount: rounding it would show money nobody said. It is dropped,
  // with its unit, so another figure can be the amount or none is.
  if (!group.exact) {
    const unit = DOLLAR_UNITS.has(next) || CENT_UNITS.has(next);
    return { candidate: null, end: unit ? group.end + 1 : group.end };
  }

  // "ninety nine cents".
  if (CENT_UNITS.has(next) && group.whole !== null && !group.dollar) {
    const end = group.end + 1;
    return { candidate: { start, end, readings: [group.whole], marked: true, bare: false }, end };
  }

  // "forty five bucks", "twelve dollars and fifty cents", "$12 dollars".
  if (DOLLAR_UNITS.has(next)) {
    let cents = group.cents;
    let end = group.end + 1;
    const tail = readCentsTail(tokens, end, usable);
    if (tail && group.decimals === 0) {
      cents += tail.cents;
      end = tail.end;
    }
    return { candidate: { start, end, readings: [cents], marked: true, bare: false }, end };
  }

  // "twelve and fifty cents".
  if (next === 'and' && group.whole !== null && !group.scaled) {
    const tail = readCentsTail(tokens, group.end, usable);
    if (tail) {
      return {
        candidate: {
          start,
          end: tail.end,
          readings: [group.cents + tail.cents],
          marked: true,
          bare: false,
        },
        end: tail.end,
      };
    }
  }

  // The pair: "twelve fifty", "15 99", "twelve oh five", "$12 50".
  const dollarFirstHalf =
    group.dollar && group.whole !== null && !group.scaled && group.decimals === 0;
  if ((group.simple || dollarFirstHalf) && group.whole !== null) {
    const half = readSecondHalf(tokens, group.end, usable);
    if (half) {
      const [asDollarsAndCents, asHundreds] = pairReadings(group.whole, half.value);
      const after = key(tokens, half.end, usable) ?? '';
      if (CENT_UNITS.has(after)) {
        const end = half.end + 1;
        return {
          candidate: { start, end, readings: [asDollarsAndCents], marked: true, bare: false },
          end,
        };
      }
      if (dollarFirstHalf) {
        return {
          candidate: {
            start,
            end: half.end,
            readings: [asDollarsAndCents],
            marked: true,
            bare: false,
          },
          end: half.end,
        };
      }
      const unit = DOLLAR_UNITS.has(after);
      const end = unit ? half.end + 1 : half.end;
      return {
        candidate: {
          start,
          end,
          readings: [asDollarsAndCents, asHundreds],
          marked: unit,
          bare: false,
        },
        end,
      };
    }
  }

  const marked = group.dollar || group.decimals > 0 || group.thousands;
  return {
    candidate: {
      start,
      end: group.end,
      readings: [group.cents],
      marked,
      bare: !marked && group.whole !== null,
    },
    end: group.end,
  };
}

/** Every amount-shaped phrase in the unclaimed tokens, in spoken order. */
export function findAmounts(
  tokens: readonly Token[],
  claimed: readonly boolean[],
): AmountCandidate[] {
  const usable: Usable = (index) => index < tokens.length && !claimed[index];
  const found: AmountCandidate[] = [];

  for (let index = 0; index < tokens.length;) {
    if (!usable(index)) {
      index += 1;
      continue;
    }
    const read = readAmountAt(tokens, index, usable);
    if (!read) {
      index += 1;
      continue;
    }
    if (read.candidate && read.candidate.readings.every((cents) => cents > 0)) {
      found.push(read.candidate);
    }
    index = Math.max(read.end, index + 1);
  }

  // "twelve fifty thousand", "twelve $50": a bare 1–99 straight before a money
  // figure is neither a count nor a price on its own, and the two cannot be
  // read as one. Neither is offered, so the amount is left to the person
  // rather than settled on the marked half.
  const runsOn = (first: AmountCandidate | undefined, second: AmountCandidate | undefined) =>
    first !== undefined &&
    second !== undefined &&
    first.end === second.start &&
    isSmallBare(first) &&
    second.marked;
  return found.filter(
    (candidate, index) =>
      !runsOn(candidate, found[index + 1]) && !runsOn(found[index - 1], candidate),
  );
}

/** A plain whole number from 1 to 99, no marker: the first half of a compound. */
function isSmallBare(candidate: AmountCandidate): boolean {
  const [cents] = candidate.readings;
  return (
    candidate.bare &&
    candidate.readings.length === 1 &&
    cents % 100 === 0 &&
    cents >= 100 &&
    cents <= 9900
  );
}

/** "$20 each", "$5 apiece". */
const PER_WORDS = new Set(['each', 'apiece', 'ea']);
/** "$3.45 a gallon", "$150 per night": a, an or per before one of these. */
const PRICE_UNITS = new Set([
  'gallon',
  'gal',
  'litre',
  'liter',
  'pound',
  'lb',
  'lbs',
  'kilo',
  'kg',
  'ounce',
  'oz',
  'hour',
  'hr',
  'night',
  'day',
  'item',
  'piece',
  'unit',
  'pack',
  'box',
  'ticket',
  'person',
  'head',
]);

/**
 * A price per something, not a total: "$3.45 a gallon", "$4 a pound", "$12
 * each", "$150 per night". The amount pick and the several-transactions rule
 * (multiple.ts) both use this one test.
 */
export function isUnitPrice(tokens: readonly Token[], candidate: AmountCandidate): boolean {
  const next = tokens[candidate.end]?.key ?? '';
  if (PER_WORDS.has(next)) return true;
  const unit = tokens[candidate.end + 1]?.key ?? '';
  return (next === 'a' || next === 'an' || next === 'per') && PRICE_UNITS.has(unit);
}

export type AmountResult = {
  /** Cents, or null when no amount was heard. */
  cents: number | null;
  /** Cents, ascending; two or more only when unsettled. */
  choices: number[];
};

/** The pre-selected reading of an unsettled pair. See the module comment. */
export function likelierReading(readings: readonly number[], kind: VoiceKind): number {
  return kind === 'bill' ? Math.max(...readings) : Math.min(...readings);
}

/**
 * Settles the amount from the candidates that survived corrections.
 *
 * `isNoun(index)` says whether the token after a bare number is a noun it
 * could be counting ("2 *pizzas*").
 */
export function chooseAmount(
  candidates: readonly AmountCandidate[],
  kind: VoiceKind,
  isNoun: (index: number) => boolean,
  tokens: readonly Token[],
): AmountResult {
  let pool = [...candidates];
  if (pool.length === 0) return { cents: null, choices: [] };

  // A price per something is never what was paid. With a total beside it the
  // total is the amount; on its own it is not offered at all.
  pool = pool.filter((candidate) => !isUnitPrice(tokens, candidate));
  if (pool.length === 0) return { cents: null, choices: [] };

  const marked = pool.filter((candidate) => candidate.marked);
  if (marked.length > 0) {
    pool = marked;
  } else if (pool.length > 1) {
    const amounts = pool.filter((candidate) => !(candidate.bare && isNoun(candidate.end)));
    if (amounts.length > 0) pool = amounts;
  }

  const distinct = [...new Set(pool.flatMap((candidate) => candidate.readings))].sort(
    (a, b) => a - b,
  );
  const first = pool[0];
  const cents =
    first.readings.length > 1 ? likelierReading(first.readings, kind) : first.readings[0];

  return { cents, choices: distinct.length > 1 ? distinct : [] };
}
