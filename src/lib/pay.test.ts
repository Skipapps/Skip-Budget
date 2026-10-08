import { incomeForMonth, oneOffsInMonth, scheduledPerMonth, type PayLine } from '@/lib/pay';

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
