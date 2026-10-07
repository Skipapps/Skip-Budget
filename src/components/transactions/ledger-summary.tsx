import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { LedgerTotals } from '@/api/queries';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

/**
 * What a window of time came to, as the dashboard hero in miniature: the verdict leads, the bar
 * shows the shape of the money, and income and expenses sit underneath as the working.
 */
export function LedgerSummary({ totals }: { totals: LedgerTotals }) {
  const colors = useColors();
  const moneyColor = useMoneyColor();
  const short = totals.net < 0;
  const moved = totals.in + totals.out;
  // Both sides are magnitudes, so the split is simply their share of the pair.
  const inShare = moved > 0 ? totals.in / moved : 0;

  return (
    <View style={shadows.card} className="w-full rounded-[20px] bg-card p-5">
      <View className="w-full flex-row items-center justify-between gap-3">
        <Text
          className="min-w-0 flex-1 font-app text-[13px] text-muted"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {t(short ? 'transactions.summary.shortBy' : 'transactions.summary.leftOver')}
        </Text>

        <View className="shrink-0 rounded-full bg-ink/5 px-3 py-1.5">
          <Text
            className="font-app-medium text-[12px] text-body"
            numberOfLines={1}
            allowFontScaling={false}
          >
            {totals.count === 0
              ? t('transactions.summary.nothingYet')
              : t('transactions.summary.count', { count: totals.count })}
          </Text>
        </View>
      </View>

      <Text
        className="mt-1 font-app-bold text-[26px] text-ink"
        style={{ color: moneyColor(totals.net) }}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.2}
      >
        {formatCurrency(Math.abs(totals.net))}
      </Text>

      {moved === 0 ? null : (
        <View className="mt-4 h-1.5 w-full flex-row overflow-hidden rounded-full bg-ink/5">
          <View style={{ flex: inShare, backgroundColor: colors.moneyIn }} />
          <View style={{ flex: 1 - inShare, backgroundColor: colors.moneyOut }} />
        </View>
      )}

      <View className="mt-4 w-full flex-row gap-3">
        <Stat label={t('transactions.summary.income')} icon={ArrowDownLeft} amount={totals.in} />
        {/* Stored as a magnitude; shown as money going out. */}
        <Stat label={t('transactions.summary.expenses')} icon={ArrowUpRight} amount={-totals.out} />
      </View>
    </View>
  );
}

function Stat({ label, icon: Icon, amount }: { label: string; icon: LucideIcon; amount: number }) {
  const colors = useColors();
  const moneyColor = useMoneyColor();

  return (
    <View
      className="min-w-0 flex-1 items-center rounded-[12px] bg-ink/5 px-3 py-3"
      accessible
      accessibilityLabel={`${label}, ${formatCurrency(amount)}`}
    >
      <View className="flex-row items-center gap-1.5">
        <View className="opacity-70">
          <Icon size={13} color={colors.body} strokeWidth={1.8} />
        </View>
        <Text
          className="shrink font-app-medium text-[12px] text-body"
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          {label}
        </Text>
      </View>

      {/* No adjustsFontSizeToFit here: on iOS it rebuilds the attributed string and drops the
          colour (black on the dark theme). These amounts are short enough that it never fires. */}
      <Text
        className="mt-1 text-center font-app-semibold text-[16px]"
        style={{ color: moneyColor(amount) }}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
        {formatCurrency(amount)}
      </Text>
    </View>
  );
}
