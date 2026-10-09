import { router, useLocalSearchParams } from 'expo-router';
import { AlignLeft, CircleCheck, RefreshCw, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  choiceToLead,
  useApplyReminder,
  useReminderChoice,
  type ReminderChoice,
} from '@/api/reminders';
import { guessCategory, useSpendCategories } from '@/api/brands';
import { buildSubscriptionValues } from '@/api/entry-values';
import {
  useCreateSubscription,
  useDeleteSubscription,
  useUpdateSubscription,
} from '@/api/mutations';
import { usePastCharges } from '@/api/past-charges';
import { usePaymentSources, useSubscription } from '@/api/queries';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { DateBox } from '@/components/entry/date-box';
import { AmountEditPage, NoteEditPage } from '@/components/entry/edit-pages';
import {
  EntryReview,
  GlyphWell,
  SegmentedChips,
  type EntryRowSpec,
} from '@/components/entry/entry-review';
import { AmountStep } from '@/components/flow/amount-step';
import { cycleLabel } from '@/components/subscriptions/subscription-row';
import { StepFlow } from '@/components/flow/step-flow';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { ReminderField } from '@/components/ui/reminder-field';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceTiles } from '@/components/ui/source-tiles';
import { FieldLabel } from '@/components/ui/typography';
import { useConfirm } from '@/providers/dialog-provider';
import { t, type MessageKey } from '@/i18n';
import { logoColumns } from '@/lib/logo-columns';
import { useToday } from '@/lib/use-today';
import { TEXT_CAP } from '@/theme/text-scale';
import { planFloor } from '@/lib/card-ledger';
import { success, warn } from '@/lib/haptics';
import { failureMessage, failureText } from '@/lib/failure';
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

/** The pages of one subscription: the keypad it starts on, the final page, and the note's. */
type Page = 'amount' | 'review' | 'amountEdit' | 'note';

type Initial = {
  service: BrandSelection | null;
  amount: string;
  cycle: Cycle;
  renewsOn: Date | null;
  /** '' is Skip, picked on purpose; null is not answered yet. A saved subscription has answered. */
  sourceId: string | null;
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
  sourceId: null,
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
    sourceId: prefill.sourceId || null,
    note: prefill.note,
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
          steps={1}
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
      // An edit, or what the voice review page heard, opens on the final page; only a blank one
      // starts at the amount.
      initialView={existing || (!id && cameFromVoice(params)) ? 'review' : 'amount'}
      fromVoice={!id && cameFromVoice(params)}
    />
  );
}

function SubscriptionForm({
  id,
  initial,
  saved = null,
  initialView,
  fromVoice = false,
}: {
  id?: string;
  initial: Initial;
  /** The row being edited, for the logo it already has. */
  saved?: LogoFields | null;
  initialView: 'amount' | 'review';
  /** Saved from a voice hand-off: back to Home, never onto the review page again. */
  fromVoice?: boolean;
}) {
  const colors = useColors();
  const editing = Boolean(id);

  const [service, setService] = useState<BrandSelection | null>(initial.service);
  // Typed but not picked from the list: it names the subscription all the same.
  const [typedService, setTypedService] = useState('');
  const [amount, setAmount] = useState(initial.amount);
  const [cycle, setCycle] = useState<Cycle>(initial.cycle);
  const [renewsOn, setRenewsOn] = useState<Date | null>(initial.renewsOn);
  const [sourceId, setSourceId] = useState(initial.sourceId);
  const [note, setNote] = useState(initial.note);
  const [active, setActive] = useState(initial.active);

  // Pages over one piece of state, never routes, so Back keeps everything filled in. The final
  // page is `review`; each line of it opens a page for that one thing and returns here.
  const [view, setView] = useState<Page>(initialView);
  // Outlives the review page while a row's own page is open, so coming back lands where it was.
  const [reviewY, setReviewY] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { todayDate } = useToday();

  const { sources } = usePaymentSources();
  const { data: categories = [] } = useSpendCategories();

  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription();
  const pastCharges = usePastCharges('subscription', id);
  const deleteSubscription = useDeleteSubscription();
  const confirm = useConfirm();

  const savedReminder = useReminderChoice('subscription', id);
  const [reminderDraft, setReminderDraft] = useState<ReminderChoice | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  // A new subscription has no answer until one is picked; "No reminder" is an answer.
  const reminder: ReminderChoice | null = reminderDraft ?? (editing ? savedReminder.choice : null);
  const remindAt = timeDraft ?? savedReminder.remindAt;
  const applyReminder = useApplyReminder();

  const value = Number(amount);
  const amountReady = Number.isFinite(value) && value > 0;

  const fail = (message: string) => {
    warn();
    setError(message);
    setView('review');
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
    const typed = typedService.trim();
    const chosen: BrandSelection | null =
      service ??
      (typed
        ? // Keyword guess, as the box's own "Add" row files a new service. No logo: one replaced by
          // typing must not keep the old one's.
          {
            brandId: null,
            name: typed,
            domain: null,
            categoryId: guessCategory(typed),
            logoDomain: null,
            logoHidden: false,
          }
        : null);
    const missing = [
      !amountReady && t('receipts.field.amount'),
      !chosen && t('subscriptions.field.service'),
      !renewsOn && t('subscriptions.detail.nextRenewal'),
      sourceId === null && t('subscriptions.field.chargedTo'),
      reminder === null && t('ui.reminder.label'),
    ].filter((field): field is string => Boolean(field));
    if (missing.length > 0 || sourceId === null || reminder === null) {
      fail(t('subscriptions.add.missing', { fields: missing.join(', ') }));
      return;
    }

    // Checks and values live in the shared builder, which the voice review page saves through too.
    // started_on counts from the renewal picked: only ever earlier on an edit, never on or before a
    // renewal already recorded.
    const built = buildSubscriptionValues(
      { service: chosen, amount, cycle, renewsOn, sourceId, note, active },
      { sources, lastChargedOn: pastCharges.lastChargedOn, countsFrom: initial.countsFrom },
    );
    if (!built.ok) {
      fail(built.message);
      return;
    }
    const values = { ...built.values, ...logoColumns(chosen, saved) };

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
          (carried.card_id ?? carried.bank_account_id ?? '') !== (initial.sourceId ?? ''));

      // Asked before anything is written, so backing out leaves it as it was.
      if (!pastCharges.ready) {
        pastCharges.retry();
        warn();
        setError(failureText());
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
      setError(failureMessage(thrown));
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
      setError(failureMessage(thrown));
    }
  };

  const busy = createSubscription.isPending || updateSubscription.isPending || pastCharges.saving;
  // The page this form opened on. Anywhere else the edge swipe is off, and Back steps back.
  const isRoot = view === initialView;

  const title = editing ? t('subscriptions.add.titleEdit') : t('subscriptions.addASubscription');
  const closePrompt = editing ? t('subscriptions.add.closeEdit') : t('subscriptions.add.closeNew');
  const toReview = () => setView('review');
  // A line that came from Save names what was wrong with the page as it was: once something there
  // is kept, it no longer applies.
  const settle = () => {
    setError(null);
    toReview();
  };

  if (view === 'amountEdit') {
    return (
      <AmountEditPage
        title={t('receipts.field.amount')}
        question={t('subscriptions.add.amountQuestion')}
        value={amount}
        onBack={toReview}
        onDone={(next) => {
          setAmount(next);
          settle();
        }}
      />
    );
  }

  if (view === 'note') {
    return (
      <NoteEditPage
        title={t('subscriptions.field.note')}
        label={t('subscriptions.field.note')}
        placeholder={t('subscriptions.add.notePlaceholder')}
        value={note}
        onBack={toReview}
        onDone={(next) => {
          setNote(next);
          settle();
        }}
      />
    );
  }

  if (view === 'amount') {
    return (
      <StepFlow
        title={title}
        closePrompt={closePrompt}
        steps={1}
        current={0}
        onBack={() => router.back()}
        question={t('subscriptions.add.amountQuestion')}
        primaryLabel={t('common.continue')}
        primaryDisabled={!amountReady}
        onPrimary={() => {
          settle();
        }}
        error={error}
      >
        <AmountStep value={amount} onChange={setAmount} />
      </StepFlow>
    );
  }

  const filedUnderLabel = (categoryId: string) => {
    const known = categories.find((option) => option.id === categoryId);
    return known
      ? spendCategoryLabel(known.id, known.label)
      : t('subscriptions.spendCategory.other');
  };

  const rows: EntryRowSpec[] = [
    {
      key: 'service',
      field: (
        <>
          <BrandField
            label={t('subscriptions.field.service')}
            value={service}
            onChange={(next) => {
              setError(null);
              setService(next);
            }}
            // The box is drawn afresh after another page; what was typed comes back with it.
            initialQuery={typedService}
            onQueryChange={(typed) => {
              setError(null);
              setTypedService(typed);
            }}
            placeholder={t('subscriptions.add.servicePlaceholder')}
            changeLabel={(name) => t('subscriptions.add.changeService', { name })}
            addLabel={(name) => t('subscriptions.add.addServiceAs', { name })}
          />
          {service ? (
            <Text
              className="mt-3 w-full font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {t('subscriptions.add.filedUnder', {
                category: filedUnderLabel(service.categoryId),
              })}
            </Text>
          ) : null}
        </>
      ),
    },
    {
      key: 'cycle',
      label: t('subscriptions.field.billingCycle'),
      value: cycleLabel(cycle),
      leading: <GlyphWell icon={RefreshCw} />,
      below: (
        <SegmentedChips
          variant="pills"
          options={CYCLES.map((option) => ({
            key: option,
            label: cycleLabel(option),
            selected: option === cycle,
            onPress: () => {
              setError(null);
              setCycle(option);
            },
          }))}
        />
      ),
    },
    {
      key: 'renewal',
      field: (
        <DateBox
          label={t('subscriptions.detail.nextRenewal')}
          value={renewsOn}
          today={todayDate}
          placeholder={t('subscriptions.add.pickDay')}
          onChange={(day) => {
            setError(null);
            setRenewsOn(day);
          }}
        />
      ),
    },
    {
      key: 'paidWith',
      field: (
        <View className="w-full">
          <FieldLabel className="mb-2">{t('subscriptions.field.chargedTo')}</FieldLabel>
          <SourceTiles
            sources={sources}
            value={sourceId ?? ''}
            onChange={(next) => {
              setError(null);
              setSourceId(next);
            }}
            skip={{
              label: t('subscriptions.add.skipSource'),
              selected: sourceId === '',
              onPress: () => {
                setError(null);
                setSourceId('');
              },
            }}
          />
        </View>
      ),
    },
    {
      key: 'reminder',
      field: (
        <ReminderField
          kind="subscription"
          value={reminder}
          onChange={(choice) => {
            setError(null);
            setReminderDraft(choice);
          }}
          time={remindAt}
          onTimeChange={(at) => {
            setError(null);
            setTimeDraft(at);
          }}
          offLabel={t('subscriptions.add.noReminder')}
        />
      ),
    },
    {
      key: 'note',
      label: t('subscriptions.field.note'),
      value: note.trim() || null,
      placeholder: t('entry.addNote'),
      leading: <GlyphWell icon={AlignLeft} />,
      onPress: () => setView('note'),
    },
    // Cancelling keeps the history; only offered on something that already exists.
    ...(editing
      ? [
          {
            key: 'status',
            label: t('subscriptions.field.status'),
            value: active ? t('subscriptions.active') : t('subscriptions.cancelled'),
            leading: <GlyphWell icon={CircleCheck} />,
            below: (
              <SegmentedChips
                options={[
                  {
                    key: 'active',
                    label: t('subscriptions.active'),
                    selected: active,
                    onPress: () => {
                      setError(null);
                      setActive(true);
                    },
                  },
                  {
                    key: 'cancelled',
                    label: t('subscriptions.cancelled'),
                    selected: !active,
                    onPress: () => {
                      setError(null);
                      setActive(false);
                    },
                  },
                ]}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <EntryReview
      scrollPlace={{ y: reviewY, keep: setReviewY }}
      title={title}
      closePrompt={closePrompt}
      root={isRoot}
      onBack={() => {
        if (isRoot) {
          router.back();
          return;
        }
        // A failed save's line belongs to the final page, not the keypad it steps back to.
        setError(null);
        setView('amount');
      }}
      amountLabel={t('receipts.field.amount')}
      amount={amount}
      onEditAmount={() => setView('amountEdit')}
      rows={rows}
      primaryLabel={
        busy
          ? t('subscriptions.add.saving')
          : editing
            ? t('subscriptions.add.saveChanges')
            : t('subscriptions.add.saveSubscription')
      }
      // Never greyed out for a gap: Save says what is still missing.
      primaryDisabled={busy}
      onPrimary={() => void handleSave()}
      error={error}
      footerSlot={
        editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('subscriptions.add.deleteA11y')}
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text
              className="font-app-medium text-[15px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {deleteSubscription.isPending
                ? t('subscriptions.add.deleting')
                : t('subscriptions.add.deleteSubscription')}
            </Text>
          </Pressable>
        ) : null
      }
    />
  );
}
