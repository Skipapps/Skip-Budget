// Skip · send-push
//
// Posts to Apple directly rather than through a relay, using the key already
// in this project's secrets. Called by pg_cron every quarter of an hour.
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

  if (rows.length === 0) {
    return new Response(JSON.stringify({ due: 0, sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const jwt = await providerToken();
  let sent = 0;

  for (const row of rows) {
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('id, token, environment')
      .eq('user_id', row.user_id);

    let delivered = false;
    for (const tokenRow of (tokens ?? []) as {
      id: string;
      token: string;
      environment: Environment;
    }[]) {
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

  return new Response(JSON.stringify({ due: rows.length, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
