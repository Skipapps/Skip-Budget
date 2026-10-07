/**
 * The real expo-router Stack and Tabs with the app's remount layouts: a language or currency change
 * keeps the route and the back stack, remounts every mounted screen, and never resets the tabs.
 */

import { router, Stack, Tabs } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { useState } from 'react';
import { Text, TextInput } from 'react-native';

import { t, useLocale } from '@/i18n';
import { localeScreenLayout, rootScreenLayout } from '@/i18n/locale-provider';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { formatCurrency } from '@/lib/format';

jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));

const mounts: Record<string, number> = {};
const page = (name: string) =>
  function Page() {
    const [typed] = useState(() => `typed-${name}-${Math.random()}`);
    useState(() => {
      mounts[name] = (mounts[name] ?? 0) + 1;
      return 0;
    });
    return (
      <>
        <Text>{`page:${name} ${t('nav.home')} ${formatCurrency(1234.5)}`}</Text>
        <TextInput testID={`input-${name}`} defaultValue={typed} />
      </>
    );
  };

let rootRouteNames: string[] = [];
const RootLayout = () => (
  <Stack
    screenOptions={{ headerShown: false }}
    screenLayout={(props) => {
      rootRouteNames.push(props.route.name);
      return rootScreenLayout(props);
    }}
  />
);
const TabsLayout = () => {
  useLocale();
  return (
    <Tabs
      screenLayout={localeScreenLayout}
      detachInactiveScreens={false}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: t('nav.home') }} />
      <Tabs.Screen name="cards" options={{ title: t('nav.cards') }} />
    </Tabs>
  );
};

const FILES = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/home': page('home'),
  '(tabs)/cards': page('cards'),
  'settings/preferences': page('preferences'),
  'add-bill': page('add-bill'),
};

beforeEach(() => {
  resetLocaleForTests([{ languageCode: 'en', regionCode: 'US' }]);
  for (const k of Object.keys(mounts)) delete mounts[k];
  rootRouteNames = [];
});

async function open(initialUrl: string) {
  const routed = renderRouter(FILES, { initialUrl });
  await routed;
  return { getPathname: () => routed.getPathname(), getSegments: () => routed.getSegments() };
}

it('names the tab group "(tabs)" in the root stack', async () => {
  await open('/cards');
  expect(new Set(rootRouteNames)).toContain('(tabs)');
});

it('keeps the tab, the stack and back-navigation through a language and currency change, and remounts every screen', async () => {
  const app = await open('/cards');
  await act(() => router.push('/settings/preferences'));
  expect(app.getPathname()).toBe('/settings/preferences');
  const before = { ...mounts };

  await act(() => setLanguage('fr'));
  expect(app.getPathname()).toBe('/settings/preferences');
  expect(app.getSegments()).toEqual(['settings', 'preferences']);
  expect(screen.getByText(/page:preferences Accueil 1\s234,50\s\$/)).toBeTruthy();
  expect(mounts.preferences).toBe(before.preferences + 1);
  expect(mounts.cards).toBe(before.cards + 1);

  await act(() => setCurrency('GBP'));
  expect(screen.getByText(/page:preferences Accueil 1\s234,50\s£/)).toBeTruthy();

  await act(() => router.back());
  expect(app.getPathname()).toBe('/cards');
  expect(screen.getByText(/page:cards Accueil/)).toBeTruthy();
});

it('remounts a form pushed above the tabs (typed state is lost) when the currency changes', async () => {
  await open('/home');
  await act(() => router.push('/add-bill'));
  const input = screen.getByTestId('input-add-bill');
  const typedBefore = input.props.defaultValue;
  await act(() => setCurrency('CAD'));
  const after = screen.getByTestId('input-add-bill').props.defaultValue;
  expect(after).not.toBe(typedBefore);
  expect(mounts['add-bill']).toBe(2);
});
