import { Text, View } from 'react-native';

import { FinishedCard, LoanListCard, type LoanCardData } from '@/components/loans/loan-list-card';
import { LoanTiles } from '@/components/loans/loan-tiles';
import { LoansSummaryCard, type LoansSummaryData } from '@/components/loans/loans-summary-card';
import { RefreshNote } from '@/components/ui/refresh-note';
import { SectionHeading } from '@/components/ui/typography';
import { t } from '@/i18n';
import { useLoanIcons } from '@/theme/loan-icons';
import { TEXT_CAP } from '@/theme/text-scale';

type LoansBodyProps = {
  /** In the order to show; finished ones are taken out and listed below the open ones. */
  loans: readonly LoanCardData[];
  summary: LoansSummaryData;
  /** A reload failed behind the figures shown. */
  refreshFailed?: boolean;
  onOpen: (billId: string) => void;
  onCalculator: () => void;
  onAdd: () => void;
};

export function LoansBody({
  loans,
  summary,
  refreshFailed = false,
  onOpen,
  onCalculator,
  onAdd,
}: LoansBodyProps) {
  const open = loans.filter((loan) => loan.ending === null);
  const finished = loans.filter((loan) => loan.ending !== null);

  return (
    <View className="mb-4 w-full">
      <LoanTiles onCalculator={onCalculator} onAdd={onAdd} />

      {/* With only finished loans the card still stands, owing nothing: they are not "no loans". */}
      {loans.length > 0 ? <LoansSummaryCard summary={summary} /> : <EmptyCard />}
      <RefreshNote show={refreshFailed} />

      {open.length > 0 ? (
        <>
          <SectionHeading
            className="mb-3 mt-7 px-1"
            caption={t('loan.list.activeCount', { count: open.length })}
          >
            {t('loan.list.yours')}
          </SectionHeading>
          <View className="w-full gap-4">
            {open.map((loan) => (
              <LoanListCard key={loan.billId} loan={loan} onOpen={() => onOpen(loan.billId)} />
            ))}
          </View>
        </>
      ) : null}

      {finished.length > 0 ? (
        <>
          <SectionHeading className="mb-3 mt-7 px-1">{t('loan.list.finished')}</SectionHeading>
          <View className="w-full gap-4" testID="loans-finished">
            {finished.map((loan) => (
              <FinishedCard key={loan.billId} loan={loan} onOpen={() => onOpen(loan.billId)} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function EmptyCard() {
  const { result: Icon } = useLoanIcons();
  return (
    <View
      className="mt-[16px] w-full items-center rounded-[20px] border border-line bg-card px-[20px] py-[24px]"
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
