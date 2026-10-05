import { Mic } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { contrast } from '@/lib/tone';
import { useTheme } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

type MicButtonProps = {
  /** Held down — or, with VoiceOver, switched on. The button grows a little. */
  held: boolean;
  /** The microphone is actually open: the ring follows `level`. */
  live: boolean;
  /** Microphone level, 0–1. */
  level: number;
  /**
   * VoiceOver is on. Holding a control is hard with it, so a double-tap
   * starts and a second one stops, instead of press-and-hold.
   */
  toggleMode: boolean;
  onStart: () => void;
  onStop: () => void;
  accessibilityHint: string;
};

/**
 * The big round mic: hold to talk, let go when done.
 *
 * Sizes are arbitrary pixel values on purpose. NativeWind's rem is 14 on
 * native, so the spacing scale would draw it an eighth smaller than meant; 92pt
 * is what the Founder asked to see on the phone.
 *
 * A thumb drifts while someone talks, so the press survives moving well off
 * the button; only lifting the finger ends it.
 */
export function MicButton({
  held,
  live,
  level,
  toggleMode,
  onStart,
  onStop,
  accessibilityHint,
}: MicButtonProps) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  // On a dark page the accent can sit too close to the surface to have an
  // edge (plum, navy), and a shadow does not show on near-black: a hairline
  // ring, the same rule as the Home Voice button.
  const ringed = scheme === 'dark' && contrast(colors.control, colors.surface) < 3;

  const grow = useSharedValue(1);
  useEffect(() => {
    grow.value = reduced ? 1 : withTiming(held ? 1.06 : 1, { duration: 140 });
  }, [held, reduced, grow]);

  const swell = useSharedValue(1);
  useEffect(() => {
    if (!live || reduced) {
      swell.value = 1;
      return;
    }
    swell.value = withTiming(1 + 0.35 * Math.min(Math.max(level, 0), 1), { duration: 120 });
  }, [live, reduced, level, swell]);

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: grow.value }] }));
  const ringStyle = useAnimatedStyle(
    () =>
      reduced
        ? { opacity: 0.35, transform: [{ scale: 1.15 }] }
        : { opacity: 0.6, transform: [{ scale: swell.value }] },
    [reduced],
  );

  return (
    // Room for the ring at its widest (92 × 1.35 ≈ 124).
    <View className="h-[128px] w-[128px] items-center justify-center">
      {live ? (
        <Animated.View
          testID="mic-ring"
          pointerEvents="none"
          className="absolute h-[92px] w-[92px] rounded-full bg-control/25"
          style={ringStyle}
        />
      ) : null}

      <Animated.View style={buttonStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Record"
          accessibilityHint={accessibilityHint}
          accessibilityState={{ selected: held }}
          hitSlop={8}
          pressRetentionOffset={{ top: 160, bottom: 160, left: 160, right: 160 }}
          {...(toggleMode
            ? { onPress: () => (held ? onStop() : onStart()) }
            : { onPressIn: onStart, onPressOut: onStop })}
          style={[shadows.floating, ringed ? { borderWidth: 1, borderColor: colors.muted } : null]}
          className="h-[92px] w-[92px] items-center justify-center rounded-full bg-control active:bg-control-pressed"
        >
          <Mic size={36} color={colors.onControl} strokeWidth={2} absoluteStrokeWidth />
        </Pressable>
      </Animated.View>
    </View>
  );
}
