import { countsInSpending, lacksSpendingFlag, withSpendingFlag } from '@/lib/bill-spending';

/** The bodies PostgREST v14.5 sent on a database without 20261012100001 (scratch run, 2026-10-12). */
const NO_FLAG = { code: '42703', message: 'column bills.in_spending does not exist' };
const NO_LOGO = { code: '42703', message: 'column bills.logo_domain does not exist' };

describe('countsInSpending', () => {
  it('counts every bill unless it was saved out of spending', () => {
    expect(countsInSpending({ in_spending: true })).toBe(true);
    expect(countsInSpending({ in_spending: false })).toBe(false);
  });

  it('counts a row read before the column existed, as every bill did then', () => {
    expect(countsInSpending({})).toBe(true);
    expect(countsInSpending({ in_spending: undefined })).toBe(true);
    expect(countsInSpending({ in_spending: null })).toBe(true);
  });
});

describe('lacksSpendingFlag', () => {
  it('is the undefined-column refusal naming the flag, and nothing else', () => {
    expect(lacksSpendingFlag(NO_FLAG)).toBe(true);
    expect(lacksSpendingFlag({ code: '42703', message: 'x', details: 'in_spending' })).toBe(true);
    expect(lacksSpendingFlag(NO_LOGO)).toBe(false);
    expect(lacksSpendingFlag({ code: '08006', message: 'in_spending' })).toBe(false);
    expect(lacksSpendingFlag(null)).toBe(false);
  });
});

describe('withSpendingFlag', () => {
  it('reads once, with the flag, when the database has it', async () => {
    const read = jest.fn(async (flag: string) => ({ data: flag, error: null }));
    await expect(withSpendingFlag(read)).resolves.toEqual({ data: ', in_spending', error: null });
    expect(read.mock.calls).toEqual([[', in_spending']]);
  });

  it('reads again without it on a database that lacks the column', async () => {
    const read = jest.fn(async (flag: string) =>
      flag ? { data: null, error: NO_FLAG } : { data: 'rows', error: null },
    );
    await expect(withSpendingFlag(read)).resolves.toEqual({ data: 'rows', error: null });
    expect(read.mock.calls).toEqual([[', in_spending'], ['']]);
  });

  it('passes any other failure on as it came, without a second read', async () => {
    const read = jest.fn(async () => ({ data: null, error: NO_LOGO }));
    await expect(withSpendingFlag(read)).resolves.toEqual({ data: null, error: NO_LOGO });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('returns the second read as it came, failure included', async () => {
    const lost = { code: '08006', message: 'connection failure' };
    const read = jest.fn(async (flag: string) => ({ data: null, error: flag ? NO_FLAG : lost }));
    await expect(withSpendingFlag(read)).resolves.toEqual({ data: null, error: lost });
    expect(read).toHaveBeenCalledTimes(2);
  });
});
