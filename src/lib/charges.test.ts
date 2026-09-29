import { planOccurrences } from '@/lib/card-ledger';
import {
  countFromAfterPick,
  cycleStart,
  floorAfterCharges,
  unrecordedDates,
  type ChargeablePlan,
} from '@/lib/charges';

const plan = (over: Partial<ChargeablePlan> = {}): ChargeablePlan => ({
  id: 'bill-1',
  recurrence: 'monthly',
  nextDate: '2026-09-14',
  startsOn: '2026-06-14',
  ...over,
});

const none = new Set<string>();

describe('unrecordedDates', () => {
  it('finds every time a plan has come due', () => {
    // Started in June, today is late August: June, July and August have run.
    expect(unrecordedDates(plan(), '2026-08-28', none)).toEqual([
      '2026-06-14',
      '2026-07-14',
      '2026-08-14',
    ]);
  });

  it('leaves out the ones already written down', () => {
    const recorded = new Set(['2026-06-14', '2026-07-14']);
    expect(unrecordedDates(plan(), '2026-08-28', recorded)).toEqual(['2026-08-14']);
  });

  it('records nothing twice, however many times it runs', () => {
    const today = '2026-08-28';
    const first = unrecordedDates(plan(), today, none);
    const recorded = new Set(first);
    expect(unrecordedDates(plan(), today, recorded)).toEqual([]);
  });

  it('never reaches back before the plan started', () => {
    const dates = unrecordedDates(plan({ startsOn: '2026-08-01' }), '2026-08-28', none);
    expect(dates).toEqual(['2026-08-14']);
  });

  it('falls back to when the row was made', () => {
    // No start date, but the app cannot have missed anything before it was
    // told the plan existed — and that is the floor the screens read with.
    const dates = unrecordedDates(
      plan({ startsOn: null, createdAt: '2026-07-02T09:15:00Z' }),
      '2026-08-28',
      none,
    );
    expect(dates).toEqual(['2026-07-14', '2026-08-14']);
  });

  it('does not backfill a plan with neither date', () => {
    // Nothing is known about whether it ran before, so it starts from today.
    expect(unrecordedDates(plan({ startsOn: null }), '2026-08-28', none)).toEqual([]);
  });

  it('stops at a plan that has ended', () => {
    const dates = unrecordedDates(plan({ endsOn: '2026-07-31' }), '2026-08-28', none);
    expect(dates).toEqual(['2026-06-14', '2026-07-14']);
  });

  it('does not record a date that has not arrived', () => {
    // Due on the 14th of each month; on the 10th, August has not happened.
    expect(unrecordedDates(plan({ startsOn: '2026-08-01' }), '2026-08-10', none)).toEqual([]);
  });

  it('records the day it falls due, not the day after', () => {
    expect(unrecordedDates(plan({ startsOn: '2026-08-01' }), '2026-08-14', none)).toEqual([
      '2026-08-14',
    ]);
  });

  it('handles a weekly plan without missing a week', () => {
    const weekly = plan({ recurrence: 'weekly', nextDate: '2026-08-31', startsOn: '2026-08-03' });
    expect(unrecordedDates(weekly, '2026-08-28', none)).toEqual([
      '2026-08-03',
      '2026-08-10',
      '2026-08-17',
      '2026-08-24',
    ]);
  });

  it('says nothing for a plan with no date at all', () => {
    expect(unrecordedDates(plan({ nextDate: null }), '2026-08-28', none)).toEqual([]);
  });
});

/**
 * A subscription added on the 28th that renewed on the 10th went out this
 * month. It used to vanish: nothing wrote a start date for subscriptions, so
 * the floor fell back to the day the row was made and the 10th sat before it —
 * not recorded, not projected, not on the Subscriptions page, not in Home's
 * expenses. By the time anyone looked, the stored date had rolled on to the
 * 10th of next month.
 */
describe('a subscription whose renewal was earlier this month', () => {
  const TODAY = '2026-09-28';
  const netflix = {
    id: 'subscription:netflix',
    label: 'Netflix',
    amount: 15.49,
    // Already rolled forward past the renewal that was picked.
    nextDate: '2026-10-10',
    recurrence: 'monthly' as const,
    kind: 'subscription' as const,
    createdAt: '2026-09-28T19:00:00+00:00',
    cardId: 'card-1',
    accountId: null,
  };
  const september = (startsOn: string | null) =>
    planOccurrences({
      plan: { ...netflix, startsOn },
      charges: [],
      isRecorded: false,
      from: '2026-09-01',
      to: '2026-09-30',
      today: TODAY,
    }).map((occurrence) => occurrence.date);

  it('counts the renewal once the start is the date picked', () => {
    expect(september('2026-09-10')).toEqual(['2026-09-10']);
  });

  it('is what went missing without a start date', () => {
    expect(september(null)).toEqual([]);
  });

  it('is written down by the recorder too', () => {
    const plan: ChargeablePlan = {
      id: netflix.id,
      recurrence: 'monthly',
      nextDate: netflix.nextDate,
      startsOn: '2026-09-10',
      createdAt: netflix.createdAt,
    };
    expect(unrecordedDates(plan, TODAY, new Set())).toEqual(['2026-09-10']);
  });
});

describe('countFromAfterPick', () => {
  it('starts a new plan at the date picked', () => {
    expect(countFromAfterPick('2026-09-10', null)).toBe('2026-09-10');
  });

  it('moves the start earlier when an earlier date is picked', () => {
    expect(countFromAfterPick('2026-09-10', '2026-09-28')).toBe('2026-09-10');
  });

  it('never moves it later, which would drop what is already counted', () => {
    expect(countFromAfterPick('2026-10-10', '2026-06-10')).toBe('2026-06-10');
  });

  it('leaves it alone when no date is picked', () => {
    expect(countFromAfterPick(null, '2026-06-10')).toBe('2026-06-10');
    expect(countFromAfterPick(null, null)).toBeNull();
  });
});

/**
 * Moving a charged bill's due date must not charge the same month twice.
 *
 * The Founder's rent was charged on 28 Sep, then its date was moved to the
 * 1st: both recorders saw 1 Sep as a date nobody had recorded and wrote it,
 * so September had two rents. The start now sits at the next cycle after the
 * newest charge.
 */
describe('a charged bill whose due date is moved', () => {
  const TODAY = '2026-09-28';

  it('will not record a second September even when the start was left on the 1st', () => {
    // What an older build saved — and what the Founder's live bill still
    // holds. The recorder itself now refuses the second charge in the month.
    const plan: ChargeablePlan = {
      id: 'bill:rent',
      recurrence: 'monthly',
      nextDate: '2026-10-01',
      startsOn: '2026-09-01',
    };
    expect(unrecordedDates(plan, TODAY, new Set(['2026-09-28']))).toEqual([]);
    expect(unrecordedDates(plan, '2026-10-01', new Set(['2026-09-28']))).toEqual(['2026-10-01']);
  });

  it('moved earlier in the month: nothing more in September, October on the new day', () => {
    const plan: ChargeablePlan = {
      id: 'bill:rent',
      recurrence: 'monthly',
      nextDate: '2026-09-01',
      startsOn: floorAfterCharges('2026-09-01', '2026-09-28', 'monthly'),
    };
    const charged = new Set(['2026-09-28']);
    expect(plan.startsOn).toBe('2026-10-01');
    expect(unrecordedDates(plan, TODAY, charged)).toEqual([]);
    expect(unrecordedDates(plan, '2026-10-01', charged)).toEqual(['2026-10-01']);
  });

  it('moved later in the month: nothing more in September, October on the new day', () => {
    const plan: ChargeablePlan = {
      id: 'bill:rent',
      recurrence: 'monthly',
      nextDate: '2026-09-28',
      startsOn: floorAfterCharges('2026-09-28', '2026-09-01', 'monthly'),
    };
    const charged = new Set(['2026-09-01']);
    expect(unrecordedDates(plan, TODAY, charged)).toEqual([]);
    expect(unrecordedDates(plan, '2026-10-28', charged)).toEqual(['2026-10-28']);
  });
});

describe('floorAfterCharges', () => {
  it('leaves a plan with no charges where it was put', () => {
    expect(floorAfterCharges('2026-09-01', null, 'monthly')).toBe('2026-09-01');
    expect(floorAfterCharges(null, null, 'monthly')).toBeNull();
  });

  it('keeps a start already past the charged cycle', () => {
    expect(floorAfterCharges('2026-10-15', '2026-09-28', 'monthly')).toBe('2026-10-15');
  });

  it('moves to the start of the next cycle for each recurrence', () => {
    // 2026-09-23 is a Wednesday.
    expect(floorAfterCharges(null, '2026-09-23', 'weekly')).toBe('2026-09-28');
    expect(floorAfterCharges(null, '2026-09-28', 'weekly')).toBe('2026-10-05');
    expect(floorAfterCharges(null, '2026-12-15', 'monthly')).toBe('2027-01-01');
    expect(floorAfterCharges(null, '2026-02-10', 'quarterly')).toBe('2026-04-01');
    expect(floorAfterCharges(null, '2026-11-30', 'quarterly')).toBe('2027-01-01');
    expect(floorAfterCharges(null, '2026-06-01', 'yearly')).toBe('2027-01-01');
  });
});

describe('cycleStart', () => {
  it('matches Postgres date_trunc for each recurrence', () => {
    // 2026-09-23 is a Wednesday; date_trunc('week') is Monday the 21st.
    expect(cycleStart('2026-09-23', 'weekly')).toBe('2026-09-21');
    expect(cycleStart('2026-09-21', 'weekly')).toBe('2026-09-21');
    expect(cycleStart('2026-09-27', 'weekly')).toBe('2026-09-21');
    expect(cycleStart('2026-09-28', 'monthly')).toBe('2026-09-01');
    expect(cycleStart('2026-11-30', 'quarterly')).toBe('2026-10-01');
    expect(cycleStart('2026-06-01', 'yearly')).toBe('2026-01-01');
  });
});

describe('a weekly plan', () => {
  it('records each week once even when its day moves within the week', () => {
    const plan: ChargeablePlan = {
      id: 'bill:cleaner',
      recurrence: 'weekly',
      nextDate: '2026-09-25',
      startsOn: '2026-09-21',
    };
    // Charged Tuesday the 22nd, then moved to Fridays.
    expect(unrecordedDates(plan, '2026-09-28', new Set(['2026-09-22']))).toEqual([]);
    expect(unrecordedDates(plan, '2026-10-02', new Set(['2026-09-22']))).toEqual(['2026-10-02']);
  });
});
