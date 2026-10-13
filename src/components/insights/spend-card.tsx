import { Text, View } from 'react-native';

import { CARD, IconWell, Rule, StandRow } from '@/components/insights/rows';
import { SpendChart, type SpendBar } from '@/components/insights/spend-chart';
import { FitFigure, FitRows } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { useHomeIcons } from '@/theme/home-icons';
import { TEXT_CAP } from '@/theme/text-scale';

/** What went out in the period, by kind. */
export type SpendKinds = { receipts: number; bills: number; subscriptions: number };

/**
 * What goes out, for the period picked: what it is ("This month", "March 2026"), the total, the
 * chart, and the total split into receipts, bills and subscriptions.
 */
export function SpendCard({
  label,
  total,
  bars,
  mode,
  kinds,
}: {
  label: string;
  total: number;
  bars: readonly SpendBar[];
  mode: 'month' | 'year';
  kinds: SpendKinds;
}) {
  const icons = useHomeIcons();
  return (
    <View className={CARD} testID="insights-spend">
      <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={TEXT_CAP.control}>
        {label}
      </Text>
      <FitFigure id="out" size={30} className="font-app-bold text-ink" boxClassName="mt-1">
        {formatCurrency(total)}
      </FitFigure>

      <View className="mt-[14px] w-full">
        <SpendChart bars={bars} mode={mode} />
      </View>

      <Rule className="mt-[14px]" />

      <FitRows className="mt-[14px] w-full gap-[12px]" testID="insights-kinds">
        <StandRow
          id="receipts"
          mark={<IconWell icon={icons.receipt} />}
          label={t('insights.out.receipts')}
          value={kinds.receipts}
          plain
        />
        <StandRow
          id="bills"
          mark={<IconWell icon={icons.bill} />}
          label={t('insights.out.bills')}
          value={kinds.bills}
          plain
        />
        <StandRow
          id="subscriptions"
          mark={<IconWell icon={icons.subscription} />}
          label={t('insights.out.subscriptions')}
          value={kinds.subscriptions}
          plain
        />
      </FitRows>

      <Text
        className="mt-[12px] font-app text-[12px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {t('insights.out.recorded')}
      </Text>
    </View>
  );
}
