// Skip · send-push
//
// The scheduled tick. Every quarter of an hour it does three things in this
// order, and the order is the important part:
//
//   1. records the charges that have come due
//   2. rolls the schedules that have gone past
//   3. sends what is owed — a notice for each new charge, any reminder whose
//      time has arrived, the waiting shared-group notices, and the daily
//      receipts nudge for anybody whose chosen hour has come round
//
// Recording before rolling, because the stored anchor is what occurrences are
// walked from and moving it first steps over the date being written.
//
// Posts to Apple directly rather than through a relay, using the key already
// in this project's secrets.
//
// Two things about APNs are worth stating up front, because both fail quietly
// rather than loudly:
//
//   The token is environment-bound. A build signed for development — anything
//   installed over a cable — is only known to the sandbox host, and production
//   answers BadDeviceToken. So a rejection is retried against the other host
//   and the correction is written back, rather than the message being dropped.
//
//   The JWT is reusable and rate-limited. Apple accepts one for an hour and
//   refuses a client that mints them per request, so it is made once per
//   invocation and held.
//
// Secrets: APNS_KEY (the .p8 contents), APNS_KEY_ID, APNS_TEAM_ID.
// Deploy:  npx supabase functions deploy send-push --no-verify-jwt
//
// No JWT, because pg_cron has no session to present. It proves itself with a
// secret the database generated for the purpose instead — see below.

import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  billGlyph,
  chargePayload,
  digestPayload,
  money,
  noticePayload,
  receiptsPayload,
  reminderPayload,
  type SourceRow,
  type TapPayload,
} from './card.ts';

const BUNDLE_ID = 'com.skipapps.skip.budget';

// The category every Skip notification carries. It is what tells iOS to run
// the content extension (targets/notification-content) on press-and-hold, and
// it names the action buttons the app registers in src/api/push.ts.
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

/**
 * An ES256 provider token.
 *
 * Web Crypto returns the signature as raw r‖s, which is exactly what JWS wants
 * — no DER unwrapping, unlike most server-side crypto libraries.
 */
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
 * What the phone should do with the notification: where a tap lands, and the
 * card it draws (see ./card.ts).
 *
 * Sent as a top-level `body` object beside `aps`, which reads like a mistake
 * and is not: expo-notifications takes a *remote* notification's `content.data`
 * from `userInfo["body"]` and from nowhere else. Any other custom key is
 * carried by APNs and then dropped on the floor by the client. Verified in the
 * installed module's own source, expo-notifications@57.0.13,
 * ios/ExpoNotifications/Notifications/NotificationRecords.swift:328-334.
 *
 * A payload with a card also sets `mutable-content`, which is what wakes the
 * service extension (targets/notification-service) to attach the logo before
 * the banner shows. Without the extension on the phone — an older build — the
 * flag is ignored and the notification arrives as plain text, as before.
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
      // 10 is "deliver now". A reminder that arrives an hour late is no longer
      // a reminder, and these are low volume.
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

  // A token minted for one Apple environment is meaningless to the other, and
  // the app cannot always tell which build it is. Rather than guess twice,
  // learn from the rejection.
  if (first.reason === 'BadDeviceToken') {
    const other: Environment =
      tokenRow.environment === 'development' ? 'production' : 'development';
    const retry = await pushOnce(tokenRow.token, other, jwt, title, body, data);

    if (retry.ok) {
      await supabase.from('device_tokens').update({ environment: other }).eq('id', tokenRow.id);
      return true;
    }
  }

  // The device uninstalled, or the token was replaced. Keeping it means
  // failing on it forever.
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
      logo_path: string | null;
    }
  >;
  subscriptions: Map<
    string,
    {
      category_id: string | null;
      card_id: string | null;
      bank_account_id: string | null;
      logo_path: string | null;
    }
  >;
  sources: Map<string, SourceRow>;
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

const EMPTY: Context = {
  reminders: new Map(),
  bills: new Map(),
  subscriptions: new Map(),
  sources: new Map(),
  charges: new Map(),
};

const chargeKey = (userId: string, label: string, chargedOn: string) =>
  `${userId}|${label}|${chargedOn}`;

/** A to-one embed arrives as an object, or as a one-row array from some joins. */
function logoOf(brands: unknown): string | null {
  const row = Array.isArray(brands) ? brands[0] : brands;
  return (row as { logo_path?: string | null } | null)?.logo_path ?? null;
}

/**
 * What each notification is about, for its card: the bill or subscription
 * behind it, its brand logo and category, and who pays.
 *
 * Best effort. Every notification can go out without this, as plain text, so
 * a failed read here is logged and the run carries on with an empty context
 * rather than holding back somebody's reminder for a picture.
 */
async function loadContext(
  supabase: ReturnType<typeof createClient>,
  reminderIds: string[],
  charges: Charge[],
): Promise<Context> {
  try {
    const ctx: Context = {
      reminders: new Map(),
      bills: new Map(),
      subscriptions: new Map(),
      sources: new Map(),
      charges: new Map(),
    };

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
      const { data, error } = await supabase
        .from('bills')
        .select('id, category_id, icon_id, card_id, bank_account_id, brands(logo_path)')
        .in('id', billIds);
      if (error) throw error;
      type BillRow = {
        id: string;
        category_id: string | null;
        icon_id: string | null;
        card_id: string | null;
        bank_account_id: string | null;
        brands: unknown;
      };
      for (const row of (data ?? []) as unknown as BillRow[]) {
        ctx.bills.set(row.id, {
          category_id: row.category_id,
          icon_id: row.icon_id,
          card_id: row.card_id,
          bank_account_id: row.bank_account_id,
          logo_path: logoOf(row.brands),
        });
      }
    }

    if (subscriptionIds.length > 0) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, category_id, card_id, bank_account_id, brands(logo_path)')
        .in('id', subscriptionIds);
      if (error) throw error;
      type SubscriptionRow = {
        id: string;
        category_id: string | null;
        card_id: string | null;
        bank_account_id: string | null;
        brands: unknown;
      };
      for (const row of (data ?? []) as unknown as SubscriptionRow[]) {
        ctx.subscriptions.set(row.id, {
          category_id: row.category_id,
          card_id: row.card_id,
          bank_account_id: row.bank_account_id,
          logo_path: logoOf(row.brands),
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
  row: { reminder_id: string; title: string; body: string },
): TapPayload | undefined {
  const target = ctx.reminders.get(row.reminder_id);
  if (!target) return undefined;
  const payerOf = (plan?: { card_id: string | null; bank_account_id: string | null }) =>
    plan ? ctx.sources.get(plan.card_id ?? plan.bank_account_id ?? '') : undefined;

  if (target.subscription_id) {
    const plan = ctx.subscriptions.get(target.subscription_id);
    return reminderPayload(
      {
        kind: 'subscription',
        title: row.title,
        body: row.body,
        targetId: target.subscription_id,
        logoPath: plan?.logo_path,
        categoryId: plan?.category_id,
        payer: payerOf(plan),
      },
      supabaseUrl,
    );
  }
  if (target.bill_id) {
    const plan = ctx.bills.get(target.bill_id);
    return reminderPayload(
      {
        kind: 'bill',
        title: row.title,
        body: row.body,
        targetId: target.bill_id,
        logoPath: plan?.logo_path,
        categoryId: plan?.category_id,
        iconId: plan?.icon_id,
        payer: payerOf(plan),
      },
      supabaseUrl,
    );
  }
  if (target.card_id) {
    return reminderPayload(
      {
        kind: 'card',
        title: row.title,
        body: row.body,
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
        targetId: target.bank_account_id,
        self: ctx.sources.get(target.bank_account_id),
      },
      supabaseUrl,
    );
  }
  return undefined;
}

/** The card for one recorded charge. */
function chargeData(ctx: Context, supabaseUrl: string, charge: Charge): TapPayload {
  const found = ctx.charges.get(chargeKey(charge.user_id, charge.label, charge.charged_on));
  const bill = found?.bill_id ? ctx.bills.get(found.bill_id) : undefined;
  const subscription = found?.subscription_id
    ? ctx.subscriptions.get(found.subscription_id)
    : undefined;
  return chargePayload(
    {
      label: charge.label,
      amount: Number(charge.amount),
      chargedOn: charge.charged_on,
      billId: found?.bill_id,
      subscriptionId: found?.subscription_id,
      logoPath: subscription?.logo_path ?? bill?.logo_path,
      glyph: subscription
        ? subscription.category_id
        : bill
          ? billGlyph(bill.category_id, bill.icon_id)
          : undefined,
      payer: found ? ctx.sources.get(found.card_id ?? found.bank_account_id ?? '') : undefined,
    },
    supabaseUrl,
  );
}

Deno.serve(async (request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    // The service role, because this runs for every user and belongs to none.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Who is allowed to make this send.
  //
  // The caller proves it is the scheduled job by quoting a secret the database
  // minted for itself. Read here with the service role, which is the only role
  // that can — job_secrets has row level security on and no policies at all —
  // so the value never leaves Postgres and never appears in a migration, in
  // git, or in this file.
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

  // ---- What actually went out -------------------------------------------
  //
  // Recorded here rather than on the phone, which is the whole reason a "this
  // went out" notice is possible at all: until now nothing on the server knew
  // a bill had fallen due until somebody opened the app.
  //
  // Only rows genuinely inserted come back — the unique indexes refuse a day
  // the phone already wrote — so nothing is announced twice.
  const { data: recorded, error: recordError } = await supabase.rpc('record_due_charges');
  if (recordError) console.error('record_due_charges failed', recordError.message);

  // Strictly after recording. The stored anchor is what occurrences are walked
  // from, so moving it first would step over the very date just written.
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

  // Shared-group notices: somebody added an expense, settled up, or asked to
  // be your friend. Queued by triggers rather than pushed from them, so a slow
  // Apple never sits inside the transaction that added the expense.
  const { data: noticeRows, error: noticeError } = await supabase.rpc('split_notices_due');
  if (noticeError) console.error('split_notices_due failed', noticeError.message);

  const notices = (noticeRows ?? []) as {
    notice_id: string;
    user_id: string;
    title: string;
    body: string;
  }[];

  // The daily receipts nudge. Same shape as a reminder, but it points at a
  // habit rather than at a row, so it is decided per account rather than per
  // reminder — which is why it needs its own RPC and its own stamp.
  //
  // Logged and skipped rather than fatal, unlike reminders_due above. This
  // block can reach a database where the migration defining
  // receipt_reminders_due() has not been applied yet, and a missing function
  // must not take the bill reminders down with it: Postgres answers 42883 and
  // supabase-js surfaces it as an ordinary error here, so the run continues
  // with nothing due. That is also what happens if the function is revoked or
  // renamed — a quiet zero, never a dropped charge notice.
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
  const ctx = await loadContext(
    supabase,
    rows.map((row) => row.reminder_id),
    charges,
  );
  let sent = 0;
  let announced = 0;

  // ---- Announce what went out -------------------------------------------
  const byUser = new Map<string, typeof charges>();
  for (const charge of charges) {
    byUser.set(charge.user_id, [...(byUser.get(charge.user_id) ?? []), charge]);
  }

  for (const [chargeUser, theirs] of byUser) {
    const tokens = await tokensFor(supabase, chargeUser);
    if (tokens.length === 0) continue;

    // One notice per charge reads better than a digest — until it doesn't.
    // A first run that catches up on a backlog would otherwise arrive as a
    // wall of notifications, so past a handful it becomes one line.
    const total = theirs.reduce((sum, c) => sum + Math.abs(Number(c.amount)), 0);
    const title = theirs.length > 3 ? 'Payments went out' : theirs[0].label;
    const body =
      theirs.length > 3
        ? `${theirs.length} charges · ${money(total)}`
        : theirs.map((c) => `${money(Number(c.amount))} went out`).join(' · ');
    // One card per notification: the charge itself, or the digest. Two or
    // three charges for one person share a notification today, so the card
    // shows the first and the body lists them all.
    const data =
      theirs.length > 3
        ? digestPayload(theirs.length, total)
        : chargeData(ctx, supabaseUrl, theirs[0]);

    for (const tokenRow of tokens) {
      if (await push(supabase, tokenRow, jwt, title, body, data)) announced += 1;
    }
  }

  // ---- Remind about what is coming --------------------------------------
  for (const row of rows) {
    let delivered = false;
    const data = reminderData(ctx, supabaseUrl, row);
    for (const tokenRow of await tokensFor(supabase, row.user_id)) {
      if (await push(supabase, tokenRow, jwt, row.title, row.body, data)) delivered = true;
    }

    // Stamped only on a delivery. A reminder nobody could be sent stays due,
    // so the next run tries again rather than marking it done in silence.
    if (delivered) {
      await supabase
        .from('reminders')
        .update({ last_sent_on: row.local_date })
        .eq('id', row.reminder_id);
      sent += 1;
    }
  }

  // ---- Tell people what happened in their groups ------------------------
  let shared = 0;
  for (const notice of notices) {
    let delivered = false;
    const data = noticePayload(notice.title, notice.body);
    for (const tokenRow of await tokensFor(supabase, notice.user_id)) {
      if (await push(supabase, tokenRow, jwt, notice.title, notice.body, data)) delivered = true;
    }

    // No stamping here any more. split_notices_due claims its rows and marks
    // them in the same statement, so two senders dispatched seconds apart can
    // never both take the same notice — which they otherwise would, now that
    // every write dispatches one rather than waiting for a single cron job.
    if (delivered) shared += 1;
  }

  // ---- Ask about today's receipts ---------------------------------------
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

    // Same rule as a reminder: stamped only on a delivery, so a day nobody
    // could be pushed stays due and the next quarter hour tries again. The
    // date written is the account's own local date, as the RPC computed it —
    // not this server's, which is UTC and would mark tomorrow done for
    // anybody east of it.
    if (delivered) {
      await supabase
        .from('profiles')
        .update({ receipt_reminder_last_sent_on: row.local_date })
        .eq('id', row.user_id);
      receiptsSent += 1;
    }
  }

  // Reported separately so a quiet run can be told apart from a broken one:
  // recorded says what the server found, announced and sent say what Apple took.
  // receipts/receiptsSent are their own pair for the same reason — folded into
  // due/sent, a receipts reminder that never reaches Apple would be hidden by a
  // bill reminder that did.
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
