import { randomUUID } from 'expo-crypto';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { guessCategory } from '@/api/brands';
import { useDeleteGoal, useGoal, useSpendGoal } from '@/api/goals';
import { useUpdateReceipt } from '@/api/mutations';
import { usePaymentSources } from '@/api/queries';
import { useReceiptBookDefault, useReceiptBooks } from '@/api/receipt-books';
import { savingsRefusal, useGoalMoves } from '@/api/savings';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { DateEditPage } from '@/components/entry/edit-pages';
import { DateChips } from '@/components/entry/entry-review';
import { GoalIcon } from '@/components/savings/goal-icon';
import { QuietAction } from '@/components/savings/quiet-action';
import { goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { SourceTiles } from '@/components/ui/source-tiles';
import { FieldLabel } from '@/components/ui/typography';
import { GENERAL_BOOK } from '@/data/receipt-books';
import { t } from '@/i18n';
import { toIsoDate } from '@/lib/date';
import { formatEntryDay } from '@/lib/entry-day';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import type { GoalView } from '@/lib/goals';
import { success, warn } from '@/lib/haptics';
import { logoColumns } from '@/lib/logo-columns';
import { fromCents, toCents } from '@/lib/money';
import { bookColumn, defaultBookOf } from '@/lib/receipt-books';
import { useToday } from '@/lib/use-today';
import { useToast } from '@/providers/toast-context';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * "I spent it" (`?id=`): what the goal held, filed as a receipt in the same step as the goal ends;
 * or a receipt already added picked instead (/goal-receipt); or the goal just removed. Reached
 * from Delete on the goal's edit page; every way ends on Goals.
 */
export default function GoalSpentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const artwork = useArtwork();
  const existing = useGoal(id);
  // Until every move is read, a goal's figure is only what it started with: none is drawn.
  const movesRead = useGoalMoves().data !== undefined;
  const read = movesRead ? existing.goal : null;
  const focused = useIsFocused();

  // The goal as last read: it leaves the open goals as this page saves, and the page stays drawn
  // until it has gone to Goals, rather than flash the failure page.
  const [kept, setKept] = useState<GoalView | null>(null);
  if (read && read !== kept) setKept(read);
  const goal = read ?? kept;

  // Spent or deleted on another phone before this opened: leave quietly.
  const missing = movesRead && !existing.isPending && !existing.isError && !goal;
  useEffect(() => {
    if (missing && focused) goBack();
  }, [missing, focused]);

  if (goal) return <SpentForm key={goal.id} goal={goal} />;

  return (
    <Screen title={t('goals.detail.spentIt')} showBack>
      {existing.isPending ? <SkeletonList rows={3} /> : null}
      {existing.isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={existing.refetch}
        />
      ) : null}
    </Screen>
  );
}

function SpentForm({ goal }: { goal: GoalView }) {
  const { todayDate } = useToday();
  const toast = useToast();
  const spend = useSpendGoal();
  const remove = useDeleteGoal();
  const updateReceipt = useUpdateReceipt();
  const { sources } = usePaymentSources();
  const booksRead = useReceiptBooks();
  const storedDefault = useReceiptBookDefault();
  // One receipt id for this visit, so Add repeated after a lost answer files nothing twice.
  const [receiptId] = useState(() => randomUUID());

  const [store, setStore] = useState<BrandSelection | null>(null);
  // Typed but not picked from the list: it names the store all the same. Starts as the goal's name.
  const [typedStore, setTypedStore] = useState(goal.name);
  const [date, setDate] = useState<Date>(todayDate);
  /** '' is Skip, picked on purpose; null is not answered yet. */
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = spend.isPending || remove.isPending || updateReceipt.isPending;

  // Where a new receipt goes on its own: the person's default book, else General. Not guessed
  // before both reads are in.
  const books = booksRead.data ?? [];
  const bookKnown = booksRead.isSuccess && storedDefault.isSuccess;
  const book = bookKnown ? (defaultBookOf(storedDefault.data, books) ?? GENERAL_BOOK) : null;
  // A book paid from one card fills Paid with until the person picks, as on the receipt page.
  const bookRow = books.find((row) => row.id === book) ?? null;
  const bookSource = bookRow?.card_id ?? bookRow?.bank_account_id ?? null;
  const offered = (id: string | null): id is string =>
    id === '' || (id !== null && sources.some((source) => source.id === id));
  // A card or account picked here that is no longer offered (locked, or deleted on another phone)
  // is no answer: it is asked again rather than filed as Skip.
  const shownSource =
    sourceId !== null
      ? offered(sourceId)
        ? sourceId
        : null
      : offered(bookSource)
        ? bookSource
        : null;

  // The delete question named only what came from savings; the rest is what the goal started with.
  const before = fromCents(Math.max(0, toCents(goal.saved) - toCents(goal.fromSavings)));

  const leaveFor = (thrown: unknown) => {
    // Spent or deleted on another phone meanwhile: done, with nothing to say.
    if (savingsRefusal(thrown)?.kind === 'gone') {
      router.dismissTo('/goals');
      return;
    }
    warn();
    setError(failureMessage(thrown));
  };

  const handleAdd = async () => {
    if (busy) return;
    setError(null);
    if (book === null) {
      if (booksRead.isError || storedDefault.isError) {
        warn();
        setError(failureText());
        void booksRead.refetch();
        void storedDefault.refetch();
      }
      return;
    }
    const typed = typedStore.trim();
    const chosen: BrandSelection | null =
      store ??
      (typed
        ? {
            brandId: null,
            name: typed,
            domain: null,
            categoryId: guessCategory(typed),
            logoDomain: null,
            logoHidden: false,
          }
        : null);
    const missing = [
      !chosen && t('receipts.field.store'),
      shownSource === null && t('receipts.field.paidWith'),
    ].filter((field): field is string => Boolean(field));
    if (!chosen || shownSource === null) {
      warn();
      setError(t('receipts.add.missing', { fields: missing.join(', ') }));
      return;
    }
    const paidWith = sources.find((source) => source.id === shownSource);
    // spend_goal files the name alone; the store's brand, category and logo follow in a second
    // write that moves no money. A retry answers the first and repeats the second.
    const storeColumns = {
      brand_id: chosen.brandId,
      category_id: chosen.categoryId || 'other',
      ...logoColumns(chosen),
    };
    const plain =
      storeColumns.brand_id === null &&
      storeColumns.category_id === 'other' &&
      Object.keys(storeColumns).length === 2;
    try {
      await spend.mutateAsync({
        id: goal.id,
        receipt: {
          receiptId,
          merchant: chosen.name,
          purchasedOn: toIsoDate(date),
          cardId: paidWith?.kind === 'card' ? paidWith.id : null,
          bankAccountId: paidWith?.kind === 'account' ? paidWith.id : null,
          bookId: bookColumn(book),
        },
      });
      if (!plain) await updateReceipt.mutateAsync({ id: receiptId, values: storeColumns });
      success();
      toast('toast.goal.spent');
      router.dismissTo('/goals');
    } catch (thrown) {
      leaveFor(thrown);
    }
  };

  const handleRemove = async () => {
    if (busy) return;
    setError(null);
    try {
      await remove.mutateAsync({ id: goal.id, returnMoney: false });
      toast('toast.goal.deleted', 'deleted');
      router.dismissTo('/goals');
    } catch (thrown) {
      leaveFor(thrown);
    }
  };

  if (picking) {
    return (
      <DateEditPage
        title={t('receipts.field.date')}
        question={t('receipts.add.askDate')}
        value={date}
        onBack={() => setPicking(false)}
        onDone={(day) => {
          if (day) setDate(day);
          setPicking(false);
        }}
      />
    );
  }

  return (
    <Screen
      title={t('goals.detail.spentIt')}
      showBack
      avoidKeyboard
      footer={
        <View className="w-full items-center gap-1">
          {error ? (
            <Text
              testID="goal-spent-error"
              accessibilityRole="alert"
              className="mb-2 text-center font-app text-[13px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {error}
            </Text>
          ) : null}
          <Button
            label={busy && !remove.isPending ? t('receipts.add.saving') : t('goals.spent.add')}
            onPress={handleAdd}
            // Waits for the default book, so the receipt is never filed in General by mistake.
            disabled={busy || (book === null && !booksRead.isError && !storedDefault.isError)}
          />
          <QuietAction
            label={t('goals.spent.alreadyAdded')}
            onPress={() => router.push({ pathname: '/goal-receipt', params: { id: goal.id } })}
            disabled={busy}
            testID="goal-spent-linked"
          />
          <QuietAction
            tone="danger"
            label={t('goals.spent.justRemove')}
            onPress={handleRemove}
            disabled={busy}
            testID="goal-spent-remove"
          />
        </View>
      }
    >
      <Text
        className="mt-1 w-full text-center font-app text-[14px] leading-5 text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('goals.spent.lead')}
      </Text>

      <View
        testID="goal-spent-card"
        className="mt-4 w-full rounded-[20px] border border-line bg-card p-[20px]"
      >
        <View className="w-full flex-row items-center gap-[14px]">
          <GoalIcon iconId={goal.icon_id} size={44} />
          <View className="min-w-0 flex-1">
            <Text
              className="font-app-semibold text-[16px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {goal.name}
            </Text>
            <Text
              className="mt-[2px] font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {t('goals.spent.held')}
            </Text>
          </View>
        </View>
        <Text
          testID="goal-spent-amount"
          className="mt-[14px] font-app-bold text-[28px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.figure}
        >
          {formatCurrency(goal.saved)}
        </Text>
        {toCents(before) > 0 ? (
          <Text
            className="mt-[4px] font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('goals.detail.startAmount', { amount: formatCurrency(before) })}
          </Text>
        ) : null}
      </View>

      <BrandField
        className="mt-6"
        label={t('receipts.field.store')}
        value={store}
        onChange={(next) => {
          setError(null);
          setStore(next);
        }}
        placeholder={t('receipts.add.storePlaceholder')}
        // Drawn afresh after the calendar page; what was typed comes back with it.
        initialQuery={typedStore}
        onQueryChange={(next) => {
          setError(null);
          setTypedStore(next);
        }}
      />

      <View className="mt-6 w-full">
        <FieldLabel className="mb-2">{t('receipts.field.date')}</FieldLabel>
        <Text
          className="mb-3 font-app-semibold text-[16px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {formatEntryDay(date, todayDate)}
        </Text>
        <DateChips
          value={date}
          today={todayDate}
          onPick={(day) => {
            setError(null);
            setDate(day);
          }}
          onOpenCalendar={() => setPicking(true)}
        />
      </View>

      <View className="mb-4 mt-6 w-full">
        <FieldLabel className="mb-2">{t('receipts.field.paidWith')}</FieldLabel>
        <SourceTiles
          sources={sources}
          value={shownSource ?? ''}
          onChange={(next) => {
            setError(null);
            setSourceId(next);
          }}
          skip={{
            label: t('receipts.add.skipSource'),
            selected: shownSource === '',
            onPress: () => {
              setError(null);
              setSourceId('');
            },
          }}
        />
      </View>
    </Screen>
  );
}
