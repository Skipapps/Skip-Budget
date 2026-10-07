import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { LedgerTotals } from '@/api/queries';
import {
  FitFigure,
  FitGroup,
  FitText,
  useFitGroup,
  type FitGroupHandle,
} from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * What a window of time came to, as the dashboard hero in miniature: the verdict leads, the bar
 * shows the shape of the money, and income and expenses sit underneath as the working.
 */
export function LedgerSummary({ totals }: { totals: LedgerTotals }) {
  const colors = useColors();
  const moneyColor = useMoneyColor();
  // The two labels share one size and the two figures another; the pair stacks if either cannot.
  const labels = useFitGroup({ mode: 'shrink' });
  const figures = useFitGroup({ mode: 'shrink' });
  const stacked = !labels.fits || !figures.fits;
  const short = totals.net < 0;
  const moved = totals.in + totals.out;
  // Both sides are magnitudes, so the split is simply their share of the pair.
  const inShare = moved > 0 ? totals.in / moved : 0;

  return (
    <View style={shadows.card} className="w-full rounded-[20px] bg-card p-5">
      <View className="w-full flex-row items-center justify-between gap-3">
        <Text
          className="min-w-0 flex-1 font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {t(short ? 'transactions.summary.shortBy' : 'transactions.summary.leftOver')}
        </Text>

        <View className="shrink-0 rounded-full bg-ink/5 px-3 py-1.5">
          <Text
            className="font-app-medium text-[12px] text-body"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {totals.count === 0
              ? t('transactions.summary.nothingYet')
              : t('transactions.summary.count', { count: totals.count })}
          </Text>
        </View>
      </View>

      <FitFigure
        id="net"
        size={26}
        className="font-app-bold text-ink"
        style={{ color: moneyColor(totals.net) }}
        boxClassName="mt-1"
      >
        {formatCurrency(Math.abs(totals.net))}
      </FitFigure>

      {moved === 0 ? null : (
        <View className="mt-4 h-1.5 w-full flex-row overflow-hidden rounded-full bg-ink/5">
          <View style={{ flex: inShare, backgroundColor: colors.moneyIn }} />
          <View style={{ flex: 1 - inShare, backgroundColor: colors.moneyOut }} />
        </View>
      )}

      <FitGroup group={labels} className="mt-4 w-full" testID="ledger-stat-labels">
        <FitGroup
          group={figures}
          className={stacked ? 'w-full gap-3' : 'w-full flex-row gap-3'}
          testID="ledger-stat-figures"
        >
          <Stat
            id="Income"
            label={t('transactions.summary.income')}
            icon={ArrowDownLeft}
            amount={totals.in}
            labels={labels}
            figures={figures}
            stacked={stacked}
          />
          {/* Stored as a magnitude; shown as money going out. */}
          <Stat
            id="Expenses"
            label={t('transactions.summary.expenses')}
            icon={ArrowUpRight}
            amount={-totals.out}
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
  icon: LucideIcon;
  amount: number;
  labels: FitGroupHandle;
  figures: FitGroupHandle;
  stacked: boolean;
};

/** The icon beside the label: 13pt and the 6pt gap after it. */
const ICON_ROOM = 19;

function Stat({ id, label, icon: Icon, amount, labels, figures, stacked }: StatProps) {
  const colors = useColors();
  const moneyColor = useMoneyColor();

  return (
    <View
      className={cn(
        'items-center rounded-[12px] bg-ink/5 px-3 py-3',
        stacked ? 'w-full' : 'min-w-0 flex-1',
      )}
      accessible
      accessibilityLabel={`${label}, ${formatCurrency(amount)}`}
    >
      <FitText
        group={labels}
        id={`${id}-label`}
        role="control"
        size={12}
        className="text-center font-app-medium text-body"
        slotClassName="w-full flex-row items-center justify-center gap-1.5"
        before={
          <View className="opacity-70">
            <Icon size={13} color={colors.body} strokeWidth={1.8} />
          </View>
        }
        reserve={ICON_ROOM}
      >
        {label}
      </FitText>

      <FitText
        group={figures}
        id={`${id}-figure`}
        role="figure"
        size={16}
        className="text-center font-app-semibold"
        style={{ color: moneyColor(amount) }}
        slotClassName="mt-1 w-full"
      >
        {formatCurrency(amount)}
      </FitText>
    </View>
  );
}
