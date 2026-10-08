import { Pressable, Text, View } from 'react-native';

import { selection } from '@/lib/haptics';
import { cn } from '@/lib/cn';
import { TEXT_CAP } from '@/theme/text-scale';

type ToggleOption<T extends string> = {
  value: T;
  label: string;
};

type TogglePillProps<T extends string> = {
  options: readonly ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * "One of exactly two" as one joined track, e.g. AM/PM. Longer or open-ended option sets belong in
 * `ChoiceChips`.
 *
 * No fit group: the labels are short enough that both halves hold them at the control ceiling (the
 * widest, Spanish "p. m.", needs 45pt of the 68pt a half of the time picker's track gives it), so
 * the two already share one size. A longer label wraps inside its half rather than being cut.
 */
export function TogglePill<T extends string>({ options, value, onChange }: TogglePillProps<T>) {
  return (
    <View accessibilityRole="radiogroup" className="w-full flex-row rounded-full bg-ink/5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => {
              selection();
              onChange(option.value);
            }}
            className={cn(
              'min-h-11 flex-1 items-center justify-center rounded-full px-3 py-1.5',
              selected ? 'bg-control' : 'active:bg-ink/5',
            )}
          >
            <Text
              className={cn(
                'text-center text-[14px]',
                selected ? 'font-app-medium text-on-control' : 'font-app text-body',
              )}
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
