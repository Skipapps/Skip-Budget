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

import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';

type AmountTileProps = {
  label: string;
  /** Omitted for tiles that open a tool rather than report spending. */
  amount?: number;
  artwork: FC<SvgProps>;
  onPress?: () => void;
  className?: string;
};

const PRESSED = 0.955;

/**
 * Square tile: artwork, label, amount, stacked down the middle. Fills its parent's width, so it works
 * in a fixed-width carousel and a flexible two-up row. Sinks under a finger: down is quick and linear,
 * back up is a spring.
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

  // Animated from state through the style, not a shared value set in an event handler:
  // Reanimated works out the motion between targets on the UI thread.
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
      onPressIn={sinks ? () => setPressed(true) : undefined}
      onPressOut={sinks ? () => setPressed(false) : undefined}
      className="w-full"
    >
      <Animated.View
        style={surface}
        className={cn(
          'aspect-square w-full items-center justify-center rounded-[16px] border border-line bg-card p-3.5',
          // Reduced motion still answers the finger, with a static state.
          reduced && onPress ? 'active:opacity-70' : null,
          className,
        )}
      >
        <View className="h-[84px] w-[84px]">
          <Artwork width="100%" height="100%" />
        </View>

        <View className="mt-2.5 w-full items-center">
          <Text
            className="text-center font-app-medium text-[13px] leading-[18px] text-body"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {label}
          </Text>
          {/* A tool tile has no figure; "Open" keeps the row height so tiles stay aligned. */}
          <Text
            className={cn(
              'mt-1 text-center font-app-semibold text-[16px]',
              amount === undefined ? 'text-muted' : 'text-ink',
            )}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.3}
          >
            {amount === undefined ? t('loan.amountTile.open') : formatCurrency(amount)}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
