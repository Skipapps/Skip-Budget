import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { FitGroup, FitText, useFitGroup, type FitGroupHandle } from '@/components/ui/fit-group';
import { RollingNumber } from '@/components/ui/rolling-number';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { daysLeftInMonth } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { TEXT_CAP } from '@/theme/text-scale';

type BalanceSummaryProps = {
  /** Payday minus expenses. Cash flow, not an account balance. */
  leftThisMonth: number;
  payday: number;
  expenses: number;
  loading?: boolean;
  /** The month could not be fetched. Nothing derived from it may be shown. */
  error?: boolean;
};

/**
 * The dashboard's headline: what is left and the two figures it came from, in one card. The
 * supporting figures use the card's foreground, not the money pair: green and red are tuned for the
 * page, and on a pale accent only the near-black end of the ramp is legible. Their labels and the
 * minus sign carry the direction.
 */
export function BalanceSummary({
  leftThisMonth,
  payday,
  expenses,
  loading = false,
  error = false,
}: BalanceSummaryProps) {
  const colors = useColors();
  // The two labels share one size and the two figures another; the pair stacks if either cannot.
  const labels = useFitGroup({ mode: 'shrink' });
  const figures = useFitGroup({ mode: 'shrink' });
  const stacked = !labels.fits || !figures.fits;
  const today = new Date();
  const daysLeft = daysLeftInMonth(today);
  const daysLabel = daysLeft === 0 ? 'Last day' : `${daysLeft} days left`;

  // Wheels cannot shrink to fit, so the size is chosen from the figure's length: a seven-figure
  // balance gets smaller type rather than running off the card.
  const digits = formatCurrency(leftThisMonth).length;
  const fontSize = digits > 12 ? 28 : digits > 10 ? 34 : 40;

  // Share of this month's income already committed; null until income is known, so no bar shows.
  const spentShare = error || payday <= 0 ? null : Math.min(Math.max(expenses / payday, 0), 1);

  return (
    <View className="w-full overflow-hidden rounded-[24px] bg-control p-5">
      <View
        accessible
        accessibilityLabel={
          error
            ? `Left this month, unavailable, ${daysLabel}`
            : `Left this month, ${formatCurrency(leftThisMonth)}, ${daysLabel}`
        }
      >
        <View className="w-full flex-row items-start justify-between gap-3">
          <Text
            className="shrink font-app-medium text-[15px] text-on-control/85"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            Left this month
          </Text>

          <View className="shrink-0 rounded-full bg-on-control/15 px-3 py-1.5">
            <Text
              className="font-app-medium text-[12px] text-on-control"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {daysLabel}
            </Text>
          </View>
        </View>

        {/* A failed figure is never guessed at: show nothing rather than a total built from half a
            month. */}
        {error ? (
          <Text
            className="mt-3 text-center font-app-bold text-[40px] text-on-control"
            maxFontSizeMultiplier={TEXT_CAP.figure}
          >
            —
          </Text>
        ) : loading ? (
          // The label and the pill stay put, so nothing jumps when it lands.
          <View className="mt-3 h-[52px] w-2/3 self-center opacity-20">
            <Skeleton
              className="h-full w-full rounded-[12px]"
              style={{ backgroundColor: colors.onControl }}
            />
          </View>
        ) : (
          <RollingNumber
            className="mt-3 justify-center"
            value={leftThisMonth}
            lineHeight={Math.round(fontSize * 1.3)}
            fontSize={fontSize}
            textClassName="font-app-bold text-on-control"
          />
        )}
      </View>

      {error ? (
        <Text
          className="mt-4 font-app text-[12px] leading-[17px] text-on-control/85"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {FAILURE_MESSAGE}
        </Text>
      ) : spentShare === null ? null : (
        <View
          className="mt-5 w-full"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${Math.round(spentShare * 100)}% of the income is spent`}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(spentShare * 100) }}
        >
          <View className="h-2 w-full overflow-hidden rounded-full bg-on-control/15">
            <View className="h-full flex-row">
              {/* The card's own foreground, the one colour guaranteed to read on it. */}
              <View style={{ flex: spentShare }} className="h-full rounded-full bg-on-control" />
              <View style={{ flex: 1 - spentShare }} />
            </View>
          </View>
          <Text
            className="mt-2 font-app text-[12px] text-on-control/85"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {Math.round(spentShare * 100)}% of the income is spent
          </Text>
        </View>
      )}

      <FitGroup group={labels} className="mt-5 w-full" testID="stat-labels">
        <FitGroup
          group={figures}
          className={stacked ? 'w-full gap-3' : 'w-full flex-row gap-3'}
          testID="stat-figures"
        >
          <Stat
            label="Income"
            amount={payday}
            icon={ArrowDownLeft}
            loading={loading}
            error={error}
            labels={labels}
            figures={figures}
            stacked={stacked}
          />
          {/* Stored as a positive magnitude; shown as money going out. */}
          <Stat
            label="Expenses"
            amount={-expenses}
            icon={ArrowUpRight}
            loading={loading}
            error={error}
            labels={labels}
            figures={figures}
            stacked={stacked}
          />
        </FitGroup>
      </FitGroup>
    </View>
  );
}

type StatProps = {
  label: string;
  amount: number;
  icon: LucideIcon;
  loading: boolean;
  error: boolean;
  labels: FitGroupHandle;
  figures: FitGroupHandle;
  stacked: boolean;
};

/** The icon beside the label: 14pt and the 6pt gap after it. */
const ICON_ROOM = 20;

function Stat({ label, amount, icon: Icon, loading, error, labels, figures, stacked }: StatProps) {
  const colors = useColors();

  return (
    <View
      className={cn(
        'items-center rounded-[16px] bg-on-control/10 px-3 py-3',
        stacked ? 'w-full' : 'min-w-0 flex-1',
      )}
      accessible
      accessibilityLabel={
        error || loading
          ? `${label}, ${error ? 'unavailable' : 'loading'}`
          : `${label}, ${formatCurrency(amount)}`
      }
    >
      <FitText
        group={labels}
        id={`${label}-label`}
        role="control"
        size={12}
        className="text-center font-app-medium text-on-control/85"
        slotClassName="w-full flex-row items-center justify-center gap-1.5"
        before={
          <View className="opacity-70">
            <Icon size={14} color={colors.onControl} strokeWidth={1.8} />
          </View>
        }
        reserve={ICON_ROOM}
      >
        {label}
      </FitText>

      {loading && !error ? (
        <View className="mt-1.5 h-5 w-24 opacity-20">
          <Skeleton
            className="h-full w-full rounded-[6px]"
            style={{ backgroundColor: colors.onControl }}
          />
        </View>
      ) : (
        <FitText
          group={figures}
          id={`${label}-figure`}
          role="figure"
          size={17}
          className="text-center font-app-semibold text-on-control"
          slotClassName="mt-1 w-full"
        >
          {error ? '—' : formatCurrency(amount)}
        </FitText>
      )}
    </View>
  );
}
