import { Pressable, Text, View } from 'react-native';

import { Slider } from '@/components/ui/slider';

type SliderRowProps = {
  label: string;
  /** Already formatted for display — currency, percent, "3 yrs 6 mo". */
  display: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  scale?: 'linear' | 'log';
  /** Tapping the value opens a precise-entry pad, when one makes sense. */
  onValuePress?: () => void;
  /** Range hints shown under the track. */
  minLabel?: string;
  maxLabel?: string;
};

/** Label, live value, and the track — the standard control on both calculators. */
export function SliderRow({
  label,
  display,
  value,
  min,
  max,
  step,
  scale,
  onChange,
  onValuePress,
  minLabel,
  maxLabel,
}: SliderRowProps) {
  const readout = (
    <Text
      className="font-poppins-semibold text-[18px] text-ink"
      numberOfLines={1}
      maxFontSizeMultiplier={1.2}
    >
      {display}
    </Text>
  );

  return (
    <View className="w-full">
      <View className="w-full flex-row items-center justify-between gap-3">
        <Text className="font-poppins-medium text-[13px] text-body" maxFontSizeMultiplier={1.3}>
          {label}
        </Text>

        {onValuePress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${display}. Edit`}
            onPress={onValuePress}
            className="rounded-[8px] border border-line px-3 py-1.5 active:bg-black/5"
          >
            {readout}
          </Pressable>
        ) : (
          readout
        )}
      </View>

      <Slider className="mt-1" value={value} min={min} max={max} step={step} onChange={onChange} />

      {minLabel || maxLabel ? (
        <View className="w-full flex-row items-center justify-between">
          <Text allowFontScaling={false} className="font-poppins text-[11px] text-muted">
            {minLabel}
          </Text>
          <Text allowFontScaling={false} className="font-poppins text-[11px] text-muted">
            {maxLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
