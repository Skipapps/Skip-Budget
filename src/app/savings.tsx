import { useMonthlySavings } from '@/api/queries';
import { useRefreshAll } from '@/api/refresh';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Subtitle, Title } from '@/components/ui/typography';
import { formatCurrency } from '@/lib/format';
import { useArtwork } from '@/theme/artwork';
import { Text, View } from 'react-native';

/** "August 2026" — the month is the identity of a row, so it is spelled out. */
function monthName(month: string): string {
  const date = new Date(`${month}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * What each month left behind, once it was over.
 *
 * The home screen's "Left this month" is a forecast — income minus the bills
 * due — and it answers "can I afford this". This answers the other question:
 * what did I actually keep. A month only appears here once it has finished,
 * because until then the figure is still being spent.
 *
 * Every month says where its number came from. A savings total nobody can
 * account for is one nobody trusts, and "you saved $840" means nothing next to
 * "$4,200 came in, $3,360 went out".
 */
export default function SavingsScreen() {
  const artwork = useArtwork();
  const { data: months = [], isLoading, isError, refetch } = useMonthlySavings();
  const { refresh, refreshing } = useRefreshAll();

  const total = months.reduce((sum, month) => sum + Number(month.saved), 0);
  const kept = months.filter((month) => Number(month.saved) > 0).length;

  return (
    <Screen showBack onRefresh={refresh} refreshing={refreshing}>
      <Title align="left" className="mt-2">
        Savings
      </Title>
      <Subtitle className="mt-3">
        When a month ends, whatever was left of it is added here. Nothing is moved between your
        accounts — this is a record, not a transfer.
      </Subtitle>

      {isLoading ? <SkeletonList rows={4} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title="Could not load your savings"
          message="Check your connection and try again. Nothing has been lost."
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
          {/* The running total leads, because it is the reason anybody opens
              this page. It can fall as well as rise — a month that was
              overspent takes from it, which is the whole point of not
              flooring a negative month at zero. */}
          <View className="mt-7 w-full items-center rounded-[14px] border border-line bg-card px-5 py-6">
            <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
              Saved so far
            </Text>
            <Text
              className="mt-1 font-poppins-bold text-[38px] text-ink"
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.2}
            >
              {formatCurrency(total)}
            </Text>
            <Text
              className="mt-1 text-center font-poppins text-[13px] text-muted"
              maxFontSizeMultiplier={1.3}
            >
              across {kept} {kept === 1 ? 'month' : 'months'} that ended with something left
            </Text>
          </View>

          <View className="mb-10 mt-8 w-full">
            {months.map((month) => (
              <MonthRow
                key={month.month}
                month={month.month}
                income={Number(month.income)}
                spent={Number(month.spent)}
                saved={Number(month.saved)}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

/**
 * One month, and the arithmetic behind it.
 *
 * The sentence underneath is the point of the row. It is the difference
 * between a number somebody has to take on trust and one they can check.
 */
function MonthRow({
  month,
  income,
  spent,
  saved,
}: {
  month: string;
  income: number;
  spent: number;
  saved: number;
}) {
  const over = saved < 0;
  const name = monthName(month);

  return (
    <View
      className="w-full border-b border-line py-4"
      accessible
      accessibilityLabel={
        over
          ? `${name}. Overspent by ${formatCurrency(Math.abs(saved))}. ${formatCurrency(income)} came in, ${formatCurrency(spent)} went out.`
          : `${name}. Saved ${formatCurrency(saved)}. ${formatCurrency(income)} came in, ${formatCurrency(spent)} went out.`
      }
    >
      <View className="w-full flex-row items-baseline justify-between gap-3">
        <Text
          className="min-w-0 flex-1 font-poppins-semibold text-[16px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {name}
        </Text>
        <Text
          className={
            over
              ? 'font-poppins-bold text-[17px] text-ink'
              : 'font-poppins-bold text-[17px] text-accent-ink'
          }
          maxFontSizeMultiplier={1.3}
        >
          {over ? `−${formatCurrency(Math.abs(saved))}` : formatCurrency(saved)}
        </Text>
      </View>

      <Text
        className="mt-1.5 font-poppins text-[12px] leading-[18px] text-muted"
        maxFontSizeMultiplier={1.4}
      >
        {over
          ? `${formatCurrency(spent)} went out against ${formatCurrency(income)} coming in, so this month took from your savings rather than adding to them.`
          : `${formatCurrency(income)} came in and ${formatCurrency(spent)} went out on bills, subscriptions and receipts — the rest stayed.`}
      </Text>
    </View>
  );
}
