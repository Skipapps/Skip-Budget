// Edits Ask Sam knowledge files through the TypeScript syntax tree, so merges and answer fixes
// can't break a file. Reads a JSON plan of steps:
//   { "merge": [keep, drop] }                      drop's questions/keywords join keep; links follow
//   { "set": id, "answer"?: str, "title"?: str, "route"?: str|null, "pro"?: bool|null }
//   { "addQuestions": id, "questions": [...] }      appended, duplicates skipped
//   { "removeQuestions": id, "questions": [...] }
//   { "addKeywords": id, "keywords": [...] }
//   { "related": id, "ids": [...] }                 replaces the list
//   { "delete": id, "into"?: id }                   links to it move to `into`, or are dropped
//   { "add": {intent}, "file": "home.ts" }          appended to that file's list
// Usage: node scripts/ask-sam/edit-intents.mjs plan.json   (then run prettier on the files)

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const DIR = join(ROOT, 'src/lib/ask-sam/knowledge');
const files = readdirSync(DIR).filter((name) => name.endsWith('.ts') && name !== 'index.ts');
const sources = new Map(files.map((name) => [name, readFileSync(join(DIR, name), 'utf8')]));

const quote = (value) =>
  `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
const list_ = (values) => `[\n${values.map((v) => `      ${quote(v)},`).join('\n')}\n    ]`;
const list = (values) => `[\n${values.map((v) => `      ${quote(v)},`).join('\n')}\n    ]`;

function parse(name) {
  return ts.createSourceFile(name, sources.get(name), ts.ScriptTarget.Latest, true);
}

function literalValue(node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken)
    return literalValue(node.left) + literalValue(node.right);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literalValue);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  throw new Error(`unsupported literal: ${node.getText()}`);
}

/** Every intent object in every file, with its properties' nodes. */
function index() {
  const found = new Map();
  for (const name of files) {
    const sf = parse(name);
    const visit = (node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const props = new Map();
        for (const p of node.properties)
          if (ts.isPropertyAssignment(p)) props.set(p.name.getText(sf), p);
        const id = props.get('id');
        if (id && props.has('questions') && ts.isStringLiteralLike(id.initializer)) {
          found.set(id.initializer.text, { file: name, node, props, sf });
          return;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return found;
}

function value(entry, key, fallback) {
  const prop = entry.props.get(key);
  return prop ? literalValue(prop.initializer) : fallback;
}

/** Applies text edits to one file, last first so positions stay valid. */
function apply(name, edits) {
  let text = sources.get(name);
  for (const edit of edits.sort((a, b) => b.start - a.start))
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  sources.set(name, text);
}

function setProp(entry, key, text) {
  const prop = entry.props.get(key);
  if (prop) {
    apply(entry.file, [
      { start: prop.initializer.getStart(entry.sf), end: prop.initializer.getEnd(), text },
    ]);
  } else {
    const last = entry.node.properties[entry.node.properties.length - 1];
    apply(entry.file, [
      { start: last.getEnd(), end: last.getEnd(), text: `,\n    ${key}: ${text}` },
    ]);
  }
}

function removeProp(entry, key) {
  const prop = entry.props.get(key);
  if (!prop) return;
  let end = prop.getEnd();
  const text = sources.get(entry.file);
  if (text[end] === ',') end += 1;
  apply(entry.file, [{ start: prop.getFullStart(), end, text: '' }]);
}

function removeIntent(entry) {
  const text = sources.get(entry.file);
  let start = entry.node.getFullStart();
  let end = entry.node.getEnd();
  if (text[end] === ',') end += 1;
  apply(entry.file, [{ start, end, text: '' }]);
}

/** Points every `related` link at `from` to `to` (or drops it), never to itself, no repeats. */
function relink(from, to) {
  // One edit per pass: every edit moves the text under the positions of the next.
  for (;;) {
    const hit = [...index()].find(([, entry]) =>
      (value(entry, 'related', null) ?? []).includes(from),
    );
    if (!hit) return;
    const [id, entry] = hit;
    const next = [
      ...new Set(
        value(entry, 'related', [])
          .map((r) => (r === from ? to : r))
          .filter((r) => r && r !== id),
      ),
    ];
    if (next.length) setProp(entry, 'related', list(next));
    else removeProp(entry, 'related');
  }
}

const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const log = [];
for (const step of plan) {
  let all = index();
  const need = (id) => {
    const entry = all.get(id);
    if (!entry) throw new Error(`no intent ${id} (step ${JSON.stringify(step).slice(0, 80)})`);
    return entry;
  };
  if (step.merge) {
    const [keepId, dropId] = step.merge;
    const keep = need(keepId);
    const drop = need(dropId);
    const questions = [...value(keep, 'questions', [])];
    const seen = new Set(questions.map((q) => q.toLowerCase()));
    for (const q of [value(drop, 'title', ''), ...value(drop, 'questions', [])]) {
      if (q && !seen.has(q.toLowerCase())) {
        seen.add(q.toLowerCase());
        questions.push(q);
      }
    }
    const keywords = [...new Set([...value(keep, 'keywords', []), ...value(drop, 'keywords', [])])];
    removeIntent(drop);
    all = index();
    const kept = need(keepId);
    if (keywords.length) setProp(kept, 'keywords', list(keywords));
    all = index();
    setProp(need(keepId), 'questions', list(questions));
    relink(dropId, keepId);
    log.push(`merged ${dropId} -> ${keepId} (${questions.length} questions)`);
  } else if (step.set) {
    for (const key of ['answer', 'title', 'route', 'pro']) {
      if (!(key in step)) continue;
      all = index();
      const entry = need(step.set);
      if (step[key] === null) removeProp(entry, key);
      else
        setProp(entry, key, typeof step[key] === 'boolean' ? String(step[key]) : quote(step[key]));
    }
    log.push(
      `set ${step.set}: ${Object.keys(step)
        .filter((k) => k !== 'set')
        .join(', ')}`,
    );
  } else if (step.addQuestions) {
    const entry = need(step.addQuestions);
    const questions = [...value(entry, 'questions', [])];
    const seen = new Set(questions.map((q) => q.toLowerCase()));
    for (const q of step.questions)
      if (!seen.has(q.toLowerCase())) {
        seen.add(q.toLowerCase());
        questions.push(q);
      }
    setProp(entry, 'questions', list(questions));
    log.push(`added questions to ${step.addQuestions} (${questions.length})`);
  } else if (step.removeQuestions) {
    const entry = need(step.removeQuestions);
    const drop = new Set(step.questions.map((q) => q.toLowerCase()));
    const questions = value(entry, 'questions', []).filter((q) => !drop.has(q.toLowerCase()));
    setProp(entry, 'questions', list(questions));
    log.push(`removed questions from ${step.removeQuestions} (${questions.length} left)`);
  } else if (step.addKeywords) {
    const entry = need(step.addKeywords);
    const keywords = [...new Set([...value(entry, 'keywords', []), ...step.keywords])];
    setProp(entry, 'keywords', list(keywords));
    log.push(`added keywords to ${step.addKeywords}`);
  } else if (step.related) {
    const entry = need(step.related);
    if (step.ids.length) setProp(entry, 'related', list(step.ids));
    else removeProp(entry, 'related');
    log.push(`related of ${step.related}`);
  } else if (step.add) {
    if (all.has(step.add.id)) throw new Error(`intent ${step.add.id} already exists`);
    const sf = parse(step.file);
    let list;
    const find = (node) => {
      if (!list && ts.isArrayLiteralExpression(node) && ts.isVariableDeclaration(node.parent))
        list = node;
      ts.forEachChild(node, find);
    };
    find(sf);
    if (!list) throw new Error(`no intent list in ${step.file}`);
    const fields = Object.entries(step.add)
      .map(
        ([key, v]) =>
          `    ${key}: ${Array.isArray(v) ? list_(v) : typeof v === 'string' ? quote(v) : String(v)},`,
      )
      .join('\n');
    const close = list.getEnd() - 1;
    apply(step.file, [{ start: close, end: close, text: `  {\n${fields}\n  },\n` }]);
    log.push(`added ${step.add.id} to ${step.file}`);
  } else if (step.delete) {
    removeIntent(need(step.delete));
    relink(step.delete, step.into);
    log.push(`deleted ${step.delete}${step.into ? ` (links -> ${step.into})` : ''}`);
  } else {
    throw new Error(`unknown step ${JSON.stringify(step)}`);
  }
}

for (const name of files) {
  const before = readFileSync(join(DIR, name), 'utf8');
  if (sources.get(name) !== before) writeFileSync(join(DIR, name), sources.get(name));
}
console.log(log.join('\n'));
