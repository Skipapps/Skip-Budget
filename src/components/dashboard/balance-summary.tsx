import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { FitGroup, FitText, useFitGroup, type FitGroupHandle } from '@/components/ui/fit-group';
import { RollingNumber } from '@/components/ui/rolling-number';
import { Skeleton } from '@/components/ui/skeleton';
import { percent, t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
import { failureText } from '@/lib/failure';
import { TEXT_CAP } from '@/theme/text-scale';

type BalanceSummaryProps = {
  /** The person's accounts less what their cards owe, rolled on to today (see `moneyBook`). */
  balance: number;
  /** Every pay counted into the balance. */
  income: number;
  /** Every expense counted into the balance, as a positive magnitude. */
  expenses: number;
  loading?: boolean;
  /** Something behind the balance could not be fetched. Nothing derived from it may be shown. */
  error?: boolean;
};

/**
 * The dashboard's headline: the current balance and the money in and out behind it, in one card. The
 * supporting figures use the card's foreground, not the money pair: green and red are tuned for the
 * page, and on a pale accent only the near-black end of the ramp is legible. Their labels and the
 * minus sign carry the direction.
 */
export function BalanceSummary({
  balance,
  income,
  expenses,
  loading = false,
  error = false,
}: BalanceSummaryProps) {
  const colors = useColors();
  // The two labels share one size and the two figures another; the pair stacks if either cannot.
  const labels = useFitGroup({ mode: 'shrink' });
  const figures = useFitGroup({ mode: 'shrink' });
  const stacked = !labels.fits || !figures.fits;

  // Wheels cannot shrink to fit, so the size is chosen from the figure's length: a seven-figure
  // balance gets smaller type rather than running off the card.
  const digits = formatCurrency(balance).length;
  const fontSize = digits > 12 ? 28 : digits > 10 ? 34 : 40;

  // Share of the income counted that has gone out; null until there is income, so no bar shows.
  const spentShare = error || income <= 0 ? null : Math.min(Math.max(expenses / income, 0), 1);
  const spentPercent = spentShare === null ? 0 : Math.round(spentShare * 100);
  const spentLabel = t('home.balance.spent', { percent: percent(spentPercent, 0) });

  return (
    <View className="w-full overflow-hidden rounded-[24px] bg-control p-5">
      <View
        accessible
        accessibilityLabel={
          error
            ? t('home.balance.summaryUnavailable')
            : loading
              ? t('home.balance.statLoading', { label: t('home.balance.left') })
              : t('home.balance.summary', { amount: formatCurrency(balance) })
        }
      >
        <Text
          className="font-app-medium text-[15px] text-on-control/85"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {t('home.balance.left')}
        </Text>

        {/* A failed figure is never guessed at: show nothing rather than a total missing a part. */}
        {error ? (
          <Text
            className="mt-3 text-center font-app-bold text-[40px] text-on-control"
            maxFontSizeMultiplier={TEXT_CAP.figure}
          >
            —
          </Text>
        ) : loading ? (
          // The label stays put, so nothing jumps when it lands.
          <View className="mt-3 h-[52px] w-2/3 self-center opacity-20">
            <Skeleton
              className="h-full w-full rounded-[12px]"
              style={{ backgroundColor: colors.onControl }}
            />
          </View>
        ) : (
          <RollingNumber
            className="mt-3 justify-center"
            value={balance}
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
          {failureText()}
        </Text>
      ) : spentShare === null ? null : (
        <View
          className="mt-5 w-full"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={spentLabel}
          accessibilityValue={{ min: 0, max: 100, now: spentPercent }}
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
            {spentLabel}
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
            id="Income"
            label={t('home.balance.income')}
            amount={income}
            icon={ArrowDownLeft}
            loading={loading}
            error={error}
            labels={labels}
            figures={figures}
            stacked={stacked}
          />
          {/* Stored as a positive magnitude; shown as money going out. */}
          <Stat
            id="Expenses"
            label={t('home.balance.expenses')}
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
  /** Names the fit slots; the same in every language, unlike the label. */
  id: string;
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

function Stat({
  id,
  label,
  amount,
  icon: Icon,
  loading,
  error,
  labels,
  figures,
  stacked,
}: StatProps) {
  const colors = useColors();

  return (
    <View
      className={cn(
        'items-center rounded-[16px] bg-on-control/10 px-3 py-3',
        stacked ? 'w-full' : 'min-w-0 flex-1',
      )}
      accessible
      accessibilityLabel={
        error
          ? t('home.balance.statUnavailable', { label })
          : loading
            ? t('home.balance.statLoading', { label })
            : `${label}, ${formatCurrency(amount)}`
      }
    >
      <FitText
        group={labels}
        id={`${id}-label`}
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
          id={`${id}-figure`}
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
