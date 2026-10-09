import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useApplyReminder, useReminderChoice } from '@/api/reminders';
import { creditLimitValue, useCreateCard, useDeleteCard, useUpdateCard } from '@/api/mutations';
import { useCard, useSourceLedger, useCards } from '@/api/queries';
import { useColors } from '@/providers/theme-provider';
import { PaymentCard } from '@/components/cards/payment-card';
import { AddedPage } from '@/components/flow/added-page';
import { AmountStep } from '@/components/flow/amount-step';
import { DayStrip } from '@/components/flow/day-strip';
import { FlowSummary } from '@/components/flow/flow-summary';
import { RemindMeCard } from '@/components/flow/remind-me-card';
import type { LeadDays } from '@/lib/reminder-words';
import { StepFlow } from '@/components/flow/step-flow';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { ColorPicker } from '@/components/ui/color-picker';
import { CurrencyField } from '@/components/ui/currency-field';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { usePro } from '@/api/pro';
import { useConfirm } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { NETWORKS } from '@/data/cards';
import { t } from '@/i18n';
import { success, warn } from '@/lib/haptics';
import { failureMessage, failureText } from '@/lib/failure';
import { leaveFlow } from '@/lib/nav';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { LATE_DAYS, dayDate, dayOrdinal, nextDueOn, nextReminderOn } from '@/lib/due-day';
import { addedMessage, billReminderCaption, reminderRow } from '@/lib/reminder-words';
import { useArtwork } from '@/theme/artwork';
import { DEFAULT_CARD_COLOR } from '@/theme/card-colors';
import { TEXT_CAP } from '@/theme/text-scale';

/** The stored network is the value; a wordmark drawn in capitals is only the label. */
const NETWORK_OPTIONS = NETWORKS.map((network) => ({
  value: network,
  label: network === 'Amex' ? 'AMEX' : network,
}));

export default function AddCardScreen() {
  // Deep-link guard: creating past the free allowance opens Pro instead of a form the database
  // would refuse; editing is untouched. Wrapper-shaped so the hook count never changes. Decided
  // once on arrival: the count changes the moment the form saves, and a live check would shove the
  // person who just added their first card onto the Pro page.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { pro, ready } = usePro();
  const existing = useCards();

  const [walled, setWalled] = useState<boolean | null>(null);
  let decided = walled;
  // Not while the list is refreshing either: just after a save, "Add another" would count the
  // list from before it.
  if (decided === null && (id || (ready && !existing.isPending && !existing.isFetching))) {
    decided = !id && !pro && (existing.data?.length ?? 0) >= 1;
    setWalled(decided);
  }
  if (decided) {
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
  const [dueDay, setDueDay] = useState<number | null>(existing?.bill_due_day ?? null);
  const [balance, setBalance] = useState(existing ? String(existing.balance) : '');
  // As typed: creditLimitValue turns it into the number saved, or null for none.
  const [creditLimit, setCreditLimit] = useState(
    existing?.credit_limit ? String(existing.credit_limit) : '',
  );
  const limit = creditLimitValue(creditLimit);

  const today = toIsoDate(new Date());
  // So the warning below can say how much history a new balance would absorb.
  const { ledger } = useSourceLedger(editing ? id : undefined, today);

  // The saved reminder until the person touches it; its time of day is kept as it is.
  const savedReminder = useReminderChoice('card', id);
  const [onDraft, setOnDraft] = useState<boolean | null>(null);
  const [leadDraft, setLeadDraft] = useState<LeadDays | null>(null);
  // New ones start on, three days before; an edit opens on what is saved.
  const reminderOn = onDraft ?? (editing ? savedReminder.choice !== 'off' : true);
  const lead: LeadDays =
    leadDraft ?? (savedReminder.choice === 'off' ? 3 : (Number(savedReminder.choice) as LeadDays));
  const applyReminder = useApplyReminder();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ message: string; step: number } | null>(null);
  /** Set once a new card is saved: the flow gives way to the page that says so. */
  const [added, setAdded] = useState(false);

  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const confirm = useConfirm();
  const toast = useToast();

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
      toast('toast.card.deleted', 'deleted');
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
        // Stamped when a balance is stated, so charges before today are not counted twice. An edit
        // that leaves the balance alone keeps its day: re-dating it would drop every charge since.
        balance_as_of:
          editing && existing && Number(balance) === existing.balance
            ? (existing.balance_as_of ?? null)
            : balance
              ? toIsoDate(new Date())
              : null,
        bill_due_day: dueDay,
        // Sent on every save, null when empty, so clearing the field removes the limit.
        credit_limit: limit,
      };

      const cardId =
        editing && id
          ? (await updateCard.mutateAsync({ id, values }), id)
          : (await createCard.mutateAsync(values)).id;

      // A card reminder counts back from its payment day, so it needs one. Untouched while the saved
      // one is unknown: the form's 'off' is then a guess, and writing it deletes the reminder.
      if (!savedReminder.unknown) {
        await applyReminder(
          'card',
          cardId,
          dueDay && reminderOn ? lead : null,
          savedReminder.remindAt,
        );
      }

      success();
      // The setup walk-in continues on the bank-account offer page; a dialog raised mid-navigation
      // never showed.
      if (!editing && origin === 'setup') {
        toast('toast.card.added');
        router.replace('/account-offer');
      } else if (editing) {
        toast('toast.card.updated');
        router.back();
      } else {
        setAdded(true);
      }
    } catch (thrown) {
      warn();
      setError({ message: failureMessage(thrown), step: 2 });
    }
  };

  const busy = createCard.isPending || updateCard.isPending;
  const nextDue = dueDay ? nextDueOn(dueDay, today) : null;
  const remindOn = dueDay ? nextReminderOn(dueDay, lead, today) : null;
  const preview = {
    id: 'preview',
    holder: name,
    balance: Number(balance) || 0,
    last4,
    network,
    color,
    creditLimit: limit,
  };

  if (added) {
    const reminded = Boolean(dueDay && reminderOn);
    return (
      <AddedPage
        title={t('cards.added.title')}
        message={addedMessage('bill', reminded ? lead : null)}
        face={<PaymentCard card={{ ...preview, holder: name.trim() }} />}
        rows={[
          {
            label: t('cards.added.due'),
            value: dueDay
              ? t('cards.added.dueValue', { day: dayOrdinal(dueDay) })
              : t('cards.added.notSet'),
          },
          ...(nextDue
            ? [{ label: t('cards.added.nextDue'), value: formatFullDate(dayDate(nextDue)) }]
            : []),
          {
            label: t('cards.added.reminder'),
            value:
              reminded && remindOn ? reminderRow(lead, remindOn) : t('cards.added.reminderOff'),
          },
        ]}
        onDone={leaveFlow}
        anotherLabel={t('cards.added.another')}
        // A new route rather than a reset form, so the free allowance is checked again.
        onAnother={() => router.replace('/add-card')}
      />
    );
  }

  // Zero is a real balance, so only the name blocks step 1.
  const stepValid = step === 1 ? Boolean(name.trim()) : !busy;

  const primaryLabel =
    step < 2
      ? t('common.continue')
      : busy
        ? t('cards.form.saving')
        : editing
          ? t('cards.form.saveChanges')
          : t('cards.add.addCard');
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
      question={step === 0 ? t('cards.add.balanceQuestion') : undefined}
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
        <View className="w-full gap-[16px]">
          <PaymentCard card={preview} placeholderHolder={t('cards.form.cardName')} preview />

          <TextField
            label={t('cards.form.cardName')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="done"
            filled
          />

          <View className="w-full">
            <FieldLabel className="mb-2">{t('cards.form.network')}</FieldLabel>
            <ChoiceChips
              options={NETWORK_OPTIONS}
              value={network}
              onChange={setNetwork}
              tone="card"
            />
          </View>

          <TextField
            label={t('cards.form.last4')}
            value={last4}
            onChangeText={(text) => setLast4(text.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            returnKeyType="done"
            filled
          />

          <CurrencyField
            label={t('cards.form.creditLimit')}
            value={creditLimit}
            onChange={setCreditLimit}
            placeholder={t('cards.form.creditLimitOptional')}
            filled
          />

          <View className="w-full">
            <FieldLabel className="mb-1">{t('cards.form.cardColour')}</FieldLabel>
            <ColorPicker value={color} onChange={setColor} saved={existing?.color} />
          </View>

          {stepError ? (
            <Text className="w-full font-app text-[13px] text-danger" maxFontSizeMultiplier={1.4}>
              {stepError}
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === 2 ? (
        <View className="w-full">
          <Text
            accessibilityRole="header"
            className="w-full font-app-semibold text-[20px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.heading}
          >
            {t('cards.add.dueQuestion')}
          </Text>
          <Text
            className="mt-1.5 w-full font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {t('cards.add.dueSubtitle')}
          </Text>

          <View className="mt-[16px] w-full">
            <DayStrip value={dueDay} onChange={setDueDay} />
          </View>

          {dueDay && nextDue ? (
            <View className="mt-[16px] w-full">
              <FlowSummary
                icon={CalendarDays}
                title={t(dueDay >= LATE_DAYS ? 'cards.add.dueEveryLate' : 'cards.add.dueEvery', {
                  day: dayOrdinal(dueDay),
                })}
                caption={t('cards.add.nextDue', { date: formatFullDate(dayDate(nextDue)) })}
              />
            </View>
          ) : null}

          <View className="mt-[16px] w-full">
            <RemindMeCard
              on={reminderOn}
              onToggle={setOnDraft}
              lead={lead}
              onLead={setLeadDraft}
              caption={
                reminderOn && remindOn
                  ? billReminderCaption(lead, remindOn)
                  : t('cards.add.remindOff')
              }
              unavailable={dueDay ? null : t('cards.add.reminderNeedsDay')}
            />
          </View>

          {editing ? null : (
            <Text
              className="mt-[18px] w-full font-app text-[12px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {t('cards.add.changeLater')}
            </Text>
          )}
        </View>
      ) : null}
    </StepFlow>
  );
}
