// A small flex-like layout engine that renders one node tree as an SVG
// (wireframe or hi-fi) or as flex HTML for the html.to.design plugin.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ICONS } from './icons.mjs';
import { FONT, WIRE, buildTokens, toRgb } from './tokens.mjs';

export const FRAME_W = 390;
export const FRAME_H = 844;
export const SAFE_TOP = 59;
export const SAFE_BOTTOM = 34;
export const GUTTER = 24;

const ROOT = new URL('../../', import.meta.url).pathname;

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

const kids = (children) => (Array.isArray(children) ? children : [children]).flat(3).filter(Boolean);

export const text = (str, style = {}, opts = {}) => ({ kind: 'text', str: String(str ?? ''), style, ...opts });
export const vstack = (props = {}, children = []) => ({ kind: 'stack', dir: 'col', ...props, children: kids(children) });
export const hstack = (props = {}, children = []) => ({ kind: 'stack', dir: 'row', ...props, children: kids(children) });
export const wrap = (props = {}, children = []) => ({ kind: 'stack', dir: 'wrap', ...props, children: kids(children) });
export const box = (props = {}, child) => vstack(props, child ? [child] : []);
export const icon = (name, props = {}) => ({ kind: 'icon', name, size: 20, color: 'ink', stroke: 1.8, ...props });
export const spacer = (h = 0, props = {}) => ({ kind: 'spacer', w: 0, h, ...props });
export const flexSpacer = () => ({ kind: 'spacer', w: 0, h: 0, flex: 1 });
export const art = (name, props = {}) => ({ kind: 'art', name, ...props });
export const divider = (props = {}) => ({ kind: 'divider', inset: 0, color: 'line/60', ...props });
export const raw = (props) => ({ kind: 'raw', ...props });
export const image = (props = {}) => ({ kind: 'image', ...props });
/** Inline runs of mixed weight/colour that wrap as one paragraph: rich([['Track ', {}], ['everything', { weight: 600, color: 'ink' }]], TYPE.body). */
export const rich = (runs, style = {}, opts = {}) => ({ kind: 'rich', runs: runs.map(([str, over]) => ({ str: String(str ?? ''), style: { ...style, ...(over ?? {}) } })), style, ...opts });

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

export function makeContext({ mode = 'hifi', scheme = 'light' } = {}) {
  const tokens = mode === 'wire' ? WIRE : buildTokens(scheme);
  return { mode, scheme, tokens, font: mode === 'wire' ? FONT.wire : FONT.hifi, shadows: new Set() };
}

export function color(value, ctx) {
  if (!value) return 'none';
  if (value === 'none' || value === 'transparent') return 'none';
  if (value.startsWith('#')) {
    if (ctx.mode !== 'wire') return value;
    return value.toUpperCase() === '#FFFFFF' ? '#FFFFFF' : '#E4E4E4';
  }
  if (value.startsWith('rgba') || value.startsWith('rgb')) return ctx.mode === 'wire' ? '#7A7A7A' : value;
  const [name, alpha] = value.split('/');
  const hex = ctx.tokens[name];
  if (!hex) throw new Error(`Unknown colour token: ${value}`);
  if (alpha === undefined) return hex;
  const [r, g, b] = toRgb(hex);
  return `rgba(${r},${g},${b},${Number(alpha) / 100})`;
}

// ---------------------------------------------------------------------------
// Text metrics (estimated; Poppins is a wide face)
// ---------------------------------------------------------------------------

function charWidth(ch) {
  if (ch === ' ') return 0.27;
  if (/[iljtfI.,:;'|!]/.test(ch)) return 0.3;
  if (/[mwMW]/.test(ch)) return 0.86;
  if (/[0-9]/.test(ch)) return 0.6;
  if (/[A-Z]/.test(ch)) return 0.68;
  if (/[a-z]/.test(ch)) return 0.56;
  if (/[$%]/.test(ch)) return 0.62;
  if (/[—–]/.test(ch)) return 0.9;
  return 0.5;
}
const WEIGHT_FACTOR = { 400: 1, 500: 1.02, 600: 1.05, 700: 1.08 };

export function textWidth(str, style, ctx) {
  const size = style.size ?? 15;
  const factor = (WEIGHT_FACTOR[style.weight ?? 400] ?? 1) * (ctx.mode === 'wire' ? 0.93 : 1);
  let total = 0;
  for (const ch of str) total += charWidth(ch);
  return total * size * factor + (style.letterSpacing ?? 0) * str.length;
}

function wrapText(str, style, maxW, ctx) {
  const lines = [];
  for (const paragraph of str.split('\n')) {
    const words = paragraph.split(' ');
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, style, ctx) <= maxW || !line) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function ellipsize(line, style, maxW, ctx) {
  if (textWidth(line, style, ctx) <= maxW) return line;
  let cut = line;
  while (cut.length > 1 && textWidth(`${cut}…`, style, ctx) > maxW) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function pad(node) {
  const p = node.pad ?? 0;
  if (typeof p === 'number') return { t: p, r: p, b: p, l: p };
  if (Array.isArray(p)) return { t: p[0], r: p[1], b: p[0], l: p[1] };
  return { t: p.t ?? p.y ?? 0, r: p.r ?? p.x ?? 0, b: p.b ?? p.y ?? 0, l: p.l ?? p.x ?? 0 };
}
const margins = (node) => ({ t: node.mt ?? 0, b: node.mb ?? 0, l: node.ml ?? 0, r: node.mr ?? 0 });

function displayString(node) {
  return node.style.transform === 'uppercase' ? node.str.toUpperCase() : node.str;
}

/** Leaves that never stretch to a column's width; they sit where `align` puts them. */
const LEAF = new Set(['icon', 'art', 'image']);

/** Intrinsic size of a node when given `availW` to work with. */
export function measure(node, availW, ctx) {
  switch (node.kind) {
    case 'text': {
      const style = node.style;
      const str = displayString(node);
      const raw = node.nowrap ? [str] : wrapText(str, style, Math.max(availW, 1), ctx);
      const maxLines = node.maxLines ?? Infinity;
      const lines = raw.slice(0, maxLines).map((line, i) =>
        i === maxLines - 1 || node.nowrap ? ellipsize(line, style, availW, ctx) : line,
      );
      const w = Math.min(availW, Math.max(...lines.map((l) => textWidth(l, style, ctx)), 0));
      const lh = style.lineHeight ?? Math.round((style.size ?? 15) * 1.45);
      node._lines = lines;
      return { w, h: lines.length * lh };
    }
    case 'rich': {
      const base = node.style;
      const lh = base.lineHeight ?? Math.round((base.size ?? 15) * 1.45);
      const space = (base.size ?? 15) * 0.27;
      // Tokenise into words that keep their run's style. Explicit newlines break lines.
      const tokens = [];
      node.runs.forEach((run) => {
        run.str.split('\n').forEach((para, pi) => {
          if (pi > 0) tokens.push({ br: true });
          const words = para.split(' ');
          words.forEach((word, wi) => {
            if (wi > 0) tokens.push({ sp: true });
            if (word) tokens.push({ str: word, style: run.style, w: textWidth(word, run.style, ctx) });
          });
        });
      });
      const lines = [[]];
      let lineW = 0;
      let pendingSpace = false;
      for (const t of tokens) {
        if (t.br) { lines.push([]); lineW = 0; pendingSpace = false; continue; }
        if (t.sp) { pendingSpace = lines[lines.length - 1].length > 0; continue; }
        const add = (pendingSpace ? space : 0) + t.w;
        if (lineW + add > availW && lines[lines.length - 1].length > 0) {
          lines.push([]);
          lineW = 0;
          pendingSpace = false;
        }
        const line = lines[lines.length - 1];
        if (pendingSpace) { line.push({ str: ' ', style: line[line.length - 1].style, w: space }); lineW += space; }
        line.push(t);
        lineW += t.w;
        pendingSpace = false;
      }
      node._lines = lines;
      const w = Math.min(availW, Math.max(...lines.map((l) => l.reduce((sum, t) => sum + t.w, 0)), 0));
      return { w, h: lines.length * lh };
    }
    case 'icon':
      return { w: node.size, h: node.size };
    case 'spacer':
      return { w: node.w ?? 0, h: node.h ?? 0 };
    case 'divider':
      return { w: availW - (node.inset ?? 0), h: node.thickness ?? 1 };
    case 'art':
    case 'image':
    case 'raw': {
      const w = node.w ?? (node.ratio ? Math.min(availW * node.ratio, node.maxW ?? Infinity) : availW);
      const h = node.h ?? (node.aspect ? w / node.aspect : 0);
      return { w, h };
    }
    case 'stack':
      return measureStack(node, availW, ctx);
    default:
      throw new Error(`Unknown node kind ${node.kind}`);
  }
}

function measureStack(node, availW, ctx) {
  const p = pad(node);
  const gap = node.gap ?? 0;
  const outerW = node.w ?? availW;
  const innerW = outerW - p.l - p.r;
  const children = node.children;
  node._sizes = [];
  const hugging = Boolean(node.hug || node._hugCtx) && !node.w;

  if (node.dir === 'col') {
    let h = 0;
    let maxChild = 0;
    children.forEach((child, i) => {
      const m = margins(child);
      child._hugCtx = false;
      const size = measure(child, innerW - m.l - m.r, ctx);
      const w = child.hug || child.w || hugging || LEAF.has(child.kind) ? size.w : innerW - m.l - m.r;
      node._sizes[i] = { w, h: size.h };
      h += size.h + m.t + m.b + (i > 0 ? gap : 0);
      maxChild = Math.max(maxChild, w + m.l + m.r);
    });
    const width = node.w ?? (hugging ? maxChild + p.l + p.r : outerW);
    let height = h + p.t + p.b;
    if (node.aspect) height = width / node.aspect;
    if (node.h !== undefined) height = node.h;
    if (node.minH !== undefined) height = Math.max(height, node.minH);
    return { w: width, h: height };
  }

  if (node.dir === 'wrap') {
    const rowGap = node.rowGap ?? gap;
    const rows = [];
    let row = { y: 0, h: 0, items: [] };
    let cursor = 0;
    children.forEach((child, i) => {
      child._hugCtx = true;
      const size = measure(child, innerW, ctx);
      const w = child.w ?? Math.min(size.w, innerW);
      node._sizes[i] = { w, h: size.h };
      if (row.items.length && cursor + w > innerW) {
        rows.push(row);
        row = { y: row.y + row.h + rowGap, h: 0, items: [] };
        cursor = 0;
      }
      row.items.push({ i, x: cursor, w, h: size.h });
      row.h = Math.max(row.h, size.h);
      cursor += w + gap;
    });
    if (row.items.length) rows.push(row);
    node._rows = rows;
    const height = rows.length ? rows[rows.length - 1].y + rows[rows.length - 1].h : 0;
    return { w: outerW, h: height + p.t + p.b };
  }

  // Row: hug everything that is not flex, then share what is left.
  let used = 0;
  let flexTotal = 0;
  children.forEach((child, i) => {
    const m = margins(child);
    if (child.flex) {
      flexTotal += child.flex;
      node._sizes[i] = null;
      return;
    }
    child._hugCtx = true;
    const size = measure(child, innerW - used - m.l - m.r, ctx);
    const w = child.w ?? size.w;
    node._sizes[i] = { w, h: size.h };
    used += w + m.l + m.r;
  });
  const gaps = gap * Math.max(children.length - 1, 0);
  const leftover = Math.max(innerW - used - gaps, 0);
  children.forEach((child, i) => {
    if (!child.flex) return;
    const m = margins(child);
    child._hugCtx = false;
    const w = (leftover * child.flex) / flexTotal - m.l - m.r;
    const size = measure(child, Math.max(w, 0), ctx);
    node._sizes[i] = { w: Math.max(w, 0), h: size.h };
  });
  const rowH = Math.max(0, ...node._sizes.map((s, i) => s.h + margins(children[i]).t + margins(children[i]).b));
  const contentW = node._sizes.reduce((sum, s, i) => sum + s.w + margins(children[i]).l + margins(children[i]).r, 0) + gaps;
  const width = node.w ?? (hugging ? contentW + p.l + p.r : outerW);
  let height = rowH + p.t + p.b;
  if (node.h !== undefined) height = node.h;
  if (node.minH !== undefined) height = Math.max(height, node.minH);
  if (node.aspect) height = width / node.aspect;
  return { w: width, h: height };
}

/** Assigns absolute boxes. Returns a placed tree. */
export function place(node, x, y, w, h, ctx) {
  const placed = { node, x, y, w, h, children: [] };
  if (node.kind !== 'stack') return placed;
  const p = pad(node);
  const gap = node.gap ?? 0;
  const innerX = x + p.l;
  const innerY = y + p.t;
  const innerW = w - p.l - p.r;
  const innerH = h - p.t - p.b;
  const sizes = node._sizes;
  const children = node.children;

  if (node.dir === 'col') {
    const fixed = sizes.reduce((sum, s, i) => sum + s.h + margins(children[i]).t + margins(children[i]).b, 0) + gap * Math.max(children.length - 1, 0);
    const flexTotal = children.reduce((sum, c) => sum + (c.flex ?? 0), 0);
    const leftover = Math.max(innerH - fixed, 0);
    const justify = node.justify ?? 'start';
    let cursor = innerY;
    if (!flexTotal && justify === 'center') cursor += leftover / 2;
    if (!flexTotal && justify === 'end') cursor += leftover;
    const between = !flexTotal && justify === 'between' && children.length > 1 ? leftover / (children.length - 1) : 0;
    children.forEach((child, i) => {
      const m = margins(child);
      const size = sizes[i];
      const ch = size.h + (child.flex ? (leftover * child.flex) / flexTotal : 0);
      const align = child.self ?? node.align ?? 'stretch';
      let cx = innerX + m.l;
      const cw = child.hug || child.w || LEAF.has(child.kind) || (Boolean(node.hug || node._hugCtx) && !node.w) ? size.w : innerW - m.l - m.r;
      if (align === 'center') cx = innerX + (innerW - cw) / 2;
      if (align === 'end') cx = innerX + innerW - cw - m.r;
      cursor += m.t;
      placed.children.push(place(child, cx, cursor, cw, ch, ctx));
      cursor += ch + m.b + gap + between;
    });
    return placed;
  }

  if (node.dir === 'wrap') {
    for (const row of node._rows) {
      for (const item of row.items) {
        placed.children.push(place(children[item.i], innerX + item.x, innerY + row.y, item.w, item.h, ctx));
      }
    }
    return placed;
  }

  const contentW = sizes.reduce((sum, s, i) => sum + s.w + margins(children[i]).l + margins(children[i]).r, 0) + gap * Math.max(children.length - 1, 0);
  const justify = node.justify ?? 'start';
  const slack = Math.max(innerW - contentW, 0);
  let cursor = innerX;
  let extraGap = 0;
  if (justify === 'center') cursor += slack / 2;
  if (justify === 'end') cursor += slack;
  if (justify === 'between' && children.length > 1) extraGap = slack / (children.length - 1);
  if (justify === 'around' && children.length > 0) {
    extraGap = slack / children.length;
    cursor += extraGap / 2;
  }
  children.forEach((child, i) => {
    const m = margins(child);
    const size = sizes[i];
    const align = child.self ?? node.align ?? 'center';
    const ch = align === 'stretch' ? innerH - m.t - m.b : size.h;
    let cy = innerY + m.t;
    if (align === 'center') cy = innerY + (innerH - size.h) / 2;
    if (align === 'end') cy = innerY + innerH - size.h - m.b;
    if (align === 'baseline') cy = innerY + (innerH - size.h) / 2;
    cursor += m.l;
    placed.children.push(place(child, cursor, cy, size.w, ch, ctx));
    cursor += size.w + m.r + gap + extraGap;
  });
  return placed;
}

export function layout(node, x, y, availW, ctx) {
  const size = measure(node, availW, ctx);
  return place(node, x, y, size.w, size.h, ctx);
}

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v) => (Math.round(v * 100) / 100).toString();

const artCache = new Map();
function loadArt(name, scheme) {
  const key = `${scheme}:${name}`;
  if (artCache.has(key)) return artCache.get(key);
  const candidates = scheme === 'dark' ? [`dark/${name}.svg`, `${name}.svg`] : [`${name}.svg`];
  let result = null;
  for (const file of candidates) {
    try {
      const svg = readFileSync(join(ROOT, 'assets/illustrations', file), 'utf8');
      const open = svg.match(/<svg[^>]*>/)[0];
      const viewBox = open.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 100 100';
      const inner = svg.slice(svg.indexOf(open) + open.length, svg.lastIndexOf('</svg>'));
      result = { viewBox, inner };
      break;
    } catch {}
  }
  artCache.set(key, result);
  return result;
}

const SHADOWS = {
  card: { dy: 2, blur: 4, opacity: 0.06 },
  raised: { dy: 4, blur: 6, opacity: 0.1 },
  floating: { dy: 6, blur: 8, opacity: 0.12 },
};

function svgNode(placed, ctx, out) {
  const { node, x, y, w, h } = placed;
  const opacity = node.opacity !== undefined ? ` opacity="${node.opacity}"` : '';
  const name = node.name ? ` data-name="${esc(node.name)}"` : '';
  switch (node.kind) {
    case 'stack': {
      const fill = color(node.fill, ctx);
      const stroke = color(node.stroke, ctx);
      const radius = node.radius === 'full' ? Math.min(w, h) / 2 : node.radius ?? 0;
      const open = node.opacity !== undefined || node.name || node.clip ? `<g${opacity}${name}>` : '';
      if (open) out.push(open);
      if (fill !== 'none' || stroke !== 'none') {
        const shadow = ctx.mode !== 'wire' && node.shadow ? ` filter="url(#shadow-${node.shadow})"` : '';
        if (node.shadow) ctx.shadows.add(node.shadow);
        const sw = node.strokeWidth ?? 1;
        const inset = stroke !== 'none' ? sw / 2 : 0;
        out.push(
          `<rect x="${n(x + inset)}" y="${n(y + inset)}" width="${n(w - inset * 2)}" height="${n(h - inset * 2)}" rx="${n(Math.max(radius - inset, 0))}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}${node.dashed ? ' stroke-dasharray="4 4"' : ''}${shadow}/>`,
        );
      }
      if (node.clip) {
        const id = `clip${Math.random().toString(36).slice(2, 8)}`;
        out.push(`<clipPath id="${id}"><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(radius)}"/></clipPath><g clip-path="url(#${id})">`);
      }
      for (const child of placed.children) svgNode(child, ctx, out);
      if (node.clip) out.push('</g>');
      if (open) out.push('</g>');
      return;
    }
    case 'text': {
      const style = node.style;
      const size = style.size ?? 15;
      const lh = style.lineHeight ?? Math.round(size * 1.45);
      const fill = color(style.color ?? 'ink', ctx);
      const anchor = style.align === 'center' ? 'middle' : style.align === 'right' ? 'end' : 'start';
      const tx = anchor === 'middle' ? x + w / 2 : anchor === 'end' ? x + w : x;
      const attrs = [
        `font-family="${ctx.font.replace(/"/g, "'")}"`,
        `font-size="${size}"`,
        `font-weight="${style.weight ?? 400}"`,
        `fill="${fill}"`,
        `text-anchor="${anchor}"`,
        style.italic ? 'font-style="italic"' : '',
        style.letterSpacing ? `letter-spacing="${style.letterSpacing}"` : '',
        style.underline ? 'text-decoration="underline"' : '',
        style.strike ? 'text-decoration="line-through"' : '',
        opacity,
        name,
      ].filter(Boolean).join(' ');
      const lines = node._lines ?? [displayString(node)];
      const baselineOffset = lh / 2 + size * 0.35;
      out.push(`<text ${attrs}>`);
      lines.forEach((line, i) => {
        out.push(`<tspan x="${n(tx)}" y="${n(y + i * lh + baselineOffset)}">${esc(line)}</tspan>`);
      });
      out.push('</text>');
      return;
    }
    case 'rich': {
      const base = node.style;
      const size = base.size ?? 15;
      const lh = base.lineHeight ?? Math.round(size * 1.45);
      const anchor = base.align === 'center' ? 'middle' : base.align === 'right' ? 'end' : 'start';
      const tx = anchor === 'middle' ? x + w / 2 : anchor === 'end' ? x + w : x;
      const baselineOffset = lh / 2 + size * 0.35;
      out.push(`<text font-family="${ctx.font.replace(/"/g, "'")}" font-size="${size}" text-anchor="${anchor}" xml:space="preserve"${opacity}${name}>`);
      (node._lines ?? []).forEach((line, i) => {
        const parts = line.map((t, j) => `<tspan${j === 0 ? ` x="${n(tx)}" y="${n(y + i * lh + baselineOffset)}"` : ''} font-weight="${t.style.weight ?? 400}" fill="${color(t.style.color ?? 'ink', ctx)}"${t.style.italic ? ' font-style="italic"' : ''}${t.style.underline ? ' text-decoration="underline"' : ''}>${esc(t.str)}</tspan>`);
        out.push(parts.join(''));
      });
      out.push('</text>');
      return;
    }
    case 'icon': {
      const def = ICONS[node.name];
      const stroke = color(node.color, ctx);
      if (!def) {
        out.push(`<circle cx="${n(x + w / 2)}" cy="${n(y + h / 2)}" r="${n(w / 2 - 1)}" fill="none" stroke="${stroke}" stroke-width="1.5"/>`);
        return;
      }
      const s = node.size / 24;
      out.push(`<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" fill="none" stroke="${stroke}" stroke-width="${node.stroke ?? 1.8}" stroke-linecap="round" stroke-linejoin="round"${opacity}${name}>`);
      for (const [tag, attrs] of def) {
        out.push(`<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`);
      }
      out.push('</g>');
      return;
    }
    case 'divider':
      out.push(`<rect x="${n(x + (node.inset ?? 0))}" y="${n(y)}" width="${n(w - (node.inset ?? 0))}" height="${n(h)}" fill="${color(node.color, ctx)}"/>`);
      return;
    case 'art': {
      if (ctx.mode === 'wire') {
        out.push(`<g${opacity}><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="#F2F2F2" stroke="#B9B9B9"/><line x1="${n(x)}" y1="${n(y)}" x2="${n(x + w)}" y2="${n(y + h)}" stroke="#B9B9B9"/><line x1="${n(x + w)}" y1="${n(y)}" x2="${n(x)}" y2="${n(y + h)}" stroke="#B9B9B9"/><text x="${n(x + w / 2)}" y="${n(y + h / 2 + 4)}" font-family="${ctx.font.replace(/"/g, "'")}" font-size="11" fill="#7A7A7A" text-anchor="middle">${esc(node.name)}</text></g>`);
        return;
      }
      const artwork = loadArt(node.name, ctx.scheme);
      if (!artwork) {
        out.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="none" stroke="#E5E1DC" stroke-dasharray="4 4"/>`);
        return;
      }
      out.push(`<svg x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" viewBox="${artwork.viewBox}" preserveAspectRatio="xMidYMid meet"${opacity}${name}>${artwork.inner}</svg>`);
      return;
    }
    case 'image': {
      // A photo-like placeholder (avatars are bundled PNGs).
      const r = node.radius === 'full' ? Math.min(w, h) / 2 : node.radius ?? 0;
      out.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" fill="${ctx.mode === 'wire' ? '#E4E4E4' : node.fill ?? '#F6E3A9'}" stroke="${color('line', ctx)}"/>`);
      if (node.label) out.push(`<text x="${n(x + w / 2)}" y="${n(y + h / 2 + 4)}" font-family="${ctx.font.replace(/"/g, "'")}" font-size="${Math.round(w * 0.32)}" font-weight="600" fill="${color('ink', ctx)}" text-anchor="middle">${esc(node.label)}</text>`);
      return;
    }
    case 'raw':
      out.push(node.svg ? node.svg(x, y, w, h, ctx) : '');
      return;
    case 'spacer':
      return;
    default:
      return;
  }
}

export function toSvg(placed, ctx, { width, height, background }) {
  const body = [];
  svgNode(placed, ctx, body);
  const defs = [...ctx.shadows]
    .map((k) => {
      const s = SHADOWS[k];
      return `<filter id="shadow-${k}" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="${s.dy}" stdDeviation="${s.blur}" flood-color="#000000" flood-opacity="${s.opacity}"/></filter>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}" height="${n(height)}" viewBox="0 0 ${n(width)} ${n(height)}" font-family="${ctx.font.replace(/"/g, "'")}">${defs ? `<defs>${defs}</defs>` : ''}<rect width="${n(width)}" height="${n(height)}" fill="${background}"/>${body.join('')}</svg>`;
}

// ---------------------------------------------------------------------------
// HTML (flex, for html.to.design)
// ---------------------------------------------------------------------------

function css(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

function htmlNode(node, ctx, inRow) {
  const m = margins(node);
  const font = ctx.font.replace(/"/g, "'");
  const common = {
    'margin-top': m.t ? `${m.t}px` : undefined,
    'margin-bottom': m.b ? `${m.b}px` : undefined,
    'margin-left': m.l ? `${m.l}px` : undefined,
    'margin-right': m.r ? `${m.r}px` : undefined,
    opacity: node.opacity,
    flex: node.flex ? `${node.flex} 1 0%` : undefined,
    'min-width': node.flex ? '0' : undefined,
    'flex-shrink': node.flex ? undefined : '0',
    'align-self': node.self === 'center' ? 'center' : node.self === 'end' ? 'flex-end' : node.self === 'start' ? 'flex-start' : node.self === 'stretch' ? 'stretch' : undefined,
  };
  const nameAttr = node.name ? ` data-name="${esc(node.name)}"` : '';
  switch (node.kind) {
    case 'stack': {
      const p = pad(node);
      const radius = node.radius === 'full' ? '999px' : node.radius ? `${node.radius}px` : undefined;
      const fill = color(node.fill, ctx);
      const stroke = color(node.stroke, ctx);
      const align = node.align ?? (node.dir === 'col' ? 'stretch' : 'center');
      const justify = node.justify ?? 'start';
      const shadow = ctx.mode !== 'wire' && node.shadow ? SHADOWS[node.shadow] : null;
      const style = css({
        ...common,
        display: 'flex',
        'flex-direction': node.dir === 'col' ? 'column' : 'row',
        'flex-wrap': node.dir === 'wrap' ? 'wrap' : undefined,
        gap: node.gap ? `${node.rowGap ?? node.gap}px ${node.gap}px` : undefined,
        padding: `${p.t}px ${p.r}px ${p.b}px ${p.l}px`,
        'box-sizing': 'border-box',
        background: fill !== 'none' ? fill : undefined,
        border: stroke !== 'none' ? `${node.strokeWidth ?? 1}px ${node.dashed ? 'dashed' : 'solid'} ${stroke}` : undefined,
        'border-radius': radius,
        'box-shadow': shadow ? `0 ${shadow.dy}px ${shadow.blur * 2}px rgba(0,0,0,${shadow.opacity})` : undefined,
        width: node.w ? `${node.w}px` : node.hug ? 'fit-content' : inRow && !node.flex ? undefined : '100%',
        height: node.h ? `${node.h}px` : undefined,
        'min-height': node.minH ? `${node.minH}px` : undefined,
        'aspect-ratio': node.aspect ? `${node.aspect}` : undefined,
        'align-items': { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', baseline: 'baseline' }[align],
        'justify-content': { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around' }[justify],
        overflow: node.clip ? 'hidden' : undefined,
        position: node.relative ? 'relative' : undefined,
      });
      return `<div style="${style}"${nameAttr}>${node.children.map((c) => htmlNode(c, ctx, node.dir !== 'col')).join('')}</div>`;
    }
    case 'text': {
      const s = node.style;
      const size = s.size ?? 15;
      const style = css({
        ...common,
        'font-family': font,
        'font-size': `${size}px`,
        'font-weight': s.weight ?? 400,
        'line-height': `${s.lineHeight ?? Math.round(size * 1.45)}px`,
        color: color(s.color ?? 'ink', ctx),
        'text-align': s.align,
        'font-style': s.italic ? 'italic' : undefined,
        'letter-spacing': s.letterSpacing ? `${s.letterSpacing}px` : undefined,
        'text-decoration': s.underline ? 'underline' : s.strike ? 'line-through' : undefined,
        'text-transform': s.transform,
        'white-space': node.nowrap ? 'nowrap' : 'pre-wrap',
        overflow: node.nowrap || node.maxLines ? 'hidden' : undefined,
        'text-overflow': node.nowrap ? 'ellipsis' : undefined,
        display: node.maxLines ? '-webkit-box' : undefined,
        '-webkit-line-clamp': node.maxLines,
        '-webkit-box-orient': node.maxLines ? 'vertical' : undefined,
        width: inRow && !node.flex ? undefined : node.hug ? 'fit-content' : '100%',
        'min-width': node.flex ? '0' : undefined,
      });
      return `<div style="${style}"${nameAttr}>${esc(displayString(node))}</div>`;
    }
    case 'rich': {
      const base = node.style;
      const size = base.size ?? 15;
      const style = css({
        ...common,
        'font-family': font,
        'font-size': `${size}px`,
        'font-weight': base.weight ?? 400,
        'line-height': `${base.lineHeight ?? Math.round(size * 1.45)}px`,
        color: color(base.color ?? 'ink', ctx),
        'text-align': base.align,
        'white-space': 'pre-wrap',
        width: inRow && !node.flex ? undefined : '100%',
      });
      const runs = node.runs.map((r) => `<span style="${css({ 'font-weight': r.style.weight, color: color(r.style.color ?? base.color ?? 'ink', ctx), 'font-style': r.style.italic ? 'italic' : undefined, 'text-decoration': r.style.underline ? 'underline' : undefined })}">${esc(r.str)}</span>`).join('');
      return `<div style="${style}"${nameAttr}>${runs}</div>`;
    }
    case 'icon': {
      const def = ICONS[node.name] ?? [];
      const stroke = color(node.color, ctx);
      const inner = def.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`).join('');
      return `<svg style="${css({ ...common, display: 'block' })}" width="${node.size}" height="${node.size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${node.stroke ?? 1.8}" stroke-linecap="round" stroke-linejoin="round" data-name="icon/${esc(node.name)}">${inner}</svg>`;
    }
    case 'spacer':
      return `<div style="${css({ ...common, width: node.w ? `${node.w}px` : undefined, height: node.h ? `${node.h}px` : undefined, flex: node.flex ? '1 1 0%' : undefined })}"></div>`;
    case 'divider':
      return `<div style="${css({ ...common, height: `${node.thickness ?? 1}px`, background: color(node.color, ctx), 'margin-left': `${node.inset ?? 0}px`, width: `calc(100% - ${node.inset ?? 0}px)` })}"></div>`;
    case 'art': {
      const sizing = css({
        ...common,
        width: node.w ? `${node.w}px` : `${Math.round((node.ratio ?? 1) * 100)}%`,
        'max-width': node.maxW ? `${node.maxW}px` : undefined,
        'aspect-ratio': node.aspect ? `${node.aspect}` : '1',
        height: node.h ? `${node.h}px` : undefined,
        display: 'block',
      });
      if (ctx.mode === 'wire') return `<div style="${sizing};background:#F2F2F2;border:1px solid #B9B9B9;display:flex;align-items:center;justify-content:center;font:11px ${font};color:#7A7A7A" data-name="illustration/${esc(node.name)}">${esc(node.name)}</div>`;
      const artwork = loadArt(node.name, ctx.scheme);
      if (!artwork) return `<div style="${sizing};border:1px dashed #E5E1DC"></div>`;
      return `<svg style="${sizing}" viewBox="${artwork.viewBox}" preserveAspectRatio="xMidYMid meet" data-name="illustration/${esc(node.name)}">${artwork.inner}</svg>`;
    }
    case 'image': {
      const r = node.radius === 'full' ? '999px' : `${node.radius ?? 0}px`;
      return `<div style="${css({ ...common, width: `${node.w}px`, height: `${node.h}px`, 'border-radius': r, background: ctx.mode === 'wire' ? '#E4E4E4' : node.fill ?? '#F6E3A9', border: `1px solid ${color('line', ctx)}`, display: 'flex', 'align-items': 'center', 'justify-content': 'center', font: `600 ${Math.round(node.w * 0.32)}px ${font}`, color: color('ink', ctx) })}" data-name="${esc(node.name ?? 'avatar')}">${esc(node.label ?? '')}</div>`;
    }
    case 'raw':
      return node.html ? node.html(ctx) : '';
    default:
      return '';
  }
}

export function toHtml(node, ctx, { title, width, minHeight, background }) {
  const fonts = ctx.mode === 'wire' ? '' : '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,400;1,700&display=swap" rel="stylesheet">';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>${fonts}
<style>html,body{margin:0;padding:0;background:#ECEAE7}*{box-sizing:border-box}body{display:flex;justify-content:center;padding:24px 0}.frame{width:${width}px;min-height:${minHeight}px;background:${background};position:relative;display:flex;flex-direction:column;overflow:hidden;font-family:${ctx.font.replace(/"/g, "'")}}</style>
</head><body><div class="frame" data-name="${esc(title)}">${htmlNode(node, ctx, false)}</div></body></html>`;
}
