import { act, render } from '@testing-library/react-native';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { contrast } from '@/lib/tone';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { ToastProvider } from '@/providers/toast-provider';
import { useToast, type ShowToast } from '@/providers/toast-context';
import { buildTokens, type Scheme } from '@/theme/palette';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The bottom toast every save and delete ends with. Pinned: it shows the message in the language on
 * screen, with a check for something done and a cross for something removed; it is announced to a
 * screen reader and left out of the accessibility tree rather than read twice; one shows at a time,
 * the newest replacing the last and restarting the clock; it goes after 2.2 seconds; it is drawn in
 * the theme's ink on its surface in both schemes; and asking for one outside the provider (a screen
 * on its own) does nothing.
 */

// Reanimated's worklets need the native runtime, which Jest does not have.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const animation = { duration: () => ({}) };
  return { __esModule: true, default: { View }, FadeInDown: animation, FadeOutDown: animation };
});

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Check: (props: object) => <View testID="icon-check" {...props} />,
    X: (props: object) => <View testID="icon-x" {...props} />,
  };
});

let mockBottomInset = 0;
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: mockBottomInset, left: 0, right: 0 }),
}));

let mockScheme: Scheme = 'light';
jest.mock('@/providers/theme-provider', () => {
  const { buildTokens: tokens } = jest.requireActual('@/theme/palette');
  return { useColors: () => tokens(mockScheme) };
});

/** Hands the test the function a screen would raise a toast with. */
const held: { toast: ShowToast } = { toast: () => {} };
function Grab() {
  const raiseIt = useToast();
  useEffect(() => {
    held.toast = raiseIt;
  });
  return null;
}

const HIDDEN = { includeHiddenElements: true };

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

async function mount() {
  const screen = await render(
    <ToastProvider>
      <Grab />
    </ToastProvider>,
  );
  return screen;
}

async function raise(...args: Parameters<ShowToast>) {
  await act(async () => held.toast(...args));
}

async function wait(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

type Screen = Awaited<ReturnType<typeof mount>>;

const VISIBLE_MS = 2200;

/** The timers the toast started for its own clock, and which of them were cleared since. */
function toastClock() {
  const started = jest.spyOn(globalThis, 'setTimeout');
  const cleared = jest.spyOn(globalThis, 'clearTimeout');
  return {
    /** Handles of every timer set for the toast's length. */
    handles: () =>
      started.mock.results
        .filter((_, index) => started.mock.calls[index][1] === VISIBLE_MS)
        .map((result) => result.value as unknown),
    cleared: () => cleared.mock.calls.map(([handle]) => handle as unknown),
    restore: () => {
      started.mockRestore();
      cleared.mockRestore();
    },
  };
}

/** The pill the message sits in: the nearest parent that paints a background. */
function pillOf(screen: Screen, message: string) {
  for (let at = screen.getByText(message, HIDDEN).parent; at; at = at.parent) {
    if (StyleSheet.flatten(at.props.style)?.backgroundColor) return at;
  }
  throw new Error('no pill behind the message');
}

beforeEach(() => {
  jest.useFakeTimers();
  resetLocaleForTests();
  announce.mockReset();
  mockBottomInset = 0;
  mockScheme = 'light';
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => resetLocaleForTests());

describe('Showing a toast', () => {
  it('draws nothing until a screen asks for one', async () => {
    const screen = await mount();

    expect(screen.queryByText('Card added', HIDDEN)).toBeNull();
    expect(screen.queryByTestId('icon-check')).toBeNull();
    expect(screen.queryByTestId('icon-x')).toBeNull();
    expect(announce).not.toHaveBeenCalled();
  });

  it('shows the message for the key it was asked for', async () => {
    const screen = await mount();

    await raise('toast.card.added');

    expect(screen.getByText('Card added', HIDDEN)).toBeTruthy();
  });

  it('shows something done with a check, and nothing else', async () => {
    const screen = await mount();

    await raise('toast.bill.updated');

    expect(screen.getByTestId('icon-check', HIDDEN)).toBeTruthy();
    expect(screen.queryByTestId('icon-x', HIDDEN)).toBeNull();
  });

  it('shows something done with a check when no tone is given, or "done" is', async () => {
    const screen = await mount();

    await raise('toast.card.added', 'done');

    expect(screen.getByTestId('icon-check', HIDDEN)).toBeTruthy();
  });

  it('shows something removed with a cross, and nothing else', async () => {
    const screen = await mount();

    await raise('toast.card.deleted', 'deleted');

    expect(screen.getByText('Card deleted', HIDDEN)).toBeTruthy();
    expect(screen.getByTestId('icon-x', HIDDEN)).toBeTruthy();
    expect(screen.queryByTestId('icon-check', HIDDEN)).toBeNull();
  });

  it('draws the mark white, on a green tile for done and a red one for deleted', async () => {
    const screen = await mount();

    await raise('toast.card.added');
    const check = screen.getByTestId('icon-check', HIDDEN);
    expect(check.props.color).toBe('#FFFFFF');
    expect(StyleSheet.flatten(check.parent?.props.style).backgroundColor).toBe('#2FA46B');

    await raise('toast.card.deleted', 'deleted');
    const cross = screen.getByTestId('icon-x', HIDDEN);
    expect(cross.props.color).toBe('#FFFFFF');
    expect(StyleSheet.flatten(cross.parent?.props.style).backgroundColor).toBe('#E5484D');
  });

  it.each([
    ['done', '#2FA46B'],
    ['deleted', '#E5484D'],
  ] as const)('keeps the white mark readable on the %s tile', (_tone, tile) => {
    // Not text, but a glyph that carries the meaning: the 3:1 floor for graphics.
    expect(contrast('#FFFFFF', tile)).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['en', 'Card added', 'Card deleted'],
    ['es', 'Tarjeta agregada', 'Tarjeta eliminada'],
    ['fr', 'Carte ajoutée', 'Carte supprimée'],
  ] as const)('says it in the language on screen: %s', async (language, added, deleted) => {
    setLanguage(language);
    const screen = await mount();

    await raise('toast.card.added');
    expect(screen.getByText(added, HIDDEN)).toBeTruthy();

    await raise('toast.card.deleted', 'deleted');
    expect(screen.getByText(deleted, HIDDEN)).toBeTruthy();
  });

  it('lets a long message wrap inside the pill, and grow with the text size up to its ceiling', async () => {
    const screen = await mount();

    await raise('toast.card.added');

    const message = screen.getByText('Card added', HIDDEN);
    expect(String(message.props.className)).toContain('shrink');
    expect(message.props.maxFontSizeMultiplier).toBe(TEXT_CAP.control);
    expect(String(pillOf(screen, 'Card added').props.className)).toContain('max-w-full');
  });
});

describe('Telling a screen reader', () => {
  it('announces the message once, in the language on screen', async () => {
    setLanguage('es');
    await mount();

    await raise('toast.card.added');

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Tarjeta agregada');
  });

  it('announces a removal the same way', async () => {
    await mount();

    await raise('toast.bill.deleted', 'deleted');

    expect(announce).toHaveBeenCalledWith('Bill deleted');
  });

  it('announces each toast as it comes, the newer after the older', async () => {
    await mount();

    await raise('toast.card.added');
    await raise('toast.card.deleted', 'deleted');

    expect(announce.mock.calls).toEqual([['Card added'], ['Card deleted']]);
  });

  it('announces a toast again when the same one is raised twice', async () => {
    await mount();

    await raise('toast.card.added');
    await raise('toast.card.added');

    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('leaves the pill out of the accessibility tree, so it is heard once', async () => {
    const screen = await mount();

    await raise('toast.card.added');

    expect(screen.queryByText('Card added')).toBeNull();
    const pill = pillOf(screen, 'Card added');
    expect(pill.props.accessibilityElementsHidden).toBe(true);
    expect(pill.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('lets taps through to what is under it', async () => {
    const screen = await mount();

    await raise('toast.card.added');

    let layer = pillOf(screen, 'Card added').parent;
    while (layer && layer.props.pointerEvents === undefined) layer = layer.parent;
    expect(layer?.props.pointerEvents).toBe('none');
  });
});

describe('Where it sits', () => {
  it('floats above the tab bar and a pinned Save button', async () => {
    const screen = await mount();

    await raise('toast.card.added');

    let layer = pillOf(screen, 'Card added').parent;
    while (layer && !StyleSheet.flatten(layer.props.style)?.bottom) layer = layer.parent;
    expect(StyleSheet.flatten(layer?.props.style).bottom).toBe(92);
  });

  it('adds the bottom safe area to that, so a phone with a home indicator clears it too', async () => {
    mockBottomInset = 34;
    const screen = await mount();

    await raise('toast.card.added');

    let layer = pillOf(screen, 'Card added').parent;
    while (layer && !StyleSheet.flatten(layer.props.style)?.bottom) layer = layer.parent;
    expect(StyleSheet.flatten(layer?.props.style).bottom).toBe(126);
  });
});

describe('One at a time', () => {
  it('replaces the toast on screen with the newer one', async () => {
    const screen = await mount();

    await raise('toast.card.added');
    await raise('toast.bill.deleted', 'deleted');

    expect(screen.queryByText('Card added', HIDDEN)).toBeNull();
    expect(screen.getByText('Bill deleted', HIDDEN)).toBeTruthy();
    expect(screen.queryAllByTestId('icon-check', HIDDEN)).toHaveLength(0);
    expect(screen.queryAllByTestId('icon-x', HIDDEN)).toHaveLength(1);
  });

  it('shows one pill, however many are raised', async () => {
    const screen = await mount();

    await raise('toast.card.added');
    await raise('toast.account.added');
    await raise('toast.bill.added');

    expect(screen.queryAllByTestId(/^icon-/, HIDDEN)).toHaveLength(1);
    expect(screen.getByText('Bill added', HIDDEN)).toBeTruthy();
  });

  it('draws the same message again as a new pill', async () => {
    const screen = await mount();
    await raise('toast.card.added');
    const first = screen.getByText('Card added', HIDDEN);

    await raise('toast.card.added');

    expect(screen.queryAllByText('Card added', HIDDEN)).toHaveLength(1);
    // A fresh pill so its entrance plays again: not the one that was already there.
    expect(screen.getByText('Card added', HIDDEN)).not.toBe(first);
  });

  it('starts the clock again for the newer toast, not the older one', async () => {
    const screen = await mount();
    await raise('toast.card.added');
    await wait(2000);

    await raise('toast.bill.added');
    // The first would have gone at 2200; the second has had 300.
    await wait(300);
    expect(screen.getByText('Bill added', HIDDEN)).toBeTruthy();

    await wait(1899);
    expect(screen.getByText('Bill added', HIDDEN)).toBeTruthy();

    await wait(1);
    expect(screen.queryByText('Bill added', HIDDEN)).toBeNull();
  });

  it('stops the older toast’s clock when a newer one comes', async () => {
    const clock = toastClock();
    await mount();

    await raise('toast.card.added');
    await raise('toast.bill.added');
    await raise('toast.account.added');

    const handles = clock.handles();
    expect(handles).toHaveLength(3);
    expect(clock.cleared()).toEqual(expect.arrayContaining(handles.slice(0, 2)));
    expect(clock.cleared()).not.toContain(handles[2]);
    clock.restore();
  });
});

describe('Going away', () => {
  it('stays for 2.2 seconds, then goes', async () => {
    const screen = await mount();

    await raise('toast.card.added');
    await wait(2199);
    expect(screen.getByText('Card added', HIDDEN)).toBeTruthy();

    await wait(1);
    expect(screen.queryByText('Card added', HIDDEN)).toBeNull();
    expect(screen.queryByTestId('icon-check', HIDDEN)).toBeNull();
  });

  it('removes a "deleted" toast on the same clock', async () => {
    const screen = await mount();

    await raise('toast.card.deleted', 'deleted');
    await wait(2200);

    expect(screen.queryByText('Card deleted', HIDDEN)).toBeNull();
    expect(screen.queryByTestId('icon-x', HIDDEN)).toBeNull();
  });

  it('can show another after the first has gone', async () => {
    const screen = await mount();
    await raise('toast.card.added');
    await wait(2200);

    await raise('toast.bill.added');

    expect(screen.getByText('Bill added', HIDDEN)).toBeTruthy();
    await wait(2200);
    expect(screen.queryByText('Bill added', HIDDEN)).toBeNull();
  });

  it('stops the clock when the app unmounts it, rather than hiding a toast that is gone', async () => {
    const clock = toastClock();
    const screen = await mount();
    await raise('toast.card.added');
    const [handle] = clock.handles();
    expect(clock.cleared()).not.toContain(handle);

    await screen.unmount();

    expect(clock.cleared()).toContain(handle);
    clock.restore();
  });
});

describe.each([['light'], ['dark']] as const)('In the %s scheme', (scheme) => {
  beforeEach(() => {
    mockScheme = scheme;
  });

  it('is drawn in the theme’s ink, with the theme’s surface for the words', async () => {
    const colors = buildTokens(scheme);
    const screen = await mount();

    await raise('toast.card.added');

    expect(StyleSheet.flatten(pillOf(screen, 'Card added').props.style).backgroundColor).toBe(
      colors.ink,
    );
    expect(StyleSheet.flatten(screen.getByText('Card added', HIDDEN).props.style).color).toBe(
      colors.surface,
    );
  });

  it('reads at least 4.5:1, words against pill', async () => {
    const colors = buildTokens(scheme);

    expect(contrast(colors.surface, colors.ink)).toBeGreaterThanOrEqual(4.5);
  });

  it('paints a removal the same way: the tone is the mark, not the pill', async () => {
    const colors = buildTokens(scheme);
    const screen = await mount();

    await raise('toast.card.deleted', 'deleted');

    expect(StyleSheet.flatten(pillOf(screen, 'Card deleted').props.style).backgroundColor).toBe(
      colors.ink,
    );
  });
});

describe('The two schemes', () => {
  it('follows the scheme when it changes while one is showing', async () => {
    const screen = await mount();
    await raise('toast.card.added');
    expect(StyleSheet.flatten(pillOf(screen, 'Card added').props.style).backgroundColor).toBe(
      buildTokens('light').ink,
    );

    mockScheme = 'dark';
    await screen.rerender(
      <ToastProvider>
        <Grab />
      </ToastProvider>,
    );

    expect(StyleSheet.flatten(pillOf(screen, 'Card added').props.style).backgroundColor).toBe(
      buildTokens('dark').ink,
    );
  });
});

describe('The function a screen raises a toast with', () => {
  it('is the same function from one render to the next', async () => {
    const screen = await mount();
    const first = held.toast;

    await screen.rerender(
      <ToastProvider>
        <Grab />
      </ToastProvider>,
    );
    await raise('toast.card.added');
    await screen.rerender(
      <ToastProvider>
        <Grab />
      </ToastProvider>,
    );

    expect(held.toast).toBe(first);
  });
});

describe('Asking for a toast outside the provider', () => {
  function Alone({ keyName }: { keyName: Parameters<ShowToast>[0] }) {
    const raiseIt = useToast();
    raiseIt(keyName);
    raiseIt(keyName, 'deleted');
    return null;
  }

  it('does nothing and breaks nothing', async () => {
    const clock = toastClock();
    const screen = await render(<Alone keyName="toast.card.added" />);

    expect(screen.queryByText('Card added', HIDDEN)).toBeNull();
    expect(announce).not.toHaveBeenCalled();
    expect(clock.handles()).toEqual([]);
    clock.restore();
  });

  it('hands back a function every time', async () => {
    const probed: { toast?: ShowToast } = {};
    function Probe() {
      const raiseIt = useToast();
      useEffect(() => {
        probed.toast = raiseIt;
      });
      return null;
    }

    await render(<Probe />);

    expect(typeof probed.toast).toBe('function');
    expect(probed.toast?.('toast.card.added')).toBeUndefined();
  });
});
