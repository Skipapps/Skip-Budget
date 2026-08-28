import {
  buildLedger,
  occurrencesBetween,
  type Charge,
  type Payment,
  type RecurringCharge,
} from '@/lib/card-ledger';
import { nextOccurrenceFrom } from '@/lib/card-ledger';

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
    expect(occurrencesBetween('2026-09-05', 'monthly', '2026-06-01', '2026-08-27')).toEqual([
      '2026-08-05',
      '2026-07-05',
      '2026-06-05',
    ]);
  });

  it('excludes the next date when it has not arrived', () => {
    expect(occurrencesBetween('2026-09-05', 'monthly', '2026-08-01', '2026-08-27')).toEqual([
      '2026-08-05',
    ]);
  });

  it('includes the next date once it has arrived', () => {
    expect(occurrencesBetween('2026-08-27', 'monthly', '2026-08-01', '2026-08-27')).toEqual([
      '2026-08-27',
    ]);
  });

  it('clamps the day to a shorter month', () => {
    // A bill due on the 31st cannot land on 31 September.
    expect(occurrencesBetween('2026-10-31', 'monthly', '2026-08-01', '2026-10-30')).toEqual([
      '2026-09-30',
      '2026-08-31',
    ]);
  });

  it('steps weekly charges by seven days across a month boundary', () => {
    expect(occurrencesBetween('2026-09-03', 'weekly', '2026-08-13', '2026-08-27')).toEqual([
      '2026-08-27',
      '2026-08-20',
      '2026-08-13',
    ]);
  });

  it('steps yearly charges by whole years', () => {
    expect(occurrencesBetween('2026-11-02', 'yearly', '2024-01-01', '2026-08-27')).toEqual([
      '2025-11-02',
      '2024-11-02',
    ]);
  });

  it('treats a period bill as a single dated charge', () => {
    expect(occurrencesBetween('2026-08-10', 'period', '2026-08-01', '2026-08-27')).toEqual([
      '2026-08-10',
    ]);
    expect(occurrencesBetween('2026-09-10', 'period', '2026-08-01', '2026-08-27')).toEqual([]);
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
