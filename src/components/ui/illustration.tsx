import type { FC } from 'react';
import { View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { cn } from '@/lib/cn';

type IllustrationProps = {
  /** An SVG imported as a component (see types/svg.d.ts). */
  source: FC<SvgProps>;
  /** Artwork aspect ratio, width / height. */
  aspectRatio?: number;
  /** Share of the available width to fill, 0–1. */
  widthRatio?: number;
  /** Upper bound so artwork does not balloon on tablets. */
  maxWidth?: number;
  className?: string;
};

/** Renders artwork at a share of the parent's width, capped by maxWidth, so it cannot overflow a narrow screen. */
export function Illustration({
  source: Artwork,
  aspectRatio = 1,
  widthRatio = 0.75,
  maxWidth = 280,
  className,
}: IllustrationProps) {
  return (
    <View className={cn('w-full items-center', className)}>
      <View style={{ width: `${widthRatio * 100}%`, maxWidth, aspectRatio }}>
        <Artwork width="100%" height="100%" />
      </View>
    </View>
  );
}
