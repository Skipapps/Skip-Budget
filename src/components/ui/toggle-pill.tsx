import { Pressable, Text, View } from 'react-native';

import { selection } from '@/lib/haptics';
import { cn } from '@/lib/cn';

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
 * Toggle pill — "one of exactly two", as one object rather than two chips.
 *
 * One `rounded-full` tonal track with the selected half filled. Used where a
 * binary reads better joined than separated: AM/PM on the clock. Longer or
 * open-ended option sets belong in `ChoiceChips`, which wraps.
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
              'min-h-11 flex-1 items-center justify-center rounded-full px-3',
              selected ? 'bg-control' : 'active:bg-ink/5',
            )}
          >
            <Text
              className={cn(
                'text-[14px]',
                selected ? 'font-poppins-medium text-on-control' : 'font-poppins text-body',
              )}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
