import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { addDays, toIsoDate } from '@/lib/date';
import {
  countsFrom,
  dayState,
  earliestWeek,
  formatWeekRange,
  habitHistory,
  isCurrentWeek,
  savedAllTime,
  savedInWeek,
  shiftWeek,
  skippedDaysAllTime,
  skippedDaysInWeek,
  spentInWeek,
  tapsForHabit,
  trackedDaysInWeek,
  weekDays,
  weekLimit,
  weekProgress,
  weekStartOf,
  type HabitMaths,
  type HabitTap,
  type HabitWeek,
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

  it('runs across a year boundary', () => {
    // Created Wednesday 30 Dec 2026; today Monday 4 Jan 2027: 30 Dec to 3 Jan is 5 days.
    const snacks = habit('snacks', 4.75, '2026-12-28', '2026-12-30');
    const tuesday = [tap('snacks', '2026-12-29', 4.75)];
    expect(savedInWeek(snacks, ['2026-12-29'], '2026-12-28', '2027-01-04')).toBe(23.75);
    expect(savedAllTime([snacks], tuesday, '2027-01-04')).toBe(23.75);
    expect(spentInWeek(tuesday, '2026-12-28')).toBe(4.75);
  });

  it('counts from the start if the creation day is somehow earlier', () => {
    const early = habit('early', 5, THIS_WEEK, '2026-10-01');
    expect(savedInWeek(early, [], '2026-09-28', THURSDAY)).toBe(0);
    expect(savedAllTime([early], [], THURSDAY)).toBe(15);
    expect(dayState(early, '2026-10-04', false, THURSDAY)).toBe('before');
    expect(dayState(early, THIS_WEEK, false, THURSDAY)).toBe('open');
  });

  it('opens and saves nothing while the creation day is after today (a clock moved back)', () => {
    const ahead = habit('ahead', 5, THIS_WEEK, '2026-10-10');
    expect(savedInWeek(ahead, [], THIS_WEEK, THURSDAY)).toBe(0);
    expect(savedAllTime([ahead], [], THURSDAY)).toBe(0);
    expect(dayState(ahead, '2026-10-06', false, THURSDAY)).toBe('before');
    expect(dayState(ahead, THURSDAY, false, THURSDAY)).toBe('before');
  });

  it('refuses a creation day that is not a calendar day', () => {
    const broken = habit('broken', 5, THIS_WEEK, '2026-10-32');
    expect(() => savedInWeek(broken, [], THIS_WEEK, THURSDAY)).toThrow(RangeError);
    expect(() => savedAllTime([broken], [], THURSDAY)).toThrow(RangeError);
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

// The mock of record is set on Friday 16 Oct 2026. Tim Hortons ($5) started Monday 28 Sep;
// Breakfast ($4) was created Wednesday 14 Oct, in the week of Monday 12 Oct. Weeks are named by
// date here: on Friday 16 Oct, THIS_WEEK (5 Oct) is last week.
const FRIDAY_16 = '2026-10-16';
const WEEK_OCT_5 = THIS_WEEK;
const WEEK_OCT_12 = '2026-10-12';
const tim = habit('tim', 5, '2026-09-28');
const breakfast = habit('bfast', 4, WEEK_OCT_12, '2026-10-14');
const mockTaps = [
  ...[
    '2026-09-28',
    '2026-09-30',
    '2026-10-02',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
    '2026-10-08',
    '2026-10-10',
    '2026-10-12',
    '2026-10-13',
    '2026-10-15',
    '2026-10-16',
  ].map((day) => tap('tim', day, 5, `tim-${day}`)),
  tap('bfast', '2026-10-14', 4, 'bfast-2026-10-14'),
];

/** A week without its days, to compare whole histories at a glance. */
const figures = (week: HabitWeek) => ({
  weekStart: week.weekStart,
  spent: week.spent,
  saved: week.saved,
  limit: week.limit,
  progress: week.progress,
});

/** A week's listed days as [day, kind, amount, receiptId?]. */
const rows = (week: HabitWeek) =>
  week.days.map(({ day, kind, amount, receiptId }) =>
    receiptId === undefined ? [day, kind, amount] : [day, kind, amount, receiptId],
  );

describe('trackedDaysInWeek and weekLimit', () => {
  it('tracks a full week from a Monday start: price x 7', () => {
    expect(trackedDaysInWeek(coffee, WEEK_OCT_5)).toBe(7);
    expect(weekLimit(coffee, WEEK_OCT_5)).toBe(35);
    expect(weekLimit(coffee, '2026-10-12')).toBe(35);
  });

  it('tracks a first partial week from the creation day: Breakfast made on a Wednesday is $4 x 5', () => {
    expect(trackedDaysInWeek(breakfast, WEEK_OCT_12)).toBe(5);
    expect(weekLimit(breakfast, WEEK_OCT_12)).toBe(20);
    expect(weekLimit(breakfast, '2026-10-19')).toBe(28);
  });

  it('tracks nothing in a week before the start', () => {
    expect(trackedDaysInWeek(breakfast, WEEK_OCT_5)).toBe(0);
    expect(weekLimit(breakfast, WEEK_OCT_5)).toBe(0);
    expect(weekLimit(breakfast, '2026-09-28')).toBe(0);
    expect(weekLimit(coffee, '2026-09-28')).toBe(0);
  });

  it('tracks 7 days down to 1 for a habit created Monday to Sunday', () => {
    weekDays(WEEK_OCT_5).forEach((created, index) => {
      const made = habit('made', 5, WEEK_OCT_5, created);
      expect(trackedDaysInWeek(made, WEEK_OCT_5)).toBe(7 - index);
      expect(weekLimit(made, WEEK_OCT_5)).toBe(5 * (7 - index));
      expect(trackedDaysInWeek(made, '2026-10-12')).toBe(7);
    });
  });

  it('takes any day of the week as the week', () => {
    expect(trackedDaysInWeek(breakfast, FRIDAY_16)).toBe(5);
    expect(weekLimit(breakfast, '2026-10-18')).toBe(20);
  });

  it('counts from the start if the creation day is somehow earlier', () => {
    expect(weekLimit(habit('early', 5, WEEK_OCT_5, '2026-10-01'), WEEK_OCT_5)).toBe(35);
  });

  it('is cent-exact: 7 x $4.35 is $30.45', () => {
    expect(4.35 * 7).not.toBe(30.45);
    let added = 0;
    for (let day = 0; day < 7; day += 1) added += 4.35;
    expect(added).not.toBe(30.45);

    expect(weekLimit(habit('tea', 4.35, WEEK_OCT_5), WEEK_OCT_5)).toBe(30.45);
    expect(weekLimit(habit('tea', 4.35, WEEK_OCT_5, '2026-10-09'), WEEK_OCT_5)).toBe(13.05);
    expect(weekLimit(habit('gum', 0.07, WEEK_OCT_5, '2026-10-09'), WEEK_OCT_5)).toBe(0.21);
    expect(weekLimit(habit('books', 19.99, WEEK_OCT_5), WEEK_OCT_5)).toBe(139.93);
  });

  it.each([
    ['US clocks go forward (Sun 8 Mar 2026)', '2026-03-02'],
    ['Europe clocks go forward (Sun 29 Mar 2026)', '2026-03-23'],
    ['Europe clocks go back (Sun 25 Oct 2026)', '2026-10-19'],
    ['US clocks go back (Sun 1 Nov 2026)', '2026-10-26'],
  ])('tracks 7 days in a DST week: %s', (_, monday) => {
    const dst = habit('dst', 3, monday);
    expect(trackedDaysInWeek(dst, monday)).toBe(7);
    expect(weekLimit(dst, monday)).toBe(21);
  });
});

describe('weekProgress', () => {
  it('reads Day 5 of 7 on a Friday, Day 1 on the Monday and Day 7 on the Sunday', () => {
    expect(weekProgress(coffee, WEEK_OCT_5, '2026-10-09')).toEqual({
      kind: 'current',
      day: 5,
      of: 7,
    });
    expect(weekProgress(coffee, WEEK_OCT_5, WEEK_OCT_5)).toEqual({
      kind: 'current',
      day: 1,
      of: 7,
    });
    expect(weekProgress(coffee, WEEK_OCT_5, '2026-10-11')).toEqual({
      kind: 'current',
      day: 7,
      of: 7,
    });
  });

  it('counts a first partial week from the creation day: Day 3 of 5 on Friday', () => {
    expect(weekProgress(breakfast, WEEK_OCT_12, FRIDAY_16)).toEqual({
      kind: 'current',
      day: 3,
      of: 5,
    });
    expect(weekProgress(breakfast, WEEK_OCT_12, '2026-10-14')).toEqual({
      kind: 'current',
      day: 1,
      of: 5,
    });
    expect(weekProgress(breakfast, WEEK_OCT_12, '2026-10-18')).toEqual({
      kind: 'current',
      day: 5,
      of: 5,
    });
  });

  it('is complete once the week is over', () => {
    expect(weekProgress(coffee, WEEK_OCT_5, '2026-10-12')).toEqual({ kind: 'complete' });
    expect(weekProgress(breakfast, WEEK_OCT_12, '2026-10-19')).toEqual({ kind: 'complete' });
    expect(weekProgress(tim, '2026-09-28', FRIDAY_16)).toEqual({ kind: 'complete' });
  });

  it('has not started in a week that ends before countsFrom, and says when it starts', () => {
    const starts = { kind: 'notStarted', startsOn: '2026-10-14' };
    expect(weekProgress(breakfast, WEEK_OCT_5, FRIDAY_16)).toEqual(starts);
    expect(weekProgress(breakfast, '2026-09-28', FRIDAY_16)).toEqual(starts);
    expect(weekProgress(coffee, '2026-09-28', WEDNESDAY)).toEqual({
      kind: 'notStarted',
      startsOn: WEEK_OCT_5,
    });
  });

  it('is upcoming in a week after today’s', () => {
    expect(weekProgress(coffee, '2026-10-12', WEDNESDAY)).toEqual({ kind: 'upcoming' });
    expect(weekProgress(breakfast, '2026-10-26', FRIDAY_16)).toEqual({ kind: 'upcoming' });
  });

  it('puts not started first, even for a week after today’s (a clock moved back)', () => {
    // Created Wednesday 21 Oct while today reads Wednesday 7 Oct.
    const ahead = habit('ahead', 5, '2026-10-19', '2026-10-21');
    const starts = { kind: 'notStarted', startsOn: '2026-10-21' };
    expect(weekProgress(ahead, WEEK_OCT_5, WEDNESDAY)).toEqual(starts);
    expect(weekProgress(ahead, '2026-10-12', WEDNESDAY)).toEqual(starts);
    expect(weekProgress(ahead, '2026-10-19', WEDNESDAY)).toEqual({ kind: 'upcoming' });
  });

  it('has not started in today’s week while countsFrom is later in it', () => {
    const later = habit('later', 5, WEEK_OCT_5, '2026-10-09');
    expect(weekProgress(later, WEEK_OCT_5, WEDNESDAY)).toEqual({
      kind: 'notStarted',
      startsOn: '2026-10-09',
    });
    expect(weekProgress(later, WEEK_OCT_5, '2026-10-09')).toEqual({
      kind: 'current',
      day: 1,
      of: 3,
    });
  });

  it('reads a DST week as 7 days', () => {
    expect(weekProgress(habit('us', 3, '2026-10-26'), '2026-10-26', '2026-11-01')).toEqual({
      kind: 'current',
      day: 7,
      of: 7,
    });
    expect(weekProgress(habit('us', 3, '2026-03-02'), '2026-03-02', '2026-03-08')).toEqual({
      kind: 'current',
      day: 7,
      of: 7,
    });
    const wednesday = habit('us', 3, '2026-03-02', '2026-03-04');
    expect(weekProgress(wednesday, '2026-03-02', '2026-03-08')).toEqual({
      kind: 'current',
      day: 5,
      of: 5,
    });
  });

  it('takes any day of the week as the week', () => {
    expect(weekProgress(coffee, '2026-10-10', WEDNESDAY)).toEqual({
      kind: 'current',
      day: 3,
      of: 7,
    });
  });
});

describe('habitHistory', () => {
  it('reproduces the mock of record: Tim Hortons on Friday 16 Oct', () => {
    const weeks = habitHistory(tim, mockTaps, FRIDAY_16);
    expect(weeks.map(figures)).toEqual([
      {
        weekStart: WEEK_OCT_12,
        spent: 20,
        saved: 5,
        limit: 35,
        progress: { kind: 'current', day: 5, of: 7 },
      },
      { weekStart: WEEK_OCT_5, spent: 25, saved: 10, limit: 35, progress: { kind: 'complete' } },
      { weekStart: '2026-09-28', spent: 15, saved: 20, limit: 35, progress: { kind: 'complete' } },
    ]);
    expect(rows(weeks[0])).toEqual([
      ['2026-10-16', 'bought', 5, 'tim-2026-10-16'],
      ['2026-10-15', 'bought', 5, 'tim-2026-10-15'],
      ['2026-10-14', 'skipped', 5],
      ['2026-10-13', 'bought', 5, 'tim-2026-10-13'],
      ['2026-10-12', 'bought', 5, 'tim-2026-10-12'],
    ]);

    // The hero: $60.00 spent, $35.00 saved, 12 days bought, 7 days skipped.
    const all = weeks.flatMap((week) => week.days);
    expect(weeks.reduce((cents, week) => cents + toCents(week.spent), 0)).toBe(6000);
    expect(weeks.reduce((cents, week) => cents + toCents(week.saved), 0)).toBe(3500);
    expect(savedAllTime([tim], mockTaps, FRIDAY_16)).toBe(35);
    expect(all.filter((day) => day.kind === 'bought')).toHaveLength(12);
    expect(all.filter((day) => day.kind === 'skipped')).toHaveLength(7);
  });

  it('reproduces Breakfast: a first partial week, today not bought yet', () => {
    const weeks = habitHistory(breakfast, mockTaps, FRIDAY_16);
    expect(weeks.map(figures)).toEqual([
      {
        weekStart: WEEK_OCT_12,
        spent: 4,
        saved: 4,
        limit: 20,
        progress: { kind: 'current', day: 3, of: 5 },
      },
    ]);
    // Monday and Tuesday are before the creation day; Saturday and Sunday have not happened.
    expect(rows(weeks[0])).toEqual([
      [FRIDAY_16, 'today', 0],
      ['2026-10-15', 'skipped', 4],
      ['2026-10-14', 'bought', 4, 'bfast-2026-10-14'],
    ]);
  });

  it('lists a full past week Sunday to Monday', () => {
    const taps = [tap('coffee', '2026-10-06', 5, 'tue'), tap('coffee', '2026-10-08', 5, 'thu')];
    const weeks = habitHistory(coffee, taps, '2026-10-12');
    expect(weeks.map(figures)).toEqual([
      {
        weekStart: '2026-10-12',
        spent: 0,
        saved: 0,
        limit: 35,
        progress: { kind: 'current', day: 1, of: 7 },
      },
      { weekStart: WEEK_OCT_5, spent: 10, saved: 25, limit: 35, progress: { kind: 'complete' } },
    ]);
    expect(rows(weeks[0])).toEqual([['2026-10-12', 'today', 0]]);
    expect(rows(weeks[1])).toEqual([
      ['2026-10-11', 'skipped', 5],
      ['2026-10-10', 'skipped', 5],
      ['2026-10-09', 'skipped', 5],
      ['2026-10-08', 'bought', 5, 'thu'],
      ['2026-10-07', 'skipped', 5],
      ['2026-10-06', 'bought', 5, 'tue'],
      ['2026-10-05', 'skipped', 5],
    ]);
  });

  it('lists today as bought once it has a receipt, else as not bought yet', () => {
    const untapped = habitHistory(coffee, [], WEDNESDAY);
    expect(untapped.map(figures)).toEqual([
      {
        weekStart: WEEK_OCT_5,
        spent: 0,
        saved: 10,
        limit: 35,
        progress: { kind: 'current', day: 3, of: 7 },
      },
    ]);
    expect(rows(untapped[0])).toEqual([
      [WEDNESDAY, 'today', 0],
      ['2026-10-06', 'skipped', 5],
      ['2026-10-05', 'skipped', 5],
    ]);

    // Today saves nothing either way until it is over.
    const tapped = habitHistory(coffee, [tap('coffee', WEDNESDAY, 5.25, 'wed')], WEDNESDAY);
    expect(figures(tapped[0])).toEqual({ ...figures(untapped[0]), spent: 5.25 });
    expect(rows(tapped[0])[0]).toEqual([WEDNESDAY, 'bought', 5.25, 'wed']);
  });

  it('lists receipts re-dated before countsFrom as bought, in date order', () => {
    const taps = [
      ...mockTaps,
      tap('bfast', '2026-10-13', 4.5, 'tue'),
      tap('bfast', '2026-10-03', 3.75, 'sat'),
    ];
    const weeks = habitHistory(breakfast, taps, FRIDAY_16);
    const starts = { kind: 'notStarted', startsOn: '2026-10-14' };
    expect(weeks.map(figures)).toEqual([
      {
        weekStart: WEEK_OCT_12,
        spent: 8.5,
        saved: 4,
        limit: 20,
        progress: { kind: 'current', day: 3, of: 5 },
      },
      { weekStart: '2026-09-28', spent: 3.75, saved: 0, limit: 0, progress: starts },
    ]);
    expect(rows(weeks[0])).toEqual([
      [FRIDAY_16, 'today', 0],
      ['2026-10-15', 'skipped', 4],
      ['2026-10-14', 'bought', 4, 'bfast-2026-10-14'],
      ['2026-10-13', 'bought', 4.5, 'tue'],
    ]);
    // The empty week of 5 Oct between them is before the start: not listed.
    expect(rows(weeks[1])).toEqual([['2026-10-03', 'bought', 3.75, 'sat']]);
  });

  it('lists a future-dated receipt as bought, in an upcoming week of its own', () => {
    const taps = [
      tap('coffee', WEEK_OCT_5, 5, 'mon'),
      tap('coffee', '2026-10-10', 6, 'sat'),
      tap('coffee', '2026-10-20', 5, 'next'),
    ];
    const weeks = habitHistory(coffee, taps, WEDNESDAY);
    expect(weeks.map(figures)).toEqual([
      { weekStart: '2026-10-19', spent: 5, saved: 0, limit: 35, progress: { kind: 'upcoming' } },
      {
        weekStart: WEEK_OCT_5,
        spent: 11,
        saved: 5,
        limit: 35,
        progress: { kind: 'current', day: 3, of: 7 },
      },
    ]);
    // The empty week of 12 Oct between them has not happened: not listed.
    expect(rows(weeks[0])).toEqual([['2026-10-20', 'bought', 5, 'next']]);
    // Thursday, Friday and Sunday have not happened and have no receipt: not listed.
    expect(rows(weeks[1])).toEqual([
      ['2026-10-10', 'bought', 6, 'sat'],
      [WEDNESDAY, 'today', 0],
      ['2026-10-06', 'skipped', 5],
      [WEEK_OCT_5, 'bought', 5, 'mon'],
    ]);
  });

  it('adds exactly one week for a receipt dated a year ahead, and one for a year back', () => {
    // Thursday 14 Oct 2027 is in the week of Monday 11 Oct 2027; Wednesday 5 Mar 2025 in the week
    // of Monday 3 Mar 2025.
    const taps = [
      ...mockTaps,
      tap('tim', '2027-10-14', 5, 'next year'),
      tap('tim', '2025-03-05', 4.5, 'last year'),
    ];
    const weeks = habitHistory(tim, taps, FRIDAY_16);
    expect(weeks.map((week) => week.weekStart)).toEqual([
      '2027-10-11',
      WEEK_OCT_12,
      WEEK_OCT_5,
      '2026-09-28',
      '2025-03-03',
    ]);
    expect(weeks.slice(1, 4).map(figures)).toEqual(
      habitHistory(tim, mockTaps, FRIDAY_16).map(figures),
    );
    expect(figures(weeks[0])).toEqual({
      weekStart: '2027-10-11',
      spent: 5,
      saved: 0,
      limit: 35,
      progress: { kind: 'upcoming' },
    });
    expect(rows(weeks[0])).toEqual([['2027-10-14', 'bought', 5, 'next year']]);
    expect(figures(weeks[4])).toEqual({
      weekStart: '2025-03-03',
      spent: 4.5,
      saved: 0,
      limit: 0,
      progress: { kind: 'notStarted', startsOn: '2026-09-28' },
    });
    expect(rows(weeks[4])).toEqual([['2025-03-05', 'bought', 4.5, 'last year']]);

    expect(habitHistory(tim, taps, FRIDAY_16, WEDNESDAY).map((week) => week.weekStart)).toEqual([
      '2027-10-11',
      WEEK_OCT_12,
      WEEK_OCT_5,
    ]);
  });

  it('keeps every week from the start to today, one with no receipt included', () => {
    const taps = [tap('tim', '2026-09-28', 5, 'first'), tap('tim', WEEK_OCT_12, 5, 'latest')];
    const weeks = habitHistory(tim, taps, FRIDAY_16);
    expect(weeks.map((week) => week.weekStart)).toEqual([WEEK_OCT_12, WEEK_OCT_5, '2026-09-28']);
    expect(figures(weeks[1])).toEqual({
      weekStart: WEEK_OCT_5,
      spent: 0,
      saved: 35,
      limit: 35,
      progress: { kind: 'complete' },
    });
    expect(rows(weeks[1])).toEqual(
      localWalk(WEEK_OCT_5, 7)
        .reverse()
        .map((day) => [day, 'skipped', 5]),
    );
    expect(habitHistory(tim, [], FRIDAY_16).map((week) => week.weekStart)).toEqual([
      WEEK_OCT_12,
      WEEK_OCT_5,
      '2026-09-28',
    ]);
  });

  it('uses an edited receipt amount for spent and its row, never for the limit or saved', () => {
    const taps = [tap('coffee', WEEK_OCT_5, 6.4, 'edited'), tap('coffee', WEDNESDAY, 5, 'wed')];
    const [, week] = habitHistory(coffee, taps, '2026-10-12');
    expect(figures(week)).toEqual({
      weekStart: WEEK_OCT_5,
      spent: 11.4,
      saved: 25,
      limit: 35,
      progress: { kind: 'complete' },
    });
    expect(rows(week).at(-1)).toEqual([WEEK_OCT_5, 'bought', 6.4, 'edited']);
    expect(toCents(week.spent) + toCents(week.saved)).toBe(3640);
  });

  it('counts both receipts on one day in spent but lists the first; other habits are left out', () => {
    const taps = [
      tap('coffee', '2026-10-06', 5, 'first'),
      tap('coffee', '2026-10-06', 3.5, 'second'),
      tap('coffee', '2026-10-06', 3.5, 'second'),
      tap('lunch', WEDNESDAY, 15, 'lunch'),
      tap('lunch', '2026-11-30', 15, 'lunch later'),
    ];
    const weeks = habitHistory(coffee, taps, '2026-10-12');
    expect(weeks.map((week) => week.weekStart)).toEqual(['2026-10-12', WEEK_OCT_5]);
    expect(figures(weeks[1])).toEqual({
      weekStart: WEEK_OCT_5,
      spent: 8.5,
      saved: 30,
      limit: 35,
      progress: { kind: 'complete' },
    });
    expect(rows(weeks[1]).slice(4)).toEqual([
      [WEDNESDAY, 'skipped', 5],
      ['2026-10-06', 'bought', 5, 'first'],
      [WEEK_OCT_5, 'skipped', 5],
    ]);
  });

  it.each([
    ['US clocks go forward (Sun 8 Mar 2026)', '2026-03-02'],
    ['Europe clocks go forward (Sun 29 Mar 2026)', '2026-03-23'],
    ['Europe clocks go back (Sun 25 Oct 2026)', '2026-10-19'],
    ['US clocks go back (Sun 1 Nov 2026)', '2026-10-26'],
  ])('lists 7 days in a DST week: %s', (_, monday) => {
    const nextMonday = shiftWeek(monday, 1);
    const sunday = weekDays(monday)[6];
    const dst = habit('dst', 3, monday);
    const [, week] = habitHistory(dst, [tap('dst', sunday, 3, 'sun')], nextMonday);
    expect(week.weekStart).toBe(monday);
    expect(week.days.map((day) => day.day)).toEqual(localWalk(monday, 7).reverse());
    expect(figures(week)).toEqual({
      weekStart: monday,
      spent: 3,
      saved: 18,
      limit: 21,
      progress: { kind: 'complete' },
    });
  });

  it('leaves out days and weeks before the floor, never the figures', () => {
    const everything = habitHistory(tim, mockTaps, FRIDAY_16);

    // Floor on Wednesday 7 Oct: the week of 28 Sep ends before it; its own week loses Mon and Tue.
    const midWeek = habitHistory(tim, mockTaps, FRIDAY_16, WEDNESDAY);
    expect(midWeek.map(figures)).toEqual(everything.slice(0, 2).map(figures));
    expect(rows(midWeek[0])).toEqual(rows(everything[0]));
    expect(rows(midWeek[1])).toEqual([
      ['2026-10-11', 'skipped', 5],
      ['2026-10-10', 'bought', 5, 'tim-2026-10-10'],
      ['2026-10-09', 'skipped', 5],
      ['2026-10-08', 'bought', 5, 'tim-2026-10-08'],
      [WEDNESDAY, 'bought', 5, 'tim-2026-10-07'],
    ]);

    // Floor on a Sunday keeps that week with its Sunday only, figures whole.
    const sunday = habitHistory(tim, mockTaps, FRIDAY_16, '2026-10-04');
    expect(sunday.map(figures)).toEqual(everything.map(figures));
    expect(rows(sunday[2])).toEqual([['2026-10-04', 'skipped', 5]]);

    // Floor on a Monday drops the week before it whole.
    expect(habitHistory(tim, mockTaps, FRIDAY_16, WEEK_OCT_5).map(figures)).toEqual(
      everything.slice(0, 2).map(figures),
    );
  });

  it('keeps a week that ends on or after the floor even when the floor hides all its days', () => {
    // Created Monday 12 Oct; a receipt re-dated to Tuesday 6 Oct.
    const dinner = habit('dinner', 5, WEEK_OCT_12);
    const taps = [tap('dinner', '2026-10-06', 5.5, 'old')];
    const starts = { kind: 'notStarted', startsOn: WEEK_OCT_12 };

    const everything = habitHistory(dinner, taps, FRIDAY_16);
    expect(everything.map(figures)).toEqual([
      {
        weekStart: WEEK_OCT_12,
        spent: 0,
        saved: 20,
        limit: 35,
        progress: { kind: 'current', day: 5, of: 7 },
      },
      { weekStart: WEEK_OCT_5, spent: 5.5, saved: 0, limit: 0, progress: starts },
    ]);
    expect(rows(everything[1])).toEqual([['2026-10-06', 'bought', 5.5, 'old']]);

    const cut = habitHistory(dinner, taps, FRIDAY_16, '2026-10-08');
    expect(cut.map(figures)).toEqual(everything.map(figures));
    expect(rows(cut[1])).toEqual([]);

    expect(
      habitHistory(dinner, taps, FRIDAY_16, WEEK_OCT_12).map((week) => week.weekStart),
    ).toEqual([WEEK_OCT_12]);
  });

  it('sums $4.35 days in whole cents', () => {
    expect(4.35 * 3).not.toBe(13.05);
    const tea = habit('tea', 4.35, WEEK_OCT_5);
    const taps = [WEEK_OCT_5, WEDNESDAY, '2026-10-09'].map((day) => tap('tea', day, 4.35));
    const weeks = habitHistory(tea, taps, '2026-10-19');
    expect(weeks.map(figures)).toEqual([
      {
        weekStart: '2026-10-19',
        spent: 0,
        saved: 0,
        limit: 30.45,
        progress: { kind: 'current', day: 1, of: 7 },
      },
      {
        weekStart: WEEK_OCT_12,
        spent: 0,
        saved: 30.45,
        limit: 30.45,
        progress: { kind: 'complete' },
      },
      {
        weekStart: WEEK_OCT_5,
        spent: 13.05,
        saved: 17.4,
        limit: 30.45,
        progress: { kind: 'complete' },
      },
    ]);
    for (const week of weeks.slice(1)) {
      const listed = week.days.reduce((cents, day) => cents + toCents(day.amount), 0);
      expect(listed).toBe(3045);
    }
  });

  it('holds Spent + Saved = the limit for every finished week, and matches the week maths', () => {
    // Created Thursday 8 Oct; today Wednesday 16 Dec, ten weeks on, through both October DST
    // changes. Receipts on a fixed pattern of days, each at the price.
    const today = '2026-12-16';
    for (const price of [5, 4.35, 0.07, 19.99, 1.15]) {
      const made = habit('made', price, WEEK_OCT_5, '2026-10-08');
      const taps = localWalk('2026-10-08', 69)
        .filter((_, index) => index % 3 === 0 || index % 7 === 4)
        .map((day) => tap('made', day, price));
      const weeks = habitHistory(made, taps, today);

      expect(weeks.map((week) => week.weekStart)).toEqual(
        Array.from({ length: 11 }, (_, back) => shiftWeek(weekStartOf(today), -back)),
      );

      let savedCents = 0;
      for (const week of weeks) {
        const days = tapsForHabit(taps, 'made').keys();
        expect(figures(week)).toEqual({
          weekStart: week.weekStart,
          spent: spentInWeek(taps, week.weekStart, ['made']),
          saved: savedInWeek(made, days, week.weekStart, today),
          limit: weekLimit(made, week.weekStart),
          progress: weekProgress(made, week.weekStart, today),
        });
        savedCents += toCents(week.saved);

        const listed = week.days.map((day) => day.day);
        expect(listed).toEqual([...listed].sort().reverse());
        expect(new Set(listed).size).toBe(listed.length);
        for (const day of week.days) {
          expect(weekStartOf(day.day)).toBe(week.weekStart);
          expect(day.day >= countsFrom(made) && day.day <= today).toBe(true);
          expect(day.kind === 'today').toBe(day.day === today);
        }

        if (week.progress.kind === 'complete') {
          expect(toCents(week.spent) + toCents(week.saved)).toBe(toCents(week.limit));
          const listedCents = week.days.reduce((cents, day) => cents + toCents(day.amount), 0);
          expect(listedCents).toBe(toCents(week.limit));
          expect(week.days).toHaveLength(trackedDaysInWeek(made, week.weekStart));
        }
      }
      expect(savedCents).toBe(toCents(savedAllTime([made], taps, today)));
    }
  });

  it('lists one week on the creation day: Day 1 of the days left in it', () => {
    // Made on Monday the preview reads $0.00, out of $35.00, $0.00 saved, Day 1 of 7.
    expect(habitHistory(coffee, [], WEEK_OCT_5).map(figures)).toEqual([
      {
        weekStart: WEEK_OCT_5,
        spent: 0,
        saved: 0,
        limit: 35,
        progress: { kind: 'current', day: 1, of: 7 },
      },
    ]);
    // Made on Wednesday it reads out of $25.00, Day 1 of 5.
    const made = habit('made', 5, WEEK_OCT_5, WEDNESDAY);
    const weeks = habitHistory(made, [], WEDNESDAY);
    expect(weeks.map(figures)).toEqual([
      {
        weekStart: WEEK_OCT_5,
        spent: 0,
        saved: 0,
        limit: 25,
        progress: { kind: 'current', day: 1, of: 5 },
      },
    ]);
    expect(rows(weeks[0])).toEqual([[WEDNESDAY, 'today', 0]]);
  });

  it('still lists today’s week while countsFrom is later (a clock moved back)', () => {
    const ahead = habitHistory(habit('ahead', 5, WEEK_OCT_5, '2026-10-09'), [], WEDNESDAY);
    expect(ahead.map(figures)).toEqual([
      {
        weekStart: WEEK_OCT_5,
        spent: 0,
        saved: 0,
        limit: 15,
        progress: { kind: 'notStarted', startsOn: '2026-10-09' },
      },
    ]);
    expect(rows(ahead[0])).toEqual([]);

    const nextWeek = habitHistory(habit('next', 5, '2026-10-12'), [], WEDNESDAY);
    expect(nextWeek.map(figures)).toEqual([
      {
        weekStart: WEEK_OCT_5,
        spent: 0,
        saved: 0,
        limit: 0,
        progress: { kind: 'notStarted', startsOn: '2026-10-12' },
      },
    ]);
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

  it('uses an en dash and can only break after it, a year included', () => {
    for (const language of ['en', 'es', 'fr'] as const) {
      setLanguage(language);
      for (const week of [THIS_WEEK, '2026-09-28', '2025-12-29']) {
        for (const today of [undefined, '2027-06-01']) {
          const text = formatWeekRange(week, today);
          const lines = text.split(' ');
          expect(lines).toHaveLength(2);
          expect(lines[0].endsWith(' –')).toBe(true);
          expect(lines[1].endsWith('2026')).toBe(today !== undefined);
        }
      }
    }
  });

  it('takes any day of the week as the week', () => {
    expect(plain(formatWeekRange('2026-10-11'))).toBe('Oct 5 – 11');
    expect(plain(formatWeekRange('2025-10-19', FRIDAY_16))).toBe('Oct 13 – 19, 2025');
  });

  it('adds the year to a week that ended in an earlier year than today', () => {
    expect(plain(formatWeekRange('2025-10-13', FRIDAY_16))).toBe('Oct 13 – 19, 2025');
    expect(plain(formatWeekRange('2025-12-22', FRIDAY_16))).toBe('Dec 22 – 28, 2025');
    expect(plain(formatWeekRange('2025-09-29', FRIDAY_16))).toBe('Sep 29 – Oct 5, 2025');
    // A week across the new year takes its Sunday's year.
    expect(plain(formatWeekRange('2025-12-29', '2027-01-04'))).toBe('Dec 29 – Jan 4, 2026');
  });

  it('adds the year after the month in Spanish and French', () => {
    setLanguage('es');
    expect(plain(formatWeekRange('2025-10-13', FRIDAY_16))).toBe('13 – 19 oct 2025');
    expect(plain(formatWeekRange('2025-09-29', FRIDAY_16))).toBe('29 sep – 5 oct 2025');
    expect(plain(formatWeekRange('2025-12-29', '2027-01-04'))).toBe('29 dic – 4 ene 2026');

    setLanguage('fr');
    expect(plain(formatWeekRange('2025-10-13', FRIDAY_16))).toBe('13 – 19 oct. 2025');
    expect(plain(formatWeekRange('2025-12-22', FRIDAY_16))).toBe('22 – 28 déc. 2025');
    expect(plain(formatWeekRange('2025-09-29', FRIDAY_16))).toBe('29 sept. – 5 oct. 2025');
  });

  it('adds the year to a week in a later year than today', () => {
    expect(plain(formatWeekRange('2027-10-11', FRIDAY_16))).toBe('Oct 11 – 17, 2027');
    // Next week, seen on the Sunday before it, ends in the new year.
    expect(plain(formatWeekRange('2026-12-28', '2026-12-27'))).toBe('Dec 28 – Jan 3, 2027');
    expect(plain(formatWeekRange('2027-01-04', '2026-12-30'))).toBe('Jan 4 – 10, 2027');

    setLanguage('es');
    expect(plain(formatWeekRange('2027-10-11', FRIDAY_16))).toBe('11 – 17 oct 2027');
    setLanguage('fr');
    expect(plain(formatWeekRange('2027-10-11', FRIDAY_16))).toBe('11 – 17 oct. 2027');
  });

  it('leaves the year off a week in today’s year, and off the week holding today', () => {
    expect(plain(formatWeekRange(THIS_WEEK, FRIDAY_16))).toBe('Oct 5 – 11');
    expect(plain(formatWeekRange('2026-01-05', '2026-12-31'))).toBe('Jan 5 – 11');
    expect(plain(formatWeekRange('2025-12-29', FRIDAY_16))).toBe('Dec 29 – Jan 4');

    // Monday 28 Dec 2026 to Sunday 3 Jan 2027, seen on each of its days.
    for (const today of weekDays('2026-12-28')) {
      expect(plain(formatWeekRange('2026-12-28', today))).toBe('Dec 28 – Jan 3');
    }
    expect(plain(formatWeekRange('2025-12-29', '2026-01-01'))).toBe('Dec 29 – Jan 4');
    // The week before it, seen from the new year, is in another year.
    expect(plain(formatWeekRange('2026-12-21', '2027-01-02'))).toBe('Dec 21 – 27, 2026');
  });

  it('is exactly as before without today', () => {
    for (const language of ['en', 'es', 'fr'] as const) {
      setLanguage(language);
      for (const week of ['2024-12-30', '2025-10-13', '2025-12-29', THIS_WEEK]) {
        expect(formatWeekRange(week, undefined)).toBe(formatWeekRange(week));
        expect(formatWeekRange(week)).not.toMatch(/\d{4}/);
      }
    }
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

  it('refuses them in the weekly figures and the history too', () => {
    expect(() => trackedDaysInWeek(coffee, '2026-02-30')).toThrow(RangeError);
    expect(() => weekLimit(habit('broken', 5, '2026-10-32'), THIS_WEEK)).toThrow(RangeError);
    expect(() => weekProgress(coffee, THIS_WEEK, '2026-10-07T12:00:00Z')).toThrow(RangeError);
    expect(() => habitHistory(coffee, [tap('coffee', '2026-10-7', 5)], WEDNESDAY)).toThrow(
      RangeError,
    );
    expect(() => habitHistory(coffee, [], WEDNESDAY, '7/10/2026')).toThrow(RangeError);
    expect(() => formatWeekRange(THIS_WEEK, '2026-10-32')).toThrow(RangeError);
  });
});
