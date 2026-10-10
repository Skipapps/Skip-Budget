import { useCallback, useMemo, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';

import { cn } from '@/lib/cn';
import { sliderRatio, sliderValue } from '@/lib/slider-scale';
import { useColors } from '@/providers/theme-provider';

type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Must be stable (a state setter or useCallback), or the responder is rebuilt every render. */
  onChange: (value: number) => void;
  /** `log` for money ranges: see SliderScale. Requires min > 0. */
  scale?: 'linear' | 'log';
  className?: string;
};

const THUMB = 26;

/**
 * Drag-to-set slider built on PanResponder. Not @react-native-community/slider: that is a native
 * module, and adding one forces a full dev-client rebuild.
 *
 * No refs: the responder closes over its inputs and is rebuilt only when one changes (once, when
 * layout reports the width).
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  scale = 'linear',
  className,
}: SliderProps) {
  const colors = useColors();
  const [width, setWidth] = useState(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const responder = useMemo(() => {
    const emit = (x: number) => {
      if (width <= 0) return;
      onChange(sliderValue(Math.min(width, Math.max(0, x)) / width, { min, max, step, scale }));
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // locationX on both events, so no drag origin needs storing.
      onPanResponderGrant: (event) => emit(event.nativeEvent.locationX),
      onPanResponderMove: (event) => emit(event.nativeEvent.locationX),
    });
  }, [width, min, max, step, scale, onChange]);

  const ratio = sliderRatio(value, { min, max, step, scale });

  return (
    <View
      {...responder.panHandlers}
      onLayout={handleLayout}
      // Tall hit area: a 6px track is far too thin to grab reliably.
      className={cn('h-11 w-full justify-center', className)}
    >
      <View className="h-1.5 w-full rounded-full bg-ink/10" />

      <View
        pointerEvents="none"
        style={{ width: ratio * width }}
        className="absolute h-1.5 rounded-full bg-control"
      />

      <View
        pointerEvents="none"
        style={{
          left: Math.max(0, ratio * width - THUMB / 2),
          width: THUMB,
          height: THUMB,
          borderColor: colors.control,
        }}
        className="absolute rounded-full border-[3px] bg-card"
      />
    </View>
  );
}
