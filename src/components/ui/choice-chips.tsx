import { Pressable, Text, View } from 'react-native';

import { selection } from '@/lib/haptics';
import { cn } from '@/lib/cn';
import { TEXT_CAP } from '@/theme/text-scale';

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
};

type ChoiceChipsProps<T extends string> = {
  options: readonly ChoiceOption<T>[];
  /** Null lights nothing: a question not answered yet. */
  value: T | null;
  onChange: (value: T) => void;
};

/**
 * Pick-one chips that wrap onto more lines, never cut; a label wider than the row wraps inside its
 * chip. 40pt tall plus 4pt of vertical hitSlop clears the 44pt target floor.
 */
export function ChoiceChips<T extends string>({ options, value, onChange }: ChoiceChipsProps<T>) {
  return (
    <View accessibilityRole="radiogroup" className="w-full flex-row flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, checked: selected }}
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={() => {
              selection();
              onChange(option.value);
            }}
            className={cn(
              'min-h-10 max-w-full items-center justify-center rounded-full px-4 py-2',
              selected ? 'bg-control' : 'bg-ink/5 active:bg-ink/10',
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
