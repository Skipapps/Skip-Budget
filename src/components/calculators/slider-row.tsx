import { Pressable, Text, View } from 'react-native';

import { FitText, useGroupFits } from '@/components/ui/fit-group';
import { Slider } from '@/components/ui/slider';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { TEXT_CAP } from '@/theme/text-scale';

type SliderRowProps = {
  /** Names the label's fit slot; unique among the rows that share a FitRows. */
  id?: string;
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

/**
 * A label, its value and a slider. The label wraps beside the value; put the rows in one FitRows and,
 * once a word of any label cannot sit beside its value, every row puts its value under its label.
 *
 * The value is not a member of the group, so dragging does not judge the layout again on every step:
 * a wider value narrows the label's slot, and that alone can move the rows to the stacked layout,
 * where they then stay rather than jump back under the finger.
 */
export function SliderRow({
  id = 'slider',
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
  const stacked = !useGroupFits();
  const readout = (
    <Text
      className="font-app-semibold text-[18px] text-ink"
      maxFontSizeMultiplier={TEXT_CAP.figure}
    >
      {display}
    </Text>
  );

  return (
    <View className="w-full">
      <View
        className={cn(
          'w-full',
          stacked ? 'items-start gap-1.5' : 'flex-row items-center justify-between gap-3',
        )}
      >
        <FitText
          id={`${id}-label`}
          role="row"
          size={13}
          className="font-app-medium text-body"
          slotClassName={stacked ? 'w-full' : 'min-w-0 flex-1'}
        >
          {label}
        </FitText>

        {onValuePress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('loan.sliderRow.edit', { label, value: display })}
            onPress={onValuePress}
            hitSlop={8}
            className="min-h-10 max-w-full shrink-0 justify-center rounded-full bg-ink/5 px-4 py-1.5 active:bg-ink/10"
          >
            {readout}
          </Pressable>
        ) : (
          <View className="max-w-full shrink-0">{readout}</View>
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
