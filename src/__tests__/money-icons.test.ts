import fs from 'node:fs';
import path from 'node:path';

/**
 * The gradient icons, light and dark. react-native-svg does not follow one gradient's href to another,
 * so every gradient in these copies must stand on its own, and the step Metro runs on them (svgr
 * with svgo, react-native-svg-transformer's own settings) must keep every one of them.
 */

const DIR = path.join(__dirname, '../../assets/gradient-icons');
const ICONS = ['salary', 'savings', 'loans', 'goals', 'reminder'].flatMap((name) => [
  name,
  `${name}-dark`,
]);

const read = (name: string) => fs.readFileSync(path.join(DIR, `${name}.svg`), 'utf8');

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

describe.each(ICONS)('%s.svg', (name) => {
  const svg = read(name);
  const defined = gradients(
    svg,
    /<(?:linear|radial)Gradient\b([^>]*)>([\s\S]*?)<\/(?:linear|radial)Gradient>/g,
  );

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

  it.each(['salary', 'savings', 'loans', 'goals', 'reminder'])(
    '%s-dark.svg trades every navy stop for the lifted one and keeps the rest of the drawing',
    (name) => {
      const light = read(name);
      const dark = read(`${name}-dark`);
      for (const [index, navy] of NAVY.entries()) {
        const inLight = light.split(navy).length - 1;
        expect([name, navy, inLight > 0]).toEqual([name, navy, true]);
        expect(dark.toLowerCase()).not.toContain(navy);
        expect(dark.split(LIFTED[index]).length - 1).toBe(inLight);
      }
      expect(gradients(dark, /<linearGradient\b([^>]*)>([\s\S]*?)<\/linearGradient>/g).size).toBe(
        gradients(light, /<linearGradient\b([^>]*)>([\s\S]*?)<\/linearGradient>/g).size,
      );
    },
  );
});
