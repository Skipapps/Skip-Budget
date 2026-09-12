import fs from 'node:fs';
import path from 'node:path';

/**
 * `src/app` is expo-router's route directory: every file under it becomes a
 * navigable screen, `.test.*` included. That has broken the dev client twice
 * on this branch already — a `.test.tsx` there drags
 * `@testing-library/react-native` (and its `require('console')`) into the
 * real app bundle, which Metro cannot resolve outside a test runner.
 *
 * This guard walks `src/app` itself rather than trusting a glob pattern
 * someone could mistype, so it fails loudly the moment a stray test file
 * lands back in the route tree — scratch, probe, or otherwise.
 */

const APP_DIR = path.join(__dirname, '..', 'app');

function findTestFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findTestFiles(fullPath));
    } else if (/\.test\.[^./]+$/.test(entry.name)) {
      found.push(fullPath);
    }
  }
  return found;
}

describe('src/app contains no test files', () => {
  it('has no *.test.* files anywhere under the route tree', () => {
    const testFiles = findTestFiles(APP_DIR).map((file) => path.relative(APP_DIR, file));

    expect(testFiles).toEqual([]);
  });
});
