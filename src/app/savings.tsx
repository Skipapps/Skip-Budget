import { savedFor, useMonthlySavings, type MonthlySavingRow } from '@/api/queries';
import { useRefreshAll } from '@/api/refresh';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Subtitle } from '@/components/ui/typography';
import { t } from '@/i18n';
import { monthLong } from '@/i18n/calendar';
import { formatCurrency } from '@/lib/format';
import { sortByDateAscending } from '@/lib/group';
import { useArtwork } from '@/theme/artwork';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/providers/theme-provider';
import { failureText } from '@/lib/failure';

/** "August 2026", "Agosto de 2026": it starts its line, so it takes a capital in every language. */
function monthName(month: string): string {
  const date = new Date(`${month}T00:00:00`);
  const name = t('savings.monthYear', {
    month: monthLong(date.getMonth()),
    year: date.getFullYear(),
  });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * What each month left behind, once it has finished. Unlike the home screen's "Left this month"
 * forecast, this is what was actually kept.
 */
export default function SavingsScreen() {
  const artwork = useArtwork();
  const { data: months = [], isLoading, isError, refetch } = useMonthlySavings();
  const { refresh, refreshing } = useRefreshAll();

  // `savedFor` takes the corrected figure where there is one and nothing from a month left out.
  const total = months.reduce((sum, month) => sum + savedFor(month), 0);
  const kept = months.filter((month) => savedFor(month) > 0).length;

  // Oldest month at the top. The query returns newest-first, so the display order is set here.
  const rows = sortByDateAscending(
    months,
    (month) => month.month,
    (month) => month.month,
  );

  return (
    <Screen title={t('savings.list.title')} showBack onRefresh={refresh} refreshing={refreshing}>
      <Subtitle className="mt-3">{t('savings.list.intro')}</Subtitle>

      {isLoading ? <SkeletonList rows={4} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => refetch()}
        />
      ) : null}

      {!isLoading && !isError && months.length === 0 ? (
        <PageState
          art={artwork.tileSavings}
          title={t('savings.list.emptyTitle')}
          message={t('savings.list.emptyMessage')}
        />
      ) : null}

      {months.length > 0 ? (
        <>
          <View className="mt-6 w-full items-center rounded-[16px] border border-line bg-card px-5 py-6">
            <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
              {t('savings.list.savedSoFar')}
            </Text>
            <Text
              className="mt-1 font-app-bold text-[38px] text-ink"
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.2}
            >
              {formatCurrency(total)}
            </Text>
            <Text
              className="mt-1 text-center font-app text-[13px] text-muted"
              maxFontSizeMultiplier={1.3}
            >
              {t('savings.list.across', { count: kept })}
            </Text>
          </View>

          <View className="mb-10 mt-8 w-full">
            {rows.map((month) => (
              <MonthRow
                key={month.month}
                row={month}
                onPress={() => router.push(`/savings-month?month=${month.month}`)}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function MonthRow({ row, onPress }: { row: MonthlySavingRow; onPress: () => void }) {
  const colors = useColors();

  const computed = Number(row.saved);
  const corrected = row.adjusted_saved !== null;
  const excluded = Boolean(row.excluded_at);
  const shown = corrected ? Number(row.adjusted_saved) : computed;
  const over = shown < 0;
  const name = monthName(row.month);

  const income = formatCurrency(Number(row.income));
  const spent = formatCurrency(Number(row.spent));
  const explain = excluded
    ? t('savings.row.excluded')
    : corrected
      ? row.note
        ? t('savings.row.correctedNote', {
            amount: formatCurrency(shown),
            note: row.note,
            computed: formatCurrency(computed),
          })
        : t('savings.row.corrected', {
            amount: formatCurrency(shown),
            computed: formatCurrency(computed),
          })
      : over
        ? t('savings.row.over', { spent, income })
        : t('savings.row.kept', { income, spent });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        excluded
          ? t('savings.row.labelExcluded', { month: name, explain })
          : t('savings.row.label', { month: name, amount: formatCurrency(shown), explain })
      }
      onPress={onPress}
      className="w-full flex-row items-center gap-3 border-b border-line py-4 active:bg-ink/5"
    >
      <View className="min-w-0 flex-1">
        <View className="w-full flex-row items-baseline justify-between gap-3">
          <Text
            className="min-w-0 flex-1 font-app-medium text-[15px] text-ink"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {name}
          </Text>
          <Text
            // Money colours, never the accent: the sign must read at a glance.
            className={
              excluded
                ? 'font-app text-[14px] text-muted line-through'
                : over
                  ? 'font-app-semibold text-[15px] text-money-out'
                  : 'font-app-semibold text-[15px] text-money-in'
            }
            maxFontSizeMultiplier={1.4}
          >
            {over ? `\u2212${formatCurrency(Math.abs(shown))}` : formatCurrency(shown)}
          </Text>
        </View>

        <Text
          className="mt-1.5 font-app text-[12px] leading-[18px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {explain}
        </Text>
      </View>

      <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}
