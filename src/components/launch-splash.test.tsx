import { act, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';

import { LaunchSplash } from '@/components/launch-splash';

/**
 * The launch video stands between the native splash and the app. The ways it
 * can go wrong are all about getting stuck — never hiding the native splash,
 * a video that never loads or never ends, or an invisible layer left over the
 * app eating the first taps — plus showing it wrong: cropped, or with sound.
 */

// Reanimated's worklets need the native runtime, which Jest does not have.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => mockReduced,
    useSharedValue: (value: unknown) => ({ value, set: jest.fn() }),
    withDelay: (_ms: number, value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});

jest.mock('expo-splash-screen', () => ({ hide: jest.fn() }));

let mockReduced = false;

/** A stand-in player a test can drive: report ready, error, or the end. */
type Listener = (payload: { status: string }) => void;
const mockListeners: Record<string, Listener[]> = {};

jest.mock('expo', () => ({
  useEventListener: (_player: unknown, event: string, listener: Listener) => {
    (mockListeners[event] ??= []).push(listener);
  },
}));

// The splash makes its player as soon as its module loads, before any test
// body runs, so the stand-in lives inside the mock and is fetched from it.
jest.mock('expo-video', () => {
  const { View } = jest.requireActual('react-native');
  const player = {
    status: 'loading',
    muted: false,
    loop: true,
    audioMixingMode: 'auto',
    play: jest.fn(),
    seekBy: jest.fn(),
    release: jest.fn(),
  };
  return {
    createVideoPlayer: jest.fn(() => player),
    VideoView: (props: Record<string, unknown>) => <View testID="launch-video" {...props} />,
    mockPlayer: player,
  };
});
const { mockPlayer, createVideoPlayer } = jest.requireMock('expo-video');
// As the module left them on load, before any test resets the mocks.
const AT_LOAD = {
  created: createVideoPlayer.mock.calls.length,
  muted: mockPlayer.muted,
  loop: mockPlayer.loop,
  audioMixingMode: mockPlayer.audioMixingMode,
};

const hide = SplashScreen.hide as jest.Mock;
/** The splash is hidden from VoiceOver on purpose, so queries must look past that. */
const HIDDEN = { includeHiddenElements: true };
const EXIT_MS = 450;

const emit = (event: string, payload = { status: '' }) =>
  act(() => (mockListeners[event] ?? []).forEach((listener) => listener(payload)));
/** The video's first frame is on screen: what starts it. */
const ready = () =>
  act(() => screen.getByTestId('launch-video', HIDDEN).props.onFirstFrameRender());
const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));
const splash = () => screen.queryByTestId('launch-splash', HIDDEN);

it('starts loading the video as soon as the app starts, before any splash is drawn', () => {
  expect(AT_LOAD.created).toBe(1);
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  for (const key of Object.keys(mockListeners)) delete mockListeners[key];
  mockReduced = false;
  mockPlayer.status = 'loading';
});

afterEach(() => {
  jest.useRealTimers();
});

it('fits the whole video on screen, muted, without pausing other audio', async () => {
  await render(<LaunchSplash />);

  const video = screen.getByTestId('launch-video', HIDDEN);
  // Never cropped: scaled to fit, the rest painted in the video's own cream.
  expect(video.props.contentFit).toBe('contain');
  expect(video.props.nativeControls).toBe(false);
  expect(AT_LOAD.muted).toBe(true);
  expect(AT_LOAD.loop).toBe(false);
  expect(AT_LOAD.audioMixingMode).toBe('mixWithOthers');
});

it('hides the native splash and plays once its first frame is on screen, and only once', async () => {
  await render(<LaunchSplash />);
  // Ready is not enough: the view may not be on screen yet.
  await emit('statusChange', { status: 'readyToPlay' });
  await wait(900);
  expect(hide).not.toHaveBeenCalled();
  expect(mockPlayer.play).not.toHaveBeenCalled();

  await ready();
  expect(hide).toHaveBeenCalledTimes(1);
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);

  // The grace and fallback timers still fire; they must not hand over again.
  await wait(6000);
  expect(hide).toHaveBeenCalledTimes(1);
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
});

it('plays anyway if the video loaded but its first frame is never reported', async () => {
  await render(<LaunchSplash />);
  await emit('statusChange', { status: 'readyToPlay' });

  await wait(1000);
  expect(hide).toHaveBeenCalledTimes(1);
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
});

it('plays to the end, then fades and leaves nothing over the app', async () => {
  await render(<LaunchSplash />);
  await ready();

  await wait(1800);
  expect(splash()).toBeTruthy();

  await emit('playToEnd');
  await wait(EXIT_MS - 50);
  expect(splash()).toBeTruthy();
  await wait(50);
  expect(splash()).toBeNull();
  // And the decoder is freed rather than kept for the rest of the session.
  expect(mockPlayer.release).toHaveBeenCalledTimes(1);
});

it('never leaves somebody on the native splash if the video never loads', async () => {
  await render(<LaunchSplash />);

  // A slow start is waited out…
  await wait(5900);
  expect(hide).not.toHaveBeenCalled();
  // …but not forever.
  await wait(100);
  expect(hide).toHaveBeenCalledTimes(1);
  expect(mockPlayer.play).not.toHaveBeenCalled();
  await wait(EXIT_MS);
  expect(splash()).toBeNull();
});

it('skips a video that errors', async () => {
  await render(<LaunchSplash />);

  await emit('statusChange', { status: 'error' });
  expect(hide).toHaveBeenCalledTimes(1);
  await wait(EXIT_MS);
  expect(splash()).toBeNull();
});

it('moves on if the video stalls and never reports its end', async () => {
  await render(<LaunchSplash />);
  await ready();

  await wait(4000 + EXIT_MS);
  expect(splash()).toBeNull();
});

it('shows Reduce Motion the finished logo, still, instead of playing it', async () => {
  mockReduced = true;
  await render(<LaunchSplash />);
  await ready();

  expect(mockPlayer.play).not.toHaveBeenCalled();
  expect(mockPlayer.seekBy.mock.calls[0][0]).toBeGreaterThan(1.5);
  await wait(700 + EXIT_MS);
  expect(splash()).toBeNull();
});
