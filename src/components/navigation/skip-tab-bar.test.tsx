import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import type { JsonElement } from 'test-renderer';

import { SkipTabBar } from '@/components/navigation/skip-tab-bar';

/**
 * The bar's view is taller and wider than the pill (8pt above, the home indicator's inset below,
 * the page gutter either side, all in the page colour), and a touch there must reach whatever is
 * behind. Asserted structurally, with no layout engine to tap into: the outer view is `box-none`,
 * the pill and its buttons are not, and the padding is unchanged.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ onControl: '#FFFFFF', muted: '#777777' }),
}));

jest.mock('@/lib/press', () => ({ withTap: (handler?: () => void) => handler }));

// Its own test covers it (voice-fab.test.tsx); here it only has to take up room.
jest.mock('@/components/voice/voice-fab', () => ({ VoiceFab: () => null, VOICE_FAB_SIZE: 64 }));

const routes = [
  { key: 'home-1', name: 'home' },
  { key: 'cards-1', name: 'cards' },
  { key: 'transactions-1', name: 'transactions' },
  { key: 'settings-1', name: 'settings' },
];

const titles: Record<string, string> = {
  home: 'Home',
  cards: 'Cards',
  transactions: 'Activity',
  settings: 'Settings',
};

function renderBar(
  navigate = jest.fn(),
  emit = jest.fn(() => ({ defaultPrevented: false })),
  index = 0,
) {
  const props = {
    state: { index, routes },
    descriptors: Object.fromEntries(
      routes.map((route) => [route.key, { options: { title: titles[route.name] } }]),
    ),
    navigation: { emit, navigate },
    // Only what the bar reads from the navigator's props, cast rather than reconstructed.
  } as unknown as Parameters<typeof SkipTabBar>[0];

  return { props, navigate, emit };
}

describe('SkipTabBar — what takes a touch', () => {
  it('lets the band around the pill through, and keeps the pill itself', async () => {
    const { props } = renderBar();
    const { toJSON } = await render(<SkipTabBar {...props} />);

    const band = toJSON()!;
    const row = (band.children as JsonElement[])[0];
    const pill = (row.children as JsonElement[])[0];

    // Neither the band nor the row receives touches, so a tap on empty page there reaches the page.
    expect(band.props.pointerEvents).toBe('box-none');
    expect(row.props.pointerEvents).toBe('box-none');
    // The pill is visible, so it is not see-through to touches.
    expect(pill.props.pointerEvents).toBeUndefined();
  });

  it('keeps the safe-area padding exactly as it was', async () => {
    const { props } = renderBar();
    const { toJSON } = await render(<SkipTabBar {...props} />);

    const band = toJSON()!;

    // The home indicator's inset, floored at 12 for a phone that has none.
    expect(band.props.style).toEqual(expect.objectContaining({ paddingBottom: 34 }));
  });

  it('still navigates when a button is pressed', async () => {
    const { props, navigate } = renderBar();
    const { getByLabelText } = await render(<SkipTabBar {...props} />);

    fireEvent.press(getByLabelText('Cards'));

    expect(navigate).toHaveBeenCalledWith('cards');
  });

  it('does not navigate to the tab already open', async () => {
    const { props, navigate } = renderBar();
    const { getByLabelText } = await render(<SkipTabBar {...props} />);

    fireEvent.press(getByLabelText('Home'));

    expect(navigate).not.toHaveBeenCalled();
  });
});

const SETTINGS = routes.findIndex((route) => route.name === 'settings');

/** A phone window this wide; useWindowDimensions follows Dimensions. */
function windowOf(width: number) {
  const window = { width, height: 844, scale: 3, fontScale: 1 };
  Dimensions.set({ window, screen: window });
}

const flat = (style: unknown) => StyleSheet.flatten(style as never) as Record<string, unknown>;

/** Each tab's width and whether it shows its name, in route order. */
function widths(screen: Awaited<ReturnType<typeof render>>) {
  return routes.map((route) => flat(screen.getByLabelText(titles[route.name]).props.style).width);
}

/**
 * The selected label once came out as "…" with the pill past the bar after a few switches, when
 * the pill was sized by shrinking around its measured label. Widths now come from the window width
 * alone, so they are pinned here as numbers, for every switch between every pair of tabs.
 */
describe('SkipTabBar — widths come from the window, not the label', () => {
  beforeEach(() => windowOf(375));

  it('gives the selected pill and the icon tabs fixed widths that fit a 375pt window', async () => {
    const { props } = renderBar(undefined, undefined, SETTINGS);
    const screen = await render(<SkipTabBar {...props} />);

    // 249pt inside the bar: three 39pt icons and a 130pt pill.
    expect(widths(screen)).toEqual([39, 39, 39, 130]);
    for (const route of routes) {
      const style = flat(screen.getByLabelText(titles[route.name]).props.style);
      expect(style).toEqual(expect.objectContaining({ height: 48, flexShrink: 0 }));
    }
  });

  it('gives every tab the same style keys, selected or not, so a switch only changes values', async () => {
    const { props } = renderBar(undefined, undefined, SETTINGS);
    const screen = await render(<SkipTabBar {...props} />);

    const keys = routes.map((route) =>
      Object.keys(flat(screen.getByLabelText(titles[route.name]).props.style)).sort(),
    );
    for (const set of keys) expect(set).toEqual(keys[0]);
  });

  it('shrinks the label’s font as the last resort, never truncating it', async () => {
    const { props } = renderBar(undefined, undefined, SETTINGS);
    const { getByText } = await render(<SkipTabBar {...props} />);

    const label = getByText('Settings');
    expect(flat(label.props.style).maxWidth).toBe(78);
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(label.props.minimumFontScale).toBe(0.6);
    expect(label.props.maxFontSizeMultiplier).toBe(1.2);
    expect(label.props.ellipsizeMode).toBeUndefined();
  });

  it('keeps an icon tab narrower than 44pt reachable with hit slop', async () => {
    const { props } = renderBar(undefined, undefined, SETTINGS);
    const { getByLabelText } = await render(<SkipTabBar {...props} />);

    for (const label of ['Home', 'Cards', 'Activity']) {
      const tab = getByLabelText(label);
      const { left, right } = tab.props.hitSlop as { left: number; right: number };
      expect((flat(tab.props.style).width as number) + left + right).toBeGreaterThanOrEqual(44);
    }
  });

  it('follows the window width (Display Zoom, Split View)', async () => {
    windowOf(428);
    const { props } = renderBar(undefined, undefined, SETTINGS);
    const screen = await render(<SkipTabBar {...props} />);

    expect(widths(screen)).toEqual([48, 48, 48, 130]);
  });

  const pairs = routes.flatMap((from, a) =>
    routes.flatMap((to, b) => (a === b ? [] : [[from.name, to.name, a, b] as const])),
  );

  it.each(pairs)(
    'switching from %s to %s lays the bar out as if it opened there, every time',
    async (_from, to, a, b) => {
      const expected = routes.map((_, index) => (index === b ? 130 : 39));
      const at = (index: number) => renderBar(undefined, undefined, index).props;

      const screen = await render(<SkipTabBar {...at(a)} />);
      for (let round = 0; round < 3; round++) {
        await screen.rerender(<SkipTabBar {...at(b)} />);
        expect(widths(screen)).toEqual(expected);
        expect(screen.getByText(titles[to])).toBeTruthy();
        expect(flat(screen.getByText(titles[to]).props.style).maxWidth).toBe(78);
        await screen.rerender(<SkipTabBar {...at(a)} />);
      }

      const fresh = await render(<SkipTabBar {...at(b)} />);
      expect(widths(fresh)).toEqual(expected);
    },
  );
});

describe('SkipTabBar — what each tab says and does', () => {
  it('labels every tab, says which one is open, and shows only that one’s name', async () => {
    const { props } = renderBar(undefined, undefined, SETTINGS);
    const { getByLabelText, getByText, queryByText } = await render(<SkipTabBar {...props} />);

    for (const route of routes) {
      const tab = getByLabelText(titles[route.name]);
      expect(tab.props.accessibilityRole).toBe('button');
      expect(tab.props.accessibilityState).toEqual({ selected: route.name === 'settings' });
    }
    expect(getByText('Settings')).toBeTruthy();
    for (const label of ['Home', 'Cards', 'Activity']) expect(queryByText(label)).toBeNull();
  });

  it('still opens every other tab from the Settings tab', async () => {
    const { props, navigate } = renderBar(undefined, undefined, SETTINGS);
    const { getByLabelText } = await render(<SkipTabBar {...props} />);

    for (const label of ['Home', 'Cards', 'Activity', 'Settings']) {
      fireEvent.press(getByLabelText(label));
    }

    expect(navigate.mock.calls).toEqual([['home'], ['cards'], ['transactions']]);
  });
});
