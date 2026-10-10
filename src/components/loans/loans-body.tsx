import { Info, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { PaymentHeadline } from '@/components/calculators/payment-headline';
import { SummaryGrid } from '@/components/calculators/summary-grid';
import { dayMonth } from '@/components/loans/day-month';
import { FinishedCard, LoanListCard, type LoanCardData } from '@/components/loans/loan-list-card';
import { SectionHeading } from '@/components/ui/typography';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
import { useLoanIcons } from '@/theme/loan-icons';
import { TEXT_CAP } from '@/theme/text-scale';

/** The open loans' totals: what is owed, what goes out a month, and which payment comes next. */
export type LoansSummaryData = {
  owed: number;
  monthly: number;
  next: { on: string; name: string } | null;
};

type LoansBodyProps = {
  /** In the order to show; finished ones are taken out and listed below the open ones. */
  loans: readonly LoanCardData[];
  summary: LoansSummaryData;
  onOpen: (billId: string) => void;
  onNew: () => void;
};

export function LoansBody({ loans, summary, onOpen, onNew }: LoansBodyProps) {
  const open = loans.filter((loan) => loan.ending === null);
  const finished = loans.filter((loan) => loan.ending !== null);

  return (
    <View className="w-full">
      {/* With only finished loans the card still stands, owing nothing: they are not "no loans". */}
      {loans.length > 0 ? <SummaryCard summary={summary} /> : <EmptyCard />}

      {open.length > 0 ? (
        <>
          <SectionHeading
            className="mb-3 mt-7 px-1"
            caption={t('loan.list.saved', { count: loans.length })}
          >
            {t('loan.list.yours')}
          </SectionHeading>
          <View className="w-full gap-3">
            {open.map((loan) => (
              <LoanListCard key={loan.billId} loan={loan} onPress={() => onOpen(loan.billId)} />
            ))}
          </View>
        </>
      ) : null}

      {finished.length > 0 ? (
        <>
          <SectionHeading className="mb-3 mt-7 px-1">{t('loan.list.finished')}</SectionHeading>
          <View className="w-full gap-3" testID="loans-finished">
            {finished.map((loan) => (
              <FinishedCard key={loan.billId} loan={loan} onPress={() => onOpen(loan.billId)} />
            ))}
          </View>
        </>
      ) : null}

      {loans.length > 0 ? <InfoLine /> : null}
      <NewCalculation onPress={onNew} />
    </View>
  );
}

function SummaryCard({ summary }: { summary: LoansSummaryData }) {
  return (
    <View
      className="mt-3 w-full rounded-[20px] border border-line bg-card p-[20px]"
      testID="loans-summary"
    >
      <PaymentHeadline payment={summary.owed} label={t('loan.list.totalOwe')} size={32} />
      <View className="my-[16px] h-px w-full bg-line" />
      <SummaryGrid
        columns={2}
        items={[
          {
            id: 'monthly-payments',
            label: t('loan.list.monthlyPayments'),
            value: formatCurrency(summary.monthly),
          },
          {
            id: 'next-payment',
            label: t('loan.list.nextPayment'),
            value: summary.next
              ? t('loan.list.nextOf', {
                  date: dayMonth(new Date(`${summary.next.on}T00:00:00`)),
                  name: summary.next.name,
                })
              : '—',
          },
        ]}
      />
    </View>
  );
}

function EmptyCard() {
  const { result: Icon } = useLoanIcons();
  return (
    <View
      className="mt-3 w-full items-center rounded-[20px] border border-line bg-card px-[20px] py-[24px]"
      testID="loans-empty"
    >
      <View
        className="h-[56px] w-[56px]"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon width="100%" height="100%" />
      </View>
      <Text
        accessibilityRole="header"
        className="mt-3 text-center font-app-semibold text-[17px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {t('loan.list.emptyTitle')}
      </Text>
      <Text
        className="mt-2 text-center font-app text-[14px] leading-5 text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('loan.list.emptyBody')}
      </Text>
    </View>
  );
}

function InfoLine() {
  const colors = useColors();
  return (
    <View className="mt-5 w-full flex-row items-start justify-center gap-2 px-1">
      <View className="pt-[2px]">
        <Info size={14} color={colors.muted} strokeWidth={2} />
      </View>
      <Text
        className="shrink font-app text-[12px] leading-[17px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('loan.list.info')}
      </Text>
    </View>
  );
}

function NewCalculation({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  const label = t('loan.list.newCalculation');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="mb-4 mt-4 min-h-[52px] w-full flex-row items-center justify-center gap-2 rounded-full border border-line bg-card px-5 py-3 active:bg-ink/5"
    >
      <Plus size={18} color={colors.accentInk} strokeWidth={2} />
      <Text
        className="shrink text-center font-app-medium text-[15px] text-accent-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {label}
      </Text>
    </Pressable>
  );
}
