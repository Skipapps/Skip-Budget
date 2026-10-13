// Plays the multi-turn test chats in src/lib/ask-sam/eval/conversations-*.ts through the real
// engine, turn by turn, and reports how each kind of follow-up fares.
// Usage: node scripts/ask-sam/eval-conversations.mjs [--fails] [--pattern i-mean]

import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { bundle } from './build-web.mjs';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const args = process.argv.slice(2);
const only = args.includes('--pattern') ? args[args.indexOf('--pattern') + 1] : undefined;
// Half the chats guide engine changes ("dev"), the other half only measures them ("test").
const carryArg = args.includes('--carry')
  ? args[args.indexOf('--carry') + 1].split(',').map(Number)
  : undefined;
const carry = carryArg ? { subject: carryArg[0], ask: carryArg[1] } : undefined;
const split = args.includes('--split') ? args[args.indexOf('--split') + 1] : undefined;
const half = (text) =>
  [...text].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 1000003, 7) % 2 === 0
    ? 'dev'
    : 'test';

const evalDir = join(ROOT, 'src/lib/ask-sam/eval');
const files = readdirSync(evalDir).filter((name) => /^conversations-.*\.ts$/.test(name));
const entry = join(ROOT, 'src/lib/ask-sam/convo-entry.tmp.ts');
writeFileSync(
  entry,
  [
    "export { createAskSam } from './conversation';",
    "export { createMatcher } from './matcher';",
    "export { ALL_INTENTS } from './knowledge';",
    "export { TOPICS } from './topics';",
    "export { ALIASES } from './eval/held-out';",
    ...files.map((name, i) => `import * as c${i} from './eval/${name.replace(/\.ts$/, '')}';`),
    `export const CONVERSATIONS = [${files.map((_, i) => `...(Object.values(c${i}).find(Array.isArray) as any[])`).join(', ')}];`,
  ].join('\n'),
);
let lib;
try {
  const dir = mkdtempSync(join(tmpdir(), 'ask-sam-convo-'));
  const file = join(dir, 'engine.cjs');
  writeFileSync(file, `var window = {};\n${bundle(entry)}\nmodule.exports = window.AskSamLib;\n`);
  lib = (await import(file)).default;
  rmSync(dir, { recursive: true, force: true });
} finally {
  rmSync(entry, { force: true });
}

const { createAskSam, createMatcher, ALL_INTENTS, TOPICS, ALIASES, CONVERSATIONS } = lib;
const matcher = createMatcher(ALL_INTENTS);
const byPattern = new Map();
const fails = [];
let right = 0;
let shown = 0;
let total = 0;
// Follow-ups whose previous turn Sam got right: how well it carries on, not counting earlier misses.
let cleanRight = 0;
let cleanTotal = 0;
for (const conversation of CONVERSATIONS.filter(
  (c) => (!only || c.pattern === only) && (!split || half(c.turns[0].say) === split),
)) {
  const sam = createAskSam({
    intents: ALL_INTENTS,
    topics: TOPICS,
    matcher,
    carry,
    random: () => 0,
  });
  const transcript = [];
  let previousRight = true;
  conversation.turns.forEach((turn, index) => {
    const [reply] = sam.ask(turn.say);
    const wasRight = previousRight;
    previousRight =
      turn.expect.includes('any') ||
      turn.expect.map((id) => ALIASES[id] ?? id).includes(reply.intentId);
    transcript.push(`${turn.say} → ${reply.kind} ${reply.intentId ?? ''}`);
    // The opening question is a single-question test; what this measures is everything after it.
    if (index === 0 || turn.expect.includes('any')) return;
    const want = turn.expect.map((id) => ALIASES[id] ?? id);
    const offered = [
      reply.intentId,
      ...(reply.alternatives ?? []).map((chip) => chip.intentId),
      ...(reply.kind === 'clarify' ? reply.chips.map((chip) => chip.intentId) : []),
    ];
    const isRight = want.includes(reply.intentId);
    const isShown = want.some((id) => offered.includes(id));
    total += 1;
    if (isRight) right += 1;
    if (wasRight) {
      cleanTotal += 1;
      if (isRight) cleanRight += 1;
    }
    if (isShown) shown += 1;
    const stat = byPattern.get(conversation.pattern) ?? { right: 0, shown: 0, total: 0 };
    stat.total += 1;
    if (isRight) stat.right += 1;
    if (isShown) stat.shown += 1;
    byPattern.set(conversation.pattern, stat);
    if (!isRight && (!args.includes('--clean') || wasRight))
      fails.push({
        pattern: conversation.pattern,
        transcript: [...transcript],
        want,
        shown: isShown,
      });
  });
}

const pct = (a, b) => `${((100 * a) / Math.max(1, b)).toFixed(1)}%`;
console.log(`${CONVERSATIONS.length} conversations, ${total} follow-up turns scored`);
console.log(
  `follow-ups answered right ${pct(right, total)}, right answer on screen ${pct(shown, total)}`,
);
console.log(
  `follow-ups after a right answer: ${pct(cleanRight, cleanTotal)} right (${cleanTotal} turns)\n`,
);
for (const [pattern, stat] of [...byPattern].sort()) {
  console.log(
    `${pattern.padEnd(18)} ${String(stat.total).padStart(4)}  right ${pct(stat.right, stat.total).padStart(6)}  on screen ${pct(stat.shown, stat.total).padStart(6)}`,
  );
}
if (args.includes('--fails')) {
  console.log('');
  for (const fail of fails) {
    console.log(`[${fail.pattern}${fail.shown ? ', offered' : ''}] want ${fail.want.join(' | ')}`);
    for (const line of fail.transcript) console.log(`   ${line}`);
  }
}
