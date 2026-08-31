import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useSaveLoan } from '@/api/mutations';
import { usePaymentSources } from '@/api/queries';
import { IconPicker } from '@/components/bills/icon-picker';
import { Button } from '@/components/ui/button';
import { useProGate } from '@/components/pro/pro-gate';
import { Screen } from '@/components/ui/screen';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { amortise, formatTerm } from '@/lib/loan';

/**
 * Names a calculated loan and files it as a monthly bill.
 *
 * The figures arrive as route params rather than being recalculated from
 * scratch — but they ARE recalculated here anyway, from the same three inputs,
 * so a hand-edited link cannot save a payment that does not match its own
 * principal, rate and term.
 */
export default function SaveLoanScreen() {
  // A wrapper, not an inline return: the screen below runs its own
  // hooks, and an early return above them would change the hook count
  // the moment the entitlement answer arrives — which React forbids.
  const gate = useProGate('loans');
  if (gate) return gate;
  return <SaveLoanScreenInner />;
}

function SaveLoanScreenInner() {
  const params = useLocalSearchParams<{
    amount?: string;
    rate?: string;
    months?: string;
    start?: string;
    funded?: string;
  }>();

  const principal = Number(params.amount) || 0;
  const annualRate = Number(params.rate) || 0;
  const termMonths = Number(params.months) || 0;
  const firstPaymentOn = params.start ?? '';
  const fundedOn = params.funded ?? '';

  const loan = amortise({
    principal,
    annualRatePercent: annualRate,
    months: termMonths,
    firstPaymentOn: firstPaymentOn ? new Date(`${firstPaymentOn}T00:00:00`) : new Date(),
    fundedOn: fundedOn ? new Date(`${fundedOn}T00:00:00`) : undefined,
    basis: 'actual/365',
  });

  const [name, setName] = useState('');
  // 'other' is the neutral choice that actually exists in BILL_ICON_CHOICES;
  // there is no dedicated loan glyph, and defaulting to a missing id would
  // render the picker with nothing selected.
  const [iconId, setIconId] = useState('other');
  const [sourceId, setSourceId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { sources } = usePaymentSources();
  const saveLoan = useSaveLoan();

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Give the loan a name so you can spot it in your bills.');
      return;
    }
    if (termMonths < 1 || principal <= 0) {
      setError('That loan does not have a payment to save.');
      return;
    }

    const chosen = sources.find((source) => source.id === sourceId);

    try {
      await saveLoan.mutateAsync({
        name: name.trim(),
        iconId,
        principal,
        annualRate,
        termMonths,
        monthlyPayment: loan.payment,
        totalInterest: loan.totalInterest,
        firstPaymentOn,
        fundedOn: fundedOn || null,
        dayCountBasis: 'actual/365',
        cardId: chosen?.kind === 'card' ? chosen.id : null,
        bankAccountId: chosen?.kind === 'account' ? chosen.id : null,
      });
      // Back past the calculator to the bills list, where it now lives.
      router.dismissTo('/bills');
    } catch (thrown) {
      setError((thrown as Error).message ?? 'Could not save that loan.');
    }
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">Add to monthly bills</Title>
      <Subtitle className="mt-3">
        This becomes a monthly bill under Loans, so it counts against what you have left.
      </Subtitle>

      {/* What is actually being saved, restated. The calculator's sliders are
          gone by now and the numbers should not have to be remembered. */}
      <View className="mt-7 w-full rounded-[10px] border border-line px-4 py-3">
        <Row label="Monthly payment" value={formatCurrency(loan.payment)} strong />
        <Row label="Borrowed" value={formatCurrency(principal)} />
        <Row label="Rate" value={`${annualRate}% APR`} />
        <Row label="Term" value={`${formatTerm(termMonths)} · ${termMonths} payments`} />
        <Row
          label="First payment"
          value={firstPaymentOn ? formatFullDate(new Date(`${firstPaymentOn}T00:00:00`)) : '—'}
        />
        <Row label="Interest over the term" value={formatCurrency(loan.totalInterest)} />
      </View>

      <View className="mt-8 w-full gap-6">
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Car loan, student loan…"
          autoCapitalize="sentences"
          returnKeyType="done"
        />

        <View className="w-full">
          <FieldLabel className="mb-3">Icon</FieldLabel>
          <IconPicker value={iconId} onChange={setIconId} />
        </View>

        {sources.length > 0 ? (
          <View className="w-full">
            <FieldLabel className="mb-3">Paid from</FieldLabel>
            <SourceTiles sources={sources} value={sourceId} onChange={setSourceId} />
          </View>
        ) : null}

        {error ? (
          <Text className="font-poppins text-[13px] text-red-600" maxFontSizeMultiplier={1.4}>
            {error}
          </Text>
        ) : null}
      </View>

      <View className="mt-auto w-full pt-10">
        <Button label={saveLoan.isPending ? 'Saving…' : 'Add to bills'} onPress={handleSave} />
      </View>
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="w-full flex-row items-center justify-between gap-3 py-1.5">
      <Text className="font-poppins text-[14px] text-muted" maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      <Text
        className={
          strong
            ? 'font-poppins-semibold text-[16px] text-ink'
            : 'font-poppins text-[14px] text-body'
        }
        maxFontSizeMultiplier={1.3}
      >
        {value}
      </Text>
    </View>
  );
}
