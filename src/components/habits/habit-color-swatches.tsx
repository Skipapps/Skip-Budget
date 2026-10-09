import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { HABIT_COLORS, type HabitColor } from '@/data/habit-colors';
import { t, type MessageKey } from '@/i18n';
import { selection } from '@/lib/haptics';

const COLOR_NAMES: Record<HabitColor, MessageKey> = {
  caramel: 'habitFlow.color.caramel',
  coral: 'habitFlow.color.coral',
  green: 'habitFlow.color.green',
  blue: 'habitFlow.color.blue',
  violet: 'habitFlow.color.violet',
  pink: 'habitFlow.color.pink',
};

/** "Caramel", in the language on screen. */
export function habitColorName(color: HabitColor): string {
  return t(COLOR_NAMES[color]);
}

/**
 * The six habit colours as 40pt discs. They share the row's width rather than a fixed gap, so all
 * six stay on one line inside a card on a 375pt phone; the chosen one's ring is drawn outside the
 * disc, into that space, so choosing never moves its neighbours.
 */
export function HabitColorSwatches({
  value,
  onChange,
}: {
  value: HabitColor;
  onChange: (color: HabitColor) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      className="w-full flex-row flex-wrap justify-between gap-y-3"
    >
      {HABIT_COLORS.map((color) => {
        const selected = color.id === value;
        return (
          <Pressable
            key={color.id}
            accessibilityRole="radio"
            accessibilityLabel={habitColorName(color.id)}
            accessibilityState={{ selected, checked: selected }}
            hitSlop={4}
            onPress={() => {
              selection();
              onChange(color.id);
            }}
            style={{ backgroundColor: color.fill }}
            className="h-10 w-10 items-center justify-center rounded-full"
          >
            {selected ? (
              <>
                <View
                  testID="habit-color-ring"
                  pointerEvents="none"
                  className="absolute -bottom-1.5 -left-1.5 -right-1.5 -top-1.5 rounded-full border-2 border-ink"
                />
                <Check size={18} color="#FFFFFF" strokeWidth={3} />
              </>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
