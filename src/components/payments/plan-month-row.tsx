import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { BillMark } from '@/components/bills/bill-mark';
import { recurrenceLabel } from '@/components/bills/bill-row';
import { BrandMark } from '@/components/brands/brand-mark';
import { cycleLabel } from '@/components/subscriptions/subscription-row';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { monthShort } from '@/i18n/calendar';
import type { MonthPlanRow, MonthStatus, PlanKind } from '@/lib/bill-month';
import { formatCurrency } from '@/lib/format';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** "22 Oct": read from the string, so no time zone can move the day. */
export function dayMonthText(date: string): string {
  return `${Number(date.slice(8, 10))} ${monthShort(Number(date.slice(5, 7)) - 1)}`;
}

/** "3 Mar 2027": a date far enough off that it needs its year. */
export function fullDateText(date: string): string {
  return `${dayMonthText(date)} ${date.slice(0, 4)}`;
}

/** How often a plan comes round, in the words its own list uses. */
export function planRecurrence(kind: PlanKind, recurrence: string): string {
  return kind === 'bill' ? recurrenceLabel(recurrence) : cycleLabel(recurrence);
}

/** A row's status as written and read: "Paid", "Next 22 Oct", "Next 3 Mar 2027", or none. */
export function statusText(status: MonthStatus): string | null {
  switch (status.kind) {
    case 'paid':
      return t('payments.status.paid');
    case 'next':
      return t('payments.status.next', {
        date: status.inMonth ? dayMonthText(status.date) : fullDateText(status.date),
      });
    case 'ends':
      return t('payments.status.ends', { date: fullDateText(status.date) });
    case 'none':
      return null;
  }
}

/** A bill's own mark (logo, loan type or category icon), or a subscription's logo. */
export function PlanMark({
  kind,
  name,
  categoryId,
  iconId,
  domain,
  logoHidden,
}: Pick<MonthPlanRow, 'kind' | 'name' | 'categoryId' | 'iconId' | 'domain' | 'logoHidden'>) {
  return kind === 'bill' ? (
    <BillMark
      categoryId={categoryId}
      iconId={iconId}
      domain={logoHidden ? null : domain}
      name={name}
      size={40}
    />
  ) : (
    <BrandMark name={name} domain={domain} hidden={logoHidden} size={40} />
  );
}

/** "✓ Paid" in the money-in green; the tick is drawn, never read. */
export function PaidLine() {
  const colors = useColors();
  return (
    <View testID="paid-line" className="mt-0.5 flex-row items-center gap-[3px]">
      <Check size={12} color={colors.moneyIn} strokeWidth={2.6} />
      <Text
        className="font-app-medium text-[12px] text-money-in"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {t('payments.status.paid')}
      </Text>
    </View>
  );
}

function StatusLine({ status }: { status: MonthStatus }) {
  if (status.kind === 'paid') return <PaidLine />;
  const words = statusText(status);
  if (!words) return null;
  return (
    <Text className="mt-0.5 font-app text-[12px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
      {words}
    </Text>
  );
}

type PlanMonthRowProps = {
  row: MonthPlanRow;
  /** The card or account it charges; null for none, which offers "Add a card". */
  sourceLabel: string | null;
  onOpen: () => void;
  onAddCard: () => void;
};

/**
 * One plan under All bills / All subscriptions: its mark, name, how often and from where, what it
 * comes to in the month and where it stands. With no card, "Add a card" is a target of its own and,
 * for VoiceOver, an action on the row. A name word too wide to sit beside the amount puts the
 * amount and status under the name.
 */
export function PlanMonthRow({ row, sourceLabel, onOpen, onAddCard }: PlanMonthRowProps) {
  const words = useFitGroup({ mode: 'switch' });
  const stacked = !words.fits;
  const recurrence = planRecurrence(row.kind, row.recurrence);
  const amount = formatCurrency(row.amount);
  const noCard = sourceLabel === null;
  const status = statusText(row.status);

  const spoken = t('payments.planRow.a11y', {
    name: row.name,
    amount,
    recurrence,
    source: sourceLabel ?? t('payments.cardNotSet'),
    status: status ?? '',
  }).replace(/,\s*$/, '');

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

  return (
    <FitGroup group={words} className="w-full" testID={`plan-row-${row.planId}-words`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityActions={noCard ? [{ name: 'addCard', label: t('payments.addCard') }] : []}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'addCard') onAddCard();
        }}
        onPress={withTap(onOpen)}
        testID={`plan-row-${row.planId}`}
        className="w-full flex-row items-center gap-3 px-[16px] py-[14px] active:bg-ink/5"
      >
        <PlanMark {...row} />

        <View className="min-w-0 flex-1 items-start">
          <FitText
            id="name"
            role="row"
            size={15}
            className="font-app-medium text-ink"
            slotClassName="w-full"
          >
            {row.name}
          </FitText>
          {stacked ? figure : null}
          <View className="mt-0.5 w-full flex-row flex-wrap items-center gap-x-[4px]">
            <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
              {noCard ? `${recurrence} ·` : `${recurrence} · ${sourceLabel}`}
            </Text>
            {noCard ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('payments.addCard')}
                accessibilityHint={t('payments.addCardHint', { name: row.name })}
                onPress={withTap(onAddCard)}
                // A 12pt line made 44pt to the finger.
                hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                testID={`plan-row-${row.planId}-add-card`}
                className="active:opacity-60"
              >
                {/* tint-ink, not accent-ink: accent-ink is tuned for the page and falls to 3.96:1
                    on a dark card. */}
                <Text
                  className="font-app-medium text-[12px] text-tint-ink"
                  maxFontSizeMultiplier={TEXT_CAP.row}
                >
                  {t('payments.addCard')}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {stacked ? <StatusLine status={row.status} /> : null}
        </View>

        {stacked ? null : (
          <View className="shrink-0 items-end">
            {figure}
            <StatusLine status={row.status} />
          </View>
        )}
      </Pressable>
    </FitGroup>
  );
}
