import {
  onPaymentPicked,
  pickPayment,
  type PickedFilter,
  type PickedRange,
} from '@/lib/payment-pick';

/**
 * The month, year and filter pages hand their choice back to the page that opened them, by that
 * page's id, and keep nothing.
 */

type Filters = {
  range: PickedRange;
  minCents: number | null;
  maxCents: number | null;
  source: string | null;
};

const NONE: Filters = { range: 'any', minCents: null, maxCents: null, source: null };

describe('handing a pick back', () => {
  it('reaches the page that opened the picker, as the type it listens for', () => {
    const heard = jest.fn();
    const stop = onPaymentPicked('history-1', 'year', (pick) => heard(pick.year));

    pickPayment({ owner: 'history-1', type: 'year', year: 2025 });

    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith(2025);
    stop();
  });

  it('never reaches another page, even one of the same kind', () => {
    const mine = jest.fn();
    const other = jest.fn();
    const stopMine = onPaymentPicked('bills-1', 'month', mine);
    const stopOther = onPaymentPicked('bills-2', 'month', other);

    pickPayment({ owner: 'bills-1', type: 'month', month: '2026-11' });

    expect(mine).toHaveBeenCalledWith({ owner: 'bills-1', type: 'month', month: '2026-11' });
    expect(other).not.toHaveBeenCalled();
    stopMine();
    stopOther();
  });

  it('ignores a pick of another type made for the same page', () => {
    const months = jest.fn();
    const years = jest.fn();
    const stopMonths = onPaymentPicked('page-1', 'month', months);
    const stopYears = onPaymentPicked('page-1', 'year', years);

    pickPayment({ owner: 'page-1', type: 'year', year: 2024 });

    expect(months).not.toHaveBeenCalled();
    expect(years).toHaveBeenCalledTimes(1);
    stopMonths();
    stopYears();
  });

  it('stops reaching a page once it stops listening', () => {
    const heard = jest.fn();
    const stop = onPaymentPicked('search-1', 'filters', heard);

    pickPayment({ owner: 'search-1', type: 'filters', filter: { source: '' } });
    stop();
    pickPayment({ owner: 'search-1', type: 'filters', filter: { source: 'card-1' } });

    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('keeps nothing for a page that starts listening later', () => {
    pickPayment({ owner: 'late-1', type: 'month', month: '2026-07' });

    const later = jest.fn();
    const stop = onPaymentPicked('late-1', 'month', later);
    expect(later).not.toHaveBeenCalled();
    stop();
  });

  it('goes nowhere, and throws nothing, when no page is listening', () => {
    expect(() => pickPayment({ owner: 'gone', type: 'year', year: 2026 })).not.toThrow();
  });
});

describe('a filter pick on top of the search’s filters', () => {
  /** What the search page does with a filter pick: the part replaces its own keys, whole. */
  function apply(current: Filters, owner: string, filter: PickedFilter): Filters {
    let next = current;
    const stop = onPaymentPicked(owner, 'filters', (pick) => {
      next = { ...next, ...pick.filter };
    });
    pickPayment({ owner, type: 'filters', filter });
    stop();
    return next;
  }

  it('sets the date range and leaves the amounts and the account alone', () => {
    const set = { ...NONE, minCents: 1000, source: 'card-1' };
    expect(apply(set, 's', { range: { from: '2026-01-01', to: '2026-03-31' } })).toEqual({
      range: { from: '2026-01-01', to: '2026-03-31' },
      minCents: 1000,
      maxCents: null,
      source: 'card-1',
    });
  });

  it('hands both amount bounds back, so clearing one cannot leave the other behind', () => {
    const set = { ...NONE, minCents: 1000, maxCents: 5000 };
    expect(apply(set, 's', { minCents: null, maxCents: 5000 })).toEqual({
      ...NONE,
      minCents: null,
      maxCents: 5000,
    });
    expect(apply(set, 's', { minCents: null, maxCents: null })).toEqual(NONE);
  });

  it('tells "Card not set" apart from every account', () => {
    expect(apply(NONE, 's', { source: '' }).source).toBe('');
    expect(apply({ ...NONE, source: '' }, 's', { source: null }).source).toBeNull();
  });
});
