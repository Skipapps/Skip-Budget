import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  choiceToLead,
  useApplyReminder,
  useReminderChoice,
  type ReminderChoice,
} from '@/api/reminders';
import { useCreateCard, useDeleteCard, useUpdateCard } from '@/api/mutations';
import { useCard, useSourceLedger, useCards } from '@/api/queries';
import { useColors } from '@/providers/theme-provider';
import { NetworkPicker } from '@/components/cards/network-picker';
import { PaymentCard } from '@/components/cards/payment-card';
import { AmountStep } from '@/components/flow/amount-step';
import { InlineCalendar } from '@/components/flow/inline-calendar';
import { StepFlow } from '@/components/flow/step-flow';
import { ColorPicker } from '@/components/ui/color-picker';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { ReminderField } from '@/components/ui/reminder-field';
import { Skeleton } from '@/components/ui/skeleton';
import { usePro } from '@/api/pro';
import { useConfirm } from '@/providers/dialog-provider';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { NETWORKS } from '@/data/cards-mock';
import { t } from '@/i18n';
import { success, warn } from '@/lib/haptics';
import { failureMessage, failureText } from '@/lib/failure';
import { toIsoDate } from '@/lib/date';
import { useArtwork } from '@/theme/artwork';
import { DEFAULT_CARD_COLOR } from '@/theme/card-colors';

export default function AddCardScreen() {
  // Deep-link guard: creating past the free allowance opens Pro instead of a form the database
  // would refuse; editing is untouched. Wrapper-shaped so the hook count never changes. Decided
  // once on arrival: the count changes the moment the form saves, and a live check would shove the
  // person who just added their first card onto the Pro page.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { pro, ready } = usePro();
  const existing = useCards();

  const walled = useRef<boolean | null>(null);
  if (walled.current === null && (id || (ready && !existing.isPending))) {
    walled.current = !id && !pro && (existing.data?.length ?? 0) >= 1;
  }
  if (walled.current) {
    return <Redirect href={{ pathname: '/pro-feature', params: { id: 'unlimited' } }} />;
  }
  return <AddCardScreenInner />;
}

/**
 * An edit only runs on a record it has. A form with no record has no due day either, so Save would
 * call `applyReminder('card', id, null, …)` and delete the reminder on a card that was merely read
 * on a bad connection. Loading, unreadable and gone are separate answers; none is a blank form.
 */
function AddCardScreenInner() {
  const { id, from: origin } = useLocalSearchParams<{ id?: string; from?: string }>();
  const artwork = useArtwork();
  const card = useCard(id);
  const existing = card.data ?? null;

  if (id && !existing) {
    if (card.isError) {
      return (
        <Screen showBack>
          <PageState
            art={artwork.error}
            title={failureText()}
            actionLabel={t('common.tryAgain')}
            onAction={() => {
              void card.refetch();
            }}
            secondaryLabel={t('cards.form.goBack')}
            onSecondary={() => router.back()}
          />
        </Screen>
      );
    }

    if (!card.isFetched) {
      return (
        <StepFlow
          title={t('cards.add.editTitle')}
          closePrompt={t('cards.add.closeEditing')}
          steps={3}
          current={0}
          onBack={() => router.back()}
          primaryLabel={t('common.continue')}
          primaryDisabled
          onPrimary={() => {}}
        >
          <View className="w-full gap-6">
            <Skeleton className="h-[180px] w-full rounded-[16px]" />
            <Skeleton className="h-14 w-full rounded-[12px]" />
          </View>
        </StepFlow>
      );
    }

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

  return <CardForm key={existing?.id ?? 'new'} id={id} existing={existing} origin={origin} />;
}

function CardForm({
  id,
  existing,
  origin,
}: {
  id?: string;
  existing: ReturnType<typeof useCard>['data'] | null;
  /** 'setup' when the walk-in flow sent us; changes only where Save lands. */
  origin?: string;
}) {
  const colors = useColors();
  const editing = Boolean(id);

  const [network, setNetwork] = useState<string>(existing?.network ?? NETWORKS[0]);
  const [name, setName] = useState(existing?.holder ?? '');
  const [color, setColor] = useState<string>(existing?.color ?? DEFAULT_CARD_COLOR);

  const [last4, setLast4] = useState(existing?.last4 ?? '');
  // Stored as a day of the month; placed in the current month to give the calendar a Date.
  const [dueDate, setDueDate] = useState<Date | null>(
    existing?.bill_due_day
      ? new Date(new Date().getFullYear(), new Date().getMonth(), existing.bill_due_day)
      : null,
  );
  const [balance, setBalance] = useState(existing ? String(existing.balance) : '');

  const today = toIsoDate(new Date());
  // So the warning below can say how much history a new balance would absorb.
  const { ledger } = useSourceLedger(editing ? id : undefined, today);

  const savedReminder = useReminderChoice('card', id);
  const [reminderDraft, setReminderDraft] = useState<ReminderChoice | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const reminder = reminderDraft ?? savedReminder.choice;
  const remindAt = timeDraft ?? savedReminder.remindAt;
  const applyReminder = useApplyReminder();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ message: string; step: number } | null>(null);

  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const confirm = useConfirm();

  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: t('cards.add.deleteTitle'),
      message: t('cards.add.deleteMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteCard.mutateAsync(id);
      router.back();
    } catch (thrown) {
      setError({ message: failureMessage(thrown), step });
    }
  };

  const fail = (message: string, atStep: number) => {
    warn();
    setError({ message, step: atStep });
    setStep(atStep);
  };

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      fail(t('cards.add.nameMissing'), 1);
      return;
    }

    // Stating a balance means "this is the card today", so everything charged before today is
    // treated as already inside it and vanishes off the card. Say so first.
    if (editing && existing && Number(balance) !== existing.balance) {
      const absorbed = (ledger?.entries ?? []).filter((entry) => entry.date < today);

      if (absorbed.length > 0) {
        const ok = await confirm({
          title: t('cards.add.newBalanceTitle'),
          message: t('cards.add.newBalanceMessage', { count: absorbed.length }),
          confirmLabel: t('cards.add.updateBalance'),
          cancelLabel: t('cards.add.keepBalance'),
        });
        if (!ok) return;
      }
    }

    try {
      const values = {
        holder: name.trim(),
        network,
        last4: last4.length === 4 ? last4 : null,
        color,
        balance: Number(balance) || 0,
        // Stamped whenever a balance is stated, so charges before today are not counted twice.
        balance_as_of: balance ? toIsoDate(new Date()) : null,
        // The bill day is what recurs, not the specific date picked.
        bill_due_day: dueDate ? dueDate.getDate() : null,
      };

      const cardId =
        editing && id
          ? (await updateCard.mutateAsync({ id, values }), id)
          : (await createCard.mutateAsync(values)).id;

      // A card reminder counts back from its payment day, so it needs one.
      await applyReminder('card', cardId, dueDate ? choiceToLead(reminder) : null, remindAt);

      success();
      // The setup walk-in continues on the bank-account offer page; a dialog raised mid-navigation
      // never showed.
      if (!editing && origin === 'setup') {
        router.replace('/account-offer');
      } else {
        router.back();
      }
    } catch (thrown) {
      warn();
      setError({ message: failureMessage(thrown), step: 2 });
    }
  };

  const busy = createCard.isPending || updateCard.isPending;

  // Zero is a real balance, so only the name blocks step 1.
  const stepValid = step === 1 ? Boolean(name.trim()) : !busy;

  const question =
    step === 0
      ? t('cards.add.balanceQuestion')
      : step === 2
        ? t('cards.add.dueQuestion')
        : undefined;
  const primaryLabel =
    step < 2
      ? t('common.continue')
      : busy
        ? t('cards.form.saving')
        : editing
          ? t('cards.form.saveChanges')
          : t('cards.add.saveCard');
  const stepError = error && error.step === step ? error.message : null;

  return (
    <StepFlow
      title={editing ? t('cards.add.editTitle') : t('cards.add.addTitle')}
      closePrompt={editing ? t('cards.add.closeEditing') : t('cards.add.closeAdding')}
      steps={3}
      current={step}
      onBack={() => {
        setError(null);
        if (step === 0) router.back();
        else setStep((current) => current - 1);
      }}
      question={question}
      primaryLabel={primaryLabel}
      primaryDisabled={!stepValid}
      onPrimary={() => {
        if (step < 2) {
          setError(null);
          setStep((current) => current + 1);
          return;
        }
        void handleSave();
      }}
      error={step === 1 ? null : stepError}
      avoidKeyboard={step === 1}
      footerSlot={
        editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cards.add.deleteLabel')}
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text className="font-app-medium text-[15px] text-danger" maxFontSizeMultiplier={1.4}>
              {deleteCard.isPending ? t('cards.form.deleting') : t('cards.add.deleteCard')}
            </Text>
          </Pressable>
        ) : null
      }
    >
      {step === 0 ? <AmountStep value={balance} onChange={setBalance} /> : null}

      {step === 1 ? (
        <View className="w-full gap-6">
          <PaymentCard
            card={{
              id: 'preview',
              holder: name,
              balance: Number(balance) || 0,
              last4,
              network,
              color,
            }}
            placeholderHolder={t('cards.add.name')}
          />

          <View className="w-full">
            <FieldLabel className="mb-3">{t('cards.add.network')}</FieldLabel>
            <NetworkPicker networks={NETWORKS} value={network} onChange={setNetwork} />
          </View>

          <TextField
            label={t('cards.add.name')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <View className="w-full">
            <FieldLabel className="mb-3">{t('cards.form.cardColour')}</FieldLabel>
            <ColorPicker value={color} onChange={setColor} />
          </View>

          <TextField
            label={t('cards.form.last4')}
            value={last4}
            onChangeText={(text) => setLast4(text.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            returnKeyType="done"
          />

          {stepError ? (
            <Text className="w-full font-app text-[13px] text-danger" maxFontSizeMultiplier={1.4}>
              {stepError}
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === 2 ? (
        <View className="w-full gap-6">
          <InlineCalendar value={dueDate} onChange={setDueDate} />

          <ReminderField
            kind="card"
            value={reminder}
            onChange={setReminderDraft}
            time={remindAt}
            onTimeChange={setTimeDraft}
            unavailable={dueDate ? null : t('cards.add.reminderNeedsDate')}
          />
        </View>
      ) : null}
    </StepFlow>
  );
}
