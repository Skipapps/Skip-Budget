import { useEventListener } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { createVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import splashVideo from '../../assets/videos/skip-splash.mp4';

/**
 * The video's own background, edge to edge in every frame. The native splash (app.json) and the
 * space around the video use the same colour, so the hand-over and the letterboxing are invisible.
 */
const SPLASH_BACKDROP = '#F5F3F1';

/** The video runs 1.8s; this is how long it is given to finish before the app takes over anyway. */
const STALL_MS = 4000;
/**
 * How long someone can sit on the native splash if the video never loads. Generous: the app is
 * loading underneath, so a slow phone loses nothing by waiting, whereas skipping would mean never
 * seeing the logo. A video that fails outright is skipped at once.
 */
const FALLBACK_MS = 6000;
/** Loaded but its first frame not reported (a busy main thread): start it anyway after this. */
const FIRST_FRAME_GRACE_MS = 1000;
/** Reduce Motion: the finished frame, held still for this long. */
const STILL_MS = 700;
/** The fade from the splash into the app. */
const EXIT_MS = 450;
/** Just short of the 1.8s end, so the still is the finished logo rather than a black frame. */
const FINAL_FRAME_S = 1.75;

/**
 * Created when this module first runs, before React draws anything, so the video loads while the
 * app starts; made inside the component it would only start once the main thread is busy building
 * the app. One per launch, released once the splash is gone.
 */
let launchPlayer: VideoPlayer | null = null;
function getLaunchPlayer(): VideoPlayer {
  if (!launchPlayer) {
    launchPlayer = createVideoPlayer(splashVideo);
    launchPlayer.muted = true;
    launchPlayer.loop = false;
    launchPlayer.audioMixingMode = 'mixWithOthers';
  }
  return launchPlayer;
}
getLaunchPlayer();

/**
 * The launch video: the Skip mark grows in, "Skip" appears under it, then the splash fades into the
 * app, which has been loading underneath. Scaled to fit, never cropped (9:16 video; the rest is the
 * video's own cream). The native splash is hidden only once the first frame is drawn. Never strands
 * anyone: a video that fails to load, errors or stalls is skipped. Muted and mixed with other
 * audio; Reduce Motion shows the finished logo still.
 */
export function LaunchSplash() {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);
  const started = useRef(false);
  const leaving = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const opacity = useSharedValue(1);

  const [player] = useState(getLaunchPlayer);

  const later = useCallback((ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  }, []);

  // Fade into the app, then unmount: a see-through overlay would still be
  // swallowing the first taps on the app.
  const leave = useCallback(
    (delay = 0) => {
      if (leaving.current) return;
      leaving.current = true;
      // Already hidden if the video started; this is for the skipped ones.
      if (!started.current) SplashScreen.hide();
      // set() rather than assigning .value: inside a callback, React's compiler
      // treats an assignment as mutating a hook's return value.
      opacity.set(withDelay(delay, withTiming(0, { duration: EXIT_MS })));
      later(delay + EXIT_MS, () => setDone(true));
    },
    [later, opacity],
  );

  const start = useCallback(() => {
    if (started.current || leaving.current) return;
    started.current = true;
    SplashScreen.hide();
    if (reduced) {
      // From the start, so this lands on the finished frame.
      player.seekBy(FINAL_FRAME_S);
      leave(STILL_MS);
      return;
    }
    player.play();
    later(STALL_MS, () => leave());
  }, [later, leave, player, reduced]);

  // Started by the view's first drawn frame, not by the player being ready: playing earlier loses
  // the first half-second of the animation to a screen that is not there yet.
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') later(FIRST_FRAME_GRACE_MS, start);
    if (status === 'error') leave();
  });
  useEventListener(player, 'playToEnd', () => leave());

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!started.current) leave();
    }, FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [leave]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Done for this launch: free the decoder rather than holding a 4K video.
  useEffect(() => {
    if (!done) return;
    player.release();
    launchPlayer = null;
  }, [done, player]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (done) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlay, styles.backdrop, fade]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="launch-splash"
    >
      <VideoView
        player={player}
        // Cream under the video too, so the instant before its first frame is not black.
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        contentFit="contain"
        onFirstFrameRender={start}
        nativeControls={false}
        allowsPictureInPicture={false}
        allowsVideoFrameAnalysis={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 1000 },
  backdrop: { backgroundColor: SPLASH_BACKDROP },
});
