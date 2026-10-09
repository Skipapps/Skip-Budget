import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatWeekRange } from '@/lib/habit-week';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type WeekSelectorProps = {
  /** The Monday of the week shown. */
  weekStart: string;
  /** "This week", "Last week", or nothing for older weeks. */
  label: string | null;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  /** Set on any week but this one: the range becomes a way back to it. */
  onThisWeek?: () => void;
};

/** The week the cards and the hero show, stepped a week at a time. */
export function WeekSelector({
  weekStart,
  label,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onThisWeek,
}: WeekSelectorProps) {
  const range = formatWeekRange(weekStart);
  const spoken = label ? t('habits.week.spoken', { label, range }) : range;

  const centre = (
    <>
      {label ? (
        <Text
          className="text-center font-app text-[12px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {label}
        </Text>
      ) : null}
      <Text
        className="text-center font-app-semibold text-[15px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {range}
      </Text>
    </>
  );

  return (
    <View className="mt-5 w-full flex-row items-center gap-3">
      <Arrow
        icon={ChevronLeft}
        label={t('habits.week.previous')}
        enabled={canGoBack}
        onPress={onBack}
      />

      {onThisWeek ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={spoken}
          accessibilityHint={t('habits.week.backToThis')}
          onPress={withTap(onThisWeek)}
          className="min-h-11 min-w-0 flex-1 items-center justify-center rounded-[12px] active:bg-ink/5"
        >
          {centre}
        </Pressable>
      ) : (
        <View
          accessible
          accessibilityLabel={spoken}
          className="min-h-11 min-w-0 flex-1 items-center justify-center"
        >
          {centre}
        </View>
      )}

      <Arrow
        icon={ChevronRight}
        label={t('habits.week.next')}
        enabled={canGoForward}
        onPress={onForward}
      />
    </View>
  );
}

function Arrow({
  icon: Icon,
  label,
  enabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      onPress={withTap(onPress)}
      disabled={!enabled}
      // 40pt drawn, 44pt to the finger.
      hitSlop={2}
      className={cn(
        'h-10 w-10 items-center justify-center rounded-full border border-line bg-card active:bg-ink/5',
        !enabled && 'opacity-30',
      )}
    >
      <Icon size={20} color={colors.ink} strokeWidth={2} />
    </Pressable>
  );
}
