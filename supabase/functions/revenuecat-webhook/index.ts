// Writes the entitlements row from RevenueCat's purchase/renewal/expiry events. The app learns the
// same thing from the SDK sooner, but this is the copy the server trusts: a phone can lie.
//
// Expiry is stored, not only reacted to: if the EXPIRATION event never arrives, is_pro() stops
// honouring the row once expires_at passes, so a missed webhook cannot leave someone Pro forever.
//
// Deploy:  npx supabase functions deploy revenuecat-webhook --no-verify-jwt
// Secret:  npx supabase secrets set RC_WEBHOOK_SECRET=...   (same value pasted
//          into RevenueCat → Integrations → Webhooks → Authorization header)

import { createClient } from 'jsr:@supabase/supabase-js@2';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  // RevenueCat sends the Authorization header verbatim as configured.
  const secret = Deno.env.get('RC_WEBHOOK_SECRET') ?? '';
  const given = request.headers.get('authorization') ?? '';
  if (!secret || (given !== secret && given !== `Bearer ${secret}`)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let payload: { event?: Record<string, unknown> };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'unreadable' }, 400);
  }

  const event = payload.event ?? {};
  const type = String(event.type ?? '');
  const userId = String(event.app_user_id ?? '');

  // The app signs into RevenueCat with the Supabase user id, so this is a uuid. Anonymous ids
  // ($RCAnonymousID:…) are logged and skipped, not erred.
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    console.log('skipping non-uuid app_user_id', type);
    return json({ skipped: true });
  }

  // RevenueCat's "does this endpoint answer" ping.
  if (type === 'TEST') return json({ ok: true });

  const expiresMs = Number(event.expiration_at_ms ?? 0) || null;
  const active =
    type !== 'EXPIRATION' &&
    // A cancellation keeps access until the period runs out; only EXPIRATION means "off, now".
    (expiresMs === null || expiresMs > Date.now());

  const service = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { error } = await service.from('entitlements').upsert({
    user_id: userId,
    pro: active,
    product_id: String(event.product_id ?? '') || null,
    expires_at: expiresMs ? new Date(expiresMs).toISOString() : null,
    environment: String(event.environment ?? '') || null,
    will_renew: type !== 'CANCELLATION' && type !== 'EXPIRATION',
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('entitlement upsert failed', error.message);
    return json({ error: error.message }, 500);
  }

  return json({ ok: true, type, pro: active });
});
