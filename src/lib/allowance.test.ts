import {
  captureAllowance,
  capturesThisMonth,
  hidOlder,
  historyFloor,
  isWithinHistory,
  NOTHING_HIDDEN,
} from '@/lib/allowance';
import { FREE_LIMITS } from '@/lib/wall';

/** Local times, written out as the server sends them, so the tests hold in any timezone. */
const savedAt = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month, day, hour, minute).toISOString();

const today = new Date(2026, 9, 7); // 7 October 2026

const receipts = (source: string, count: number, at: string | null = savedAt(2026, 9, 3)) =>
  Array.from({ length: count }, () => ({ source, created_at: at }));

describe('the monthly allowances', () => {
  it('are 15 scans and 15 uploads, counted apart', () => {
    expect(FREE_LIMITS.scansPerMonth).toBe(15);
    expect(FREE_LIMITS.uploadsPerMonth).toBe(15);
  });

  it('count only receipts read that way', () => {
    const rows = [
      ...receipts('scan', 4),
      ...receipts('upload', 2),
      ...receipts('manual', 9),
      ...receipts('voice', 3),
    ];
    expect(capturesThisMonth(rows, 'scan', today)).toBe(4);
    expect(capturesThisMonth(rows, 'upload', today)).toBe(2);
  });

  it('count by the month a receipt was saved, from the first minute to the last', () => {
    const rows = [
      { source: 'scan', created_at: savedAt(2026, 9, 1, 0, 0) },
      { source: 'scan', created_at: savedAt(2026, 9, 31, 23, 59) },
      { source: 'scan', created_at: savedAt(2026, 8, 30, 23, 59) }, // last month
      { source: 'scan', created_at: savedAt(2025, 9, 7) }, // October a year ago
    ];
    expect(capturesThisMonth(rows, 'scan', today)).toBe(2);
  });

  it('count a row not yet back from the server as saved now', () => {
    expect(capturesThisMonth(receipts('scan', 2, null), 'scan', today)).toBe(2);
  });

  it('start again on the 1st', () => {
    const rows = receipts('scan', 15, savedAt(2026, 9, 20));
    expect(captureAllowance(rows, 'scan', false, today).allowed).toBe(false);
    expect(captureAllowance(rows, 'scan', false, new Date(2026, 10, 1))).toEqual({
      limit: 15,
      used: 0,
      left: 15,
      allowed: true,
    });
  });
});

describe('captureAllowance', () => {
  it('lets free read up to 15 of each and no more', () => {
    expect(captureAllowance(receipts('scan', 14), 'scan', false, today)).toEqual({
      limit: 15,
      used: 14,
      left: 1,
      allowed: true,
    });
    expect(captureAllowance(receipts('scan', 15), 'scan', false, today)).toEqual({
      limit: 15,
      used: 15,
      left: 0,
      allowed: false,
    });
  });

  it('keeps scans and uploads apart: a full scan allowance leaves uploads open', () => {
    const rows = receipts('scan', 15);
    expect(captureAllowance(rows, 'scan', false, today).allowed).toBe(false);
    expect(captureAllowance(rows, 'upload', false, today)).toEqual({
      limit: 15,
      used: 0,
      left: 15,
      allowed: true,
    });
  });

  it('never goes below zero, even past the limit (receipts read while on Pro)', () => {
    expect(captureAllowance(receipts('upload', 40), 'upload', false, today)).toEqual({
      limit: 15,
      used: 40,
      left: 0,
      allowed: false,
    });
  });

  it('has no limit on Pro', () => {
    expect(captureAllowance(receipts('scan', 400), 'scan', true, today)).toEqual({
      limit: null,
      used: 400,
      left: null,
      allowed: true,
    });
  });
});

describe('historyFloor', () => {
  it('is the 90 days ending today on free', () => {
    expect(historyFloor(false, today)).toBe('2026-07-10');
    expect(historyFloor(false, new Date(2026, 2, 1))).toBe('2025-12-02');
  });

  it('is seven years back on Pro', () => {
    expect(historyFloor(true, today)).toBe('2019-10-07');
  });

  it('crosses a leap day without drifting', () => {
    expect(historyFloor(false, new Date(2028, 4, 28))).toBe('2028-02-29');
    expect(historyFloor(true, new Date(2027, 1, 28))).toBe('2020-02-28');
  });

  it('shows the floor day itself and everything after it', () => {
    const floor = historyFloor(false, today);
    expect(isWithinHistory('2026-07-10', floor)).toBe(true);
    expect(isWithinHistory('2026-07-09', floor)).toBe(false);
    expect(isWithinHistory('2026-10-07', floor)).toBe(true);
  });
});

describe('hidOlder', () => {
  const hidden = { receipts: true, plans: new Set(['bill-b1', 'subscription-s1']) };

  it('answers for everything, one kind, or one plan', () => {
    expect(hidOlder(hidden)).toBe(true);
    expect(hidOlder(hidden, 'receipt')).toBe(true);
    expect(hidOlder(hidden, 'bill')).toBe(true);
    expect(hidOlder(hidden, 'bill', 'b1')).toBe(true);
    expect(hidOlder(hidden, 'bill', 'b2')).toBe(false);
    expect(hidOlder(hidden, 'subscription', 's1')).toBe(true);
  });

  it('treats nothing hidden, or no answer at all, as nothing hidden', () => {
    expect(hidOlder(NOTHING_HIDDEN)).toBe(false);
    expect(hidOlder(NOTHING_HIDDEN, 'bill')).toBe(false);
    expect(hidOlder(undefined)).toBe(false);
    expect(hidOlder(undefined, 'receipt')).toBe(false);
  });

  it('counts older paydays as history left out', () => {
    const paydays = { receipts: false, plans: new Set<string>(), income: true };
    expect(hidOlder(paydays)).toBe(true);
    expect(hidOlder(paydays, 'receipt')).toBe(false);
    expect(hidOlder(paydays, 'bill')).toBe(false);
  });

  it('does not mistake one kind for another', () => {
    const billsOnly = { receipts: false, plans: new Set(['bill-b1']) };
    expect(hidOlder(billsOnly, 'subscription')).toBe(false);
    expect(hidOlder(billsOnly, 'receipt')).toBe(false);
  });
});
