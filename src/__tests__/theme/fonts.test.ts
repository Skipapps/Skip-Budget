import fs from 'node:fs';
import path from 'node:path';

import { APP_FONTS } from '@/theme/fonts';

/**
 * The typeface is set in two places that must agree: the faces loaded at startup
 * (src/theme/fonts.ts) and the family names behind the font-app tokens (tailwind.config.js). A
 * class naming a family the map does not have renders in the system font with no error, so every
 * family class in src is checked against the map too. Together they keep a typeface change from
 * being half applied.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwind = require('../../../tailwind.config.js') as {
  theme: { extend: { fontFamily: Record<string, string[]> } };
};
const FAMILIES = tailwind.theme.extend.fontFamily;

const SRC = path.join(__dirname, '..', '..');

/** Tailwind's own font utilities: weights, generic families and numeric variants, not ours. */
const BUILT_IN =
  /^(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|sans|serif|mono)$/;

/**
 * Files still on the old family token while the tab bar is under review; listed so the guard
 * stays green meanwhile, and checked below so the entry cannot outlive the change.
 */
const PENDING = new Set<string>();

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

/** Every `font-*` class naming a family (not a weight or Tailwind's own), per file. */
function familyClasses(file: string): string[] {
  const found =
    fs.readFileSync(file, 'utf8').match(/(?<![\w-])font-([a-z][a-z-]*)(?![\w-])/g) ?? [];
  return found.map((token) => token.slice('font-'.length)).filter((name) => !BUILT_IN.test(name));
}

describe('the app font', () => {
  it('names the same four faces in the token map as are loaded at startup', () => {
    expect(Object.values(FAMILIES).flat().sort()).toEqual(Object.keys(APP_FONTS).sort());
  });

  it('keeps the tokens neutral, one per weight', () => {
    expect(FAMILIES).toEqual({
      app: ['Montserrat_400Regular'],
      'app-medium': ['Montserrat_500Medium'],
      'app-semibold': ['Montserrat_600SemiBold'],
      'app-bold': ['Montserrat_700Bold'],
    });
  });

  it('loads every face the map names', () => {
    for (const face of Object.keys(APP_FONTS)) {
      expect(APP_FONTS[face as keyof typeof APP_FONTS]).toBeDefined();
    }
  });

  it('uses only family classes the map has, across src', () => {
    const unknown: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const relative = path.relative(SRC, file);
      if (PENDING.has(relative)) continue;
      for (const name of familyClasses(file)) {
        if (!(name in FAMILIES)) unknown.push(`${relative}: font-${name}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it('drops a pending file from the list once it has moved to the new tokens', () => {
    for (const relative of PENDING) {
      const stale = familyClasses(path.join(SRC, relative)).filter((name) => !(name in FAMILIES));
      expect(stale.length).toBeGreaterThan(0);
    }
  });
});
