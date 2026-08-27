import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
};

type MultiChoiceChipsProps<T extends string> = {
  options: readonly ChoiceOption<T>[];
  /** Selected values. Order is not significant. */
  values: readonly T[];
  onChange: (values: T[]) => void;
  emptyHint?: string;
};

/** Pick-many chips. Used for linking one salary source to several accounts. */
export function MultiChoiceChips<T extends string>({
  options,
  values,
  onChange,
  emptyHint,
}: MultiChoiceChipsProps<T>) {
  const toggle = (value: T) => {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  return (
    <View className="w-full">
      <View className="w-full flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => toggle(option.value)}
              className={cn(
                'flex-row items-center gap-1.5 rounded-full border px-4 py-2.5',
                selected ? 'border-control bg-control' : 'border-line bg-white active:bg-black/5',
              )}
            >
              {selected ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
              <Text
                className={cn(
                  'text-[13px]',
                  selected ? 'font-poppins-medium text-white' : 'font-poppins text-body',
                )}
                maxFontSizeMultiplier={1.2}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {values.length === 0 && emptyHint ? (
        <Text className="mt-2 font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
          {emptyHint}
        </Text>
      ) : null}
    </View>
  );
}
