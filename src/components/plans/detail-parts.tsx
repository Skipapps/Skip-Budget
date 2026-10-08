import { Fragment, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FitFigure, FitRows, FitText, useGroupFits } from '@/components/ui/fit-group';
import { SectionHeading } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { withTap } from '@/lib/press';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The parts of a detail page, shared so a bill, a subscription and a receipt read as one page: the
 * summary card on top, then a list of dated amounts under their own heading. Each page decides what
 * goes in them.
 */

export type PlanDetailRow = { label: string; value: string };

type DetailCardProps = {
  /** The bill's icon, or the logo of the subscription or store. */
  mark: ReactNode;
  /** Already formatted. */
  amount: string;
  /** Under the amount: "Monthly", "Bought on 5 Oct 2026". */
  subtitle: string;
  rows: PlanDetailRow[];
};

/** What it is: its mark and amount, then a few facts about it. */
export function DetailCard({ mark, amount, subtitle, rows }: DetailCardProps) {
  return (
    <View className="mt-3 w-full items-center rounded-[16px] border border-line bg-card px-5 pb-2 pt-5">
      {mark}
      <FitFigure
        id="plan-amount"
        size={28}
        className="text-center font-app-bold text-ink"
        boxClassName="mt-3"
      >
        {amount}
      </FitFigure>
      <Text
        className="text-center font-app text-[14px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {subtitle}
      </Text>

      <FitRows className="mt-4 w-full" testID="plan-details">
        {rows.map((row, index) => (
          <DetailRow key={row.label} id={`detail-${index}`} row={row} divider={index > 0} />
        ))}
      </FitRows>
    </View>
  );
}

/**
 * A fact about the plan. Side by side, the label keeps its own width and the value wraps in the rest;
 * once a word of either cannot fit, every row in the card puts its value under its label.
 */
function DetailRow({ id, row, divider }: { id: string; row: PlanDetailRow; divider: boolean }) {
  const stacked = !useGroupFits();
  return (
    <View
      className={cn(
        'w-full py-3',
        divider && 'border-t border-line/60',
        stacked ? 'items-start' : 'flex-row items-start justify-between gap-4',
      )}
    >
      <FitText
        id={`${id}-label`}
        role="row"
        size={14}
        className="font-app text-muted"
        slotClassName={stacked ? 'w-full' : 'shrink'}
      >
        {row.label}
      </FitText>
      <FitText
        id={`${id}-value`}
        role="row"
        size={14}
        className={cn('font-app-medium text-ink', !stacked && 'text-right')}
        slotClassName={stacked ? 'mt-0.5 w-full' : 'min-w-0 flex-1'}
      >
        {row.value}
      </FitText>
    </View>
  );
}

/** One dated amount; a ledger entry is one, and so is a receipt. */
type ChargeLine = { id: string; date: string; amount: number };

type ChargeSectionProps = {
  title: string;
  entries: ChargeLine[];
  /** The small line under each date: "Paid", "Due", the card it went on. */
  status: (entry: ChargeLine) => string;
  moneyColor: (amount: number) => string;
  testID: string;
  /** What a row opens; undefined leaves the row a plain line. */
  onPress?: (entry: ChargeLine) => (() => void) | undefined;
  /**
   * The heading's count and total when the rows are fewer than the window (a free account's list
   * stops at 90 days): the figure stays the whole window's.
   */
  whole?: ChargeLine[];
};

/** A headed card of dated amounts, with their count and total beside the heading. */
export function ChargeSection({
  title,
  entries,
  status,
  moneyColor,
  testID,
  onPress,
  whole = entries,
}: ChargeSectionProps) {
  if (entries.length === 0) return null;
  const total = whole.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <View className="mt-6 w-full">
      <SectionHeading caption={`${whole.length} · ${formatCurrency(Math.abs(total))}`}>
        {title}
      </SectionHeading>
      <FitRows
        className="mt-2 w-full overflow-hidden rounded-[16px] border border-line bg-card"
        testID={testID}
      >
        {entries.map((entry, index) => (
          <Fragment key={entry.id}>
            {index > 0 ? <View className="ml-4 h-px bg-line/60" /> : null}
            <ChargeRow
              entry={entry}
              status={status(entry)}
              color={moneyColor(entry.amount)}
              onPress={onPress?.(entry)}
            />
          </Fragment>
        ))}
      </FitRows>
    </View>
  );
}

/** A charge's date and amount; stacked with the rest of its card, the amount goes under the date. */
function ChargeRow({
  entry,
  status,
  color,
  onPress,
}: {
  entry: ChargeLine;
  status: string;
  color: string;
  onPress?: () => void;
}) {
  const stacked = !useGroupFits();
  const date = formatFullDate(new Date(`${entry.date}T00:00:00`));
  const amount = (
    <FitText
      id={`${entry.id}-amount`}
      hug
      role="row"
      size={15}
      className="font-app-semibold text-ink"
      style={{ color }}
      slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
    >
      {formatCurrency(entry.amount)}
    </FitText>
  );

  const content = (
    <>
      <View className="min-w-0 flex-1 items-start">
        <FitText
          id={`${entry.id}-date`}
          role="row"
          size={15}
          className="font-app-medium text-ink"
          slotClassName="w-full"
        >
          {date}
        </FitText>
        {stacked ? amount : null}
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
          {status}
        </Text>
      </View>
      {stacked ? null : amount}
    </>
  );

  const className = 'min-h-14 w-full flex-row items-center justify-between gap-3 px-4 py-3';
  if (!onPress) return <View className={className}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${date}, ${formatCurrency(entry.amount)}, ${status}`}
      onPress={withTap(onPress)}
      className={cn(className, 'active:opacity-60')}
    >
      {content}
    </Pressable>
  );
}
