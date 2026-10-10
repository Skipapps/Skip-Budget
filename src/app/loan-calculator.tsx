import { router } from 'expo-router';
import { Info } from 'lucide-react-native';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { LoanResultCard, LoanSummaryLine } from '@/components/calculators/loan-result-card';
import { LoanCard, LoanCardRow, LoanSectionHeading } from '@/components/calculators/loan-section';
import { MoreOptionsCard } from '@/components/calculators/more-options-card';
import { fixLine, problemNote, unusedNote } from '@/components/calculators/override-words';
import {
  ScheduleCard,
  loanAmountText,
  loanRateText,
  loanTermText,
} from '@/components/calculators/schedule-card';
import { SliderRow } from '@/components/calculators/slider-row';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DatePicker } from '@/components/ui/date-picker';
import { FitRows } from '@/components/ui/fit-group';
import { Screen } from '@/components/ui/screen';
import { FieldLabel } from '@/components/ui/typography';
import { t } from '@/i18n';
import { truthInLending } from '@/lib/apr';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import {
  addMonths,
  daysBetween,
  monthsAndDaysBetween,
  payoffDate,
  type AccrualBasis,
  type LoanTerms,
} from '@/lib/loan';
import { startLoanDraft, useOpenLoanDraft } from '@/lib/loan-draft';
import { scheduleWithOverrides, type PaymentOverrides } from '@/lib/loan-overrides';
import { overrideParams, typedAmount, typedRate, type LoanRouteParams } from '@/lib/loan-route';
import { roundMoney, sumMoney } from '@/lib/money';
import { useConfirm } from '@/providers/dialog-provider';
import { useColors } from '@/providers/theme-provider';
import { useLoanIcons } from '@/theme/loan-icons';
import { TEXT_CAP } from '@/theme/text-scale';

// The sliders' ranges. A typed figure may go past either end: the thumb waits at the end and the
// value shows what was typed.
const AMOUNT_MIN = 500;
const AMOUNT_MAX = 1_000_000;
const RATE_MAX = 30;

const NO_CHANGES: PaymentOverrides = {};

/** Daily actual/365 is the default: what a US installment lender bills; the fixtures use it. */
const basisChoices = () => [
  { value: 'actual/365' as const, label: t('loan.basis.daily365') },
  { value: 'monthly' as const, label: t('loan.basis.monthlyRests') },
  // A day-count name, the same in every language.
  { value: '30/360' as const, label: '30 / 360' },
];

/** Every convention the engine can price, including the one no chip offers. */
function basisNote(basis: AccrualBasis): string {
  switch (basis) {
    case 'actual/360':
      return t('loan.basisNote.actual360');
    case 'actual/365':
      return t('loan.basisNote.actual365');
    case 'monthly':
      return t('loan.basisNote.monthly');
    case '30/360':
      return t('loan.basisNote.thirty360');
  }
}

function interestLine(basis: AccrualBasis): string {
  switch (basis) {
    case 'actual/360':
      return t('loan.calculator.interestLine.actual360');
    case 'actual/365':
      return t('loan.calculator.interestLine.actual365');
    case 'monthly':
      return t('loan.calculator.interestLine.monthly');
    case '30/360':
      return t('loan.calculator.interestLine.thirty360');
  }
}

export default function LoanCalculatorScreen() {
  const confirm = useConfirm();
  const colors = useColors();
  const icons = useLoanIcons();

  const [amount, setAmount] = useState(25_000);
  const [rate, setRate] = useState(7.5);
  const [months, setMonths] = useState(60);
  const [startDate, setStartDate] = useState(new Date());
  // Interest starts the day the money lands, by default a month before the first payment.
  const [fundedOn, setFundedOn] = useState(() => monthBefore(new Date()));

  const [basis, setBasis] = useState<AccrualBasis>('actual/365');
  // Paid on top of the contract payment, all of it against the balance.
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [lumpSum, setLumpSum] = useState(0);
  const [lumpOn, setLumpOn] = useState(() => addMonths(new Date(), 12));
  // Prepaid finance charges (arrangement fee, points): they change the APR, not any payment.
  const [fees, setFees] = useState(0);

  const [moreOpen, setMoreOpen] = useState(false);
  const [padOpen, setPadOpen] = useState(false);
  const [ratePadOpen, setRatePadOpen] = useState(false);
  const [extraPadOpen, setExtraPadOpen] = useState(false);
  const [lumpPadOpen, setLumpPadOpen] = useState(false);
  const [feePadOpen, setFeePadOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [fundedPickerOpen, setFundedPickerOpen] = useState(false);
  const [lumpPickerOpen, setLumpPickerOpen] = useState(false);

  // The bank's payment and changed payments, which the payment pages write while this page waits.
  useEffect(() => {
    startLoanDraft();
  }, []);
  const draft = useOpenLoanDraft();
  const draftId = draft?.id;
  const overrides = draft?.overrides ?? NO_CHANGES;
  const [saveTried, setSaveTried] = useState(false);

  const terms = useMemo<LoanTerms>(
    () => ({
      principal: amount,
      annualRatePercent: rate,
      months,
      firstPaymentOn: startDate,
      fundedOn,
      basis,
      extra: {
        monthly: extraMonthly,
        lumpSums: lumpSum > 0 ? [{ on: lumpOn, amount: lumpSum }] : [],
      },
    }),
    [amount, rate, months, startDate, fundedOn, basis, extraMonthly, lumpSum, lumpOn],
  );

  /**
   * Every figure is priced from these, a beat behind the sliders when a step is slow to price: the
   * thumb and its value follow the finger at once, and the figures catch up to where it stops.
   */
  const inputs = useMemo(() => ({ terms, fees, overrides }), [terms, fees, overrides]);
  const priced = useDeferredValue(inputs);
  const pricedTerms = priced.terms;
  const pricedFundedOn = pricedTerms.fundedOn ?? fundedOn;

  // One schedule per step, changes included; `contract` is the same loan without the extras.
  const loan = useMemo(
    () => scheduleWithOverrides(priced.terms, priced.overrides),
    [priced.terms, priced.overrides],
  );
  const contract = loan.contract;
  const overpaying =
    (pricedTerms.extra?.monthly ?? 0) > 0 || (pricedTerms.extra?.lumpSums ?? []).length > 0;
  const interestSaved = roundMoney(contract.totalInterest - loan.totalInterest);
  const monthsSaved = contract.rows.length - loan.paymentCount;
  const bankPayment = loan.applied.monthlyPayment !== undefined;

  // The disclosure is for the loan as contracted, not as overpaid, as a lender quotes it.
  const disclosure = useMemo(
    () =>
      truthInLending({
        advance: priced.terms.principal,
        prepaidFinanceCharge: priced.fees,
        advancedOn: contract.fundedOn,
        payments: contract.rows.map((row) => ({
          on: new Date(`${row.date}T00:00:00`),
          amount: row.payment,
        })),
      }),
    [priced, contract],
  );

  const schedule = loan.rows;
  const lastPayment = loan.payoffOn
    ? new Date(`${loan.payoffOn}T00:00:00`)
    : payoffDate(pricedTerms.firstPaymentOn, pricedTerms.months);
  const contractLastPayment = contract.payoffOn
    ? new Date(`${contract.payoffOn}T00:00:00`)
    : lastPayment;
  const openingDays = daysBetween(pricedFundedOn, pricedTerms.firstPaymentOn);
  // Half a basis point is where the two figures round differently on screen.
  const aprDiffers = Math.abs(disclosure.apr - pricedTerms.annualRatePercent) >= 0.005;
  const pricedBasis = pricedTerms.basis ?? 'actual/365';
  /**
   * Leftover days of the opening period under monthly rests: one whole rest (rate / 12) plus per
   * diem (days * rate / 365) on the remainder, as the schedule bills it. The daily conventions
   * charge every day of the gap and have no stub.
   */
  const stubDays =
    pricedBasis === 'monthly'
      ? monthsAndDaysBetween(pricedFundedOn, pricedTerms.firstPaymentOn).days
      : 0;
  const oddOpening =
    pricedBasis === 'monthly'
      ? stubDays > 0
      : openingDays > 0 && openingDays !== 30 && openingDays !== 31;

  const pricedExtra = pricedTerms.extra?.monthly ?? 0;
  const notes: string[] = [];
  if (bankPayment) {
    notes.push(t('loan.calculator.skipWorksOut', { amount: formatCurrency(loan.solvedPayment) }));
  }
  if (pricedExtra > 0) {
    notes.push(
      t('loan.calculator.plusExtra', {
        extra: formatCurrency(pricedExtra),
        total: formatCurrency(sumMoney([loan.payment, pricedExtra])),
      }),
    );
  }
  if (oddOpening) {
    notes.push(
      pricedBasis === 'monthly'
        ? t('loan.calculator.firstCoversMonthPlus', {
            count: stubDays,
            interest: formatCurrency(schedule[0]?.interest ?? 0),
          })
        : t('loan.calculator.firstCoversDays', {
            count: openingDays,
            interest: formatCurrency(schedule[0]?.interest ?? 0),
          }),
    );
  }
  const unused = unusedNote(loan.unused);
  if (unused) notes.push(unused);

  const warnings = loan.problems.map(problemNote);
  if (loan.balloon) {
    warnings.push(t('loan.calculator.balloon', { amount: formatCurrency(contract.finalPayment) }));
  }

  // The loan as priced, in the figures both the schedule and the save page read back.
  const loanParams: LoanRouteParams = {
    amount: String(amount),
    rate: String(rate),
    months: String(months),
    start: toIsoDate(startDate),
    funded: toIsoDate(fundedOn),
    basis,
  };

  /**
   * Asks before filing anything. `basis` goes to `/save-loan` untouched (`day_count_basis` holds
   * all four conventions), and the changes go as the schedule took them, so no figure moves
   * between here and the saved schedule.
   */
  const handleSave = async () => {
    if (loan.payment <= 0) return;
    if (loan.problems.length > 0) {
      setSaveTried(true);
      return;
    }

    const ok = await confirm({
      title: t('loan.calculator.confirmTitle'),
      message: t(
        overpaying ? 'loan.calculator.confirmMessageOverpaying' : 'loan.calculator.confirmMessage',
        { payment: formatCurrency(loan.payment), term: loanTermText(months) },
      ),
      confirmLabel: t('common.continue'),
      cancelLabel: t('common.notNow'),
    });
    if (!ok) return;

    router.push({
      pathname: '/save-loan',
      // As typed: the save page prices them again and files what the schedule takes.
      params: { ...loanParams, ...overrideParams(overrides) },
    });
  };

  const openSchedule = () =>
    router.push({
      pathname: '/loan-schedule',
      params: {
        ...loanParams,
        extra: String(extraMonthly),
        lump: String(lumpSum),
        lumpOn: toIsoDate(lumpOn),
        fees: String(fees),
        ...overrideParams(overrides),
        ...(draftId ? { draft: draftId } : {}),
      },
    });

  const editPayment = () =>
    router.push({
      pathname: '/loan-payment',
      params: { ...loanParams, ...(draftId ? { draft: draftId } : {}), target: 'monthly' },
    });

  return (
    <Screen
      title={t('loan.calculator.title')}
      showBack
      footer={
        <View className="w-full">
          {/* Above the button, so it is seen wherever the page sits. */}
          {saveTried && loan.problems.length > 0 ? (
            <Text
              className="mb-3 text-center font-app text-[13px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {fixLine(loan.problems)}
            </Text>
          ) : null}
          <Button label={t('common.save')} onPress={handleSave} />
        </View>
      }
    >
      <View className="mt-3 w-full">
        <LoanResultCard
          payment={loan.payment}
          paymentLabel={bankPayment ? t('loan.calculator.bankPayment') : undefined}
          count={loan.paymentCount}
          lastOn={lastPayment}
          principal={pricedTerms.principal}
          interest={loan.totalInterest}
          totalPaid={loan.totalPaid}
          fees={priced.fees}
          apr={aprDiffers ? disclosure.apr : null}
          notes={notes}
          warnings={warnings}
          onEditPayment={draftId ? editPayment : undefined}
        />
      </View>

      <LoanSectionHeading icon={icons.details} className="mb-3 mt-8">
        {t('loan.calculator.theLoan')}
      </LoanSectionHeading>
      <LoanCard>
        <FitRows className="w-full" testID="loan-sliders">
          <SliderRow
            id="amount"
            label={t('loan.amount')}
            display={loanAmountText(amount)}
            value={amount}
            min={AMOUNT_MIN}
            max={AMOUNT_MAX}
            step={500}
            scale="log"
            onChange={setAmount}
            onValuePress={() => setPadOpen(true)}
            className="px-[18px] pb-2 pt-[16px]"
          />
          <View className="h-px w-full bg-line" />
          <SliderRow
            id="rate"
            label={t('loan.interestRate')}
            display={loanRateText(rate)}
            value={rate}
            min={0}
            max={RATE_MAX}
            step={0.01}
            onChange={setRate}
            onValuePress={() => setRatePadOpen(true)}
            className="px-[18px] pb-2 pt-[16px]"
          />
          <View className="h-px w-full bg-line" />
          <SliderRow
            id="term"
            label={t('loan.termLabel')}
            display={loanTermText(months)}
            value={months}
            min={6}
            max={480}
            step={1}
            onChange={setMonths}
            className="px-[18px] pb-2 pt-[16px]"
          />
        </FitRows>
      </LoanCard>

      <LoanSectionHeading icon={icons.dates} className="mb-3 mt-8">
        {t('loan.calculator.dates')}
      </LoanSectionHeading>
      <LoanCard>
        <FitRows className="w-full" testID="loan-dates">
          <LoanCardRow
            id="funded"
            first
            label={t('loan.calculator.moneyReceived')}
            value={formatFullDate(fundedOn)}
            onPress={() => setFundedPickerOpen(true)}
          />
          <LoanCardRow
            id="first"
            label={t('loan.firstPayment')}
            value={formatFullDate(startDate)}
            onPress={() => setDatePickerOpen(true)}
          />
        </FitRows>
      </LoanCard>

      <View className="mt-8 w-full">
        <MoreOptionsCard open={moreOpen} onToggle={() => setMoreOpen((open) => !open)}>
          <FitRows className="w-full" testID="loan-options">
            <LoanCardRow
              id="extra"
              first
              label={t('loan.extraMonthly')}
              value={
                extraMonthly > 0 ? formatCurrency(extraMonthly) : t('loan.calculator.nothingExtra')
              }
              unset={extraMonthly <= 0}
              onPress={() => setExtraPadOpen(true)}
            />
            <LoanCardRow
              id="lump"
              label={t('loan.lumpSum')}
              value={lumpSum > 0 ? formatCurrency(lumpSum) : t('common.none')}
              unset={lumpSum <= 0}
              onPress={() => setLumpPadOpen(true)}
            />
            {lumpSum > 0 ? (
              <LoanCardRow
                id="lump-on"
                label={t('loan.calculator.overpaymentLands')}
                value={formatFullDate(lumpOn)}
                onPress={() => setLumpPickerOpen(true)}
              />
            ) : null}
            <LoanCardRow
              id="fees"
              label={t('loan.fees')}
              value={fees > 0 ? formatCurrency(fees) : t('loan.calculator.noFees')}
              unset={fees <= 0}
              onPress={() => setFeePadOpen(true)}
            />
          </FitRows>

          <View className="w-full border-t border-line px-[18px] py-[16px]">
            <FieldLabel className="mb-3">{t('loan.calculator.howInterestCharged')}</FieldLabel>
            <ChoiceChips options={basisChoices()} value={basis} onChange={setBasis} />
            <Text
              className="mt-3 font-app text-[12px] leading-[17px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {basisNote(basis)}
            </Text>
          </View>
        </MoreOptionsCard>
      </View>

      {overpaying && (interestSaved > 0 || monthsSaved > 0) ? (
        <FitRows
          className="mt-3 w-full gap-3 rounded-[20px] border border-line bg-card p-[20px]"
          testID="loan-overpaying"
        >
          <Text
            className="font-app-semibold text-[15px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.heading}
          >
            {t('loan.calculator.ifYouOverpay')}
          </Text>
          <LoanSummaryLine
            id="saved"
            label={t('loan.calculator.interestSaved')}
            value={formatCurrency(interestSaved)}
            positive
          />
          {monthsSaved > 0 ? (
            <LoanSummaryLine
              id="early"
              label={t('loan.calculator.paidOffEarlyBy')}
              value={loanTermText(monthsSaved)}
            />
          ) : null}
          <Text
            className="font-app text-[12px] leading-[17px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {t('loan.calculator.clearOn', {
              date: formatFullDate(lastPayment),
              contractDate: formatFullDate(contractLastPayment),
              payment: formatCurrency(loan.payment),
            })}
          </Text>
        </FitRows>
      ) : null}

      <View className="mt-3 w-full flex-row items-start gap-2 px-1">
        <View className="pt-[2px]">
          <Info size={14} color={colors.muted} strokeWidth={2} />
        </View>
        <Text
          className="min-w-0 flex-1 font-app text-[12px] leading-[17px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {interestLine(basis)}
        </Text>
      </View>

      <View className="mb-4 mt-6 w-full">
        <ScheduleCard rows={schedule} onPress={openSchedule} />
      </View>

      {padOpen ? (
        <AmountPad
          title={t('loan.amount')}
          caption={t('loan.calculator.amountCaption')}
          value={String(amount)}
          onCancel={() => setPadOpen(false)}
          check={(next) =>
            typedAmount(next) === null ? t('loan.calculator.amountAboveZero') : null
          }
          onConfirm={(next) => {
            setAmount(typedAmount(next) ?? amount);
            setPadOpen(false);
          }}
        />
      ) : null}

      {ratePadOpen ? (
        <AmountPad
          title={t('loan.interestRate')}
          caption={t('loan.calculator.rateCaption')}
          unit="percent"
          value={String(rate)}
          onCancel={() => setRatePadOpen(false)}
          check={(next) => (typedRate(next) === null ? t('loan.calculator.rateNeeded') : null)}
          onConfirm={(next) => {
            setRate(typedRate(next) ?? rate);
            setRatePadOpen(false);
          }}
        />
      ) : null}

      {extraPadOpen ? (
        <AmountPad
          title={t('loan.extraMonthly')}
          caption={t('loan.calculator.extraCaption')}
          value={String(extraMonthly)}
          onCancel={() => setExtraPadOpen(false)}
          onConfirm={(next) => {
            setExtraMonthly(Math.max(0, Number(next) || 0));
            setExtraPadOpen(false);
          }}
        />
      ) : null}

      {lumpPadOpen ? (
        <AmountPad
          title={t('loan.lumpSum')}
          caption={t('loan.calculator.lumpCaption')}
          value={String(lumpSum)}
          onCancel={() => setLumpPadOpen(false)}
          onConfirm={(next) => {
            setLumpSum(Math.max(0, Number(next) || 0));
            setLumpPadOpen(false);
          }}
        />
      ) : null}

      {feePadOpen ? (
        <AmountPad
          title={t('loan.fees')}
          caption={t('loan.calculator.feesCaption')}
          value={String(fees)}
          onCancel={() => setFeePadOpen(false)}
          onConfirm={(next) => {
            setFees(Math.max(0, Number(next) || 0));
            setFeePadOpen(false);
          }}
        />
      ) : null}

      {lumpPickerOpen ? (
        <DatePicker
          value={lumpOn}
          onCancel={() => setLumpPickerOpen(false)}
          onConfirm={(date) => {
            setLumpOn(date);
            setLumpPickerOpen(false);
          }}
        />
      ) : null}

      {datePickerOpen ? (
        <DatePicker
          value={startDate}
          onCancel={() => setDatePickerOpen(false)}
          onConfirm={(date) => {
            setStartDate(date);
            // Money cannot land after the first payment is due: nudge the funding date along.
            if (fundedOn >= date) setFundedOn(monthBefore(date));
            setDatePickerOpen(false);
          }}
        />
      ) : null}

      {fundedPickerOpen ? (
        <DatePicker
          value={fundedOn}
          onCancel={() => setFundedPickerOpen(false)}
          onConfirm={(date) => {
            setFundedOn(date < startDate ? date : monthBefore(startDate));
            setFundedPickerOpen(false);
          }}
        />
      ) : null}
    </Screen>
  );
}

/** One month back, holding the day of month through short months. */
function monthBefore(date: Date): Date {
  const earlier = new Date(date);
  earlier.setDate(1);
  earlier.setMonth(date.getMonth() - 1);
  const lastOfMonth = new Date(earlier.getFullYear(), earlier.getMonth() + 1, 0).getDate();
  earlier.setDate(Math.min(date.getDate(), lastOfMonth));
  return earlier;
}
