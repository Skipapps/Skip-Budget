import {
  billWindow,
  chargePlanKey,
  dayAfter,
  nextOccurrenceFrom,
  occurrencesInRange,
  planFloor,
  planKey,
  planOccurrences,
  type RecordedCharge,
  type RecurringCharge,
} from '@/lib/card-ledger';

describe('occurrencesBetween', () => {
  it('walks a monthly charge back to the anchor', () => {
    expect(occurrencesInRange('2026-09-05', 'monthly', '2026-06-01', '2026-08-27')).toEqual([
      '2026-08-05',
      '2026-07-05',
      '2026-06-05',
    ]);
  });

  it('excludes the next date when it has not arrived', () => {
    expect(occurrencesInRange('2026-09-05', 'monthly', '2026-08-01', '2026-08-27')).toEqual([
      '2026-08-05',
    ]);
  });

  it('includes the next date once it has arrived', () => {
    expect(occurrencesInRange('2026-08-27', 'monthly', '2026-08-01', '2026-08-27')).toEqual([
      '2026-08-27',
    ]);
  });

  it('clamps the day to a shorter month', () => {
    expect(occurrencesInRange('2026-10-31', 'monthly', '2026-08-01', '2026-10-30')).toEqual([
      '2026-09-30',
      '2026-08-31',
    ]);
  });

  it('steps weekly charges by seven days across a month boundary', () => {
    expect(occurrencesInRange('2026-09-03', 'weekly', '2026-08-13', '2026-08-27')).toEqual([
      '2026-08-27',
      '2026-08-20',
      '2026-08-13',
    ]);
  });

  it('steps yearly charges by whole years', () => {
    expect(occurrencesInRange('2026-11-02', 'yearly', '2024-01-01', '2026-08-27')).toEqual([
      '2025-11-02',
      '2024-11-02',
    ]);
  });

  it('treats a period bill as a single dated charge', () => {
    expect(occurrencesInRange('2026-08-10', 'period', '2026-08-01', '2026-08-27')).toEqual([
      '2026-08-10',
    ]);
    expect(occurrencesInRange('2026-09-10', 'period', '2026-08-01', '2026-08-27')).toEqual([]);
  });
});

describe('nextOccurrenceFrom', () => {
  it('leaves a date that has not passed alone', () => {
    expect(nextOccurrenceFrom('2026-09-01', 'monthly', '2026-08-28')).toBe('2026-09-01');
  });

  it('advances a stale date to the next one still ahead', () => {
    expect(nextOccurrenceFrom('2026-05-15', 'monthly', '2026-08-28')).toBe('2026-09-15');
  });

  it('keeps the chosen day of the month across a long gap', () => {
    expect(nextOccurrenceFrom('2025-01-03', 'monthly', '2026-08-28')).toBe('2026-09-03');
  });

  it('clamps a 31st to the length of a short month', () => {
    expect(nextOccurrenceFrom('2026-01-31', 'monthly', '2026-02-15')).toBe('2026-02-28');
  });

  it('walks weekly and yearly schedules too', () => {
    expect(nextOccurrenceFrom('2026-08-03', 'weekly', '2026-08-28')).toBe('2026-08-31');
    expect(nextOccurrenceFrom('2024-06-10', 'yearly', '2026-08-28')).toBe('2027-06-10');
  });

  it('never moves a one-off, which has no next', () => {
    expect(nextOccurrenceFrom('2026-01-05', 'period', '2026-08-28')).toBe('2026-01-05');
  });
});

describe('a recurring charge stays inside its own lifetime', () => {
  const today = '2026-08-28';

  const rent: RecurringCharge = {
    id: 'bill-rent',
    label: 'Rent',
    amount: 100,
    nextDate: '2026-09-01',
    recurrence: 'monthly',
    kind: 'bill',
  };

  // Nothing on the record, so the plan alone speaks for the past, as it does for rows that
  // predate the recorder.
  const walk = (plan: RecurringCharge, from: string | null = null, to = today) =>
    planOccurrences({ plan, charges: [], isRecorded: false, from, to, today });

  const datesOf = (plan: RecurringCharge, from: string | null = null) =>
    walk(plan, from).map((occurrence) => occurrence.date);

  const totalOf = (plan: RecurringCharge) =>
    walk(plan).reduce((sum, occurrence) => sum + occurrence.amount, 0);

  it('back-dates a bill with no start, which is what old rows rely on', () => {
    const dates = datesOf(rent);

    expect(dates.length).toBeGreaterThan(6);
    expect(dates[dates.length - 1]).toBe('2026-08-01');
    expect(dates).toContain('2025-09-01');
    expect(billWindow({}, null, today)).toEqual({ from: null, to: today });
  });

  it('never lands a charge before the bill started', () => {
    const started = { ...rent, startsOn: '2026-07-01' };

    expect(datesOf(started)).toEqual(['2026-07-01', '2026-08-01']);
    expect(totalOf(started)).toBe(200);
  });

  it('never lands a charge after the bill ended', () => {
    const ended = { ...rent, startsOn: '2026-05-01', endsOn: '2026-06-30' };

    expect(datesOf(ended)).toEqual(['2026-05-01', '2026-06-01']);
    expect(totalOf(ended)).toBe(200);
  });

  it('drops a bill whose window closed before the window asked about', () => {
    // The typed balance is as of 1 Aug, so the walk starts there; the bill ended in March.
    const finished = { ...rent, startsOn: '2026-01-01', endsOn: '2026-03-01' };

    expect(datesOf(finished, '2026-08-01')).toEqual([]);
    expect(
      billWindow({ starts_on: '2026-01-01', ends_on: '2026-03-01' }, '2026-08-01', today),
    ).toEqual({
      from: '2026-08-01',
      to: '2026-03-01',
    });
  });

  it('starts from the day the row was made when it has no start date', () => {
    const made = { ...rent, createdAt: '2026-07-15T09:30:00Z' };

    expect(datesOf(made)).toEqual(['2026-08-01']);
  });

  it('prefers its start date to the day the row was made', () => {
    const backdated = { ...rent, startsOn: '2026-06-01', createdAt: '2026-07-15T09:30:00Z' };

    expect(datesOf(backdated)).toEqual(['2026-06-01', '2026-07-01', '2026-08-01']);
  });

  it('keeps a charge on the last day of its window, a 31st clamped to a short month', () => {
    const shortLived: RecurringCharge = {
      ...rent,
      nextDate: '2026-03-31',
      startsOn: '2026-01-01',
      endsOn: '2026-02-28',
    };

    expect(datesOf(shortLived)).toEqual(['2026-01-31', '2026-02-28']);
  });

  it('forecasts only up to the day a bill ends', () => {
    const ending = { ...rent, endsOn: '2026-10-15' };
    const ahead = planOccurrences({
      plan: ending,
      charges: [],
      isRecorded: true,
      from: null,
      to: '2026-12-31',
      today,
    });

    expect(ahead.map((occurrence) => occurrence.date)).toEqual(['2026-09-01', '2026-10-01']);
  });

  it('forecasts nothing before the day a bill starts', () => {
    // The stored next date can sit before a start date edited later.
    const later = { ...rent, startsOn: '2026-10-01' };
    const ahead = planOccurrences({
      plan: later,
      charges: [],
      isRecorded: true,
      from: null,
      to: '2026-12-31',
      today,
    });

    expect(ahead.map((occurrence) => occurrence.date)).toEqual([
      '2026-10-01',
      '2026-11-01',
      '2026-12-01',
    ]);
  });
});

describe('billWindow', () => {
  it('leaves a window alone when the bill has no bounds', () => {
    expect(billWindow({}, '2026-06-01', '2026-08-28')).toEqual({
      from: '2026-06-01',
      to: '2026-08-28',
    });
  });

  it('pulls the start forward to the bill’s own start, never back past the window', () => {
    expect(billWindow({ starts_on: '2026-07-01' }, '2026-06-01', '2026-08-28').from).toBe(
      '2026-07-01',
    );
    expect(billWindow({ starts_on: '2026-05-01' }, '2026-06-01', '2026-08-28').from).toBe(
      '2026-06-01',
    );
  });

  it('opens an unbounded window at the bill’s start', () => {
    expect(billWindow({ starts_on: '2026-07-01' }, null, '2026-08-28').from).toBe('2026-07-01');
  });

  it('pulls the end back to the bill’s own end, never on past the window', () => {
    expect(billWindow({ ends_on: '2026-06-30' }, null, '2026-08-28').to).toBe('2026-06-30');
    expect(billWindow({ ends_on: '2026-12-31' }, null, '2026-08-28').to).toBe('2026-08-28');
  });

  it('keeps the end day itself', () => {
    expect(billWindow({ ends_on: '2026-08-28' }, null, '2026-08-28').to).toBe('2026-08-28');
  });

  it('falls back to the day the row was made when there is no start date', () => {
    expect(billWindow({ created_at: '2026-07-15T09:30:00Z' }, null, '2026-08-28').from).toBe(
      '2026-07-15',
    );
    expect(
      billWindow(
        { starts_on: '2026-06-01', created_at: '2026-07-15T09:30:00Z' },
        null,
        '2026-08-28',
      ).from,
    ).toBe('2026-06-01');
  });
});

describe('dayAfter', () => {
  it('steps over a month end, a year end and a leap day', () => {
    expect(dayAfter('2026-08-31')).toBe('2026-09-01');
    expect(dayAfter('2026-12-31')).toBe('2027-01-01');
    expect(dayAfter('2026-02-28')).toBe('2026-03-01');
    expect(dayAfter('2028-02-28')).toBe('2028-02-29');
    expect(dayAfter('2028-02-29')).toBe('2028-03-01');
  });
});

describe('planFloor', () => {
  it('prefers the start date the plan actually carries', () => {
    expect(planFloor('2026-06-14', '2026-08-01T10:00:00Z')).toBe('2026-06-14');
  });

  it('falls back to the day the row was created', () => {
    expect(planFloor(null, '2026-08-01T10:00:00Z')).toBe('2026-08-01');
  });

  it('is null only when nothing at all is known', () => {
    expect(planFloor(null, null)).toBeNull();
  });
});

describe('planOccurrences', () => {
  const today = '2026-08-28';

  const rent: RecurringCharge = {
    id: 'bill-rent',
    label: 'Rent',
    amount: 900,
    nextDate: '2026-09-01',
    recurrence: 'monthly',
    kind: 'bill',
    startsOn: '2026-06-01',
    cardId: 'card-now',
  };

  // What went out at the time: a tenner cheaper, off a card since replaced.
  const charged = (date: string, over: Partial<RecordedCharge> = {}): RecordedCharge => ({
    id: `charge-${date}`,
    planId: 'bill-rent',
    label: 'Rent',
    amount: 850,
    date,
    cardId: 'card-then',
    accountId: null,
    ...over,
  });

  const summer = [charged('2026-06-01'), charged('2026-07-01'), charged('2026-08-01')];

  const ask = (over: Partial<Parameters<typeof planOccurrences>[0]> = {}) =>
    planOccurrences({
      plan: rent,
      charges: summer,
      isRecorded: true,
      from: null,
      to: today,
      today,
      ...over,
    });

  it('reads the past off the record, not off the plan', () => {
    // Rent went up to 900 this month; June to August still cost 850.
    expect(ask().map((entry) => entry.amount)).toEqual([850, 850, 850]);
  });

  it('leaves a charge where it landed when the plan moves off that day', () => {
    // The due date is now the 15th; June was still paid on the 1st.
    const moved = ask({ plan: { ...rent, nextDate: '2026-09-15' } });
    expect(moved.map((entry) => entry.date)).toEqual(['2026-06-01', '2026-07-01', '2026-08-01']);
  });

  it('keeps the source that actually paid, not the one it charges now', () => {
    expect(ask().every((entry) => entry.cardId === 'card-then')).toBe(true);
  });

  it('still forecasts, whatever the past says', () => {
    const ahead = ask({ to: '2026-11-30' });
    const future = ahead.filter((entry) => !entry.recorded);

    expect(future.map((entry) => entry.date)).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
    // A forecast is the plan's to make: today's amount, today's card.
    expect(future.every((entry) => entry.amount === 900)).toBe(true);
    expect(future.every((entry) => entry.cardId === 'card-now')).toBe(true);
  });

  it('projects the past for a plan nothing has been recorded for', () => {
    // The recorder has not reached it (offline, first run): fall back to the plan.
    const fallback = ask({ charges: [], isRecorded: false });

    expect(fallback.map((entry) => entry.date)).toEqual(['2026-06-01', '2026-07-01', '2026-08-01']);
    expect(fallback.every((entry) => entry.recorded)).toBe(false);
  });

  it('does not fill a gap in a plan that is on the record', () => {
    // July was skipped; putting it back from the plan would rewrite history.
    const gapped = ask({ charges: [charged('2026-06-01'), charged('2026-08-01')] });
    expect(gapped.map((entry) => entry.date)).toEqual(['2026-06-01', '2026-08-01']);
  });

  it('counts a day once when the record and the plan both claim it', () => {
    const skewed = ask({ charges: [charged('2026-09-01')], to: '2026-09-30' });
    expect(skewed).toHaveLength(1);
    expect(skewed[0].id).toBe('charge-2026-09-01');
  });

  it('drops what the window does not ask about', () => {
    expect(ask({ from: '2026-07-01' }).map((entry) => entry.date)).toEqual([
      '2026-07-01',
      '2026-08-01',
    ]);
  });

  it('shows a charge the plan has since been shortened past', () => {
    // Ending a bill stops it charging; it does not unspend what it charged.
    const ended = ask({ plan: { ...rent, endsOn: '2026-06-30' } });
    expect(ended.map((entry) => entry.date)).toEqual(['2026-06-01', '2026-07-01', '2026-08-01']);
  });
});

describe('planKey', () => {
  it('holds bills and subscriptions apart', () => {
    expect(planKey('bill', 'abc')).not.toBe(planKey('subscription', 'abc'));
  });

  it('files a charge under the same name its plan has', () => {
    // Fails silently when broken: an unmatched charge is never found and the screen projects instead.
    expect(chargePlanKey({ bill_id: 'abc', subscription_id: null })).toBe(planKey('bill', 'abc'));
    expect(chargePlanKey({ bill_id: null, subscription_id: 'xyz' })).toBe(
      planKey('subscription', 'xyz'),
    );
  });
});
