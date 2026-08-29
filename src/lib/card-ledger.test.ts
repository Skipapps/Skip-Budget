import {
  buildLedger,
  chargePlanKey,
  nextOccurrenceFrom,
  occurrencesInRange,
  planFloor,
  planKey,
  planOccurrences,
  type Charge,
  type Payment,
  type RecordedCharge,
  type RecurringCharge,
} from '@/lib/card-ledger';

const receipt = (id: string, amount: number, date: string): Charge => ({
  id,
  label: id,
  amount,
  date,
  kind: 'receipt',
});

const payment = (id: string, amount: number, date: string): Payment => ({ id, amount, date });

const monthly = (id: string, amount: number, nextDate: string): RecurringCharge => ({
  id,
  label: id,
  amount,
  nextDate,
  recurrence: 'monthly',
  kind: 'subscription',
});

const base = {
  kind: 'card' as const,
  statedBalance: 0,
  balanceAsOf: null,
  charges: [] as Charge[],
  recurring: [] as RecurringCharge[],
  payments: [] as Payment[],
  today: '2026-08-27',
};

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
    // A bill due on the 31st cannot land on 31 September.
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

describe('buildLedger — card', () => {
  it('adds spending to what is owed', () => {
    const ledger = buildLedger({
      ...base,
      statedBalance: 100,
      charges: [receipt('r1', 40, '2026-08-20')],
    });
    expect(ledger.balance).toBe(140);
    expect(ledger.charged).toBe(40);
  });

  it('subtracts a payment', () => {
    const ledger = buildLedger({
      ...base,
      statedBalance: 100,
      charges: [receipt('r1', 40, '2026-08-20')],
      payments: [payment('p1', 60, '2026-08-25')],
    });
    expect(ledger.balance).toBe(80);
    expect(ledger.paid).toBe(60);
  });

  it('ignores charges dated before the stated balance', () => {
    // The typed figure already includes them; counting again would double up.
    const ledger = buildLedger({
      ...base,
      statedBalance: 500,
      balanceAsOf: '2026-08-01',
      charges: [receipt('old', 200, '2026-07-15'), receipt('new', 25, '2026-08-10')],
    });
    expect(ledger.balance).toBe(525);
    expect(ledger.entries).toHaveLength(1);
  });

  it('counts a backdated charge when no balance was ever stated', () => {
    // The bug this guards: an unanchored card silently dropping old receipts.
    const ledger = buildLedger({
      ...base,
      balanceAsOf: null,
      charges: [receipt('old', 200, '2020-01-01')],
    });
    expect(ledger.balance).toBe(200);
  });

  it('ignores anything dated in the future', () => {
    const ledger = buildLedger({
      ...base,
      charges: [receipt('later', 99, '2026-12-25')],
    });
    expect(ledger.balance).toBe(0);
    expect(ledger.entries).toHaveLength(0);
  });

  it('accrues a subscription once per cycle since the anchor', () => {
    const ledger = buildLedger({
      ...base,
      statedBalance: 0,
      balanceAsOf: '2026-06-01',
      recurring: [monthly('netflix', 15.99, '2026-09-05')],
    });
    // June, July and August have all been charged; September has not.
    expect(ledger.entries).toHaveLength(3);
    expect(ledger.balance).toBeCloseTo(47.97, 2);
  });

  it('gives each occurrence its own id so keys stay stable', () => {
    const ledger = buildLedger({
      ...base,
      balanceAsOf: '2026-07-01',
      recurring: [monthly('netflix', 10, '2026-09-05')],
    });
    expect(new Set(ledger.entries.map((entry) => entry.id)).size).toBe(ledger.entries.length);
  });

  it('orders newest first', () => {
    const ledger = buildLedger({
      ...base,
      charges: [receipt('a', 1, '2026-08-01'), receipt('b', 1, '2026-08-20')],
    });
    expect(ledger.entries.map((entry) => entry.id)).toEqual(['b', 'a']);
  });

  it('shows charges as money out and payments as money in', () => {
    const ledger = buildLedger({
      ...base,
      charges: [receipt('r1', 40, '2026-08-20')],
      payments: [payment('p1', 60, '2026-08-25')],
    });
    expect(ledger.entries.find((entry) => entry.id === 'r1')?.amount).toBe(-40);
    expect(ledger.entries.find((entry) => entry.id === 'p1')?.amount).toBe(60);
  });
});

describe('buildLedger — bank account', () => {
  it('runs the other way: spending lowers it, a deposit raises it', () => {
    const ledger = buildLedger({
      ...base,
      kind: 'account',
      statedBalance: 1000,
      charges: [receipt('r1', 200, '2026-08-20')],
      payments: [payment('d1', 50, '2026-08-21')],
    });
    expect(ledger.balance).toBe(850);
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

describe('buildLedger — a recurring charge stays inside its own lifetime', () => {
  const base = {
    kind: 'card' as const,
    statedBalance: 0,
    balanceAsOf: null,
    charges: [],
    payments: [],
    today: '2026-08-28',
  };

  const rent = {
    id: 'bill-rent',
    label: 'Rent',
    amount: 100,
    nextDate: '2026-09-01',
    recurrence: 'monthly' as const,
    kind: 'bill' as const,
  };

  it('back-dates a bill with no start, which is what old rows rely on', () => {
    const ledger = buildLedger({ ...base, recurring: [rent] });
    expect(ledger.entries.length).toBeGreaterThan(6);
  });

  it('never lands a charge before the bill started', () => {
    const ledger = buildLedger({
      ...base,
      recurring: [{ ...rent, startsOn: '2026-07-01' }],
    });

    // July and August only — September is still ahead of today.
    expect(ledger.entries.map((entry) => entry.date)).toEqual(['2026-08-01', '2026-07-01']);
    expect(ledger.balance).toBe(200);
  });

  it('never lands a charge after the bill ended', () => {
    const ledger = buildLedger({
      ...base,
      recurring: [{ ...rent, startsOn: '2026-05-01', endsOn: '2026-06-30' }],
    });

    expect(ledger.entries.map((entry) => entry.date)).toEqual(['2026-06-01', '2026-05-01']);
    expect(ledger.balance).toBe(200);
  });

  it('drops a bill whose window closed before the balance was stated', () => {
    const ledger = buildLedger({
      ...base,
      balanceAsOf: '2026-08-01',
      recurring: [{ ...rent, startsOn: '2026-01-01', endsOn: '2026-03-01' }],
    });

    expect(ledger.entries).toEqual([]);
    expect(ledger.balance).toBe(0);
  });
});

describe('planFloor', () => {
  it('prefers the start date the plan actually carries', () => {
    expect(planFloor('2026-06-14', '2026-08-01T10:00:00Z')).toBe('2026-06-14');
  });

  it('falls back to the day the row was created', () => {
    // A plan with no start date cannot have charged before the app knew of it.
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
    // Rent went up to 900 this month. June, July and August still cost 850.
    expect(ask().map((entry) => entry.amount)).toEqual([850, 850, 850]);
  });

  it('leaves a charge where it landed when the plan moves off that day', () => {
    // The due date is now the 15th. Last June was still paid on the 1st.
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
    // The recorder has not reached it — offline, or a first run. Falling back
    // to the plan is what keeps the screen from going blank.
    const fallback = ask({ charges: [], isRecorded: false });

    expect(fallback.map((entry) => entry.date)).toEqual(['2026-06-01', '2026-07-01', '2026-08-01']);
    expect(fallback.every((entry) => entry.recorded)).toBe(false);
  });

  it('does not fill a gap in a plan that is on the record', () => {
    // July is missing because it was skipped, not because nobody looked.
    // Putting it back from the plan is exactly the rewriting this replaces.
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
    // Ending a bill stops it charging. It does not unspend what it charged.
    const ended = ask({ plan: { ...rent, endsOn: '2026-06-30' } });
    expect(ended.map((entry) => entry.date)).toEqual(['2026-06-01', '2026-07-01', '2026-08-01']);
  });
});

describe('planKey', () => {
  it('holds bills and subscriptions apart', () => {
    // Different tables, so the same id in each is two different plans.
    expect(planKey('bill', 'abc')).not.toBe(planKey('subscription', 'abc'));
  });

  it('files a charge under the same name its plan has', () => {
    // The wiring this protects fails silently when it breaks: a charge that
    // does not match its plan just never gets found, and the screen projects
    // instead — which looks exactly like everything working.
    expect(chargePlanKey({ bill_id: 'abc', subscription_id: null })).toBe(planKey('bill', 'abc'));
    expect(chargePlanKey({ bill_id: null, subscription_id: 'xyz' })).toBe(
      planKey('subscription', 'xyz'),
    );
  });
});
