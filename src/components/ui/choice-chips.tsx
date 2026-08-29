import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
};

type ChoiceChipsProps<T extends string> = {
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Pick-one chips that wrap.
 *
 * Used instead of SegmentedControl when labels are too long to share a row —
 * four equal segments would truncate "Twice a month" on a narrow screen.
 */
export function ChoiceChips<T extends string>({ options, value, onChange }: ChoiceChipsProps<T>) {
  return (
    <View className="w-full flex-row flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              'rounded-full border px-4 py-2.5',
              selected ? 'border-control bg-control' : 'border-line bg-card active:bg-ink/5',
            )}
          >
            <Text
              className={cn(
                'text-[13px]',
                selected ? 'font-poppins-medium text-on-control' : 'font-poppins text-body',
              )}
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
