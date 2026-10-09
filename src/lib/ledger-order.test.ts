import { newestFirst } from '@/lib/ledger-order';

const row = (id: string, date: string) => ({ id, date });

describe('newestFirst', () => {
  it('puts the latest day first', () => {
    const rows = [row('a', '2026-10-01'), row('b', '2026-10-03'), row('c', '2026-10-02')];
    expect(newestFirst(rows, new Map()).map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('within a day, puts the latest created first, as the receipts list does', () => {
    const rows = [
      row('receipt-early', '2026-10-07'),
      row('receipt-late', '2026-10-07'),
      row('receipt-noon', '2026-10-07'),
    ];
    const created = new Map([
      ['receipt-early', '2026-10-07T08:00:00+00:00'],
      ['receipt-late', '2026-10-07T19:30:00+00:00'],
      ['receipt-noon', '2026-10-07T12:00:00+00:00'],
    ]);
    expect(newestFirst(rows, created).map((r) => r.id)).toEqual([
      'receipt-late',
      'receipt-noon',
      'receipt-early',
    ]);
  });

  it('leads a day with the rows that know when they were made, then keeps the rest as given', () => {
    const rows = [
      row('bill-b@2026-10-07', '2026-10-07'),
      row('receipt-r', '2026-10-07'),
      row('payment-p', '2026-10-07'),
    ];
    const created = new Map([['receipt-r', '2026-10-07T10:00:00+00:00']]);
    expect(newestFirst(rows, created).map((r) => r.id)).toEqual([
      'receipt-r',
      'bill-b@2026-10-07',
      'payment-p',
    ]);
  });

  it('returns a new list and leaves the one it was given alone', () => {
    const rows = [row('a', '2026-10-01'), row('b', '2026-10-02')];
    const sorted = newestFirst(rows, new Map());
    expect(sorted).not.toBe(rows);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
  });
});
