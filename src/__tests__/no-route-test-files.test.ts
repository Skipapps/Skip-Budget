import fs from 'node:fs';
import path from 'node:path';

/**
 * `src/app` is expo-router's route directory: every file under it becomes a screen, `.test.*`
 * included. A test file there drags `@testing-library/react-native` into the app bundle, which
 * Metro cannot resolve outside a test runner. This walks `src/app` rather than trusting a glob.
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
