// Checks a translated knowledge file against its English source: every intent present once, enough
// natural questions, the same price placeholders, and no English left in the answer.
// Usage: node scripts/ask-sam/check-translation.mjs <es|fr> <file name, e.g. home.ts> [more...]

import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { loadIntents } from './check-knowledge.mjs';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const DIR = join(ROOT, 'src/lib/ask-sam/knowledge');
const [language, ...names] = process.argv.slice(2);
if (!['es', 'fr'].includes(language)) throw new Error('first argument must be es or fr');
const files = names.length
  ? names
  : readdirSync(join(DIR, language)).filter((name) => name.endsWith('.ts') && name !== 'index.ts');

const ENGLISH_HINTS = /\b(the|and|you|your|tap|with|this|that|what|when|which|isn't|doesn't)\b/gi;
let problems = 0;
let intents = 0;
let questions = 0;
for (const name of files) {
  const english = loadIntents(join(DIR, name));
  let translated;
  try {
    translated = loadIntents(join(DIR, language, name));
  } catch (error) {
    console.log(`${language}/${name}: does not load: ${error.message}`);
    problems += 1;
    continue;
  }
  const byId = new Map();
  for (const item of translated) {
    if (byId.has(item.id)) {
      console.log(`${language}/${name} ${item.id}: listed twice`);
      problems += 1;
    }
    byId.set(item.id, item);
  }
  for (const source of english) {
    const item = byId.get(source.id);
    if (!item) {
      console.log(`${language}/${name} ${source.id}: missing`);
      problems += 1;
      continue;
    }
    intents += 1;
    questions += item.questions?.length ?? 0;
    const where = `${language}/${name} ${source.id}`;
    if (!item.title || item.title.length > 70) console.log(`${where}: title missing or over 70 characters`), (problems += 1);
    const min = source.topic === 'chat' ? 6 : 8;
    if (!Array.isArray(item.questions) || item.questions.length < min) console.log(`${where}: needs at least ${min} questions`), (problems += 1);
    if (!item.answer || item.answer.length < 15) console.log(`${where}: answer missing`), (problems += 1);
    const holders = (text) => [...text.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort().join();
    if (item.answer && holders(item.answer) !== holders(source.answer)) console.log(`${where}: price placeholders differ from English`), (problems += 1);
    const leftovers = (item.answer?.replace(/\*\*[^*]+\*\*/g, '').match(ENGLISH_HINTS) ?? []).length;
    // Voice examples stay in English on purpose: voice entry only understands spoken English.
    if (leftovers >= 4 && !source.id.startsWith('voice.')) console.log(`${where}: answer still reads as English (${leftovers} English words)`), (problems += 1);
    if (item.answer && item.answer.length > 2000) console.log(`${where}: answer over 2000 characters`), (problems += 1);
  }
  for (const id of byId.keys()) {
    if (!english.some((source) => source.id === id)) console.log(`${language}/${name} ${id}: not in the English file`), (problems += 1);
  }
}
console.log(`${language}: ${files.length} file(s), ${intents} intents, ${questions} questions${problems ? `, ${problems} problem(s)` : ', OK'}`);
process.exitCode = problems ? 1 : 0;
