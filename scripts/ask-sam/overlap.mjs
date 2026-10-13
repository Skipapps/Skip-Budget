// Finds answers that compete for the same questions: for each written question, the best-scoring
// answer that isn't its own. Pairs that keep colliding are duplicates to merge or questions to
// sharpen. Usage: node scripts/ask-sam/overlap.mjs [--min 0.6] [--pairs 60] [--json out.json]

import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { bundle } from './build-web.mjs';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : fallback;
const MIN = Number(value('--min', '0.6'));
const PAIRS = Number(value('--pairs', '60'));

const knowledge = join(ROOT, 'src/lib/ask-sam/knowledge');
const files = readdirSync(knowledge).filter((name) => name.endsWith('.ts') && name !== 'index.ts');
const entry = join(ROOT, 'src/lib/ask-sam/overlap-entry.tmp.ts');
writeFileSync(
  entry,
  [
    "export { createMatcher } from './matcher';",
    ...files.map((name, i) => `import * as k${i} from './knowledge/${name.replace(/\.ts$/, '')}';`),
    `export const ALL = [${files.map((_, i) => `...(Object.values(k${i}).find(Array.isArray) as any[])`).join(', ')}];`,
  ].join('\n'),
);
let lib;
try {
  const dir = mkdtempSync(join(tmpdir(), 'ask-sam-overlap-'));
  const file = join(dir, 'engine.cjs');
  writeFileSync(file, `var window = {};\n${bundle(entry)}\nmodule.exports = window.AskSamLib;\n`);
  lib = (await import(file)).default;
  rmSync(dir, { recursive: true, force: true });
} finally {
  rmSync(entry, { force: true });
}

const { createMatcher, ALL } = lib;
const matcher = createMatcher(ALL);
const pairs = new Map();
let total = 0;
let lost = 0;
const losers = [];
for (const intent of ALL) {
  if (intent.topic === 'chat') continue;
  for (const question of intent.questions) {
    total += 1;
    const matches = matcher.match(question);
    const own = matches.find((m) => m.intent.id === intent.id)?.score ?? 0;
    const rival = matches.find((m) => m.intent.id !== intent.id);
    if (!rival) continue;
    if (rival.score > own) {
      lost += 1;
      losers.push({
        question,
        own: intent.id,
        ownScore: own,
        rival: rival.intent.id,
        rivalScore: rival.score,
      });
    }
    if (rival.score >= MIN) {
      const key = [intent.id, rival.intent.id].sort().join('  <->  ');
      const entry = pairs.get(key) ?? { count: 0, examples: [] };
      entry.count += 1;
      if (entry.examples.length < 3)
        entry.examples.push(
          `${question} [${intent.id} ${own.toFixed(2)} vs ${rival.score.toFixed(2)}]`,
        );
      pairs.set(key, entry);
    }
  }
}
console.log(`${files.length} files, ${ALL.length} intents, ${total} written questions`);
console.log(
  `${lost} written questions score higher on another answer than their own (${((100 * lost) / total).toFixed(1)}%)`,
);
console.log(`\nMost-colliding pairs (rival score >= ${MIN}):`);
for (const [key, entry] of [...pairs].sort((a, b) => b[1].count - a[1].count).slice(0, PAIRS)) {
  console.log(`${String(entry.count).padStart(3)}  ${key}`);
  for (const example of entry.examples) console.log(`       ${example}`);
}
const out = value('--json');
if (out) writeFileSync(out, JSON.stringify({ losers, pairs: [...pairs] }, null, 2));
