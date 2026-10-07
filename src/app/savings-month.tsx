import { router, useLocalSearchParams } from 'expo-router';
import { RotateCcw, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAdjustSavingsMonth, useExcludeSavingsMonth } from '@/api/mutations';
import { useMonthlySavings } from '@/api/queries';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { Subtitle } from '@/components/ui/typography';
import { formatCurrency } from '@/lib/format';
import { useConfirm } from '@/providers/dialog-provider';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { FAILURE_MESSAGE, failureMessage } from '@/lib/failure';

function monthName(month: string): string {
  return new Date(`${month}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

type SavingsMonthRow = NonNullable<ReturnType<typeof useMonthlySavings>['data']>[number];

/**
 * Corrects a month's savings. Waits for the month before the form exists, then seeds it by
 * remount: the amount and note are `useState` initial values, read once, so on a cold cache (deep
 * link) saving would write an empty amount over an existing correction. Loading, failed and
 * missing are kept apart so a failed read never claims the month is gone.
 */
export default function SavingsMonthScreen() {
  const artwork = useArtwork();
  const { month } = useLocalSearchParams<{ month?: string }>();

  const months = useMonthlySavings();
  const row = (months.data ?? []).find((entry) => entry.month === month);

  if (months.isLoading) {
    return (
      <Screen title="Month" showBack>
        <View className="mt-2 w-full gap-4" accessibilityLabel="Loading">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="mt-2 h-28 w-full rounded-[16px]" />
          <Skeleton className="h-14 w-full rounded-[12px]" />
        </View>
      </Screen>
    );
  }

  if (months.isError) {
    return (
      <Screen title="Month" showBack>
        <PageState
          art={artwork.error}
          title={FAILURE_MESSAGE}
          actionLabel="Try again"
          onAction={() => void months.refetch()}
        />
      </Screen>
    );
  }

  if (!row || !month) {
    return (
      <Screen title="Month" showBack>
        <Subtitle className="mt-3">That month is not on your savings.</Subtitle>
      </Screen>
    );
  }

  return <SavingsMonthForm key={row.month} month={month} row={row} />;
}

function SavingsMonthForm({ month, row }: { month: string; row: SavingsMonthRow }) {
  const colors = useColors();
  const confirm = useConfirm();

  const [amount, setAmount] = useState(
    row.adjusted_saved !== null && row.adjusted_saved !== undefined
      ? String(row.adjusted_saved)
      : '',
  );
  const [note, setNote] = useState(row.note ?? '');
  const [padOpen, setPadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adjust = useAdjustSavingsMonth();
  const exclude = useExcludeSavingsMonth();

  const computed = Number(row.saved);
  const excluded = Boolean(row.excluded_at);

  const handleSave = async () => {
    setError(null);
    const typed = amount.trim();
    try {
      await adjust.mutateAsync({
        month,
        // Empty means "no correction", not zero: it puts the month back on the app's own figure.
        amount: typed === '' ? null : Number(typed),
        note: note.trim() || null,
      });
      router.back();
    } catch (thrown) {
      setError(failureMessage(thrown));
    }
  };

  const handleReset = async () => {
    setError(null);
    try {
      await adjust.mutateAsync({ month, amount: null, note: null });
      setAmount('');
      setNote('');
    } catch (thrown) {
      setError(failureMessage(thrown));
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
      setError(failureMessage(thrown));
    }
  };

  return (
    <Screen title={monthName(month)} showBack avoidKeyboard>
      <Subtitle className="mt-3">
        Skip only knows what it was told. If something was paid in cash or never scanned, put the
        real figure here.
      </Subtitle>

      <View className="mt-6 w-full rounded-[16px] border border-line bg-card px-5 py-4">
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          What Skip worked out
        </Text>
        <Text className="mt-1 font-app-semibold text-[20px] text-ink" maxFontSizeMultiplier={1.2}>
          {formatCurrency(computed)}
        </Text>
        <Text
          className="mt-1.5 font-app text-[12px] leading-[18px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {formatCurrency(Number(row.income))} came in and {formatCurrency(Number(row.spent))} went
          out on bills, subscriptions and receipts.
        </Text>
      </View>

      <View className="mt-6 w-full gap-6">
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
        <Text className="mt-5 w-full font-app text-[13px] text-danger" maxFontSizeMultiplier={1.4}>
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
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full bg-ink/5 active:bg-ink/10"
          >
            <RotateCcw size={18} color={colors.ink} strokeWidth={1.8} />
            <Text
              className="font-app-medium text-[14px] text-ink"
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
          className="min-h-12 w-full items-center justify-center rounded-full active:bg-ink/5"
        >
          <Text
            className={
              excluded
                ? 'font-app-medium text-[14px] text-ink'
                : 'font-app-medium text-[14px] text-danger'
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
