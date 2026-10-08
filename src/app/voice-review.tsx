import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AlignLeft, CalendarDays, CreditCard, RefreshCw, Repeat, Tag } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import { useBrandDirectory } from '@/api/brands';
import { usePro } from '@/api/pro';
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
import { useRememberStore } from '@/api/known-stores';
import { useLearnVoiceAlias, useVoiceAliases } from '@/api/voice-aliases';
import { BillMark } from '@/components/bills/bill-mark';
import { billCategoryLabel, recurrenceLabel } from '@/components/bills/bill-row';
import { BrandMark } from '@/components/brands/brand-mark';
import { LogoConfirm } from '@/components/brands/logo-choices';
import {
  DateChips,
  EntryReview,
  GlyphWell,
  SegmentedChips,
  type EntryRowSpec,
} from '@/components/entry/entry-review';
import { useProGate } from '@/components/pro/pro-gate';
import { cycleLabel } from '@/components/subscriptions/subscription-row';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { TextLink } from '@/components/ui/text-link';
import { FieldLabel } from '@/components/ui/typography';
import { StaleDraft } from '@/components/voice/stale-draft';
import { BILL_CATEGORIES, RECURRENCES } from '@/data/bill-categories';
import { t, type MessageKey } from '@/i18n';
import { toIsoDate } from '@/lib/date';
import { formatEntryDay } from '@/lib/entry-day';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { logoChosen, logoColumns, selectionLogo } from '@/lib/logo-columns';
import { logoHints } from '@/lib/logo-lookup';
import { refusedForPro } from '@/lib/pro-refusal';
import { success, warn } from '@/lib/haptics';
import { useToday } from '@/lib/use-today';
import { parseVoice, type VoiceCycle, type VoiceDraft, type VoiceKind } from '@/lib/voice';
import {
  amountFromText,
  amountText,
  clearVoiceDraft,
  dayToDate,
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
import { TEXT_CAP } from '@/theme/text-scale';

type KindCopy = {
  title: string;
  closePrompt: string;
  save: string;
  merchant: string;
  date: string;
  paidWith: string;
  note: string;
};

/** Each kind's rows wear its add form's own names, so the two final pages read the same. */
const KIND_COPY: Record<VoiceKind, Record<keyof KindCopy, MessageKey>> = {
  receipt: {
    title: 'voice.receipt.title',
    closePrompt: 'voice.receipt.closePrompt',
    save: 'voice.receipt.save',
    merchant: 'voice.receipt.merchant',
    date: 'receipts.field.date',
    paidWith: 'voice.receipt.paidWith',
    note: 'receipts.field.note',
  },
  bill: {
    title: 'voice.bill.title',
    closePrompt: 'voice.bill.closePrompt',
    save: 'voice.bill.save',
    merchant: 'voice.bill.merchant',
    date: 'voice.bill.date',
    paidWith: 'voice.bill.paidWith',
    note: 'bills.field.note',
  },
  subscription: {
    title: 'voice.subscription.title',
    closePrompt: 'voice.subscription.closePrompt',
    save: 'voice.subscription.save',
    merchant: 'voice.subscription.merchant',
    date: 'subscriptions.detail.nextRenewal',
    paidWith: 'voice.subscription.paidWith',
    note: 'subscriptions.field.note',
  },
};

function kindCopy(kind: VoiceKind): KindCopy {
  const keys = KIND_COPY[kind];
  return {
    title: t(keys.title),
    closePrompt: t(keys.closePrompt),
    save: t(keys.save),
    merchant: t(keys.merchant),
    date: t(keys.date),
    paidWith: t(keys.paidWith),
    note: t(keys.note),
  };
}

const KIND_OPTIONS = [
  {
    value: 'receipt',
    get label() {
      return t('voice.kind.receipt');
    },
  },
  {
    value: 'bill',
    get label() {
      return t('voice.kind.bill');
    },
  },
  {
    value: 'subscription',
    get label() {
      return t('voice.kind.subscription');
    },
  },
] as const;

/** add-subscription's own billing cycles. */
const SUBSCRIPTION_CYCLES: readonly VoiceCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

type EditField = 'amount' | 'merchant' | 'date' | 'category' | 'source' | 'note';

/**
 * "Is this right?": what Skip heard, on the same final page the add forms end on, before anything
 * is saved. Saves through the same value builders the forms use, so voice cannot drift from the
 * forms' rules. Nothing is written until Save and nothing is guessed (an ambiguous amount has to be
 * picked); "More options" opens the form's own final page with the edited values in it.
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
  const confirm = useConfirm();
  const { today, todayDate } = useToday();
  const { sources } = usePaymentSources();
  const directory = useBrandDirectory();
  const { aliases } = useVoiceAliases();
  const learnAlias = useLearnVoiceAlias();
  const remember = useRememberStore();

  const createReceipt = useCreateReceipt();
  const createBill = useCreateBill();
  const createSubscription = useCreateSubscription();
  const { pro } = usePro();

  const { id, draft, entry, touched, edited } = session;
  const kind = entry.kind;
  const copy = kindCopy(kind);
  const category = BILL_CATEGORIES.find((option) => option.id === entry.billCategoryId) ?? null;
  // A bill with no name of its own is saved under this, in the language on screen, as add-bill
  // pre-fills it.
  const categoryLabel = category ? billCategoryLabel(category.id, category.label) : '';

  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // Two taps inside one frame both land before the button re-renders as disabled; this is what
  // makes one tap one row.
  const busy = useRef(false);

  // The question is what VoiceOver lands on, so the page says what it asks. This runs after the
  // final page's own focus on its title, so the question wins.
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
      // The header's close asks the same question, so both dialogs share its words.
      message: t('ui.flow.discardMessage'),
      confirmLabel: t('common.yes'),
      cancelLabel: t('ui.flow.stay'),
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
      // The logo the person chose for a store the catalogue does not know; nothing when they did
      // not answer, so such a store saves as letters, as in the forms.
      const logo = logoColumns(entry.merchant);
      if (built.kind === 'receipt') await createReceipt.mutateAsync({ ...built.values, ...logo });
      else if (built.kind === 'bill') await createBill.mutateAsync({ ...built.values, ...logo });
      else await createSubscription.mutateAsync({ ...built.values, ...logo });

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
      setSaving(false);
      busy.current = false;
      // The database's Pro wall is an answer only for someone the app also thinks is free; for a
      // payer it is a disagreement between the two, reported like any failure.
      if (refusedForPro(thrown) && !pro) {
        router.push({ pathname: '/pro-feature', params: { id: 'voice' } });
        return;
      }
      failureMessage(thrown);
      warn();
      setFailed(true);
    }
  };

  const merchant = entry.merchant;
  // The logo the saved row will show: the catalogue's, or the one the person chose.
  const merchantLogo = merchant ? selectionLogo(merchant) : null;
  // A receipt with no day heard is bought today, the form's own default.
  const receiptDay = entry.date ? dayToDate(entry.date) : todayDate;
  const dayValue = entry.date ? formatEntryDay(dayToDate(entry.date), todayDate) : null;
  const sourceLabel = sources.find((source) => source.id === entry.sourceId)?.label ?? null;

  // A chip already lit is no change, so tapping it does not make back ask.
  const pickDay = (day: Date) => {
    const iso = toIsoDate(day);
    if (iso !== toIsoDate(receiptDay)) updateVoiceEntry(id, { date: iso });
  };
  const cycle = entry.cycle ?? 'monthly';
  const pickCycle = (next: VoiceCycle) => {
    if (next !== cycle) updateVoiceEntry(id, { cycle: next });
  };

  const brandMark = merchant ? (
    <BrandMark name={merchant.name} domain={merchantLogo} hidden={merchant.logoHidden} size={40} />
  ) : null;

  const merchantRow: EntryRowSpec =
    kind === 'bill'
      ? {
          key: 'name',
          label: copy.merchant,
          value: voiceBillName(entry, categoryLabel) || null,
          required: true,
          // As a saved bill draws it: the company's logo, else the category's icon.
          leading: (
            <BillMark
              categoryId={entry.billCategoryId}
              domain={merchantLogo}
              name={merchant?.name}
              size={40}
            />
          ),
          onPress: () => edit('merchant'),
        }
      : {
          key: kind === 'receipt' ? 'store' : 'service',
          label: copy.merchant,
          value: merchant?.name ?? null,
          required: true,
          leading: brandMark,
          onPress: () => edit('merchant'),
        };

  const kindRows: EntryRowSpec[] =
    kind === 'receipt'
      ? [
          {
            key: 'date',
            label: copy.date,
            value: formatEntryDay(receiptDay, todayDate),
            leading: <GlyphWell icon={CalendarDays} />,
            onPress: () => edit('date'),
            below: (
              <DateChips
                value={receiptDay}
                today={todayDate}
                onPick={pickDay}
                onOpenCalendar={() => edit('date')}
              />
            ),
          },
        ]
      : kind === 'bill'
        ? [
            {
              key: 'category',
              label: t('voice.review.category'),
              value: categoryLabel || null,
              required: true,
              leading: <GlyphWell icon={category?.icon ?? Tag} />,
              onPress: () => edit('category'),
            },
            {
              key: 'due',
              label: copy.date,
              value: dayValue,
              required: true,
              leading: <GlyphWell icon={CalendarDays} />,
              onPress: () => edit('date'),
            },
            {
              key: 'recurrence',
              label: t('voice.review.recurring'),
              value: recurrenceLabel(cycle),
              leading: <GlyphWell icon={Repeat} />,
              below: (
                <SegmentedChips
                  variant="pills"
                  options={RECURRENCES.map((option) => ({
                    key: option.value,
                    label: recurrenceLabel(option.value),
                    selected: option.value === cycle,
                    onPress: () => pickCycle(option.value),
                  }))}
                />
              ),
            },
          ]
        : [
            {
              key: 'cycle',
              label: t('voice.review.billingCycle'),
              value: cycleLabel(cycle),
              leading: <GlyphWell icon={RefreshCw} />,
              below: (
                <SegmentedChips
                  variant="pills"
                  options={SUBSCRIPTION_CYCLES.map((option) => ({
                    key: option,
                    label: cycleLabel(option),
                    selected: option === cycle,
                    onPress: () => pickCycle(option),
                  }))}
                />
              ),
            },
            {
              key: 'renewal',
              label: copy.date,
              value: dayValue,
              leading: <GlyphWell icon={CalendarDays} />,
              onPress: () => edit('date'),
            },
          ];

  const rows: EntryRowSpec[] = [
    merchantRow,
    ...kindRows,
    // Without a card or account there is nothing to choose between, as in the forms.
    ...(sources.length > 0
      ? [
          {
            key: 'paidWith',
            label: copy.paidWith,
            value: sourceLabel,
            leading: <GlyphWell icon={CreditCard} />,
            onPress: () => edit('source'),
          },
        ]
      : []),
    {
      key: 'note',
      label: copy.note,
      value: entry.note,
      placeholder: t('entry.addNote'),
      leading: <GlyphWell icon={AlignLeft} />,
      onPress: () => edit('note'),
    },
  ];

  const ambiguous = entry.amount === null && entry.amountChoices.length >= 2;

  return (
    <EntryReview
      title={copy.title}
      closePrompt={copy.closePrompt}
      onClose={() =>
        go(() => {
          discard();
          router.dismissTo('/home');
        })
      }
      onBack={() => void handleBack()}
      // Once anything has been changed, the edge swipe would throw it away without a word, so it is
      // off and back asks first.
      root={!edited}
      amountLabel={t('voice.review.amount')}
      amount={amountText(entry.amount)}
      onEditAmount={() => edit('amount')}
      amountSlot={
        ambiguous ? (
          <View className="mt-6 w-full rounded-[16px] bg-accent/10 p-4">
            <Text
              accessibilityRole="header"
              className="font-app-semibold text-[15px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.heading}
            >
              {t('voice.review.whichAmount')}
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
              label={t('voice.review.typeIt')}
              variant="subtle"
              className="mt-1 items-start"
              onPress={() => edit('amount')}
            />
          </View>
        ) : undefined
      }
      topSlot={
        <View className="w-full">
          <Text
            ref={questionRef}
            accessibilityRole="header"
            className="w-full text-center font-app text-[20px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.heading}
          >
            {draft.confidence === 'low'
              ? t('voice.review.heardRight')
              : t('voice.review.isThisRight')}
          </Text>

          <View
            accessible
            accessibilityLabel={t('voice.review.youSaidLabel', { words: draft.transcript })}
            className="mt-4 w-full rounded-[16px] bg-ink/5 px-4 py-3"
          >
            <Text
              className="font-app-medium text-[12px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {t('voice.review.youSaid')}
            </Text>
            <Text
              className="mt-1 font-app text-[15px] leading-6 text-ink"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {t('voice.review.quoted', { words: draft.transcript })}
            </Text>
          </View>

          <FieldLabel className="mt-6 w-full">{t('voice.review.addAs')}</FieldLabel>
          <View className="mt-2 w-full">
            <ChoiceChips options={KIND_OPTIONS} value={kind} onChange={changeKind} />
          </View>
          {!draft.kindSure && !touched.includes('kind') ? (
            <Text
              className="mt-2 w-full font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {t('voice.review.guessed')}
            </Text>
          ) : null}
        </View>
      }
      rows={rows}
      bottomSlot={
        // A store the catalogue does not know gets the add forms' own logo check, in the same words.
        // Nothing is chosen until the person answers: unanswered, it saves as letters.
        merchant && merchant.brandId === null ? (
          <LogoConfirm
            key={merchant.name}
            name={merchant.name}
            hints={logoHints(kind === 'bill' ? entry.billCategoryId : merchant.categoryId)}
            noLogo={kind === 'bill' ? 'icon' : 'letters'}
            decided={logoChosen(merchant)}
            onChoose={(choice, how) => {
              updateVoiceEntry(id, { merchant: { ...merchant, ...choice } });
              void remember(
                {
                  name: merchant.name,
                  categoryId: merchant.categoryId,
                  logoDomain: choice.logoDomain,
                  logoHidden: choice.logoHidden,
                },
                { teach: how === 'chosen' },
              );
            }}
          />
        ) : undefined
      }
      primaryLabel={saving ? t('voice.review.saving') : copy.save}
      primaryDisabled={saving || !built?.ok}
      onPrimary={() => void save()}
      // What still blocks Save, in the forms' own words, until a save has failed.
      error={failed ? failureText() : null}
      hint={failed ? null : hint}
      footerSlot={
        <View className="w-full flex-row flex-wrap justify-center gap-x-8">
          <TextLink
            label={t('voice.review.sayAgain')}
            variant="subtle"
            onPress={() => void handleSayAgain()}
          />
          <TextLink
            label={t('voice.review.moreOptions')}
            variant="subtle"
            accessibilityHint={t('voice.review.moreOptionsHint')}
            onPress={() => go(() => router.push(entryToForm(entry)))}
          />
        </View>
      }
    />
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
