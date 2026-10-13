import fs from 'node:fs';
import path from 'node:path';

import {
  activeAt,
  isScriptGrant,
  isUserId,
  planTransfer,
  runTransfer,
  userIdsIn,
  type EntitlementRow,
  type EntitlementStore,
} from '../../../supabase/functions/revenuecat-webhook/transfer';

/**
 * A subscription that moves to a second Skip account on the same Apple ID arrives as a TRANSFER,
 * which names accounts and nothing else. The receiving account must end up with the giver's paid-up
 * row, or its phone says Pro while every database check says no.
 */

const GIVER = '95810acb-0000-4000-8000-000000000001';
const RECEIVER = 'c2ad25b3-df47-406d-919c-dae33013a164';
const OTHER = 'bdb18bea-0000-4000-8000-000000000003';

const NOW = Date.parse('2026-10-13T04:20:00Z');
const EVENT = Date.parse('2026-10-13T04:19:00Z');

function row(overrides: Partial<EntitlementRow> & { user_id: string }): EntitlementRow {
  return {
    pro: true,
    product_id: 'skip_budget_pro_monthly',
    expires_at: '2026-11-13T04:00:00.000Z',
    environment: 'SANDBOX',
    will_renew: true,
    updated_at: '2026-10-13T04:13:22.000Z',
    ...overrides,
  };
}

const plan = (rows: EntitlementRow[], extra: Partial<Parameters<typeof planTransfer>[0]> = {}) =>
  planTransfer({
    from: [GIVER],
    to: [RECEIVER],
    rows,
    nowMs: NOW,
    eventMs: EVENT,
    environment: 'SANDBOX',
    ...extra,
  });

describe('the ids a TRANSFER names', () => {
  it("keeps Skip accounts, lower-cased, and counts RevenueCat's own ids as skipped", () => {
    // RevenueCat's sample event writes ids in capitals.
    expect(
      userIdsIn(['C2AD25B3-DF47-406D-919C-DAE33013A164', '$RCAnonymousID:8069238d6049ce87', 7]),
    ).toEqual({ ids: [RECEIVER], skipped: 2 });
    expect(userIdsIn(undefined)).toEqual({ ids: [], skipped: 0 });
    expect(userIdsIn([RECEIVER, RECEIVER.toUpperCase()])).toEqual({ ids: [RECEIVER], skipped: 0 });
  });

  it('accepts only the uuid shape', () => {
    expect(isUserId(RECEIVER)).toBe(true);
    expect(isUserId('------------------------------------')).toBe(false);
    expect(isUserId(`${RECEIVER}x`)).toBe(false);
  });
});

describe('planTransfer', () => {
  it("copies the giver's paid-up row to the receiver and switches the giver off", () => {
    const giver = row({ user_id: GIVER });
    const result = plan([giver]);

    expect(result.grant).toEqual([
      {
        user_id: RECEIVER,
        pro: true,
        product_id: 'skip_budget_pro_monthly',
        expires_at: '2026-11-13T04:00:00.000Z',
        environment: 'SANDBOX',
        will_renew: true,
        updated_at: new Date(NOW).toISOString(),
      },
    ]);
    expect(result.revoke).toEqual([GIVER]);
    expect(result.note).toBeNull();
  });

  it('copies the freshest of several giving rows: the latest end date wins', () => {
    const second = '95810acb-0000-4000-8000-000000000002';
    const result = plan(
      [
        row({ user_id: GIVER, expires_at: '2026-11-13T04:00:00.000Z' }),
        row({
          user_id: second,
          product_id: 'skip_budget_pro_yearly',
          expires_at: '2027-10-13T04:00:00.000Z',
        }),
      ],
      { from: [GIVER, second] },
    );
    expect(result.grant[0].product_id).toBe('skip_budget_pro_yearly');
    expect(result.revoke).toEqual([GIVER, second]);
  });

  it('copies nothing that has run out, and still switches the giver off', () => {
    const result = plan([row({ user_id: GIVER, expires_at: '2026-10-13T04:18:38.000Z' })]);
    expect(result.grant).toEqual([]);
    expect(result.revoke).toEqual([GIVER]);
    expect(result.note).toBe('the giving account has no paid-up row left');
  });

  it("never copies or switches off a script's test grant: it is not a purchase", () => {
    const grant = row({ user_id: GIVER, product_id: 'dev.pro-state-script', expires_at: null });
    expect(isScriptGrant(grant)).toBe(true);

    const result = plan([grant]);
    expect(result.grant).toEqual([]);
    expect(result.revoke).toEqual([]);
    expect(result.note).toBe('no purchase-written row on the giving account');
  });

  it('leaves a receiver whose own row already runs as long or longer', () => {
    const result = plan([
      row({ user_id: GIVER }),
      row({
        user_id: RECEIVER,
        product_id: 'skip_budget_pro_yearly',
        expires_at: '2027-01-01T00:00:00.000Z',
      }),
    ]);
    expect(result.grant).toEqual([]);
    expect(result.revoke).toEqual([GIVER]);
    expect(result.note).toBe(
      'every receiving account already runs as long or longer, or was written since',
    );
  });

  it('replaces a receiver row that has lapsed or runs out sooner', () => {
    const lapsed = plan([
      row({ user_id: GIVER }),
      row({ user_id: RECEIVER, expires_at: '2026-10-01T00:00:00.000Z' }),
    ]);
    expect(lapsed.grant.map((granted) => granted.user_id)).toEqual([RECEIVER]);

    const sooner = plan([
      row({ user_id: GIVER }),
      row({ user_id: RECEIVER, expires_at: '2026-10-20T00:00:00.000Z' }),
    ]);
    expect(sooner.grant[0].expires_at).toBe('2026-11-13T04:00:00.000Z');
  });

  it('does not switch off a giver whose row was written after the event (a later purchase)', () => {
    const result = plan([row({ user_id: GIVER, updated_at: '2026-10-13T04:19:30.000Z' })]);
    expect(result.grant.map((granted) => granted.user_id)).toEqual([RECEIVER]);
    expect(result.revoke).toEqual([]);
  });

  it('leaves a receiver whose row was written after the event: its own purchase, or this copy', () => {
    const result = plan([
      row({ user_id: GIVER }),
      row({
        user_id: RECEIVER,
        expires_at: '2026-10-01T00:00:00.000Z',
        updated_at: '2026-10-13T04:19:30.000Z',
      }),
    ]);
    expect(result.grant).toEqual([]);
    expect(result.revoke).toEqual([GIVER]);
  });

  it('switches off regardless of write time when the event has no timestamp', () => {
    const result = plan([row({ user_id: GIVER, updated_at: '2026-10-13T04:19:30.000Z' })], {
      eventMs: null,
    });
    expect(result.revoke).toEqual([GIVER]);
  });

  it('gives every receiving account the row, and never one that is also a giver', () => {
    const result = plan([row({ user_id: GIVER })], { to: [RECEIVER, OTHER, GIVER] });
    expect(result.grant.map((granted) => granted.user_id)).toEqual([RECEIVER, OTHER]);
  });

  it("falls back to the event's environment when the copied row has none", () => {
    const result = plan([row({ user_id: GIVER, environment: null })], {
      environment: 'PRODUCTION',
    });
    expect(result.grant[0].environment).toBe('PRODUCTION');
  });

  it('is idempotent: a retry after both writes landed changes nothing', () => {
    const first = plan([row({ user_id: GIVER })]);
    const after = [
      row({
        user_id: GIVER,
        pro: false,
        will_renew: false,
        updated_at: new Date(NOW).toISOString(),
      }),
      ...first.grant,
    ];
    const retry = plan(after);
    expect(retry.grant).toEqual([]);
    expect(retry.revoke).toEqual([]);
  });
});

/** The entitlements table in memory, honouring the switch-off's written-by filter as the database would. */
function memoryStore(initial: EntitlementRow[]) {
  const rows = new Map(initial.map((entry) => [entry.user_id, { ...entry }]));
  const writes: string[] = [];
  const switchOffs: { userIds: string[]; writtenBy: string | null }[] = [];
  const failWrite: Record<string, { message: string; code?: string }> = {};
  let failSwitchOff: { message: string } | null = null;
  /** Runs between the read and the switch-off, as a purchase landing meanwhile would. */
  let meanwhile: (() => void) | null = null;

  const store: EntitlementStore = {
    read: async (userIds) => {
      const found = userIds.flatMap((id) => (rows.has(id) ? [{ ...rows.get(id)! }] : []));
      meanwhile?.();
      return { data: found, error: null };
    },
    write: async (entry) => {
      const failure = failWrite[entry.user_id];
      if (failure) return { error: failure };
      writes.push(entry.user_id);
      rows.set(entry.user_id, { ...entry });
      return { error: null };
    },
    switchOff: async (userIds, writtenBy, nowIso) => {
      switchOffs.push({ userIds, writtenBy });
      if (failSwitchOff) return { error: failSwitchOff };
      for (const id of userIds) {
        const entry = rows.get(id);
        if (!entry || (writtenBy && Date.parse(entry.updated_at) > Date.parse(writtenBy))) continue;
        rows.set(id, { ...entry, pro: false, will_renew: false, updated_at: nowIso });
      }
      return { error: null };
    },
  };

  return {
    store,
    rows,
    writes,
    switchOffs,
    failWrite,
    failSwitchOffWith: (error: { message: string } | null) => (failSwitchOff = error),
    landMeanwhile: (run: () => void) => (meanwhile = run),
  };
}

const EVENT_BODY = {
  type: 'TRANSFER',
  event_timestamp_ms: EVENT,
  environment: 'SANDBOX',
  transferred_from: [GIVER],
  transferred_to: [RECEIVER],
};

const quiet = () => ({ log: jest.fn(), error: jest.fn() });

describe('runTransfer', () => {
  it('copies the row, then switches the giver off only where written before the event', async () => {
    const db = memoryStore([row({ user_id: GIVER })]);
    const result = await runTransfer(EVENT_BODY, db.store, quiet(), NOW);

    expect(result).toEqual({
      status: 200,
      body: { ok: true, type: 'TRANSFER', granted: 1, gone: 0, revoked: 1, note: null },
    });
    expect(db.rows.get(RECEIVER)?.pro).toBe(true);
    expect(db.rows.get(GIVER)?.pro).toBe(false);
    expect(db.switchOffs).toEqual([{ userIds: [GIVER], writtenBy: new Date(EVENT).toISOString() }]);
  });

  it('never switches off a purchase that lands between the read and the switch-off', async () => {
    const db = memoryStore([row({ user_id: GIVER })]);
    db.landMeanwhile(() =>
      db.rows.set(
        GIVER,
        row({ user_id: GIVER, updated_at: new Date(EVENT + 30_000).toISOString() }),
      ),
    );
    await runTransfer(EVENT_BODY, db.store, quiet(), NOW);
    expect(db.rows.get(GIVER)?.pro).toBe(true);
  });

  it('after a failed switch-off, the retry only repeats the switch-off', async () => {
    const db = memoryStore([row({ user_id: GIVER })]);
    db.failSwitchOffWith({ message: 'timeout' });
    expect((await runTransfer(EVENT_BODY, db.store, quiet(), NOW)).status).toBe(500);
    expect(db.writes).toEqual([RECEIVER]);

    db.failSwitchOffWith(null);
    const retry = await runTransfer(EVENT_BODY, db.store, quiet(), NOW + 60_000);
    expect(retry.status).toBe(200);
    expect(db.writes).toEqual([RECEIVER]);
    expect(db.rows.get(GIVER)?.pro).toBe(false);
    expect(db.rows.get(RECEIVER)?.pro).toBe(true);
  });

  it('passes over a receiving account deleted since, with a log line, and answers 200', async () => {
    const db = memoryStore([row({ user_id: GIVER })]);
    db.failWrite[RECEIVER] = { message: 'violates foreign key constraint', code: '23503' };
    const out = quiet();

    const result = await runTransfer(
      { ...EVENT_BODY, transferred_to: [RECEIVER, OTHER] },
      db.store,
      out,
      NOW,
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual(expect.objectContaining({ granted: 1, gone: 1, revoked: 1 }));
    expect(db.writes).toEqual([OTHER]);
    expect(out.log).toHaveBeenCalledWith(
      'TRANSFER: receiving account no longer exists, passed over',
      RECEIVER,
    );
  });

  it('answers 500, so RevenueCat tries again, for any other failed copy', async () => {
    const db = memoryStore([row({ user_id: GIVER })]);
    db.failWrite[RECEIVER] = { message: 'connection reset', code: '08006' };
    const result = await runTransfer(EVENT_BODY, db.store, quiet(), NOW);
    expect(result).toEqual({ status: 500, body: { error: 'connection reset' } });
    expect(db.switchOffs).toEqual([]);
  });

  it('switches off with no written-by limit when the event has no timestamp', async () => {
    const db = memoryStore([row({ user_id: GIVER })]);
    await runTransfer({ ...EVENT_BODY, event_timestamp_ms: undefined }, db.store, quiet(), NOW);
    expect(db.switchOffs).toEqual([{ userIds: [GIVER], writtenBy: null }]);
  });

  it('skips, with 200, when no Skip account gives or receives', async () => {
    const db = memoryStore([]);
    const result = await runTransfer(
      { ...EVENT_BODY, transferred_from: ['$RCAnonymousID:a'] },
      db.store,
      quiet(),
      NOW,
    );
    expect(result).toEqual({ status: 200, body: { skipped: true, type: 'TRANSFER' } });
  });

  it('is what the webhook runs, with the switch-off limited to rows written by the event', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../../supabase/functions/revenuecat-webhook/index.ts'),
      'utf8',
    );
    expect(source).toContain('runTransfer(event, store, console, Date.now())');
    expect(source).toContain("rows.lte('updated_at', writtenBy)");
  });
});

describe('activeAt', () => {
  it('is the test is_pro() makes', () => {
    expect(activeAt({ pro: true, expires_at: null }, NOW)).toBe(true);
    expect(activeAt({ pro: true, expires_at: new Date(NOW + 1).toISOString() }, NOW)).toBe(true);
    expect(activeAt({ pro: true, expires_at: new Date(NOW).toISOString() }, NOW)).toBe(false);
    expect(activeAt({ pro: false, expires_at: null }, NOW)).toBe(false);
  });
});
