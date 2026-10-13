// Checks a plan of rewritten answers keeps every fact the old answer had: each **bold** on-screen
// label, each number, amount and percentage, and each price placeholder. A rewrite may reorder and
// rephrase; it may not lose any of these.
// Usage: node scripts/ask-sam/check-rewrite.mjs plan.json

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { loadIntents } from './check-knowledge.mjs';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const DIR = join(ROOT, 'src/lib/ask-sam/knowledge');
const answers = new Map(
  readdirSync(DIR)
    .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
    .flatMap((name) => loadIntents(join(DIR, name)).map((intent) => [intent.id, intent.answer])),
);

const facts = (text) => ({
  bold: [...text.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]),
  numbers: [...text.replace(/\*\*/g, '').matchAll(/\$?\d[\d,]*(?:\.\d+)?%?/g)].map((m) => m[0]),
  placeholders: [...text.matchAll(/\{\w+\}/g)].map((m) => m[0]),
});

const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
let problems = 0;
for (const step of plan) {
  if (!step.set || !('answer' in step)) continue;
  const before = answers.get(step.set);
  if (before === undefined) {
    console.log(`${step.set}: no such answer`);
    problems += 1;
    continue;
  }
  const old = facts(before);
  const now = facts(step.answer);
  const lost = [
    ...old.bold.filter((b) => !now.bold.includes(b)).map((b) => `bold "${b}"`),
    ...old.numbers
      .filter((n) => !step.answer.replace(/\*\*/g, '').includes(n))
      .map((n) => `number ${n}`),
    ...old.placeholders.filter((p) => !now.placeholders.includes(p)).map((p) => `placeholder ${p}`),
  ];
  if (lost.length) {
    problems += 1;
    console.log(`${step.set}: lost ${[...new Set(lost)].join(', ')}`);
  }
}
console.log(
  problems
    ? `${problems} rewrite(s) dropped facts`
    : `OK: ${plan.length} rewrite(s) keep every fact`,
);
process.exitCode = problems ? 1 : 0;
