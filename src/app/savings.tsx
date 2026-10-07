import { savedFor, useMonthlySavings, type MonthlySavingRow } from '@/api/queries';
import { useRefreshAll } from '@/api/refresh';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Subtitle } from '@/components/ui/typography';
import { formatCurrency } from '@/lib/format';
import { sortByDateAscending } from '@/lib/group';
import { useArtwork } from '@/theme/artwork';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/providers/theme-provider';
import { FAILURE_MESSAGE } from '@/lib/failure';

/** "August 2026". */
function monthName(month: string): string {
  const date = new Date(`${month}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
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
    <Screen title="Savings" showBack onRefresh={refresh} refreshing={refreshing}>
      <Subtitle className="mt-3">
        When a month ends, whatever was left of it is added here. Nothing is moved between your
        accounts — this is a record, not a transfer.
      </Subtitle>

      {isLoading ? <SkeletonList rows={4} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title={FAILURE_MESSAGE}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : null}

      {!isLoading && !isError && months.length === 0 ? (
        <PageState
          art={artwork.tileSavings}
          title="Nothing yet"
          message="Your first month appears here once it has finished. Until then the figure is still being spent, so there is nothing honest to show."
        />
      ) : null}

      {months.length > 0 ? (
        <>
          <View className="mt-6 w-full items-center rounded-[16px] border border-line bg-card px-5 py-6">
            <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
              Saved so far
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
              across {kept} {kept === 1 ? 'month' : 'months'} that ended with something left
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

  const explain = excluded
    ? 'Left out of your savings. Tap to count it again.'
    : corrected
      ? `You said this month left ${formatCurrency(shown)}${row.note ? ` — ${row.note}` : ''}. Skip worked out ${formatCurrency(computed)}.`
      : over
        ? `${formatCurrency(Number(row.spent))} went out against ${formatCurrency(Number(row.income))} coming in, so this month took from your savings rather than adding to them.`
        : `${formatCurrency(Number(row.income))} came in and ${formatCurrency(Number(row.spent))} went out on bills, subscriptions and receipts — the rest stayed.`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${excluded ? 'Left out of your savings.' : `${formatCurrency(shown)}.`} ${explain} Tap to correct.`}
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
