import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import { LoanSummaryLine } from '@/components/calculators/loan-result-card';
import { refusalText } from '@/components/calculators/override-words';
import { Button } from '@/components/ui/button';
import { CurrencyField } from '@/components/ui/currency-field';
import { FitRows } from '@/components/ui/fit-group';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import type { LoanTerms } from '@/lib/loan';
import { updateLoanDraft, useLoanDraft } from '@/lib/loan-draft';
import {
  applyOverrides,
  checkOverride,
  paymentChoice,
  type PaymentOverrides,
} from '@/lib/loan-overrides';
import { readLoanRoute, termsFromRoute, type LoanRouteParams } from '@/lib/loan-route';
import { toCents } from '@/lib/money';
import { draftFromAmount } from '@/lib/typed-amount';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * One payment of the open calculator's loan, typed the way the bank has it: the monthly payment
 * (`target=monthly`) or a single payment of the schedule (`target=<number>`). Checked against the
 * contract, as it will be saved. Done writes the draft and goes back; back writes nothing.
 */
export default function LoanPaymentScreen() {
  const params = useLocalSearchParams<LoanRouteParams>();
  const route = readLoanRoute(params);
  const draft = useLoanDraft(route.draft);
  const { amount, rate, months, start, funded, basis, payment } = params;
  // Only the link moves these, so typing does not price the loan again.
  const terms = useMemo(
    () =>
      termsFromRoute(readLoanRoute({ amount, rate, months, start, funded, basis, payment }), {
        withExtras: false,
      }),
    [amount, rate, months, start, funded, basis, payment],
  );
  const target = params.target === 'monthly' ? 'monthly' : Number(params.target);

  if (!draft) {
    return <Gone title={t('loan.monthlyPayment')} text={t('loan.payment.gone')} />;
  }
  if (target === 'monthly') {
    return <MonthlyPayment terms={terms} draft={draft} draftId={route.draft} />;
  }
  if (!Number.isInteger(target) || target < 1) {
    return <Gone title={t('loan.monthlyPayment')} text={t('loan.refusal.noSuchPayment')} />;
  }
  return <SinglePayment terms={terms} draft={draft} draftId={route.draft} number={target} />;
}

type PageProps = { terms: LoanTerms; draft: PaymentOverrides; draftId: string };

function withoutMonthly(draft: PaymentOverrides): PaymentOverrides {
  const next = { ...draft };
  delete next.monthlyPayment;
  return next;
}

/** The bank's monthly payment in place of the app's figure, or the app's figure back. */
function MonthlyPayment({ terms, draft, draftId }: PageProps) {
  const solved = useMemo(() => applyOverrides(terms, {}).solvedPayment, [terms]);
  const current = draft.monthlyPayment;
  const [typed, setTyped] = useState(() =>
    current === undefined ? '' : draftFromAmount(String(current)),
  );
  const [refusal, setRefusal] = useState<string | null>(null);

  const done = (next: PaymentOverrides) => {
    updateLoanDraft(draftId, next);
    router.back();
  };

  const use = () => {
    const amount = Number(typed);
    const problem = checkOverride(terms, draft, 'monthly', amount);
    if (problem) {
      const reason = refusalText(problem);
      setRefusal(reason);
      AccessibilityInfo.announceForAccessibility(reason);
      return;
    }
    // The app's own figure typed back is no change at all.
    done(
      toCents(amount) === toCents(solved)
        ? withoutMonthly(draft)
        : { ...draft, monthlyPayment: amount },
    );
  };

  const useSkip = () => done(withoutMonthly(draft));

  return (
    <Screen
      title={t('loan.monthlyPayment')}
      showBack
      avoidKeyboard
      footer={
        <View className="w-full gap-3">
          <Button label={t('loan.payment.useThis')} onPress={use} />
          {current !== undefined ? (
            <Button label={t('loan.payment.useSkip')} variant="outline" onPress={useSkip} />
          ) : null}
        </View>
      }
    >
      <FitRows
        className="mt-3 w-full gap-3 rounded-[20px] border border-line bg-card p-[20px]"
        testID="loan-payment-figures"
      >
        <LoanSummaryLine
          id="skip"
          label={t('loan.payment.skipFigure')}
          value={formatCurrency(solved)}
        />
        {current !== undefined ? (
          <LoanSummaryLine
            id="bank"
            label={t('loan.calculator.bankPayment')}
            value={formatCurrency(current)}
          />
        ) : null}
      </FitRows>

      <View className="mt-6 w-full">
        <CurrencyField
          label={t('loan.calculator.bankPayment')}
          value={typed}
          onChange={(next) => {
            setRefusal(null);
            setTyped(next);
          }}
          filled
        />
        <Refusal text={refusal} />
        <Hint text={t('loan.payment.monthlyHint')} />
      </View>
    </Screen>
  );
}

/** One payment of the schedule, more or less this once; the last payment only shown. */
function SinglePayment({ terms, draft, draftId, number }: PageProps & { number: number }) {
  const choice = useMemo(() => paymentChoice(terms, draft, number), [terms, draft, number]);
  const title = t('loan.payment.title', { number });
  const [typed, setTyped] = useState(() =>
    // A change above what is owed shows as typed, though it is taken as the payoff.
    choice && !choice.locked ? draftFromAmount(String(choice.typed ?? choice.current)) : '',
  );
  const [refusal, setRefusal] = useState<string | null>(null);

  if (!choice) return <Gone title={title} text={t('loan.payment.paidOff')} />;

  const others = () => {
    const payments = { ...draft.payments };
    delete payments[number];
    return payments;
  };
  const done = (payments: Record<number, number>) => {
    const next: PaymentOverrides = { ...draft };
    if (Object.keys(payments).length > 0) next.payments = payments;
    else delete next.payments;
    updateLoanDraft(draftId, next);
    router.back();
  };

  const use = () => {
    const amount = Number(typed);
    const problem = checkOverride(terms, draft, number, amount);
    if (problem) {
      const reason = refusalText(problem);
      setRefusal(reason);
      AccessibilityInfo.announceForAccessibility(reason);
      return;
    }
    // The regular payment typed back is no change at all.
    const regular = toCents(amount) === toCents(choice.regular);
    done(regular ? others() : { ...others(), [number]: amount });
  };

  return (
    <Screen
      title={title}
      showBack
      avoidKeyboard
      footer={
        choice.locked ? undefined : (
          <View className="w-full gap-3">
            <Button label={t('loan.payment.useThis')} onPress={use} />
            {choice.overridden ? (
              <Button
                label={t('loan.payment.backToRegular')}
                variant="outline"
                onPress={() => done(others())}
              />
            ) : null}
          </View>
        )
      }
    >
      <Text
        className="mt-1 w-full text-center font-app text-[14px] leading-5 text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {formatFullDate(new Date(`${choice.date}T00:00:00`))}
      </Text>

      <FitRows
        className="mt-5 w-full gap-3 rounded-[20px] border border-line bg-card p-[20px]"
        testID="loan-payment-figures"
      >
        {choice.locked ? (
          <LoanSummaryLine
            id="this"
            label={t('loan.payment.thisPayment')}
            value={formatCurrency(choice.current)}
            strong
          />
        ) : null}
        <LoanSummaryLine
          id="regular"
          label={t('loan.payment.regular')}
          value={formatCurrency(choice.regular)}
        />
        <LoanSummaryLine
          id="interest"
          label={t('loan.payment.interest')}
          value={formatCurrency(choice.interest)}
        />
        {choice.locked ? null : (
          <>
            <LoanSummaryLine
              id="minimum"
              label={t('loan.payment.minimum')}
              value={formatCurrency(choice.minimum)}
            />
            <LoanSummaryLine
              id="owed"
              label={t('loan.payment.owed')}
              value={formatCurrency(choice.owed)}
            />
          </>
        )}
      </FitRows>

      {choice.locked ? (
        <Hint text={t('loan.payment.locked')} />
      ) : (
        <View className="mt-6 w-full">
          <CurrencyField
            label={t('loan.payment.thisPayment')}
            value={typed}
            onChange={(next) => {
              setRefusal(null);
              setTyped(next);
            }}
            filled
          />
          <Refusal text={refusal} />
          <Hint text={t('loan.payment.singleHint')} />
          <Hint text={t('loan.payment.payoffHint', { owed: formatCurrency(choice.owed) })} />
        </View>
      )}
    </Screen>
  );
}

function Refusal({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <Text
      className="mt-2 font-app text-[13px] leading-[18px] text-danger"
      maxFontSizeMultiplier={TEXT_CAP.reading}
    >
      {text}
    </Text>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <Text
      className="mt-3 w-full font-app text-[13px] leading-[18px] text-muted"
      maxFontSizeMultiplier={TEXT_CAP.reading}
    >
      {text}
    </Text>
  );
}

function Gone({ title, text }: { title: string; text: string }) {
  return (
    <Screen title={title} showBack>
      <Text
        className="mt-6 w-full text-center font-app text-[15px] leading-[22px] text-body"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {text}
      </Text>
    </Screen>
  );
}
