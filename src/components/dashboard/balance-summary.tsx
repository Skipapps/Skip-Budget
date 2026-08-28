import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { RollingNumber } from '@/components/ui/rolling-number';
import { daysLeftInMonth } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { colors } from '@/theme/colors';
import { moneyTone } from '@/lib/tone';
import { shadows } from '@/theme/shadows';

type BalanceSummaryProps = {
  /** Payday minus expenses. Cash flow, not an account balance. */
  leftThisMonth: number;
  payday: number;
  expenses: number;
  loading?: boolean;
};

/**
 * The dashboard's headline: what is left, and where it went.
 *
 * Built as a card rather than bare type on the page, so the first thing on the
 * dashboard belongs to the same family as the cards in the wallet. It carries
 * no watermark, though the card faces do: they are mostly empty and can afford
 * one, while this holds the number the whole screen is about.
 *
 * Charcoal, the same surface the buttons and the add control use. A dark card
 * under white type puts the figure further from its background than any tint
 * could, and it leaves colour to mean one thing on this screen — the coral in
 * the bar, and the green and red below.
 *
 * The two figures underneath sit on their own tinted surfaces, which is what
 * lets money in and money out be told apart at arm's length without reading
 * either number.
 */
export function BalanceSummary({
  leftThisMonth,
  payday,
  expenses,
  loading = false,
}: BalanceSummaryProps) {
  const today = new Date();
  const daysLeft = daysLeftInMonth(today);

  // Wheels cannot shrink to fit, so the size is chosen from the length of the
  // figure instead. Someone with a seven-figure balance gets smaller type
  // rather than a number running off the side of the card.
  const digits = formatCurrency(leftThisMonth).length;
  const fontSize = digits > 12 ? 28 : digits > 10 ? 34 : 40;

  // What share of this month's income is already committed. Only meaningful
  // once income is known, so the bar simply does not appear until it is.
  const spentShare = payday > 0 ? Math.min(Math.max(expenses / payday, 0), 1) : null;

  return (
    <View className="w-full">
      <View style={shadows.card} className="w-full overflow-hidden rounded-[20px] bg-control p-5">
        <View className="w-full flex-row items-start justify-between gap-3">
          <Text
            className="font-poppins-medium text-[15px] text-white/70"
            maxFontSizeMultiplier={1.3}
          >
            Left this month
          </Text>

          <View className="rounded-full bg-white/15 px-3 py-1.5">
            <Text
              className="font-poppins-medium text-[12px] text-white"
              allowFontScaling={false}
              numberOfLines={1}
            >
              {daysLeft === 0 ? 'Last day' : `${daysLeft} days left`}
            </Text>
          </View>
        </View>

        {loading ? (
          <Text
            className="mt-3 font-poppins-bold text-[40px] text-white"
            maxFontSizeMultiplier={1.2}
          >
            —
          </Text>
        ) : (
          <RollingNumber
            className="mt-3 justify-start"
            value={leftThisMonth}
            lineHeight={Math.round(fontSize * 1.3)}
            fontSize={fontSize}
            textClassName="font-poppins-bold text-white"
          />
        )}

        {spentShare === null ? null : (
          <View className="mt-5 w-full">
            <View className="h-2 w-full overflow-hidden rounded-full bg-white/15">
              {/* Flex rather than a percentage width: the track is already the
                  full width, so the fill can share it without measuring. */}
              <View className="h-full flex-row">
                {/* Coral, so the brand still shows on a card that gave up its
                    colour to let the figure carry the weight. */}
                <View style={{ flex: spentShare }} className="h-full rounded-full bg-accent" />
                <View style={{ flex: 1 - spentShare }} />
              </View>
            </View>
            <Text
              className="mt-2 font-poppins text-[12px] text-white/70"
              maxFontSizeMultiplier={1.3}
            >
              {Math.round(spentShare * 100)}% of this month&apos;s income is spoken for
            </Text>
          </View>
        )}
      </View>

      <View className="mt-3 w-full flex-row gap-3">
        {/* The green and red that work on white are both too dark to read on
            charcoal, so the tone is picked against the surface it actually
            sits on rather than hardcoded. */}
        <Stat
          label="Income"
          amount={payday}
          icon={ArrowDownLeft}
          color={moneyTone(colors.control, 'asset') ?? '#FFFFFF'}
          loading={loading}
        />
        {/* Stored as a positive magnitude; shown as money going out. */}
        <Stat
          label="Expenses"
          amount={-expenses}
          icon={ArrowUpRight}
          color={moneyTone(colors.control, 'debt') ?? '#FFFFFF'}
          loading={loading}
        />
      </View>
    </View>
  );
}

type StatProps = {
  label: string;
  amount: number;
  icon: typeof ArrowDownLeft;
  color: string;
  loading: boolean;
};

/**
 * One figure on the same charcoal as the card above it.
 *
 * All three surfaces match, so the eye reads them as one block and the only
 * colour on it is the money itself — which is the thing worth looking at.
 */
function Stat({ label, amount, icon: Icon, color, loading }: StatProps) {
  return (
    <View className="flex-1 justify-between rounded-[16px] bg-control p-4">
      <View className="flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
          <Icon size={16} color={color} strokeWidth={2.4} />
        </View>
        <Text className="font-poppins-medium text-[13px] text-white/70" maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
      </View>

      <Text
        className="mt-4 font-poppins-semibold text-[18px]"
        style={{ color }}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.2}
      >
        {loading ? '—' : formatCurrency(amount)}
      </Text>
    </View>
  );
}
