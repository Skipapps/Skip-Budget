import { createElement } from 'react';
import { Pressable, View } from 'react-native';

import { GROUP_ICON_CHOICES } from '@/data/group-icons';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type GroupIconPickerProps = {
  value: string;
  onChange: (iconId: string) => void;
};

/**
 * The whole glyph set, for naming a group by what it is.
 *
 * Wider than the bill picker on purpose: a bill is filed under a category that
 * already implies its icon, while a group is whatever somebody says it is — a
 * flat, a holiday, a car, a dog.
 */
export function GroupIconPicker({ value, onChange }: GroupIconPickerProps) {
  const colors = useColors();

  return (
    <View className="w-full flex-row flex-wrap gap-2.5">
      {GROUP_ICON_CHOICES.map((choice) => {
        const selected = choice.id === value;
        // createElement rather than JSX, for the same reason as GroupIcon.
        const glyph = createElement(choice.icon, {
          width: 21,
          height: 21,
          color: selected ? colors.surface : colors.body,
        });

        return (
          <Pressable
            key={choice.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={choice.id}
            onPress={() => onChange(choice.id)}
            className={cn(
              'h-12 w-12 items-center justify-center rounded-[12px] border',
              selected ? 'border-control bg-control' : 'border-line bg-card active:bg-ink/5',
            )}
          >
            {glyph}
          </Pressable>
        );
      })}
    </View>
  );
}
