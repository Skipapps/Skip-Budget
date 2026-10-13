// Runs the held-out questions in src/lib/ask-sam/eval through the real engine and prints what Sam
// got wrong. Usage: node scripts/ask-sam/eval.mjs [--misses] [--topic loans] [--json out.json]

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { bundle } from './build-web.mjs';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : undefined);

const entry = join(ROOT, 'src/lib/ask-sam/eval-entry.tmp.ts');
writeFileSync(
  entry,
  "export { createAskSam } from './conversation';\nexport { createMatcher } from './matcher';\nexport { ALL_INTENTS } from './knowledge';\nexport { TOPICS } from './topics';\nexport { HELD_OUT, ALIASES, NOT_ABOUT_SKIP } from './eval/held-out';\n",
);
let lib;
try {
  const dir = mkdtempSync(join(tmpdir(), 'ask-sam-eval-'));
  const file = join(dir, 'engine.cjs');
  writeFileSync(file, `var window = {};\n${bundle(entry)}\nmodule.exports = window.AskSamLib;\n`);
  lib = (await import(file)).default;
  rmSync(dir, { recursive: true, force: true });
} finally {
  rmSync(entry, { force: true });
}

const {
  createAskSam,
  createMatcher,
  ALL_INTENTS,
  TOPICS,
  HELD_OUT: RAW,
  ALIASES,
  NOT_ABOUT_SKIP,
} = lib;
const HELD_OUT = RAW.map((c) => ({ ...c, id: ALIASES[c.id] ?? c.id }));
const ids = new Set(ALL_INTENTS.map((intent) => intent.id));
const topicFilter = value('--topic');
// A fixed half of the questions guides library fixes ("dev"); the other half only measures ("test"),
// so improvements are judged on questions nobody tuned against.
const split = value('--split');
const half = (q) =>
  [...q].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 1000003, 7) % 2 === 0 ? 'dev' : 'test';
const cases = HELD_OUT.filter((c) => !split || half(c.q) === split).filter(
  (c) => !topicFilter || c.id.startsWith(`${topicFilter}.`) || c.id.split('.')[0] === topicFilter,
);

const unknown = cases.filter((c) => !ids.has(c.id));
const results = { answer: 0, offered: 0, clarify: 0, wrongAnswer: 0, wrongClarify: 0, fallback: 0 };
const misses = [];
const tBuild = Date.now();
const matcher = createMatcher(ALL_INTENTS);
console.log(`index built in ${Date.now() - tBuild} ms`);
const t0 = Date.now();
for (const c of cases.filter((c) => ids.has(c.id))) {
  const sam = createAskSam({
    intents: ALL_INTENTS,
    topics: TOPICS,
    vars: { proMonthly: '$1.99', proYearly: '$19.99' },
    random: () => 0,
    matcher,
  });
  const [reply] = sam.ask(c.q);
  const candidates = reply.debug?.candidates ?? [];
  if (
    reply.kind === 'answer' ||
    reply.kind === 'chat' ||
    reply.kind === 'contact' ||
    reply.kind === 'topics'
  ) {
    if (reply.intentId === c.id) results.answer += 1;
    else if (reply.alternatives?.some((chip) => chip.intentId === c.id)) {
      results.offered += 1;
      misses.push({ ...c, kind: 'offered under', got: reply.intentId, candidates });
    } else {
      results.wrongAnswer += 1;
      misses.push({ ...c, kind: 'wrong answer', got: reply.intentId, candidates });
    }
  } else if (reply.kind === 'clarify') {
    if (reply.chips.some((chip) => chip.intentId === c.id)) results.clarify += 1;
    else {
      results.wrongClarify += 1;
      misses.push({
        ...c,
        kind: 'wrong choices',
        got: reply.chips
          .map((chip) => chip.intentId)
          .filter(Boolean)
          .join(' | '),
        candidates,
      });
    }
  } else {
    results.fallback += 1;
    misses.push({ ...c, kind: 'no answer', got: '-', candidates });
  }
}
const total = cases.length - unknown.length;
const pct = (n) => `${((100 * n) / Math.max(1, total)).toFixed(1)}%`;
console.log(`${total} held-out questions, ${ALL_INTENTS.length} intents, ${Date.now() - t0} ms`);
console.log(`answered right      ${results.answer}  ${pct(results.answer)}`);
console.log(`answered, right offered under it ${results.offered}  ${pct(results.offered)}`);
console.log(`asked, right listed ${results.clarify}  ${pct(results.clarify)}`);
console.log(`answered wrong      ${results.wrongAnswer}  ${pct(results.wrongAnswer)}`);
console.log(`asked, right absent ${results.wrongClarify}  ${pct(results.wrongClarify)}`);
console.log(`no answer           ${results.fallback}  ${pct(results.fallback)}`);
console.log(
  `helpful (right, offered or listed): ${pct(results.answer + results.offered + results.clarify)}`,
);
if (unknown.length)
  console.log(
    `\n${unknown.length} held-out cases name ids that do not exist: ${[...new Set(unknown.map((c) => c.id))].slice(0, 20).join(', ')}`,
  );
if (flag('--misses')) {
  console.log('');
  for (const m of misses) {
    const top = m.candidates
      .slice(0, 3)
      .map((c) => `${c.id} ${c.score}`)
      .join(', ');
    console.log(`[${m.kind}] "${m.q}"\n   want ${m.id}  got ${m.got}  top: ${top}`);
  }
}
const offTopic = { declined: 0, asked: 0, answered: [] };
for (const q of topicFilter ? [] : NOT_ABOUT_SKIP) {
  const sam = createAskSam({
    intents: ALL_INTENTS,
    topics: TOPICS,
    vars: {},
    random: () => 0,
    matcher,
  });
  const [reply] = sam.ask(q);
  const id = reply.intentId ?? '';
  if (reply.kind === 'fallback' || id.startsWith('chat.')) offTopic.declined += 1;
  else if (reply.kind === 'clarify') offTopic.asked += 1;
  else offTopic.answered.push(`${q} -> ${id} ${reply.debug?.candidates[0]?.score ?? ''}`);
}
if (!topicFilter) {
  console.log(
    `\nnot about Skip: ${NOT_ABOUT_SKIP.length}, declined ${offTopic.declined}, asked ${offTopic.asked}, wrongly answered ${offTopic.answered.length}`,
  );
  for (const line of offTopic.answered) console.log(`   ${line}`);
}
const out = value('--json');
if (out) writeFileSync(out, JSON.stringify({ results, total, misses }, null, 2));
