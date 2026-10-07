import { useState, type FC } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import { FitText, type FitGroupHandle } from '@/components/ui/fit-group';
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
  /** Names the fit slots; the same in every language, unlike the label. */
  id?: string;
  /** Tiles side by side: their labels share one size, and so do their figures. */
  labels?: FitGroupHandle;
  figures?: FitGroupHandle;
  /** One tile per line, where a square would only be empty space. */
  stacked?: boolean;
};

const PRESSED = 0.955;

/**
 * Padding in percent is taken from the parent's width, so this keeps the tile at least as tall as it
 * is wide while letting larger text make it taller.
 */
const AT_LEAST_SQUARE: ViewStyle = { width: 0, paddingTop: '100%' };

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
  id = 'tile',
  labels,
  figures,
  stacked = false,
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
          'w-full flex-row rounded-[16px] border border-line bg-card',
          // Reduced motion still answers the finger, with a static state.
          reduced && onPress ? 'active:opacity-70' : null,
          className,
        )}
      >
        {stacked ? null : <View style={AT_LEAST_SQUARE} />}
        <View className="min-w-0 flex-1 items-center justify-center p-3.5">
          <View className="h-[84px] w-[84px]">
            <Artwork width="100%" height="100%" />
          </View>

          <View className="mt-2.5 w-full items-center">
            <FitText
              group={labels}
              id={`${id}-label`}
              role="control"
              size={13}
              lineHeight={18}
              className="text-center font-app-medium text-body"
              slotClassName="w-full"
            >
              {label}
            </FitText>
            {/* A tool tile has no figure; "Open" keeps the row height so tiles stay aligned. */}
            <FitText
              group={figures}
              id={`${id}-figure`}
              role="figure"
              size={16}
              className={cn(
                'text-center font-app-semibold',
                amount === undefined ? 'text-muted' : 'text-ink',
              )}
              slotClassName="mt-1 w-full"
            >
              {amount === undefined ? t('loan.amountTile.open') : formatCurrency(amount)}
            </FitText>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}
