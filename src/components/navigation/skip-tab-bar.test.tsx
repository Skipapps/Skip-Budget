import { fireEvent, render } from '@testing-library/react-native';

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

function renderBar(navigate = jest.fn(), emit = jest.fn(() => ({ defaultPrevented: false }))) {
  const props = {
    state: { index: 0, routes },
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
