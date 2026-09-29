import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Screen } from '@/components/ui/screen';

/**
 * The back chevron — and a flow's own header — never scroll away.
 *
 * Every page with a back button gets it from here, so pinning it here pins it
 * on all of them: Subscriptions, Receipts, the loan calculator and the rest.
 */

jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777' }),
}));

const insideScroll = (node: { type?: unknown; parent?: unknown } | null): boolean => {
  for (let at = node; at; at = at.parent as typeof node) {
    if (at.type === 'RCTScrollView') return true;
  }
  return false;
};

it('pins the back button above the scrolling content', async () => {
  const screen = await render(
    <Screen showBack>
      <Text>Page content</Text>
    </Screen>,
  );

  expect(insideScroll(screen.getByLabelText('Go back'))).toBe(false);
  expect(insideScroll(screen.getByText('Page content'))).toBe(true);
});

it('pins a screen header in the same place, in the back button’s stead', async () => {
  const screen = await render(
    <Screen showBack header={<Text>Flow header</Text>}>
      <Text>Step content</Text>
    </Screen>,
  );

  expect(insideScroll(screen.getByText('Flow header'))).toBe(false);
  expect(screen.queryByLabelText('Go back')).toBeNull();
  expect(insideScroll(screen.getByText('Step content'))).toBe(true);
});
