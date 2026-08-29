import { moveBy, orderByIds } from '@/lib/order';

const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

describe('orderByIds', () => {
  it('ships in its own order when nothing is stored', () => {
    expect(orderByIds(items, null).map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(orderByIds(items, []).map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('follows the stored order', () => {
    expect(orderByIds(items, ['d', 'b', 'a', 'c']).map((i) => i.id)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('puts anything unmentioned behind, in its shipped position', () => {
    // A tile added in a later release, against an order saved before it.
    expect(orderByIds(items, ['c', 'a']).map((i) => i.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('skips an id the app no longer ships rather than leaving a gap', () => {
    expect(orderByIds(items, ['d', 'gone', 'a']).map((i) => i.id)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('never lets a repeated id duplicate an item', () => {
    const result = orderByIds(items, ['b', 'b', 'a']);
    expect(result.map((i) => i.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(result).toHaveLength(items.length);
  });

  it('keeps every item, whatever it is given', () => {
    for (const order of [null, [], ['d'], ['x', 'y'], ['c', 'c', 'b', 'a', 'd']]) {
      expect(orderByIds(items, order)).toHaveLength(items.length);
    }
  });
});

describe('moveBy', () => {
  it('moves an item one step', () => {
    expect(moveBy(items, 0, 1).map((i) => i.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(moveBy(items, 3, -1).map((i) => i.id)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('stays put at either end rather than wrapping', () => {
    expect(moveBy(items, 0, -1).map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(moveBy(items, 3, 1).map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('leaves the original alone', () => {
    const before = [...items];
    moveBy(items, 1, 1);
    expect(items).toEqual(before);
  });
});
