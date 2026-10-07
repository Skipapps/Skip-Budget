import { Pressable, Text, View } from 'react-native';

import { Slider } from '@/components/ui/slider';
import { t } from '@/i18n';

type SliderRowProps = {
  label: string;
  /** Already formatted for display in the language on screen: currency, percent, a term. */
  display: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  scale?: 'linear' | 'log';
  /** Tapping the value opens a precise-entry pad, when one makes sense. */
  onValuePress?: () => void;
  minLabel?: string;
  maxLabel?: string;
};

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
      className="font-app-semibold text-[18px] text-ink"
      numberOfLines={1}
      maxFontSizeMultiplier={1.2}
    >
      {display}
    </Text>
  );

  return (
    <View className="w-full">
      <View className="w-full flex-row items-center justify-between gap-3">
        <Text className="font-app-medium text-[13px] text-body" maxFontSizeMultiplier={1.3}>
          {label}
        </Text>

        {onValuePress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('loan.sliderRow.edit', { label, value: display })}
            onPress={onValuePress}
            hitSlop={8}
            className="min-h-10 justify-center rounded-full bg-ink/5 px-4 active:bg-ink/10"
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
          <Text allowFontScaling={false} className="font-app text-[11px] text-muted">
            {minLabel}
          </Text>
          <Text allowFontScaling={false} className="font-app text-[11px] text-muted">
            {maxLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
