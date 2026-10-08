// The scheduled tick, every quarter of an hour. The order matters:
//
//   1. records the charges that have come due
//   2. rolls the schedules that have gone past
//   3. sends what is owed: charge notices, due reminders, shared-group notices, the receipts nudge
//
// Posts to Apple directly (no relay). Two APNs behaviours fail quietly:
//
//   The token is environment-bound. A development-signed build (anything installed over a cable)
//   is only known to the sandbox host and production answers BadDeviceToken, so a rejection is
//   retried against the other host and the correction written back.
//
//   The JWT is reusable and rate-limited. Apple accepts one for an hour and refuses a client that
//   mints one per request, so it is made once per invocation.
//
// Secrets: APNS_KEY (the .p8 contents), APNS_KEY_ID, APNS_TEAM_ID.
// Optional: LOGO_CDN_URL (e.g. https://logos.skipapps.net/logos, no trailing slash) loads thumbnails
// from the logo service by domain; unset, they come from the brand-logos bucket as before.
// Deploy:  npx supabase functions deploy send-push --no-verify-jwt
//
// No JWT, because pg_cron has no session to present: it proves itself with a secret the database
// generated (job_secrets, checked below).

import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  billGlyph,
  chargePayload,
  digestPayload,
  money,
  noticePayload,
  receiptsPayload,
  reminderPayload,
  type LogoSource,
  type SourceRow,
  type TapPayload,
} from './card.ts';

const BUNDLE_ID = 'com.skipapps.skip.budget';

// Every Skip notification carries this category: it tells iOS to run the content extension
// (targets/notification-content) on press-and-hold and names the action buttons registered in
// src/api/push.ts.
const CATEGORY = 'skip.item';

const HOSTS = {
  development: 'https://api.sandbox.push.apple.com',
  production: 'https://api.push.apple.com',
} as const;

type Environment = keyof typeof HOSTS;

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** The .p8 Apple hands out is PKCS#8 PEM; Web Crypto wants the raw DER. */
function pemToDer(pem: string): Uint8Array {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const binary = atob(body);
  const der = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) der[i] = binary.charCodeAt(i);
  return der;
}

/** An ES256 provider token. Web Crypto signs as raw r‖s, which is what JWS wants. */
async function providerToken(): Promise<string> {
  const keyPem = Deno.env.get('APNS_KEY') ?? '';
  const keyId = Deno.env.get('APNS_KEY_ID') ?? '';
  const teamId = Deno.env.get('APNS_TEAM_ID') ?? '';
  if (!keyPem || !keyId || !teamId) throw new Error('APNs credentials are not set');

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(keyPem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const encoder = new TextEncoder();
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'ES256', kid: keyId })));
  const claims = base64url(
    encoder.encode(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) })),
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(`${header}.${claims}`),
  );

  return `${header}.${claims}.${base64url(new Uint8Array(signature))}`;
}

type SendResult = { ok: boolean; reason?: string; environment?: Environment };

/*
 * Where a tap lands and the card to draw (see ./card.ts) are sent as a top-level `body` object
 * beside `aps`. That looks like a mistake but is not: expo-notifications reads a remote
 * notification's `content.data` from `userInfo["body"]` and nowhere else; any other custom key is
 * dropped by the client (expo-notifications@57.0.13,
 * ios/ExpoNotifications/Notifications/NotificationRecords.swift:328-334).
 *
 * A payload with a card also sets `mutable-content`, which wakes the service extension
 * (targets/notification-service) to attach the logo. Without the extension (older build) the flag
 * is ignored and the notification arrives as plain text.
 */

async function pushOnce(
  token: string,
  environment: Environment,
  jwt: string,
  title: string,
  body: string,
  data?: TapPayload,
): Promise<SendResult> {
  const response = await fetch(`${HOSTS[environment]}/3/device/${token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': BUNDLE_ID,
      'apns-push-type': 'alert',
      // 10 is "deliver now": a reminder an hour late is no reminder.
      'apns-priority': '10',
    },
    body: JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default',
        badge: 1,
        ...(data?.card ? { 'mutable-content': 1, category: CATEGORY } : {}),
      },
      ...(data ? { body: data } : {}),
    }),
  });

  if (response.ok) return { ok: true, environment };

  const text = await response.text();
  let reason = text;
  try {
    reason = JSON.parse(text).reason ?? text;
  } catch {
    // Apple occasionally answers with a bare string; keep it as-is.
  }
  return { ok: false, reason };
}

/** Sends, and corrects the stored environment if the other host is the right one. */
async function push(
  supabase: ReturnType<typeof createClient>,
  tokenRow: { id: string; token: string; environment: Environment },
  jwt: string,
  title: string,
  body: string,
  data?: TapPayload,
): Promise<boolean> {
  const first = await pushOnce(tokenRow.token, tokenRow.environment, jwt, title, body, data);
  if (first.ok) return true;

  // The app cannot always tell which Apple environment its build is in: learn from the rejection.
  if (first.reason === 'BadDeviceToken') {
    const other: Environment =
      tokenRow.environment === 'development' ? 'production' : 'development';
    const retry = await pushOnce(tokenRow.token, other, jwt, title, body, data);

    if (retry.ok) {
      await supabase.from('device_tokens').update({ environment: other }).eq('id', tokenRow.id);
      return true;
    }
  }

  // Uninstalled or replaced token: keeping it means failing on it forever.
  if (first.reason === 'Unregistered' || first.reason === 'BadDeviceToken') {
    await supabase.from('device_tokens').delete().eq('id', tokenRow.id);
  }

  console.error('apns refused', tokenRow.id, first.reason);
  return false;
}

type TokenRow = { id: string; token: string; environment: Environment };

async function tokensFor(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<TokenRow[]> {
  const { data } = await supabase
    .from('device_tokens')
    .select('id, token, environment')
    .eq('user_id', userId);
  return (data ?? []) as TokenRow[];
}

type Charge = { user_id: string; label: string; amount: number; charged_on: string };

type Context = {
  reminders: Map<
    string,
    {
      bill_id: string | null;
      subscription_id: string | null;
      card_id: string | null;
      bank_account_id: string | null;
    }
  >;
  bills: Map<
    string,
    {
      category_id: string | null;
      icon_id: string | null;
      card_id: string | null;
      bank_account_id: string | null;
      logo: LogoSource;
    }
  >;
  subscriptions: Map<
    string,
    {
      category_id: string | null;
      card_id: string | null;
      bank_account_id: string | null;
      logo: LogoSource;
    }
  >;
  sources: Map<string, SourceRow>;
  /** Accounts with Skip Pro right now: only they get logos (is_pro()'s rule). */
  pro: Set<string>;
  /** user|label|charged_on → the plan and payer behind a recorded charge. */
  charges: Map<
    string,
    {
      bill_id: string | null;
      subscription_id: string | null;
      card_id: string | null;
      bank_account_id: string | null;
    }
  >;
};

// With no context nobody is known to pay, so a failed read sends letters and icons, never a logo
// a free account would not see in the app.
const EMPTY: Context = {
  reminders: new Map(),
  bills: new Map(),
  subscriptions: new Map(),
  sources: new Map(),
  pro: new Set(),
  charges: new Map(),
};

const chargeKey = (userId: string, label: string, chargedOn: string) =>
  `${userId}|${label}|${chargedOn}`;

type LogoColumns = {
  logo_domain?: string | null;
  logo_hidden?: boolean | null;
  brands: unknown;
};

/** A to-one embed arrives as an object, or as a one-row array from some joins. */
function logoOf(row: LogoColumns): LogoSource {
  const brand = (Array.isArray(row.brands) ? row.brands[0] : row.brands) as {
    domain?: string | null;
    logo_path?: string | null;
  } | null;
  return {
    logoDomain: row.logo_domain ?? null,
    logoHidden: row.logo_hidden ?? false,
    brandDomain: brand?.domain ?? null,
    logoPath: brand?.logo_path ?? null,
  };
}

const LOGO_COLUMNS = 'logo_domain, logo_hidden, ';

/**
 * Reads plans with the per-row logo columns, or without them (42703, undefined column) on a
 * database not yet migrated: the function may well be deployed first, and a missing column would
 * otherwise empty the whole context and strip every card from the run.
 */
async function withLogoColumns<R extends { error: { code?: string } | null }>(
  read: (logoColumns: string) => PromiseLike<R>,
): Promise<R> {
  const result = await read(LOGO_COLUMNS);
  return result.error?.code === '42703' ? read('') : result;
}

/**
 * What each notification is about, for its card: the bill or subscription behind it, its logo and
 * category, and who pays.
 *
 * Best effort: every notification can go out as plain text, so a failed read is logged and the run
 * carries on with an empty context rather than holding back a reminder for a picture.
 */
async function loadContext(
  supabase: ReturnType<typeof createClient>,
  reminderIds: string[],
  charges: Charge[],
  userIds: string[],
): Promise<Context> {
  try {
    const ctx: Context = {
      reminders: new Map(),
      bills: new Map(),
      subscriptions: new Map(),
      sources: new Map(),
      pro: new Set(),
      charges: new Map(),
    };

    if (userIds.length > 0) {
      const { data, error } = await supabase
        .from('entitlements')
        .select('user_id, pro, expires_at')
        .in('user_id', userIds);
      if (error) throw error;
      const now = Date.now();
      for (const row of (data ?? []) as {
        user_id: string;
        pro: boolean;
        expires_at: string | null;
      }[]) {
        if (row.pro && (!row.expires_at || new Date(row.expires_at).getTime() > now)) {
          ctx.pro.add(row.user_id);
        }
      }
    }

    if (reminderIds.length > 0) {
      const { data, error } = await supabase
        .from('reminders')
        .select('id, bill_id, subscription_id, card_id, bank_account_id')
        .in('id', reminderIds);
      if (error) throw error;
      for (const row of (data ?? []) as { id: string }[]) ctx.reminders.set(row.id, row as never);
    }

    if (charges.length > 0) {
      const { data, error } = await supabase
        .from('charges')
        .select('user_id, label, charged_on, bill_id, subscription_id, card_id, bank_account_id')
        .in('user_id', [...new Set(charges.map((c) => c.user_id))])
        .in('charged_on', [...new Set(charges.map((c) => c.charged_on))]);
      if (error) throw error;
      for (const row of (data ?? []) as { user_id: string; label: string; charged_on: string }[]) {
        ctx.charges.set(chargeKey(row.user_id, row.label, row.charged_on), row as never);
      }
    }

    const plans = [...ctx.reminders.values(), ...ctx.charges.values()];
    const billIds = [...new Set(plans.map((p) => p.bill_id).filter(Boolean))] as string[];
    const subscriptionIds = [
      ...new Set(plans.map((p) => p.subscription_id).filter(Boolean)),
    ] as string[];

    if (billIds.length > 0) {
      const { data, error } = await withLogoColumns((logo) =>
        supabase
          .from('bills')
          .select(
            `id, category_id, icon_id, card_id, bank_account_id, ${logo}brands(domain, logo_path)`,
          )
          .in('id', billIds),
      );
      if (error) throw error;
      type BillRow = LogoColumns & {
        id: string;
        category_id: string | null;
        icon_id: string | null;
        card_id: string | null;
        bank_account_id: string | null;
      };
      for (const row of (data ?? []) as unknown as BillRow[]) {
        ctx.bills.set(row.id, {
          category_id: row.category_id,
          icon_id: row.icon_id,
          card_id: row.card_id,
          bank_account_id: row.bank_account_id,
          logo: logoOf(row),
        });
      }
    }

    if (subscriptionIds.length > 0) {
      const { data, error } = await withLogoColumns((logo) =>
        supabase
          .from('subscriptions')
          .select(`id, category_id, card_id, bank_account_id, ${logo}brands(domain, logo_path)`)
          .in('id', subscriptionIds),
      );
      if (error) throw error;
      type SubscriptionRow = LogoColumns & {
        id: string;
        category_id: string | null;
        card_id: string | null;
        bank_account_id: string | null;
      };
      for (const row of (data ?? []) as unknown as SubscriptionRow[]) {
        ctx.subscriptions.set(row.id, {
          category_id: row.category_id,
          card_id: row.card_id,
          bank_account_id: row.bank_account_id,
          logo: logoOf(row),
        });
      }
    }

    const payers = [...plans, ...ctx.bills.values(), ...ctx.subscriptions.values()];
    const cardIds = [...new Set(payers.map((p) => p.card_id).filter(Boolean))] as string[];
    const accountIds = [
      ...new Set(payers.map((p) => p.bank_account_id).filter(Boolean)),
    ] as string[];

    if (cardIds.length > 0) {
      const { data, error } = await supabase
        .from('cards')
        .select('id, network, last4')
        .in('id', cardIds);
      if (error) throw error;
      for (const row of (data ?? []) as { id: string; network: string; last4: string | null }[]) {
        ctx.sources.set(row.id, { kind: 'card', network: row.network, last4: row.last4 });
      }
    }

    if (accountIds.length > 0) {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, bank_name, nickname, last4')
        .in('id', accountIds);
      if (error) throw error;
      for (const row of (data ?? []) as {
        id: string;
        bank_name: string;
        nickname: string | null;
        last4: string | null;
      }[]) {
        ctx.sources.set(row.id, {
          kind: 'account',
          bank_name: row.bank_name,
          nickname: row.nickname,
          last4: row.last4,
        });
      }
    }

    return ctx;
  } catch (error) {
    console.error('notification context failed', (error as Error)?.message ?? error);
    return EMPTY;
  }
}

/** The card for one reminder; undefined when it is not known what it is about. */
function reminderData(
  ctx: Context,
  supabaseUrl: string,
  logoCdnUrl: string,
  row: { reminder_id: string; user_id: string; title: string; body: string },
): TapPayload | undefined {
  const target = ctx.reminders.get(row.reminder_id);
  if (!target) return undefined;
  const pro = ctx.pro.has(row.user_id);
  const payerOf = (plan?: { card_id: string | null; bank_account_id: string | null }) =>
    plan ? ctx.sources.get(plan.card_id ?? plan.bank_account_id ?? '') : undefined;

  if (target.subscription_id) {
    const plan = ctx.subscriptions.get(target.subscription_id);
    return reminderPayload(
      {
        kind: 'subscription',
        title: row.title,
        body: row.body,
        pro,
        targetId: target.subscription_id,
        ...plan?.logo,
        categoryId: plan?.category_id,
        payer: payerOf(plan),
      },
      supabaseUrl,
      logoCdnUrl,
    );
  }
  if (target.bill_id) {
    const plan = ctx.bills.get(target.bill_id);
    return reminderPayload(
      {
        kind: 'bill',
        title: row.title,
        body: row.body,
        pro,
        targetId: target.bill_id,
        ...plan?.logo,
        categoryId: plan?.category_id,
        iconId: plan?.icon_id,
        payer: payerOf(plan),
      },
      supabaseUrl,
      logoCdnUrl,
    );
  }
  if (target.card_id) {
    return reminderPayload(
      {
        kind: 'card',
        title: row.title,
        body: row.body,
        pro,
        targetId: target.card_id,
        self: ctx.sources.get(target.card_id),
      },
      supabaseUrl,
    );
  }
  if (target.bank_account_id) {
    return reminderPayload(
      {
        kind: 'account',
        title: row.title,
        body: row.body,
        pro,
        targetId: target.bank_account_id,
        self: ctx.sources.get(target.bank_account_id),
      },
      supabaseUrl,
    );
  }
  return undefined;
}

/** The card for one recorded charge. */
function chargeData(
  ctx: Context,
  supabaseUrl: string,
  logoCdnUrl: string,
  charge: Charge,
): TapPayload {
  const found = ctx.charges.get(chargeKey(charge.user_id, charge.label, charge.charged_on));
  const bill = found?.bill_id ? ctx.bills.get(found.bill_id) : undefined;
  const subscription = found?.subscription_id
    ? ctx.subscriptions.get(found.subscription_id)
    : undefined;
  return chargePayload(
    {
      pro: ctx.pro.has(charge.user_id),
      label: charge.label,
      amount: Number(charge.amount),
      chargedOn: charge.charged_on,
      billId: found?.bill_id,
      subscriptionId: found?.subscription_id,
      ...(subscription ?? bill)?.logo,
      glyph: subscription
        ? subscription.category_id
        : bill
          ? billGlyph(bill.category_id, bill.icon_id)
          : undefined,
      payer: found ? ctx.sources.get(found.card_id ?? found.bank_account_id ?? '') : undefined,
    },
    supabaseUrl,
    logoCdnUrl,
  );
}

Deno.serve(async (request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    // The service role, because this runs for every user and belongs to none.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // The caller proves it is the scheduled job by quoting a secret the database minted for itself.
  // job_secrets has RLS on and no policies, so only the service role can read it and the value
  // never appears in a migration, in git, or in this file.
  const { data: secret } = await supabase
    .from('job_secrets')
    .select('value')
    .eq('name', 'cron_push')
    .maybeSingle();

  const offered = request.headers.get('X-Cron-Secret');
  if (!secret?.value || offered !== secret.value) {
    return new Response(JSON.stringify({ error: 'Not for you.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Charges are recorded here rather than on the phone, which is what makes a "this went out"
  // notice possible. Only rows genuinely inserted come back (the unique indexes refuse a day the
  // phone already wrote), so nothing is announced twice.
  const { data: recorded, error: recordError } = await supabase.rpc('record_due_charges');
  if (recordError) console.error('record_due_charges failed', recordError.message);

  // Strictly after recording: the stored anchor is what occurrences are walked from, so moving it
  // first would step over the date just written.
  const { error: rollError } = await supabase.rpc('roll_schedules_forward');
  if (rollError) console.error('roll_schedules_forward failed', rollError.message);

  const charges = (recorded ?? []) as Charge[];

  const { data: due, error } = await supabase.rpc('reminders_due');
  if (error) {
    console.error('reminders_due failed', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const rows = (due ?? []) as {
    reminder_id: string;
    user_id: string;
    local_date: string;
    title: string;
    body: string;
  }[];

  // Shared-group notices are queued by triggers rather than pushed from them, so a slow Apple never
  // sits inside the transaction that added the expense.
  const { data: noticeRows, error: noticeError } = await supabase.rpc('split_notices_due');
  if (noticeError) console.error('split_notices_due failed', noticeError.message);

  const notices = (noticeRows ?? []) as {
    notice_id: string;
    user_id: string;
    title: string;
    body: string;
  }[];

  // The daily receipts nudge is decided per account, not per reminder row, hence its own RPC and
  // stamp. Logged and skipped rather than fatal, unlike reminders_due: this can reach a database
  // where receipt_reminders_due() is not migrated yet (Postgres 42883), and that must not take the
  // bill reminders down.
  const { data: receiptRows, error: receiptError } = await supabase.rpc('receipt_reminders_due');
  if (receiptError) console.error('receipt_reminders_due failed', receiptError.message);

  const receipts = (receiptRows ?? []) as {
    user_id: string;
    local_date: string;
    title: string;
    body: string;
  }[];

  if (rows.length === 0 && charges.length === 0 && notices.length === 0 && receipts.length === 0) {
    return new Response(
      JSON.stringify({ recorded: 0, due: 0, sent: 0, notices: 0, receipts: 0, receiptsSent: 0 }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const jwt = await providerToken();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const logoCdnUrl = Deno.env.get('LOGO_CDN_URL') ?? '';
  const ctx = await loadContext(
    supabase,
    rows.map((row) => row.reminder_id),
    charges,
    [...new Set([...rows.map((row) => row.user_id), ...charges.map((c) => c.user_id)])],
  );
  let sent = 0;
  let announced = 0;

  const byUser = new Map<string, typeof charges>();
  for (const charge of charges) {
    byUser.set(charge.user_id, [...(byUser.get(charge.user_id) ?? []), charge]);
  }

  for (const [chargeUser, theirs] of byUser) {
    const tokens = await tokensFor(supabase, chargeUser);
    if (tokens.length === 0) continue;

    // Past a handful of charges (a first run catching up on a backlog) they collapse into one
    // digest rather than a wall of notifications.
    const total = theirs.reduce((sum, c) => sum + Math.abs(Number(c.amount)), 0);
    const title = theirs.length > 3 ? 'Payments went out' : theirs[0].label;
    const body =
      theirs.length > 3
        ? `${theirs.length} charges · ${money(total)}`
        : theirs.map((c) => `${money(Number(c.amount))} went out`).join(' · ');
    // One card per notification: when 2-3 charges share it, the card shows the first and the body
    // lists them all.
    const data =
      theirs.length > 3
        ? digestPayload(theirs.length, total)
        : chargeData(ctx, supabaseUrl, logoCdnUrl, theirs[0]);

    for (const tokenRow of tokens) {
      if (await push(supabase, tokenRow, jwt, title, body, data)) announced += 1;
    }
  }

  for (const row of rows) {
    let delivered = false;
    const data = reminderData(ctx, supabaseUrl, logoCdnUrl, row);
    for (const tokenRow of await tokensFor(supabase, row.user_id)) {
      if (await push(supabase, tokenRow, jwt, row.title, row.body, data)) delivered = true;
    }

    // Stamped only on a delivery: a reminder nobody could be sent stays due and is retried.
    if (delivered) {
      await supabase
        .from('reminders')
        .update({ last_sent_on: row.local_date })
        .eq('id', row.reminder_id);
      sent += 1;
    }
  }

  let shared = 0;
  for (const notice of notices) {
    let delivered = false;
    const data = noticePayload(notice.title, notice.body);
    for (const tokenRow of await tokensFor(supabase, notice.user_id)) {
      if (await push(supabase, tokenRow, jwt, notice.title, notice.body, data)) delivered = true;
    }

    // No stamping: split_notices_due claims and marks its rows in the same statement, so two
    // concurrently dispatched senders never take the same notice.
    if (delivered) shared += 1;
  }

  let receiptsSent = 0;
  for (const row of receipts) {
    let delivered = false;
    for (const tokenRow of await tokensFor(supabase, row.user_id)) {
      if (
        await push(
          supabase,
          tokenRow,
          jwt,
          row.title,
          row.body,
          receiptsPayload(row.title, row.body),
        )
      ) {
        delivered = true;
      }
    }

    // Stamped only on a delivery, as for reminders. The date is the account's own local date from
    // the RPC, not this server's UTC date, which would mark tomorrow done for anyone east of it.
    if (delivered) {
      await supabase
        .from('profiles')
        .update({ receipt_reminder_last_sent_on: row.local_date })
        .eq('id', row.user_id);
      receiptsSent += 1;
    }
  }

  // Counts are reported separately so a quiet run can be told from a broken one: recorded is what
  // the server found, announced/sent what Apple took. receipts/receiptsSent are their own pair so a
  // delivered bill reminder cannot hide a receipts reminder that never reached Apple.
  return new Response(
    JSON.stringify({
      recorded: charges.length,
      announced,
      due: rows.length,
      sent,
      notices: notices.length,
      shared,
      receipts: receipts.length,
      receiptsSent,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
