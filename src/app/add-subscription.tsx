import { router, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  choiceToLead,
  useApplyReminder,
  useReminderChoice,
  type ReminderChoice,
} from '@/api/reminders';
import { useSpendCategories } from '@/api/brands';
import { buildSubscriptionValues } from '@/api/entry-values';
import {
  useCreateSubscription,
  useDeleteSubscription,
  useUpdateSubscription,
} from '@/api/mutations';
import { usePastCharges } from '@/api/past-charges';
import { usePaymentSources, useSubscription } from '@/api/queries';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { AmountStep } from '@/components/flow/amount-step';
import { InlineCalendar } from '@/components/flow/inline-calendar';
import { StepFlow } from '@/components/flow/step-flow';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirm } from '@/providers/dialog-provider';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { ReminderField } from '@/components/ui/reminder-field';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { planFloor } from '@/lib/card-ledger';
import { success, warn } from '@/lib/haptics';
import { FAILURE_MESSAGE, failureMessage } from '@/lib/failure';
import {
  cameFromVoice,
  clearVoiceDraft,
  readSubscriptionPrefill,
  type SubscriptionPrefill,
} from '@/lib/voice-draft';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

const CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

type Cycle = (typeof CYCLES)[number]['value'];

type Initial = {
  service: BrandSelection | null;
  amount: string;
  cycle: Cycle;
  renewsOn: Date | null;
  sourceId: string;
  note: string;
  active: boolean;
  /** yyyy-mm-dd the app counts renewals from today; null for a new one. */
  countsFrom: string | null;
};

const BLANK: Initial = {
  service: null,
  amount: '',
  cycle: 'monthly',
  renewsOn: null,
  sourceId: '',
  note: '',
  active: true,
  countsFrom: null,
};

/** A new subscription, seeded with what the voice review page heard. */
function fromPrefill(prefill: SubscriptionPrefill | null): Initial {
  if (!prefill) return BLANK;
  return {
    ...BLANK,
    service: prefill.service,
    amount: prefill.amount,
    cycle: prefill.cycle ?? BLANK.cycle,
    renewsOn: prefill.renewsOn,
    sourceId: prefill.sourceId,
  };
}

/**
 * Seeds the form by remount (see add-receipt). An edit without its record never opens as a blank
 * form: `id` turns Save into an update, so empty fields would go over a real subscription. Loading,
 * failed and gone each get their own answer; a failed read never becomes a new subscription.
 */
export default function AddSubscriptionScreen() {
  const params = useLocalSearchParams<{ id?: string; from?: string }>();
  const { id } = params;
  const artwork = useArtwork();
  const subscription = useSubscription(id);
  const existing = subscription.data ?? null;

  if (id && !existing) {
    if (subscription.isError) {
      return (
        <Screen showBack>
          <PageState
            art={artwork.error}
            title={FAILURE_MESSAGE}
            actionLabel="Try again"
            onAction={() => {
              void subscription.refetch();
            }}
            secondaryLabel="Go back"
            onSecondary={() => router.back()}
          />
        </Screen>
      );
    }

    if (!subscription.isFetched) {
      return (
        <StepFlow
          title="Edit subscription"
          closePrompt="Cancel editing this subscription?"
          steps={3}
          current={0}
          onBack={() => router.back()}
          primaryLabel="Continue"
          primaryDisabled
          onPrimary={() => {}}
        >
          <View className="w-full gap-6">
            <Skeleton className="h-14 w-full rounded-[12px]" />
            <Skeleton className="h-10 w-2/3 rounded-full" />
            <Skeleton className="h-24 w-full rounded-[12px]" />
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

  const initial: Initial = existing
    ? {
        service: {
          brandId: existing.brand_id,
          name: existing.name,
          domain: existing.brands?.domain ?? null,
          categoryId: existing.category_id,
        },
        amount: String(existing.amount),
        cycle: existing.cycle,
        renewsOn: existing.next_renewal_on
          ? new Date(`${existing.next_renewal_on}T00:00:00`)
          : null,
        sourceId: existing.card_id ?? existing.bank_account_id ?? '',
        note: existing.note ?? '',
        active: existing.active,
        // The same floor the ledger and the recorder use for this row.
        countsFrom: planFloor(existing.started_on, existing.created_at),
      }
    : // Only a new subscription can arrive pre-filled from the voice review page.
      fromPrefill(id ? null : readSubscriptionPrefill(params));

  return (
    <SubscriptionForm
      key={existing?.id ?? 'new'}
      id={id}
      initial={initial}
      fromVoice={!id && cameFromVoice(params)}
    />
  );
}

function SubscriptionForm({
  id,
  initial,
  fromVoice = false,
}: {
  id?: string;
  initial: Initial;
  /** Saved from a voice hand-off: back to Home, never onto the review page again. */
  fromVoice?: boolean;
}) {
  const colors = useColors();
  const editing = Boolean(id);

  const [service, setService] = useState<BrandSelection | null>(initial.service);
  const [amount, setAmount] = useState(initial.amount);
  const [cycle, setCycle] = useState<Cycle>(initial.cycle);
  const [renewsOn, setRenewsOn] = useState<Date | null>(initial.renewsOn);
  const [sourceId, setSourceId] = useState(initial.sourceId);
  const [note, setNote] = useState(initial.note);
  const [active, setActive] = useState(initial.active);

  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ message: string; step: number } | null>(null);

  const { sources } = usePaymentSources();
  const { data: categories = [] } = useSpendCategories();

  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription();
  const pastCharges = usePastCharges('subscription', id);
  const deleteSubscription = useDeleteSubscription();
  const confirm = useConfirm();

  const categoryLabel = service
    ? (categories.find((category) => category.id === service.categoryId)?.label ?? 'Other')
    : null;

  const savedReminder = useReminderChoice('subscription', id);
  const [reminderDraft, setReminderDraft] = useState<ReminderChoice | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const reminder = reminderDraft ?? savedReminder.choice;
  const remindAt = timeDraft ?? savedReminder.remindAt;
  const applyReminder = useApplyReminder();

  const fail = (message: string, atStep: number) => {
    warn();
    setError({ message, step: atStep });
    setStep(atStep);
  };

  const leave = () => {
    if (!fromVoice) {
      router.back();
      return;
    }
    router.dismissTo('/home');
    // Saved, so the person's words do not stay in memory for the next session.
    clearVoiceDraft();
  };

  const handleSave = async () => {
    setError(null);

    // Checks and values live in the shared builder, which the voice review page saves through too.
    // started_on counts from the renewal picked: only ever earlier on an edit, never on or before a
    // renewal already recorded.
    const built = buildSubscriptionValues(
      { service, amount, cycle, renewsOn, sourceId, note, active },
      { sources, lastChargedOn: pastCharges.lastChargedOn, countsFrom: initial.countsFrom },
    );
    if (!built.ok) {
      fail(built.message, built.field === 'service' ? 1 : 0);
      return;
    }
    const { values } = built;

    try {
      // What a recorded renewal copies from the subscription.
      const carried = {
        label: values.name || 'Subscription',
        amount: values.amount,
        card_id: values.card_id,
        bank_account_id: values.bank_account_id,
      };
      const changed =
        editing &&
        (carried.label !== (initial.service?.name || 'Subscription') ||
          carried.amount !== Number(initial.amount) ||
          (carried.card_id ?? carried.bank_account_id ?? '') !== initial.sourceId);

      // Asked before anything is written, so backing out leaves it as it was.
      if (!pastCharges.ready) {
        pastCharges.retry();
        warn();
        setError({ message: FAILURE_MESSAGE, step: 2 });
        return;
      }

      const scope = await pastCharges.choose(carried.label, changed);
      if (scope === null) return;

      const subscriptionId =
        editing && id
          ? (await updateSubscription.mutateAsync({ id, values }), id)
          : (await createSubscription.mutateAsync(values)).id;

      if (scope === 'all') await pastCharges.apply(carried);

      // After the row exists, because a reminder points at one.
      await applyReminder('subscription', subscriptionId, choiceToLead(reminder), remindAt);
      success();
      leave();
    } catch (thrown) {
      warn();
      setError({
        message: failureMessage(thrown),
        step: 2,
      });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Delete this subscription?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteSubscription.mutateAsync(id);
      router.back();
    } catch (thrown) {
      setError({
        message: failureMessage(thrown),
        step,
      });
    }
  };

  const busy = createSubscription.isPending || updateSubscription.isPending || pastCharges.saving;

  const value = Number(amount);
  const amountReady = Number.isFinite(value) && value > 0;
  const stepValid = step === 0 ? amountReady : step === 1 ? Boolean(service) : !busy;

  const question =
    step === 0 ? 'How much does it cost?' : step === 2 ? 'When does it renew?' : undefined;
  const primaryLabel =
    step < 2 ? 'Continue' : busy ? 'Saving…' : editing ? 'Save changes' : 'Save subscription';
  const stepError = error && error.step === step ? error.message : null;

  return (
    <StepFlow
      title={editing ? 'Edit subscription' : 'Add a subscription'}
      closePrompt={
        editing ? 'Cancel editing this subscription?' : 'Cancel adding this subscription?'
      }
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
            accessibilityLabel="Delete this subscription"
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text
              className="font-poppins-medium text-[15px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
              {deleteSubscription.isPending ? 'Deleting…' : 'Delete subscription'}
            </Text>
          </Pressable>
        ) : null
      }
    >
      {step === 0 ? <AmountStep value={amount} onChange={setAmount} /> : null}

      {step === 1 ? (
        <View className="w-full gap-6">
          <BrandField
            label="Service"
            value={service}
            onChange={setService}
            placeholder="Search for a service"
          />

          {sources.length > 0 ? (
            <View className="w-full">
              <FieldLabel className="mb-3">Charged to</FieldLabel>
              <SourceTiles sources={sources} value={sourceId} onChange={setSourceId} />
            </View>
          ) : null}

          <TextField
            label="Note"
            optional
            value={note}
            onChangeText={setNote}
            placeholder="Which plan, for example"
            multiline
            maxLength={200}
            autoCapitalize="sentences"
          />

          {/* Cancelling keeps the history; only offered on something that already exists. */}
          {editing ? (
            <View className="w-full">
              <FieldLabel className="mb-2">Status</FieldLabel>
              <ChoiceChips
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                value={active ? 'active' : 'cancelled'}
                onChange={(next) => setActive(next === 'active')}
              />
            </View>
          ) : null}

          {categoryLabel ? (
            <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
              Filed under {categoryLabel}
            </Text>
          ) : null}

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
          {/* Optional: many know the cost but not the renewal date, so nothing is pre-selected. */}
          <InlineCalendar value={renewsOn} onChange={setRenewsOn} />

          <View className="w-full">
            <FieldLabel className="mb-2">Billing cycle</FieldLabel>
            <ChoiceChips options={CYCLES} value={cycle} onChange={setCycle} />
          </View>

          <ReminderField
            kind="subscription"
            value={reminder}
            onChange={setReminderDraft}
            time={remindAt}
            onTimeChange={setTimeDraft}
          />
        </View>
      ) : null}
    </StepFlow>
  );
}
