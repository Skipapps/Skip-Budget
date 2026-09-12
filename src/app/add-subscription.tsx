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
import {
  useCreateSubscription,
  useDeleteSubscription,
  useUpdateSubscription,
} from '@/api/mutations';
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
import { toIsoDate } from '@/lib/date';
import { success, warn } from '@/lib/haptics';
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
};

const BLANK: Initial = {
  service: null,
  amount: '',
  cycle: 'monthly',
  renewsOn: null,
  sourceId: '',
  note: '',
  active: true,
};

/**
 * Loads the row, then seeds the form by remount — see add-receipt for why.
 *
 * An edit that has not got its record never opens as a blank form: `id` is what
 * turns Save into an update, so the empty fields would go straight over a real
 * subscription. Loading, failed and gone each get their own answer, and a
 * failed read is never allowed to become a new subscription instead.
 */
export default function AddSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const artwork = useArtwork();
  const subscription = useSubscription(id);
  const existing = subscription.data ?? null;

  if (id && !existing) {
    if (subscription.isError) {
      return (
        <Screen showBack>
          <PageState
            art={artwork.error}
            title="Could not open this subscription"
            message="Check your connection and try again. Nothing about it has changed."
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
          steps={3}
          current={1}
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
          title="That subscription is not here"
          message="It may have been deleted. Nothing has been changed."
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
      }
    : BLANK;

  return <SubscriptionForm key={existing?.id ?? 'new'} id={id} initial={initial} />;
}

function SubscriptionForm({ id, initial }: { id?: string; initial: Initial }) {
  const colors = useColors();
  const editing = Boolean(id);

  const [service, setService] = useState<BrandSelection | null>(initial.service);
  const [amount, setAmount] = useState(initial.amount);
  const [cycle, setCycle] = useState<Cycle>(initial.cycle);
  const [renewsOn, setRenewsOn] = useState<Date | null>(initial.renewsOn);
  const [sourceId, setSourceId] = useState(initial.sourceId);
  const [note, setNote] = useState(initial.note);
  const [active, setActive] = useState(initial.active);

  // Editing opens on the details, not the keypad.
  const [step, setStep] = useState(editing ? 1 : 0);
  const [error, setError] = useState<{ message: string; step: number } | null>(null);

  const { sources } = usePaymentSources();
  const { data: categories = [] } = useSpendCategories();

  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription();
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

  /** A check for a field on an earlier step sends you back to that step. */
  const fail = (message: string, atStep: number) => {
    warn();
    setError({ message, step: atStep });
    setStep(atStep);
  };

  const handleSave = async () => {
    setError(null);

    if (!service) {
      fail('Pick a service first.', 1);
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      fail('Enter what it costs.', 0);
      return;
    }

    const chosen = sources.find((source) => source.id === sourceId);
    const values = {
      brand_id: service.brandId,
      name: service.name,
      amount: value,
      cycle,
      // Optional: plenty of people know the cost but not the renewal date,
      // and refusing to save over that would be the wrong trade.
      next_renewal_on: renewsOn ? toIsoDate(renewsOn) : null,
      category_id: service.categoryId || 'other',
      card_id: chosen?.kind === 'card' ? chosen.id : null,
      bank_account_id: chosen?.kind === 'account' ? chosen.id : null,
      note: note.trim() || null,
      active,
    };

    try {
      const subscriptionId =
        editing && id
          ? (await updateSubscription.mutateAsync({ id, values }), id)
          : (await createSubscription.mutateAsync(values)).id;

      // After the row exists, because a reminder points at one.
      await applyReminder('subscription', subscriptionId, choiceToLead(reminder), remindAt);
      success();
      router.back();
    } catch (thrown) {
      warn();
      setError({
        message: (thrown as Error).message ?? 'Could not save that subscription.',
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
        message: (thrown as Error).message ?? 'Could not delete that subscription.',
        step,
      });
    }
  };

  const busy = createSubscription.isPending || updateSubscription.isPending;

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

          {/* Cancelling keeps the history. Only offered on something that
              already exists — nobody adds a subscription as cancelled. */}
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
          {/* Optional: plenty of people know the cost but not the renewal date,
              so nothing here is pre-selected and nothing insists. */}
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
