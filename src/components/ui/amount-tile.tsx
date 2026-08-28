import { useState, type FC } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { shadows } from '@/theme/shadows';

type AmountTileProps = {
  label: string;
  /** Omitted for tiles that open a tool rather than report spending. */
  amount?: number;
  artwork: FC<SvgProps>;
  onPress?: () => void;
  className?: string;
};

/** How far the tile sinks. Enough to feel, small enough not to wobble. */
const PRESSED = 0.955;

/**
 * Square tile: artwork, label, amount.
 *
 * Fills whatever width its parent gives it, so the same tile works in the
 * dashboard's fixed-width carousel and in a flexible two-up row.
 *
 * Sits on a shadow rather than inside a border, and sinks under a finger. Down
 * is quick and linear, back up is a spring: a press should answer immediately,
 * and the release should feel like the tile has weight of its own.
 */
export function AmountTile({
  label,
  amount,
  artwork: Artwork,
  onPress,
  className,
}: AmountTileProps) {
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  // The animation is described by the style rather than pushed into a shared
  // value from an event handler: the target follows the state, and Reanimated
  // works out the motion between the two on the UI thread.
  const surface = useAnimatedStyle(() => {
    'worklet';
    const target = pressed ? PRESSED : 1;
    return {
      transform: [
        {
          scale: pressed
            ? withTiming(target, { duration: 90, easing: Easing.out(Easing.quad) })
            : withSpring(target, { damping: 14, stiffness: 260, mass: 0.5 }),
        },
      ],
    };
  });

  // Nothing to sink into if the tile does not go anywhere.
  const sinks = Boolean(onPress) && !reduced;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={amount === undefined ? label : `${label}, ${formatCurrency(amount)}`}
      onPress={onPress}
      // Nothing to sink into if the tile does not go anywhere.
      onPressIn={sinks ? () => setPressed(true) : undefined}
      onPressOut={sinks ? () => setPressed(false) : undefined}
      className="w-full"
    >
      <Animated.View
        style={[shadows.raised, surface]}
        className={cn(
          'aspect-square w-full justify-between rounded-[16px] bg-white p-3.5',
          // Someone who has asked for less motion still gets an answer to their
          // finger, just a static one.
          reduced && onPress ? 'active:opacity-70' : null,
          className,
        )}
      >
        <View className="h-[84px] w-[84px]">
          <Artwork width="100%" height="100%" />
        </View>

        <View>
          <Text
            className="font-poppins-medium text-[13px] leading-[18px] text-body"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {label}
          </Text>
          {/* A calculator tile has no figure; the row keeps its height so the
              tiles stay square and aligned beside the ones that do. */}
          <Text
            className={cn(
              'mt-1 font-poppins-semibold text-[16px]',
              amount === undefined ? 'text-muted' : 'text-ink',
            )}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.3}
          >
            {amount === undefined ? 'Open' : formatCurrency(amount)}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
