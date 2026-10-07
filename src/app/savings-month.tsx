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
import { t } from '@/i18n';
import { monthLong } from '@/i18n/calendar';
import { formatCurrency } from '@/lib/format';
import { useConfirm } from '@/providers/dialog-provider';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { failureMessage, failureText } from '@/lib/failure';

/** "August 2026", "agosto de 2026": as it reads inside a sentence. */
function monthInSentence(month: string): string {
  const date = new Date(`${month}T00:00:00`);
  return t('savings.monthYear', { month: monthLong(date.getMonth()), year: date.getFullYear() });
}

/** The same at the start of a line, where every language takes a capital. */
function monthName(month: string): string {
  const name = monthInSentence(month);
  return name.charAt(0).toUpperCase() + name.slice(1);
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
      <Screen title={t('savings.month.title')} showBack>
        <View className="mt-2 w-full gap-4" accessibilityLabel={t('savings.month.loading')}>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="mt-2 h-28 w-full rounded-[16px]" />
          <Skeleton className="h-14 w-full rounded-[12px]" />
        </View>
      </Screen>
    );
  }

  if (months.isError) {
    return (
      <Screen title={t('savings.month.title')} showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => void months.refetch()}
        />
      </Screen>
    );
  }

  if (!row || !month) {
    return (
      <Screen title={t('savings.month.title')} showBack>
        <Subtitle className="mt-3">{t('savings.month.missing')}</Subtitle>
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
        title: t('savings.month.excludeTitle', { month: monthInSentence(month) }),
        message: t('savings.month.excludeMessage'),
        confirmLabel: t('savings.month.excludeConfirm'),
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
      <Subtitle className="mt-3">{t('savings.month.intro')}</Subtitle>

      <View className="mt-6 w-full rounded-[16px] border border-line bg-card px-5 py-4">
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {t('savings.month.workedOut')}
        </Text>
        <Text className="mt-1 font-app-semibold text-[20px] text-ink" maxFontSizeMultiplier={1.2}>
          {formatCurrency(computed)}
        </Text>
        <Text
          className="mt-1.5 font-app text-[12px] leading-[18px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {t('savings.month.flow', {
            income: formatCurrency(Number(row.income)),
            spent: formatCurrency(Number(row.spent)),
          })}
        </Text>
      </View>

      <View className="mt-6 w-full gap-6">
        <SelectField
          label={t('savings.month.reallyLeft')}
          value={amount.trim() === '' ? '' : formatCurrency(Number(amount))}
          placeholder={t('savings.month.reallyLeftPlaceholder')}
          icon={Wallet}
          onPress={() => setPadOpen(true)}
        />

        <TextField
          label={t('savings.month.why')}
          optional
          value={note}
          onChangeText={setNote}
          placeholder={t('savings.month.whyPlaceholder')}
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
          label={adjust.isPending ? t('savings.month.saving') : t('common.save')}
          onPress={handleSave}
          disabled={adjust.isPending}
        />

        {amount.trim() !== '' || note.trim() !== '' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('savings.month.resetLabel')}
            onPress={handleReset}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full bg-ink/5 active:bg-ink/10"
          >
            <RotateCcw size={18} color={colors.ink} strokeWidth={1.8} />
            <Text className="font-app-medium text-[14px] text-ink" maxFontSizeMultiplier={1.4}>
              {t('savings.month.reset')}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            excluded ? t('savings.month.include') : t('savings.month.excludeLabel')
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
            maxFontSizeMultiplier={1.4}
          >
            {excluded ? t('savings.month.include') : t('savings.month.exclude')}
          </Text>
        </Pressable>
      </View>

      {padOpen ? (
        <AmountPad
          title={t('savings.month.reallyLeft')}
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
