// Skip · revenuecat-webhook · TRANSFER
//
// A TRANSFER moves an Apple ID's purchases from one RevenueCat app user to another: someone signs
// into a second Skip account on the same Apple ID and buys or restores. The event names only the
// accounts (`transferred_from`, `transferred_to`), never a product or an expiry, and RevenueCat
// sends it once, for the receiving account. The giving account's row already holds the product and
// the paid-up date, so that row is copied across and the giver's is switched off. Later renewals
// arrive under the receiver's own id and keep its row current.
// https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields#transfer-fields
//
// Plain TypeScript with no Deno or Node globals, so the app's Jest suite can test it directly;
// index.ts imports it as `./transfer.ts`.

export type EntitlementRow = {
  user_id: string;
  pro: boolean;
  product_id: string | null;
  expires_at: string | null;
  environment: string | null;
  will_renew: boolean | null;
  updated_at: string;
};

/** The columns planTransfer reads, in the order the select asks for them. */
export const ENTITLEMENT_COLUMNS =
  'user_id, pro, product_id, expires_at, environment, will_renew, updated_at';

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A Skip account id. RevenueCat's own ids ($RCAnonymousID:…) are not. */
export function isUserId(value: unknown): value is string {
  return typeof value === 'string' && USER_ID.test(value);
}

/**
 * The Skip accounts in one of the event's lists, lower-cased to match auth.users, and how many
 * entries were something else.
 */
export function userIdsIn(list: unknown): { ids: string[]; skipped: number } {
  const entries: unknown[] = Array.isArray(list) ? list : [];
  const accounts = entries.filter(isUserId);
  return {
    ids: [...new Set(accounts.map((id) => id.toLowerCase()))],
    skipped: entries.length - accounts.length,
  };
}

/**
 * Written by supabase/seed/pro-state-*.sql to put a test account in a state, never by Apple. Not a
 * purchase, so it cannot be transferred: copying one would hand out Pro with no end date, and
 * switching one off would undo the script.
 */
export function isScriptGrant(row: Pick<EntitlementRow, 'product_id'>): boolean {
  return (row.product_id ?? '').startsWith('dev.');
}

/** The same test is_pro() makes, at the given moment. */
export function activeAt(row: Pick<EntitlementRow, 'pro' | 'expires_at'>, nowMs: number): boolean {
  return row.pro && (row.expires_at === null || Date.parse(row.expires_at) > nowMs);
}

/** When the row stops counting, in ms; no end date sorts after every date. */
function endOf(row: Pick<EntitlementRow, 'expires_at'>): number {
  return row.expires_at === null ? Number.POSITIVE_INFINITY : Date.parse(row.expires_at);
}

export type TransferPlan = {
  /** Rows to upsert for the receiving accounts. */
  grant: EntitlementRow[];
  /** Giving accounts whose purchase-written rows are switched off. */
  revoke: string[];
  /** Why nothing was copied, when nothing was. */
  note: string | null;
};

/**
 * What a TRANSFER changes, worked out from the rows of every account it names.
 *
 * The giving row copied is the freshest one still paid up: the latest end date, then the latest
 * write. A receiver keeps its own row when that already runs as long or longer, or was written
 * after the event (its own purchase since, or this copy made by an earlier try). A giver's row is
 * switched off only if it was last written before the event, so a delayed retry cannot undo a
 * purchase the giver made since.
 */
export function planTransfer(input: {
  from: string[];
  to: string[];
  rows: EntitlementRow[];
  nowMs: number;
  /** event_timestamp_ms; retries reuse it. */
  eventMs: number | null;
  /** The event's own store environment, used when the copied row has none. */
  environment: string | null;
}): TransferPlan {
  const { from, to, rows, nowMs, eventMs, environment } = input;
  const nowIso = new Date(nowMs).toISOString();
  const giving = rows.filter((row) => from.includes(row.user_id) && !isScriptGrant(row));

  const source = giving
    .filter((row) => activeAt(row, nowMs))
    .sort((a, b) => endOf(b) - endOf(a) || Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];

  const grant: EntitlementRow[] = [];
  if (source) {
    for (const userId of to) {
      if (from.includes(userId)) continue;
      const own = rows.find((row) => row.user_id === userId);
      if (own && activeAt(own, nowMs) && endOf(own) >= endOf(source)) continue;
      if (own && eventMs !== null && Date.parse(own.updated_at) > eventMs) continue;
      grant.push({
        user_id: userId,
        pro: true,
        product_id: source.product_id,
        expires_at: source.expires_at,
        environment: source.environment ?? environment,
        will_renew: source.will_renew,
        updated_at: nowIso,
      });
    }
  }

  const revoke = giving
    .filter((row) => row.pro && (eventMs === null || Date.parse(row.updated_at) <= eventMs))
    .map((row) => row.user_id);

  let note: string | null = null;
  if (!source) {
    note =
      giving.length === 0
        ? 'no purchase-written row on the giving account'
        : 'the giving account has no paid-up row left';
  } else if (grant.length === 0) {
    note = 'every receiving account already runs as long or longer, or was written since';
  }

  return { grant, revoke, note };
}

type StoreError = { message: string; code?: string };

/** The entitlements table, as the TRANSFER steps use it. index.ts backs it with Supabase. */
export type EntitlementStore = {
  read(userIds: string[]): PromiseLike<{ data: EntitlementRow[] | null; error: StoreError | null }>;
  write(row: EntitlementRow): PromiseLike<{ error: StoreError | null }>;
  /** Switches the rows off, leaving any written after `writtenBy` when it is given. */
  switchOff(
    userIds: string[],
    writtenBy: string | null,
    nowIso: string,
  ): PromiseLike<{ error: StoreError | null }>;
};

export type TransferLog = {
  log: (...parts: unknown[]) => void;
  error: (...parts: unknown[]) => void;
};

/** Postgres foreign_key_violation: the account the row belongs to no longer exists. */
const ACCOUNT_GONE = '23503';

/**
 * Carries out a TRANSFER and says what to answer RevenueCat. A 500 makes RevenueCat try again, so it
 * is kept for failures a retry can fix; a receiving account deleted since is logged and passed over.
 */
export async function runTransfer(
  event: Record<string, unknown>,
  store: EntitlementStore,
  out: TransferLog,
  nowMs: number,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const from = userIdsIn(event.transferred_from);
  const to = userIdsIn(event.transferred_to);
  const skipped = from.skipped + to.skipped;
  if (skipped > 0) out.log('TRANSFER: skipping non-uuid ids', skipped);

  if (to.ids.length === 0 || from.ids.length === 0) {
    out.log('TRANSFER: nothing to move', { from: from.ids, to: to.ids });
    return { status: 200, body: { skipped: true, type: 'TRANSFER' } };
  }

  const { data, error: readError } = await store.read([...from.ids, ...to.ids]);
  if (readError) {
    out.error('TRANSFER: entitlement read failed', readError.message);
    return { status: 500, body: { error: readError.message } };
  }

  const eventMs = Number(event.event_timestamp_ms ?? 0) || null;
  const plan = planTransfer({
    from: from.ids,
    to: to.ids,
    rows: data ?? [],
    nowMs,
    eventMs,
    environment: String(event.environment ?? '') || null,
  });

  // Receivers first: if switching the giver off then fails, a retry finds the receivers written
  // since the event, so it only repeats the switch-off.
  const granted: string[] = [];
  const gone: string[] = [];
  for (const row of plan.grant) {
    const { error } = await store.write(row);
    if (!error) {
      granted.push(row.user_id);
    } else if (error.code === ACCOUNT_GONE) {
      out.log('TRANSFER: receiving account no longer exists, passed over', row.user_id);
      gone.push(row.user_id);
    } else {
      out.error('TRANSFER: entitlement copy failed', error.message);
      return { status: 500, body: { error: error.message } };
    }
  }

  if (plan.revoke.length > 0) {
    const writtenBy = eventMs === null ? null : new Date(eventMs).toISOString();
    const { error } = await store.switchOff(plan.revoke, writtenBy, new Date(nowMs).toISOString());
    if (error) {
      out.error('TRANSFER: switching off the giving account failed', error.message);
      return { status: 500, body: { error: error.message } };
    }
  }

  out.log('TRANSFER', {
    from: from.ids,
    to: to.ids,
    granted,
    gone,
    revoked: plan.revoke,
    note: plan.note,
  });
  return {
    status: 200,
    body: {
      ok: true,
      type: 'TRANSFER',
      granted: granted.length,
      gone: gone.length,
      revoked: plan.revoke.length,
      note: plan.note,
    },
  };
}
