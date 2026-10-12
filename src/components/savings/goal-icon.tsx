import { createElement } from 'react';
import { View } from 'react-native';

import { goalIconOf } from '@/data/goal-types';
import { useGoalTypeIcons, useSavingsIcons } from '@/theme/goal-icons';
import { useGradientIcons } from '@/theme/gradient-icons';

/**
 * A goal's gradient icon by the id it stores, Other for one this version does not know; or the
 * medal, once the goal is reached. Decoration only: the goal's name is always said beside it.
 */
export function GoalIcon({
  iconId,
  size,
  reached = false,
}: {
  iconId: string | null | undefined;
  size: number;
  reached?: boolean;
}) {
  const types = useGoalTypeIcons();
  const { medal } = useSavingsIcons();
  const Icon = reached ? medal : types[goalIconOf(iconId)];
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* createElement, not JSX: a capitalised local for a looked-up component trips the lint rule. */}
      {createElement(Icon, { width: '100%', height: '100%' })}
    </View>
  );
}

/** The savings pig, as the Savings pages draw it beside a figure. */
export function PigIcon({ size }: { size: number }) {
  const { savings } = useGradientIcons();
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {createElement(savings, { width: '100%', height: '100%' })}
    </View>
  );
}
