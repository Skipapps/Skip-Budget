import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/cn';

type FeatureRowProps = {
  illustration: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Illustration-plus-copy row. The art column holds its size while the copy column flexes and wraps. */
export function FeatureRow({ illustration, children, className }: FeatureRowProps) {
  return (
    <View className={cn('w-full flex-row items-center gap-3 phone:gap-4', className)}>
      <View className="h-20 w-20 shrink-0 items-center justify-center phone:h-24 phone:w-24">
        {illustration}
      </View>
      <View className="min-w-0 flex-1">{children}</View>
    </View>
  );
}
