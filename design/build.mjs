// Renders every screen spec under design/screens three ways, plus the
// component sheet and an index page. Run: node design/build.mjs
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { FRAME_H, FRAME_W, GUTTER, SAFE_BOTTOM, box, layout, makeContext, measure, place, spacer, toHtml, toSvg, vstack, hstack, color, text } from './kit/render.mjs';
import { AddButton, BackButton, StatusBar, TabBar } from './kit/components.mjs';
import { componentSheet } from './kit/sheet.mjs';

const ROOT = new URL('.', import.meta.url).pathname;
const OUT = join(ROOT, 'out');
const VARIANTS = [
  { dir: 'wireframes', mode: 'wire', scheme: 'light' },
  { dir: 'hifi', mode: 'hifi', scheme: 'light' },
  { dir: 'hifi-dark', mode: 'hifi', scheme: 'dark' },
];

function frameFor(spec) {
  return vstack({ fill: 'surface', w: FRAME_W, minH: FRAME_H, name: spec.name }, [
    StatusBar(),
    spec.back ? box({ pad: { t: 4, l: GUTTER - 8, r: GUTTER } }, hstack({}, [BackButton()])) : null,
    vstack({ pad: { x: GUTTER, b: spec.padBottom }, flex: 1, name: 'Content' }, spec.children),
    spec.tab ? TabBar(spec.tab) : spacer(SAFE_BOTTOM),
  ]);
}

function renderSvg(spec, ctx) {
  const frame = frameFor(spec);
  const placed = layout(frame, 0, 0, FRAME_W, ctx);
  const height = Math.max(FRAME_H, placed.h);
  // Re-place at the final height so flex children and the tab bar land at the bottom.
  const final = place(frame, 0, 0, FRAME_W, height, ctx);
  let svg = toSvg(final, ctx, { width: FRAME_W, height, background: color('surface', ctx) });
  const extras = [];
  if (spec.fab) {
    const fab = AddButton();
    const p = layout(fab, FRAME_W - 20 - 64, height - 20 - 64 - (spec.tab ? 0 : 0), 64, ctx);
    extras.push(toSvg(p, ctx, { width: 0, height: 0, background: 'none' }));
  }
  if (spec.overlay || spec.sheet) {
    const node = spec.overlay ?? spec.sheet;
    const size = measure(node, spec.sheet ? FRAME_W : FRAME_W - 64, ctx);
    const x = spec.sheet ? 0 : (FRAME_W - size.w) / 2;
    const y = spec.sheet ? height - size.h : (height - size.h) / 2;
    const p = place(node, x, y, size.w, size.h, ctx);
    extras.push(`<rect width="${FRAME_W}" height="${height}" fill="#000000" fill-opacity="0.4"/>`);
    extras.push(toSvg(p, ctx, { width: 0, height: 0, background: 'none' }));
  }
  if (extras.length) {
    // Strip the wrapper svg/rect from each extra and splice before the closing tag.
    const inner = extras.map((s) => (s.startsWith('<svg') ? s.replace(/^<svg[^>]*>(<defs>.*?<\/defs>)?<rect[^>]*\/>/, '').replace(/<\/svg>$/, '') : s)).join('');
    svg = svg.replace(/<\/svg>$/, `${inner}</svg>`);
    // Shadow filters used by extras need to be in defs.
    const defs = [...ctx.shadows].map((k) => `shadow-${k}`).filter((id) => !svg.includes(`<filter id="${id}"`));
    if (defs.length) {
      const SH = { card: [2, 4, 0.06], raised: [4, 6, 0.1], floating: [6, 8, 0.12] };
      const add = defs.map((id) => { const s = SH[id.replace('shadow-', '')]; return `<filter id="${id}" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="${s[0]}" stdDeviation="${s[1]}" flood-color="#000000" flood-opacity="${s[2]}"/></filter>`; }).join('');
      svg = svg.includes('<defs>') ? svg.replace('<defs>', `<defs>${add}`) : svg.replace(/(<svg[^>]*>)/, `$1<defs>${add}</defs>`);
    }
  }
  return { svg, height };
}

function renderHtml(spec, ctx) {
  const frame = frameFor(spec);
  let html = toHtml(frame, ctx, { title: spec.name, width: FRAME_W, minHeight: FRAME_H, background: color('surface', ctx) });
  const extras = [];
  if (spec.fab) extras.push(`<div style="position:absolute;right:20px;bottom:20px">${toHtml(AddButton(), ctx, { title: '', width: 64, minHeight: 64, background: 'none' }).replace(/^[\s\S]*<div class="frame"[^>]*>/, '').replace(/<\/div><\/body><\/html>$/, '')}</div>`);
  if (spec.overlay || spec.sheet) {
    const node = spec.overlay ?? spec.sheet;
    const inner = toHtml(node, ctx, { title: '', width: 0, minHeight: 0, background: 'none' }).replace(/^[\s\S]*<div class="frame"[^>]*>/, '').replace(/<\/div><\/body><\/html>$/, '');
    extras.push(`<div data-name="Scrim" style="position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:${spec.sheet ? 'flex-end' : 'center'};justify-content:center;padding:${spec.sheet ? 0 : 32}px">${inner}</div>`);
  }
  if (extras.length) html = html.replace(/<\/div><\/body><\/html>$/, `${extras.join('')}</div></body></html>`);
  return html;
}

for (const v of VARIANTS) mkdirSync(join(OUT, v.dir), { recursive: true });
mkdirSync(join(OUT, 'html'), { recursive: true });
mkdirSync(join(OUT, 'html-dark'), { recursive: true });

const specs = [];
for (const file of readdirSync(join(ROOT, 'screens')).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(join(ROOT, 'screens', file));
  const list = Array.isArray(mod.default) ? mod.default : [mod.default];
  for (const spec of list) specs.push({ ...spec, section: mod.section ?? file.replace(/\.mjs$/, ''), order: mod.order ?? 99 });
}
specs.sort((a, b) => a.order - b.order || a.section.localeCompare(b.section));

const index = [];
let failures = 0;
for (const spec of specs) {
  try {
    for (const v of VARIANTS) {
      const ctx = makeContext({ mode: v.mode, scheme: v.scheme });
      const { svg } = renderSvg(spec, ctx);
      writeFileSync(join(OUT, v.dir, `${spec.id}.svg`), svg);
    }
    writeFileSync(join(OUT, 'html', `${spec.id}.html`), renderHtml(spec, makeContext({ mode: 'hifi', scheme: 'light' })));
    writeFileSync(join(OUT, 'html-dark', `${spec.id}.html`), renderHtml(spec, makeContext({ mode: 'hifi', scheme: 'dark' })));
    index.push(spec);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${spec.id}: ${error.message}`);
  }
}

// Component sheet
for (const v of VARIANTS) {
  const ctx = makeContext({ mode: v.mode, scheme: v.scheme });
  writeFileSync(join(OUT, v.dir, '_components.svg'), componentSheet(ctx, 'svg'));
}
writeFileSync(join(OUT, 'html', '_components.html'), componentSheet(makeContext({ mode: 'hifi', scheme: 'light' }), 'html'));
writeFileSync(join(OUT, 'html-dark', '_components.html'), componentSheet(makeContext({ mode: 'hifi', scheme: 'dark' }), 'html'));

// Index
const sections = [...new Set(index.map((s) => s.section))];
const cards = (dir, ext) => sections.map((sec) => `<h2>${sec}</h2><div class="grid">${index.filter((s) => s.section === sec).map((s) => `<a class="card" href="${dir}/${s.id}.${ext}" target="_blank"><img loading="lazy" src="${dir === 'html' ? `hifi/${s.id}.svg` : `${dir}/${s.id}.svg`}" alt="${s.name}"><span>${s.name}</span><small>${s.id}.${ext}</small></a>`).join('')}</div>`).join('');
writeFileSync(
  join(OUT, 'index.html'),
  `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SkipBudget design kit</title><style>
body{font:14px/1.5 -apple-system,Helvetica,Arial;margin:0;padding:32px;background:#F3F1EE;color:#111}h1{font-size:24px}h2{font-size:16px;margin:32px 0 12px;text-transform:capitalize}nav a{margin-right:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}.card{display:block;background:#fff;border:1px solid #E5E1DC;border-radius:12px;padding:10px;text-decoration:none;color:#111}
.card img{width:100%;aspect-ratio:390/844;object-fit:cover;object-position:top;border-radius:8px;background:#FBF9F7;border:1px solid #eee}.card span{display:block;font-weight:600;margin-top:8px}.card small{color:#6F6F6F}
</style></head><body><h1>SkipBudget design kit</h1><p>${index.length} screens · <a href="hifi/_components.svg">component sheet (SVG)</a> · <a href="html/_components.html">component sheet (HTML)</a></p>
<nav><a href="#wire">Wireframes</a><a href="#hifi">Hi-fi</a><a href="#dark">Dark</a><a href="#html">HTML for html.to.design</a></nav>
<h1 id="wire">Wireframes</h1>${cards('wireframes', 'svg')}<h1 id="hifi">Hi-fi</h1>${cards('hifi', 'svg')}<h1 id="dark">Dark mode</h1>${cards('hifi-dark', 'svg')}<h1 id="html">HTML (html.to.design)</h1>${cards('html', 'html')}
</body></html>`,
);
console.log(`${index.length} screens rendered${failures ? `, ${failures} failed` : ''} → design/out`);
