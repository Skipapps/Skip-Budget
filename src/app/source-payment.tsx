import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useCreatePayment } from '@/api/mutations';
import { useBankAccounts, useCards, usePaymentSources } from '@/api/queries';
import { AmountStep } from '@/components/flow/amount-step';
import { StepFlow } from '@/components/flow/step-flow';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SourceTiles } from '@/components/ui/source-tiles';
import { t } from '@/i18n';
import { failureMessage, failureText } from '@/lib/failure';
import { success, warn } from '@/lib/haptics';
import { useToday } from '@/lib/use-today';
import { useToast } from '@/providers/toast-context';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

type Step = 'amount' | 'from';

/**
 * A card payment, or money added to a bank account: how much, then where it came from. A card is
 * paid from one of the person's accounts or from somewhere else; money comes into an account from
 * another of their accounts or is new money. Where there is nothing to choose between (no other
 * account), the answer is plain and nothing is asked.
 */
export default function SourcePaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artwork = useArtwork();
  const cards = useCards();
  const accounts = useBankAccounts();
  // The same accounts the "Paid with" pickers offer, so a plan's limit applies here too.
  const { sources } = usePaymentSources();
  const createPayment = useCreatePayment();
  const toast = useToast();
  const { today } = useToday();

  const isCard = (cards.data ?? []).some((card) => card.id === id);
  const choices = sources.filter((source) => source.kind === 'account' && source.id !== id);
  const asks = choices.length > 0;

  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  // '' is from outside (somewhere else, or new money); null is not answered yet.
  const [from, setFrom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount);
  const amountReady = Number.isFinite(value) && value > 0;
  const known = isCard || (accounts.data ?? []).some((account) => account.id === id);

  // A card or account that could not be read, or is gone, has nothing to pay into.
  if (cards.isError || accounts.isError || (cards.data && accounts.data && !known)) {
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('cards.form.goBack')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const title = isCard ? t('accounts.source.makePayment') : t('accounts.source.addMoney');
  const closePrompt = isCard ? t('accounts.pay.closeCard') : t('accounts.pay.closeAccount');
  const saveLabel = createPayment.isPending
    ? t('accounts.pay.saving')
    : isCard
      ? t('accounts.pay.saveCard')
      : t('accounts.pay.saveAccount');

  const save = async (source: string) => {
    if (!known || createPayment.isPending) return;
    setError(null);
    try {
      await createPayment.mutateAsync({
        card_id: isCard ? id : null,
        bank_account_id: isCard ? null : id,
        amount: value,
        paid_on: today,
        note: null,
        // Left off, not sent as null: a database without the column still takes money from outside.
        ...(source ? { from_bank_account_id: source } : {}),
      });
      success();
      toast(isCard ? 'toast.payment.added' : 'toast.money.added');
      router.back();
    } catch (thrown) {
      warn();
      setError(failureMessage(thrown));
    }
  };

  if (step === 'amount') {
    return (
      <StepFlow
        title={title}
        closePrompt={closePrompt}
        steps={asks ? 2 : 1}
        current={0}
        onBack={() => router.back()}
        question={isCard ? t('accounts.pay.howMuchCard') : t('accounts.pay.howMuchAccount')}
        primaryLabel={asks ? t('common.continue') : saveLabel}
        // Still reading which card or account this is.
        primaryDisabled={!amountReady || !known || createPayment.isPending}
        onPrimary={() => {
          if (asks) setStep('from');
          else void save('');
        }}
        error={error}
      >
        <AmountStep value={amount} onChange={setAmount} />
      </StepFlow>
    );
  }

  return (
    <StepFlow
      title={title}
      closePrompt={closePrompt}
      steps={2}
      current={1}
      onBack={() => {
        setError(null);
        setStep('amount');
      }}
      question={isCard ? t('accounts.pay.fromCard') : t('accounts.pay.fromAccount')}
      primaryLabel={saveLabel}
      primaryDisabled={createPayment.isPending}
      onPrimary={() => {
        if (from === null) {
          warn();
          setError(t('accounts.pay.pickFrom'));
          return;
        }
        void save(from);
      }}
      error={error}
    >
      <View className="mt-2 w-full">
        <Text
          className="mb-4 w-full font-app text-[14px] leading-[20px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {isCard ? t('accounts.pay.fromCardHint') : t('accounts.pay.fromAccountHint')}
        </Text>
        <SourceTiles
          sources={choices}
          value={from ?? ''}
          onChange={(next) => {
            setError(null);
            setFrom(next);
          }}
          skip={{
            label: isCard ? t('accounts.pay.somewhereElse') : t('accounts.pay.newMoney'),
            selected: from === '',
            onPress: () => {
              setError(null);
              setFrom('');
            },
          }}
        />
      </View>
    </StepFlow>
  );
}
