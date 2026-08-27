#!/usr/bin/env node
/**
 * Builds the Apple "client secret" JWT that Supabase's Apple provider wants.
 *
 * Supabase used to take Team ID, Key ID and the .p8 and sign this itself. It
 * now expects the finished token, which is why those fields disappeared from
 * the dashboard — the values live inside this JWT instead.
 *
 * Runs entirely locally. The .p8 is read from disk, used to sign, and never
 * printed or sent anywhere.
 *
 *   node scripts/apple-client-secret.mjs \
 *     --key ~/Downloads/AuthKey_ABCD123456.p8 \
 *     --team-id XXXXXXXXXX \
 *     --key-id ABCD123456 \
 *     --services-id com.skipapps.skip.budget.web
 */
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, part, index, all) => {
    if (part.startsWith('--')) pairs.push([part.slice(2), all[index + 1]]);
    return pairs;
  }, []),
);

const required = ['key', 'team-id', 'key-id', 'services-id'];
const missing = required.filter((name) => !args[name]);
if (missing.length) {
  console.error(`Missing: ${missing.map((m) => '--' + m).join(', ')}`);
  process.exit(1);
}

const base64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const now = Math.floor(Date.now() / 1000);
// Apple rejects anything longer than six months.
const SIX_MONTHS = 15777000;

const header = { alg: 'ES256', kid: args['key-id'] };
const payload = {
  iss: args['team-id'],
  iat: now,
  exp: now + SIX_MONTHS,
  aud: 'https://appleid.apple.com',
  sub: args['services-id'],
};

const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

let privateKey;
try {
  privateKey = createPrivateKey(readFileSync(args.key, 'utf8'));
} catch (error) {
  console.error('Could not read that .p8 — check the path and that the file is intact.');
  console.error(String(error.message));
  process.exit(1);
}

// ieee-p1363 gives the raw r||s signature a JWT needs; the default DER is wrong here.
const signature = sign('sha256', Buffer.from(signingInput), {
  key: privateKey,
  dsaEncoding: 'ieee-p1363',
});

console.log(`${signingInput}.${base64url(signature)}`);
console.error(`\n(valid until ${new Date((now + SIX_MONTHS) * 1000).toDateString()})`);
