import { router, useLocalSearchParams } from 'expo-router';
import { RotateCcw, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAdjustSavingsMonth, useExcludeSavingsMonth } from '@/api/mutations';
import { useMonthlySavings } from '@/api/queries';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Subtitle, Title } from '@/components/ui/typography';
import { formatCurrency } from '@/lib/format';
import { useConfirm } from '@/providers/dialog-provider';
import { useColors } from '@/providers/theme-provider';

function monthName(month: string): string {
  return new Date(`${month}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Correcting a month.
 *
 * The app only knows what it was told. A bill paid in cash, a receipt never
 * scanned, a subscription outside Skip — each one makes a month look better
 * than it was, and without a way to say so the total slowly stops being worth
 * reading.
 *
 * What the app worked out stays on screen next to the correction rather than
 * being replaced by it. Somebody coming back in six months needs to see both
 * to know why the two differ.
 */
export default function SavingsMonthScreen() {
  const colors = useColors();
  const confirm = useConfirm();
  const { month } = useLocalSearchParams<{ month?: string }>();

  const { data: months = [] } = useMonthlySavings();
  const row = months.find((entry) => entry.month === month);

  const [amount, setAmount] = useState(
    row?.adjusted_saved !== null && row?.adjusted_saved !== undefined
      ? String(row.adjusted_saved)
      : '',
  );
  const [note, setNote] = useState(row?.note ?? '');
  const [padOpen, setPadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adjust = useAdjustSavingsMonth();
  const exclude = useExcludeSavingsMonth();

  if (!row || !month) {
    return (
      <Screen showBack>
        <Title className="mt-2">Month</Title>
        <Subtitle className="mt-3">That month is not on your savings.</Subtitle>
      </Screen>
    );
  }

  const computed = Number(row.saved);
  const excluded = Boolean(row.excluded_at);

  const handleSave = async () => {
    setError(null);
    const typed = amount.trim();
    try {
      await adjust.mutateAsync({
        month,
        // Empty means "no correction" rather than "zero" — clearing the field
        // is how somebody puts a month back on the app's own figure.
        amount: typed === '' ? null : Number(typed),
        note: note.trim() || null,
      });
      router.back();
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  const handleReset = async () => {
    setError(null);
    try {
      await adjust.mutateAsync({ month, amount: null, note: null });
      setAmount('');
      setNote('');
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  const handleExclude = async () => {
    setError(null);
    if (!excluded) {
      const ok = await confirm({
        title: `Leave ${monthName(month)} out?`,
        message:
          'It stops counting towards your savings total. Nothing is deleted, and you can put it back.',
        confirmLabel: 'Leave it out',
        destructive: true,
      });
      if (!ok) return;
    }

    try {
      await exclude.mutateAsync({ month, excluded: !excluded });
      if (!excluded) router.back();
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title align="left" className="mt-2">
        {monthName(month)}
      </Title>
      <Subtitle className="mt-3">
        Skip only knows what it was told. If something was paid in cash or never scanned, put the
        real figure here.
      </Subtitle>

      {/* What the app worked out, kept visible. A correction that replaced this
          would leave nothing to explain the difference later. */}
      <View className="mt-7 w-full rounded-[10px] border border-line bg-card px-5 py-4">
        <Text className="font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          What Skip worked out
        </Text>
        <Text
          className="mt-1 font-poppins-semibold text-[20px] text-ink"
          maxFontSizeMultiplier={1.2}
        >
          {formatCurrency(computed)}
        </Text>
        <Text
          className="mt-1.5 font-poppins text-[12px] leading-[18px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {formatCurrency(Number(row.income))} came in and {formatCurrency(Number(row.spent))} went
          out on bills, subscriptions and receipts.
        </Text>
      </View>

      <View className="mt-7 w-full gap-6">
        <SelectField
          label="What it really left"
          value={amount.trim() === '' ? '' : formatCurrency(Number(amount))}
          placeholder="Leave empty to use Skip’s figure"
          icon={Wallet}
          onPress={() => setPadOpen(true)}
        />

        <TextField
          label="Why"
          optional
          value={note}
          onChangeText={setNote}
          placeholder="Paid the plumber in cash"
          maxLength={200}
          autoCapitalize="sentences"
        />
      </View>

      {error ? (
        <Text
          className="mt-5 w-full font-poppins text-[13px] text-red-600"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      <View className="mb-10 mt-auto w-full gap-3 pt-10">
        <Button
          label={adjust.isPending ? 'Saving…' : 'Save'}
          onPress={handleSave}
          disabled={adjust.isPending}
        />

        {amount.trim() !== '' || note.trim() !== '' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Put this month back on Skip’s own figure"
            onPress={handleReset}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-[10px] border border-line active:bg-ink/5"
          >
            <RotateCcw size={16} color={colors.ink} strokeWidth={1.9} />
            <Text
              className="font-poppins-medium text-[14px] text-ink"
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
            >
              Back to Skip’s figure
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            excluded ? 'Count this month again' : 'Leave this month out of your savings'
          }
          onPress={handleExclude}
          className="min-h-12 w-full items-center justify-center rounded-[10px] active:bg-ink/5"
        >
          <Text
            className={
              excluded
                ? 'font-poppins-medium text-[14px] text-ink'
                : 'font-poppins-medium text-[14px] text-red-600'
            }
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
          >
            {excluded ? 'Count this month again' : 'Leave this month out'}
          </Text>
        </Pressable>
      </View>

      {padOpen ? (
        <AmountPad
          title="What it really left"
          caption={monthName(month)}
          value={amount}
          onCancel={() => setPadOpen(false)}
          onConfirm={(next) => {
            setAmount(next);
            setPadOpen(false);
          }}
        />
      ) : null}
    </Screen>
  );
}
