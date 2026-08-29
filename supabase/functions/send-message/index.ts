// Skip · send-message
//
// Takes a note from inside the app and emails it to admin@skipapps.net.
//
// It runs on the server for one reason: the alternative is handing the phone
// an API key. Anything shipped in the app is readable by anyone who downloads
// it, so a client-side send would publish a key that can email as your domain.
// Here the key never leaves Supabase, and the function will only send for a
// caller holding a valid session.
//
// The sender's address is not taken from the form either. It is read from the
// verified session, so nobody can put somebody else's address on a message —
// and it becomes the reply-to, so answering the email answers the person.
//
// Deploy:  npx supabase functions deploy send-message
// Secrets: npx supabase secrets set RESEND_API_KEY=re_...
//          npx supabase secrets set CONTACT_TO=admin@skipapps.net
//          npx supabase secrets set CONTACT_FROM="Skip <noreply@skipapps.net>"
//
// CONTACT_FROM must be on a domain verified in Resend, or Resend refuses it.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** What the form is allowed to be about, and what it puts in the subject. */
const TOPICS: Record<string, string> = {
  support: 'Support request',
  idea: 'Idea',
};

const MAX_NAME = 80;
const MAX_MESSAGE = 4000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Keeps user text out of the HTML structure around it. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Sign in first.' }, 401);

  // The caller's own token, so getUser resolves to them and RLS would apply to
  // anything else this function went on to read.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authorization } } },
  );

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user?.email) return json({ error: 'Sign in first.' }, 401);

  let payload: { topic?: string; name?: string; message?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Could not read that.' }, 400);
  }

  const topic = TOPICS[payload.topic ?? ''] ?? null;
  const name = (payload.name ?? '').trim().slice(0, MAX_NAME);
  const message = (payload.message ?? '').trim().slice(0, MAX_MESSAGE);

  if (!topic) return json({ error: 'Unknown topic.' }, 400);
  if (!message) return json({ error: 'Write a message first.' }, 400);

  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return json({ error: 'Sending is not set up yet.' }, 503);

  const to = Deno.env.get('CONTACT_TO') ?? 'admin@skipapps.net';
  const from = Deno.env.get('CONTACT_FROM') ?? 'Skip <noreply@skipapps.net>';
  const email = auth.user.email;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      // Replying to the email replies to the person who wrote it.
      reply_to: email,
      subject: `Skip · ${topic} from ${name || email}`,
      html: [
        `<p><strong>${escapeHtml(topic)}</strong></p>`,
        `<p><strong>Name:</strong> ${escapeHtml(name || '—')}<br>`,
        `<strong>Email:</strong> ${escapeHtml(email)}<br>`,
        `<strong>User ID:</strong> ${escapeHtml(auth.user.id)}</p>`,
        `<hr>`,
        `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      ].join(''),
    }),
  });

  if (!response.ok) {
    // The upstream reason is logged for us and not returned to the app: it can
    // carry the sending domain and key state, which is nobody else's business.
    console.error('resend refused', response.status, await response.text());
    return json({ error: 'Could not send that. Try again in a moment.' }, 502);
  }

  return json({ ok: true });
});
