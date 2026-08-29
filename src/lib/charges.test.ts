import { unrecordedDates, type ChargeablePlan } from '@/lib/charges';

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
