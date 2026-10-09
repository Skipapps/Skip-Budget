import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import type { HabitRow } from '@/api/habits';
import { DayRow } from '@/components/habits/day-row';
import { HabitIcon } from '@/components/habits/habit-icon';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { addDays, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import {
  countsFrom,
  isCurrentWeek,
  savedInWeek,
  skippedDaysInWeek,
  skipStreak,
  spentInWeek,
  tapsForHabit,
  weekDays,
  weekStartOf,
  type HabitMaths,
  type HabitTap,
} from '@/lib/habit-week';
import { withTap } from '@/lib/press';

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
   * False draws a preview: nothing presses, and VoiceOver reads the whole card as one line. True by
   * default.
   */
  interactive?: boolean;
  /** The header (icon, name, figures): opens the habit's page. */
  onOpen?: () => void;
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

export type HabitStatus = {
  /** The week in a few words, read by VoiceOver with the card. */
  text: string;
  /** `habit` marks the good news, a run of days skipped, for anything that draws the status. */
  tone: 'muted' | 'habit';
  /** False for a week before the habit began: it has no figures to show or say. */
  tracking: boolean;
};

const dayBefore = (iso: string) => toIsoDate(addDays(new Date(`${iso}T00:00:00`), -1));

/** The card's status: the first case that matches wins. */
export function habitStatus(
  habit: HabitMaths,
  tappedDays: ReadonlySet<string>,
  weekStart: string,
  today: string,
): HabitStatus {
  const monday = weekStartOf(weekStart);
  const firstWeek = weekStartOf(habit.startedOn);
  if (monday < firstWeek) return { text: t('habits.card.notYet'), tone: 'muted', tracking: false };

  const boughtThisWeek = weekDays(monday).filter((day) => tappedDays.has(day)).length;

  if (!isCurrentWeek(monday, today)) {
    if (boughtThisWeek > 0) {
      return {
        text: t('habits.card.boughtDays', { count: boughtThisWeek }),
        tone: 'muted',
        tracking: true,
      };
    }
    // A habit made mid-week only counts from that day: its first week was not skipped whole.
    if (countsFrom(habit) <= monday) {
      return { text: t('habits.card.skippedWeek'), tone: 'habit', tracking: true };
    }
    const skipped = skippedDaysInWeek(habit, tappedDays, monday, today);
    return { text: t('habits.card.skipped', { count: skipped }), tone: 'habit', tracking: true };
  }

  if (tappedDays.has(today)) {
    return { text: t('habits.card.boughtToday'), tone: 'muted', tracking: true };
  }
  if (firstWeek === monday && boughtThisWeek === 0) {
    return { text: t('habits.card.new'), tone: 'muted', tracking: true };
  }
  const streak = skipStreak(habit, tappedDays, today);
  if (streak >= 1) {
    return { text: t('habits.card.skipped', { count: streak }), tone: 'habit', tracking: true };
  }
  if (tappedDays.has(dayBefore(today))) {
    return { text: t('habits.card.boughtYesterday'), tone: 'muted', tracking: true };
  }
  // Made today with earlier days filled in: nothing is skipped yet, and it is still new.
  return { text: t('habits.card.new'), tone: 'muted', tracking: true };
}

/**
 * A habit's week: its icon, its name and what one costs, then a circle per day to fill or empty.
 * The header and the circles are separate buttons, so a tap meant for a day never opens the habit.
 * The week's status and figures are spoken, not drawn: the hero carries Spent and Saved, and the
 * circles show the days.
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
  onOpen,
  onTapDay,
  onUntapDay,
  busyDays,
  floor,
}: HabitCardProps) {
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

  const status = habitStatus(maths, tappedDays, monday, today);
  const priceText = formatCurrency(habit.price);

  const spoken = status.tracking
    ? t('habits.card.spoken', {
        name: habit.name,
        price: priceText,
        status: status.text,
        saved: formatCurrency(savedInWeek(maths, tappedDays, monday, today)),
        spent: formatCurrency(spentInWeek(taps, monday, [habit.id])),
      })
    : t('habits.card.spokenNotYet', { name: habit.name, price: priceText, status: status.text });

  const price = (
    <FitText
      id="price"
      hug
      role="row"
      size={16}
      className="font-app-semibold text-ink"
      slotClassName={beside ? 'shrink-0' : 'mt-0.5'}
    >
      {priceText}
    </FitText>
  );

  const header = (
    <>
      <HabitIcon iconId={habit.icon_id} color={habit.color} size={44} />

      {/* Under the name, the price follows it in the order VoiceOver reads the card. */}
      <View className="min-w-0 flex-1 items-start">
        <FitText
          id="name"
          role="row"
          size={16}
          className="font-app-semibold text-ink"
          slotClassName="w-full"
        >
          {habit.name}
        </FitText>
        {beside ? null : price}
      </View>

      {beside ? price : null}
    </>
  );

  const headerClass = 'w-full flex-row items-center gap-3';

  return (
    <View
      className="w-full rounded-[16px] border border-line bg-card px-4 pb-3 pt-3.5"
      // A preview is one line to VoiceOver: there is nothing in it to press.
      accessible={!interactive}
      accessibilityLabel={interactive ? undefined : spoken}
    >
      <FitGroup group={words} className="w-full" testID="habit-header">
        {interactive && onOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spoken}
            accessibilityHint={t('habits.card.hint')}
            onPress={withTap(onOpen)}
            className={cn(headerClass, 'active:opacity-60')}
          >
            {header}
          </Pressable>
        ) : (
          <View
            className={headerClass}
            accessible={interactive}
            accessibilityLabel={interactive ? spoken : undefined}
          >
            {header}
          </View>
        )}
      </FitGroup>

      <DayRow
        className="mt-3"
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
    </View>
  );
}
