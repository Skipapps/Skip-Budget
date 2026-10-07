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
import { cycleLabel } from '@/components/subscriptions/subscription-row';
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
import { t, type MessageKey } from '@/i18n';
import { planFloor } from '@/lib/card-ledger';
import { success, warn } from '@/lib/haptics';
import { failureMessage, failureText } from '@/lib/failure';
import { logoColumns } from '@/lib/logo-columns';
import { logoDomainOf, type LogoFields } from '@/lib/logo-domain';
import {
  cameFromVoice,
  clearVoiceDraft,
  readSubscriptionPrefill,
  type SubscriptionPrefill,
} from '@/lib/voice-draft';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

const CYCLES = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;

type Cycle = (typeof CYCLES)[number];

const SPEND_CATEGORY_KEYS = new Map<string, MessageKey>([
  ['groceries', 'subscriptions.spendCategory.groceries'],
  ['dining', 'subscriptions.spendCategory.dining'],
  ['fuel', 'subscriptions.spendCategory.fuel'],
  ['pharmacy', 'subscriptions.spendCategory.pharmacy'],
  ['shopping', 'subscriptions.spendCategory.shopping'],
  ['clothing', 'subscriptions.spendCategory.clothing'],
  ['electronics', 'subscriptions.spendCategory.electronics'],
  ['home', 'subscriptions.spendCategory.home'],
  ['beauty', 'subscriptions.spendCategory.beauty'],
  ['pets', 'subscriptions.spendCategory.pets'],
  ['entertainment', 'subscriptions.spendCategory.entertainment'],
  ['software', 'subscriptions.spendCategory.software'],
  ['fitness', 'subscriptions.spendCategory.fitness'],
  ['news', 'subscriptions.spendCategory.news'],
  ['meals', 'subscriptions.spendCategory.meals'],
  ['memberships', 'subscriptions.spendCategory.memberships'],
  ['transport', 'subscriptions.spendCategory.transport'],
  ['utilities', 'subscriptions.spendCategory.utilities'],
  ['telecom', 'subscriptions.spendCategory.telecom'],
  ['insurance', 'subscriptions.spendCategory.insurance'],
  ['finance', 'subscriptions.spendCategory.finance'],
  ['other', 'subscriptions.spendCategory.other'],
]);

/**
 * A spending category as read. The database holds an English label beside each id; the id picks
 * the line, and that label only covers an id this build does not know.
 */
function spendCategoryLabel(id: string, stored: string): string {
  const key = SPEND_CATEGORY_KEYS.get(id);
  return key ? t(key) : stored;
}

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
            title={failureText()}
            actionLabel={t('common.tryAgain')}
            onAction={() => {
              void subscription.refetch();
            }}
            secondaryLabel={t('subscriptions.goBack')}
            onSecondary={() => router.back()}
          />
        </Screen>
      );
    }

    if (!subscription.isFetched) {
      return (
        <StepFlow
          title={t('subscriptions.add.titleEdit')}
          closePrompt={t('subscriptions.add.closeEdit')}
          steps={3}
          current={0}
          onBack={() => router.back()}
          primaryLabel={t('common.continue')}
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
          title={failureText()}
          actionLabel={t('subscriptions.goBack')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const initial: Initial = existing
    ? {
        // No logo choice carried over, so saving the edit leaves the row's own logo alone.
        service: {
          brandId: existing.brand_id,
          name: existing.name,
          domain: logoDomainOf(existing),
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
      saved={existing}
      fromVoice={!id && cameFromVoice(params)}
    />
  );
}

function SubscriptionForm({
  id,
  initial,
  saved = null,
  fromVoice = false,
}: {
  id?: string;
  initial: Initial;
  /** The row being edited, for the logo it already has. */
  saved?: LogoFields | null;
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

  const category = service
    ? categories.find((option) => option.id === service.categoryId)
    : undefined;
  const categoryLabel = service
    ? category
      ? spendCategoryLabel(category.id, category.label)
      : t('subscriptions.spendCategory.other')
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
    const values = { ...built.values, ...logoColumns(service, saved) };

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
        setError({ message: failureText(), step: 2 });
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
      title: t('subscriptions.add.deleteTitle'),
      message: t('subscriptions.add.deleteMessage'),
      confirmLabel: t('common.delete'),
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
    step === 0
      ? t('subscriptions.add.amountQuestion')
      : step === 2
        ? t('subscriptions.add.renewQuestion')
        : undefined;
  const primaryLabel =
    step < 2
      ? t('common.continue')
      : busy
        ? t('subscriptions.add.saving')
        : editing
          ? t('subscriptions.add.saveChanges')
          : t('subscriptions.add.saveSubscription');
  const cycleOptions = CYCLES.map((value) => ({ value, label: cycleLabel(value) }));
  const stepError = error && error.step === step ? error.message : null;

  return (
    <StepFlow
      title={editing ? t('subscriptions.add.titleEdit') : t('subscriptions.addASubscription')}
      closePrompt={editing ? t('subscriptions.add.closeEdit') : t('subscriptions.add.closeNew')}
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
            accessibilityLabel={t('subscriptions.add.deleteA11y')}
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text className="font-app-medium text-[15px] text-danger" maxFontSizeMultiplier={1.4}>
              {deleteSubscription.isPending
                ? t('subscriptions.add.deleting')
                : t('subscriptions.add.deleteSubscription')}
            </Text>
          </Pressable>
        ) : null
      }
    >
      {step === 0 ? <AmountStep value={amount} onChange={setAmount} /> : null}

      {step === 1 ? (
        <View className="w-full gap-6">
          <BrandField
            label={t('subscriptions.field.service')}
            value={service}
            onChange={setService}
            placeholder={t('subscriptions.add.servicePlaceholder')}
          />

          {sources.length > 0 ? (
            <View className="w-full">
              <FieldLabel className="mb-3">{t('subscriptions.field.chargedTo')}</FieldLabel>
              <SourceTiles sources={sources} value={sourceId} onChange={setSourceId} />
            </View>
          ) : null}

          <TextField
            label={t('subscriptions.field.note')}
            optional
            value={note}
            onChangeText={setNote}
            placeholder={t('subscriptions.add.notePlaceholder')}
            multiline
            maxLength={200}
            autoCapitalize="sentences"
          />

          {/* Cancelling keeps the history; only offered on something that already exists. */}
          {editing ? (
            <View className="w-full">
              <FieldLabel className="mb-2">{t('subscriptions.field.status')}</FieldLabel>
              <ChoiceChips
                options={[
                  { value: 'active', label: t('subscriptions.active') },
                  { value: 'cancelled', label: t('subscriptions.cancelled') },
                ]}
                value={active ? 'active' : 'cancelled'}
                onChange={(next) => setActive(next === 'active')}
              />
            </View>
          ) : null}

          {categoryLabel ? (
            <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
              {t('subscriptions.add.filedUnder', { category: categoryLabel })}
            </Text>
          ) : null}

          {stepError ? (
            <Text className="w-full font-app text-[13px] text-danger" maxFontSizeMultiplier={1.4}>
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
            <FieldLabel className="mb-2">{t('subscriptions.field.billingCycle')}</FieldLabel>
            <ChoiceChips options={cycleOptions} value={cycle} onChange={setCycle} />
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
