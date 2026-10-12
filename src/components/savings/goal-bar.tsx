import { View } from 'react-native';

import { cn } from '@/lib/cn';

/** How far a goal has come, as a thin bar. Drawn only: the percent is said in words beside it. */
export function GoalBar({
  percent,
  className,
  testID,
}: {
  /** Whole percent, 0 to 100; anything outside is held to the ends. */
  percent: number;
  className?: string;
  testID?: string;
}) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <View
      className={cn('h-[6px] w-full overflow-hidden rounded-full bg-line/70', className)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        testID={testID}
        style={{ width: `${width}%` }}
        className="h-full rounded-full bg-accent"
      />
    </View>
  );
}
