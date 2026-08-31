// Skip · revenuecat-webhook
//
// RevenueCat tells this function what Apple decided — a purchase, a renewal,
// a cancellation running out — and it writes the one row the whole wall reads.
// The app learns the same truth from RevenueCat's SDK moments sooner; this is
// the copy the server trusts, because a phone can lie and Apple's ledger
// cannot.
//
// Expiry is stored rather than only reacted to. If the EXPIRATION event never
// arrives, is_pro() stops honouring the row the second expires_at passes, so a
// missed webhook self-heals instead of leaving somebody Pro forever.
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

  // RevenueCat sends the Authorization header verbatim as configured; a
  // constant-time comparison is overkill for a 64-hex secret but harmless.
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

  // The app signs into RevenueCat with the Supabase user id, so this is a
  // uuid. Anonymous RevenueCat ids ($RCAnonymousID:…) mean a purchase before
  // sign-in, which this app cannot produce — logged and skipped, not erred.
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    console.log('skipping non-uuid app_user_id', type);
    return json({ skipped: true });
  }

  // TEST events are RevenueCat's "does this endpoint answer" ping.
  if (type === 'TEST') return json({ ok: true });

  const expiresMs = Number(event.expiration_at_ms ?? 0) || null;
  const active =
    type !== 'EXPIRATION' &&
    // A cancellation keeps access until the period runs out; expiration is
    // the only event that means "off, now".
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
