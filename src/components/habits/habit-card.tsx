import { Pencil } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { HabitRow } from '@/api/habits';
import { DayRow, shortDay } from '@/components/habits/day-row';
import { HabitIcon } from '@/components/habits/habit-icon';
import { Button } from '@/components/ui/button';
import { FitFigure, FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import {
  formatWeekRange,
  savedInWeek,
  spentInWeek,
  tapsForHabit,
  weekLimit,
  weekProgress,
  weekStartOf,
  type HabitMaths,
  type HabitTap,
  type WeekProgress,
} from '@/lib/habit-week';
import { toCents } from '@/lib/money';
import { withTap } from '@/lib/press';
import { useColors, useTheme } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';
import { TEXT_CAP } from '@/theme/text-scale';

/** What a card draws: a saved habit, or the draft on the create flow's Confirm page. */
export type HabitCardHabit = Pick<
  HabitRow,
  'id' | 'name' | 'icon_id' | 'color' | 'price' | 'started_on' | 'saved_from'
>;

export type HabitCardProps = {
  habit: HabitCardHabit;
  /** Every habit's taps, or only this one's: the card keeps its own. */
  taps: readonly HabitTap[];
  /** Any day of the week shown; the card draws Monday to Sunday. */
  weekStart: string;
  /** The local day, yyyy-mm-dd. */
  today: string;
  /**
   * False draws a preview: no pencil or View details, nothing presses, and VoiceOver reads the whole
   * card as one line. True by default.
   */
  interactive?: boolean;
  onEdit?: () => void;
  onDetails?: () => void;
  /** An empty day from the start to today: file its receipt. */
  onTapDay?: (day: string) => void;
  /** A filled day: its receipt, to remove. */
  onUntapDay?: (tap: HabitTap) => void;
  /** Days whose request is in flight; they ignore taps until it settles. */
  busyDays?: ReadonlySet<string>;
  /**
   * The first day the plan shows (a free account's 90-day floor): earlier days are inert and
   * drawn like days before the start. The figures still count them.
   */
  floor?: string;
};

/** "Day 5 of 7" or "Week complete"; null for a week with neither. */
export function progressText(progress: WeekProgress): string | null {
  if (progress.kind === 'current') {
    return t('habits.card.dayOf', { day: progress.day, of: progress.of });
  }
  if (progress.kind === 'complete') return t('habits.card.weekComplete');
  return null;
}

/** Spent over the limit, 0 to 1, from whole cents; empty with no limit. */
function spentShare(spent: number, limit: number): number {
  const limitCents = toCents(limit);
  if (limitCents <= 0) return 0;
  return Math.min(1, Math.max(0, toCents(spent) / limitCents));
}

/**
 * How much of the spend limit is used, as a bar, held at full past the limit. Drawn only: the
 * figures beside it say it in words. `testID` names the track; the fill is its one child.
 */
export function SpendBar({
  spent,
  limit,
  thickness,
  className,
  testID,
}: {
  spent: number;
  limit: number;
  thickness: number;
  className?: string;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: thickness }}
      className={cn('w-full overflow-hidden rounded-full bg-line', className)}
    >
      <View
        className="h-full rounded-full bg-accent"
        style={{ width: `${spentShare(spent, limit) * 100}%` }}
      />
    </View>
  );
}

/**
 * A habit's week: its icon, name and price, what the week cost against its spend limit, what it
 * saved, how far through the week it is, then a circle per day to fill or empty and View details.
 * Only the pencil, the circles and View details press.
 *
 * The name wraps between words. Once a word of it cannot sit beside the price, the price moves
 * under the name, whole.
 */
export function HabitCard({
  habit,
  taps,
  weekStart,
  today,
  interactive = true,
  onEdit,
  onDetails,
  onTapDay,
  onUntapDay,
  busyDays,
  floor,
}: HabitCardProps) {
  const colors = useColors();
  const { scheme } = useTheme();
  const words = useFitGroup({ mode: 'switch' });
  const beside = words.fits;

  // Type-only use of the habits module: a card draws without loading the data layer.
  const maths: HabitMaths = {
    id: habit.id,
    price: habit.price,
    startedOn: habit.started_on,
    savedFrom: habit.saved_from,
  };
  const monday = weekStartOf(weekStart);
  const byDay = useMemo(() => tapsForHabit(taps, habit.id), [taps, habit.id]);
  const tappedDays = useMemo(() => new Set(byDay.keys()), [byDay]);

  // `cents: false` floors, so it is only for a price with no cents to lose. Spoken, the price
  // keeps its cents like every other figure read out.
  const priceText = formatCurrency(habit.price, { cents: toCents(habit.price) % 100 !== 0 });
  const priceSpoken = formatCurrency(habit.price);
  const progress = weekProgress(maths, monday, today);
  const startsText =
    progress.kind === 'notStarted'
      ? t('habits.card.startsOn', { date: shortDay(progress.startsOn) })
      : null;

  const spent = spentInWeek(taps, monday, [habit.id]);
  const saved = savedInWeek(maths, tappedDays, monday, today);
  const limit = weekLimit(maths, monday);
  const pill = progressText(progress);

  const summary =
    startsText !== null
      ? t('habits.card.spokenNotYet', { name: habit.name, price: priceSpoken, status: startsText })
      : t('habits.card.summary', {
          name: habit.name,
          price: priceSpoken,
          spent: formatCurrency(spent),
          limit: formatCurrency(limit),
          saved: formatCurrency(saved),
          // The page never steps past today's week, so a later one only names itself.
          progress: pill ?? formatWeekRange(monday, today),
        });

  const edit = interactive ? onEdit : undefined;

  const price = (
    <FitText
      id="price"
      hug
      role="row"
      size={20}
      className="font-app-bold text-ink"
      slotClassName={beside ? 'min-h-[44px] shrink-0 justify-center' : 'mt-[2px]'}
    >
      {priceText}
    </FitText>
  );

  const header = (
    <FitGroup group={words} className="w-full" testID="habit-header">
      {/* Top-aligned, so the pencil laid over the end of the row lines up however the name wraps. */}
      <View className="w-full flex-row items-start gap-[12px]">
        <HabitIcon iconId={habit.icon_id} color={habit.color} size={44} />

        {/* Under the name, the price follows it in reading order. */}
        <View className="min-h-[44px] min-w-0 flex-1 items-start justify-center">
          <FitText
            id="name"
            role="row"
            size={17}
            className="font-app-semibold text-ink"
            slotClassName="w-full"
          >
            {habit.name}
          </FitText>
          {beside ? null : price}
        </View>

        {beside ? price : null}
        {edit ? <View className="w-[40px]" /> : null}
      </View>
    </FitGroup>
  );

  const figures =
    startsText !== null ? (
      <Text
        className="mt-[18px] font-app text-[15px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {startsText}
      </Text>
    ) : (
      <>
        <FitFigure
          id={`spent-${habit.id}`}
          size={40}
          className="font-app-bold text-ink"
          boxClassName="mt-[18px]"
        >
          {formatCurrency(spent)}
        </FitFigure>
        <Text
          className="mt-[4px] font-app text-[14px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('habits.card.limit', { limit: formatCurrency(limit) })}
        </Text>
        <Text
          className="mt-[6px] font-app text-[14px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('habits.card.savedLine', { amount: formatCurrency(saved) })}
        </Text>
        <SpendBar
          spent={spent}
          limit={limit}
          thickness={8}
          className="mt-[16px]"
          testID={`habit-bar-${habit.id}`}
        />
        {pill !== null ? (
          <View className="mt-[16px] w-full rounded-[12px] bg-ink/[0.04] p-[12px]">
            <Text
              className="text-center font-app-medium text-[15px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {pill}
            </Text>
          </View>
        ) : null}
      </>
    );

  return (
    <View
      className="w-full rounded-[24px] border border-line bg-card p-[20px]"
      style={scheme === 'light' ? shadows.card : null}
      // A preview is one line to VoiceOver: there is nothing in it to press.
      accessible={!interactive}
      accessibilityLabel={interactive ? undefined : summary}
    >
      <View className="w-full">
        {/*
         * The header and the figures are one VoiceOver stop. The pencil is laid over the end of the
         * header row rather than placed inside it, so it is its own stop, read after the summary.
         */}
        <View
          testID={`habit-summary-${habit.id}`}
          accessible={interactive}
          accessibilityLabel={interactive ? summary : undefined}
        >
          {header}
          {figures}
        </View>

        {edit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('habits.detail.edit', { name: habit.name })}
            onPress={withTap(edit)}
            // 40pt drawn, 44pt to the finger; 2pt down centres it on the 44pt icon.
            hitSlop={2}
            className="absolute right-0 top-[2px] h-[40px] w-[40px] items-center justify-center rounded-full border border-line bg-card active:bg-ink/5"
          >
            <Pencil size={20} color={colors.ink} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      <DayRow
        className="mt-[14px]"
        habit={{ ...maths, color: habit.color, name: habit.name }}
        weekStart={monday}
        byDay={byDay}
        today={today}
        interactive={interactive}
        busyDays={busyDays}
        floor={floor}
        onTapDay={onTapDay}
        onUntapDay={onUntapDay}
      />

      {interactive && onDetails ? (
        <Button
          className="mt-[18px]"
          size="compact"
          label={t('habits.card.viewDetails')}
          accessibilityLabel={t('habits.card.viewDetailsA11y', { name: habit.name })}
          onPress={onDetails}
        />
      ) : null}
    </View>
  );
}
