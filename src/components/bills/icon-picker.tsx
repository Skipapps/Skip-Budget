import { Pressable, View } from 'react-native';

import { BILL_ICON_CHOICES } from '@/data/bills-mock';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';

type IconPickerProps = {
  value: string;
  onChange: (iconId: string) => void;
};

/** Icon choices for a bill someone names themselves. */
export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <View className="w-full flex-row flex-wrap gap-3">
      {BILL_ICON_CHOICES.map((choice) => {
        const Icon = choice.icon;
        const selected = choice.id === value;

        return (
          <Pressable
            key={choice.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={choice.id}
            onPress={() => onChange(choice.id)}
            className={cn(
              'h-12 w-12 items-center justify-center rounded-[10px] border',
              selected ? 'border-control bg-control' : 'border-line bg-white active:bg-black/5',
            )}
          >
            <Icon width={22} height={22} color={selected ? colors.surface : colors.body} />
          </Pressable>
        );
      })}
    </View>
  );
}
