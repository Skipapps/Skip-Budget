import type { PayFrequency } from '@/lib/date';
import { leadCanFire, nextPaydayOn, paydayReminderOn } from '@/lib/payday';

/**
 * The account reminder's dates are the scheduler's: `nextPaydayOn` is `public.next_payday`
 * (20261008100002_one_off_pay.sql), and a reminder goes out on the day D where
 * next_payday(last, frequency, D) - lead = D (reminders_due).
 */

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const day = (value: string) => new Date(`${value}T00:00:00`);
const plus = (value: string, days: number) => {
  const date = day(value);
  return iso(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
};
const between = (from: string, to: string) =>
  Math.round((day(to).getTime() - day(from).getTime()) / 86_400_000);

/**
 * next_payday written the way the SQL is, step by step with date_trunc and intervals, kept apart
 * from the code under test so one cannot copy a slip from the other.
 */
function sqlNextPayday(last: string, frequency: PayFrequency, from: string): string | null {
  if (frequency === 'once') return last >= from ? last : null;
  const lastDay = day(last).getDate();
  let d = day(last);
  const firstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const addMonths = (date: Date, months: number) =>
    new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  const addDays = (date: Date, days: number) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  for (let guard = 0; iso(d) < from && guard < 800; guard += 1) {
    switch (frequency) {
      case 'weekly':
        d = addDays(d, 7);
        break;
      case 'biweekly':
        d = addDays(d, 14);
        break;
      case 'monthly': {
        // date_trunc('month', d) + '1 month' + (least(day(p_last), last day of next month) - 1) days
        const nextMonth = addMonths(firstOfMonth(d), 1);
        const lastOfNext = addDays(addMonths(firstOfMonth(d), 2), -1).getDate();
        d = addDays(nextMonth, Math.min(lastDay, lastOfNext) - 1);
        break;
      }
      case 'semimonthly': {
        const monthEnd = addDays(addMonths(firstOfMonth(d), 1), -1);
        if (d.getDate() < 15) d = addDays(firstOfMonth(d), 14);
        else if (d < monthEnd) d = monthEnd;
        else d = addDays(addMonths(firstOfMonth(d), 1), 14);
        break;
      }
    }
  }
  return iso(d);
}

/**
 * The scheduler's own answer: the first day from `today` on which the reminder is sent. Pay sends
 * within its next two paydays (62 days at most) or never, counted from its last payday when that
 * is still to come.
 */
function schedulerSends(
  last: string,
  frequency: PayFrequency,
  lead: number,
  today: string,
): string | null {
  const horizon = Math.max(0, between(today, last)) + 70;
  for (let offset = 0; offset < horizon; offset += 1) {
    const candidate = plus(today, offset);
    const due = sqlNextPayday(last, frequency, candidate);
    if (due !== null && between(candidate, due) === lead) return candidate;
  }
  return null;
}

const FREQUENCIES: PayFrequency[] = ['weekly', 'biweekly', 'semimonthly', 'monthly', 'once'];
const LEADS = [0, 1, 3, 7];
// Month ends, a leap day, a payday off the semimonthly grid, and one long stale.
const LAST_PAYDAYS = [
  '2026-01-31',
  '2026-01-30',
  '2028-02-29',
  '2026-10-10',
  '2026-10-15',
  '2024-03-31',
];

describe('nextPaydayOn', () => {
  it('counts a payday that is the day asked from', () => {
    expect(nextPaydayOn('2026-10-02', 'weekly', '2026-10-09')).toBe('2026-10-09');
    expect(nextPaydayOn('2026-10-09', 'monthly', '2026-10-09')).toBe('2026-10-09');
  });

  it('keeps monthly pay on its own day after a short month', () => {
    expect(nextPaydayOn('2026-01-31', 'monthly', '2026-02-01')).toBe('2026-02-28');
    expect(nextPaydayOn('2026-01-31', 'monthly', '2026-03-01')).toBe('2026-03-31');
    expect(nextPaydayOn('2026-01-31', 'monthly', '2026-04-01')).toBe('2026-04-30');
    expect(nextPaydayOn('2028-01-30', 'monthly', '2028-02-01')).toBe('2028-02-29');
  });

  it('pays semimonthly on the 15th and the last day, from any day', () => {
    expect(nextPaydayOn('2026-10-10', 'semimonthly', '2026-10-11')).toBe('2026-10-15');
    expect(nextPaydayOn('2026-10-15', 'semimonthly', '2026-10-16')).toBe('2026-10-31');
    expect(nextPaydayOn('2026-10-31', 'semimonthly', '2026-11-01')).toBe('2026-11-15');
    expect(nextPaydayOn('2026-02-15', 'semimonthly', '2026-02-16')).toBe('2026-02-28');
  });

  it('has a one-off pay only on its own day', () => {
    expect(nextPaydayOn('2026-10-20', 'once', '2026-10-09')).toBe('2026-10-20');
    expect(nextPaydayOn('2026-10-09', 'once', '2026-10-09')).toBe('2026-10-09');
    expect(nextPaydayOn('2026-10-08', 'once', '2026-10-09')).toBeNull();
  });

  it('agrees with next_payday for every frequency, from every day of a year', () => {
    for (const frequency of FREQUENCIES) {
      for (const last of LAST_PAYDAYS) {
        for (let offset = 0; offset < 400; offset += 1) {
          const from = plus('2026-01-01', offset);
          expect([frequency, last, from, nextPaydayOn(last, frequency, from)]).toEqual([
            frequency,
            last,
            from,
            sqlNextPayday(last, frequency, from),
          ]);
        }
      }
    }
  });
});

describe('paydayReminderOn', () => {
  it('is the payday less the lead', () => {
    expect(paydayReminderOn('2026-09-30', 'monthly', 3, '2026-10-09')).toBe('2026-10-27');
    expect(paydayReminderOn('2026-10-02', 'weekly', 0, '2026-10-09')).toBe('2026-10-09');
  });

  it('moves to the next payday once this one’s reminder day has gone', () => {
    expect(paydayReminderOn('2026-09-30', 'monthly', 3, '2026-10-29')).toBe('2026-11-27');
  });

  it('is never, for weekly pay a week ahead: that day is itself a payday', () => {
    expect(paydayReminderOn('2026-10-02', 'weekly', 7, '2026-10-09')).toBeNull();
  });

  it('agrees with the scheduler on every day of a year, for every frequency and lead', () => {
    for (const frequency of FREQUENCIES) {
      for (const last of LAST_PAYDAYS) {
        for (const lead of LEADS) {
          for (let offset = 0; offset < 380; offset += 3) {
            const today = plus('2026-01-01', offset);
            expect([
              frequency,
              last,
              lead,
              today,
              paydayReminderOn(last, frequency, lead, today),
            ]).toEqual([
              frequency,
              last,
              lead,
              today,
              schedulerSends(last, frequency, lead, today),
            ]);
          }
        }
      }
    }
  });
});

describe('leadCanFire', () => {
  it('rules out only a week ahead of weekly pay among the offered leads', () => {
    for (const lead of LEADS) {
      expect(leadCanFire(lead, ['weekly'])).toBe(lead < 7);
      expect(leadCanFire(lead, ['biweekly', 'semimonthly', 'monthly', 'once'])).toBe(true);
    }
    expect(leadCanFire(7, ['monthly', 'weekly'])).toBe(false);
    expect(leadCanFire(7, [])).toBe(true);
  });

  it('says a lead can fire exactly when the scheduler keeps sending it', () => {
    for (const frequency of ['weekly', 'biweekly', 'semimonthly', 'monthly'] as PayFrequency[]) {
      for (const last of LAST_PAYDAYS) {
        for (const lead of LEADS) {
          // From after the last payday: before it, a last payday still to come is the only one the
          // walk knows, so even a week's lead on weekly pay is sent that once.
          const from = last >= '2026-06-01' ? plus(last, 1) : '2026-06-01';
          const sends = schedulerSends(last, frequency, lead, from) !== null;
          expect([frequency, last, lead, sends]).toEqual([
            frequency,
            last,
            lead,
            leadCanFire(lead, [frequency]),
          ]);
        }
      }
    }
  });
});
