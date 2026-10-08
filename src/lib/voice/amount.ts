/**
 * Which number is the amount, and is it settled? iOS writes most spoken prices as digits ("$15.99",
 * "45 bucks"), taken as written; words ("forty five", "a grand") are the fallback, one group each
 * (numbers.ts).
 *
 * Two groups side by side are never guessed. A 1-99 number followed straight away by a two-digit
 * number ("twelve fifty", "fifteen ninety nine", "twelve oh five", iOS's "12:50" or "15 99") has
 * two readings: "twelve fifty" is $12.50 or $1,250 (rent), "fifteen ninety nine" is $15.99 (a
 * streaming plan) or $1,599 (a laptop). Both are returned in `amountChoices` (ascending), the
 * review page asks, and `missing` keeps 'amount'. `amount` is pre-selected by kind: hundreds for a
 * bill (rent, car payment), dollars-and-cents otherwise. The pair is settled only when a unit word
 * pins the second half ("twelve dollars fifty", "a buck fifty", "twelve fifty cents", "$12 50");
 * "bucks" after the pair does not. A scale word removes the question: "twelve hundred fifty" is
 * $1,250.
 *
 * Only whole cents are money. A digit past the cent ("$3.459" a gas price, "twelve point nine nine
 * nine") is never an amount and never rounded into one. Trailing zeros are fine ("3.450"), and a
 * scale can make a figure whole ("1.2345k" is $1,234.50).
 *
 * With more than one number: dates and cycles claim their numbers first ("on the 5th", "every 3
 * months"). A price per something ("$3.45 a gallon", "$12 each") is never the amount: beside a
 * total the total settles, alone it is not offered. Of what remains, a number with a money marker
 * ($, bucks, cents, decimals, k, grand) beats a bare one, and a bare count followed by a noun ("2
 * pizzas") drops out when another number is left. Two different amounts that still remain are both
 * offered, never summed. A bare 1-99 straight before a money figure ("twelve fifty thousand")
 * cannot be read, so neither is offered.
 */
import type { Token } from './clean';
import { readGroup, UNITS, type Group } from './numbers';
import type { VoiceKind } from './types';

export const DOLLAR_UNITS = new Set(['dollar', 'dollars', 'buck', 'bucks', 'usd']);
export const CENT_UNITS = new Set(['cent', 'cents']);
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
  // "99:99" is not a time, so it is not offered as $99.99 / $9,999 either.
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

  // A digit past the cent is not an amount: rounding it would show money nobody said. Dropped with
  // its unit, so another figure can be the amount or none is.
  if (!group.exact) {
    const unit = DOLLAR_UNITS.has(next) || CENT_UNITS.has(next);
    return { candidate: null, end: unit ? group.end + 1 : group.end };
  }

  if (CENT_UNITS.has(next) && group.whole !== null && !group.dollar) {
    const end = group.end + 1;
    return { candidate: { start, end, readings: [group.whole], marked: true, bare: false }, end };
  }

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

  // "twelve fifty thousand", "twelve $50": a bare 1-99 straight before a money figure cannot be
  // read as one number, so neither is offered rather than settling on the marked half.
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

const PER_WORDS = new Set(['each', 'apiece', 'ea']);
/** After a, an or per: "$3.45 a gallon", "$150 per night". */
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

/** A price per something, not a total ("$3.45 a gallon", "$12 each"). Also used by multiple.ts. */
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

/** Pre-selected reading of an unsettled pair: hundreds for a bill, dollars-and-cents otherwise. */
function likelierReading(readings: readonly number[], kind: VoiceKind): number {
  return kind === 'bill' ? Math.max(...readings) : Math.min(...readings);
}

/**
 * Settles the amount from the candidates that survived corrections. `isNoun(index)` says whether
 * the token after a bare number is a noun it could be counting ("2 pizzas").
 */
export function chooseAmount(
  candidates: readonly AmountCandidate[],
  kind: VoiceKind,
  isNoun: (index: number) => boolean,
  tokens: readonly Token[],
): AmountResult {
  let pool = [...candidates];
  if (pool.length === 0) return { cents: null, choices: [] };

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
