import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import { usePaymentSources } from '@/api/queries';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { billCategoryLabel } from '@/components/bills/bill-row';
import { CategoryPicker } from '@/components/bills/category-picker';
import { NoteEditPage, PaidWithEditPage } from '@/components/entry/edit-pages';
import { AmountStep } from '@/components/flow/amount-step';
import { InlineCalendar } from '@/components/flow/inline-calendar';
import { FlowHeader } from '@/components/flow/step-flow';
import { useProGate } from '@/components/pro/pro-gate';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { StaleDraft } from '@/components/voice/stale-draft';
import { BILL_CATEGORIES, type BillCategory } from '@/data/bills-mock';
import { t, type MessageKey } from '@/i18n';
import { toIsoDate } from '@/lib/date';
import { failureText } from '@/lib/failure';
import { warn } from '@/lib/haptics';
import { useToday } from '@/lib/use-today';
import type { VoiceKind } from '@/lib/voice';
import {
  amountFromText,
  amountText,
  dayToDate,
  updateVoiceEntry,
  useVoiceSession,
  voiceBillName,
  type VoiceEntry,
  type VoiceSession,
} from '@/lib/voice-draft';
import { TEXT_CAP } from '@/theme/text-scale';

type Field = 'amount' | 'merchant' | 'date' | 'category' | 'source' | 'note';

const FIELDS: readonly Field[] = ['amount', 'merchant', 'date', 'category', 'source', 'note'];

/** The add flows' own questions, so a correction asks what the form would. */
const QUESTIONS: Record<'amount' | 'merchant' | 'date', Record<VoiceKind, MessageKey>> = {
  amount: {
    receipt: 'voice.receipt.askAmount',
    bill: 'voice.bill.askAmount',
    subscription: 'voice.subscription.askAmount',
  },
  merchant: {
    receipt: 'voice.receipt.askMerchant',
    bill: 'voice.bill.askMerchant',
    subscription: 'voice.subscription.askMerchant',
  },
  date: {
    receipt: 'voice.receipt.askDate',
    bill: 'voice.bill.askDate',
    subscription: 'voice.subscription.askDate',
  },
};

/** The review row's own names, so the page is titled by the row that opened it. */
const DATE_TITLES: Record<VoiceKind, MessageKey> = {
  receipt: 'receipts.field.date',
  bill: 'voice.bill.date',
  subscription: 'subscriptions.detail.nextRenewal',
};

const PAID_WITH_TITLES: Record<VoiceKind, MessageKey> = {
  receipt: 'voice.receipt.paidWith',
  bill: 'voice.bill.paidWith',
  subscription: 'voice.subscription.paidWith',
};

/** Each form's own note page, word for word. */
const NOTE_COPY: Record<VoiceKind, { label: MessageKey; placeholder: MessageKey }> = {
  receipt: { label: 'receipts.field.note', placeholder: 'receipts.add.notePlaceholder' },
  bill: { label: 'bills.field.note', placeholder: 'bills.add.notePlaceholder' },
  subscription: {
    label: 'subscriptions.field.note',
    placeholder: 'subscriptions.add.notePlaceholder',
  },
};

/**
 * A bill with no name of its own is saved under its category in the language on screen, as
 * add-bill pre-fills it.
 */
const labelOf = (categoryId: string | null) =>
  billCategoryLabel(
    categoryId,
    BILL_CATEGORIES.find((category) => category.id === categoryId)?.label ?? '',
  );

/**
 * One correction, on a page of its own: `/voice-edit?draft=…&field=…`. Built from the add flows'
 * own parts, pushed from the right like every other page. Done writes the change to the review's
 * working copy and pops; back, or the swipe, pops and writes nothing.
 */
export default function VoiceEditScreen() {
  const gate = useProGate('voice');
  if (gate) return gate;
  return <VoiceEditInner />;
}

function VoiceEditInner() {
  const params = useLocalSearchParams<{ draft?: string; field?: string }>();
  const session = useVoiceSession(params.draft);
  const field = FIELDS.find((option) => option === params.field);

  // A category belongs to bills alone; asked for on anything else, there is nothing to correct.
  if (!session || !field || (field === 'category' && session.entry.kind !== 'bill')) {
    return <StaleDraft />;
  }

  switch (field) {
    case 'amount':
      return <AmountEdit session={session} />;
    case 'merchant':
      return session.entry.kind === 'bill' ? (
        <BillNameEdit session={session} />
      ) : (
        <MerchantEdit session={session} />
      );
    case 'date':
      return <DateEdit session={session} />;
    case 'category':
      return <CategoryEdit session={session} />;
    case 'source':
      return <SourceEdit session={session} />;
    case 'note':
      return <NoteEdit session={session} />;
  }
}

/**
 * Writes the change and pops; a stale draft stays put and says so.
 *
 * The page leaves exactly once. In expo-router 57 `router.back()` is a global "go back" with no
 * screen attached, so a second tap on Done (or a second category, tapped before the page has gone)
 * would pop the review page too and land on the mic. After the first leave, nothing here writes or
 * pops again. The back chevron goes through the same door.
 */
function useCommit(session: VoiceSession) {
  const [failed, setFailed] = useState(false);
  const left = useRef(false);

  const leave = () => {
    if (left.current) return;
    left.current = true;
    router.back();
  };

  const commit = (patch: Partial<VoiceEntry>) => {
    if (left.current) return;
    if (updateVoiceEntry(session.id, patch)) {
      leave();
      return;
    }
    warn();
    setFailed(true);
  };
  return { commit, failed, leave };
}

/** The shell every edit page wears: back, the field's name, its question, Done. */
function EditShell({
  title,
  question,
  onBack,
  doneDisabled = false,
  onDone,
  failed,
  footerExtra,
  avoidKeyboard = false,
  children,
}: {
  title: string;
  question: string;
  /** The page's one way out without writing; see `useCommit`. */
  onBack: () => void;
  /** Omitted on pages where a tap is the answer (the category grid). */
  onDone?: () => void;
  doneDisabled?: boolean;
  failed: boolean;
  footerExtra?: ReactNode;
  avoidKeyboard?: boolean;
  children: ReactNode;
}) {
  const questionRef = useRef<ComponentRef<typeof Text>>(null);
  useEffect(() => {
    if (questionRef.current) AccessibilityInfo.sendAccessibilityEvent(questionRef.current, 'focus');
  }, []);

  const footer =
    onDone || failed ? (
      <View className="w-full gap-2">
        {failed ? (
          <Text
            className="w-full text-center font-app text-[13px] text-danger"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {failureText()}
          </Text>
        ) : null}
        {onDone ? (
          <Button label={t('common.done')} onPress={onDone} disabled={doneDisabled} />
        ) : null}
        {footerExtra}
      </View>
    ) : undefined;

  return (
    <Screen
      avoidKeyboard={avoidKeyboard}
      header={
        <View className="w-full pb-2">
          {/* No close: one field has nothing to throw away that back does not. */}
          <FlowHeader title={title} onBack={onBack} />
        </View>
      }
      footer={footer}
    >
      <Text
        ref={questionRef}
        accessibilityRole="header"
        className="mt-6 w-full text-center font-app text-[20px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {question}
      </Text>
      <View className="mt-6 w-full flex-1">{children}</View>
    </Screen>
  );
}

function AmountEdit({ session }: { session: VoiceSession }) {
  const { commit, failed, leave } = useCommit(session);
  const kind = session.entry.kind;
  const [text, setText] = useState(() => amountText(session.entry.amount));
  const amount = amountFromText(text);

  return (
    <EditShell
      title={t('voice.review.amount')}
      question={t(QUESTIONS.amount[kind])}
      onDone={() => {
        if (amount !== null) commit({ amount });
      }}
      doneDisabled={amount === null}
      failed={failed}
      onBack={leave}
    >
      <AmountStep value={text} onChange={setText} />
    </EditShell>
  );
}

/**
 * The store or the service. When what was heard matched nothing in the catalogue, the search opens
 * already holding it ("star bucks"), with its results showing.
 */
function MerchantEdit({ session }: { session: VoiceSession }) {
  const { commit, failed, leave } = useCommit(session);
  const { entry, draft, touched } = session;
  const receipt = entry.kind === 'receipt';

  const searchFirst =
    !touched.includes('merchant') && (!entry.merchant || entry.merchant.brandId === null);
  const [merchant, setMerchant] = useState<BrandSelection | null>(
    searchFirst ? null : entry.merchant,
  );

  return (
    <EditShell
      title={receipt ? t('voice.receipt.merchant') : t('voice.subscription.merchant')}
      question={t(QUESTIONS.merchant[entry.kind])}
      onDone={() => {
        if (merchant) commit({ merchant });
      }}
      doneDisabled={!merchant}
      failed={failed}
      onBack={leave}
      avoidKeyboard
    >
      <BrandField
        label={receipt ? t('voice.receipt.merchant') : t('voice.subscription.merchant')}
        placeholder={receipt ? t('voice.edit.searchStore') : t('voice.edit.searchService')}
        value={merchant}
        onChange={setMerchant}
        initialQuery={searchFirst ? (draft.merchantHeard ?? entry.merchant?.name ?? '') : ''}
        autoFocus={searchFirst}
      />
    </EditShell>
  );
}

/**
 * A bill's company and name, together as add-bill has them. Picking a company names the bill
 * unless it already has a real name (add-bill's rule exactly).
 */
function BillNameEdit({ session }: { session: VoiceSession }) {
  const { commit, failed, leave } = useCommit(session);
  const { entry } = session;
  const categoryLabel = labelOf(entry.billCategoryId);

  const [issuer, setIssuer] = useState<BrandSelection | null>(entry.merchant);
  const [name, setName] = useState(() => voiceBillName(entry, categoryLabel));

  const handleIssuer = (next: BrandSelection | null) => {
    setIssuer(next);
    if (!next) return;
    const current = name.trim();
    const untouched = !current || current === categoryLabel || current === issuer?.name;
    if (untouched) setName(next.name);
  };

  return (
    <EditShell
      title={t('voice.bill.merchant')}
      question={t(QUESTIONS.merchant.bill)}
      onDone={() => {
        const typed = name.trim();
        if (!typed) return;
        // A name that is only what Skip would call it anyway stays unnamed, so a later change of
        // company or category can still rename it.
        const automatic = voiceBillName(
          { ...entry, merchant: issuer, billName: null },
          categoryLabel,
        );
        commit({ merchant: issuer, billName: typed === automatic ? null : typed });
      }}
      doneDisabled={!name.trim()}
      failed={failed}
      onBack={leave}
      avoidKeyboard
    >
      <BrandField
        label={t('voice.edit.company')}
        placeholder={t('voice.edit.searchCompany')}
        value={issuer}
        onChange={handleIssuer}
        category={entry.billCategoryId ?? undefined}
        noLogo="icon"
      />
      <TextField
        label={t('voice.bill.merchant')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        returnKeyType="done"
        className="mt-5"
      />
    </EditShell>
  );
}

function DateEdit({ session }: { session: VoiceSession }) {
  const { commit, failed, leave } = useCommit(session);
  const { todayDate } = useToday();
  const { entry } = session;
  const kind = entry.kind;

  // A receipt with no day was bought today, the form's own default; a bill or subscription opens
  // with nothing picked.
  const [day, setDay] = useState<Date | null>(() =>
    entry.date ? dayToDate(entry.date) : kind === 'receipt' ? todayDate : null,
  );

  return (
    <EditShell
      title={t(DATE_TITLES[kind])}
      question={t(QUESTIONS.date[kind])}
      onDone={() => {
        if (day) commit({ date: toIsoDate(day) });
        // A renewal date is optional: Done with none picked keeps it unset.
        else if (kind === 'subscription') commit({ date: null });
      }}
      doneDisabled={!day && kind !== 'subscription'}
      failed={failed}
      onBack={leave}
      footerExtra={
        kind === 'subscription' && entry.date ? (
          <TextLink
            label={t('voice.edit.noRenewal')}
            variant="subtle"
            onPress={() => commit({ date: null })}
          />
        ) : null
      }
    >
      <InlineCalendar value={day} onChange={setDay} />
    </EditShell>
  );
}

/** A tap picks and pops, as the grid does in add-bill. */
function CategoryEdit({ session }: { session: VoiceSession }) {
  const { commit, failed, leave } = useCommit(session);
  const { entry } = session;

  const pick = (category: BillCategory) => {
    const patch: Partial<VoiceEntry> = { billCategoryId: category.id };
    // A name that was only the old category's label follows the new one.
    if (entry.billName && entry.billName === labelOf(entry.billCategoryId)) patch.billName = null;
    commit(patch);
  };

  return (
    <EditShell
      title={t('voice.review.category')}
      question={t('voice.edit.categoryQuestion')}
      failed={failed}
      onBack={leave}
    >
      <View className="w-full pb-10">
        <CategoryPicker onSelect={pick} selectedId={entry.billCategoryId ?? undefined} />
      </View>
    </EditShell>
  );
}

/** The forms' own "Paid with" page; clearing it leaves no card or account. */
function SourceEdit({ session }: { session: VoiceSession }) {
  const { commit, failed, leave } = useCommit(session);
  const { sources } = usePaymentSources();
  const { entry } = session;

  return (
    <PaidWithEditPage
      title={t(PAID_WITH_TITLES[entry.kind])}
      sources={sources}
      value={entry.sourceId ?? ''}
      error={failed ? failureText() : null}
      onBack={leave}
      onDone={(sourceId) => commit({ sourceId: sourceId || null })}
    />
  );
}

/** The forms' own note page. Emptied, it is no note. */
function NoteEdit({ session }: { session: VoiceSession }) {
  const { commit, failed, leave } = useCommit(session);
  const copy = NOTE_COPY[session.entry.kind];

  return (
    <NoteEditPage
      title={t(copy.label)}
      label={t(copy.label)}
      placeholder={t(copy.placeholder)}
      value={session.entry.note ?? ''}
      error={failed ? failureText() : null}
      onBack={leave}
      onDone={(note) => commit({ note: note.trim() || null })}
    />
  );
}
