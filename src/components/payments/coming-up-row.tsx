import { Pressable, Text, View } from 'react-native';

import { PlanMark, dayMonthText } from '@/components/payments/plan-month-row';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { daysUntil, type MonthOccurrence, type MonthPlanRow } from '@/lib/bill-month';
import { formatCurrency } from '@/lib/format';
import { withTap } from '@/lib/press';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * "Tomorrow", "in 10 days". A date today is paid, so it is never coming up; "Today" covers a list
 * drawn just before midnight and read just after.
 */
export function whenText(date: string, today: string): string {
  const days = daysUntil(date, today);
  if (days <= 0) return t('dates.today');
  if (days === 1) return t('payments.pill.tomorrow');
  return t('payments.pill.inDays', { count: days });
}

type ComingUpRowProps = {
  occurrence: MonthOccurrence;
  /** The plan it belongs to, for its mark; its name is the occurrence's own. */
  plan: Pick<MonthPlanRow, 'kind' | 'categoryId' | 'iconId' | 'domain' | 'logoHidden'>;
  /** Null for none: "Card not set", with no link (that is All bills' to offer). */
  sourceLabel: string | null;
  today: string;
  /** Left out when no plan is behind it: the row is then not a button. */
  onOpen?: () => void;
};

/** One date still to come in the month: what, when, from where, how much and how soon. */
export function ComingUpRow({ occurrence, plan, sourceLabel, today, onOpen }: ComingUpRowProps) {
  const words = useFitGroup({ mode: 'switch' });
  const stacked = !words.fits;
  const amount = formatCurrency(occurrence.amount);
  const date = dayMonthText(occurrence.date);
  const source = sourceLabel ?? t('payments.cardNotSet');
  const when = whenText(occurrence.date, today);

  const figure = (
    <FitText
      id="amount"
      hug
      role="row"
      size={15}
      className="font-app-semibold text-ink"
      slotClassName={stacked ? 'mt-0.5' : undefined}
    >
      {amount}
    </FitText>
  );
  const pill = (
    <View testID="coming-pill" className="mt-[4px] rounded-full bg-tint px-[8px] py-[2px]">
      <Text
        className="font-app-semibold text-[12px] text-tint-ink"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {when}
      </Text>
    </View>
  );

  const content = (
    <>
      <PlanMark {...plan} name={occurrence.label} />

      <View className="min-w-0 flex-1 items-start">
        <FitText
          id="name"
          role="row"
          size={15}
          className="font-app-medium text-ink"
          slotClassName="w-full"
        >
          {occurrence.label}
        </FitText>
        {stacked ? figure : null}
        <Text
          className="mt-0.5 font-app text-[12px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {`${date} · ${source}`}
        </Text>
        {stacked ? <View className="items-start">{pill}</View> : null}
      </View>

      {stacked ? null : (
        <View className="shrink-0 items-end">
          {figure}
          {pill}
        </View>
      )}
    </>
  );
  const spoken = t('payments.comingRow.a11y', {
    name: occurrence.label,
    amount,
    date,
    when,
    source,
  });
  const row = 'w-full flex-row items-center gap-3 px-[16px] py-[14px]';
  const testID = `coming-row-${occurrence.id}`;

  return (
    <FitGroup group={words} className="w-full">
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={spoken}
          onPress={withTap(onOpen)}
          testID={testID}
          className={`${row} active:bg-ink/5`}
        >
          {content}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={spoken} testID={testID} className={row}>
          {content}
        </View>
      )}
    </FitGroup>
  );
}
