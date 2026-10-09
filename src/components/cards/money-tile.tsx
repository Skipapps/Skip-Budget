import { ChevronRight } from 'lucide-react-native';
import type { FC, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { FitText, type FitGroupHandle } from '@/components/ui/fit-group';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

export type MoneyTileValue =
  | { kind: 'figure'; text: string }
  /** An action in the tile's own words ("Open", "Add a loan"); the whole tile is the button. */
  | { kind: 'pill'; text: string }
  /** Neutral: something the tile cannot do yet. */
  | { kind: 'soon'; text: string }
  | { kind: 'loading' };

export type MoneyTileGroups = {
  labels: FitGroupHandle;
  figures: FitGroupHandle;
  pills: FitGroupHandle;
  notes: FitGroupHandle;
};

type MoneyTileProps = {
  /** Names the fit slots; the same in every language, unlike the label. */
  id: string;
  icon: FC<SvgProps>;
  label: string;
  value: MoneyTileValue;
  note?: string;
  /** Omitted for a tile that goes nowhere yet: it draws no chevron and takes no press. */
  onPress?: () => void;
  accessibilityLabel: string;
  groups: MoneyTileGroups;
};

/**
 * One of the Money tiles: gradient icon and chevron on top, then the name, a figure or a pill, and
 * a note. Grows into the height its row stretches it to, so two tiles side by side match.
 */
export function MoneyTile({
  id,
  icon: Icon,
  label,
  value,
  note,
  onPress,
  accessibilityLabel,
  groups,
}: MoneyTileProps) {
  const colors = useColors();

  const surface: ReactNode = (
    <View className="w-full grow rounded-[20px] border border-line bg-card p-[16px]">
      <View className="w-full flex-row items-start justify-between">
        <View
          className="h-[48px] w-[48px]"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Icon width="100%" height="100%" />
        </View>
        {onPress ? (
          // Lighter than the type, as drawn: the whole tile is the button, the chevron only hints.
          <View style={{ opacity: 0.55 }}>
            <ChevronRight size={20} color={colors.muted} strokeWidth={2} />
          </View>
        ) : null}
      </View>

      <FitText
        group={groups.labels}
        id={`${id}-label`}
        role="control"
        size={14}
        className="font-app text-muted"
        slotClassName="mt-[13px] w-full"
      >
        {label}
      </FitText>

      {/* One height for a figure and a pill, so the notes of side-by-side tiles line up. */}
      <View className="mt-[6px] min-h-[26px] w-full justify-center">
        {value.kind === 'figure' ? (
          <FitText
            group={groups.figures}
            id={`${id}-figure`}
            role="figure"
            size={18}
            className="font-app-semibold text-ink"
            slotClassName="w-full"
          >
            {value.text}
          </FitText>
        ) : null}
        {value.kind === 'pill' || value.kind === 'soon' ? (
          // The text is the pill, so its measured width includes the padding; measured whole, so
          // the tiles stack before a pill would break onto two lines.
          <FitText
            group={groups.pills}
            id={`${id}-pill`}
            role="control"
            size={13}
            lineHeight={16}
            whole
            className={cn(
              'overflow-hidden rounded-full px-[12px] py-[5px] font-app-medium',
              value.kind === 'pill' ? 'bg-accent/10 text-accent-ink' : 'bg-ink/5 text-muted',
            )}
            slotClassName="w-full items-start"
          >
            {value.text}
          </FitText>
        ) : null}
        {value.kind === 'loading' ? <Skeleton className="h-[18px] w-24 rounded-full" /> : null}
      </View>

      {note ? (
        <FitText
          group={groups.notes}
          id={`${id}-note`}
          role="control"
          size={12}
          className="font-app text-muted"
          slotClassName="mt-[6px] w-full"
        >
          {note}
        </FitText>
      ) : null}
    </View>
  );

  if (!onPress) {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        testID={`money-tile-${id}`}
        className="w-full grow"
      >
        {surface}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={`money-tile-${id}`}
      className="w-full grow active:opacity-80"
    >
      {surface}
    </Pressable>
  );
}
