import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { localeScreenLayout, rootScreenLayout } from '@/i18n/locale-provider';
import { resetLocaleForTests } from '@/i18n/store';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {},
}));

beforeEach(() => {
  resetLocaleForTests();
});

describe('rootScreenLayout', () => {
  const child = <Text testID="screen">hello</Text>;

  it('leaves the tab navigator alone, so it is never sent back to the first tab', () => {
    expect(rootScreenLayout({ route: { name: '(tabs)' }, children: child })).toBe(child);
  });

  it('wraps every other screen so it remounts with the language', async () => {
    const wrapped = rootScreenLayout({ route: { name: 'add-bill' }, children: child });
    expect(wrapped).not.toBe(child);

    await render(wrapped);
    expect(screen.getByTestId('screen')).toBeTruthy();
  });

  it('can be called as a plain function, as React Navigation does', () => {
    expect(() => localeScreenLayout({ children: child })).not.toThrow();
  });
});
