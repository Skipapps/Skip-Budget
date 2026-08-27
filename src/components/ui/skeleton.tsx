import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/cn';

/**
 * A block that breathes while data loads.
 *
 * Skeletons rather than a spinner: a spinner says "something is happening",
 * a skeleton says "a list is arriving and here is its shape", so the page
 * does not jump when the rows land.
 */
export function Skeleton({ className, style }: { className?: string; style?: object }) {
  const pulse = useSharedValue(0.5);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);
  }, [pulse, reduced]);

  const animated = useAnimatedStyle(() => ({ opacity: reduced ? 0.6 : pulse.value }));

  return (
    <Animated.View
      className={cn('rounded-[6px] bg-line', className)}
      style={[animated, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/**
 * Placeholder shaped like a receipt or subscription row: leading mark, two
 * stacked lines, and an amount column on the right.
 */
export function SkeletonRow() {
  return (
    <View className="w-full flex-row items-center gap-3 py-3.5">
      <Skeleton className="h-11 w-11 rounded-full" />
      <View className="min-w-0 flex-1 gap-2">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-2.5 w-1/3" />
      </View>
      <View className="items-end gap-2">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-2.5 w-20" />
      </View>
    </View>
  );
}

/** A list's worth of placeholders. Five reads as "a list" without filling a tablet. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <View className="w-full" accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </View>
  );
}
