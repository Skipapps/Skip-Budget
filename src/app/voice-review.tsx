import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Pencil } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';

import { useBrandDirectory } from '@/api/brands';
import {
  buildBillValues,
  buildReceiptValues,
  buildSubscriptionValues,
  type SourceRef,
} from '@/api/entry-values';
import {
  useCreateBill,
  useCreateReceipt,
  useCreateSubscription,
  type BillValues,
  type ReceiptValues,
  type SubscriptionValues,
} from '@/api/mutations';
import { usePaymentSources } from '@/api/queries';
import { useLearnVoiceAlias, useVoiceAliases } from '@/api/voice-aliases';
import { BillMark } from '@/components/bills/bill-mark';
import { BrandLogo } from '@/components/brands/brand-logo';
import { AmountFigure } from '@/components/flow/amount-figure';
import { FlowHeader } from '@/components/flow/step-flow';
import { useProGate } from '@/components/pro/pro-gate';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Screen } from '@/components/ui/screen';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextLink } from '@/components/ui/text-link';
import { FieldLabel } from '@/components/ui/typography';
import { GlyphWell, ReviewRow } from '@/components/voice/review-row';
import { StaleDraft } from '@/components/voice/stale-draft';
import { BILL_CATEGORIES, RECURRENCES } from '@/data/bills-mock';
import { formatRelativeDay } from '@/lib/date';
import { FAILURE_MESSAGE, failureMessage } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { success, warn } from '@/lib/haptics';
import { useToday } from '@/lib/use-today';
import { parseVoice, type VoiceCycle, type VoiceDraft, type VoiceKind } from '@/lib/voice';
import {
  amountFromText,
  amountText,
  clearVoiceDraft,
  entryToBillInput,
  entryToForm,
  entryToReceiptInput,
  entryToSubscriptionInput,
  rederiveVoiceEntry,
  updateVoiceEntry,
  useVoiceSession,
  voiceBillName,
  voiceSaveBlocker,
  type VoiceEntry,
  type VoiceSession,
} from '@/lib/voice-draft';
import { useConfirm } from '@/providers/dialog-provider';
import { useColors } from '@/providers/theme-provider';

const KIND_COPY: Record<
  VoiceKind,
  {
    title: string;
    closePrompt: string;
    save: string;
    merchant: string;
    date: string;
    paidWith: string;
  }
> = {
  receipt: {
    title: 'Add a receipt',
    closePrompt: 'Cancel adding this receipt?',
    save: 'Save receipt',
    merchant: 'Store',
    date: 'Bought on',
    paidWith: 'Paid with',
  },
  bill: {
    title: 'Add a bill',
    closePrompt: 'Cancel adding this bill?',
    save: 'Save bill',
    merchant: 'Name',
    date: 'Due on',
    paidWith: 'Paid with',
  },
  subscription: {
    title: 'Add a subscription',
    closePrompt: 'Cancel adding this subscription?',
    save: 'Save subscription',
    merchant: 'Service',
    date: 'Renews on',
    paidWith: 'Charged to',
  },
};

const KIND_OPTIONS = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'bill', label: 'Bill' },
  { value: 'subscription', label: 'Subscription' },
] as const;

/** add-subscription's own billing cycles, word for word. */
const SUBSCRIPTION_CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

type EditField = 'amount' | 'merchant' | 'date' | 'category';

/**
 * "Is this right?": what Skip heard, before anything is saved. Saves through the same value
 * builders the add forms use, so voice cannot drift from the forms' rules. Nothing is written until
 * Save and nothing is guessed (an ambiguous amount has to be picked); "More options" opens the full
 * form with the edited values in it.
 */
export default function VoiceReviewScreen() {
  const gate = useProGate('voice');
  if (gate) return gate;
  return <VoiceReviewInner />;
}

function VoiceReviewInner() {
  const { draft: draftId } = useLocalSearchParams<{ draft?: string }>();
  const live = useVoiceSession(draftId);

  // Saving or discarding empties the slot while this page is still sliding out; keep what it last
  // showed instead of flashing "Nothing to check yet".
  const [kept, setKept] = useState<VoiceSession | null>(live);
  if (live && live !== kept) setKept(live);
  const [leaving, setLeaving] = useState(false);
  const session = live ?? (leaving ? kept : null);

  if (!session) return <StaleDraft />;
  return <Review session={session} onLeave={() => setLeaving(true)} />;
}

function Review({ session, onLeave }: { session: VoiceSession; onLeave: () => void }) {
  const colors = useColors();
  const confirm = useConfirm();
  const { today, todayDate } = useToday();
  const { sources } = usePaymentSources();
  const directory = useBrandDirectory();
  const { aliases } = useVoiceAliases();
  const learnAlias = useLearnVoiceAlias();

  const createReceipt = useCreateReceipt();
  const createBill = useCreateBill();
  const createSubscription = useCreateSubscription();

  const { id, draft, entry, touched, edited } = session;
  const kind = entry.kind;
  const copy = KIND_COPY[kind];
  const category = BILL_CATEGORIES.find((option) => option.id === entry.billCategoryId) ?? null;
  const categoryLabel = category?.label ?? '';

  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // Two taps inside one frame both land before the button re-renders as disabled; this is what
  // makes one tap one row.
  const busy = useRef(false);

  // Once anything has been changed, the edge swipe would throw it away without a word, so it is
  // off and back asks first (StepFlow's rule).
  const screenOptions = useMemo(() => ({ gestureEnabled: !edited }), [edited]);

  // The question is what VoiceOver lands on, so the page says what it asks.
  const questionRef = useRef<ComponentRef<typeof Text>>(null);
  useEffect(() => {
    if (questionRef.current) AccessibilityInfo.sendAccessibilityEvent(questionRef.current, 'focus');
  }, []);

  const sourceRefs: SourceRef[] = sources;
  const blocker = voiceSaveBlocker(entry);
  const built = blocker ? null : buildFor(entry, { todayDate, categoryLabel, sources: sourceRefs });
  const hint = blocker ?? (built && !built.ok ? built.message : null);

  // One move at a time: a fast double tap on a row, "More options" or back would push two pages or,
  // since `router.back()` is a global "go back", pop this page and the mic page under it. Coming
  // back here reopens the door.
  const moving = useRef(false);
  useFocusEffect(
    useCallback(() => {
      moving.current = false;
    }, []),
  );
  const go = (move: () => void) => {
    if (moving.current) return;
    moving.current = true;
    move();
  };

  const edit = (field: EditField) =>
    go(() => router.push({ pathname: '/voice-edit', params: { draft: id, field } }));

  const askToDiscard = () =>
    confirm({
      title: copy.closePrompt,
      message: 'Nothing you have entered here will be saved.',
      confirmLabel: 'Yes',
      cancelLabel: 'Go back',
      destructive: true,
    });

  const discard = () => {
    onLeave();
    clearVoiceDraft();
  };

  const handleBack = async () => {
    if (edited && !(await askToDiscard())) return;
    go(() => {
      if (edited) discard();
      router.back();
    });
  };

  const handleSayAgain = async () => {
    if (edited && !(await askToDiscard())) return;
    go(() => {
      if (edited) discard();
      router.dismissTo('/voice');
    });
  };

  /**
   * A different kind reads the same words again for it: a receipt's "on the 5th" is the last 5th,
   * a bill's the next one. Whatever was changed by hand stays as it was.
   */
  const changeKind = (next: VoiceKind) => {
    if (next === kind) return;
    updateVoiceEntry(id, { kind: next });
    const words = session.alternatives.length ? [...session.alternatives] : [draft.transcript];
    rederiveVoiceEntry(
      id,
      parseVoice(words, { today, directory: directory.data ?? [], aliases, forceKind: next }),
    );
  };

  const save = async () => {
    if (busy.current || !built?.ok) return;
    busy.current = true;
    setSaving(true);
    setFailed(false);
    try {
      if (built.kind === 'receipt') await createReceipt.mutateAsync(built.values);
      else if (built.kind === 'bill') await createBill.mutateAsync(built.values);
      else await createSubscription.mutateAsync(built.values);

      success();
      // Taught only now, and only when the person put a different name on what was heard: "spot a
      // fly" saved as Spotify.
      const lesson = lessonFrom(draft, entry, touched);
      // Best-effort and never rejects: a lost lesson is learned next time.
      if (lesson) void learnAlias(lesson.heard, lesson.canonical);
      discard();
      router.dismissTo('/home');
      // `busy` stays set: the page is leaving, and nothing on it may save again.
    } catch (thrown) {
      failureMessage(thrown);
      warn();
      setFailed(true);
      setSaving(false);
      busy.current = false;
    }
  };

  const ambiguous = entry.amount === null && entry.amountChoices.length >= 2;
  const dateValue = entry.date
    ? formatRelativeDay(entry.date, today)
    : // A receipt with no day is bought today, the form's own default.
      kind === 'receipt'
      ? formatRelativeDay(today, today)
      : null;
  const merchantValue =
    kind === 'bill' ? voiceBillName(entry, categoryLabel) || null : (entry.merchant?.name ?? null);

  const footer = (
    <View className="w-full gap-2">
      {failed ? (
        <Text
          className="w-full text-center font-poppins text-[13px] text-danger"
          maxFontSizeMultiplier={1.4}
        >
          {FAILURE_MESSAGE}
        </Text>
      ) : hint ? (
        <Text
          className="w-full text-center font-poppins text-[13px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {hint}
        </Text>
      ) : null}

      <Button
        label={saving ? 'Saving…' : copy.save}
        onPress={() => void save()}
        disabled={saving || !built?.ok}
        accessibilityHint={hint ?? undefined}
      />

      <View className="w-full flex-row flex-wrap justify-center gap-x-8">
        <TextLink label="Say it again" variant="subtle" onPress={() => void handleSayAgain()} />
        <TextLink
          label="More options"
          variant="subtle"
          accessibilityHint="Opens the full form with what Skip heard filled in."
          onPress={() => go(() => router.push(entryToForm(entry)))}
        />
      </View>
    </View>
  );

  return (
    <Screen
      header={
        <View className="w-full pb-2">
          <FlowHeader
            title={copy.title}
            onBack={() => void handleBack()}
            closePrompt={copy.closePrompt}
            onClose={() =>
              go(() => {
                discard();
                router.dismissTo('/home');
              })
            }
          />
        </View>
      }
      footer={footer}
    >
      <Stack.Screen options={screenOptions} />

      <Text
        ref={questionRef}
        accessibilityRole="header"
        className="mt-6 w-full text-center font-poppins text-[20px] text-muted"
        numberOfLines={2}
        maxFontSizeMultiplier={1.3}
      >
        {draft.confidence === 'low' ? 'Did Skip hear you right?' : 'Is this right?'}
      </Text>

      <View
        accessible
        accessibilityLabel={`You said: ${draft.transcript}`}
        className="mt-4 w-full rounded-[16px] bg-ink/5 px-4 py-3"
      >
        <Text className="font-poppins-medium text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          You said
        </Text>
        <Text
          className="mt-1 font-poppins text-[15px] leading-6 text-ink"
          maxFontSizeMultiplier={1.6}
        >
          “{draft.transcript}”
        </Text>
      </View>

      <FieldLabel className="mt-6 w-full">Add as</FieldLabel>
      <View className="mt-2 w-full">
        <ChoiceChips options={KIND_OPTIONS} value={kind} onChange={changeKind} />
      </View>
      {!draft.kindSure && !touched.includes('kind') ? (
        <Text
          className="mt-2 w-full font-poppins text-[13px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          Skip guessed this one. Pick another if it’s wrong.
        </Text>
      ) : null}

      <View className="mt-6 w-full">
        {ambiguous ? (
          <View className="w-full rounded-[16px] bg-accent/10 p-4">
            <Text
              accessibilityRole="header"
              className="font-poppins-semibold text-[15px] text-ink"
              maxFontSizeMultiplier={1.3}
            >
              Which amount did you mean?
            </Text>
            <View className="mt-3 w-full">
              {/* Nothing selected: the parser could not tell, so nor does the page. */}
              <ChoiceChips
                options={entry.amountChoices.map((choice) => ({
                  value: amountText(choice),
                  label: formatCurrency(choice),
                }))}
                value=""
                onChange={(picked) => {
                  const amount = amountFromText(picked);
                  if (amount !== null) updateVoiceEntry(id, { amount });
                }}
              />
            </View>
            <TextLink
              label="Neither, I’ll type it"
              variant="subtle"
              className="mt-1 items-start"
              onPress={() => edit('amount')}
            />
          </View>
        ) : entry.amount === null ? (
          // Never $0: a zero for an amount nobody said is a false figure.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Amount, not heard"
            accessibilityHint="Needed to save. Opens the amount to add it."
            onPress={() => edit('amount')}
            className="min-h-[112px] w-full items-center justify-center rounded-[16px] bg-accent/10 px-4 active:opacity-80"
          >
            {/* Ink on the tint: accent ink on accent/10 measured under 4.5:1. */}
            <Text
              className="text-center font-poppins-medium text-[17px] text-ink"
              maxFontSizeMultiplier={1.3}
            >
              Tap to add the amount
            </Text>
            <Text
              className="mt-1 text-center font-poppins text-[13px] text-muted"
              maxFontSizeMultiplier={1.4}
            >
              Skip didn’t catch how much.
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Amount, ${formatCurrency(entry.amount)}`}
            accessibilityHint="Opens the amount to change it."
            onPress={() => edit('amount')}
            className="w-full items-center rounded-[16px] py-4 active:bg-ink/5"
          >
            <AmountFigure value={amountText(entry.amount)} />
            <View className="mt-3 min-h-8 flex-row items-center gap-1.5 rounded-full bg-ink/5 px-3.5">
              <Pencil size={14} color={colors.ink} strokeWidth={1.8} />
              <Text
                className="font-poppins-medium text-[13px] text-ink"
                maxFontSizeMultiplier={1.2}
              >
                Change
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      <View className="mt-6 w-full overflow-hidden rounded-[16px] border border-line bg-card py-1">
        <ReviewRow
          label={copy.merchant}
          value={merchantValue}
          required
          leading={
            kind === 'bill' && !entry.merchant ? (
              <BillMark categoryId={entry.billCategoryId} size={40} />
            ) : (
              <BrandLogo
                name={entry.merchant?.name ?? merchantValue ?? ''}
                domain={entry.merchant?.domain}
                size={40}
              />
            )
          }
          onPress={() => edit('merchant')}
        />

        {kind === 'bill' ? (
          <>
            <View className="ml-[52px] h-px bg-line/60" />
            <ReviewRow
              label="Category"
              value={category ? category.label : null}
              required
              leading={category ? <GlyphWell icon={category.icon} /> : null}
              onPress={() => edit('category')}
            />
          </>
        ) : null}

        <View className="ml-[52px] h-px bg-line/60" />
        <ReviewRow
          label={copy.date}
          value={dateValue}
          required={kind !== 'subscription'}
          leading={<GlyphWell icon={CalendarDays} />}
          onPress={() => edit('date')}
        />
      </View>

      {kind === 'bill' ? (
        <>
          <FieldLabel className="mt-6 w-full">Recurring</FieldLabel>
          <View className="mt-2 w-full">
            <ChoiceChips
              options={RECURRENCES}
              value={entry.cycle ?? 'monthly'}
              onChange={(cycle: VoiceCycle) => updateVoiceEntry(id, { cycle })}
            />
          </View>
        </>
      ) : kind === 'subscription' ? (
        <>
          <FieldLabel className="mt-6 w-full">Billing cycle</FieldLabel>
          <View className="mt-2 w-full">
            <ChoiceChips
              options={SUBSCRIPTION_CYCLES}
              value={entry.cycle ?? 'monthly'}
              onChange={(cycle: VoiceCycle) => updateVoiceEntry(id, { cycle })}
            />
          </View>
        </>
      ) : null}

      {sources.length > 0 ? (
        <View className="mt-6 w-full pb-4">
          <FieldLabel>{copy.paidWith}</FieldLabel>
          <View className="mt-3 w-full">
            <SourceTiles
              sources={sources}
              value={entry.sourceId ?? ''}
              onChange={(sourceId) => updateVoiceEntry(id, { sourceId })}
            />
          </View>
        </View>
      ) : (
        <View className="pb-4" />
      )}
    </Screen>
  );
}

/** What Save would write, by kind, or the form's own words for what is missing. */
type BuiltEntry =
  | { ok: true; kind: 'receipt'; values: ReceiptValues }
  | { ok: true; kind: 'bill'; values: BillValues }
  | { ok: true; kind: 'subscription'; values: SubscriptionValues }
  | { ok: false; message: string };

/**
 * The entry through its form's own builder. A new item has no charge on record and nothing counted
 * yet, so both floors are no-ops, as for a new item saved from the form. No reminder: the default
 * is Off.
 */
function buildFor(
  entry: VoiceEntry,
  context: { todayDate: Date; categoryLabel: string; sources: readonly SourceRef[] },
): BuiltEntry {
  if (entry.kind === 'receipt') {
    const result = buildReceiptValues(
      entryToReceiptInput(entry, context.todayDate),
      context.sources,
    );
    return result.ok
      ? { ok: true, kind: 'receipt', values: result.values }
      : { ok: false, message: result.message };
  }
  if (entry.kind === 'bill') {
    const result = buildBillValues(entryToBillInput(entry, context.categoryLabel), {
      sources: context.sources,
      lastChargedOn: null,
    });
    return result.ok
      ? { ok: true, kind: 'bill', values: result.values }
      : { ok: false, message: result.message };
  }
  const result = buildSubscriptionValues(entryToSubscriptionInput(entry), {
    sources: context.sources,
    lastChargedOn: null,
    countsFrom: null,
  });
  return result.ok
    ? { ok: true, kind: 'subscription', values: result.values }
    : { ok: false, message: result.message };
}

/**
 * What a saved correction teaches, if anything: heard words → the name saved.
 *
 * Only a guess can be wrong in a way worth remembering: a store matched exactly in the catalogue
 * and then changed is a change of mind, not a mishearing. So never from a catalogue match, nothing
 * without a source (no merchant), and otherwise only when the name really changed. A learned name
 * changed back to the person's own words is taught too; that is what removes the pair.
 */
function lessonFrom(
  draft: VoiceDraft,
  entry: VoiceEntry,
  touched: readonly string[],
): { heard: string; canonical: string } | null {
  const source = draft.merchantSource;
  if (source !== 'fuzzy' && source !== 'heard' && source !== 'learned') return null;
  const heard = draft.merchantHeard;
  const chosen = entry.merchant?.name.trim();
  if (!heard || !chosen || !touched.includes('merchant')) return null;
  const parsed = draft.merchant?.name.trim().toLowerCase() ?? '';
  if (chosen.toLowerCase() === parsed) return null;
  return { heard, canonical: chosen };
}
