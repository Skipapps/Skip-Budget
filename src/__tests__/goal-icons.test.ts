import fs from 'node:fs';
import path from 'node:path';

import { GOAL_TYPES } from '@/data/goal-types';

/**
 * The goals' gradient icons, light and dark: the Trip globe, the Emergency fund shield and the medal
 * are the designer's Vol-2 drawings, copied with every gradient written out in full because
 * react-native-svg does not follow one gradient's href to another; the other types reuse the
 * app's own drawings. The step Metro runs on them (svgr with svgo, react-native-svg-transformer's
 * own settings) must keep every gradient.
 */

const DIR = path.join(__dirname, '../../assets/gradient-icons');
const NAMES = ['goal-trip', 'goal-emergency', 'medal'];
const FILES = NAMES.flatMap((name) => [name, `${name}-dark`]);

const read = (file: string) => fs.readFileSync(path.join(DIR, `${file}.svg`), 'utf8');

/** id → the gradient's markup, from `<linearGradient …>` (or radial) to its close. */
function gradients(svg: string, tag: RegExp): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of svg.matchAll(tag)) {
    const id = /\bid="([^"]+)"/.exec(match[1])?.[1];
    if (!id) throw new Error('a gradient without an id');
    if (found.has(id)) throw new Error(`gradient id "${id}" twice`);
    found.set(id, match[0]);
  }
  return found;
}

const GRADIENT = /<(?:linear|radial)Gradient\b([^>]*)>([\s\S]*?)<\/(?:linear|radial)Gradient>/g;

const references = (svg: string) => new Set([...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]));

// The transformer's own defaults (react-native-svg-transformer/index.js).
const SVGR_CONFIG = {
  native: true,
  plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
  svgoConfig: {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            inlineStyles: { onlyMatchedOnce: false },
            removeViewBox: false,
            removeUnknownsAndDefaults: false,
            convertColors: false,
          },
        },
      },
    ],
  },
};

const fromTransformer = (name: string) =>
  require.resolve(name, { paths: [path.dirname(require.resolve('react-native-svg-transformer'))] });

describe.each(FILES)('%s.svg', (file) => {
  const svg = read(file);
  const defined = gradients(svg, GRADIENT);

  it('draws on the 48-unit square the tiles size it into', () => {
    expect(svg).toMatch(/^<svg\b[^>]*\bviewBox="0 0 48 48"/);
  });

  it('has no href left between gradients', () => {
    expect(svg).not.toMatch(/href/);
    // A self-closing gradient is one with no stops of its own.
    expect(svg).not.toMatch(/<(?:linear|radial)Gradient\b[^>]*\/>/);
  });

  it('resolves every fill to a gradient that has its own stops and its own line', () => {
    const used = references(svg);
    expect(used.size).toBeGreaterThan(0);
    for (const id of used) {
      expect([id, defined.has(id)]).toEqual([id, true]);
      const gradient = defined.get(id)!;
      expect([id, /<stop\b/.test(gradient)]).toEqual([id, true]);
      // A gradient that once borrowed its line from another now carries all four ends itself.
      for (const end of ['x1', 'x2', 'y1', 'y2']) {
        expect([id, end, new RegExp(`\\b${end}="`).test(gradient)]).toEqual([id, end, true]);
      }
      expect([id, gradient.includes('gradientUnits="userSpaceOnUse"')]).toEqual([id, true]);
    }
  });

  it('keeps every gradient, its stops and its transform through svgr and svgo', async () => {
    const { transform } = jest.requireActual(fromTransformer('@svgr/core'));
    const config = {
      ...SVGR_CONFIG,
      // Resolved where the transformer resolves them, so the same versions run.
      plugins: SVGR_CONFIG.plugins.map(fromTransformer),
    };
    const code: string = await transform(svg, config, { componentName: 'Icon' });

    const out = gradients(code, /<LinearGradient\b([^>]*)>([\s\S]*?)<\/LinearGradient>/g);
    expect(out.size).toBe(defined.size);
    for (const id of references(code)) {
      expect([id, out.has(id)]).toEqual([id, true]);
      expect([id, /<Stop\b/.test(out.get(id)!)]).toEqual([id, true]);
    }
    const transforms = (text: string) => (text.match(/gradientTransform=/g) ?? []).length;
    expect(transforms(code)).toBe(transforms(svg));
    expect(code).not.toMatch(/href/i);
  });
});

describe('the dark copies', () => {
  const NAVY = ['#273a9b', '#202f65', '#021e2f'];
  const LIFTED = ['#6274D4', '#4F5FB0', '#3E4C93'];
  const lifted = (svg: string) =>
    NAVY.reduce((text, navy, index) => text.split(navy).join(LIFTED[index]), svg);
  /** Each file's gradient ids carry its own prefix ("goal_trip_", "goal_trip_dark_"). */
  const prefix = (svg: string) =>
    /id="((?:goal_[a-z]+|medal)_(?:dark_)?)[a-z]+"/.exec(svg)?.[1] ?? '';
  const sameIds = (dark: string, light: string) => dark.split(prefix(dark)).join(prefix(light));

  it.each(NAMES)('%s-dark.svg is the light drawing with every navy stop lifted', (name) => {
    const light = read(name);
    const dark = read(`${name}-dark`);
    // Each of the three is drawn with navy, so each has something to lift.
    for (const navy of NAVY) expect([name, navy, light.includes(navy)]).toEqual([name, navy, true]);
    for (const navy of NAVY) expect(dark.toLowerCase()).not.toContain(navy);
    // Shapes, gradients and every other colour as in the light one.
    expect(sameIds(dark, light)).toBe(lifted(light));
  });

  it('gives each file its own gradient ids, so two icons on one screen never share one', () => {
    const prefixes = NAMES.flatMap((name) => [prefix(read(name)), prefix(read(`${name}-dark`))]);
    expect(prefixes.every(Boolean)).toBe(true);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});

describe('the registry', () => {
  const source = fs.readFileSync(path.join(__dirname, '../theme/goal-icons.ts'), 'utf8');
  const imported = new Map(
    [
      ...source.matchAll(
        /^import (\w+) from '\.\.\/\.\.\/assets\/gradient-icons\/([\w-]+)\.svg';$/gm,
      ),
    ].map(([, binding, file]) => [binding, file]),
  );
  const pairs = new Map(
    [...source.matchAll(/^\s+(\w+): \{ light: (\w+), dark: (\w+) \},$/gm)].map(
      ([, name, light, dark]) => [name, [imported.get(light), imported.get(dark)]],
    ),
  );

  it('draws each goal type as the brief chose, from the app’s own icons where it has one', () => {
    expect(Object.fromEntries(pairs)).toEqual({
      trip: ['goal-trip', 'goal-trip-dark'],
      emergency: ['goal-emergency', 'goal-emergency-dark'],
      home: ['loan-type-home', 'loan-type-home-dark'],
      car: ['loan-type-car', 'loan-type-car-dark'],
      education: ['bill-education', 'bill-education-dark'],
      wedding: ['book-wedding', 'book-wedding-dark'],
      phone: ['bill-mobile', 'bill-mobile-dark'],
      gifts: ['book-gifts', 'book-gifts-dark'],
      health: ['bill-health', 'bill-health-dark'],
      family: ['book-kids-family', 'book-kids-family-dark'],
      pets: ['book-pets', 'book-pets-dark'],
      other: ['goals', 'goals-dark'],
      medal: ['medal', 'medal-dark'],
    });
  });

  it('covers every goal type', () => {
    expect([...pairs.keys()].filter((name) => name !== 'medal').sort()).toEqual(
      [...GOAL_TYPES].sort(),
    );
  });

  it('points only at files that exist', () => {
    for (const file of imported.values()) {
      expect([file, fs.existsSync(path.join(DIR, `${file}.svg`))]).toEqual([file, true]);
    }
  });
});
