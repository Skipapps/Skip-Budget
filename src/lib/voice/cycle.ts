/**
 * How often, for bills and subscriptions. Only the four cycles the forms offer (RECURRENCES in
 * src/data/bills-mock.ts, CYCLES in add-subscription.tsx) come back as a cycle. Rhythms the app
 * cannot store (every two weeks, twice a month) are still recognised, so their numbers are not read
 * as an amount, but the cycle stays null for the person to pick.
 *
 * Runs after dates, so "a month ago" is a date and not "a month".
 */
import type { Token } from './clean';
import { WEEKDAYS } from './date';
import type { VoiceCycle } from './types';

const PHRASES: [string[], VoiceCycle | null][] = [
  // Recurring, but not a cycle the app stores.
  [['every', 'other', 'week'], null],
  [['every', 'two', 'weeks'], null],
  [['every', '2', 'weeks'], null],
  [['biweekly'], null],
  [['bi', 'weekly'], null],
  [['fortnightly'], null],
  [['twice', 'a', 'month'], null],
  [['semi', 'monthly'], null],
  [['semimonthly'], null],
  [['every', 'other', 'month'], null],
  [['every', 'two', 'months'], null],
  [['every', '2', 'months'], null],
  [['bimonthly'], null],
  [['bi', 'monthly'], null],
  [['every', 'six', 'months'], null],
  [['every', '6', 'months'], null],
  [['twice', 'a', 'year'], null],
  [['semi', 'annually'], null],
  [['semiannually'], null],
  [['biannually'], null],
  [['semi', 'annual'], null],

  [['every', 'three', 'months'], 'quarterly'],
  [['every', '3', 'months'], 'quarterly'],
  [['every', 'quarter'], 'quarterly'],
  [['per', 'quarter'], 'quarterly'],
  [['each', 'quarter'], 'quarterly'],
  [['quarterly'], 'quarterly'],

  [['every', 'twelve', 'months'], 'yearly'],
  [['every', '12', 'months'], 'yearly'],
  [['once', 'a', 'year'], 'yearly'],
  [['every', 'year'], 'yearly'],
  [['each', 'year'], 'yearly'],
  [['per', 'year'], 'yearly'],
  [['a', 'year'], 'yearly'],
  [['per', 'annum'], 'yearly'],
  [['per', 'yr'], 'yearly'],
  [['a', 'yr'], 'yearly'],
  [['yearly'], 'yearly'],
  [['annually'], 'yearly'],
  [['annual'], 'yearly'],

  [['once', 'a', 'month'], 'monthly'],
  [['every', 'month'], 'monthly'],
  [['each', 'month'], 'monthly'],
  [['per', 'month'], 'monthly'],
  [['a', 'month'], 'monthly'],
  [['per', 'mo'], 'monthly'],
  [['a', 'mo'], 'monthly'],
  [['month', 'to', 'month'], 'monthly'],
  [['monthly'], 'monthly'],

  [['once', 'a', 'week'], 'weekly'],
  [['every', 'week'], 'weekly'],
  [['each', 'week'], 'weekly'],
  [['per', 'week'], 'weekly'],
  [['a', 'week'], 'weekly'],
  [['per', 'wk'], 'weekly'],
  [['weekly'], 'weekly'],
];

export const CYCLE_WORDS = new Set([
  ...PHRASES.flatMap(([words]) => words).filter((word) => !/^\d+$/.test(word)),
]);

export type CycleSpan = { start: number; end: number; cycle: VoiceCycle | null };

/** Every cycle phrase in the unclaimed tokens. "every friday" → weekly, "every 5th" → monthly. */
export function findCycles(tokens: readonly Token[], claimed: readonly boolean[]): CycleSpan[] {
  const usable = (index: number) => index < tokens.length && !claimed[index];
  const found: CycleSpan[] = [];

  for (let index = 0; index < tokens.length;) {
    if (!usable(index)) {
      index += 1;
      continue;
    }
    const phrase = PHRASES.find(([words]) =>
      words.every((word, offset) => usable(index + offset) && tokens[index + offset].key === word),
    );
    if (phrase) {
      found.push({ start: index, end: index + phrase[0].length, cycle: phrase[1] });
      index += phrase[0].length;
      continue;
    }
    // "every friday" (the weekday is the date's), "every 5th" / "every first of the month".
    if (tokens[index].key === 'every' || tokens[index].key === 'each') {
      const next = tokens[index + 1];
      if (next && next.key in WEEKDAYS) {
        found.push({ start: index, end: index + 1, cycle: 'weekly' });
      } else if (next && (next.type === 'ordinal' || next.key === 'first')) {
        found.push({ start: index, end: index + 1, cycle: 'monthly' });
      }
    }
    index += 1;
  }
  return found;
}
