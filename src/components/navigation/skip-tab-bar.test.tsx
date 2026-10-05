import { fireEvent, render } from '@testing-library/react-native';

import type { JsonElement } from 'test-renderer';

import { SkipTabBar } from '@/components/navigation/skip-tab-bar';

/**
 * What the tab bar is allowed to take a touch for.
 *
 * The bar draws a pill, but the view it lives in is taller and wider than that
 * pill: 8pt above it, the home indicator's inset below it, and the page gutter
 * either side — all painted in the page's own colour, so on screen that band
 * is indistinguishable from the page. A touch landing there must go through to
 * whatever is behind rather than counting as a press on the bar.
 *
 * Asserted structurally because there is no layout engine here to tap into: the
 * outer view must be `box-none` (draws, does not receive), the pill and its
 * buttons must not be, and the padding must be exactly what it was.
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
    // The bar's props come from the navigator; this is as much of them as it
    // reads, cast rather than reconstructed whole.
  } as unknown as Parameters<typeof SkipTabBar>[0];

  return { props, navigate, emit };
}

describe('SkipTabBar — what takes a touch', () => {
  it('lets the band around the pill through, and keeps the pill itself', async () => {
    const { props } = renderBar();
    const { toJSON } = await render(<SkipTabBar {...props} />);

    // The rendered host tree: the outer band, the row inside it holding the
    // pill and the Voice button, and the pill.
    const band = toJSON()!;
    const row = (band.children as JsonElement[])[0];
    const pill = (row.children as JsonElement[])[0];

    // The outer view paints the strip above and below the pill, and the row
    // spans the gap between the pill and the Voice button. Neither receives
    // touches, so a tap on empty page there reaches the page.
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
