import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/cn';

type FeatureRowProps = {
  /** Small illustration shown in the left column. */
  illustration: ReactNode;
  /** Copy for the right column — compose with <Body>/<Strong>. */
  children: ReactNode;
  className?: string;
};

/**
 * Illustration-plus-copy row, as used in the welcome screen's feature list.
 * The art column holds its size while the copy column flexes and wraps, so the
 * row reflows rather than overflowing on narrow screens.
 */
export function FeatureRow({ illustration, children, className }: FeatureRowProps) {
  return (
    <View className={cn('w-full flex-row items-center gap-3 phone:gap-4', className)}>
      <View className="h-16 w-16 shrink-0 items-center justify-center phone:h-20 phone:w-20">
        {illustration}
      </View>
      <View className="min-w-0 flex-1">{children}</View>
    </View>
  );
}
