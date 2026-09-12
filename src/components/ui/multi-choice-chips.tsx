import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { selection } from '@/lib/haptics';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

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
  const colors = useColors();
  const toggle = (value: T) => {
    selection();
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
              accessibilityRole="checkbox"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected, selected }}
              hitSlop={{ top: 4, bottom: 4 }}
              onPress={() => toggle(option.value)}
              className={cn(
                'min-h-10 flex-row items-center gap-1.5 rounded-full px-4',
                selected ? 'bg-control' : 'bg-ink/5 active:bg-ink/10',
              )}
            >
              {/* The chip's own foreground, matching the label next to it. */}
              {selected ? <Check size={16} color={colors.onControl} strokeWidth={1.8} /> : null}
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

      {values.length === 0 && emptyHint ? (
        <Text className="mt-2 font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
          {emptyHint}
        </Text>
      ) : null}
    </View>
  );
}
