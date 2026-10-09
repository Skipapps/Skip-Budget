import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { addDays, toIsoDate } from '@/lib/date';
import {
  countsFrom,
  dayState,
  earliestWeek,
  formatWeekRange,
  isCurrentWeek,
  savedAllTime,
  savedInWeek,
  shiftWeek,
  skippedDaysAllTime,
  skippedDaysInWeek,
  skipStreak,
  spentInWeek,
  tapsForHabit,
  weekDays,
  weekStartOf,
  type HabitMaths,
  type HabitTap,
} from '@/lib/habit-week';
import { toCents } from '@/lib/money';

afterEach(() => resetLocaleForTests());

// Fixtures are hand-counted calendars. 2026-10-05 is a Monday; "today" is Wednesday 2026-10-07
// unless a test says otherwise.
const WEDNESDAY = '2026-10-07';
const THIS_WEEK = '2026-10-05';

let receiptCount = 0;
function tap(habitId: string, day: string, amount: number, receiptId?: string): HabitTap {
  receiptCount += 1;
  return { habitId, day, amount, receiptId: receiptId ?? `receipt-${receiptCount}` };
}

/** A habit created on its start Monday unless a creation day is given. */
function habit(id: string, price: number, startedOn: string, savedFrom = startedOn): HabitMaths {
  return { id, price, startedOn, savedFrom };
}

const coffee = habit('coffee', 5, THIS_WEEK);

/**
 * The app's own local-calendar walk (Date#setDate, then toIsoDate), which the habit maths must
 * equal in whatever timezone the tests run.
 */
function localWalk(from: string, count: number): string[] {
  const [year, month, day] = from.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  return Array.from({ length: count }, (_, index) => toIsoDate(addDays(start, index)));
}

/** The range with its no-break spaces shown as plain ones, so expectations read as on screen. */
const plain = (text: string) => text.replace(/ /g, ' ');

describe('weekStartOf', () => {
  it('is the Monday for every day Monday to Sunday', () => {
    for (const day of localWalk(THIS_WEEK, 7)) {
      expect(weekStartOf(day)).toBe(THIS_WEEK);
    }
  });

  it('puts Sunday at the end of its week, not the start of the next', () => {
    expect(weekStartOf('2026-10-04')).toBe('2026-09-28');
    expect(weekStartOf('2026-10-11')).toBe(THIS_WEEK);
    expect(weekStartOf('2026-10-12')).toBe('2026-10-12');
  });

  it('crosses a month and a year', () => {
    expect(weekStartOf('2026-10-01')).toBe('2026-09-28');
    expect(weekStartOf('2027-01-03')).toBe('2026-12-28');
    expect(weekStartOf('2026-01-01')).toBe('2025-12-29');
  });
});

describe('weekDays', () => {
  it('lists Monday to Sunday', () => {
    expect(weekDays(THIS_WEEK)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
  });

  it('takes any day of a week as that week', () => {
    expect(weekDays(WEDNESDAY)).toEqual(weekDays(THIS_WEEK));
    expect(weekDays('2026-10-11')).toEqual(weekDays(THIS_WEEK));
  });

  it.each([
    ['US clocks go forward (Sun 8 Mar 2026)', '2026-03-02', '2026-03-08'],
    ['Europe clocks go forward (Sun 29 Mar 2026)', '2026-03-23', '2026-03-29'],
    ['Europe clocks go back (Sun 25 Oct 2026)', '2026-10-19', '2026-10-25'],
    ['US clocks go back (Sun 1 Nov 2026)', '2026-10-26', '2026-11-01'],
  ])('keeps 7 distinct days through a DST change: %s', (_, monday, sunday) => {
    const days = weekDays(monday);
    expect(new Set(days).size).toBe(7);
    expect(days[0]).toBe(monday);
    expect(days[6]).toBe(sunday);
    expect(days).toEqual(localWalk(monday, 7));
    expect(weekStartOf(sunday)).toBe(monday);
    expect(shiftWeek(monday, 1)).toBe(localWalk(monday, 8)[7]);
    expect(shiftWeek(shiftWeek(monday, 1), -1)).toBe(monday);
  });

  it('crosses a year and a leap day', () => {
    expect(weekDays('2025-12-29')).toEqual([
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
    ]);
    expect(weekDays('2028-02-28')).toEqual([
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
      '2028-03-02',
      '2028-03-03',
      '2028-03-04',
      '2028-03-05',
    ]);
  });

  it('matches the local calendar for every week of three years, every DST change included', () => {
    const mondays: string[] = [];
    let monday = '2025-12-29';
    for (let week = 0; week < 157; week += 1) {
      mondays.push(monday);
      monday = shiftWeek(monday, 1);
    }
    const flat = mondays.flatMap((start) => weekDays(start));
    expect(flat).toEqual(localWalk('2025-12-29', 157 * 7));
    expect(new Set(flat).size).toBe(157 * 7);
  });
});

describe('shiftWeek', () => {
  it('moves whole weeks either way across months and years', () => {
    expect(shiftWeek(THIS_WEEK, -1)).toBe('2026-09-28');
    expect(shiftWeek(THIS_WEEK, 1)).toBe('2026-10-12');
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04');
    expect(shiftWeek('2027-01-04', -1)).toBe('2026-12-28');
    expect(shiftWeek(THIS_WEEK, 52)).toBe('2027-10-04');
  });

  it('lands on a Monday from any day of the week', () => {
    expect(shiftWeek(WEDNESDAY, 0)).toBe(THIS_WEEK);
    expect(shiftWeek('2026-10-11', -1)).toBe('2026-09-28');
  });

  it('refuses part of a week', () => {
    expect(() => shiftWeek(THIS_WEEK, 0.5)).toThrow(RangeError);
  });
});

describe('isCurrentWeek and earliestWeek', () => {
  it('knows the week today is in, whichever day names it', () => {
    expect(isCurrentWeek(THIS_WEEK, WEDNESDAY)).toBe(true);
    expect(isCurrentWeek('2026-10-11', WEDNESDAY)).toBe(true);
    expect(isCurrentWeek('2026-09-28', WEDNESDAY)).toBe(false);
    expect(isCurrentWeek('2026-10-12', WEDNESDAY)).toBe(false);
    expect(isCurrentWeek('2026-12-28', '2027-01-03')).toBe(true);
  });

  it('is the Monday of the earliest start, or null with no habits', () => {
    expect(earliestWeek([])).toBeNull();
    expect(earliestWeek([coffee, habit('lunch', 15, '2026-09-28'), coffee])).toBe('2026-09-28');
    // A start that is not a Monday still gives its week's Monday.
    expect(earliestWeek([habit('odd', 1, '2026-10-01')])).toBe('2026-09-28');
  });
});

describe('dayState', () => {
  it('reads a week strip started this Monday, today Wednesday', () => {
    const tapped = tapsForHabit([tap('coffee', '2026-10-06', 5)], 'coffee');
    const strip = weekDays(THIS_WEEK).map((day) =>
      dayState(coffee, day, tapped.has(day), WEDNESDAY),
    );
    expect(strip).toEqual(['open', 'tapped', 'today', 'future', 'future', 'future', 'future']);
  });

  it('fades the days before the start', () => {
    const lunch = habit('lunch', 15, '2026-10-05');
    expect(dayState(lunch, '2026-10-04', false, WEDNESDAY)).toBe('before');
    expect(dayState(lunch, '2026-09-28', false, WEDNESDAY)).toBe('before');
  });

  it('shows a receipt wherever it is dated: before the start, today or in the future', () => {
    expect(dayState(coffee, '2026-10-04', true, WEDNESDAY)).toBe('tapped');
    expect(dayState(coffee, WEDNESDAY, true, WEDNESDAY)).toBe('tapped');
    expect(dayState(coffee, '2026-10-09', true, WEDNESDAY)).toBe('tapped');
  });

  it('calls a future day future even before the start', () => {
    const late = habit('late', 5, '2026-10-12');
    expect(dayState(late, '2026-10-08', false, WEDNESDAY)).toBe('future');
    expect(dayState(late, WEDNESDAY, false, WEDNESDAY)).toBe('before');
  });
});

describe('savedInWeek', () => {
  it('saves one price per untapped day from Monday to yesterday (started this week, today Wednesday)', () => {
    expect(savedInWeek(coffee, [], THIS_WEEK, WEDNESDAY)).toBe(10); // Mon, Tue
    expect(savedInWeek(coffee, ['2026-10-05'], THIS_WEEK, WEDNESDAY)).toBe(5); // Tue
    expect(savedInWeek(coffee, ['2026-10-05', '2026-10-06'], THIS_WEEK, WEDNESDAY)).toBe(0);
  });

  it('does not count today until it is over, nor a future day', () => {
    expect(savedInWeek(coffee, [WEDNESDAY], THIS_WEEK, WEDNESDAY)).toBe(10);
    expect(savedInWeek(coffee, ['2026-10-09'], THIS_WEEK, WEDNESDAY)).toBe(10);
    expect(savedInWeek(coffee, [], THIS_WEEK, '2026-10-08')).toBe(15);
    expect(savedInWeek(coffee, [WEDNESDAY], THIS_WEEK, '2026-10-08')).toBe(10);
  });

  it('counts a whole past week, and nothing before the start or in a future week', () => {
    const lunch = habit('lunch', 15, '2026-09-28');
    expect(savedInWeek(lunch, ['2026-10-01'], '2026-09-28', WEDNESDAY)).toBe(90); // 6 x 15
    expect(savedInWeek(lunch, [], '2026-09-21', WEDNESDAY)).toBe(0);
    expect(savedInWeek(lunch, [], '2026-10-12', WEDNESDAY)).toBe(0);
  });

  it('is cent-exact on a price with cents', () => {
    const snacks = habit('snacks', 4.75, THIS_WEEK);
    expect(savedInWeek(snacks, [], THIS_WEEK, '2026-10-08')).toBe(14.25); // 3 x 4.75

    // 0.07 * 3 is 0.21000000000000002 and 19.99 * 7 is 139.92999999999998 in floating point.
    expect(0.07 * 3).not.toBe(0.21);
    const gum = habit('gum', 0.07, THIS_WEEK);
    expect(savedInWeek(gum, [], THIS_WEEK, '2026-10-08')).toBe(0.21);
    const books = habit('books', 19.99, THIS_WEEK);
    expect(savedInWeek(books, [], THIS_WEEK, '2026-10-12')).toBe(139.93);
  });

  it('counts a day once however many receipts it has, and takes a Set', () => {
    expect(savedInWeek(coffee, ['2026-10-05', '2026-10-05'], THIS_WEEK, WEDNESDAY)).toBe(5);
    expect(savedInWeek(coffee, new Set(['2026-10-06']), THIS_WEEK, WEDNESDAY)).toBe(5);
  });

  it('ignores the receipt amount: saved is days x price', () => {
    const edited = [tap('coffee', '2026-10-05', 6.4)];
    expect(savedInWeek(coffee, tapsForHabit(edited, 'coffee').keys(), THIS_WEEK, WEDNESDAY)).toBe(
      5,
    );
  });

  it('counts 7 days in a DST week', () => {
    const europe = habit('eu', 3, '2026-10-19');
    expect(savedInWeek(europe, [], '2026-10-19', '2026-10-26')).toBe(21);
    const us = habit('us', 3, '2026-03-02');
    expect(savedInWeek(us, [], '2026-03-02', '2026-03-09')).toBe(21);
    expect(savedInWeek(us, ['2026-03-08'], '2026-03-02', '2026-03-09')).toBe(18);
  });

  it('runs across a year boundary', () => {
    const snacks = habit('snacks', 4.75, '2026-12-28');
    // Today Saturday 2 Jan 2027: Mon 28 Dec to Fri 1 Jan.
    expect(savedInWeek(snacks, [], '2026-12-28', '2027-01-02')).toBe(23.75);
    expect(savedInWeek(snacks, ['2026-12-31'], '2026-12-28', '2027-01-02')).toBe(19);
  });

  it('takes any day of the week as the week', () => {
    expect(savedInWeek(coffee, [], '2026-10-10', WEDNESDAY)).toBe(10);
  });
});

describe('spentInWeek', () => {
  it('sums the receipts’ own amounts, an edited one included', () => {
    const taps = [tap('coffee', '2026-10-05', 6.4), tap('coffee', '2026-10-06', 5)];
    expect(spentInWeek(taps, THIS_WEEK)).toBe(11.4);
  });

  it('is cent-exact: 0.10 + 0.20 is 0.30', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    const taps = [tap('gum', '2026-10-05', 0.1), tap('gum', '2026-10-06', 0.2)];
    expect(spentInWeek(taps, THIS_WEEK)).toBe(0.3);
  });

  it('counts only receipts dated Monday to Sunday', () => {
    const taps = [
      tap('coffee', '2026-10-04', 5), // the Sunday before
      tap('coffee', THIS_WEEK, 4.75),
      tap('coffee', '2026-10-11', 5.25),
      tap('coffee', '2026-10-12', 5), // the Monday after
    ];
    expect(spentInWeek(taps, THIS_WEEK)).toBe(10);
    expect(spentInWeek(taps, WEDNESDAY)).toBe(10);
  });

  it('can be limited to some habits', () => {
    const taps = [tap('coffee', THIS_WEEK, 5), tap('lunch', THIS_WEEK, 15.5)];
    expect(spentInWeek(taps, THIS_WEEK)).toBe(20.5);
    expect(spentInWeek(taps, THIS_WEEK, ['coffee'])).toBe(5);
    expect(spentInWeek(taps, THIS_WEEK, new Set(['lunch']))).toBe(15.5);
    expect(spentInWeek(taps, THIS_WEEK, [])).toBe(0);
  });

  it('counts two receipts on one day, and a receipt listed twice once', () => {
    const taps = [
      tap('coffee', THIS_WEEK, 5, 'a'),
      tap('coffee', THIS_WEEK, 3.5, 'b'),
      tap('coffee', THIS_WEEK, 3.5, 'b'),
    ];
    expect(spentInWeek(taps, THIS_WEEK)).toBe(8.5);
  });

  it('runs across a year boundary', () => {
    const taps = [
      tap('coffee', '2026-12-27', 5),
      tap('coffee', '2026-12-31', 5.1),
      tap('coffee', '2027-01-03', 4.95),
      tap('coffee', '2027-01-04', 5),
    ];
    expect(spentInWeek(taps, '2026-12-28')).toBe(10.05);
  });

  it('is nothing for a week with no receipts', () => {
    expect(spentInWeek([], THIS_WEEK)).toBe(0);
  });
});

describe('savedAllTime', () => {
  const lunch = habit('lunch', 5, '2026-09-28');
  const snacks = habit('snacks', 4.75, THIS_WEEK);
  const taps = [
    tap('lunch', '2026-09-30', 5),
    tap('lunch', '2026-09-30', 5), // a second receipt the same day
    tap('lunch', '2026-10-02', 7.5),
    tap('lunch', '2026-10-06', 5),
    tap('lunch', WEDNESDAY, 5), // today: does not count yet
    tap('snacks', THIS_WEEK, 4.75),
    tap('drinks', '2026-10-01', 20), // an archived habit, not passed in
  ];

  it('sums two habits with different starts', () => {
    // lunch: 28 Sep to 6 Oct is 9 days, 3 tapped: 6 x 5 = 30.
    // snacks: 5 to 6 Oct is 2 days, 1 tapped: 1 x 4.75 = 4.75.
    expect(savedAllTime([lunch, snacks], taps, WEDNESDAY)).toBe(34.75);
  });

  it('equals the weeks added up', () => {
    const first = earliestWeek([lunch, snacks]);
    expect(first).toBe('2026-09-28');

    let cents = 0;
    for (const habit of [lunch, snacks]) {
      const days = tapsForHabit(taps, habit.id);
      for (let week = first ?? THIS_WEEK; week <= THIS_WEEK; week = shiftWeek(week, 1)) {
        cents += toCents(savedInWeek(habit, days.keys(), week, WEDNESDAY));
      }
    }
    expect(cents).toBe(3475);
  });

  it('counts a habit listed twice once', () => {
    expect(savedAllTime([lunch, lunch, snacks], taps, WEDNESDAY)).toBe(34.75);
  });

  it('is nothing with no habits, or on the first day', () => {
    expect(savedAllTime([], taps, WEDNESDAY)).toBe(0);
    expect(savedAllTime([snacks], [], THIS_WEEK)).toBe(0);
  });

  it('runs across a year boundary and a DST change', () => {
    const tea = habit('tea', 2.35, '2026-10-19');
    // 19 Oct 2026 to 3 Jan 2027 is 77 days, 2 tapped: 75 x 2.35 = 176.25.
    const teaTaps = [tap('tea', '2026-10-25', 2.35), tap('tea', '2026-11-01', 2.35)];
    expect(savedAllTime([tea], teaTaps, '2027-01-04')).toBe(176.25);
  });
});

describe('skipStreak', () => {
  it('counts every day since the start when nothing was tapped', () => {
    expect(skipStreak(coffee, [], WEDNESDAY)).toBe(2);
  });

  it('is 0 when yesterday was tapped', () => {
    expect(skipStreak(coffee, ['2026-10-06'], WEDNESDAY)).toBe(0);
  });

  it('counts back to the latest tap, in any order', () => {
    const lunch = habit('lunch', 15, '2026-09-28');
    expect(skipStreak(lunch, ['2026-10-01', '2026-10-03', '2026-10-02'], WEDNESDAY)).toBe(3);
  });

  it('is 0 on the first day', () => {
    expect(skipStreak(coffee, [], THIS_WEEK)).toBe(0);
  });

  it('ignores today, the future and anything before the start', () => {
    expect(skipStreak(coffee, [WEDNESDAY, '2026-10-09', '2026-10-01'], WEDNESDAY)).toBe(2);
  });

  it('runs through a DST change and a month end', () => {
    const tea = habit('tea', 2, '2026-10-19');
    // 19 Oct to 2 Nov.
    expect(skipStreak(tea, [], '2026-11-03')).toBe(15);
    expect(skipStreak(tea, ['2026-10-25'], '2026-11-03')).toBe(8);
  });
});

describe('a habit created on Thursday: taps and Saved start on the creation day', () => {
  // Created Thursday 8 Oct 2026. Its week starts Monday 5 Oct, but Monday to Wednesday are faded:
  // nothing before the creation day can be tapped or saves.
  const THURSDAY = '2026-10-08';
  const FRIDAY = '2026-10-09';
  const MONDAY_AFTER = '2026-10-12';
  const dinner = habit('dinner', 5, THIS_WEEK, THURSDAY);
  // A tap made on Tuesday before taps were limited to the creation day on; it still exists.
  const backFilled = [tap('dinner', '2026-10-06', 5.5)];
  const days = (taps: HabitTap[]) => tapsForHabit(taps, 'dinner').keys();
  const strip = (week: string, today: string) =>
    weekDays(week).map((day) => dayState(dinner, day, false, today));

  it('opens only today on the creation day, Monday to Wednesday faded', () => {
    expect(strip(THIS_WEEK, THURSDAY)).toEqual([
      'before',
      'before',
      'before',
      'today',
      'future',
      'future',
      'future',
    ]);
    expect(dayState(dinner, '2026-10-04', false, THURSDAY)).toBe('before');
  });

  it('keeps every day from the creation day through today open', () => {
    expect(strip(THIS_WEEK, FRIDAY)).toEqual([
      'before',
      'before',
      'before',
      'open',
      'today',
      'future',
      'future',
    ]);
    expect(strip(THIS_WEEK, MONDAY_AFTER)).toEqual([
      'before',
      'before',
      'before',
      'open',
      'open',
      'open',
      'open',
    ]);
    expect(strip('2026-10-12', '2026-10-14')).toEqual([
      'open',
      'open',
      'today',
      'future',
      'future',
      'future',
      'future',
    ]);
  });

  it('still shows an older tap before the creation day, so it can be removed', () => {
    expect(dayState(dinner, '2026-10-06', true, THURSDAY)).toBe('tapped');
    expect(dayState(dinner, '2026-10-06', true, MONDAY_AFTER)).toBe('tapped');
  });

  it('is open exactly from countsFrom through today, for any creation day', () => {
    const today = '2026-10-14';
    for (const created of weekDays(THIS_WEEK)) {
      const made = habit('made', 5, THIS_WEEK, created);
      for (const day of [...weekDays(THIS_WEEK), ...weekDays('2026-10-12')]) {
        const state = dayState(made, day, false, today);
        const tappable = day >= countsFrom(made) && day <= today;
        expect({ created, day, tappable: state === 'open' || state === 'today' }).toEqual({
          created,
          day,
          tappable,
        });
      }
    }
  });

  it('saves nothing until Thursday is over', () => {
    expect(savedInWeek(dinner, [], THIS_WEEK, THURSDAY)).toBe(0);
    expect(savedAllTime([dinner], [], THURSDAY)).toBe(0);
    expect(skipStreak(dinner, [], THURSDAY)).toBe(0);
    expect(savedInWeek(dinner, [], THIS_WEEK, FRIDAY)).toBe(5);
  });

  it('an older Tuesday tap changes spent, not saved', () => {
    expect(spentInWeek([], THIS_WEEK)).toBe(0);
    expect(spentInWeek(backFilled, THIS_WEEK)).toBe(5.5);
    expect(savedInWeek(dinner, days(backFilled), THIS_WEEK, THURSDAY)).toBe(0);
    expect(savedInWeek(dinner, days(backFilled), THIS_WEEK, FRIDAY)).toBe(5);
    expect(savedAllTime([dinner], backFilled, FRIDAY)).toBe(5);
  });

  it('saves Thursday to Sunday once the week is over', () => {
    expect(savedInWeek(dinner, [], THIS_WEEK, MONDAY_AFTER)).toBe(20);
    expect(savedInWeek(dinner, days(backFilled), THIS_WEEK, MONDAY_AFTER)).toBe(20);
    expect(savedInWeek(dinner, ['2026-10-06', THURSDAY], THIS_WEEK, MONDAY_AFTER)).toBe(15);
    // With coffee, created on its Monday and never tapped: 4 x 5 + 7 x 5.
    expect(savedAllTime([dinner, coffee], backFilled, MONDAY_AFTER)).toBe(55);
  });

  it('starts the streak on Thursday; an older tap neither extends nor breaks it', () => {
    expect(skipStreak(dinner, [], FRIDAY)).toBe(1);
    expect(skipStreak(dinner, [], MONDAY_AFTER)).toBe(4);
    expect(skipStreak(dinner, ['2026-10-06'], MONDAY_AFTER)).toBe(4);
    expect(skipStreak(dinner, ['2026-10-10'], MONDAY_AFTER)).toBe(1);
  });

  it('runs across a year boundary', () => {
    // Created Wednesday 30 Dec 2026; today Monday 4 Jan 2027: 30 Dec to 3 Jan is 5 days.
    const snacks = habit('snacks', 4.75, '2026-12-28', '2026-12-30');
    const tuesday = [tap('snacks', '2026-12-29', 4.75)];
    expect(savedInWeek(snacks, ['2026-12-29'], '2026-12-28', '2027-01-04')).toBe(23.75);
    expect(savedAllTime([snacks], tuesday, '2027-01-04')).toBe(23.75);
    expect(spentInWeek(tuesday, '2026-12-28')).toBe(4.75);
    expect(skipStreak(snacks, ['2026-12-29'], '2027-01-04')).toBe(5);
  });

  it('counts from the start if the creation day is somehow earlier', () => {
    const early = habit('early', 5, THIS_WEEK, '2026-10-01');
    expect(savedInWeek(early, [], '2026-09-28', THURSDAY)).toBe(0);
    expect(savedAllTime([early], [], THURSDAY)).toBe(15);
    expect(skipStreak(early, [], THURSDAY)).toBe(3);
    expect(dayState(early, '2026-10-04', false, THURSDAY)).toBe('before');
    expect(dayState(early, THIS_WEEK, false, THURSDAY)).toBe('open');
  });

  it('opens and saves nothing while the creation day is after today (a clock moved back)', () => {
    const ahead = habit('ahead', 5, THIS_WEEK, '2026-10-10');
    expect(savedInWeek(ahead, [], THIS_WEEK, THURSDAY)).toBe(0);
    expect(savedAllTime([ahead], [], THURSDAY)).toBe(0);
    expect(skipStreak(ahead, [], THURSDAY)).toBe(0);
    expect(dayState(ahead, '2026-10-06', false, THURSDAY)).toBe('before');
    expect(dayState(ahead, THURSDAY, false, THURSDAY)).toBe('before');
  });

  it('refuses a creation day that is not a calendar day', () => {
    const broken = habit('broken', 5, THIS_WEEK, '2026-10-32');
    expect(() => savedInWeek(broken, [], THIS_WEEK, THURSDAY)).toThrow(RangeError);
    expect(() => savedAllTime([broken], [], THURSDAY)).toThrow(RangeError);
    expect(() => skipStreak(broken, [], THURSDAY)).toThrow(RangeError);
  });
});

describe('skipped-day counts and countsFrom', () => {
  // Created Thursday 8 Oct 2026, so its first week (from Monday 5 Oct) is a partial one.
  const dinner = habit('dinner', 5, THIS_WEEK, '2026-10-08');

  it('counts from the creation day, never before the start', () => {
    expect(countsFrom(dinner)).toBe('2026-10-08');
    expect(countsFrom(coffee)).toBe(THIS_WEEK);
    expect(countsFrom(habit('early', 5, THIS_WEEK, '2026-10-01'))).toBe(THIS_WEEK);
  });

  it('counts a partial first week, then whole weeks', () => {
    expect(skippedDaysInWeek(dinner, [], THIS_WEEK, '2026-10-08')).toBe(0);
    expect(skippedDaysInWeek(dinner, [], THIS_WEEK, '2026-10-09')).toBe(1);
    expect(skippedDaysInWeek(dinner, [], THIS_WEEK, '2026-10-12')).toBe(4); // Thu to Sun
    expect(skippedDaysInWeek(dinner, [], '2026-10-12', '2026-10-19')).toBe(7);
    expect(skippedDaysInWeek(dinner, [], '2026-09-28', '2026-10-19')).toBe(0);
    expect(skippedDaysInWeek(dinner, [], '2026-10-19', '2026-10-19')).toBe(0);
    expect(skippedDaysAllTime(dinner, [], '2026-10-08')).toBe(0);
    expect(skippedDaysAllTime(dinner, [], '2026-10-12')).toBe(4);
    expect(skippedDaysAllTime(dinner, [], '2026-10-19')).toBe(11);
  });

  it('ignores older taps before the creation day, today and the future', () => {
    const backFilled = ['2026-10-05', '2026-10-06', '2026-10-07'];
    expect(skippedDaysInWeek(dinner, backFilled, THIS_WEEK, '2026-10-12')).toBe(4);
    expect(skippedDaysAllTime(dinner, backFilled, '2026-10-12')).toBe(4);
    expect(skippedDaysAllTime(dinner, ['2026-10-12', '2026-10-14'], '2026-10-12')).toBe(4);
  });

  it('takes away each tapped day from the creation day on, once', () => {
    const tapped = ['2026-10-08', '2026-10-10', '2026-10-10', '2026-10-13'];
    expect(skippedDaysInWeek(dinner, tapped, THIS_WEEK, '2026-10-12')).toBe(2);
    expect(skippedDaysInWeek(dinner, new Set(tapped), '2026-10-12', '2026-10-19')).toBe(6);
    expect(skippedDaysAllTime(dinner, tapped, '2026-10-19')).toBe(8);
  });

  it('runs across a year boundary', () => {
    // Created Wednesday 30 Dec 2026, in the week of Monday 28 Dec.
    const snacks = habit('snacks', 4.75, '2026-12-28', '2026-12-30');
    expect(countsFrom(snacks)).toBe('2026-12-30');
    expect(skippedDaysInWeek(snacks, [], '2026-12-28', '2027-01-04')).toBe(5);
    expect(
      skippedDaysInWeek(snacks, ['2026-12-29', '2026-12-31'], '2026-12-28', '2027-01-04'),
    ).toBe(4);
    const tapped = ['2026-12-31', '2027-01-05'];
    // 30 Dec to 10 Jan is 12 days, 2 tapped.
    expect(skippedDaysAllTime(snacks, tapped, '2027-01-11')).toBe(10);
    expect(skippedDaysInWeek(snacks, tapped, '2027-01-04', '2027-01-11')).toBe(6);
  });

  it('is what Saved pays for: count x price in cents, and the weeks add up to all time', () => {
    const tapped = ['2026-10-06', '2026-10-09', '2026-10-15', '2026-10-25'];
    for (const price of [5, 4.75, 0.07, 19.99]) {
      const priced = { ...dinner, price };
      let weeks = 0;
      for (let week = THIS_WEEK; week <= '2026-11-02'; week = shiftWeek(week, 1)) {
        const count = skippedDaysInWeek(priced, tapped, week, '2026-11-04');
        expect(toCents(savedInWeek(priced, tapped, week, '2026-11-04'))).toBe(
          count * toCents(price),
        );
        weeks += count;
      }
      const all = skippedDaysAllTime(priced, tapped, '2026-11-04');
      expect(weeks).toBe(all);
      const taps = tapped.map((day) => tap('dinner', day, price));
      expect(toCents(savedAllTime([priced], taps, '2026-11-04'))).toBe(all * toCents(price));
    }
  });
});

describe('tapsForHabit', () => {
  it('maps one habit’s receipts by day, the first receipt standing for a day with two', () => {
    const taps = [
      tap('coffee', THIS_WEEK, 5, 'first'),
      tap('lunch', THIS_WEEK, 15, 'other habit'),
      tap('coffee', THIS_WEEK, 5, 'second'),
      tap('coffee', '2026-10-06', 6, 'tuesday'),
    ];
    const byDay = tapsForHabit(taps, 'coffee');
    expect([...byDay.keys()]).toEqual([THIS_WEEK, '2026-10-06']);
    expect(byDay.get(THIS_WEEK)?.receiptId).toBe('first');
  });
});

describe('formatWeekRange', () => {
  it('names the month once in English', () => {
    expect(plain(formatWeekRange(THIS_WEEK))).toBe('Oct 5 – 11');
    expect(plain(formatWeekRange('2026-09-28'))).toBe('Sep 28 – Oct 4');
    expect(plain(formatWeekRange('2026-10-26'))).toBe('Oct 26 – Nov 1');
    expect(plain(formatWeekRange('2025-12-29'))).toBe('Dec 29 – Jan 4');
  });

  it('puts the day first in Spanish and French', () => {
    setLanguage('es');
    expect(plain(formatWeekRange(THIS_WEEK))).toBe('5 – 11 oct');
    expect(plain(formatWeekRange('2026-09-28'))).toBe('28 sep – 4 oct');
    expect(plain(formatWeekRange('2025-12-29'))).toBe('29 dic – 4 ene');

    setLanguage('fr');
    expect(plain(formatWeekRange(THIS_WEEK))).toBe('5 – 11 oct.');
    expect(plain(formatWeekRange('2026-09-28'))).toBe('28 sept. – 4 oct.');
    expect(plain(formatWeekRange('2025-12-29'))).toBe('29 déc. – 4 janv.');
  });

  it('uses an en dash and can only break after it', () => {
    for (const language of ['en', 'es', 'fr'] as const) {
      setLanguage(language);
      for (const week of [THIS_WEEK, '2026-09-28', '2025-12-29']) {
        const text = formatWeekRange(week);
        const lines = text.split(' ');
        expect(lines).toHaveLength(2);
        expect(lines[0].endsWith(' –')).toBe(true);
      }
    }
  });

  it('takes any day of the week as the week', () => {
    expect(plain(formatWeekRange('2026-10-11'))).toBe('Oct 5 – 11');
  });
});

describe('dates that are not calendar days', () => {
  it.each(['2026-02-30', '2026-13-01', '2026-10-07T12:00:00Z', '7/10/2026', '2026-10-7', ''])(
    'refuses %p rather than landing on another day',
    (bad) => {
      expect(() => weekStartOf(bad)).toThrow(RangeError);
      expect(() => spentInWeek([tap('coffee', bad, 5)], THIS_WEEK)).toThrow(RangeError);
    },
  );
});
