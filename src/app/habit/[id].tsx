import { router, useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useSpendCategories } from '@/api/brands';
import { useHistoryFloor } from '@/api/history';
import { habitMaths, useHabit, useHabitTaps, type HabitRow } from '@/api/habits';
import { usePaymentSources } from '@/api/queries';
import { localDate } from '@/components/habits/day-row';
import { habitColorName } from '@/components/habits/habit-color-swatches';
import { HabitIcon } from '@/components/habits/habit-icon';
import { HabitAboutCard, HabitWeekCard } from '@/components/habits/habit-week-card';
import { HabitsHero } from '@/components/habits/habits-hero';
import type { PlanDetailRow } from '@/components/plans/detail-parts';
import { HistoryNotice } from '@/components/pro/history-notice';
import { goBack } from '@/components/ui/back-button';
import { PageState } from '@/components/ui/page-state';
import { RefreshNote } from '@/components/ui/refresh-note';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { SectionHeading } from '@/components/ui/typography';
import { t } from '@/i18n';
import { monthShort } from '@/i18n/calendar';
import { formatFullDate } from '@/lib/date';
import { failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { anyRefreshFailed, failedEmpty } from '@/lib/query-state';
import {
  countsFrom,
  habitHistory,
  savedAllTime,
  skippedDaysAllTime,
  weekStartOf,
  type HabitTap,
} from '@/lib/habit-week';
import { sumMoney } from '@/lib/money';
import { receiptCategoryName } from '@/lib/receipt-category';
import { useToday } from '@/lib/use-today';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

/** "Sep 28", or "Sep 28, 2025" for a day in an earlier year than today. */
function sinceDate(iso: string, today: string): string {
  const date = localDate(iso);
  const parts = { month: monthShort(date.getMonth()), day: date.getDate() };
  return iso.slice(0, 4) < today.slice(0, 4)
    ? t('habits.detail.shortDateYear', { ...parts, year: date.getFullYear() })
    : t('habits.detail.shortDate', parts);
}

/**
 * Everything the page shows; the totals count every receipt whatever the plan lists. Saved is the
 * Habits page's own sum for this one habit, so the two always agree to the cent.
 */
function habitFigures(
  row: HabitRow,
  taps: readonly HabitTap[],
  today: string,
  floor: string | undefined,
) {
  const maths = habitMaths(row);
  const own = taps.filter((tap) => tap.habitId === row.id);
  const boughtDays = new Set(own.map((tap) => tap.day));
  const since = countsFrom(maths);
  const skipped = skippedDaysAllTime(maths, boughtDays, today);

  return {
    since,
    spent: sumMoney(own.map((tap) => tap.amount)),
    saved: savedAllTime([maths], own, today),
    bought: boughtDays.size,
    skipped,
    weeks: habitHistory(maths, own, today, floor),
    hidden: floor !== undefined && (since < floor || own.some((tap) => tap.day < floor)),
  };
}

/**
 * One habit's history: what it has cost and saved since it began, then week by week, newest first,
 * each week opening to its days. The header pencil opens the edit page, Delete included.
 */
export default function HabitDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const artwork = useArtwork();
  const { today } = useToday();
  const habit = useHabit(id);
  const taps = useHabitTaps();
  const { sources } = usePaymentSources();
  const { data: categories = [] } = useSpendCategories();
  // Free lists 90 days back; the totals still count every receipt.
  const { floor, free } = useHistoryFloor();
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set([weekStartOf(today)]));

  const row = habit.data;
  const figures = useMemo(
    () => (row && taps.data ? habitFigures(row, taps.data, today, free ? floor : undefined) : null),
    [row, taps.data, today, free, floor],
  );

  // Stable, so a week card that did not change is not drawn again when another one opens.
  const toggle = useCallback(
    (weekStart: string) =>
      setOpen((current) => {
        const next = new Set(current);
        if (!next.delete(weekStart)) next.add(weekStart);
        return next;
      }),
    [],
  );
  const openReceipt = useCallback(
    (receiptId: string) => router.push({ pathname: '/receipt/[id]', params: { id: receiptId } }),
    [],
  );

  // Deleted from its edit page: that page steps back to here, and a deleted habit has no page, so
  // take one more step back to the dashboard.
  // Judged on what was read, so a failed refresh of a habit still there never steps out.
  const gone = row !== undefined && (row === null || row.archived_at !== null);
  useEffect(() => {
    if (gone) goBack();
  }, [gone]);

  const refetch = () => {
    void habit.refetch();
    void taps.refetch();
  };

  // Only a read with nothing to show is a failed page; a refresh that fails keeps the last read.
  if (failedEmpty(habit) || failedEmpty(taps)) {
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={refetch}
        />
      </Screen>
    );
  }

  if (habit.isPending || taps.isPending || gone || !row || !figures) {
    return (
      <Screen showBack>
        <SkeletonList rows={4} />
      </Screen>
    );
  }

  const price = formatCurrency(row.price);
  const since = t('habits.detail.eachTimeSince', {
    price,
    date: sinceDate(figures.since, today),
  });
  const source = sources.find((option) => option.id === (row.card_id ?? row.bank_account_id));

  const about: PlanDetailRow[] = [
    { label: t('habits.detail.price'), value: t('habits.detail.priceEach', { price }) },
    {
      label: t('receipts.field.paidWith'),
      value: source?.label ?? t('receipts.detail.noPaymentMethod'),
    },
    {
      label: t('receipts.field.category'),
      value: receiptCategoryName(
        row.category_id,
        categories.find((category) => category.id === row.category_id)?.label,
      ),
    },
    { label: t('habitFlow.field.colour'), value: habitColorName(row.color) },
    { label: t('habits.detail.started'), value: formatFullDate(localDate(figures.since)) },
  ];

  return (
    <Screen
      title={row.name}
      showBack
      onRefresh={refetch}
      headerActions={[
        {
          icon: Pencil,
          label: t('habits.detail.edit', { name: row.name }),
          onPress: () => router.push({ pathname: '/habit-new', params: { id: row.id } }),
        },
      ]}
    >
      <HabitsHero
        top={
          <View className="w-full flex-row items-center gap-[10px]">
            <HabitIcon iconId={row.icon_id} color={row.color} size={36} />
            <Text
              className="min-w-0 flex-1 font-app text-[15px] text-on-control"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {since}
            </Text>
          </View>
        }
        topLabel={since}
        label={t('habits.detail.spent')}
        spent={formatCurrency(figures.spent)}
        saved={formatCurrency(figures.saved)}
      />

      <Text
        className="mt-[10px] w-full text-center font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('habits.detail.tally', {
          bought: t('habits.detail.daysBought', { count: figures.bought }),
          skipped: t('habits.detail.daysSkipped', { count: figures.skipped }),
        })}
      </Text>
      <RefreshNote show={anyRefreshFailed([habit, taps])} />

      <SectionHeading
        className="mt-[26px]"
        caption={t('habits.detail.weekCount', { count: figures.weeks.length })}
      >
        {t('habits.detail.weeks')}
      </SectionHeading>
      {figures.weeks.map((week) => (
        <HabitWeekCard
          key={week.weekStart}
          week={week}
          color={row.color}
          today={today}
          open={open.has(week.weekStart)}
          onToggle={toggle}
          onOpenReceipt={openReceipt}
        />
      ))}
      {figures.hidden ? <HistoryNotice className="mt-[14px]" /> : null}

      <SectionHeading className="mt-[26px]">{t('habits.detail.about')}</SectionHeading>
      <View className="w-full pb-[40px]">
        <HabitAboutCard rows={about} />
      </View>
    </Screen>
  );
}
