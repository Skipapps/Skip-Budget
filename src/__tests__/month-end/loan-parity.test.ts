import { nextOccurrenceFrom, occurrencesInRange } from '@/lib/card-ledger';
import { unrecordedDates } from '@/lib/charges';
import { toIsoDate } from '@/lib/date';
import { paymentDates } from '@/lib/loan';

/**
 * A loan's bill row is walked like any monthly bill: stored date the first payment, anchor day the
 * loan's payment day. Its dates must be the loan's own (`paymentDates`), which the loan pages and
 * the payoff figures are worked from.
 */

const days = (list: string) => list.split(' ');

function plus(iso: string, count: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}

const loanDates = (first: string, months: number, paymentDay: number) =>
  paymentDates(new Date(`${first}T00:00:00`), months, paymentDay).map(toIsoDate);

const AFTER_FEBRUARY_2027 =
  '2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 2027-09-30 2027-10-31 2027-11-30 2027-12-31 ' +
  '2028-01-31 2028-02-29 2028-03-31 2028-04-30 2028-05-31 2028-06-30 2028-07-31 2028-08-31 2028-09-30 2028-10-31 2028-11-30 2028-12-31 ' +
  '2029-01-31';

const LOANS = [
  {
    name: 'payment day 31, first payment 28 February',
    first: '2027-02-28',
    paymentDay: 31,
    expected: days(`2027-02-28 ${AFTER_FEBRUARY_2027}`),
  },
  {
    name: 'payment day 31, first payment off it on 10 February',
    first: '2027-02-10',
    paymentDay: 31,
    expected: days(`2027-02-10 ${AFTER_FEBRUARY_2027}`),
  },
  {
    name: 'payment day 30, first payment 15 November, across a leap February',
    first: '2027-11-15',
    paymentDay: 30,
    expected: days(
      '2027-11-15 2027-12-30 2028-01-30 2028-02-29 2028-03-30 2028-04-30 2028-05-30 2028-06-30 2028-07-30 2028-08-30 2028-09-30 2028-10-30 ' +
        '2028-11-30 2028-12-30 2029-01-30 2029-02-28 2029-03-30 2029-04-30 2029-05-30 2029-06-30 2029-07-30 2029-08-30 2029-09-30 2029-10-30',
    ),
  },
];

describe('a loan bill walks on the loan’s own payment dates', () => {
  it.each(LOANS)(
    '$name: the loan’s 24 dates, worked out by hand',
    ({ first, paymentDay, expected }) => {
      expect(expected).toHaveLength(24);
      expect(loanDates(first, 24, paymentDay)).toEqual(expected);
    },
  );

  it.each(LOANS)('$name: the bill’s walk gives the same 24', ({ first, paymentDay, expected }) => {
    const last = expected[expected.length - 1];
    expect(occurrencesInRange(first, 'monthly', first, last, paymentDay).sort()).toEqual(expected);
  });

  it.each(LOANS)(
    '$name: swept every day, it records those dates and rolls onto the next of them',
    ({ first, paymentDay, expected }) => {
      const last = expected[expected.length - 1];
      let stored = first;
      const recorded = new Set<string>();
      for (let today = first; today <= last; today = plus(today, 1)) {
        const plan = {
          id: 'loan',
          recurrence: 'monthly' as const,
          nextDate: stored,
          anchorDay: paymentDay,
          startsOn: first,
          endsOn: last,
        };
        for (const date of unrecordedDates(plan, today, recorded)) recorded.add(date);
        if (stored < today) stored = nextOccurrenceFrom(stored, 'monthly', today, paymentDay);
        expect([today, stored]).toEqual([today, expected.find((date) => date >= today)]);
      }
      expect([...recorded].sort()).toEqual(expected);
    },
  );

  it('falls to the 28th for good without the payment day, which is why the bill keeps it', () => {
    expect(occurrencesInRange('2027-02-28', 'monthly', '2027-02-28', '2027-05-31').sort()).toEqual(
      days('2027-02-28 2027-03-28 2027-04-28 2027-05-28'),
    );
  });
});
