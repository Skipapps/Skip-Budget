import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Compact pick-one control for short option sets. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="w-full flex-row rounded-[10px] border border-line p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              'flex-1 items-center justify-center rounded-[7px] py-2.5',
              selected ? 'bg-control' : 'active:bg-black/5',
            )}
          >
            <Text
              className={cn(
                'text-[13px]',
                selected ? 'font-poppins-medium text-white' : 'font-poppins text-body',
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
