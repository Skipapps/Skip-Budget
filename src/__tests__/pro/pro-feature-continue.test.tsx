import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import ProFeatureScreen from '@/app/pro-feature';
import { PRO_FEATURES } from '@/data/pro-features';
import { inAppNext } from '@/lib/pro-next';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * Someone with Pro never reads an explainer. Once Pro, a focused explainer goes on into the feature
 * the person was opening, or back to the page that asked mid-task; under the Pro page or the offer
 * it waits. A payer arriving by link sees nothing of it.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ muted: '#777777', accentInk: '#905479', onControl: '#FFFFFF' }),
}));

let mockParams: Record<string, string | undefined> = {};
let mockCanGoBack = true;
/** Whether the explainer is the page on top, as the stack would say. */
const mockFocus = {
  focused: true,
  listeners: new Set<() => void>(),
  set(focused: boolean) {
    this.focused = focused;
    this.listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    mockFocus.listeners.add(listener);
    return () => {
      mockFocus.listeners.delete(listener);
    };
  },
};
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: {
      push: jest.fn(),
      back: jest.fn(),
      replace: jest.fn(),
      canGoBack: jest.fn(() => mockCanGoBack),
    },
    useLocalSearchParams: () => mockParams,
    // As expo-router's: runs while focused, again when the callback changes, and on each refocus.
    useFocusEffect: (effect: () => void | (() => void)) => {
      const focused = React.useSyncExternalStore(mockFocus.subscribe, () => mockFocus.focused);
      React.useEffect(() => (focused ? effect() : undefined), [effect, focused]);
    },
    Stack: { Screen: () => null },
  };
});

// RevenueCat's bundle does not load under Jest; the real usePro() reads this same store.
jest.mock('@/api/pro', () => ({
  usePro: () => jest.requireActual('@/lib/pro-status').useProStatus(),
  useProPrices: () => ({ data: undefined }),
}));

const push = router.push as jest.Mock;
const back = router.back as jest.Mock;
const replace = router.replace as jest.Mock;

const free = () => publishProStatus({ pro: false, ready: true });
const buy = () => act(async () => publishProStatus({ pro: true, ready: true }));
const navigated = () => [...replace.mock.calls, ...back.mock.calls];

/** The page's frame alone: its header and back chevron, and none of the explainer's words. */
function frameOnly(id: string) {
  expect(screen.getByRole('header', { name: 'Skip Pro' })).toBeTruthy();
  expect(screen.getByLabelText('Go back')).toBeTruthy();
  const feature = PRO_FEATURES[id];
  for (const words of [feature.example, feature.title, feature.subtitle]) {
    expect(screen.queryByText(words)).toBeNull();
  }
  expect(screen.queryByText(/Get Skip Pro|Included with Skip Pro|Not now/)).toBeNull();
}

beforeEach(() => {
  jest.clearAllMocks();
  resetProStatusForTests();
  mockParams = {};
  mockCanGoBack = true;
  mockFocus.focused = true;
  mockFocus.listeners.clear();
});
afterAll(() => resetProStatusForTests());

describe('once Pro, on top', () => {
  it('goes on into the page the person was opening, once', async () => {
    mockParams = { id: 'habits', next: '/habit-new' };
    free();
    await render(<ProFeatureScreen />);
    expect(screen.getByText(PRO_FEATURES.habits.title)).toBeTruthy();
    expect(navigated()).toEqual([]);

    await buy();
    expect(replace.mock.calls).toEqual([['/habit-new']]);
    expect(back).not.toHaveBeenCalled();

    // The same answer again, or the page coming back into focus, does not send it twice.
    await buy();
    await act(async () => mockFocus.set(false));
    await act(async () => mockFocus.set(true));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('keeps the params of the page it goes on to', async () => {
    mockParams = { id: 'export', next: '/payment-export?kind=bill&year=2025' };
    free();
    await render(<ProFeatureScreen />);
    await buy();
    expect(replace.mock.calls).toEqual([['/payment-export?kind=bill&year=2025']]);
  });

  it('takes the page it was given over the feature’s own', async () => {
    mockParams = { id: 'voice', next: '/voice-review?draft=d1' };
    free();
    await render(<ProFeatureScreen />);
    await buy();
    expect(replace.mock.calls).toEqual([['/voice-review?draft=d1']]);
  });

  it.each(['habits', 'scan', 'history', 'voice', 'insights'])(
    'with no next, goes back to the page that asked (%s), never into the feature',
    async (id) => {
      mockParams = { id };
      free();
      await render(<ProFeatureScreen />);
      await buy();
      expect(back).toHaveBeenCalledTimes(1);
      expect(replace).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['voice', '/voice'],
    ['insights', '/insights'],
    ['habits', '/habits'],
    ['history', '/home'],
    ['unlimited', '/home'],
    ['nonsense', '/home'],
  ])('with no next and nothing to go back to (a cold link), %s goes to %s', async (id, target) => {
    mockParams = { id };
    mockCanGoBack = false;
    free();
    await render(<ProFeatureScreen />);
    await buy();
    expect(replace.mock.calls).toEqual([[target]]);
    expect(back).not.toHaveBeenCalled();
  });

  it.each([
    'https://example.com/pay',
    '//example.com/pay',
    '/\\example.com',
    'voice',
    'skipbudget://voice',
    '',
  ])('never follows a next that is not a page of the app: %j', async (next) => {
    mockParams = { id: 'voice', next };
    free();
    await render(<ProFeatureScreen />);
    await buy();
    expect(replace).not.toHaveBeenCalled();
    expect(back).toHaveBeenCalledTimes(1);
  });
});

describe('under another page', () => {
  it('waits while the Pro page or the offer is on top, then goes on when it is uncovered', async () => {
    mockParams = { id: 'voice', next: '/voice' };
    free();
    await render(<ProFeatureScreen />);

    await act(async () => mockFocus.set(false));
    await buy();
    expect(navigated()).toEqual([]);
    // Covered, it is the bare frame, which is what shows as the Pro page slides away.
    frameOnly('voice');

    await act(async () => mockFocus.set(true));
    expect(replace.mock.calls).toEqual([['/voice']]);
  });

  it('does nothing while it stays covered and free', async () => {
    mockParams = { id: 'voice', next: '/voice' };
    free();
    await render(<ProFeatureScreen />);
    await act(async () => mockFocus.set(false));
    await act(async () => mockFocus.set(true));
    expect(navigated()).toEqual([]);
    expect(screen.getByText(PRO_FEATURES.voice.title)).toBeTruthy();
  });
});

describe('what it draws', () => {
  it('draws only the frame for someone already Pro arriving by link, and goes on', async () => {
    mockParams = { id: 'voice', next: '/voice' };
    publishProStatus({ pro: true, ready: true });
    await render(<ProFeatureScreen />);

    frameOnly('voice');
    expect(replace.mock.calls).toEqual([['/voice']]);
  });

  it('draws only the frame while Pro is unknown, then the explainer once free is the answer', async () => {
    mockParams = { id: 'insights', next: '/insights' };
    await render(<ProFeatureScreen />);
    frameOnly('insights');

    await act(async () => free());
    expect(screen.getByText(PRO_FEATURES.insights.title)).toBeTruthy();
    expect(navigated()).toEqual([]);
  });

  it('draws only the frame while Pro is unknown, then goes on once Pro is the answer', async () => {
    mockParams = { id: 'insights', next: '/insights' };
    await render(<ProFeatureScreen />);
    await buy();
    frameOnly('insights');
    expect(replace.mock.calls).toEqual([['/insights']]);
  });
});

describe('its two buttons', () => {
  it('opens the Pro page marked as asked by an explainer', async () => {
    mockParams = { id: 'voice', next: '/voice' };
    free();
    await render(<ProFeatureScreen />);
    await fireEvent.press(screen.getByLabelText('Get Skip Pro — $1.99/mo'));
    expect(push.mock.calls).toEqual([[{ pathname: '/pro', params: { from: 'feature' } }]]);
  });

  it('leaves from Not now, home from a cold link rather than a dead button', async () => {
    mockParams = { id: 'voice', next: '/voice' };
    free();
    await render(<ProFeatureScreen />);
    await fireEvent.press(screen.getByLabelText('Not now'));
    expect(back).toHaveBeenCalledTimes(1);

    mockCanGoBack = false;
    await fireEvent.press(screen.getByLabelText('Not now'));
    expect(replace.mock.calls).toEqual([['/home']]);
  });
});

describe('the feature defaults', () => {
  it('name a page only for features that are one page', () => {
    const defaults = Object.fromEntries(
      Object.values(PRO_FEATURES).map((feature) => [feature.id, feature.next ?? null]),
    );
    expect(defaults).toEqual({
      insights: '/insights',
      scan: null,
      voice: '/voice',
      history: null,
      unlimited: null,
      habits: '/habits',
      export: null,
    });
  });
});

describe('inAppNext', () => {
  it.each([
    ['/voice', '/voice'],
    ['/payment-export?kind=all&year=all', '/payment-export?kind=all&year=all'],
    ['/source/abc', '/source/abc'],
    ['https://example.com', null],
    ['//example.com', null],
    ['/\\example.com', null],
    ['voice', null],
    ['', null],
    [undefined, null],
    [['/voice', '/insights'], null],
  ] as const)('%j → %j', (next, expected) => {
    expect(inAppNext(next as string | string[] | undefined)).toBe(expected);
  });
});
