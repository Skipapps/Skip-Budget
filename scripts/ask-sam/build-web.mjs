// Builds the Ask Sam test page: the app's own engine and answers (src/lib/ask-sam), bundled into
// one self-contained HTML file, so what the Founder tests on the web is exactly what ships.
// Usage: node scripts/ask-sam/build-web.mjs <out.html> [--entry <file.ts>]

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { transform } = require('sucrase');

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const HERE = dirname(new URL(import.meta.url).pathname);

export function bundle(entry) {
  const modules = new Map();
  const visit = (file) => {
    if (modules.has(file)) return;
    modules.set(file, null);
    const { code } = transform(readFileSync(file, 'utf8'), {
      transforms: ['typescript', 'imports'],
      filePath: file,
    });
    const deps = {};
    const rewritten = code.replace(/require\((['"])([^'"]+)\1\)/g, (whole, quote, request) => {
      const target = resolveRequest(file, request);
      deps[request] = target;
      visit(target);
      return `require(${JSON.stringify(relative(ROOT, target))})`;
    });
    modules.set(file, rewritten);
  };
  visit(resolve(entry));

  const parts = [...modules].map(
    ([file, code]) =>
      `${JSON.stringify(relative(ROOT, file))}: function (module, exports, require) {\n${code}\n}`,
  );
  return `(function () {
var defs = {\n${parts.join(',\n')}\n};
var cache = {};
function load(id) {
  if (cache[id]) return cache[id].exports;
  var module = (cache[id] = { exports: {} });
  defs[id](module, module.exports, load);
  return module.exports;
}
window.AskSamLib = load(${JSON.stringify(relative(ROOT, resolve(entry)))});
})();`;
}

function resolveRequest(from, request) {
  const base = request.startsWith('@/')
    ? join(ROOT, 'src', request.slice(2))
    : resolve(dirname(from), request);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && !candidate.endsWith('/')) {
      try {
        readFileSync(candidate);
        return candidate;
      } catch {
        continue;
      }
    }
  }
  throw new Error(`Cannot resolve ${request} from ${relative(ROOT, from)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const out = args[0];
  if (!out)
    throw new Error('Usage: node scripts/ask-sam/build-web.mjs <out.html> [--entry <file.ts>]');
  const entryFlag = args.indexOf('--entry');
  const entry = entryFlag >= 0 ? args[entryFlag + 1] : join(ROOT, 'src/lib/ask-sam/index.ts');
  // An answer containing "</script" would end the inline script early.
  const script = bundle(entry).replace(/<\/script/gi, '<\\/script');
  if (out.endsWith('.js')) {
    writeFileSync(out, `${script}\n`);
  } else {
    const template = readFileSync(join(HERE, 'web/template.html'), 'utf8');
    const built = new Date().toISOString().slice(0, 16).replace('T', ' ');
    writeFileSync(
      out,
      template.replace('/*ASK_SAM_ENGINE*/', () => script).replace('{{BUILT}}', built),
    );
  }
  console.log(`wrote ${out}`);
}
