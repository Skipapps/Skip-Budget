import fs from 'node:fs';
import path from 'node:path';

/**
 * The bill categories' gradient icons, light and dark. react-native-svg does not follow one
 * gradient's href to another, so every gradient in these copies must stand on its own, and the step
 * Metro runs on them (svgr with svgo, react-native-svg-transformer's own settings) must keep every
 * one of them.
 */

const DIR = path.join(__dirname, '../../assets/gradient-icons');
const NAMES = [
  'housing',
  'energy',
  'water',
  'internet',
  'mobile',
  'insurance',
  'transport',
  'health',
  'education',
  'other',
].map((id) => `bill-${id}`);
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

  it('resolves every fill to a gradient that has its own stops', () => {
    const used = references(svg);
    expect(used.size).toBeGreaterThan(0);
    for (const id of used) {
      expect([id, defined.has(id)]).toEqual([id, true]);
      expect([id, /<stop\b/.test(defined.get(id)!)]).toEqual([id, true]);
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
  /** The designer prefixed each file's gradient ids with its own name ("housing_", "housingD_"). */
  const prefix = (svg: string) => /id="([A-Za-z]+_)/.exec(svg)?.[1] ?? '';
  const sameIds = (dark: string, light: string) => dark.split(prefix(dark)).join(prefix(light));
  const WITHOUT_NAVY = ['bill-housing', 'bill-water', 'bill-other'];

  it.each(NAMES)('%s-dark.svg is the light drawing with every navy stop lifted', (name) => {
    const light = read(name);
    const dark = read(`${name}-dark`);
    for (const navy of NAVY) expect(dark.toLowerCase()).not.toContain(navy);
    // Shapes, gradients and every other colour as in the light one.
    expect(sameIds(dark, light)).toBe(lifted(light));
  });

  it('has navy to lift in all but the three drawn without it', () => {
    for (const name of NAMES) {
      const navy = NAVY.some((colour) => read(name).toLowerCase().includes(colour));
      expect([name, navy]).toEqual([name, !WITHOUT_NAVY.includes(name)]);
    }
  });

  it('gives each file its own gradient ids, so two icons on one screen never share one', () => {
    const prefixes = NAMES.flatMap((name) => [prefix(read(name)), prefix(read(`${name}-dark`))]);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});

describe('the registry', () => {
  const source = fs.readFileSync(path.join(__dirname, '../theme/bill-icons.ts'), 'utf8');
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

  it('pairs each bill category with its own light and dark file', () => {
    expect(Object.fromEntries(pairs)).toEqual(
      Object.fromEntries(
        [
          'housing',
          'energy',
          'water',
          'internet',
          'mobile',
          'insurance',
          'transport',
          'health',
          'education',
          'other',
        ].map((id) => [id, [`bill-${id}`, `bill-${id}-dark`]]),
      ),
    );
  });

  it('points only at files that exist', () => {
    for (const file of imported.values()) {
      expect([file, fs.existsSync(path.join(DIR, `${file}.svg`))]).toEqual([file, true]);
    }
  });
});
