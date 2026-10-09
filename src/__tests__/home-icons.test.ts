import fs from 'node:fs';
import path from 'node:path';

/**
 * Home's gradient icons, light and dark. react-native-svg does not follow one gradient's href to
 * another, so every gradient in these copies must stand on its own, and the step Metro runs on them
 * (svgr with svgo, react-native-svg-transformer's own settings) must keep every one of them. Salary
 * and the loan calculator use the Cards files, which money-icons.test.ts covers.
 */

const DIR = path.join(__dirname, '../../assets/gradient-icons');
const NAMES = ['receipt', 'bill', 'subscription', 'spending-habits', 'insights'];
const FILES = NAMES.flatMap((name) => [`home-${name}`, `home-${name}-dark`]);

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

  it.each(NAMES)('home-%s-dark.svg is the light drawing with every navy stop lifted', (name) => {
    const light = read(`home-${name}`);
    const dark = read(`home-${name}-dark`);
    for (const navy of NAVY) expect(dark.toLowerCase()).not.toContain(navy);
    // Shapes, gradients and every other colour as in the light one.
    expect(dark).toBe(lifted(light));
  });

  it('lifts the subscription play button, which the designer sent in its light navy', () => {
    const light = read('home-subscription');
    const dark = read('home-subscription-dark');
    for (const [index, navy] of NAVY.entries()) {
      const inLight = light.split(navy).length - 1;
      expect([navy, inLight > 0]).toEqual([navy, true]);
      expect(dark.split(LIFTED[index]).length - 1).toBe(inLight);
    }
  });

  it('leaves the receipt alone: it has no navy to lift', () => {
    expect(read('home-receipt-dark')).toBe(read('home-receipt'));
    for (const navy of NAVY) expect(read('home-receipt').toLowerCase()).not.toContain(navy);
  });
});

describe('the registry', () => {
  const source = fs.readFileSync(path.join(__dirname, '../theme/home-icons.ts'), 'utf8');
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

  it('pairs each Home icon with its own light and dark file', () => {
    expect(Object.fromEntries(pairs)).toEqual({
      receipt: ['home-receipt', 'home-receipt-dark'],
      bill: ['home-bill', 'home-bill-dark'],
      subscription: ['home-subscription', 'home-subscription-dark'],
      // The designer's loan-calculator and salary drawings are the Cards tab's, file for file.
      salary: ['salary', 'salary-dark'],
      loanCalculator: ['loans', 'loans-dark'],
      spendingHabits: ['home-spending-habits', 'home-spending-habits-dark'],
      insights: ['home-insights', 'home-insights-dark'],
    });
  });

  it('points only at files that exist', () => {
    for (const file of imported.values()) {
      expect([file, fs.existsSync(path.join(DIR, `${file}.svg`))]).toEqual([file, true]);
    }
  });
});
