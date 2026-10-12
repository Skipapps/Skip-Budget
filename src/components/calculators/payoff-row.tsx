import { Banknote } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import type { PayoffPosting } from '@/lib/loan';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Money paid off a saved loan, among the schedule's payments where it posted: its day and what it
 * was, how it split, then the amount and what it left. Laid out as a payment row, so the figures
 * line up with theirs.
 */
export function PayoffRow({ posting, first = false }: { posting: PayoffPosting; first?: boolean }) {
  const colors = useColors();
  const kind = posting.full ? t('loanFlow.view.paidOff') : t('loanFlow.view.extraPayment');
  const figures = {
    kind,
    date: formatFullDate(new Date(`${posting.on}T00:00:00`)),
    amount: formatCurrency(posting.amount),
    interest: formatCurrency(posting.interest),
    principal: formatCurrency(posting.principal),
    balance: formatCurrency(posting.balance),
  };

  return (
    <View
      accessible
      accessibilityLabel={t('loanFlow.schedule.payoffA11y', figures)}
      testID={`schedule-payoff-${posting.id ?? posting.on}`}
      className={cn(
        'w-full flex-row items-center gap-[12px] px-[16px] py-[12px]',
        first ? undefined : 'border-t border-line',
      )}
    >
      <View className="min-h-[24px] min-w-[24px] items-center justify-center rounded-full bg-accent/10">
        <Banknote size={13} color={colors.accentInk} strokeWidth={2} />
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-0.5">
          <Text
            className="font-app-semibold text-[15px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {figures.date}
          </Text>
          <View className="rounded-full bg-accent/10 px-2 py-0.5">
            <Text
              className="font-app-semibold text-[11px] text-accent-ink"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {kind}
            </Text>
          </View>
        </View>
        <Text
          className="mt-0.5 font-app text-[11px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('loan.schedule.rowSplit', {
            principal: figures.principal,
            interest: figures.interest,
          })}
        </Text>
      </View>

      <View className="shrink-0 items-end">
        <Text
          className="font-app-semibold text-[15px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {figures.amount}
        </Text>
        <Text
          className="mt-0.5 font-app text-[11px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('loan.schedule.left', { amount: figures.balance })}
        </Text>
      </View>
    </View>
  );
}
