import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useSaveLoan } from '@/api/mutations';
import { usePaymentSources } from '@/api/queries';
import { IconPicker } from '@/components/bills/icon-picker';
import { loanRateText, loanTermText } from '@/components/calculators/schedule-card';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Subtitle } from '@/components/ui/typography';
import { t } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { amortise, type AccrualBasis } from '@/lib/loan';
import { failureMessage } from '@/lib/failure';

/** Only the app's own conventions get through a hand-edited link. */
const BASES: readonly AccrualBasis[] = ['actual/365', 'actual/360', '30/360', 'monthly'];
const parseBasis = (value: string | undefined): AccrualBasis =>
  BASES.find((basis) => basis === value) ?? 'actual/365';

/**
 * Names a calculated loan and files it as a monthly bill. The payment is recalculated here from the
 * params, so a hand-edited link cannot save one that disagrees with its principal, rate and term.
 */
export default function SaveLoanScreen() {
  const params = useLocalSearchParams<{
    amount?: string;
    rate?: string;
    months?: string;
    start?: string;
    funded?: string;
    basis?: string;
  }>();

  const principal = Number(params.amount) || 0;
  const annualRate = Number(params.rate) || 0;
  const termMonths = Number(params.months) || 0;
  const firstPaymentOn = params.start ?? '';
  const fundedOn = params.funded ?? '';
  const basis = parseBasis(params.basis);

  const firstPaymentDate = firstPaymentOn ? new Date(`${firstPaymentOn}T00:00:00`) : new Date();
  const fundedDate = fundedOn ? new Date(`${fundedOn}T00:00:00`) : undefined;

  // Overpayments are not carried here: the bill is the contract payment the lender takes.
  const loan = amortise({
    principal,
    annualRatePercent: annualRate,
    months: termMonths,
    firstPaymentOn: firstPaymentDate,
    fundedOn: fundedDate,
    basis,
  });

  const [name, setName] = useState('');
  // 'other' exists in BILL_ICON_CHOICES; there is no loan glyph, and a missing id selects nothing.
  const [iconId, setIconId] = useState('other');
  const [sourceId, setSourceId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { sources } = usePaymentSources();
  const saveLoan = useSaveLoan();

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError(t('loan.save.needName'));
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
        iconId,
        principal,
        annualRate,
        termMonths,
        monthlyPayment: loan.payment,
        totalInterest: loan.totalInterest,
        firstPaymentOn,
        fundedOn: fundedOn || null,
        // Saved exactly as priced (the column holds all four bases), so no figure moves later.
        dayCountBasis: basis,
        cardId: chosen?.kind === 'card' ? chosen.id : null,
        bankAccountId: chosen?.kind === 'account' ? chosen.id : null,
      });
      // Back past the calculator to the bills list.
      router.dismissTo('/bills');
    } catch (thrown) {
      setError(failureMessage(thrown));
    }
  };

  return (
    <Screen title={t('loan.save.title')} showBack avoidKeyboard>
      <Subtitle className="mt-3">{t('loan.save.subtitle')}</Subtitle>

      <View className="mt-6 w-full rounded-[16px] border border-line bg-card px-4 py-3">
        <Row label={t('loan.monthlyPayment')} value={formatCurrency(loan.payment)} strong />
        <Row label={t('loan.borrowed')} value={formatCurrency(principal)} />
        <Row
          label={t('loan.save.rate')}
          value={t('loan.save.ratePerYear', { rate: loanRateText(annualRate) })}
        />
        <Row
          label={t('loan.termLabel')}
          value={t('loan.save.termPayments', {
            term: loanTermText(termMonths),
            count: termMonths,
          })}
        />
        <Row
          label={t('loan.firstPayment')}
          value={firstPaymentOn ? formatFullDate(new Date(`${firstPaymentOn}T00:00:00`)) : '—'}
        />
        <Row label={t('loan.save.interestOverTerm')} value={formatCurrency(loan.totalInterest)} />
      </View>

      <View className="mt-8 w-full gap-6">
        <TextField
          label={t('loan.save.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('loan.save.namePlaceholder')}
          autoCapitalize="sentences"
          returnKeyType="done"
        />

        <View className="w-full">
          <FieldLabel className="mb-3">{t('loan.save.icon')}</FieldLabel>
          <IconPicker value={iconId} onChange={setIconId} />
        </View>

        {sources.length > 0 ? (
          <View className="w-full">
            <FieldLabel className="mb-3">{t('loan.save.paidFrom')}</FieldLabel>
            <SourceTiles sources={sources} value={sourceId} onChange={setSourceId} />
          </View>
        ) : null}

        {error ? (
          <Text className="font-app text-[13px] text-danger" maxFontSizeMultiplier={1.4}>
            {error}
          </Text>
        ) : null}
      </View>

      <View className="mt-auto w-full pt-10">
        <Button
          label={saveLoan.isPending ? t('loan.save.saving') : t('loan.save.addToBills')}
          onPress={handleSave}
        />
      </View>
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="w-full flex-row items-center justify-between gap-3 py-1.5">
      <Text className="font-app text-[14px] text-muted" maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      <Text
        className={
          strong ? 'font-app-semibold text-[15px] text-ink' : 'font-app text-[14px] text-body'
        }
        maxFontSizeMultiplier={1.3}
      >
        {value}
      </Text>
    </View>
  );
}
