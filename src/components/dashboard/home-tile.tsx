import type { FC, ReactNode } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { FitText, type FitGroupHandle } from '@/components/ui/fit-group';
import { cn } from '@/lib/cn';

export type HomeTileGroups = {
  /** Every name in the grid, at one size. */
  names: FitGroupHandle;
  /** Every note in the grid, at one size. */
  notes: FitGroupHandle;
};

type HomeTileProps = {
  /** Names the fit slots; the same in every language, unlike the name. */
  id: string;
  icon: FC<SvgProps>;
  /** Drawn top right, level with the icon. The whole tile is the button, so it is only a mark. */
  mark: ReactNode;
  name: string;
  note: string;
  groups: HomeTileGroups;
  accessibilityLabel: string;
  onPress: PressableProps['onPress'];
  /** How the tile sits in its row: `min-w-0 flex-1` beside another, `w-full` alone. */
  className?: string;
};

/**
 * A Quick add or Go further tile: gradient icon and a mark on top, then the name and a note, which
 * wrap between words. No height of its own, so a row stretches the two tiles in it to the taller.
 */
export function HomeTile({
  id,
  icon: Icon,
  mark,
  name,
  note,
  groups,
  accessibilityLabel,
  onPress,
  className,
}: HomeTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={`home-tile-${id}`}
      className={cn(
        'rounded-[20px] border border-line bg-card p-[16px] active:opacity-80',
        className,
      )}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="w-full flex-row items-center justify-between"
      >
        <View className="h-[42px] w-[42px]">
          <Icon width="100%" height="100%" />
        </View>
        {mark}
      </View>

      <FitText
        group={groups.names}
        id={`${id}-name`}
        role="control"
        size={15}
        className="font-app-semibold text-ink"
        slotClassName="mt-[12px] w-full"
      >
        {name}
      </FitText>
      <FitText
        group={groups.notes}
        id={`${id}-note`}
        role="control"
        size={12}
        className="font-app text-muted"
        slotClassName="mt-[4px] w-full"
      >
        {note}
      </FitText>
    </Pressable>
  );
}
