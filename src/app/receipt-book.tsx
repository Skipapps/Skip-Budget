import { router, useLocalSearchParams } from 'expo-router';
import { Info, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { usePaymentSources, type PaymentSourceRow } from '@/api/queries';
import {
  bookNameRefused,
  useDeleteReceiptBook,
  useReceiptBookDefault,
  useReceiptBooks,
  useSaveReceiptBook,
  type ReceiptBookRow,
} from '@/api/receipt-books';
import { StepFlow } from '@/components/flow/step-flow';
import { BookIcon } from '@/components/receipts/book-icon';
import { BookIconGrid } from '@/components/receipts/book-icon-grid';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { SourceTiles } from '@/components/ui/source-tiles';
import { SwitchControl } from '@/components/ui/switch-control';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { BOOK_NAME_MAX, bookIconId, bookIconLabelKey, type BookIconId } from '@/data/receipt-books';
import { t } from '@/i18n';
import { showBookOnReturn } from '@/lib/book-choice';
import { failureMessage, failureText } from '@/lib/failure';
import { success, warn } from '@/lib/haptics';
import { bookNameTaken } from '@/lib/receipt-books';
import { useConfirm } from '@/providers/dialog-provider';
import { useColors } from '@/providers/theme-provider';
import { useToast } from '@/providers/toast-context';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

type Draft = {
  name: string;
  iconId: BookIconId;
  /** '' is Skip, picked on purpose; null is not answered yet. A saved book has answered. */
  sourceId: string | null;
  makeDefault: boolean;
};

/**
 * A receipt book: new (`/receipt-book`, two steps: name and icon, then how it is paid) or saved
 * (`/receipt-book?id=…`, one page with Delete). Keyed on the id so the form seeds once the book is
 * read.
 */
export default function ReceiptBookScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const artwork = useArtwork();
  const books = useReceiptBooks();
  const stored = useReceiptBookDefault();

  if (!id) {
    return (
      <BookForm
        initial={{ name: '', iconId: 'trip', sourceId: null, makeDefault: true }}
        books={books.data ?? []}
      />
    );
  }

  if (books.isPending || stored.isPending) {
    return (
      <Screen showBack>
        <SkeletonList rows={4} />
      </Screen>
    );
  }

  const book = books.data?.find((row) => row.id === id);
  if (!book) {
    // A failed read, or a book deleted on another phone: nothing here to edit.
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => void books.refetch()}
          secondaryLabel={t('receipts.add.goBack')}
          onSecondary={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <BookForm
      key={book.id}
      book={book}
      initial={{
        name: book.name,
        iconId: bookIconId(book.icon_id),
        sourceId: book.card_id ?? book.bank_account_id ?? '',
        makeDefault: stored.data === book.id,
      }}
      books={books.data ?? []}
    />
  );
}

function BookForm({
  book,
  initial,
  books,
}: {
  /** The book being edited; absent for a new one. */
  book?: ReceiptBookRow;
  initial: Draft;
  books: readonly ReceiptBookRow[];
}) {
  const editing = Boolean(book);
  const colors = useColors();
  const toast = useToast();
  const confirm = useConfirm();
  const { sources } = usePaymentSources();
  const save = useSaveReceiptBook();
  const remove = useDeleteReceiptBook();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial.name);
  const [iconId, setIconId] = useState<BookIconId>(initial.iconId);
  const [sourceId, setSourceId] = useState<string | null>(initial.sourceId);
  const [makeDefault, setMakeDefault] = useState(initial.makeDefault);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  // General, in every language the app speaks, is not a name for a second book.
  const generalNames = ['General', 'Général', t('receipts.books.general')];

  /** An icon names an unnamed book, and renames one whose name only ever came from an icon. */
  const pickIcon = (next: BookIconId) => {
    setError(null);
    if (!trimmed || trimmed === t(bookIconLabelKey(iconId))) setName(t(bookIconLabelKey(next)));
    setIconId(next);
  };

  const nameProblem = (): string | null => {
    if (!trimmed) return t('receipts.books.nameMissing');
    if (bookNameTaken(trimmed, books, generalNames, book?.id)) {
      return t('receipts.books.nameTaken', { name: trimmed });
    }
    return null;
  };

  const fail = (message: string) => {
    warn();
    setError(message);
  };

  const toPay = () => {
    const problem = nameProblem();
    if (problem) {
      fail(problem);
      return;
    }
    setError(null);
    setStep(1);
  };

  const handleSave = async () => {
    const problem = nameProblem();
    if (problem) {
      fail(problem);
      // The name is on the first step of a new book.
      if (!editing) setStep(0);
      return;
    }
    if (sourceId === null) {
      fail(t('receipts.books.payMissing'));
      return;
    }
    setError(null);
    const chosen = sources.find((source) => source.id === sourceId);
    // A card locked since (a plan that lapsed) is not on offer, but the book keeps it until changed.
    const kept = !chosen && book && sourceId !== '' && sourceId === initial.sourceId;
    try {
      const saved = await save.mutateAsync({
        id: book?.id ?? null,
        values: {
          name: trimmed,
          icon_id: iconId,
          card_id: kept ? book.card_id : chosen?.kind === 'card' ? chosen.id : null,
          bank_account_id: kept
            ? book.bank_account_id
            : chosen?.kind === 'account'
              ? chosen.id
              : null,
          makeDefault,
        },
      });
      success();
      if (editing) {
        toast('toast.book.updated');
      } else {
        toast('toast.book.created', 'done', { name: trimmed });
        showBookOnReturn(saved.id);
      }
      router.back();
    } catch (thrown) {
      if (bookNameRefused(thrown)) {
        fail(t('receipts.books.nameTaken', { name: trimmed }));
        if (!editing) setStep(0);
        return;
      }
      fail(failureMessage(thrown));
    }
  };

  const handleDelete = async () => {
    if (!book) return;
    const ok = await confirm({
      title: t('receipts.books.deleteTitle', { name: book.name }),
      message: t('receipts.books.deleteMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(book.id);
      toast('toast.book.deleted', 'deleted');
      router.back();
    } catch (thrown) {
      fail(failureMessage(thrown));
    }
  };

  const nameSection = (
    <>
      <Heading title={t('receipts.books.name.heading')} sub={t('receipts.books.name.sub')} />

      <View className="mt-5 w-full items-center rounded-[16px] bg-ink/5 px-4 pb-5 pt-3">
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={TEXT_CAP.control}>
          {t('receipts.books.preview')}
        </Text>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="mt-2 max-w-full flex-row items-center gap-2 rounded-full border-[1.5px] border-ink bg-card py-1.5 pl-1.5 pr-4"
        >
          <BookIcon iconId={iconId} size={26} />
          <Text
            className={
              trimmed
                ? 'shrink font-app-medium text-[16px] text-ink'
                : 'shrink font-app text-[16px] text-muted'
            }
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {trimmed || t('receipts.books.name.label')}
          </Text>
        </View>
      </View>

      <TextField
        className="mt-5"
        label={t('receipts.books.name.label')}
        value={name}
        onChangeText={(next) => {
          setError(null);
          setName(next);
        }}
        placeholder={t('receipts.books.name.placeholder')}
        autoCapitalize="sentences"
        maxLength={BOOK_NAME_MAX}
        returnKeyType="done"
      />

      <FieldLabel className="mb-2 mt-5">{t('receipts.books.icon.label')}</FieldLabel>
      <BookIconGrid value={iconId} onChange={pickIcon} />
    </>
  );

  const paySection = (
    <>
      <Heading title={t('receipts.books.pay.heading')} sub={t('receipts.books.pay.sub')} />
      <PaidFrom
        sources={sources}
        value={sourceId}
        onChange={(next) => {
          setError(null);
          setSourceId(next);
        }}
      />

      <View className="mt-5 w-full flex-row items-center gap-3 rounded-[16px] border border-line bg-card px-4 py-3.5">
        <View className="min-w-0 flex-1">
          <Text
            className="font-app-semibold text-[15px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('receipts.books.default.title')}
          </Text>
          <Text
            className="mt-0.5 font-app text-[12px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('receipts.books.default.sub')}
          </Text>
        </View>
        <SwitchControl
          value={makeDefault}
          onValueChange={setMakeDefault}
          accessibilityLabel={t('receipts.books.default.title')}
        />
      </View>

      <View className="mt-4 w-full flex-row items-start gap-2.5 rounded-[12px] bg-ink/5 px-4 py-3">
        <View className="pt-0.5">
          <Info size={16} color={colors.muted} strokeWidth={1.8} />
        </View>
        <Text
          className="min-w-0 flex-1 font-app text-[13px] text-body"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('receipts.books.note')}
        </Text>
      </View>
    </>
  );

  if (editing) {
    return (
      <StepFlow
        title={t('receipts.books.edit')}
        closePrompt={t('receipts.books.edit.close')}
        steps={1}
        current={0}
        onBack={() => router.back()}
        avoidKeyboard
        primaryLabel={save.isPending ? t('receipts.add.saving') : t('receipts.add.saveChanges')}
        primaryDisabled={save.isPending || remove.isPending}
        onPrimary={() => void handleSave()}
        error={error}
        footerSlot={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('receipts.books.delete')}
            onPress={() => void handleDelete()}
            disabled={remove.isPending}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text
              className="font-app-medium text-[15px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {remove.isPending ? t('receipts.books.deleting') : t('receipts.books.delete')}
            </Text>
          </Pressable>
        }
      >
        {nameSection}
        <View className="mt-8 w-full">{paySection}</View>
      </StepFlow>
    );
  }

  return (
    <StepFlow
      title={t('receipts.books.new.title')}
      closePrompt={t('receipts.books.new.close')}
      steps={2}
      current={step}
      onBack={() => {
        setError(null);
        if (step === 0) router.back();
        else setStep(0);
      }}
      avoidKeyboard
      primaryLabel={
        step === 0
          ? t('common.continue')
          : save.isPending
            ? t('receipts.books.creating')
            : t('receipts.books.create')
      }
      primaryDisabled={save.isPending}
      onPrimary={step === 0 ? toPay : () => void handleSave()}
      error={error}
    >
      {step === 0 ? nameSection : paySection}
    </StepFlow>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <View className="w-full">
      <Text
        accessibilityRole="header"
        className="font-app-semibold text-[24px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {title}
      </Text>
      <Text
        className="mt-1 font-app text-[15px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {sub}
      </Text>
    </View>
  );
}

/** The app's Paid-from tiles, with Skip: a book need not be tied to one card. */
function PaidFrom({
  sources,
  value,
  onChange,
}: {
  sources: readonly PaymentSourceRow[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <View className="mt-5 w-full">
      <FieldLabel className="mb-2">{t('receipts.books.pay.label')}</FieldLabel>
      <SourceTiles
        sources={sources}
        value={value ?? ''}
        onChange={onChange}
        skip={{
          label: t('receipts.add.skipSource'),
          selected: value === '',
          onPress: () => onChange(''),
        }}
      />
      {value === '' ? (
        <Text
          className="mt-2 w-full font-app text-[13px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('receipts.books.pay.skipHint')}
        </Text>
      ) : null}
    </View>
  );
}
