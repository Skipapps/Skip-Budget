import { monthShort } from '@/i18n/calendar';
import { NBSP } from '@/i18n/number';
import { getLocaleSnapshot } from '@/i18n/store';
import { fromCents, toCents } from '@/lib/money';

/**
 * Week maths for spending habits. Days are local calendar dates, `YYYY-MM-DD`, and weeks run
 * Monday to Sunday. Money is summed in whole cents and turned back into a decimal once, at the end.
 *
 * Product rules:
 * - Saved = skipped days x price. A skipped day is one from the day the habit was created to
 *   yesterday with no receipt for the habit; today saves nothing until it is over. The price is the
 *   habit's current one.
 * - A day can be tapped from the creation day through today, never earlier: a receipt back-dated
 *   before the habit existed would not match the bank's record of that day.
 * - Spent = the sum of the habit receipts' own amounts dated in the week, edits included.
 */

/**
 * `startedOn` is the Monday of the week the habit was created: the week selector starts there.
 * `savedFrom` is the local day it was created: taps, Saved and the streak start there. Pass active
 * habits only.
 */
export type HabitMaths = { id: string; price: number; startedOn: string; savedFrom: string };

/** One receipt behind a filled day circle; `amount` is the receipt's own, which may differ from the price. */
export type HabitTap = { habitId: string; day: string; amount: number; receiptId: string };

export type DayState = 'tapped' | 'open' | 'today' | 'future' | 'before';

const DAY_MS = 86_400_000;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Days since 1970-01-01. UTC is used only as a calendar: it has no daylight saving, so every day is
 * exactly DAY_MS long and the device's timezone never moves a date (a DST week still has 7 days).
 * Throws on anything that is not a real calendar day, so a timestamp or "2026-02-30" cannot
 * quietly land on another day.
 */
function dayNumber(iso: string): number {
  const match = ISO_DAY.exec(iso);
  const day = match
    ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS
    : Number.NaN;
  if (!Number.isInteger(day) || isoDay(day) !== iso) {
    throw new RangeError(`Not a calendar day (YYYY-MM-DD): ${iso}`);
  }
  return day;
}

function isoDay(day: number): string {
  const date = new Date(day * DAY_MS);
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

/** 1970-01-01 was a Thursday, three days after a Monday. */
function mondayOf(day: number): number {
  return day - ((((day + 3) % 7) + 7) % 7);
}

/** Any day of a week names that week, so a stray non-Monday never shifts the strip to Wed..Tue. */
function weekOf(weekStart: string): number {
  return mondayOf(dayNumber(weekStart));
}

function dayNumbers(days: Iterable<string>): Set<number> {
  const found = new Set<number>();
  for (const day of days) found.add(dayNumber(day));
  return found;
}

/** countsFrom as a day number. */
function firstSavingDay(habit: HabitMaths): number {
  return Math.max(dayNumber(habit.startedOn), dayNumber(habit.savedFrom));
}

/** Days in [from, to] without a tap. Tapped days are a set, so two receipts on one day count once. */
function skippedDays(tapped: ReadonlySet<number>, from: number, to: number): number {
  if (to < from) return 0;
  let tappedInside = 0;
  for (const day of tapped) {
    if (day >= from && day <= to) tappedInside += 1;
  }
  return to - from + 1 - tappedInside;
}

/** The Monday on or before `day`. */
export function weekStartOf(day: string): string {
  return isoDay(mondayOf(dayNumber(day)));
}

/** Monday to Sunday. */
export function weekDays(weekStart: string): string[] {
  const monday = weekOf(weekStart);
  return Array.from({ length: 7 }, (_, index) => isoDay(monday + index));
}

/** The Monday `by` weeks away (negative goes back). */
export function shiftWeek(weekStart: string, by: number): string {
  if (!Number.isInteger(by)) throw new RangeError(`Weeks are shifted whole: ${by}`);
  return isoDay(weekOf(weekStart) + 7 * by);
}

export function isCurrentWeek(weekStart: string, today: string): boolean {
  return weekOf(weekStart) === weekOf(today);
}

/** The Monday of the earliest start: the week selector's back limit. Null with no habits. */
export function earliestWeek(habits: readonly HabitMaths[]): string | null {
  let earliest: number | null = null;
  for (const habit of habits) {
    const started = dayNumber(habit.startedOn);
    if (earliest === null || started < earliest) earliest = started;
  }
  return earliest === null ? null : isoDay(mondayOf(earliest));
}

/**
 * Open from countsFrom through today. A day with a receipt is always 'tapped', even before
 * countsFrom or in the future (an older tap, or a receipt re-dated there): real money is never
 * hidden, and the circle offers the undo.
 */
export function dayState(habit: HabitMaths, day: string, tapped: boolean, today: string): DayState {
  if (tapped) return 'tapped';
  const date = dayNumber(day);
  const now = dayNumber(today);
  if (date > now) return 'future';
  if (date < firstSavingDay(habit)) return 'before';
  if (date === now) return 'today';
  return 'open';
}

/**
 * One habit's taps by day, for the circles and the undo. If a day somehow holds two receipts the
 * first one listed stands for it; the circle stays filled until both are gone.
 */
export function tapsForHabit(taps: readonly HabitTap[], habitId: string): Map<string, HabitTap> {
  const byDay = new Map<string, HabitTap>();
  for (const tap of taps) {
    if (tap.habitId === habitId && !byDay.has(tap.day)) byDay.set(tap.day, tap);
  }
  return byDay;
}

/**
 * The first day that can be tapped and that saves, `YYYY-MM-DD`: max(startedOn, savedFrom), so a
 * creation day before the start opens nothing earlier. Later than the start Monday when the habit
 * was created mid-week, which makes its first week a partial one.
 */
export function countsFrom(habit: HabitMaths): string {
  return isoDay(firstSavingDay(habit));
}

/** Untapped days from max(countsFrom, Monday) to min(yesterday, Sunday): the days Saved pays for. */
export function skippedDaysInWeek(
  habit: HabitMaths,
  tappedDays: Iterable<string>,
  weekStart: string,
  today: string,
): number {
  const monday = weekOf(weekStart);
  const from = Math.max(monday, firstSavingDay(habit));
  const to = Math.min(monday + 6, dayNumber(today) - 1);
  return skippedDays(dayNumbers(tappedDays), from, to);
}

/** Untapped days from countsFrom to yesterday. */
export function skippedDaysAllTime(
  habit: HabitMaths,
  tappedDays: Iterable<string>,
  today: string,
): number {
  return skippedDays(dayNumbers(tappedDays), firstSavingDay(habit), dayNumber(today) - 1);
}

/** Saved this week: skippedDaysInWeek x price, in whole cents. */
export function savedInWeek(
  habit: HabitMaths,
  tappedDays: Iterable<string>,
  weekStart: string,
  today: string,
): number {
  const days = skippedDaysInWeek(habit, tappedDays, weekStart, today);
  return fromCents(days * toCents(habit.price));
}

/** Saved: skippedDaysAllTime x price for each habit given (the active ones), in whole cents. */
export function savedAllTime(
  habits: readonly HabitMaths[],
  taps: readonly HabitTap[],
  today: string,
): number {
  const tappedByHabit = new Map<string, string[]>();
  for (const tap of taps) {
    const days = tappedByHabit.get(tap.habitId) ?? [];
    days.push(tap.day);
    tappedByHabit.set(tap.habitId, days);
  }

  let cents = 0;
  const counted = new Set<string>();
  for (const habit of habits) {
    if (counted.has(habit.id)) continue;
    counted.add(habit.id);
    const days = skippedDaysAllTime(habit, tappedByHabit.get(habit.id) ?? [], today);
    cents += days * toCents(habit.price);
  }
  return fromCents(cents);
}

/**
 * The receipts' own amounts dated Monday to Sunday, optionally for some habits only. Every receipt
 * counts, two on one day included (both are real money); a receipt listed twice counts once.
 */
export function spentInWeek(
  taps: readonly HabitTap[],
  weekStart: string,
  habitIds?: Iterable<string>,
): number {
  const monday = weekOf(weekStart);
  const only = habitIds === undefined ? null : new Set(habitIds);
  const seen = new Set<string>();

  let cents = 0;
  for (const tap of taps) {
    if (only && !only.has(tap.habitId)) continue;
    const day = dayNumber(tap.day);
    if (day < monday || day > monday + 6 || seen.has(tap.receiptId)) continue;
    seen.add(tap.receiptId);
    cents += toCents(tap.amount);
  }
  return fromCents(cents);
}

/**
 * Untapped days in a row ending yesterday, never reaching before the first saving day; 0 if
 * yesterday was tapped.
 */
export function skipStreak(habit: HabitMaths, tappedDays: Iterable<string>, today: string): number {
  const yesterday = dayNumber(today) - 1;
  const first = firstSavingDay(habit);
  if (yesterday < first) return 0;

  let lastTapped = first - 1;
  for (const day of dayNumbers(tappedDays)) {
    if (day <= yesterday && day > lastTapped) lastTapped = day;
  }
  return yesterday - lastTapped;
}

/**
 * "Oct 5 – 11", "Sep 28 – Oct 4", "Dec 29 – Jan 4"; Spanish and French put the day first
 * ("5 – 11 oct."). No-break spaces hold each end and the dash together, so a line that must wrap
 * breaks only after the dash.
 */
export function formatWeekRange(weekStart: string): string {
  const monday = weekOf(weekStart);
  const first = new Date(monday * DAY_MS);
  const last = new Date((monday + 6) * DAY_MS);
  const dayFirst = getLocaleSnapshot().language !== 'en';

  const end = (date: Date) => {
    const month = monthShort(date.getUTCMonth());
    const day = date.getUTCDate();
    return dayFirst ? `${day}${NBSP}${month}` : `${month}${NBSP}${day}`;
  };

  // Seven days share a month only within one year, so the year never needs comparing.
  if (first.getUTCMonth() === last.getUTCMonth()) {
    return dayFirst
      ? `${first.getUTCDate()}${NBSP}– ${end(last)}`
      : `${end(first)}${NBSP}– ${last.getUTCDate()}`;
  }
  return `${end(first)}${NBSP}– ${end(last)}`;
}
