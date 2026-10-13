// Cleans every library text once, here, so the phone doesn't on each launch. Writes
// src/lib/ask-sam/prepared/<language>.ts. Run after any change to the knowledge files; the library
// test fails while these are out of date.
// Usage: node scripts/ask-sam/build-prepared.mjs

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { bundle } from './build-web.mjs';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const entry = join(ROOT, 'src/lib/ask-sam/prepared-entry.tmp.ts');
writeFileSync(
  entry,
  "export { prepare } from './prepare';\nexport { intentsFor } from './library';\n",
);
let lib;
try {
  const dir = mkdtempSync(join(tmpdir(), 'ask-sam-prepared-'));
  const file = join(dir, 'engine.cjs');
  writeFileSync(file, `var window = {};\n${bundle(entry)}\nmodule.exports = window.AskSamLib;\n`);
  lib = (await import(file)).default;
  rmSync(dir, { recursive: true, force: true });
} finally {
  rmSync(entry, { force: true });
}

const out = join(ROOT, 'src/lib/ask-sam/prepared');
mkdirSync(out, { recursive: true });
for (const language of ['en', 'es', 'fr']) {
  const prepared = lib.prepare(lib.intentsFor(language), language);
  const name = `PREPARED_${language.toUpperCase()}`;
  writeFileSync(
    join(out, `${language}.ts`),
    `// Made by scripts/ask-sam/build-prepared.mjs from the knowledge files; don't edit by hand.\n` +
      `import type { Prepared } from '../matcher';\n\n` +
      `export const ${name}: Prepared = ${JSON.stringify(prepared)};\n`,
  );
  console.log(
    `${language}: ${prepared.terms.length} terms, ${Object.keys(prepared.intents).length} intents`,
  );
}
