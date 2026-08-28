import { router } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ProportionBar } from '@/components/calculators/proportion-bar';
import { SliderRow } from '@/components/calculators/slider-row';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { useConfirm } from '@/providers/dialog-provider';
import { SelectField } from '@/components/ui/select-field';
import { Title } from '@/components/ui/typography';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { calculateLoan, formatTerm, payoffDate } from '@/lib/loan';

const AMOUNT_MIN = 500;
const AMOUNT_MAX = 1_000_000;

export default function LoanCalculatorScreen() {
  const confirm = useConfirm();
  const [amount, setAmount] = useState(25_000);
  const [rate, setRate] = useState(7.5);
  const [months, setMonths] = useState(60);
  const [startDate, setStartDate] = useState(new Date());

  const [padOpen, setPadOpen] = useState(false);
  const [ratePadOpen, setRatePadOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const loan = calculateLoan(amount, rate, months);
  const lastPayment = payoffDate(startDate, months);

  // Saving waits on the data layer.
  /**
   * Asks before it files anything. The calculator is a scratchpad — most
   * people open it to try numbers, not to commit to a debt.
   */
  const handleSave = async () => {
    if (loan.monthlyPayment <= 0) return;

    const ok = await confirm({
      title: 'Add this to monthly bills?',
      message: `${formatCurrency(loan.monthlyPayment)} a month for ${formatTerm(months)}, filed under Loans.`,
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
      },
    });
  };

  return (
    <Screen showBack>
      <Title align="left" className="mt-2">
        Loan calculator
      </Title>

      {/* The answer first — everything below it is how you change it. */}
      <View className="mt-6 w-full items-center rounded-[10px] border border-line bg-white px-5 py-6">
        <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
          Monthly payment
        </Text>
        <Text
          className="mt-1 font-poppins-bold text-[40px] text-ink"
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {formatCurrency(loan.monthlyPayment)}
        </Text>
        <Text
          className="mt-1 text-center font-poppins text-[13px] text-muted"
          maxFontSizeMultiplier={1.3}
        >
          {months} payments · last on {formatFullDate(lastPayment)}
        </Text>
      </View>

      <View className="mt-7 w-full gap-6">
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
          label="Interest rate (APR)"
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

      <View className="mt-7 w-full">
        <SelectField
          label="First payment"
          value={formatFullDate(startDate)}
          icon={Calendar}
          onPress={() => setDatePickerOpen(true)}
        />
      </View>

      <View className="mt-7 w-full rounded-[10px] border border-line bg-white p-5">
        <ProportionBar principal={amount} interest={loan.totalInterest} />

        <View className="mt-5 w-full gap-3">
          <SummaryLine label="Borrowed" value={formatCurrency(amount)} />
          <SummaryLine label="Interest paid" value={formatCurrency(loan.totalInterest)} accent />
          <View className="h-px w-full bg-line" />
          <SummaryLine label="Total you repay" value={formatCurrency(loan.totalPaid)} strong />
        </View>
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
            // Keep it inside the slider's range so the two controls agree.
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
            // Clamp to the slider's range so the two controls agree.
            setRate(Math.min(30, Math.max(0, Number(next) || 0)));
            setRatePadOpen(false);
          }}
        />
      ) : null}

      {datePickerOpen ? (
        <DatePicker
          value={startDate}
          onCancel={() => setDatePickerOpen(false)}
          onConfirm={(date) => {
            setStartDate(date);
            setDatePickerOpen(false);
          }}
        />
      ) : null}
    </Screen>
  );
}

function SummaryLine({
  label,
  value,
  strong = false,
  accent = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <View className="w-full flex-row items-center justify-between gap-3">
      <Text
        className={
          strong ? 'font-poppins-medium text-[15px] text-ink' : 'font-poppins text-[14px] text-body'
        }
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
      <Text
        className={
          strong
            ? 'font-poppins-bold text-[17px] text-ink'
            : accent
              ? 'font-poppins-semibold text-[15px] text-accent'
              : 'font-poppins-semibold text-[15px] text-ink'
        }
        maxFontSizeMultiplier={1.3}
      >
        {value}
      </Text>
    </View>
  );
}
