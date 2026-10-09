import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useHistoryFloor } from '@/api/history';
import { habitMaths, useHabits, useHabitTaps } from '@/api/habits';
import { usePro } from '@/api/pro';
import { FailureLine } from '@/components/habits/failure-line';
import { HabitCard } from '@/components/habits/habit-card';
import { HabitsHero } from '@/components/habits/habits-hero';
import { useHabitDays } from '@/components/habits/use-habit-days';
import { WeekSelector } from '@/components/habits/week-selector';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton, SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { earliestWeek, savedAllTime, shiftWeek, spentInWeek, weekStartOf } from '@/lib/habit-week';
import { useToday } from '@/lib/use-today';
import { useArtwork } from '@/theme/artwork';

const WEEK_MS = 7 * 86_400_000;

/** Whole weeks from one Monday to a later one; date-only strings parse as UTC, so DST never counts. */
const weeksApart = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / WEEK_MS);

/**
 * Spending habits: one card per habit with a circle for each day of the week shown. A tapped day
 * is a receipt at the habit's price; every untapped day since the habit began counts as saved.
 *
 * Pro starts habits; any plan keeps using the ones it has, so only + and the empty page's action
 * lead a free or lapsed account to the explainer.
 */
export default function HabitsScreen() {
  const artwork = useArtwork();
  const { pro, ready } = usePro();
  const { today } = useToday();
  const habits = useHabits();
  const taps = useHabitTaps();
  const days = useHabitDays(taps.data, today);
  // Free lists 90 days back: the week holding that day is as far back as it goes.
  const { floor, free } = useHistoryFloor();
  const [weeksBack, setWeeksBack] = useState(0);

  const active = useMemo(() => habits.data ?? [], [habits.data]);
  const maths = useMemo(() => active.map(habitMaths), [active]);

  const thisWeek = weekStartOf(today);
  const startWeek = earliestWeek(maths) ?? thisWeek;
  const floorWeek = weekStartOf(floor);
  const firstWeek = free && floorWeek > startWeek ? floorWeek : startWeek;
  const furthestBack = Math.max(0, weeksApart(firstWeek, thisWeek));
  // A habit deleted from under an older week pulls the limit forward; the week follows it.
  const back = Math.min(weeksBack, furthestBack);
  const weekStart = shiftWeek(thisWeek, -back);

  const shownTaps = days.taps ?? [];
  const spent = spentInWeek(
    shownTaps,
    weekStart,
    active.map((habit) => habit.id),
  );
  const saved = savedAllTime(maths, shownTaps, today);

  const addHabit = () => {
    // Until Pro is known a tap does nothing, so nobody who has paid is sent to the explainer.
    if (!ready) return;
    if (pro) router.push('/habit-new');
    else router.push({ pathname: '/pro-feature', params: { id: 'habits' } });
  };

  const moveTo = (next: number) => {
    days.clearFailure();
    setWeeksBack(next);
  };

  const refetch = () => {
    void habits.refetch();
    void taps.refetch();
  };

  const loading = habits.isPending || taps.isPending;
  // Only a read with nothing to show is a failed page; a refresh that fails keeps the last read.
  const failed = (habits.isError && !habits.data) || (taps.isError && !taps.data);
  const refreshFailed = habits.isError || taps.isError;

  return (
    <Screen
      title={t('habits.title')}
      showBack
      onRefresh={refetch}
      headerActions={[{ icon: Plus, label: t('habits.add'), onPress: addHabit }]}
    >
      {failed ? (
        // A habit list that could not be read is never shown as no habits.
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={refetch}
        />
      ) : loading ? (
        <View className="w-full">
          <Skeleton className="mt-3 h-[124px] w-full rounded-[20px]" />
          <View className="mt-5 w-full">
            <SkeletonList rows={3} />
          </View>
        </View>
      ) : active.length === 0 ? (
        <PageState
          art={artwork.emptyWallet}
          title={t('habits.empty.title')}
          message={t('habits.empty.message')}
          actionLabel={t('habits.add')}
          onAction={addHabit}
        />
      ) : (
        <>
          <HabitsHero
            // A new pair of figures is judged side by side again rather than kept stacked.
            key={`${formatCurrency(spent)}|${formatCurrency(saved)}`}
            label={back === 0 ? t('habits.hero.spentThisWeek') : t('habits.hero.spentThatWeek')}
            spent={formatCurrency(spent)}
            saved={formatCurrency(saved)}
          />

          <WeekSelector
            weekStart={weekStart}
            label={back === 0 ? t('habits.week.this') : back === 1 ? t('habits.week.last') : null}
            canGoBack={back < furthestBack}
            canGoForward={back > 0}
            onBack={() => moveTo(back + 1)}
            onForward={() => moveTo(back - 1)}
            onThisWeek={back > 0 ? () => moveTo(0) : undefined}
          />

          {refreshFailed || days.failed ? (
            <FailureLine onRetry={refreshFailed ? refetch : undefined} />
          ) : null}

          <View className="mt-4 w-full gap-3 pb-10">
            {active.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                taps={shownTaps}
                weekStart={weekStart}
                today={today}
                onOpen={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
                onTapDay={(day) => days.fill(habit, day)}
                onUntapDay={(tap) => void days.empty(habit, tap)}
                busyDays={days.busyDays(habit.id)}
                floor={free ? floor : undefined}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
