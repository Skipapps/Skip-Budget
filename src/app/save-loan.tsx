import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useSaveLoan } from '@/api/mutations';
import { usePaymentSources } from '@/api/queries';
import { LoanTypeGrid } from '@/components/calculators/loan-type-grid';
import { fixLine } from '@/components/calculators/override-words';
import { PaymentHeadline } from '@/components/calculators/payment-headline';
import { loanAmountText, loanRateText, loanTermText } from '@/components/calculators/schedule-card';
import { SummaryGrid } from '@/components/calculators/summary-grid';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { loanTypeIconId, type LoanType } from '@/data/loan-types';
import { percent, t } from '@/i18n';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { failureMessage } from '@/lib/failure';
import { refusedLoanSave } from '@/lib/loan-refusal';
import { finishFlowOn } from '@/lib/nav';
import { formatCurrency } from '@/lib/format';
import { payoffDate } from '@/lib/loan';
import { paymentOverridesJson, scheduleWithOverrides } from '@/lib/loan-overrides';
import {
  SAVABLE_RATE_MAX,
  rateSavable,
  readLoanRoute,
  routeDate,
  termsFromRoute,
  type LoanRouteParams,
} from '@/lib/loan-route';
import { useToast } from '@/providers/toast-context';
import { TEXT_CAP } from '@/theme/text-scale';

const rateRange = () =>
  t('loan.save.rateOutOfRange', { min: percent(0, 0), max: percent(SAVABLE_RATE_MAX, 0) });

/**
 * Names a calculated loan and files it as a monthly bill. The payment is recalculated here from the
 * params, so a hand-edited link cannot save one that disagrees with its principal, rate and term.
 */
export default function SaveLoanScreen() {
  const route = readLoanRoute(useLocalSearchParams<LoanRouteParams>());
  const principal = route.principal;
  const annualRate = route.annualRate;
  const termMonths = route.months;
  const firstPaymentOn = route.start;
  const fundedOn = route.funded;
  const firstPaymentDate = routeDate(firstPaymentOn);

  // Overpayments are not carried here: the bill is the contract payment the lender takes, with the
  // bank's payment and changed payments the person typed.
  const priced = scheduleWithOverrides(
    termsFromRoute(route, { withExtras: false }),
    route.overrides,
  );
  const loan = priced.contract;
  const termEnds = toIsoDate(payoffDate(firstPaymentDate ?? new Date(), termMonths));

  const [name, setName] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('personal');
  // As on a bill: null is not answered yet, '' is Skip (paid from nowhere in particular).
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Shown from the start: the rate is already chosen, and filling in the rest would not help.
  const rateRefused = rateSavable(annualRate) ? null : rateRange();
  // A change the loan no longer takes has to be fixed on the calculator first.
  const changesRefused = priced.problems.length > 0 ? fixLine(priced.problems) : null;
  const shownError = error ?? rateRefused ?? changesRefused;

  const { sources } = usePaymentSources();
  const saveLoan = useSaveLoan();
  const toast = useToast();

  const handleSave = async () => {
    setError(null);

    if (rateRefused ?? changesRefused) {
      setError(rateRefused ?? changesRefused);
      return;
    }
    const missing = [
      !name.trim() && t('loan.save.name'),
      sourceId === null && t('loan.save.paidFrom'),
    ].filter((field): field is string => Boolean(field));
    if (missing.length > 0) {
      setError(t('loan.save.missing', { fields: missing.join(', ') }));
      return;
    }
    if (termMonths < 1 || principal <= 0) {
      setError(t('loan.save.noPayment'));
      return;
    }
    const chosen = sources.find((source) => source.id === sourceId);

    try {
      await saveLoan.mutateAsync({
        name: name.trim(),
        iconId: loanTypeIconId(loanType),
        principal,
        annualRate,
        termMonths,
        monthlyPayment: loan.payment,
        totalInterest: loan.totalInterest,
        firstPaymentOn,
        fundedOn: fundedOn || null,
        // Saved exactly as priced (the column holds all four bases), so no figure moves later.
        dayCountBasis: route.basis,
        cardId: chosen?.kind === 'card' ? chosen.id : null,
        bankAccountId: chosen?.kind === 'account' ? chosen.id : null,
        paymentOverrides: paymentOverridesJson(priced.applied.payments),
        lastPaymentOn: loan.payoffOn && loan.payoffOn < termEnds ? loan.payoffOn : null,
      });
      toast('toast.loan.saved');
      finishFlowOn('/loans');
    } catch (thrown) {
      switch (refusedLoanSave(thrown)) {
        case 'payments':
          setError(t('loan.save.refusedPayments'));
          break;
        case 'lastPayment':
          setError(t('loan.save.refusedLastPayment'));
          break;
        case 'rate':
          setError(rateRange());
          break;
        default:
          setError(failureMessage(thrown));
      }
    }
  };

  return (
    <Screen
      title={t('loan.save.title')}
      showBack
      avoidKeyboard
      footer={
        <View className="w-full">
          {/* Above the button, not at the end of the scroll, so it is seen wherever the page sits. */}
          {shownError ? (
            <Text
              className="mb-3 text-center font-app text-[13px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {shownError}
            </Text>
          ) : null}
          <Button
            label={saveLoan.isPending ? t('loan.save.saving') : t('loan.save.saveToLoans')}
            onPress={handleSave}
          />
        </View>
      }
    >
      <Text
        className="mt-1 w-full text-center font-app text-[14px] leading-5 text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('loan.save.subtitle')}
      </Text>

      <View className="mt-5 w-full rounded-[20px] border border-line bg-card p-[20px]">
        <PaymentHeadline
          payment={loan.payment}
          label={
            priced.applied.monthlyPayment !== undefined
              ? t('loan.calculator.bankPayment')
              : undefined
          }
          size={28}
          suffix={t('loan.save.perMonth')}
        />
        <View className="my-[16px] h-px w-full bg-line" />
        <SummaryGrid
          columns={3}
          testID="save-loan-summary"
          items={[
            { id: 'borrowed', label: t('loan.borrowed'), value: loanAmountText(principal) },
            { id: 'rate', label: t('loan.rate'), value: loanRateText(annualRate) },
            { id: 'term', label: t('loan.termLabel'), value: loanTermText(termMonths) },
            {
              id: 'payments',
              label: t('loan.save.payments'),
              // As many as the changes leave: a higher payment can end the loan before its term.
              value: t('loan.save.paymentsMonthly', { count: loan.rows.length }),
            },
            {
              id: 'first',
              label: t('loan.firstPayment'),
              value: firstPaymentDate ? formatFullDate(firstPaymentDate) : '—',
            },
            {
              id: 'interest',
              label: t('loan.totalInterest'),
              value: formatCurrency(loan.totalInterest),
            },
          ]}
        />
        {priced.balloon ? (
          <Text
            className="mt-4 font-app-medium text-[13px] leading-[18px] text-danger"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {t('loan.calculator.balloon', { amount: formatCurrency(loan.finalPayment) })}
          </Text>
        ) : null}
      </View>

      <TextField
        className="mt-6"
        filled
        label={t('loan.save.name')}
        value={name}
        onChangeText={(next) => {
          setError(null);
          setName(next);
        }}
        placeholder={t('loan.save.namePlaceholder')}
        autoCapitalize="sentences"
        returnKeyType="done"
      />

      <View className="mt-6 w-full">
        <FieldLabel className="mb-2">{t('loan.save.loanType')}</FieldLabel>
        <LoanTypeGrid value={loanType} onChange={setLoanType} />
      </View>

      <View className="mb-4 mt-6 w-full">
        <FieldLabel className="mb-2">{t('loan.save.paidFrom')}</FieldLabel>
        <SourceTiles
          sources={sources}
          value={sourceId ?? ''}
          onChange={(next) => {
            setError(null);
            setSourceId(next);
          }}
          skip={{
            label: t('loan.save.skipSource'),
            selected: sourceId === '',
            onPress: () => {
              setError(null);
              setSourceId('');
            },
          }}
        />
      </View>
    </Screen>
  );
}
