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
import { success, warn } from '@/lib/haptics';
import { FAILURE_MESSAGE, failureMessage } from '@/lib/failure';
import { toIsoDate } from '@/lib/date';
import { useArtwork } from '@/theme/artwork';
import { DEFAULT_CARD_COLOR } from '@/theme/card-colors';

/** Loads the card being edited, then seeds the form by remount. */
export default function AddCardScreen() {
  // Deep-link guard: creating past the free allowance opens the case
  // for Pro instead of a form the database would refuse. Editing is
  // untouched. Wrapper-shaped so the hook count never changes.
  //
  // Decided once, on arrival: the count this reads changes the moment the
  // form saves, and a live check then shoved the person who just added
  // their first card onto the Pro page instead of back where they came
  // from — reading as "your card was not added" when it very much was.
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
 * An edit only ever runs on a record it actually has.
 *
 * This one has teeth beyond the blanked fields. `id` makes Save an update, and
 * a form with no record has no due day either — so Save would also call
 * `applyReminder('card', id, null, …)`, which deletes the reminder on a card
 * whose only crime was being read on a bad connection. Loading, could not be
 * read and no longer there each get said, and none of them is a blank form.
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
            title={FAILURE_MESSAGE}
            actionLabel="Try again"
            onAction={() => {
              void card.refetch();
            }}
            secondaryLabel="Go back"
            onSecondary={() => router.back()}
          />
        </Screen>
      );
    }

    if (!card.isFetched) {
      return (
        <StepFlow
          title="Edit credit card"
          closePrompt="Cancel editing this credit card?"
          steps={3}
          current={0}
          onBack={() => router.back()}
          primaryLabel="Continue"
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
          title={FAILURE_MESSAGE}
          actionLabel="Go back"
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
  // Stored as a day of the month; the picker wants a Date, so it is placed in
  // the current month purely to give the wheel something to open on.
  const [dueDate, setDueDate] = useState<Date | null>(
    existing?.bill_due_day
      ? new Date(new Date().getFullYear(), new Date().getMonth(), existing.bill_due_day)
      : null,
  );
  const [balance, setBalance] = useState(existing ? String(existing.balance) : '');

  const today = toIsoDate(new Date());
  // What the card is showing right now, so the warning below can say how much
  // history a new balance would absorb rather than warning in the abstract.
  const { ledger } = useSourceLedger(editing ? id : undefined, today);

  const savedReminder = useReminderChoice('card', id);
  const [reminderDraft, setReminderDraft] = useState<ReminderChoice | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const reminder = reminderDraft ?? savedReminder.choice;
  const remindAt = timeDraft ?? savedReminder.remindAt;
  const applyReminder = useApplyReminder();

  // Editing walks the flow from the start, amount first, exactly as adding
  // does — every figure is in front of the person before Save, not just the
  // ones on the page an edit happened to open on.
  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ message: string; step: number } | null>(null);

  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const confirm = useConfirm();

  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Delete this credit card?',
      message:
        'Receipts, bills and subscriptions paid with it are kept, but stop showing this credit card.',
      confirmLabel: 'Delete',
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

  /** A check for a field on an earlier step sends you back to that step. */
  const fail = (message: string, atStep: number) => {
    warn();
    setError({ message, step: atStep });
    setStep(atStep);
  };

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      fail('Give the credit card a name so you can tell it apart.', 1);
      return;
    }

    // Stating a balance means "this is what the card is at, today", so
    // everything charged before today is treated as already inside that
    // figure. That is the right arithmetic and an unpleasant surprise: the
    // transactions vanish off the card with no explanation. Say it first.
    if (editing && existing && Number(balance) !== existing.balance) {
      const absorbed = (ledger?.entries ?? []).filter((entry) => entry.date < today);

      if (absorbed.length > 0) {
        const ok = await confirm({
          title: 'This balance becomes the starting point',
          message:
            `A new balance is taken as today's figure, so the ` +
            `${absorbed.length === 1 ? 'transaction' : `${absorbed.length} transactions`} ` +
            `already on this credit card ${absorbed.length === 1 ? 'is' : 'are'} counted as part of ` +
            `it and will stop showing here. Nothing is deleted — they stay in your ` +
            `transactions, and on the bills and receipts they came from.`,
          confirmLabel: 'Update the balance',
          cancelLabel: 'Leave it as it was',
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
        // Stamped whenever a balance is stated, so charges before today are
        // treated as already included rather than counted twice.
        balance_as_of: balance ? toIsoDate(new Date()) : null,
        // The bill day is what recurs, not the specific date picked.
        bill_due_day: dueDate ? dueDate.getDate() : null,
      };

      const cardId =
        editing && id
          ? (await updateCard.mutateAsync({ id, values }), id)
          : (await createCard.mutateAsync(values)).id;

      // A card reminder counts back from its payment day, so it is only
      // written when there is one to count from.
      await applyReminder('card', cardId, dueDate ? choiceToLead(reminder) : null, remindAt);

      success();
      // From the setup walk-in, the story continues on its own page: the
      // bank-account offer, with Skip returning to the checklist. A page
      // rather than a dialog — the dialog read as an interruption, and one
      // raised mid-navigation never showed at all.
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

  // A card's balance is allowed to be zero — that is a real answer, and it is
  // what a new card is at — so step 1 never blocks on it.
  const stepValid = step === 1 ? Boolean(name.trim()) : !busy;

  // "Balance", not "what is on it": the figure can be owed or available, and
  // balance is the one word people already use for both.
  const question =
    step === 0
      ? 'What is the credit card balance right now?'
      : step === 2
        ? 'When is the bill due?'
        : undefined;
  const primaryLabel =
    step < 2 ? 'Continue' : busy ? 'Saving…' : editing ? 'Save changes' : 'Save credit card';
  const stepError = error && error.step === step ? error.message : null;

  return (
    <StepFlow
      title={editing ? 'Edit credit card' : 'Add a credit card'}
      closePrompt={editing ? 'Cancel editing this credit card?' : 'Cancel adding this credit card?'}
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
            accessibilityLabel="Delete this credit card"
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text
              className="font-poppins-medium text-[15px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
              {deleteCard.isPending ? 'Deleting…' : 'Delete card'}
            </Text>
          </Pressable>
        ) : null
      }
    >
      {step === 0 ? <AmountStep value={balance} onChange={setBalance} /> : null}

      {step === 1 ? (
        <View className="w-full gap-6">
          {/* Live preview — the colour picker is otherwise a blind choice, and
              it now carries the balance typed a step ago. */}
          <PaymentCard
            card={{
              id: 'preview',
              holder: name,
              balance: Number(balance) || 0,
              last4,
              network,
              color,
            }}
            placeholderHolder="Name of the credit card"
          />

          <View className="w-full">
            <FieldLabel className="mb-3">Select Network provider</FieldLabel>
            <NetworkPicker networks={NETWORKS} value={network} onChange={setNetwork} />
          </View>

          <TextField
            label="Name of the credit card"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <View className="w-full">
            <FieldLabel className="mb-3">Card colour</FieldLabel>
            <ColorPicker value={color} onChange={setColor} />
          </View>

          <TextField
            label="Last 4 digits"
            value={last4}
            onChangeText={(text) => setLast4(text.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            returnKeyType="done"
          />

          {stepError ? (
            <Text
              className="w-full font-poppins text-[13px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
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
            unavailable={
              dueDate ? null : 'Set a bill due date above and Skip can remind you before it.'
            }
          />
        </View>
      ) : null}
    </StepFlow>
  );
}
