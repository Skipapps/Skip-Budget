import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { RollingNumber } from '@/components/ui/rolling-number';
import { Skeleton } from '@/components/ui/skeleton';
import { daysLeftInMonth } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';

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
 * The dashboard's headline: what is left, and the two figures it came from.
 *
 * One card rather than a card and a pair beneath it. The three numbers are a
 * single sentence — income, less expenses, leaves this — and splitting them
 * across two surfaces asked the reader to join them back up. Income and
 * expenses sit inside the bottom edge of the same card at a quieter size, so
 * the hierarchy says which one the screen is about.
 *
 * Charcoal, the same surface the buttons and the add control use. A dark card
 * under its own foreground puts the figure further from its background than
 * any tint could, and it leaves colour to mean one thing on this screen.
 *
 * The two supporting figures are drawn in the card's foreground rather than in
 * the money pair: green and red are tuned to be read on the page, not on the
 * control surface, and on a pale accent the only legible member of that pair
 * is the near-black end of the ramp. Their labels and the minus sign carry the
 * direction instead, which is what they were doing anyway.
 */
export function BalanceSummary({
  leftThisMonth,
  payday,
  expenses,
  loading = false,
  error = false,
}: BalanceSummaryProps) {
  const colors = useColors();
  const today = new Date();
  const daysLeft = daysLeftInMonth(today);
  const daysLabel = daysLeft === 0 ? 'Last day' : `${daysLeft} days left`;

  // Wheels cannot shrink to fit, so the size is chosen from the length of the
  // figure instead. Someone with a seven-figure balance gets smaller type
  // rather than a number running off the side of the card.
  const digits = formatCurrency(leftThisMonth).length;
  const fontSize = digits > 12 ? 28 : digits > 10 ? 34 : 40;

  // What share of this month's income is already committed. Only meaningful
  // once income is known, so the bar simply does not appear until it is.
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
            className="font-poppins-medium text-[15px] text-on-control/85"
            maxFontSizeMultiplier={1.3}
          >
            Left this month
          </Text>

          <View className="rounded-full bg-on-control/15 px-3 py-1.5">
            <Text
              className="font-poppins-medium text-[12px] text-on-control"
              allowFontScaling={false}
              numberOfLines={1}
            >
              {daysLabel}
            </Text>
          </View>
        </View>

        {/* A figure that failed to load is never guessed at: the card shows
            that it has nothing rather than a total built from half a month. */}
        {error ? (
          <Text
            className="mt-3 font-poppins-bold text-[40px] text-on-control"
            maxFontSizeMultiplier={1.2}
          >
            —
          </Text>
        ) : loading ? (
          // The label and the pill stay put, so nothing jumps when it lands.
          <View className="mt-3 h-[52px] w-2/3 opacity-20">
            <Skeleton
              className="h-full w-full rounded-[12px]"
              style={{ backgroundColor: colors.onControl }}
            />
          </View>
        ) : (
          <RollingNumber
            className="mt-3 justify-start"
            value={leftThisMonth}
            lineHeight={Math.round(fontSize * 1.3)}
            fontSize={fontSize}
            textClassName="font-poppins-bold text-on-control"
          />
        )}
      </View>

      {error ? (
        <Text
          className="mt-4 font-poppins text-[12px] leading-[17px] text-on-control/85"
          maxFontSizeMultiplier={1.3}
        >
          We could not load this month. Pull down to try again.
        </Text>
      ) : spentShare === null ? null : (
        <View
          className="mt-5 w-full"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${Math.round(spentShare * 100)}% of this month's income is spoken for`}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(spentShare * 100) }}
        >
          <View className="h-2 w-full overflow-hidden rounded-full bg-on-control/15">
            {/* Flex rather than a percentage width: the track is already the
                full width, so the fill can share it without measuring. */}
            <View className="h-full flex-row">
              {/* The card is already the chosen colour, so the fill has to be
                  the one thing guaranteed to read on it: its own foreground. */}
              <View style={{ flex: spentShare }} className="h-full rounded-full bg-on-control" />
              <View style={{ flex: 1 - spentShare }} />
            </View>
          </View>
          <Text
            className="mt-2 font-poppins text-[12px] text-on-control/85"
            maxFontSizeMultiplier={1.3}
          >
            {Math.round(spentShare * 100)}% of this month&apos;s income is spoken for
          </Text>
        </View>
      )}

      {/* Inside the card's bottom edge, under a hairline of its own
          foreground — the two figures the headline is made of, not two
          separate statistics that happen to be nearby. */}
      <View className="mt-5 w-full flex-row gap-4 border-t border-on-control/20 pt-4">
        <Stat label="Income" amount={payday} icon={ArrowDownLeft} loading={loading} error={error} />
        {/* Stored as a positive magnitude; shown as money going out. */}
        <Stat
          label="Expenses"
          amount={-expenses}
          icon={ArrowUpRight}
          loading={loading}
          error={error}
        />
      </View>
    </View>
  );
}

type StatProps = {
  label: string;
  amount: number;
  icon: LucideIcon;
  loading: boolean;
  error: boolean;
};

/** One supporting figure inside the hero's bottom edge. */
function Stat({ label, amount, icon: Icon, loading, error }: StatProps) {
  const colors = useColors();

  return (
    <View
      className="min-w-0 flex-1"
      accessible
      accessibilityLabel={
        error || loading
          ? `${label}, ${error ? 'unavailable' : 'loading'}`
          : `${label}, ${formatCurrency(amount)}`
      }
    >
      <View className="flex-row items-center gap-1.5">
        <View className="opacity-70">
          <Icon size={14} color={colors.onControl} strokeWidth={1.8} />
        </View>
        <Text
          className="shrink font-poppins-medium text-[12px] text-on-control/85"
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          {label}
        </Text>
      </View>

      {loading && !error ? (
        <View className="mt-1.5 h-5 w-24 opacity-20">
          <Skeleton
            className="h-full w-full rounded-[6px]"
            style={{ backgroundColor: colors.onControl }}
          />
        </View>
      ) : (
        <Text
          className="mt-1 font-poppins-semibold text-[20px] text-on-control"
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {error ? '—' : formatCurrency(amount)}
        </Text>
      )}
    </View>
  );
}
