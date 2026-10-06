import fs from 'node:fs';
import path from 'node:path';

/**
 * Splits lives in its own app now. Typed routes cannot see an href pushed `as never` (the tour did),
 * and a `jest.mock` of a deleted module only fails when that one suite runs, so this reads the
 * source itself. What was removed is written out below rather than derived from the files left on
 * disk, so emptying a list cannot make a case pass.
 */

const SRC = path.join(__dirname, '..');
const APP = path.join(SRC, 'app');

const REMOVED_ROUTES = [
  'splits',
  'split-group',
  'add-group',
  'group-settings',
  'settle-up',
  'add-member',
  'friends',
  'add-expense',
];

// Relative to src/, no extension.
const REMOVED_MODULES = ['api/splits', 'lib/split', 'data/group-icons'];
const REMOVED_FOLDER = 'components/splits';

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules') return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const posix = (file: string) => path.relative(SRC, file).split(path.sep).join('/');

// This file has to name the routes and modules, so it is the one thing not scanned.
const FILES = sourceFiles(SRC).filter((file) => file !== __filename);
const TEXT = new Map(FILES.map((file) => [file, fs.readFileSync(file, 'utf8')]));
const text = (file: string) => TEXT.get(file) ?? '';

/** A path in any quote counts: plain, double or backtick, with a query, or inside a group folder. */
const REMOVED_ROUTE = new RegExp(
  `['"\`]/(?:\\([a-z-]+\\)/)*(${REMOVED_ROUTES.join('|')})(?=['"\`?#/])`,
  'g',
);
const removedRoutesIn = (source: string) => [
  ...new Set([...source.matchAll(REMOVED_ROUTE)].map((match) => match[1])),
];

/** URL patterns of the screens under src/app: `(group)` folders vanish, `[id]` takes any segment. */
function screenPatterns(dir: string, prefix: string[] = []): string[][] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      const isGroup = /^\(.+\)$/.test(entry.name);
      return screenPatterns(path.join(dir, entry.name), isGroup ? prefix : [...prefix, entry.name]);
    }
    const name = entry.name.replace(/\.tsx?$/, '');
    if (name === entry.name || name.startsWith('_')) return [];
    return [name === 'index' ? prefix : [...prefix, name]];
  });
}
const SCREENS = screenPatterns(APP);

function isScreen(route: string) {
  const segments = route
    .split(/[?#]/)[0]
    .split('/')
    .filter((segment) => segment && !/^\(.+\)$/.test(segment));
  return SCREENS.some(
    (pattern) =>
      pattern.length === segments.length &&
      pattern.every((part, i) => /^\[.+\]$/.test(part) || part === segments[i]),
  );
}

const SPECIFIER = /['"`]((?:@\/|\.{1,2}\/)[^'"`\n]*)['"`]/g;

/** Where an import, `require` or `jest.mock` string points, relative to src/ and without extension. */
function resolveSpecifier(from: string, specifier: string) {
  const target = specifier.startsWith('@/')
    ? path.join(SRC, specifier.slice(2))
    : path.resolve(path.dirname(from), specifier);
  return posix(target)
    .replace(/\.(?:tsx?|js)$/, '')
    .replace(/\/index$/, '');
}

const isRemovedModule = (resolved: string) =>
  REMOVED_MODULES.includes(resolved) ||
  resolved === REMOVED_FOLDER ||
  resolved.startsWith(`${REMOVED_FOLDER}/`);

/** A route path inside a string, query and hash left off: '/add-bill?id=1' gives '/add-bill'. */
const ROUTE_STRING =
  /['"`]((?:\/(?:\([a-z-]+\)|\[[a-z]+\]|[a-z][a-z0-9-]*|\$\{[^}]*\}))+)(?=[?#'"`])/g;
const routeStringsIn = (source: string) =>
  [...source.matchAll(ROUTE_STRING)].map((match) => match[1]);

/**
 * Only code navigates: a comment may quote a route, and an object key like push.ts's '/bill': is
 * the token the server sends, whose value ('/bill/[id]') is the destination.
 */
const destinationsIn = (source: string) =>
  routeStringsIn(
    source
      .split('\n')
      .filter((line) => !/^\s*(?:\/\/|\/?\*)/.test(line))
      .join('\n')
      .replace(/^([ \t]*)['"`]\/[^'"`\n]*['"`](?=[ \t]*:)/gm, '$1'),
  );

describe('Splits stays removed', () => {
  it('names no removed route anywhere under src, and no screen answers one', () => {
    // A loop over an emptied list proves nothing, so the count is pinned too.
    expect(REMOVED_ROUTES).toHaveLength(8);
    // The pattern must be live for every removed name, and only for them.
    for (const name of REMOVED_ROUTES) {
      expect(removedRoutesIn(`router.push('/${name}')`)).toEqual([name]);
      expect(removedRoutesIn(`href="/${name}?id=1"`)).toEqual([name]);
      expect(removedRoutesIn(`go(\`/${name}\`)`)).toEqual([name]);
      expect(removedRoutesIn(`router.push('/(tabs)/${name}')`)).toEqual([name]);
    }
    expect(removedRoutesIn(`router.push('/add-receipt')`)).toEqual([]);
    expect(removedRoutesIn(`router.push('/friends-list')`)).toEqual([]);

    const named: Record<string, string[]> = {};
    for (const file of FILES) {
      const routes = removedRoutesIn(text(file));
      if (routes.length > 0) named[posix(file)] = routes;
    }
    // These two name the retired splits route on purpose: the app refusing an old push, and the
    // unchanged server still sending one. Exactly these, so an exemption nobody uses any more is
    // dropped here rather than left standing.
    expect(named).toEqual({
      'api/push.test.ts': ['splits'],
      '__tests__/supabase/push-card.test.ts': ['splits'],
    });

    expect(REMOVED_ROUTES.filter((name) => isScreen(`/${name}`))).toEqual([]);
  });

  it('imports or mocks no deleted module anywhere under src, and none is left on disk', () => {
    expect(REMOVED_MODULES).toHaveLength(3);
    // Each removed module as an importer could write it: by alias, from a sibling, from elsewhere.
    // Relative forms resolve from the importing file, so a sibling's './name' is caught too.
    const elsewhere = path.join(SRC, 'app', 'bills.tsx');
    const probes: [string, string][] = [
      ...REMOVED_MODULES.flatMap((module): [string, string][] => [
        [elsewhere, `@/${module}`],
        [path.join(SRC, path.dirname(module), 'neighbour.ts'), `./${path.basename(module)}`],
        [elsewhere, `../${module}.ts`],
      ]),
      [elsewhere, `@/${REMOVED_FOLDER}`],
      [elsewhere, `../${REMOVED_FOLDER}/person`],
      [path.join(SRC, 'components', 'ui', 'button.tsx'), '../splits/person'],
    ];
    for (const [from, specifier] of probes) {
      expect(isRemovedModule(resolveSpecifier(from, specifier))).toBe(true);
    }
    expect(isRemovedModule(resolveSpecifier(elsewhere, '@/lib/group'))).toBe(false);
    expect(isRemovedModule(resolveSpecifier(path.join(SRC, 'api', 'a.ts'), './pro'))).toBe(false);

    const importing: Record<string, string[]> = {};
    for (const file of FILES) {
      const hits = [...text(file).matchAll(SPECIFIER)]
        .map((match) => match[1])
        .filter((specifier) => isRemovedModule(resolveSpecifier(file, specifier)));
      if (hits.length > 0) importing[posix(file)] = hits;
    }
    expect(importing).toEqual({});

    const leftOnDisk = [
      ...REMOVED_MODULES.flatMap((module) => [`${module}.ts`, `${module}.tsx`]),
      REMOVED_FOLDER,
    ].filter((entry) => fs.existsSync(path.join(SRC, entry)));
    expect(leftOnDisk).toEqual([]);
  });

  it('points every route string in the app at a screen that exists, `as never` pushes included', () => {
    // Typed routes check a literal href but not one cast `as never` (tour, setup, the getting-started
    // card, plan detail and the setup lists do), so every route string in app code is checked here.
    expect(routeStringsIn(`router.push('/add-bill?id=1')`)).toEqual(['/add-bill']);
    expect(routeStringsIn('router.push(`/bill/${id}`)')).toEqual(['/bill/${id}']);
    expect(routeStringsIn(`<Link href="/terms" />`)).toEqual(['/terms']);
    expect(routeStringsIn(`headers: { accept: 'text/plain' }`)).toEqual([]);
    expect(destinationsIn(`// '/nowhere'\n * '/nowhere'\nrouter.push('/home')`)).toEqual(['/home']);
    expect(destinationsIn(`  '/bill': '/bill/[id]',\n  go(cond ? '/a' : '/b')`)).toEqual([
      '/bill/[id]',
      '/a',
      '/b',
    ]);
    for (const route of [
      '/home',
      '/salary',
      '/add-card',
      '/bill/${id}',
      '/bill/[id]',
      '/(tabs)/home',
    ]) {
      expect(isScreen(route)).toBe(true);
    }
    for (const route of ['/bill', '/nowhere', '/loan-calcuator']) {
      expect(isScreen(route)).toBe(false);
    }

    const appCode = FILES.filter(
      (file) => !/\.test\.tsx?$/.test(file) && !posix(file).startsWith('__tests__/'),
    );
    const dangling = appCode.flatMap((file) =>
      destinationsIn(text(file))
        .filter((route) => !isScreen(route))
        .map((route) => `${posix(file)}: ${route}`),
    );
    expect(dangling).toEqual([]);
  });
});
