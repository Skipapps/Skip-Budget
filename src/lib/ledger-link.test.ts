import { chargeOwners, ledgerHref } from '@/lib/ledger-link';

/**
 * The ids here are written out by hand on purpose. They are the exact strings
 * `useLedger` builds — `receipt-<id>`, `<plan>-<id>@<date>`, `charge-<id>`,
 * `income-<id>@<date>` — so if one of those formats ever moves, this fails
 * rather than the rows quietly going dead again.
 */

describe('ledgerHref', () => {
  it('opens a receipt on its own record', () => {
    expect(ledgerHref({ id: 'receipt-r1', kind: 'receipt' })).toEqual({
      pathname: '/add-receipt',
      params: { id: 'r1' },
    });
  });

  it('opens a projected bill on the plan that projected it, not the date', () => {
    expect(ledgerHref({ id: 'bill-b1@2026-09-12', kind: 'bill' })).toEqual({
      pathname: '/add-bill',
      params: { id: 'b1' },
    });
  });

  it('opens a projected subscription on its plan', () => {
    expect(ledgerHref({ id: 'subscription-s1@2026-10-01', kind: 'subscription' })).toEqual({
      pathname: '/add-subscription',
      params: { id: 's1' },
    });
  });

  it('sends every payday to the salary screen, which takes no id', () => {
    expect(ledgerHref({ id: 'income-p1@2026-09-11', kind: 'income' })).toBe('/salary');
  });

  it('finds the plan behind a charge that was written down at the time', () => {
    const owners = chargeOwners([
      { id: 'c1', bill_id: 'b9', subscription_id: null },
      { id: 'c2', bill_id: null, subscription_id: 's9' },
    ]);

    expect(ledgerHref({ id: 'charge-c1', kind: 'bill' }, owners)).toEqual({
      pathname: '/add-bill',
      params: { id: 'b9' },
    });
    expect(ledgerHref({ id: 'charge-c2', kind: 'subscription' }, owners)).toEqual({
      pathname: '/add-subscription',
      params: { id: 's9' },
    });
  });

  it('opens nothing rather than guessing when the charge is not in hand', () => {
    // Charges still loading, or a row written by another device this session.
    expect(ledgerHref({ id: 'charge-c1', kind: 'bill' })).toBeNull();
    expect(ledgerHref({ id: 'charge-c1', kind: 'bill' }, new Map())).toBeNull();
  });

  it('keeps a record id that contains an @ whole', () => {
    // Ids are uuids today, but the date is the suffix and the split has to be
    // the last `@` for that to stay true of anything else.
    expect(ledgerHref({ id: 'bill-a@b@2026-09-12', kind: 'bill' })).toEqual({
      pathname: '/add-bill',
      params: { id: 'a@b' },
    });
  });

  it('opens nothing on an id of a shape it does not know', () => {
    expect(ledgerHref({ id: 'mystery-1', kind: 'bill' })).toBeNull();
    expect(ledgerHref({ id: 'receipt-', kind: 'receipt' })).toBeNull();
  });
});

describe('chargeOwners', () => {
  it('keys charges the way the ledger names them and drops orphans', () => {
    const owners = chargeOwners([
      { id: 'c1', bill_id: 'b1', subscription_id: null },
      { id: 'c2', bill_id: null, subscription_id: null },
    ]);

    expect(owners.get('charge-c1')).toBe('b1');
    expect(owners.has('charge-c2')).toBe(false);
  });
});
