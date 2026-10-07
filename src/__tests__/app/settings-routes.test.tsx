import fs from 'node:fs';
import path from 'node:path';

import { router, Stack, Tabs } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

/**
 * Where the Settings URLs land in the app's real file tree. Every route file under src/app is
 * stood in by a page that prints its own file name, so a new file that collided with the Settings
 * tab, or a page that landed in the wrong navigator, shows here without the real screens.
 */

const APP = path.join(__dirname, '..', '..', 'app');

/** Route files as expo-router keys them: relative to src/app, no extension. */
function routeFiles(dir: string, prefix = ''): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix + entry.name;
    if (entry.isDirectory()) return routeFiles(path.join(dir, entry.name), `${name}/`);
    return /\.tsx?$/.test(entry.name) ? [name.replace(/\.tsx?$/, '')] : [];
  });
}

const page = (file: string) =>
  function Page() {
    return <Text>{`file:${file}`}</Text>;
  };

const RootLayout = () => <Stack screenOptions={{ headerShown: false }} />;
const TabsLayout = () => <Tabs screenOptions={{ headerShown: false }} />;

const FILES = Object.fromEntries(
  routeFiles(APP).map((file) => [
    file,
    file === '_layout' ? RootLayout : file === '(tabs)/_layout' ? TabsLayout : page(file),
  ]),
);

const PAGES = [
  ['/settings/preferences', 'settings/preferences'],
  ['/settings/your-money', 'settings/your-money'],
  ['/settings/about', 'settings/about'],
  ['/settings/support', 'settings/support'],
] as const;

const showing = (file: string) => expect(screen.getByText(`file:${file}`)).toBeVisible();

/**
 * With @testing-library/react-native 14 the render inside renderRouter is async, so its route
 * getters land on the returned promise rather than on `screen` (and awaiting that promise drops
 * them). This keeps hold of them.
 */
async function open(initialUrl: string) {
  const routed = renderRouter(FILES, { initialUrl });
  await routed;
  return {
    getPathname: () => routed.getPathname(),
    getSegments: () => routed.getSegments(),
  };
}

describe('Settings routes', () => {
  it('still opens the Settings tab at /settings', async () => {
    const app = await open('/settings');

    expect(app.getPathname()).toBe('/settings');
    expect(app.getSegments()).toEqual(['(tabs)', 'settings']);
    showing('(tabs)/settings');
  });

  it.each(PAGES)(
    'pushes %s above the tabs, and back returns to the main page',
    async (href, file) => {
      const app = await open('/settings');

      await act(() => router.push(href));

      expect(app.getPathname()).toBe(href);
      expect(app.getSegments()).toEqual(file.split('/'));
      showing(file);

      await act(() => router.back());

      expect(app.getPathname()).toBe('/settings');
      showing('(tabs)/settings');
    },
  );

  it.each(PAGES)('opens %s from a link with nothing beneath it', async (href, file) => {
    const app = await open(href);

    expect(app.getPathname()).toBe(href);
    showing(file);
  });

  it.each([
    ['/settings/support', '/home', '(tabs)/home'],
    ['/settings/your-money', '/cards', '(tabs)/cards'],
  ])('leaves %s for the %s tab without a second tab bar', async (from, tab, file) => {
    const app = await open('/settings');
    await act(() => router.push(from as never));

    await act(() => router.dismissTo(tab as never));

    expect(app.getPathname()).toBe(tab);
    showing(file);
    // The page is gone, so there is nothing left to pop: the tab bar is the top of the app again.
    expect(router.canDismiss()).toBe(false);
  });

  it('comes back to the page a row opened from', async () => {
    const app = await open('/settings');
    await act(() => router.push('/settings/preferences'));

    await act(() => router.push('/reminders'));
    showing('reminders');

    await act(() => router.back());
    expect(app.getPathname()).toBe('/settings/preferences');
  });
});
