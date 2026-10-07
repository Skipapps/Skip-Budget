import { router } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { ChoiceChips } from '@/components/ui/choice-chips';
import { ProportionBar } from '@/components/calculators/proportion-bar';
import { ScheduleCard } from '@/components/calculators/schedule-card';
import { SliderRow } from '@/components/calculators/slider-row';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { useProGate } from '@/components/pro/pro-gate';
import { Screen } from '@/components/ui/screen';
import { useConfirm } from '@/providers/dialog-provider';
import { SelectField } from '@/components/ui/select-field';
import { FieldLabel, SectionHeading } from '@/components/ui/typography';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { truthInLending } from '@/lib/apr';
import {
  addMonths,
  comparePrepayment,
  daysBetween,
  formatTerm,
  monthsAndDaysBetween,
  payoffDate,
  type AccrualBasis,
  type LoanTerms,
} from '@/lib/loan';
import { sumMoney } from '@/lib/money';

const AMOUNT_MIN = 500;
const AMOUNT_MAX = 1_000_000;

/** Daily actual/365 is the default: what a US installment lender bills; the fixtures use it. */
const BASIS_CHOICES = [
  { value: 'actual/365' as const, label: 'Daily · 365' },
  { value: 'monthly' as const, label: 'Monthly rests' },
  { value: '30/360' as const, label: '30 / 360' },
];

/** Every convention the engine can price, including the one no chip offers. */
const BASIS_NOTES: Record<AccrualBasis, string> = {
  'actual/360':
    'Interest accrues every day, but the year is counted as 360 days — so a full year costs 365/360 of the quoted rate. A commercial lending convention.',
  'actual/365':
    'Interest accrues every day on what is still owed, so a 31-day month costs more than a 28-day one. How US auto, personal and student loans are billed.',
  monthly:
    'One twelfth of the annual rate each month, whatever the calendar says — February costs the same as March. What mortgages, UK personal loans and every rate table quote. Any odd days before the first payment are charged on top, by the day.',
  '30/360':
    'Every month counted as 30 days and every year as 360. The bond convention, and how older mortgages were written.',
};

export default function LoanCalculatorScreen() {
  // Wrapper, not inline: an early return above the screen's own hooks would change the hook count
  // when the entitlement answer lands.
  const gate = useProGate('loans');
  if (gate) return gate;
  return <LoanCalculatorScreenInner />;
}

function LoanCalculatorScreenInner() {
  const confirm = useConfirm();

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

  const [padOpen, setPadOpen] = useState(false);
  const [ratePadOpen, setRatePadOpen] = useState(false);
  const [extraPadOpen, setExtraPadOpen] = useState(false);
  const [lumpPadOpen, setLumpPadOpen] = useState(false);
  const [feePadOpen, setFeePadOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [fundedPickerOpen, setFundedPickerOpen] = useState(false);
  const [lumpPickerOpen, setLumpPickerOpen] = useState(false);

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

  // Recomputed on every slider drag. With nothing extra paid, both sides are the same object and
  // only one schedule is built.
  const comparison = useMemo(() => comparePrepayment(terms), [terms]);
  const contract = comparison.base;
  const loan = comparison.accelerated;
  const overpaying = extraMonthly > 0 || lumpSum > 0;

  // The disclosure is for the loan as contracted, not as overpaid, as a lender quotes it.
  const disclosure = useMemo(
    () =>
      truthInLending({
        advance: amount,
        prepaidFinanceCharge: fees,
        advancedOn: fundedOn,
        payments: contract.rows.map((row) => ({
          on: new Date(`${row.date}T00:00:00`),
          amount: row.payment,
        })),
      }),
    [amount, fees, fundedOn, contract],
  );

  const schedule = loan.rows;
  const lastPayment = loan.payoffOn
    ? new Date(`${loan.payoffOn}T00:00:00`)
    : payoffDate(startDate, months);
  const contractLastPayment = contract.payoffOn
    ? new Date(`${contract.payoffOn}T00:00:00`)
    : lastPayment;
  const openingDays = daysBetween(fundedOn, startDate);
  // Half a basis point is where the two figures round differently on screen.
  const aprDiffers = Math.abs(disclosure.apr - rate) >= 0.005;
  /**
   * Leftover days of the opening period under monthly rests: one whole rest (rate / 12) plus per
   * diem (days * rate / 365) on the remainder, as the schedule bills it. The daily conventions
   * charge every day of the gap and have no stub.
   */
  const stubDays = basis === 'monthly' ? monthsAndDaysBetween(fundedOn, startDate).days : 0;
  const oddOpening =
    basis === 'monthly'
      ? stubDays > 0
      : openingDays > 0 && openingDays !== 30 && openingDays !== 31;

  /**
   * Asks before filing anything. `basis` goes to `/save-loan` untouched (`day_count_basis` holds
   * all four conventions), so no figure moves between here and the saved schedule.
   */
  const handleSave = async () => {
    if (contract.payment <= 0) return;

    const ok = await confirm({
      title: 'Add this to monthly bills?',
      message: overpaying
        ? `${formatCurrency(contract.payment)} a month for ${formatTerm(months)}, filed under Loans. The overpayments are not saved with it — the bill is the contract payment.`
        : `${formatCurrency(contract.payment)} a month for ${formatTerm(months)}, filed under Loans.`,
      confirmLabel: 'Continue',
      cancelLabel: 'Not now',
    });
    if (!ok) return;

    router.push({
      pathname: '/save-loan',
      params: {
        amount: String(amount),
        rate: String(rate),
        months: String(months),
        start: toIsoDate(startDate),
        funded: toIsoDate(fundedOn),
        basis,
      },
    });
  };

  return (
    <Screen title="Loan calculator" showBack>
      <View className="mt-6 w-full items-center rounded-[16px] border border-line bg-card px-5 py-6">
        <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
          Monthly payment
        </Text>
        <Text
          className="mt-1 font-app-bold text-[40px] text-ink"
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {formatCurrency(contract.payment)}
        </Text>
        <Text
          className="mt-1 text-center font-app text-[13px] text-muted"
          maxFontSizeMultiplier={1.3}
        >
          {schedule.length} payments · last on {formatFullDate(lastPayment)}
        </Text>

        {extraMonthly > 0 ? (
          <Text
            className="mt-2 text-center font-app text-[12px] leading-[17px] text-muted"
            maxFontSizeMultiplier={1.3}
          >
            Plus {formatCurrency(extraMonthly)} extra —{' '}
            {formatCurrency(sumMoney([contract.payment, extraMonthly]))} leaves your account each
            month.
          </Text>
        ) : null}

        {oddOpening ? (
          <Text
            className="mt-2 text-center font-app text-[12px] leading-[17px] text-muted"
            maxFontSizeMultiplier={1.3}
          >
            {basis === 'monthly'
              ? `First payment covers a month plus ${stubDays} ${stubDays === 1 ? 'day' : 'days'}`
              : `First payment covers ${openingDays} days, not a month`}
            {' — '}
            {formatCurrency(schedule[0]?.interest ?? 0)} of it is interest.
          </Text>
        ) : null}
      </View>

      <SectionHeading className="mb-4 mt-8">The loan</SectionHeading>

      <View className="w-full gap-6">
        <SliderRow
          label="Loan amount"
          display={formatCurrency(amount, { cents: false })}
          value={amount}
          min={AMOUNT_MIN}
          max={AMOUNT_MAX}
          step={500}
          scale="log"
          onChange={setAmount}
          onValuePress={() => setPadOpen(true)}
          minLabel={formatCurrency(AMOUNT_MIN, { cents: false })}
          maxLabel={formatCurrency(AMOUNT_MAX, { cents: false })}
        />

        <SliderRow
          label="Interest rate"
          display={`${rate.toFixed(2)}%`}
          value={rate}
          min={0}
          max={30}
          step={0.01}
          onChange={setRate}
          onValuePress={() => setRatePadOpen(true)}
          minLabel="0%"
          maxLabel="30%"
        />

        <SliderRow
          label="Term"
          display={formatTerm(months)}
          value={months}
          min={6}
          max={480}
          step={1}
          onChange={setMonths}
          minLabel="6 mo"
          maxLabel="40 yrs"
        />
      </View>

      <SectionHeading className="mb-4 mt-8">Dates</SectionHeading>

      <View className="w-full gap-5">
        <SelectField
          label="Money received"
          value={formatFullDate(fundedOn)}
          icon={Calendar}
          variant="pill"
          onPress={() => setFundedPickerOpen(true)}
        />
        <SelectField
          label="First payment"
          value={formatFullDate(startDate)}
          icon={Calendar}
          variant="pill"
          onPress={() => setDatePickerOpen(true)}
        />
      </View>

      <SectionHeading caption="Optional" className="mb-4 mt-8">
        Overpayments and fees
      </SectionHeading>

      <View className="w-full gap-5">
        <SelectField
          label="Extra each month"
          value={extraMonthly > 0 ? formatCurrency(extraMonthly) : ''}
          placeholder="Nothing extra"
          variant="pill"
          onPress={() => setExtraPadOpen(true)}
        />

        <SelectField
          label="One-off overpayment"
          value={lumpSum > 0 ? formatCurrency(lumpSum) : ''}
          placeholder="None"
          variant="pill"
          onPress={() => setLumpPadOpen(true)}
        />

        {lumpSum > 0 ? (
          <SelectField
            label="Overpayment lands"
            value={formatFullDate(lumpOn)}
            icon={Calendar}
            variant="pill"
            onPress={() => setLumpPickerOpen(true)}
          />
        ) : null}

        <SelectField
          label="Fees paid upfront"
          value={fees > 0 ? formatCurrency(fees) : ''}
          placeholder="None"
          variant="pill"
          onPress={() => setFeePadOpen(true)}
        />
      </View>

      <View className="mt-8 w-full">
        <FieldLabel className="mb-3">How interest is charged</FieldLabel>
        <ChoiceChips options={BASIS_CHOICES} value={basis} onChange={setBasis} />
        <Text
          className="mt-3 font-app text-[12px] leading-[17px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {BASIS_NOTES[basis]}
        </Text>
      </View>

      <View className="mt-6 w-full rounded-[16px] border border-line bg-card p-5">
        <ProportionBar principal={amount} interest={loan.totalInterest} />

        <View className="mt-5 w-full gap-3">
          <SummaryLine label="Borrowed" value={formatCurrency(amount)} />
          <SummaryLine label="Interest paid" value={formatCurrency(loan.totalInterest)} accent />
          {fees > 0 ? (
            <SummaryLine label="Fees at closing" value={formatCurrency(fees)} accent />
          ) : null}
          <View className="h-px w-full bg-line" />
          <SummaryLine label="Total you repay" value={formatCurrency(loan.totalPaid)} strong />
          {aprDiffers ? <SummaryLine label="APR" value={`${disclosure.apr.toFixed(2)}%`} /> : null}
        </View>

        {aprDiffers ? (
          <Text
            className="mt-4 font-app text-[12px] leading-[17px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            The APR is what the credit costs once the fees and the length of the first period are
            counted in — the figure a US lender has to disclose. It is higher than the rate whenever
            you pay for the loan before you start repaying it.
          </Text>
        ) : null}
      </View>

      {overpaying && (comparison.interestSaved > 0 || comparison.monthsSaved > 0) ? (
        <View className="mt-3 w-full gap-3 rounded-[16px] border border-line bg-card p-5">
          <Text className="font-app-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
            If you overpay
          </Text>
          <SummaryLine
            label="Interest saved"
            value={formatCurrency(comparison.interestSaved)}
            positive
          />
          {comparison.monthsSaved > 0 ? (
            <SummaryLine label="Paid off early by" value={formatTerm(comparison.monthsSaved)} />
          ) : null}
          <Text
            className="font-app text-[12px] leading-[17px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            Clear on {formatFullDate(lastPayment)} instead of {formatFullDate(contractLastPayment)},
            paying the same {formatCurrency(contract.payment)} a month plus what you add.
          </Text>
        </View>
      ) : null}

      <View className="mt-3 w-full">
        <ScheduleCard
          rows={schedule}
          onPress={() =>
            router.push({
              pathname: '/loan-schedule',
              params: {
                amount: String(amount),
                rate: String(rate),
                months: String(months),
                start: toIsoDate(startDate),
                funded: toIsoDate(fundedOn),
                basis,
                extra: String(extraMonthly),
                lump: String(lumpSum),
                lumpOn: toIsoDate(lumpOn),
              },
            })
          }
        />
      </View>

      <View className="mt-auto w-full pb-8 pt-8">
        <Button label="Save" onPress={handleSave} />
      </View>

      {padOpen ? (
        <AmountPad
          title="Loan amount"
          caption="How much you are borrowing"
          value={String(amount)}
          onCancel={() => setPadOpen(false)}
          onConfirm={(next) => {
            const parsed = Number(next) || 0;
            setAmount(Math.min(AMOUNT_MAX, Math.max(AMOUNT_MIN, parsed)));
            setPadOpen(false);
          }}
        />
      ) : null}

      {ratePadOpen ? (
        <AmountPad
          title="Interest rate"
          caption="Annual percentage rate"
          unit="percent"
          value={String(rate)}
          onCancel={() => setRatePadOpen(false)}
          onConfirm={(next) => {
            setRate(Math.min(30, Math.max(0, Number(next) || 0)));
            setRatePadOpen(false);
          }}
        />
      ) : null}

      {extraPadOpen ? (
        <AmountPad
          title="Extra each month"
          caption="Paid on top of the contract payment"
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
          title="One-off overpayment"
          caption="A single payment against the balance"
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
          title="Fees paid upfront"
          caption="Arrangement fee, points — anything deducted at closing"
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

function SummaryLine({
  label,
  value,
  strong = false,
  accent = false,
  positive = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  /** Money going out — interest, fees. */
  accent?: boolean;
  /** Money not going out. Interest saved is the only one on this screen. */
  positive?: boolean;
}) {
  return (
    <View className="w-full flex-row items-center justify-between gap-3">
      <Text
        className={
          strong ? 'font-app-medium text-[15px] text-ink' : 'font-app text-[14px] text-body'
        }
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
      <Text
        className={
          strong
            ? 'font-app-bold text-[17px] text-ink'
            : accent
              ? 'font-app-semibold text-[15px] text-money-out'
              : positive
                ? 'font-app-semibold text-[15px] text-money-in'
                : 'font-app-semibold text-[15px] text-ink'
        }
        maxFontSizeMultiplier={1.3}
      >
        {value}
      </Text>
    </View>
  );
}
