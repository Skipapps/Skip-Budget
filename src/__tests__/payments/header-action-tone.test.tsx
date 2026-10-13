import { fireEvent, render, screen } from '@testing-library/react-native';
import { Plus, Search } from 'lucide-react-native';
import { Text } from 'react-native';

import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';

/**
 * Header actions are tinted circles unless a page asks for the plain one: the Monthly bills page
 * draws Search white with a hairline beside a tinted Add. Every page that asks for nothing draws
 * exactly as it always has.
 */

// Each icon is a view named after itself that keeps the colour it was drawn in.
jest.mock('lucide-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return new Proxy(
    {},
    {
      get:
        (_target, name) =>
        ({ color }: { color?: string }) =>
          createElement(View, { testID: `icon-${String(name)}`, iconColor: color }),
    },
  );
});
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn() }));
// A colour of its own per token (real ones: the back arrow's SVG refuses anything else), so a test
// can tell which one was used.
const INK = '#000001';
const TINT_INK = '#000002';
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000001', tintInk: '#000002', muted: '#000003' }),
}));

/** The class every header action has always had. */
const TINTED = 'items-center justify-center rounded-full bg-tint active:opacity-70';

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;

/** The colour of every spinner drawn. */
function spinnerColours(tree: Tree): unknown[] {
  const found: unknown[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') return;
    if (node.type === 'ActivityIndicator') found.push(node.props.color);
    node.children?.forEach(walk);
  };
  (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return found;
}

describe('a header action’s tone', () => {
  it('stays the tinted circle when a page asks for nothing', async () => {
    await render(
      <PageHeader title="Loans" actions={[{ icon: Plus, label: 'Add', onPress: jest.fn() }]} />,
    );
    expect(screen.getByRole('button', { name: 'Add' }).props.className).toBe(TINTED);
    expect(screen.getByTestId('icon-Plus').props.iconColor).toBe(TINT_INK);
  });

  it('draws Search plain and Add tinted, side by side, both still pressable', async () => {
    const search = jest.fn();
    const add = jest.fn();
    await render(
      <Screen
        title="Monthly bills"
        showBack
        headerActions={[
          { icon: Search, label: 'Search payments', onPress: search, tone: 'plain' },
          { icon: Plus, label: 'Add bill', onPress: add, tone: 'tinted' },
        ]}
      >
        <Text>Page</Text>
      </Screen>,
    );

    const plain = screen.getByRole('button', { name: 'Search payments' });
    expect(plain.props.className).toContain('border border-line bg-card');
    expect(plain.props.className).not.toContain('bg-tint');
    expect(plain.props.className).toContain('rounded-full');
    expect(screen.getByTestId('icon-Search').props.iconColor).toBe(INK);

    expect(screen.getByRole('button', { name: 'Add bill' }).props.className).toBe(TINTED);
    expect(screen.getByTestId('icon-Plus').props.iconColor).toBe(TINT_INK);

    await fireEvent.press(plain);
    await fireEvent.press(screen.getByRole('button', { name: 'Add bill' }));
    expect(search).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledTimes(1);
  });

  it('spins in the plain tone’s ink while busy', async () => {
    await render(
      <PageHeader
        title="Payment history"
        actions={[{ icon: Search, label: 'Search', onPress: jest.fn(), tone: 'plain', busy: true }]}
      />,
    );
    const button = screen.getByRole('button', { name: 'Search' });
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    expect(screen.queryByTestId('icon-Search')).toBeNull();
    expect(spinnerColours(screen.toJSON() as Tree)).toEqual([INK]);
  });
});
