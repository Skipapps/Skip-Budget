import { planOccurrences, type RecordedCharge, type RecurringCharge } from '@/lib/card-ledger';
import { unrecordedDates } from '@/lib/charges';
import { paydaysInRange } from '@/lib/date';
import { projectedPaydays, unrecordedPaydays } from '@/lib/pay';

/**
 * Records written on shortened days before the anchor day existed (the 28th of every month after a
 * February) must not be paid or charged a second time once the schedule is back on its own day.
 */

const days = (list: string) => list.split(' ');
const on = (iso: string) => new Date(`${iso}T00:00:00`);

function plus(iso: string, count: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}

/** What the old walker wrote for a salary last paid on 31 January 2026. */
const DRIFTED_PAY = days(
  '2026-01-31 2026-02-28 2026-03-28 2026-04-28 2026-05-28 2026-06-28 2026-07-28 2026-08-28 2026-09-28',
);
const PAY_31 = { frequency: 'monthly' as const, lastPayday: '2026-01-31' };

describe('monthly pay after a drifted record', () => {
  it('owes nothing for September, whose pay is on the record on the 28th', () => {
    // The schedule's own September payday, which the record already covers.
    expect(paydaysInRange(on('2026-01-31'), 'monthly', '2026-09-29', '2026-09-30')).toEqual([
      '2026-09-30',
    ]);
    expect(unrecordedPaydays(PAY_31, DRIFTED_PAY, '2026-01-01', '2026-10-13')).toEqual([]);
  });

  it('owes October on the 31st, and not a day before', () => {
    for (let today = '2026-09-29'; today < '2026-10-31'; today = plus(today, 1)) {
      expect([today, unrecordedPaydays(PAY_31, DRIFTED_PAY, '2026-01-01', today)]).toEqual([
        today,
        [],
      ]);
    }
    expect(unrecordedPaydays(PAY_31, DRIFTED_PAY, '2026-01-01', '2026-10-31')).toEqual([
      '2026-10-31',
    ]);
  });

  it('projects exactly 31 October, 30 November and 31 December from 29 September', () => {
    expect(projectedPaydays(PAY_31, DRIFTED_PAY, '2026-09-29', '2026-12-31')).toEqual(
      days('2026-10-31 2026-11-30 2026-12-31'),
    );
  });

  it('answers the same from the newest pay on the record alone', () => {
    expect(unrecordedPaydays(PAY_31, '2026-09-28', '2026-01-01', '2026-10-13')).toEqual([]);
    expect(unrecordedPaydays(PAY_31, '2026-09-28', '2026-01-01', '2026-10-31')).toEqual([
      '2026-10-31',
    ]);
    expect(projectedPaydays(PAY_31, '2026-09-28', '2026-09-29', '2026-12-31')).toEqual(
      days('2026-10-31 2026-11-30 2026-12-31'),
    );
  });

  it('gives the same paydays from the whole record or its newest day, on every day', () => {
    const records = [DRIFTED_PAY, days('2026-01-31 2026-02-28 2026-03-31 2026-04-30')];
    for (const record of records) {
      for (let cut = 0; cut <= record.length; cut += 1) {
        const held = record.slice(0, cut);
        const newest = held.length > 0 ? held[held.length - 1] : null;
        for (let today = '2026-01-01'; today <= '2027-03-31'; today = plus(today, 1)) {
          expect([cut, today, unrecordedPaydays(PAY_31, held, '2026-01-01', today)]).toEqual([
            cut,
            today,
            unrecordedPaydays(PAY_31, newest, '2026-01-01', today),
          ]);
        }
      }
    }
  });
});

describe('monthly pay is once a month', () => {
  // Paid on 1 October, then the last payday was changed to 20 October.
  const moved = { frequency: 'monthly' as const, lastPayday: '2026-10-20' };

  it('does not count 20 October in a month already paid on the 1st', () => {
    expect(unrecordedPaydays(moved, ['2026-10-01'], '2026-01-01', '2026-10-20')).toEqual([]);
    expect(unrecordedPaydays(moved, ['2026-10-01'], '2026-01-01', '2026-11-19')).toEqual([]);
  });

  it('counts 20 November', () => {
    expect(unrecordedPaydays(moved, ['2026-10-01'], '2026-01-01', '2026-11-20')).toEqual([
      '2026-11-20',
    ]);
    expect(projectedPaydays(moved, ['2026-10-01'], '2026-10-01', '2026-12-31')).toEqual(
      days('2026-11-20 2026-12-20'),
    );
  });

  it('leaves twice-a-month and weekly pay alone', () => {
    const twice = { frequency: 'semimonthly' as const, lastPayday: '2026-09-15' };
    expect(unrecordedPaydays(twice, ['2026-09-15'], '2026-01-01', '2026-09-30')).toEqual([
      '2026-09-30',
    ]);
    const weekly = { frequency: 'weekly' as const, lastPayday: '2026-10-02' };
    expect(unrecordedPaydays(weekly, ['2026-10-02'], '2026-01-01', '2026-10-16')).toEqual(
      days('2026-10-09 2026-10-16'),
    );
  });
});

/** A loan bill moved back onto its payment day, 31, after the old rollers wrote the 28th. */
const DRIFTED_CHARGES = new Set(DRIFTED_PAY);
const LOAN_BILL = {
  id: 'bill-loan',
  recurrence: 'monthly' as const,
  nextDate: '2026-10-31',
  anchorDay: 31,
  startsOn: '2026-01-31',
};

describe('charges after a drifted record', () => {
  it('owes nothing until 31 October, then only that', () => {
    expect(unrecordedDates(LOAN_BILL, '2026-10-13', DRIFTED_CHARGES)).toEqual([]);
    expect(unrecordedDates(LOAN_BILL, '2026-10-30', DRIFTED_CHARGES)).toEqual([]);
    expect(unrecordedDates(LOAN_BILL, '2026-10-31', DRIFTED_CHARGES)).toEqual(['2026-10-31']);
  });
});

describe('planOccurrences projects no second charge in a cycle already charged', () => {
  const plan: RecurringCharge = {
    id: 'bill-rent',
    label: 'Rent',
    amount: 1234.56,
    nextDate: '2026-10-31',
    anchorDay: 31,
    recurrence: 'monthly',
    kind: 'bill',
    startsOn: '2026-01-31',
  };
  const charged = (date: string): RecordedCharge => ({
    id: `charge-${date}`,
    planId: plan.id,
    label: 'Rent',
    amount: 1234.56,
    date,
    cardId: null,
    accountId: 'account',
  });

  it('leaves October at its 28 October charge, and still forecasts November', () => {
    const found = planOccurrences({
      plan,
      charges: [charged('2026-09-28'), charged('2026-10-28')],
      isRecorded: true,
      from: '2026-10-01',
      to: '2026-11-30',
      today: '2026-10-29',
    });
    expect(found.map((entry) => [entry.date, entry.recorded])).toEqual([
      ['2026-10-28', true],
      ['2026-11-30', false],
    ]);
  });

  it('counts a quarter once too', () => {
    const found = planOccurrences({
      plan: { ...plan, recurrence: 'quarterly' },
      charges: [charged('2026-10-28')],
      isRecorded: true,
      from: '2026-10-01',
      to: '2027-01-31',
      today: '2026-10-29',
    });
    expect(found.map((entry) => entry.date)).toEqual(['2026-10-28', '2027-01-31']);
  });
});
