import { createElement } from 'react';
import { View } from 'react-native';

import { habitColor, type HabitColor } from '@/data/habit-colors';
import { FALLBACK_HABIT_ICON, habitIcon } from '@/data/habit-icons';
import { useTheme } from '@/providers/theme-provider';

type HabitIconProps = {
  /** A habit's stored icon id; one this build does not know draws the fallback. */
  iconId: string | null | undefined;
  /** The habit's colour; its soft tint fills the circle. */
  color: HabitColor | null | undefined;
  size?: number;
};

/** A habit's drawing on its colour's tint. Decoration only: the row around it carries the name. */
export function HabitIcon({ iconId, color, size = 44 }: HabitIconProps) {
  const { scheme } = useTheme();
  const { Svg } = habitIcon(iconId) ?? FALLBACK_HABIT_ICON;
  const art = Math.round(size * 0.6);

  return (
    <View
      testID="habit-icon"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, backgroundColor: habitColor(color).tint[scheme] }}
      className="items-center justify-center rounded-full"
    >
      {/* createElement, not JSX: a capitalised local for a looked-up component trips the lint rule. */}
      {createElement(Svg, { width: art, height: art })}
    </View>
  );
}
