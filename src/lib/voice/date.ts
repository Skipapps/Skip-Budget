/**
 * Dates, only when one was actually spoken. Finding a date and resolving it are separate, because
 * the same words point different ways:
 *
 * - **Backward**: the most recent matching day, today or earlier. Receipts always (a purchase has
 *   happened), and bills or subscriptions spoken in the past tense ("the electric bill was due on
 *   the 5th", "paid rent on the 1st").
 * - **Forward**: the next matching day, today or later. Bills and subscriptions said plainly or in
 *   the future ("due on the 15th", "renews on the 3rd").
 *
 * Words that fix the day ignore direction: today, yesterday, "3 days ago", "in a week", "last
 * Friday" (the most recent Friday before today), "next Friday" (the first after today), a date with
 * a year.
 *
 * ## Month ends
 * - Forward, a day the month does not have is clamped to the month's last day: "due on the 31st"
 *   said on 10 Feb is 28 Feb. This matches the monthly clamp in src/lib/date.ts and how US lenders
 *   set a due date in a short month.
 * - Backward, a day the month does not have is skipped: "on the 31st" said on 1 Oct is 31 Aug,
 *   because a purchase happened on a real calendar day.
 * - A named calendar date that does not exist ("September 31st") is no date.
 */
import { addDays, getDaysInMonth, toIsoDate } from '@/lib/date';

import type { Token } from './clean';
import { readGroup, TENS } from './numbers';

export const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

export const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const ORDINAL_UNITS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
};

const ORDINAL_WORDS: Record<string, number> = {
  ...ORDINAL_UNITS,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
  twentieth: 20,
  thirtieth: 30,
};

/** Words the date rules own, so the merchant rules leave them alone. */
export const DATE_WORDS = new Set([
  ...Object.keys(MONTHS),
  ...Object.keys(WEEKDAYS),
  ...Object.keys(ORDINAL_WORDS),
  'today',
  'tonight',
  'yesterday',
  'tomorrow',
  'ago',
  'morning',
  'afternoon',
  'evening',
  'night',
  'last',
  'next',
  'past',
  'coming',
  'day',
  'days',
  'week',
  'weeks',
  'month',
  'months',
  'year',
  'years',
]);

/**
 * Past tense on a bill or subscription turns a date backward. "was" counts only with what was done
 * ("was due", "was on the 5th"): in "no, it was 1850" it is about the amount, not the day.
 */
const PAST_WORDS = [
  ['paid'],
  ['renewed'],
  ['charged'],
  ['billed'],
  ['was', 'due'],
  ['were', 'due'],
  ['was', 'paid'],
  ['was', 'charged'],
  ['was', 'billed'],
  ['was', 'renewed'],
  ['was', 'taken'],
  ['was', 'on'],
  ['were', 'on'],
  ['came', 'out'],
  ['went', 'out'],
  ['took', 'out'],
  ['deducted'],
  ['debited'],
  ['withdrew'],
  ['withdrawn'],
  ['autopaid'],
  ['auto', 'paid'],
  ['already'],
];

/** ...unless a future or present word says otherwise. */
const FUTURE_WORDS = [
  ['will'],
  ['going', 'to'],
  ['gonna'],
  ['is', 'due'],
  ['are', 'due'],
  ['its', 'due'],
  ['renews'],
  ['upcoming'],
  ['coming', 'up'],
];

export type DateSpec =
  | { type: 'offset'; days: number }
  | { type: 'months'; months: number }
  | { type: 'weekday'; weekday: number; mode: 'last' | 'next' | 'direction' }
  | { type: 'day'; day: number }
  | { type: 'monthEnd' }
  | { type: 'monthDay'; month: number; day: number; year: number | null };

export type DateSpan = { start: number; end: number; spec: DateSpec };

type Usable = (index: number) => boolean;

function hasPhrase(tokens: readonly Token[], phrases: string[][]): boolean {
  return tokens.some((_, index) =>
    phrases.some((words) => words.every((word, offset) => tokens[index + offset]?.key === word)),
  );
}

/** Backward for receipts; for bills and subscriptions, only when spoken in the past tense. */
export function datesRunBackward(tokens: readonly Token[], kind: string): boolean {
  if (kind === 'receipt') return true;
  return hasPhrase(tokens, PAST_WORDS) && !hasPhrase(tokens, FUTURE_WORDS);
}

function readOrdinal(
  tokens: readonly Token[],
  start: number,
  usable: Usable,
): { day: number; end: number; digits: boolean } | null {
  const token = tokens[start];
  if (!token || !usable(start)) return null;
  if (token.type === 'ordinal' && token.ordinal !== undefined) {
    return { day: token.ordinal, end: start + 1, digits: true };
  }
  if (token.type !== 'word') return null;
  if (token.key in ORDINAL_WORDS)
    return { day: ORDINAL_WORDS[token.key], end: start + 1, digits: false };
  if ((token.key === 'twenty' || token.key === 'thirty') && usable(start + 1)) {
    const unit = tokens[start + 1]?.key ?? '';
    if (unit in ORDINAL_UNITS) {
      return { day: TENS[token.key] + ORDINAL_UNITS[unit], end: start + 2, digits: false };
    }
  }
  return null;
}

function readDayNumber(
  tokens: readonly Token[],
  start: number,
  usable: Usable,
): { day: number; end: number } | null {
  const ordinal = readOrdinal(tokens, start, usable);
  if (ordinal) return { day: ordinal.day, end: ordinal.end };
  const group = readGroup(tokens, start, usable);
  if (group && group.whole !== null && !group.dollar && !group.scaled && group.decimals === 0) {
    if (group.whole >= 1 && group.whole <= 31) return { day: group.whole, end: group.end };
  }
  return null;
}

/** A written year straight after the day: 2000–2099 only, so "rent 1800" stays money. */
function readYear(tokens: readonly Token[], start: number, usable: Usable): number | null {
  const token = tokens[start];
  if (!token || !usable(start) || token.type !== 'number' || !token.num) return null;
  const { integer, digits, dollar } = token.num;
  if (dollar || integer === null || digits !== 4) return null;
  return integer >= 2000 && integer <= 2099 ? integer : null;
}

function readCount(
  tokens: readonly Token[],
  start: number,
  usable: Usable,
): { count: number; end: number } | null {
  const key = usable(start) ? tokens[start]?.key : undefined;
  if (key === 'a' || key === 'an') return { count: 1, end: start + 1 };
  const group = readGroup(tokens, start, usable);
  if (
    group &&
    group.whole !== null &&
    !group.dollar &&
    group.decimals === 0 &&
    group.whole <= 366
  ) {
    return { count: group.whole, end: group.end };
  }
  return null;
}

function keysAt(tokens: readonly Token[], start: number, words: string[], usable: Usable): boolean {
  return words.every(
    (word, offset) => usable(start + offset) && tokens[start + offset]?.key === word,
  );
}

const UNIT_DAYS: Record<string, number> = { day: 1, days: 1, week: 7, weeks: 7 };
const UNIT_MONTHS: Record<string, number> = { month: 1, months: 1, year: 12, years: 12 };

function readDateAt(tokens: readonly Token[], index: number, usable: Usable): DateSpan | null {
  const key = tokens[index].key;
  const at = (words: string[], from = index) => keysAt(tokens, from, words, usable);

  for (const lead of [
    ['the', 'day', 'before', 'yesterday'],
    ['day', 'before', 'yesterday'],
  ]) {
    if (at(lead))
      return { start: index, end: index + lead.length, spec: { type: 'offset', days: -2 } };
  }
  for (const lead of [
    ['the', 'day', 'after', 'tomorrow'],
    ['day', 'after', 'tomorrow'],
  ]) {
    if (at(lead))
      return { start: index, end: index + lead.length, spec: { type: 'offset', days: 2 } };
  }
  if (key === 'yesterday')
    return { start: index, end: index + 1, spec: { type: 'offset', days: -1 } };
  if (at(['last', 'night']))
    return { start: index, end: index + 2, spec: { type: 'offset', days: -1 } };
  if (key === 'today' || key === 'tonight') {
    return { start: index, end: index + 1, spec: { type: 'offset', days: 0 } };
  }
  if (at(['this', 'morning']) || at(['this', 'afternoon']) || at(['this', 'evening'])) {
    return { start: index, end: index + 2, spec: { type: 'offset', days: 0 } };
  }
  if (key === 'tomorrow')
    return { start: index, end: index + 1, spec: { type: 'offset', days: 1 } };

  const count = readCount(tokens, key === 'in' ? index + 1 : index, usable);
  if (count) {
    const unit = usable(count.end) ? (tokens[count.end]?.key ?? '') : '';
    const ago = key !== 'in' && at(['ago'], count.end + 1);
    const ahead = key === 'in';
    if ((ago || ahead) && unit in UNIT_DAYS) {
      const days = count.count * UNIT_DAYS[unit] * (ago ? -1 : 1);
      return { start: index, end: count.end + (ago ? 2 : 1), spec: { type: 'offset', days } };
    }
    if ((ago || ahead) && unit in UNIT_MONTHS) {
      const months = count.count * UNIT_MONTHS[unit] * (ago ? -1 : 1);
      return { start: index, end: count.end + (ago ? 2 : 1), spec: { type: 'months', months } };
    }
  }

  const leads: [string[], 'last' | 'next' | 'direction'][] = [
    [['on', 'this', 'past'], 'last'],
    [['this', 'past'], 'last'],
    [['on', 'last'], 'last'],
    [['last'], 'last'],
    [['past'], 'last'],
    [['on', 'next'], 'next'],
    [['this', 'coming'], 'next'],
    [['next'], 'next'],
    [['coming'], 'next'],
    [['on', 'this'], 'direction'],
    [['this'], 'direction'],
    [['on'], 'direction'],
    [[], 'direction'],
  ];
  for (const [lead, mode] of leads) {
    if (lead.length > 0 && !at(lead)) continue;
    const dayIndex = index + lead.length;
    const dayKey = usable(dayIndex) ? tokens[dayIndex]?.key : undefined;
    if (dayKey !== undefined && dayKey in WEEKDAYS) {
      return {
        start: index,
        end: dayIndex + 1,
        spec: { type: 'weekday', weekday: WEEKDAYS[dayKey], mode },
      };
    }
  }

  for (const phrase of [
    ['the', 'end', 'of', 'the', 'month'],
    ['end', 'of', 'the', 'month'],
    ['end', 'of', 'month'],
    ['the', 'last', 'day', 'of', 'the', 'month'],
    ['last', 'day', 'of', 'the', 'month'],
  ]) {
    if (at(phrase)) return { start: index, end: index + phrase.length, spec: { type: 'monthEnd' } };
  }
  for (const phrase of [
    ['the', 'first', 'of', 'the', 'month'],
    ['first', 'of', 'the', 'month'],
    ['the', 'beginning', 'of', 'the', 'month'],
    ['beginning', 'of', 'the', 'month'],
    ['the', 'start', 'of', 'the', 'month'],
    ['start', 'of', 'the', 'month'],
  ]) {
    if (at(phrase))
      return { start: index, end: index + phrase.length, spec: { type: 'day', day: 1 } };
  }

  // Slash dates are US order: month first.
  if (tokens[index].type === 'slash') {
    const [month, day, year] = tokens[index].slash as [number, number, number | null];
    return { start: index, end: index + 1, spec: { type: 'monthDay', month, day, year } };
  }

  const onSkip = key === 'on' ? 1 : 0;
  const monthKey = usable(index + onSkip) ? tokens[index + onSkip]?.key : undefined;
  if (monthKey !== undefined && monthKey in MONTHS) {
    const theSkip = usable(index + onSkip + 1) && tokens[index + onSkip + 1]?.key === 'the' ? 1 : 0;
    const day = readDayNumber(tokens, index + onSkip + 1 + theSkip, usable);
    if (day) {
      const year = readYear(tokens, day.end, usable);
      return {
        start: index,
        end: year === null ? day.end : day.end + 1,
        spec: { type: 'monthDay', month: MONTHS[monthKey], day: day.day, year },
      };
    }
  }

  let lead = 0;
  if (at(['on', 'the'])) lead = 2;
  else if (key === 'the' || key === 'on') lead = 1;
  const before = tokens[index - 1]?.key;
  const ordinal = readOrdinal(tokens, index + lead, usable);
  if (ordinal) {
    // A word ordinal needs "the", "on" or "due" in front ("my first coffee" is not a date).
    const led = lead > 0 || before === 'due' || before === 'the' || before === 'on';
    if (ordinal.digits || led) {
      if (at(['of'], ordinal.end)) {
        const ofMonth = usable(ordinal.end + 1) ? tokens[ordinal.end + 1]?.key : undefined;
        if (ofMonth !== undefined && ofMonth in MONTHS) {
          const year = readYear(tokens, ordinal.end + 2, usable);
          return {
            start: index,
            end: ordinal.end + (year === null ? 2 : 3),
            spec: { type: 'monthDay', month: MONTHS[ofMonth], day: ordinal.day, year },
          };
        }
      }
      if (ordinal.day < 1 || ordinal.day > 31) return null;
      const ofTheMonth = at(['of', 'the', 'month'], ordinal.end) ? 3 : 0;
      return {
        start: index,
        end: ordinal.end + ofTheMonth,
        spec: { type: 'day', day: ordinal.day },
      };
    }
  }
  // A bare number is a day only after "on the" or "due (on) the": "rent 1800" never is.
  if (lead === 2 || (key === 'the' && before === 'due')) {
    const day = readDayNumber(tokens, index + lead, usable);
    if (day && day.day >= 1 && day.day <= 31) {
      const next = tokens[day.end]?.key ?? '';
      // "on the 5 bucks" is money, not a day.
      if (!['dollars', 'dollar', 'bucks', 'buck', 'cents'].includes(next)) {
        return { start: index, end: day.end, spec: { type: 'day', day: day.day } };
      }
    }
  }

  return null;
}

export function findDates(tokens: readonly Token[], claimed: readonly boolean[]): DateSpan[] {
  const usable: Usable = (index) => index >= 0 && index < tokens.length && !claimed[index];
  const found: DateSpan[] = [];
  for (let index = 0; index < tokens.length;) {
    const span = usable(index) ? readDateAt(tokens, index, usable) : null;
    if (span) {
      found.push(span);
      index = span.end;
    } else {
      index += 1;
    }
  }
  return found;
}

/** Local-midnight date for yyyy-mm-dd, or null when it is not a real day. */
function parseIso(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > getDaysInMonth(year, month - 1)) return null;
  return new Date(year, month - 1, day);
}

/** Day of a month (month zero-based, as Date has it), or null when that month has no such day. */
function realDay(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month, 1);
  const days = getDaysInMonth(date.getFullYear(), date.getMonth());
  return day <= days ? new Date(date.getFullYear(), date.getMonth(), day) : null;
}

function clampedDay(year: number, month: number, day: number): Date {
  const date = new Date(year, month, 1);
  const days = getDaysInMonth(date.getFullYear(), date.getMonth());
  return new Date(date.getFullYear(), date.getMonth(), Math.min(day, days));
}

function resolveDayOfMonth(day: number, today: Date, backward: boolean): Date | null {
  const year = today.getFullYear();
  const month = today.getMonth();
  if (backward) {
    for (let back = 0; back <= 12; back += 1) {
      const candidate = realDay(year, month - back, day);
      if (candidate && candidate <= today) return candidate;
    }
    return null;
  }
  const thisMonth = clampedDay(year, month, day);
  return thisMonth >= today ? thisMonth : clampedDay(year, month + 1, day);
}

function resolveMonthDay(
  spec: { month: number; day: number; year: number | null },
  today: Date,
  backward: boolean,
): Date | null {
  if (spec.month < 1 || spec.month > 12 || spec.day < 1) return null;
  if (spec.year !== null) return realDay(spec.year, spec.month - 1, spec.day);

  // Feb 29 needs a leap year, so look a few years each way.
  for (let step = 0; step <= 8; step += 1) {
    const year = today.getFullYear() + (backward ? -step : step);
    const candidate = realDay(year, spec.month - 1, spec.day);
    if (!candidate) continue;
    if (backward ? candidate <= today : candidate >= today) return candidate;
  }
  return null;
}

export function resolveDate(spec: DateSpec, backward: boolean, todayIso: string): string | null {
  const today = parseIso(todayIso);
  if (!today) return null;

  let date: Date | null = null;
  switch (spec.type) {
    case 'offset':
      date = addDays(today, spec.days);
      break;
    case 'months':
      date = clampedDay(today.getFullYear(), today.getMonth() + spec.months, today.getDate());
      break;
    case 'weekday': {
      const now = today.getDay();
      const back = (now - spec.weekday + 7) % 7;
      const ahead = (spec.weekday - now + 7) % 7;
      if (spec.mode === 'last') date = addDays(today, -(back || 7));
      else if (spec.mode === 'next') date = addDays(today, ahead || 7);
      else date = addDays(today, backward ? -back : ahead);
      break;
    }
    case 'day':
      if (spec.day < 1 || spec.day > 31) return null;
      date = resolveDayOfMonth(spec.day, today, backward);
      break;
    case 'monthEnd': {
      const thisEnd = clampedDay(today.getFullYear(), today.getMonth(), 31);
      if (!backward || thisEnd <= today) date = thisEnd;
      else date = clampedDay(today.getFullYear(), today.getMonth() - 1, 31);
      break;
    }
    case 'monthDay':
      date = resolveMonthDay(spec, today, backward);
      break;
  }
  return date ? toIsoDate(date) : null;
}
