import { createElement } from 'react';
import { Pressable, View } from 'react-native';

import { GROUP_ICON_CHOICES } from '@/data/group-icons';
import { GLYPH_STROKE } from '@/data/glyphs';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type GroupIconPickerProps = {
  value: string;
  onChange: (iconId: string) => void;
};

/** The whole glyph set, for naming a group by what it is (wider than the bill picker). */
export function GroupIconPicker({ value, onChange }: GroupIconPickerProps) {
  const colors = useColors();

  return (
    <View className="w-full flex-row flex-wrap gap-2.5">
      {GROUP_ICON_CHOICES.map((choice) => {
        const selected = choice.id === value;
        // createElement rather than JSX, for the same reason as GroupIcon.
        const glyph = createElement(choice.icon, {
          size: 21,
          strokeWidth: GLYPH_STROKE,
          color: selected ? colors.onControl : colors.body,
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
