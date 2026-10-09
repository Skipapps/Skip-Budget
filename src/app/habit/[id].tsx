import { router, useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';

import { useSpendCategories } from '@/api/brands';
import { useHistoryFloor } from '@/api/history';
import { habitMaths, useHabit, useHabitTaps } from '@/api/habits';
import { usePaymentSources, useReceipts, type ReceiptRow } from '@/api/queries';
import { DayRow } from '@/components/habits/day-row';
import { FailureLine } from '@/components/habits/failure-line';
import { HabitIcon } from '@/components/habits/habit-icon';
import { useHabitDays } from '@/components/habits/use-habit-days';
import { ChargeSection, DetailCard, type PlanDetailRow } from '@/components/plans/detail-parts';
import { HistoryNotice } from '@/components/pro/history-notice';
import { goBack } from '@/components/ui/back-button';
import { FitGroup, FitText, useFitGroup, type FitGroupHandle } from '@/components/ui/fit-group';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { SectionHeading } from '@/components/ui/typography';
import type { HabitColor } from '@/data/habit-colors';
import { t, type MessageKey } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatFullDate } from '@/lib/date';
import { failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import {
  formatWeekRange,
  savedAllTime,
  skippedDaysAllTime,
  tapsForHabit,
  weekStartOf,
} from '@/lib/habit-week';
import { sumMoney } from '@/lib/money';
import { receiptCategoryName } from '@/lib/receipt-category';
import { useToday } from '@/lib/use-today';
import { useMoneyColor } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

const COLOUR_NAMES: Record<HabitColor, MessageKey> = {
  caramel: 'habitFlow.color.caramel',
  coral: 'habitFlow.color.coral',
  green: 'habitFlow.color.green',
  blue: 'habitFlow.color.blue',
  violet: 'habitFlow.color.violet',
  pink: 'habitFlow.color.pink',
};

const asDate = (iso: string) => new Date(`${iso}T00:00:00`);

/**
 * One habit, in the bill page's style: its price and how it is paid, this week's days (live, as on
 * the dashboard), what it has cost and saved so far, then every receipt it filed. The header pencil
 * opens the edit page, Delete included; any plan may edit a habit it has.
 */
export default function HabitDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const artwork = useArtwork();
  const moneyColor = useMoneyColor();
  const { today } = useToday();
  const habit = useHabit(id);
  const taps = useHabitTaps();
  const receipts = useReceipts();
  const days = useHabitDays(taps.data, today);
  const { sources } = usePaymentSources();
  const { data: categories = [] } = useSpendCategories();
  // Free lists 90 days back; the totals above still count every receipt.
  const { floor, free } = useHistoryFloor();

  const row = habit.data;
  const own = useMemo(
    () =>
      (receipts.data ?? [])
        .filter((receipt) => receipt.habit_id === id)
        .sort((a, b) => b.purchased_on.localeCompare(a.purchased_on)),
    [receipts.data, id],
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
    void receipts.refetch();
  };

  // Only a read with nothing to show is a failed page; a refresh that fails keeps the last read.
  const refreshFailed = habit.isError || taps.isError || receipts.isError;
  if (
    (habit.isError && row === undefined) ||
    (taps.isError && !taps.data) ||
    (receipts.isError && !receipts.data)
  ) {
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

  if (habit.isPending || taps.isPending || receipts.isPending || gone || !row) {
    return (
      <Screen showBack>
        <SkeletonList rows={4} />
      </Screen>
    );
  }

  const maths = habitMaths(row);
  const shownTaps = (days.taps ?? []).filter((tap) => tap.habitId === row.id);
  const thisWeek = weekStartOf(today);
  const saved = savedAllTime([maths], shownTaps, today);
  const spent = sumMoney(shownTaps.map((tap) => tap.amount));
  const skipped = skippedDaysAllTime(
    maths,
    shownTaps.map((tap) => tap.day),
    today,
  );

  const sourceLabel = (cardId: string | null, accountId: string | null) =>
    sources.find((option) => option.id === (cardId ?? accountId))?.label;

  const details: PlanDetailRow[] = [
    {
      label: t('receipts.field.paidWith'),
      value: sourceLabel(row.card_id, row.bank_account_id) ?? t('receipts.detail.noPaymentMethod'),
    },
    {
      label: t('receipts.field.category'),
      value: receiptCategoryName(
        row.category_id,
        categories.find((category) => category.id === row.category_id)?.label,
      ),
    },
    { label: t('habitFlow.field.colour'), value: t(COLOUR_NAMES[row.color]) },
    { label: t('habits.detail.started'), value: formatFullDate(asDate(row.started_on)) },
  ];

  const listed = own.filter((receipt) => receipt.purchased_on >= floor);
  const hiddenOlder = free && own.some((receipt) => receipt.purchased_on < floor);
  const asLine = (receipt: ReceiptRow) => ({
    id: receipt.id,
    date: receipt.purchased_on,
    amount: -Math.abs(receipt.amount),
  });
  const byId = new Map(own.map((receipt) => [receipt.id, receipt]));

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
      <DetailCard
        mark={<HabitIcon iconId={row.icon_id} color={row.color} size={52} />}
        amount={formatCurrency(row.price)}
        subtitle={t('habits.detail.eachTime')}
        rows={details}
      />

      <SectionHeading className="mt-7" caption={formatWeekRange(thisWeek)}>
        {t('habits.week.this')}
      </SectionHeading>
      <View className="mt-2 w-full rounded-[16px] border border-line bg-card px-3 pb-2.5 pt-1.5">
        <DayRow
          habit={{ ...maths, color: row.color, name: row.name }}
          weekStart={thisWeek}
          byDay={tapsForHabit(shownTaps, row.id)}
          today={today}
          interactive
          busyDays={days.busyDays(row.id)}
          floor={free ? floor : undefined}
          onTapDay={(day) => days.fill(row, day)}
          onUntapDay={(tap) => void days.empty(row, tap)}
        />
      </View>
      {refreshFailed || days.failed ? (
        <FailureLine onRetry={refreshFailed ? refetch : undefined} />
      ) : null}

      <Totals
        spent={formatCurrency(spent)}
        saved={formatCurrency(saved)}
        savedColor={moneyColor(saved)}
      />
      <Text
        className="mt-2 w-full text-center font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('habits.detail.tally', {
          bought: t('habits.detail.bought', { count: shownTaps.length }),
          skipped: t('habits.detail.skipped', { count: skipped }),
        })}
      </Text>

      {hiddenOlder ? <HistoryNotice className="mt-6" /> : null}

      {listed.length === 0 && !hiddenOlder ? (
        <Text
          className="mt-6 w-full pb-10 text-center font-app text-[14px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('habits.detail.empty')}
        </Text>
      ) : listed.length === 0 ? null : (
        <View className="w-full pb-10">
          <ChargeSection
            title={t('receipts.detail.history', { store: row.name })}
            entries={listed.map(asLine)}
            // The heading counts every receipt, as Pro sees it; a free list stops at 90 days.
            whole={own.map(asLine)}
            status={(entry) => {
              const receipt = byId.get(entry.id);
              return (
                (receipt && sourceLabel(receipt.card_id, receipt.bank_account_id)) ??
                t('receipts.detail.noPaymentMethod')
              );
            }}
            moneyColor={moneyColor}
            testID="habit-receipts"
            onPress={(entry) => () =>
              router.push({ pathname: '/receipt/[id]', params: { id: entry.id } })
            }
          />
        </View>
      )}
    </Screen>
  );
}

/** Spent and saved so far, side by side while both fit at one size; stacked otherwise. */
function Totals({
  spent,
  saved,
  savedColor,
}: {
  spent: string;
  saved: string;
  savedColor: string;
}) {
  const labels = useFitGroup({ mode: 'shrink' });
  const figures = useFitGroup({ mode: 'shrink' });
  const stacked = !labels.fits || !figures.fits;

  return (
    <FitGroup group={labels} className="mt-4 w-full" testID="habit-total-labels">
      <FitGroup
        group={figures}
        className={stacked ? 'w-full gap-3' : 'w-full flex-row gap-3'}
        testID="habit-total-figures"
      >
        <Total
          id="spent"
          label={t('habits.detail.spent')}
          amount={spent}
          labels={labels}
          figures={figures}
          stacked={stacked}
        />
        <Total
          id="saved"
          label={t('habits.hero.saved')}
          amount={saved}
          color={savedColor}
          labels={labels}
          figures={figures}
          stacked={stacked}
        />
      </FitGroup>
    </FitGroup>
  );
}

function Total({
  id,
  label,
  amount,
  color,
  labels,
  figures,
  stacked,
}: {
  id: string;
  label: string;
  amount: string;
  color?: string;
  labels: FitGroupHandle;
  figures: FitGroupHandle;
  stacked: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${amount}`}
      className={cn('rounded-[16px] bg-ink/[0.035] p-4', stacked ? 'w-full' : 'min-w-0 flex-1')}
    >
      <FitText
        group={labels}
        id={`${id}-label`}
        role="control"
        size={13}
        className="font-app text-muted"
        slotClassName="w-full"
      >
        {label}
      </FitText>
      <FitText
        group={figures}
        id={`${id}-figure`}
        role="figure"
        size={20}
        className="font-app-bold text-ink"
        style={color ? { color } : undefined}
        slotClassName="mt-1 w-full"
      >
        {amount}
      </FitText>
    </View>
  );
}
