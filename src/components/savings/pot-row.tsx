import { ChevronRight } from 'lucide-react-native';
import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';

import { shortMoney } from '@/components/savings/savings-words';
import { potStatusText, StatusPill, type PillStatus } from '@/components/savings/status-pill';
import { FitRows, FitText, useGroupFits } from '@/components/ui/fit-group';
import { SectionHeading } from '@/components/ui/typography';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** A month that moved to savings, or money added to it, as By month lists it. */
export type PotRowData = {
  id: string;
  /** "September", or an added amount's own name ("Birthday gift"). */
  name: string;
  /** "Earned $3,700 · Spent $3,060", or "Added 3 Oct". */
  detail: string;
  /** What it moved to savings; $0 for an overspent month. */
  amount: number;
  status: PillStatus;
};

/**
 * One line of By month. Side by side, the name and detail wrap beside the amount and its pill;
 * once a word of either cannot fit there, every row in the card puts the amount and pill under them.
 */
export function PotRow({ row, onPress }: { row: PotRowData; onPress: () => void }) {
  const colors = useColors();
  const stacked = !useGroupFits();
  const amount = shortMoney(row.amount);

  const figure = (
    <View className={cn(stacked ? 'mt-[6px] flex-row flex-wrap items-center gap-2' : 'items-end')}>
      <Text className="font-app-bold text-[16px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
        {amount}
      </Text>
      <View className={stacked ? undefined : 'mt-[6px] items-end'}>
        <StatusPill status={row.status} />
      </View>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('savings.row.a11y', {
        name: row.name,
        amount,
        status: potStatusText(row.status),
        detail: row.detail,
      })}
      accessibilityHint={t('savings.row.openHint')}
      onPress={withTap(onPress)}
      testID={`pot-row-${row.id}`}
      className="w-full flex-row items-center gap-[10px] px-[18px] py-[14px] active:bg-ink/5"
    >
      <View className={cn('min-w-0 flex-1', !stacked && 'flex-row items-center gap-[12px]')}>
        <View className={stacked ? 'w-full' : 'min-w-0 flex-1'}>
          <FitText
            id={`${row.id}-name`}
            role="row"
            size={16}
            className="font-app-semibold text-ink"
            slotClassName="w-full"
          >
            {row.name}
          </FitText>
          <FitText
            id={`${row.id}-detail`}
            role="row"
            size={13}
            className="font-app text-muted"
            slotClassName="mt-[3px] w-full"
          >
            {row.detail}
          </FitText>
        </View>
        {figure}
      </View>
      <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}

/**
 * By month: one card per year, newest first. Added savings sit in the same list by date. The caller
 * orders the years and the rows.
 */
export function ByMonthSection({
  years,
  onOpen,
}: {
  years: readonly { year: number; rows: readonly PotRowData[] }[];
  onOpen: (id: string) => void;
}) {
  return (
    <View className="w-full" testID="savings-by-month">
      {years.map(({ year, rows }, index) => (
        <View key={year} className="w-full">
          {/* The first year sits beside "By month"; every later one is its own heading. */}
          {index === 0 ? (
            <SectionHeading className="mb-3 mt-7 px-1" caption={String(year)}>
              {t('savings.byMonth')}
            </SectionHeading>
          ) : (
            <SectionHeading className="mb-3 mt-7 px-1">{String(year)}</SectionHeading>
          )}
          <FitRows
            className="w-full overflow-hidden rounded-[20px] border border-line bg-card"
            testID={`savings-year-${year}`}
          >
            {rows.map((row, at) => (
              <Fragment key={row.id}>
                {at > 0 ? <View className="mx-[18px] h-px bg-line" /> : null}
                <PotRow row={row} onPress={() => onOpen(row.id)} />
              </Fragment>
            ))}
          </FitRows>
        </View>
      ))}
    </View>
  );
}
