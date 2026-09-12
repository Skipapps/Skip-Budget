import { Pressable, Text, View } from 'react-native';

import { selection } from '@/lib/haptics';
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
 * Pick-one chips that wrap. The one "choose" shape in the app.
 *
 * No border: the tonal fill already separates the chip from the page, and a
 * chip that is both filled and outlined is two separations doing one job. The
 * 40pt height plus 4pt of vertical hitSlop clears the 44pt target floor
 * without making the row look like a stack of buttons.
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
              'min-h-10 items-center justify-center rounded-full px-4',
              selected ? 'bg-control' : 'bg-ink/5 active:bg-ink/10',
            )}
          >
            <Text
              className={cn(
                'text-[14px]',
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
