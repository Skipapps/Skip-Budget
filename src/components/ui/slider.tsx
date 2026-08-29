import { useCallback, useMemo, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';

import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Must be stable (a state setter or useCallback) — see the note below. */
  onChange: (value: number) => void;
  /**
   * `log` spaces the track by orders of magnitude. Use it for money ranges: on
   * a linear 500–1,000,000 track a $30k loan sits in the leftmost 3% and is
   * effectively undraggable. Requires min > 0.
   */
  scale?: 'linear' | 'log';
  className?: string;
};

const THUMB = 26;

/**
 * Drag-to-set slider built on PanResponder.
 *
 * Deliberately not @react-native-community/slider: that is a native module, and
 * adding one forces a full dev-client rebuild for what is a few lines of maths.
 *
 * No refs — the responder closes over its inputs and is rebuilt only when one
 * of them changes. In practice that is once, when layout reports the width.
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

      const clampedX = Math.min(width, Math.max(0, x));
      const ratio = clampedX / width;

      let raw: number;
      let snapped: number;

      if (scale === 'log') {
        raw = min * Math.pow(max / min, ratio);
        // Snap relative to magnitude, so it steps by 100s in the hundreds and
        // by 10,000s in the hundred-thousands instead of one fixed increment.
        const magnitude = Math.pow(10, Math.max(0, Math.floor(Math.log10(raw)) - 1));
        snapped = Math.round(raw / magnitude) * magnitude;
      } else {
        raw = min + ratio * Math.max(max - min, 0.000001);
        snapped = Math.round(raw / step) * step;
      }

      // Guard against float drift pushing the value a hair outside the range.
      onChange(Math.min(max, Math.max(min, Number(snapped.toFixed(6)))));
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // locationX on both events, so no drag origin needs storing.
      onPanResponderGrant: (event) => emit(event.nativeEvent.locationX),
      onPanResponderMove: (event) => emit(event.nativeEvent.locationX),
    });
  }, [width, min, max, step, scale, onChange]);

  const ratio =
    scale === 'log'
      ? Math.min(1, Math.max(0, Math.log(Math.max(value, min) / min) / Math.log(max / min)))
      : Math.min(1, Math.max(0, (value - min) / Math.max(max - min, 0.000001)));

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
