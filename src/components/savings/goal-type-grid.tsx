import { Pressable, View } from 'react-native';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { GOAL_TYPES, goalTypeLabelKey, type GoalType } from '@/data/goal-types';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import { useGoalTypeIcons } from '@/theme/goal-icons';

/**
 * Pick one of the twelve goal types, four to a row. The names shrink together, never below their
 * design size; when a word still cannot fit its tile the grid steps to three columns, then two.
 * "Emergency" needs about 70pt at 12pt, which a quarter of a 390pt phone only just holds, so the
 * tiles keep a narrow side padding and the step down comes before any word is cut.
 */
export function GoalTypeGrid({
  value,
  onChange,
}: {
  /** Null until one is picked: a new goal has no type until the person says. */
  value: GoalType | null;
  onChange: (type: GoalType) => void;
}) {
  const icons = useGoalTypeIcons();
  const four = useFitGroup({ mode: 'shrink' });
  const three = useFitGroup({ mode: 'shrink' });
  const columns = four.fits ? 4 : three.fits ? 3 : 2;
  // Two columns keep the three-column group: held in its fallback, it still shrinks the names.
  const names = columns === 4 ? four : three;

  const rows: GoalType[][] = [];
  for (let at = 0; at < GOAL_TYPES.length; at += columns) {
    rows.push(GOAL_TYPES.slice(at, at + columns));
  }

  return (
    <FitGroup key={columns} group={names} className="w-full" testID="goal-type-grid">
      <View accessibilityRole="radiogroup" className="w-full gap-[8px]">
        {rows.map((row) => (
          <View key={row[0]} className="w-full flex-row gap-[8px]">
            {row.map((type) => {
              const Icon = icons[type];
              const selected = type === value;
              const label = t(goalTypeLabelKey(type));
              return (
                <Pressable
                  key={type}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  accessibilityLabel={label}
                  onPress={() => {
                    selection();
                    onChange(type);
                  }}
                  testID={`goal-type-${type}`}
                  className={cn(
                    'min-w-0 flex-1 items-center rounded-[14px]',
                    // The thicker chosen border takes its extra point from the padding, so nothing moves.
                    selected
                      ? 'border-2 border-accent bg-tint px-[2px] pb-[9px] pt-[11px]'
                      : 'border border-line bg-card px-[3px] pb-[10px] pt-[12px] active:bg-ink/5',
                  )}
                >
                  <View
                    className="h-[34px] w-[34px]"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    <Icon width="100%" height="100%" />
                  </View>
                  <FitText
                    id={`goal-type-${type}`}
                    role="control"
                    size={12}
                    className={cn(
                      'text-center font-app-medium',
                      selected ? 'text-tint-ink' : 'text-body',
                    )}
                    slotClassName="mt-[6px] w-full"
                  >
                    {label}
                  </FitText>
                </Pressable>
              );
            })}
            {/* An empty cell keeps a short last row's tiles the width of the others. */}
            {Array.from({ length: columns - row.length }, (_, index) => (
              <View key={`empty-${index}`} className="min-w-0 flex-1" />
            ))}
          </View>
        ))}
      </View>
    </FitGroup>
  );
}
