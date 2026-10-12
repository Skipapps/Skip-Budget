import { Text, View } from 'react-native';

import { LoanSummaryLine } from '@/components/calculators/loan-result-card';
import { LoanTypeIcon } from '@/components/calculators/loan-type-icon';
import { loanRateText } from '@/components/calculators/schedule-card';
import { LoanBar } from '@/components/loans/loan-facts';
import {
  pageDate,
  paidFromSpoken,
  paidFromText,
  spokenDate,
  type LoanView,
} from '@/components/loans/view/loan-view-data';
import { FitFigure, FitRows } from '@/components/ui/fit-group';
import { percent, t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { TEXT_CAP } from '@/theme/text-scale';

/** The line under the name, drawn and spoken: when the next payment is, or how the loan ended. */
function headLine(view: LoanView, today: string): { shown: string; spoken: string } {
  const { status, ending, endedOn } = view;
  if (ending === 'paid') {
    const date = endedOn ? spokenDate(endedOn) : '—';
    const line = t('loan.list.paidOffOn', { date });
    return { shown: line, spoken: line };
  }
  if (ending === 'stopped') {
    const amount = formatCurrency(status.amountLeft);
    const line = endedOn
      ? t('loan.list.stoppedOn', { date: spokenDate(endedOn), amount })
      : t('loan.list.stopped', { amount });
    return { shown: line, spoken: line };
  }
  const next = status.nextPayment;
  if (!next) return { shown: '', spoken: '' };
  const key = status.paymentsMade === 0 ? 'loanFlow.firstPayment' : 'loanFlow.review.nextPayment';
  return {
    shown: t(key, { date: pageDate(next.date, today) }),
    spoken: t(key, { date: spokenDate(next.date) }),
  };
}

/**
 * The loan at a glance, as Review drew it before it was saved: what is left to pay, how far along
 * it is, and the four facts it runs on. Read out as one summary.
 */
export function LoanViewCard({ view, today }: { view: LoanView; today: string }) {
  const { status } = view;
  const head = headLine(view, today);
  const left = formatCurrency(status.amountLeft);
  const paid = percent(status.percentPaid, 0);
  const source = view.paidFrom;

  const rows = [
    {
      id: 'monthly',
      label: t('loan.list.monthly'),
      value: formatCurrency(status.monthlyPayment),
    },
    { id: 'rate', label: t('loan.rate'), value: loanRateText(status.annualRate) },
    {
      id: 'left',
      label: t('loanFlow.view.paymentsLeft'),
      value: t('loanFlow.view.paymentsOf', {
        left: status.paymentsLeft,
        count: status.paymentCount,
      }),
      spoken: t('loan.list.paymentsA11y', {
        left: status.paymentsLeft,
        count: status.paymentCount,
      }),
    },
    {
      id: 'source',
      label: t('loan.save.paidFrom'),
      value: source ? paidFromText(source) : t('loan.save.skipSource'),
      spoken: source ? paidFromSpoken(source) : undefined,
    },
  ];

  const spoken = [
    t('loanFlow.view.cardA11y', { name: view.name, when: head.spoken, left, percent: paid }),
    ...rows.map((row) =>
      row.id === 'left'
        ? row.spoken
        : t('entry.row.spoken', { label: row.label, value: row.spoken ?? row.value }),
    ),
  ].join(' ');

  return (
    <View
      className="mt-2 w-full rounded-[20px] border border-line bg-card p-[20px]"
      testID="loan-view-card"
    >
      <View accessible accessibilityLabel={spoken}>
        <View className="w-full flex-row items-center gap-[12px]">
          <View
            className="h-[40px] w-[40px] items-center justify-center"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <LoanTypeIcon type={view.type} size={38} />
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className="font-app-semibold text-[17px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {view.name}
            </Text>
            {head.shown ? (
              <Text
                className="mt-[2px] font-app text-[13px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.row}
                testID="loan-view-when"
              >
                {head.shown}
              </Text>
            ) : null}
          </View>
        </View>

        <FitFigure
          id="loan-view-left"
          size={36}
          lineHeight={44}
          className="font-app-bold text-ink"
          boxClassName="mt-[18px]"
        >
          {left}
        </FitFigure>
        <Text
          className="mt-[2px] font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('loanFlow.view.leftToPay')}
        </Text>

        <LoanBar percent={status.percentPaid} className="mt-[16px]" testID="loan-view-progress" />
        <Text
          className="mt-[8px] font-app text-[12px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('loan.list.paidPercent', { percent: paid })}
        </Text>

        <View className="my-[16px] h-px w-full bg-line" />

        <FitRows className="w-full gap-[14px]" testID="loan-view-rows">
          {rows.map((row) => (
            <LoanSummaryLine key={row.id} id={row.id} label={row.label} value={row.value} />
          ))}
        </FitRows>
      </View>
    </View>
  );
}
