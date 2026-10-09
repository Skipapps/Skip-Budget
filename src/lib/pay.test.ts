import {
  incomeForMonth,
  oneOffsInMonth,
  scheduledPerMonth,
  type PayLine,
  landingAccount,
  payProjectionStart,
  unrecordedPaydays,
} from '@/lib/pay';

/**
 * A month's income, as the app adds it up. The same figures as supabase/checks/one_off_pay.sql, so
 * the page and the server's savings record agree to the cent.
 */

const pays: PayLine[] = [
  { amount: 3000, frequency: 'monthly', payday: '2026-06-01' },
  { amount: 400, frequency: 'once', payday: '2026-08-14' },
  { amount: 250.5, frequency: 'once', payday: '2026-08-28' },
  { amount: 90, frequency: 'once', payday: '2026-10-20' },
];

it('counts a one-off pay as no schedule', () => {
  expect(scheduledPerMonth(pays)).toBe(3000);
  expect(scheduledPerMonth([{ amount: 1000, frequency: 'biweekly', payday: null }])).toBe(2166.67);
});

it('adds each month its own one-off pays, and only those', () => {
  expect(incomeForMonth(pays, '2026-07-15')).toBe(3000);
  expect(incomeForMonth(pays, '2026-08-01')).toBe(3650.5);
  expect(incomeForMonth(pays, '2026-08-31')).toBe(3650.5);
  expect(incomeForMonth(pays, '2026-09-30')).toBe(3000);
  expect(incomeForMonth(pays, '2026-10-08')).toBe(3090);
});

it('finds the one-off pays of a month, never a schedule, never an undated pay', () => {
  expect(oneOffsInMonth(pays, '2026-08-10').map((pay) => pay.amount)).toEqual([400, 250.5]);
  expect(oneOffsInMonth([{ amount: 5, frequency: 'once', payday: null }], '2026-08-10')).toEqual(
    [],
  );
  expect(
    oneOffsInMonth([{ amount: 5, frequency: 'monthly', payday: '2026-08-01' }], '2026-08-10'),
  ).toEqual([]);
});

it('earns only one-off pays when there is no schedule', () => {
  expect(
    incomeForMonth([{ amount: 120, frequency: 'once', payday: '2026-10-01' }], '2026-10-08'),
  ).toBe(120);
  expect(incomeForMonth([], '2026-10-08')).toBe(0);
});

it('rounds an exact half cent up, the same as the server', () => {
  expect(
    incomeForMonth(
      [
        { amount: 0.17, frequency: 'weekly', payday: '2026-06-05' },
        { amount: 5723.39, frequency: 'biweekly', payday: '2026-06-05' },
      ],
      '2026-08-01',
    ),
  ).toBe(12401.42);
  expect(
    incomeForMonth(
      [
        { amount: 2693.8, frequency: 'weekly', payday: '2026-06-05' },
        { amount: 2022.31, frequency: 'biweekly', payday: '2026-06-05' },
        { amount: 518.11, frequency: 'once', payday: '2026-08-03' },
        { amount: 514.1, frequency: 'once', payday: '2026-08-21' },
      ],
      '2026-08-01',
    ),
  ).toBe(17087.02);
});

describe('payProjectionStart', () => {
  it('starts at the last payday while nothing is on the record', () => {
    expect(payProjectionStart('2026-09-15', null)).toBe('2026-09-15');
  });

  it('starts the day after the last pay written down, so a raise never reprices it', () => {
    expect(payProjectionStart('2026-09-15', '2026-10-15')).toBe('2026-10-16');
  });

  it('keeps a later last payday, as a new job starting after the old pay does', () => {
    expect(payProjectionStart('2026-11-01', '2026-10-15')).toBe('2026-11-01');
  });

  it('is nothing for a salary that has never paid', () => {
    expect(payProjectionStart(null, '2026-10-15')).toBeNull();
  });
});

describe('unrecordedPaydays', () => {
  const twiceAMonth = { frequency: 'semimonthly' as const, lastPayday: '2026-09-15' };

  it('lists every payday due by today that is not written down, oldest first', () => {
    expect(unrecordedPaydays(twiceAMonth, null, '2019-10-20', '2026-10-20')).toEqual([
      '2026-09-15',
      '2026-09-30',
      '2026-10-15',
    ]);
  });

  it('starts after the last pay written down', () => {
    expect(unrecordedPaydays(twiceAMonth, '2026-09-30', '2019-10-20', '2026-10-20')).toEqual([
      '2026-10-15',
    ]);
  });

  it('records a pay just this time once, on its day', () => {
    const once = { frequency: 'once' as const, lastPayday: '2026-10-10' };
    expect(unrecordedPaydays(once, null, '2019-10-20', '2026-10-09')).toEqual([]);
    expect(unrecordedPaydays(once, null, '2019-10-20', '2026-10-10')).toEqual(['2026-10-10']);
    expect(unrecordedPaydays(once, '2026-10-10', '2019-10-20', '2026-12-31')).toEqual([]);
  });

  it('never reaches before the floor', () => {
    expect(
      unrecordedPaydays(
        { frequency: 'monthly', lastPayday: '2026-01-05' },
        null,
        '2026-08-01',
        '2026-10-20',
      ),
    ).toEqual(['2026-08-05', '2026-09-05', '2026-10-05']);
  });

  it('is nothing for a salary that has never paid', () => {
    expect(
      unrecordedPaydays(
        { frequency: 'monthly', lastPayday: null },
        null,
        '2019-10-20',
        '2026-10-20',
      ),
    ).toEqual([]);
  });
});

describe('landingAccount', () => {
  it('is the first linked account in the person’s own account order', () => {
    expect(landingAccount(['savings', 'checking'], ['checking', 'savings'])).toBe('checking');
  });

  it('skips an account the person no longer has', () => {
    expect(landingAccount(['gone', 'savings'], ['checking', 'savings'])).toBe('savings');
  });

  it('is no account when none is linked', () => {
    expect(landingAccount([], ['checking'])).toBeNull();
  });
});
