import { receiptsFromStore, storeKey } from '@/lib/receipt-store';

const receipt = (merchant: string, purchased_on: string, id = merchant + purchased_on) => ({
  id,
  merchant,
  purchased_on,
});

describe('storeKey', () => {
  it('ignores case, edge spaces and runs of spaces', () => {
    expect(storeKey('  Trader   Joe’s ')).toBe(storeKey('trader joe’s'));
    expect(storeKey('Starbucks')).toBe('starbucks');
  });

  it('keeps different stores apart', () => {
    expect(storeKey('Target')).not.toBe(storeKey('Target Optical'));
  });
});

describe('receiptsFromStore', () => {
  const all = [
    receipt('Starbucks', '2026-09-20'),
    receipt('Target', '2026-10-02'),
    receipt(' starbucks ', '2026-10-01'),
    receipt('Starbucks', '2025-12-01'),
  ];

  it('collects every receipt from the same store, whatever its typing, newest first', () => {
    const found = receiptsFromStore(all, all[0]);
    expect(found.map((r) => r.purchased_on)).toEqual(['2026-10-01', '2026-09-20', '2025-12-01']);
  });

  it('includes the receipt it was asked about, and leaves the others out', () => {
    expect(receiptsFromStore(all, all[1])).toEqual([all[1]]);
  });

  it('does not reorder or change what it was given', () => {
    const before = all.map((r) => r.purchased_on);
    receiptsFromStore(all, all[0]);
    expect(all.map((r) => r.purchased_on)).toEqual(before);
  });

  it('keeps the order it came in for receipts on the same day', () => {
    const same = [receipt('A', '2026-10-01', 'one'), receipt('A', '2026-10-01', 'two')];
    expect(receiptsFromStore(same, same[0]).map((r) => r.id)).toEqual(['one', 'two']);
  });
});
