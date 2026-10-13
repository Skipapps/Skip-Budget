// Checks Ask Sam knowledge files without the app's bundler, so content writers get feedback in a
// second. Usage: node scripts/ask-sam/check-knowledge.mjs <file.ts> [more files...]
// With no arguments it checks every file in src/lib/ask-sam/knowledge.

import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { transform } = require('sucrase');

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const KNOWLEDGE = join(ROOT, 'src/lib/ask-sam/knowledge');

const TOPICS = new Set([
  'getting-started',
  'home',
  'activity',
  'receipts',
  'bills',
  'subscriptions',
  'pay',
  'cards',
  'loans',
  'savings',
  'goals',
  'habits',
  'pro',
  'settings',
  'reminders',
  'voice',
  'privacy',
  'troubleshooting',
  'chat',
]);
function screenPatterns(dir, prefix = []) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      const group = /^\(.+\)$/.test(entry.name);
      return screenPatterns(join(dir, entry.name), group ? prefix : [...prefix, entry.name]);
    }
    const name = entry.name.replace(/\.tsx?$/, '');
    if (name === entry.name || name.startsWith('_')) return [];
    return [name === 'index' ? prefix : [...prefix, name]];
  });
}
const SCREENS = screenPatterns(join(ROOT, 'src/app'));
const isScreen = (route) => {
  const segments = route
    .split(/[?#]/)[0]
    .split('/')
    .filter((s) => s && !/^\(.+\)$/.test(s));
  return SCREENS.some(
    (p) =>
      p.length === segments.length &&
      p.every((part, i) => /^\[.+\]$/.test(part) || part === segments[i]),
  );
};

const BANNED =
  /\b(supabase|revenuecat|resend(?! code)|edge function|database|rls|postgres|expo|react native|query|mutation|api key|backend|frontend)\b/i;

export function loadIntents(file) {
  const source = readFileSync(file, 'utf8');
  const { code } = transform(source, { transforms: ['typescript', 'imports'], filePath: file });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', code)(module, module.exports, () => ({}));
  const lists = Object.values(module.exports).filter(Array.isArray);
  if (lists.length !== 1) throw new Error(`${basename(file)}: export exactly one Intent[] array`);
  return lists[0];
}

function check(files) {
  const problems = [];
  const all = [];
  for (const file of files) {
    let intents;
    try {
      intents = loadIntents(file);
    } catch (error) {
      problems.push(`${basename(file)}: does not load: ${error.message}`);
      continue;
    }
    for (const intent of intents) all.push({ ...intent, file: basename(file) });
  }

  const ids = new Map();
  const questionOwner = new Map();
  for (const intent of all) {
    const where = `${intent.file} ${intent.id ?? '(no id)'}`;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(intent.id ?? ''))
      problems.push(`${where}: id must look like topic.subject.aspect`);
    if (ids.has(intent.id)) problems.push(`${where}: duplicate id (also in ${ids.get(intent.id)})`);
    ids.set(intent.id, intent.file);
    if (!TOPICS.has(intent.topic)) problems.push(`${where}: unknown topic "${intent.topic}"`);
    const chat = intent.topic === 'chat';
    if (
      typeof intent.title !== 'string' ||
      intent.title.length < (chat ? 4 : 8) ||
      intent.title.length > 60
    )
      problems.push(`${where}: title must be 8-60 characters`);
    if (!Array.isArray(intent.questions) || intent.questions.length < 10)
      problems.push(`${where}: needs at least 10 questions (has ${intent.questions?.length ?? 0})`);
    if (typeof intent.answer !== 'string' || intent.answer.trim().length < (chat ? 20 : 40))
      problems.push(`${where}: answer is missing or too short`);
    if (intent.answer && intent.answer.length > 1600)
      problems.push(`${where}: answer over 1600 characters, split it`);
    if (intent.answer && BANNED.test(intent.answer))
      problems.push(`${where}: answer uses a technical word (${intent.answer.match(BANNED)[0]})`);
    if (intent.answer && /\{(?!proMonthly\}|proYearly\})[^}]*\}/.test(intent.answer))
      problems.push(`${where}: only {proMonthly} and {proYearly} are allowed placeholders`);
    if (intent.related && intent.related.length > 4) problems.push(`${where}: at most 4 related`);
    if (intent.route && !intent.route.startsWith('/'))
      problems.push(`${where}: route must start with /`);
    else if (intent.route && !isScreen(intent.route))
      problems.push(`${where}: route ${intent.route} is not a screen in src/app`);
    else if (intent.route && /\[/.test(intent.route))
      problems.push(`${where}: route ${intent.route} needs an id; leave route out`);
    for (const question of intent.questions ?? []) {
      const key = question
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const owner = questionOwner.get(key);
      if (owner && owner !== intent.id)
        problems.push(`${where}: question "${question}" also belongs to ${owner}`);
      questionOwner.set(key, intent.id);
    }
  }
  for (const intent of all) {
    for (const id of intent.related ?? []) {
      if (!ids.has(id))
        problems.push(`${intent.file} ${intent.id}: related id "${id}" does not exist`);
    }
  }

  const questions = all.reduce((sum, intent) => sum + (intent.questions?.length ?? 0), 0);
  console.log(`${files.length} file(s), ${all.length} intents, ${questions} questions`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.log(`- ${problem}`);
    process.exitCode = 1;
  } else {
    console.log('OK');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const files = args.length
    ? args.map((file) => resolve(file))
    : readdirSync(KNOWLEDGE)
        .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
        .map((name) => join(KNOWLEDGE, name));
  check(files);
}
