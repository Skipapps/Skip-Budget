// Skip · send-push
//
// The scheduled tick. Every quarter of an hour it does three things in this
// order, and the order is the important part:
//
//   1. records the charges that have come due
//   2. rolls the schedules that have gone past
//   3. sends what is owed — a notice for each new charge, and any reminder
//      whose time has arrived
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

const BUNDLE_ID = 'com.skipapps.skip.budget';

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

async function pushOnce(
  token: string,
  environment: Environment,
  jwt: string,
  title: string,
  body: string,
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
      aps: { alert: { title, body }, sound: 'default', badge: 1 },
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
): Promise<boolean> {
  const first = await pushOnce(tokenRow.token, tokenRow.environment, jwt, title, body);
  if (first.ok) return true;

  // A token minted for one Apple environment is meaningless to the other, and
  // the app cannot always tell which build it is. Rather than guess twice,
  // learn from the rejection.
  if (first.reason === 'BadDeviceToken') {
    const other: Environment =
      tokenRow.environment === 'development' ? 'production' : 'development';
    const retry = await pushOnce(tokenRow.token, other, jwt, title, body);

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

  const charges = (recorded ?? []) as {
    user_id: string;
    label: string;
    amount: number;
    charged_on: string;
  }[];

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

  if (rows.length === 0 && charges.length === 0 && notices.length === 0) {
    return new Response(JSON.stringify({ recorded: 0, due: 0, sent: 0, notices: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const jwt = await providerToken();
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
        ? `${theirs.length} charges · $${total.toFixed(2)}`
        : theirs.map((c) => `$${Math.abs(Number(c.amount)).toFixed(2)} went out`).join(' · ');

    for (const tokenRow of tokens) {
      if (await push(supabase, tokenRow, jwt, title, body)) announced += 1;
    }
  }

  // ---- Remind about what is coming --------------------------------------
  for (const row of rows) {
    let delivered = false;
    for (const tokenRow of await tokensFor(supabase, row.user_id)) {
      if (await push(supabase, tokenRow, jwt, row.title, row.body)) delivered = true;
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
    for (const tokenRow of await tokensFor(supabase, notice.user_id)) {
      if (await push(supabase, tokenRow, jwt, notice.title, notice.body)) delivered = true;
    }

    // No stamping here any more. split_notices_due claims its rows and marks
    // them in the same statement, so two senders dispatched seconds apart can
    // never both take the same notice — which they otherwise would, now that
    // every write dispatches one rather than waiting for a single cron job.
    if (delivered) shared += 1;
  }

  // Reported separately so a quiet run can be told apart from a broken one:
  // recorded says what the server found, announced and sent say what Apple took.
  return new Response(
    JSON.stringify({
      recorded: charges.length,
      announced,
      due: rows.length,
      sent,
      notices: notices.length,
      shared,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
