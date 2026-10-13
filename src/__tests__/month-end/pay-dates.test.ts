import { paydaysInRange } from '@/lib/date';
import { projectedPaydays, unrecordedPaydays } from '@/lib/pay';
import { nextPaydayOn } from '@/lib/payday';

/**
 * Monthly pay on the 29th, 30th and 31st across 2027 (a 28-day February) and 2028 (a 29-day one).
 * Every expected date was worked out by hand from the calendar.
 */

const days = (list: string) => list.split(' ');
const on = (iso: string) => new Date(`${iso}T00:00:00`);

function plus(iso: string, count: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}

function everyDay(from: string, to: string): string[] {
  const found: string[] = [];
  for (let day = from; day <= to; day = plus(day, 1)) found.push(day);
  return found;
}

const PAY_29_2027 = days(
  '2027-01-29 2027-02-28 2027-03-29 2027-04-29 2027-05-29 2027-06-29 2027-07-29 2027-08-29 2027-09-29 2027-10-29 2027-11-29 2027-12-29',
);
const PAY_30_2027 = days(
  '2027-01-30 2027-02-28 2027-03-30 2027-04-30 2027-05-30 2027-06-30 2027-07-30 2027-08-30 2027-09-30 2027-10-30 2027-11-30 2027-12-30',
);
const PAY_31_2027 = days(
  '2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 2027-09-30 2027-10-31 2027-11-30 2027-12-31',
);
const PAY_29_2028 = days(
  '2028-01-29 2028-02-29 2028-03-29 2028-04-29 2028-05-29 2028-06-29 2028-07-29 2028-08-29 2028-09-29 2028-10-29 2028-11-29 2028-12-29',
);
const PAY_30_2028 = days(
  '2028-01-30 2028-02-29 2028-03-30 2028-04-30 2028-05-30 2028-06-30 2028-07-30 2028-08-30 2028-09-30 2028-10-30 2028-11-30 2028-12-30',
);
const PAY_31_2028 = days(
  '2028-01-31 2028-02-29 2028-03-31 2028-04-30 2028-05-31 2028-06-30 2028-07-31 2028-08-31 2028-09-30 2028-10-31 2028-11-30 2028-12-31',
);

const SCHEDULES = [
  { anchor: 29, y2027: PAY_29_2027, y2028: PAY_29_2028 },
  { anchor: 30, y2027: PAY_30_2027, y2028: PAY_30_2028 },
  { anchor: 31, y2027: PAY_31_2027, y2028: PAY_31_2028 },
];

describe('paydaysInRange, monthly, forward', () => {
  it.each(SCHEDULES)('keeps the $anchor through 2027', ({ anchor, y2027 }) => {
    expect(paydaysInRange(on(`2027-01-${anchor}`), 'monthly', '2027-01-01', '2027-12-31')).toEqual(
      y2027,
    );
  });

  it.each(SCHEDULES)('keeps the $anchor through leap 2028', ({ anchor, y2028 }) => {
    expect(paydaysInRange(on(`2028-01-${anchor}`), 'monthly', '2028-01-01', '2028-12-31')).toEqual(
      y2028,
    );
  });

  it.each(SCHEDULES)('keeps the $anchor across both years', ({ anchor, y2027, y2028 }) => {
    expect(paydaysInRange(on(`2027-01-${anchor}`), 'monthly', '2027-01-01', '2028-12-31')).toEqual([
      ...y2027,
      ...y2028,
    ]);
  });
});

describe('paydaysInRange, monthly, walking back to a window that starts before the last payday', () => {
  it.each(SCHEDULES)('walks back from December 2028 on the $anchor', ({ anchor, y2027, y2028 }) => {
    expect(paydaysInRange(on(`2028-12-${anchor}`), 'monthly', '2027-01-01', '2028-12-31')).toEqual([
      ...y2027,
      ...y2028,
    ]);
  });

  it('lands on the last day of February, not on the 3rd of March', () => {
    expect(paydaysInRange(on('2027-03-31'), 'monthly', '2027-01-01', '2027-05-31')).toEqual(
      days('2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31'),
    );
    expect(paydaysInRange(on('2028-03-31'), 'monthly', '2027-12-01', '2028-04-30')).toEqual(
      days('2027-12-31 2028-01-31 2028-02-29 2028-03-31 2028-04-30'),
    );
    expect(paydaysInRange(on('2028-03-30'), 'monthly', '2028-02-01', '2028-03-31')).toEqual(
      days('2028-02-29 2028-03-30'),
    );
  });

  it('walks back across a 30-day month without losing the 31st', () => {
    expect(paydaysInRange(on('2027-07-31'), 'monthly', '2027-06-01', '2027-07-31')).toEqual(
      days('2027-06-30 2027-07-31'),
    );
  });

  it('steps back from the payday’s own day, not from the shortened February', () => {
    expect(paydaysInRange(on('2027-03-31'), 'monthly', '2027-01-28', '2027-03-31')).toEqual(
      days('2027-01-31 2027-02-28 2027-03-31'),
    );
  });
});

describe('paydaysInRange agrees with the reminders (nextPaydayOn)', () => {
  it('names the same next payday from every day of 2027 and 2028', () => {
    for (const { anchor } of SCHEDULES) {
      const last = `2027-01-${anchor}`;
      for (const day of everyDay('2027-01-01', '2028-12-31')) {
        const ledger = paydaysInRange(on(last), 'monthly', day, plus(day, 31))[0];
        expect([last, day, ledger]).toEqual([last, day, nextPaydayOn(last, 'monthly', day)]);
      }
    }
  });
});

describe('unrecordedPaydays, monthly', () => {
  const pay31 = { frequency: 'monthly' as const, lastPayday: '2027-01-31' };

  it('lists a whole year from the last payday, nothing on the record', () => {
    expect(unrecordedPaydays(pay31, [], '2027-01-01', '2027-12-31')).toEqual(PAY_31_2027);
  });

  it('starts after the pay on the record', () => {
    const recorded = days('2027-01-31 2027-02-28 2027-03-31');
    expect(unrecordedPaydays(pay31, recorded, '2027-01-01', '2027-06-15')).toEqual(
      days('2027-04-30 2027-05-31'),
    );
  });

  it('never reaches before the floor', () => {
    expect(unrecordedPaydays(pay31, [], '2027-07-01', '2027-12-31')).toEqual(
      days('2027-07-31 2027-08-31 2027-09-30 2027-10-31 2027-11-30 2027-12-31'),
    );
  });

  it('owes the 30th of March after a 29th of February, and not a day early', () => {
    const pay30 = { frequency: 'monthly' as const, lastPayday: '2028-01-30' };
    const recorded = days('2028-01-30 2028-02-29');
    expect(unrecordedPaydays(pay30, recorded, '2028-01-01', '2028-03-29')).toEqual([]);
    expect(unrecordedPaydays(pay30, recorded, '2028-01-01', '2028-03-30')).toEqual(['2028-03-30']);
  });

  it.each(SCHEDULES)(
    'writes each pay on its own day when opened every day of 2027 and 2028 ($anchor)',
    ({ anchor, y2027, y2028 }) => {
      const pay = { frequency: 'monthly' as const, lastPayday: `2027-01-${anchor}` };
      const recorded: string[] = [];
      for (const today of everyDay('2027-01-01', '2028-12-31')) {
        const due = unrecordedPaydays(pay, recorded, '2027-01-01', today);
        // Written on the day it falls due, and never again.
        expect([today, due]).toEqual([today, due.length > 0 ? [today] : []]);
        recorded.push(...due);
      }
      expect(recorded).toEqual([...y2027, ...y2028]);
    },
  );

  it('projects the rest of 2028 from the record, on the anchor day', () => {
    const pay = { frequency: 'monthly' as const, lastPayday: '2028-01-31' };
    expect(
      projectedPaydays(pay, days('2028-01-31 2028-02-29'), '2028-01-01', '2028-06-30'),
    ).toEqual(days('2028-03-31 2028-04-30 2028-05-31 2028-06-30'));
  });
});
