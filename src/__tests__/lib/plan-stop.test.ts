import { loanBillEnded } from '@/lib/active-loans';
import { planOccurrences, type RecordedCharge } from '@/lib/card-ledger';
import { unrecordedDates } from '@/lib/charges';
import { billStopped, stopBillValues, type StoppableBill } from '@/lib/plan-stop';

/**
 * "Keep past" on a delete stops a bill (or a loan's bill) today: today's due is still recorded,
 * nothing after it is recorded or projected, and the stored row stays one the database accepts.
 */

const TODAY = '2026-10-12';

const bill = (extra: Partial<StoppableBill> = {}): StoppableBill => ({
  starts_on: '2026-09-01',
  ends_on: null,
  next_due_on: '2026-10-12',
  ...extra,
});

/** The bill as stored after the stop. */
const stopped = (before: StoppableBill, today = TODAY): StoppableBill => ({
  ...before,
  ...stopBillValues(before, today),
});

/** bills_period_order: ends_on is null, starts_on is null, or ends_on >= starts_on. */
const periodOrderHolds = (row: StoppableBill) =>
  !row.ends_on || !row.starts_on || row.ends_on >= row.starts_on;

describe('stopBillValues', () => {
  it('ends a running bill today and keeps its next date', () => {
    expect(stopBillValues(bill(), TODAY)).toEqual({ ends_on: TODAY });
    expect(stopBillValues(bill({ ends_on: '2027-06-12' }), TODAY)).toEqual({ ends_on: TODAY });
  });

  it('ends one with no start of its own, or one that starts today, the same way', () => {
    expect(stopBillValues(bill({ starts_on: null }), TODAY)).toEqual({ ends_on: TODAY });
    expect(stopBillValues(bill({ starts_on: TODAY }), TODAY)).toEqual({ ends_on: TODAY });
  });

  it('stops one that counts from after today with no next date, so the database takes it', () => {
    // Charged on 1 Oct, then its due day moved to the 28th: it counts from 1 Nov.
    const moved = bill({ starts_on: '2026-11-01', next_due_on: '2026-10-28' });
    expect(periodOrderHolds({ ...moved, ends_on: TODAY })).toBe(false);
    expect(stopBillValues(moved, TODAY)).toEqual({
      starts_on: TODAY,
      ends_on: TODAY,
      next_due_on: null,
    });
  });

  it('stops a loan added before its first payment the same way', () => {
    const loan = bill({
      starts_on: '2026-11-27',
      next_due_on: '2026-11-27',
      ends_on: '2030-10-27',
    });
    expect(stopBillValues(loan, TODAY)).toEqual({
      starts_on: TODAY,
      ends_on: TODAY,
      next_due_on: null,
    });
  });

  it('never moves an end that has already come later, which would reopen the days between', () => {
    expect(stopBillValues(bill({ ends_on: '2026-09-30' }), TODAY)).toEqual({
      ends_on: '2026-09-30',
    });
    expect(stopBillValues(bill({ ends_on: TODAY }), TODAY)).toEqual({ ends_on: TODAY });
  });

  it('always leaves a row bills_period_order accepts', () => {
    const starts = [null, '2025-12-31', '2026-10-11', TODAY, '2026-10-13', '2027-01-01'];
    const ends = [null, '2026-09-30', '2026-10-11', TODAY, '2026-10-13', '2030-10-27'];
    const nexts = [null, '2026-10-01', TODAY, '2026-10-28'];
    let cases = 0;
    for (const starts_on of starts) {
      for (const ends_on of ends) {
        for (const next_due_on of nexts) {
          const before = { starts_on, ends_on, next_due_on };
          if (!periodOrderHolds(before)) continue;
          const after = stopped(before);
          expect(periodOrderHolds(after)).toBe(true);
          expect(billStopped(after, TODAY)).toBe(true);
          // Never later than it was, never later than today.
          expect(after.ends_on! <= TODAY).toBe(true);
          if (ends_on) expect(after.ends_on! <= ends_on).toBe(true);
          cases += 1;
        }
      }
    }
    expect(cases).toBeGreaterThan(80);
  });
});

describe('billStopped', () => {
  it('is running until stopped, and stopped from the stop day on', () => {
    expect(billStopped(bill(), TODAY)).toBe(false);
    expect(billStopped(stopped(bill()), TODAY)).toBe(true);
    expect(billStopped(stopped(bill()), '2026-11-30')).toBe(true);
  });

  it('reads a bill with no next date, or an end that has come, as stopped', () => {
    expect(billStopped(bill({ next_due_on: null }), TODAY)).toBe(true);
    expect(billStopped(bill({ ends_on: '2026-10-11' }), TODAY)).toBe(true);
    expect(billStopped(bill({ ends_on: '2026-10-13' }), TODAY)).toBe(false);
  });

  it('agrees with loanBillEnded, so a stopped loan and a stopped bill read alike', () => {
    for (const next_due_on of [null, '2026-10-01', TODAY, '2026-11-12']) {
      for (const ends_on of [null, '2026-10-11', TODAY, '2026-10-13']) {
        expect(billStopped({ next_due_on, ends_on }, TODAY)).toBe(
          loanBillEnded({ next_due_on, ends_on }, TODAY),
        );
      }
    }
  });
});

/** As `recordDueCharges` reads a bill. */
const chargeable = (row: StoppableBill) => ({
  id: 'rent',
  recurrence: 'monthly' as const,
  nextDate: row.next_due_on,
  startsOn: row.starts_on,
  createdAt: null,
  endsOn: row.ends_on,
});

describe('after a stop, on the phone', () => {
  it('records a payment due on the stop day, and nothing after it', () => {
    const rent = stopped(bill());
    expect(unrecordedDates(chargeable(rent), TODAY, new Set(['2026-09-12']))).toEqual([TODAY]);
    // A month on, with the schedule rolled forward past the stop: still only that day.
    const later = { ...rent, next_due_on: '2026-11-12' };
    expect(unrecordedDates(chargeable(later), '2026-11-20', new Set(['2026-09-12']))).toEqual([
      TODAY,
    ]);
    expect(
      unrecordedDates(chargeable(later), '2026-11-20', new Set(['2026-09-12', TODAY])),
    ).toEqual([]);
  });

  it('records nothing for one stopped before its due day', () => {
    const rent = stopped(bill({ next_due_on: '2026-10-20' }));
    expect(unrecordedDates(chargeable(rent), '2026-12-25', new Set(['2026-09-20']))).toEqual([]);
  });

  it('records nothing at all for one stopped with no next date', () => {
    const moved = stopped(bill({ starts_on: '2026-11-01', next_due_on: '2026-10-28' }));
    expect(unrecordedDates(chargeable(moved), '2027-03-01', new Set(['2026-10-01']))).toEqual([]);
  });

  it('projects nothing after the stop, and keeps what was recorded', () => {
    const rent = stopped(bill({ next_due_on: '2026-10-20' }));
    const charges: RecordedCharge[] = [
      {
        id: 'charge-1',
        planId: 'bill-rent',
        label: 'Rent',
        amount: 1450,
        date: '2026-09-20',
        cardId: null,
        accountId: 'acct',
      },
    ];
    const found = planOccurrences({
      plan: {
        id: 'bill-rent',
        label: 'Rent',
        amount: 1450,
        nextDate: rent.next_due_on!,
        recurrence: 'monthly',
        kind: 'bill',
        startsOn: rent.starts_on,
        endsOn: rent.ends_on,
      },
      charges,
      isRecorded: true,
      from: '2026-09-01',
      to: '2027-12-31',
      today: TODAY,
    });
    expect(found.map((occurrence) => [occurrence.date, occurrence.recorded])).toEqual([
      ['2026-09-20', true],
    ]);
  });
});
