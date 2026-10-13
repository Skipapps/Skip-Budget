import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useGoalPurchases } from '@/api/goal-purchases';
import { useGoal, useLinkGoalReceipt } from '@/api/goals';
import { useHistoryFloor } from '@/api/history';
import { useReceipts, type ReceiptRow } from '@/api/queries';
import { savingsRefusal, useGoalMoves } from '@/api/savings';
import { BrandMark } from '@/components/brands/brand-mark';
import { goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatFullDate } from '@/lib/date';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { receiptChoices } from '@/lib/goal-receipts';
import type { GoalView } from '@/lib/goals';
import { success, warn } from '@/lib/haptics';
import { logoDomainOf } from '@/lib/logo-domain';
import { fromCents, toCents } from '@/lib/money';
import { useConfirm } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * "I already added it" (`?id=`): the receipt already on the record for what the goal bought,
 * picked from a list and named by the goal as it ends, in one step. Ends on Goals.
 */
export default function GoalReceiptScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const artwork = useArtwork();
  const existing = useGoal(id);
  // Until every move is read, a goal's figure is only what it started with: none is drawn.
  const movesRead = useGoalMoves().data !== undefined;
  const read = movesRead ? existing.goal : null;
  const focused = useIsFocused();

  // The goal as last read: it leaves the open goals as this page links, and the page stays drawn
  // until it has gone to Goals.
  const [kept, setKept] = useState<GoalView | null>(null);
  if (read && read !== kept) setKept(read);
  const goal = read ?? kept;

  const missing = movesRead && !existing.isPending && !existing.isError && !goal;
  useEffect(() => {
    if (missing && focused) goBack();
  }, [missing, focused]);

  if (goal) return <ReceiptPicker key={goal.id} goal={goal} />;

  return (
    <Screen title={t('goals.link.title')} showBack>
      {existing.isPending ? <SkeletonList rows={4} /> : null}
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

function ReceiptPicker({ goal }: { goal: GoalView }) {
  const artwork = useArtwork();
  const toast = useToast();
  const confirm = useConfirm();
  const link = useLinkGoalReceipt();
  const receipts = useReceipts();
  const purchases = useGoalPurchases();
  const { floor } = useHistoryFloor();
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choices = useMemo(
    () =>
      receiptChoices({
        receipts: receipts.data ?? [],
        // This goal's own receipt stays on offer: picking it again after a lost answer is answered
        // by the server as the link it already is.
        linked: new Set(
          (purchases.data ?? [])
            .filter((purchase) => purchase.goal_id !== goal.id)
            .map((purchase) => purchase.receipt_id),
        ),
        held: goal.saved,
        floor,
      }),
    [receipts.data, purchases.data, goal.id, goal.saved, floor],
  );
  const refetch = () => {
    void receipts.refetch();
    void purchases.refetch();
  };

  const handleLink = async () => {
    if (link.isPending) return;
    setError(null);
    if (!picked) {
      warn();
      setError(t('goals.link.missing'));
      return;
    }
    // A receipt for less than the goal held leaves the rest spent too: asked, never assumed.
    const receipt = (receipts.data ?? []).find((row) => row.id === picked);
    const short = receipt ? toCents(goal.saved) - Math.abs(toCents(Number(receipt.amount))) : 0;
    if (short > 0) {
      const ok = await confirm({
        title: t('goals.link.lessTitle', { difference: formatCurrency(fromCents(short)) }),
        message: t('goals.link.lessMessage'),
        confirmLabel: t('goals.link.anyway'),
        cancelLabel: t('goals.link.pickAnother'),
      });
      if (!ok) {
        setPicked(null);
        return;
      }
    }
    try {
      await link.mutateAsync({ id: goal.id, receiptId: picked });
      success();
      toast('toast.goal.linked');
      router.dismissTo('/goals');
    } catch (thrown) {
      // Spent or deleted on another phone meanwhile: done, with nothing to say.
      if (savingsRefusal(thrown)?.kind === 'gone') {
        router.dismissTo('/goals');
        return;
      }
      warn();
      setError(failureMessage(thrown));
      // The receipt may have gone, or another goal named it, since the list was read.
      setPicked(null);
      refetch();
    }
  };

  const read = Boolean(receipts.data && purchases.data);
  const failed = !read && (receipts.isError || purchases.isError);
  const empty = read && choices.near.length === 0 && choices.recent.length === 0;

  return (
    <Screen
      title={t('goals.link.title')}
      showBack
      footer={
        read && !empty ? (
          <View className="w-full">
            {error ? (
              <Text
                testID="goal-receipt-error"
                accessibilityRole="alert"
                className="mb-3 text-center font-app text-[13px] text-danger"
                maxFontSizeMultiplier={TEXT_CAP.reading}
              >
                {error}
              </Text>
            ) : null}
            <Button
              label={link.isPending ? t('receipts.add.saving') : t('goals.link.link')}
              onPress={handleLink}
              disabled={link.isPending}
            />
          </View>
        ) : undefined
      }
    >
      <Text
        className="mt-1 w-full text-center font-app text-[14px] leading-5 text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('goals.link.lead')}
      </Text>

      {!read && !failed ? <SkeletonList rows={4} /> : null}
      {failed ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={refetch}
        />
      ) : null}
      {empty ? (
        <Text
          className="mt-8 w-full text-center font-app text-[15px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('goals.link.none')}
        </Text>
      ) : null}

      {read && choices.near.length > 0 ? (
        <ChoiceGroup
          heading={t('goals.link.near', { amount: formatCurrency(goal.saved) })}
          receipts={choices.near}
          picked={picked}
          onPick={(next) => {
            setError(null);
            setPicked(next);
          }}
        />
      ) : null}
      {read && choices.recent.length > 0 ? (
        <ChoiceGroup
          heading={t('goals.link.recent')}
          receipts={choices.recent}
          picked={picked}
          onPick={(next) => {
            setError(null);
            setPicked(next);
          }}
        />
      ) : null}
      <View className="h-4 w-full" />
    </Screen>
  );
}

function ChoiceGroup({
  heading,
  receipts,
  picked,
  onPick,
}: {
  heading: string;
  receipts: readonly ReceiptRow[];
  picked: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <View className="mt-6 w-full">
      <Text
        accessibilityRole="header"
        className="mb-2 font-app-semibold text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {heading}
      </Text>
      <View
        accessibilityRole="radiogroup"
        className="w-full rounded-[20px] border border-line bg-card px-4"
      >
        {receipts.map((receipt, index) => (
          <ChoiceRow
            key={receipt.id}
            receipt={receipt}
            chosen={receipt.id === picked}
            first={index === 0}
            onPress={() => onPick(receipt.id)}
          />
        ))}
      </View>
    </View>
  );
}

function ChoiceRow({
  receipt,
  chosen,
  first,
  onPress,
}: {
  receipt: ReceiptRow;
  chosen: boolean;
  first: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const amount = formatCurrency(Number(receipt.amount));
  const date = formatFullDate(new Date(`${receipt.purchased_on}T00:00:00`));
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen, checked: chosen }}
      accessibilityLabel={`${receipt.merchant}, ${amount}, ${date}`}
      onPress={onPress}
      className={cn(
        'w-full flex-row items-center gap-3 py-3.5 active:opacity-60',
        !first && 'border-t border-line',
      )}
    >
      <BrandMark
        name={receipt.merchant}
        domain={logoDomainOf(receipt)}
        hidden={receipt.logo_hidden}
        size={40}
      />
      <View className="min-w-0 flex-1">
        <Text className="font-app-medium text-[15px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
          {receipt.merchant}
        </Text>
        <Text
          className="mt-0.5 font-app text-[12px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {date}
        </Text>
      </View>
      <Text
        className="shrink-0 font-app-semibold text-[15px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {amount}
      </Text>
      <View
        className={cn(
          'h-6 w-6 items-center justify-center rounded-full border',
          chosen ? 'border-accent bg-accent' : 'border-line',
        )}
      >
        {chosen ? <Check size={14} color={colors.onControl} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}
