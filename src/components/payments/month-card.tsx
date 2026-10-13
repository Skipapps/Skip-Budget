import { Text } from 'react-native';

import { PlumCard } from '@/components/payments/plum-card';
import { dayMonthText } from '@/components/payments/plan-month-row';
import { t } from '@/i18n';
import { monthLong, monthShort } from '@/i18n/calendar';
import type { PlanKind, PlanMonth } from '@/lib/bill-month';
import { formatCurrency } from '@/lib/format';
import { TEXT_CAP } from '@/theme/text-scale';

/** The card's words for one month, apart from the drawing so a test can read them. */
export function monthCardWords(kind: PlanKind, view: PlanMonth) {
  const year = Number(view.month.slice(0, 4));
  const index = Number(view.month.slice(5, 7)) - 1;
  const month = monthLong(index);
  const amount = formatCurrency(view.total);
  const counts =
    view.planCount > 0
      ? t(kind === 'bill' ? 'payments.month.counts.bill' : 'payments.month.counts.subscription', {
          count: view.planCount,
          paid: view.paidCount,
          coming: view.comingCount,
        })
      : t('payments.month.nothingDue', { month });
  const next = view.next
    ? t('payments.month.next', { name: view.next.label, date: dayMonthText(view.next.date) })
    : null;
  // Money paid down on a loan is never due, so it stays out of the figure; Home's Monthly bills
  // tile counts it, so the card says it, and the two together, beside the figure.
  const extras = kind === 'bill' ? (view.extras ?? null) : null;
  const extra = extras
    ? t('payments.month.extra', {
        count: extras.loans,
        amount: formatCurrency(extras.total),
        name: extras.name ?? '',
        total: formatCurrency(extras.inAll),
      })
    : null;

  // With nothing left to come the sentence ends at the counts.
  const sentence = t('payments.month.cardA11y', { month, amount, counts, next: next ?? '' }).trim();
  const spoken = extra ? `${sentence}${/[.!?]$/.test(sentence) ? '' : '.'} ${extra}` : sentence;

  return {
    label: t('payments.month.dueIn', { month }),
    amount,
    counts,
    extra,
    next,
    chip: t('ui.calendar.monthYearShort', { month: monthShort(index), year }),
    chipA11y: t('payments.month.chipA11y', {
      month: t('ui.calendar.monthYear', { month, year }),
    }),
    spoken,
  };
}

/**
 * What is due in the month shown: the figure, how many plans, how many paid and still to come, any
 * extra paid on a loan, and the next one. The month chip opens the month picker.
 */
export function MonthCard({
  kind,
  view,
  onChooseMonth,
}: {
  kind: PlanKind;
  view: PlanMonth;
  onChooseMonth: () => void;
}) {
  const words = monthCardWords(kind, view);
  return (
    <PlumCard
      testID="month-card"
      label={words.label}
      figure={words.amount}
      caption={words.counts}
      footer={words.next}
      accessibilityLabel={words.spoken}
      chip={{
        label: words.chip,
        accessibilityLabel: words.chipA11y,
        onPress: onChooseMonth,
        testID: 'month-chip',
      }}
    >
      {words.extra ? (
        <Text
          testID="month-extra"
          className="mt-[2px] font-app text-[13px] text-on-control/90"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {words.extra}
        </Text>
      ) : null}
    </PlumCard>
  );
}
