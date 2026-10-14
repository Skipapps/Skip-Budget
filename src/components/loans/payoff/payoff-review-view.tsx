import { Text, View } from 'react-native';

import type { PaymentSourceRow } from '@/api/queries';
import { LoanTypeIcon } from '@/components/calculators/loan-type-icon';
import { DateBox } from '@/components/entry/date-box';
import { LoanFlowFooter, LoanFlowPage } from '@/components/loans/add/loan-flow-page';
import { PayoffLine, type PayoffLineWords } from '@/components/loans/payoff/payoff-line';
import { FitFigure } from '@/components/ui/fit-group';
import { RefreshNote } from '@/components/ui/refresh-note';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextLink } from '@/components/ui/text-link';
import { SectionHeading } from '@/components/ui/typography';
import type { LoanType } from '@/data/loan-types';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The payoff as it will be recorded: the amount and what it does to the loan, then the day it was
 * paid and where it came from. Pay off is pinned; the amount goes back to the keypad to change.
 */
export function PayoffReviewView({
  title,
  name,
  type,
  amount,
  line,
  note,
  offer,
  day,
  onDay,
  todayDate,
  earliest,
  sources,
  sourceId,
  onSource,
  busy,
  error,
  refreshFailed = false,
  onBack,
  onPay,
  onChangeAmount,
}: {
  title: string;
  name: string;
  type: LoanType;
  amount: number;
  line: PayoffLineWords;
  /** How much of a whole payoff is interest, when it is the whole payoff. */
  note: { shown: string; spoken: string } | null;
  /** What clears the loan, offered when the amount is more than that. */
  offer: { label: string; onPress: () => void } | null;
  day: Date;
  onDay: (day: Date) => void;
  todayDate: Date;
  /** The first day the calendar offers; nothing after today is offered. */
  earliest: Date | null;
  sources: readonly PaymentSourceRow[];
  /** '' is Skip. */
  sourceId: string;
  onSource: (id: string) => void;
  busy: boolean;
  error: string | null;
  /** A reload of the loan failed; the figures are the ones it was opened with. */
  refreshFailed?: boolean;
  onBack: () => void;
  onPay: () => void;
  onChangeAmount: () => void;
}) {
  const paying = formatCurrency(amount);
  // One stop per sentence, whether or not the line already ends with one.
  const spoken = [
    name,
    t('entry.row.spoken', { label: t('loanFlow.payoff.paying'), value: paying }),
    line?.spoken,
    note?.spoken,
  ]
    .filter((part): part is string => Boolean(part))
    .map((part) => (/[.!?…]$/.test(part) ? part : `${part}.`))
    .join(' ');

  return (
    <LoanFlowPage
      title={title}
      onBack={onBack}
      closePrompt={t('loanFlow.payoff.close')}
      root={false}
      footer={
        <LoanFlowFooter
          error={error}
          label={busy ? t('loanFlow.payoff.saving') : t('loanFlow.payoff.action')}
          onPress={onPay}
          disabled={busy}
          secondary={{ label: t('loanFlow.payoff.changeAmount'), onPress: onChangeAmount }}
        />
      }
    >
      <View
        className="mt-2 w-full rounded-[20px] border border-line bg-card p-[20px]"
        testID="payoff-card"
      >
        <View accessible accessibilityLabel={spoken}>
          <View className="w-full flex-row items-center gap-[12px]">
            <View
              className="h-[40px] w-[40px] items-center justify-center"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <LoanTypeIcon type={type} size={38} />
            </View>
            <Text
              className="min-w-0 flex-1 font-app-semibold text-[17px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {name}
            </Text>
          </View>

          <FitFigure
            id="payoff-amount"
            size={36}
            lineHeight={44}
            className="font-app-bold text-ink"
            boxClassName="mt-[18px]"
          >
            {paying}
          </FitFigure>
          <Text
            className="mt-[2px] font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('loanFlow.payoff.paying')}
          </Text>

          <View className="my-[16px] h-px w-full bg-line" />

          <PayoffLine words={line} testID="payoff-review-line" />
          {note ? (
            <Text
              className="mt-2 w-full font-app text-[12px] leading-[17px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
              testID="payoff-note"
            >
              {note.shown}
            </Text>
          ) : null}
        </View>
        {offer ? (
          <TextLink
            label={offer.label}
            onPress={offer.onPress}
            underline
            className="-mb-3 self-start"
          />
        ) : null}
      </View>
      <RefreshNote show={refreshFailed} />

      <View className="mt-5 w-full">
        <DateBox
          label={t('loanFlow.payoff.date')}
          value={day}
          today={todayDate}
          placeholder={t('loanFlow.payoff.date')}
          minDate={earliest}
          maxDate={todayDate}
          onChange={onDay}
        />
      </View>

      <SectionHeading className="mt-6">{t('loan.save.paidFrom')}</SectionHeading>
      <View className="mb-4 mt-3 w-full">
        <SourceTiles
          sources={sources}
          value={sourceId}
          onChange={onSource}
          skip={{
            label: t('loan.save.skipSource'),
            selected: sourceId === '',
            onPress: () => onSource(''),
          }}
        />
      </View>
    </LoanFlowPage>
  );
}
