import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useMonthUpdate, useSavingsPot, useUpdateSavingsMonth } from '@/api/savings';
import {
  MonthFiguresCard,
  MonthUpdateCard,
  PotHeroCard,
  PotStateCard,
  WhereItWentCard,
} from '@/components/savings/pot-detail-parts';
import { potPill, potState, potTitle } from '@/components/savings/pot-words';
import { QuietAction } from '@/components/savings/quiet-action';
import { dayMonthText, monthInSentence } from '@/components/savings/savings-words';
import { goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { success, warn } from '@/lib/haptics';
import { toCents } from '@/lib/money';
import type { PotView } from '@/lib/savings';
import { useToast } from '@/providers/toast-context';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

/** Under the figure: when it moved, when it was added, or why nothing moved. */
function heroCaption(pot: PotView): string {
  if (pot.kind === 'added') return t('savings.pot.addedOn', { date: dayMonthText(pot.added_on) });
  if (pot.status !== 'overspent') {
    return t('savings.pot.movedOn', { date: dayMonthText(pot.movedOn) });
  }
  const short = toCents(pot.leftOver);
  return short < 0
    ? t('savings.pot.overspent', { amount: formatCurrency(-pot.leftOver) })
    : t('savings.pot.nothingMoved');
}

/**
 * One month that moved to savings, or one amount added to it: what it is, where the month's pay
 * went, and how much of it is still waiting. The pencil changes or removes it.
 */
export default function SavingsPotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artwork = useArtwork();
  const { pot, isPending, isError, refetch } = useSavingsPot(id);
  const { update } = useMonthUpdate(id);
  const takeUpdate = useUpdateSavingsMonth();
  const toast = useToast();
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Removed from its edit page or on another phone. Only while this page is on top: under the edit
  // page, that page does the one navigation its Remove calls for.
  const focused = useIsFocused();
  const gone = !isPending && !isError && pot === null;
  useEffect(() => {
    if (gone && focused) goBack();
  }, [gone, focused]);

  const canSend = pot !== null && toCents(pot.left) > 0;

  // Late pay or spending is offered, never applied on its own: the month stays as it closed until
  // the person takes the new figure.
  const acceptUpdate = async () => {
    if (!pot || !update || takeUpdate.isPending) return;
    setUpdateError(null);
    try {
      await takeUpdate.mutateAsync({ id: pot.id, earned: update.earned, spent: update.spent });
      success();
      toast('toast.savings.updated');
    } catch (thrown) {
      warn();
      setUpdateError(failureMessage(thrown));
    }
  };
  // An amount typed by hand is anything but what the month's own figures left over, or that held up
  // to what is in goals, as a capped update leaves it.
  const handSet = (() => {
    if (!pot || pot.kind !== 'month') return false;
    const leftOver = toCents(pot.earned ?? 0) - toCents(pot.spent ?? 0);
    const amount = toCents(pot.amount);
    return (
      amount !== Math.max(0, leftOver) && amount !== Math.max(leftOver, toCents(pot.sentFromIt))
    );
  })();

  return (
    <Screen
      title={pot ? potTitle(pot) : undefined}
      showBack
      headerActions={
        pot
          ? [
              {
                icon: Pencil,
                label: t('savings.pot.edit'),
                onPress: () => router.push({ pathname: '/savings-entry', params: { id: pot.id } }),
              },
            ]
          : undefined
      }
      onRefresh={refetch}
      footer={
        canSend ? (
          <View className="w-full items-center gap-1">
            <Button
              label={t('savings.send')}
              onPress={() => router.push({ pathname: '/send-to-goals', params: { pot: pot.id } })}
            />
            <QuietAction label={t('savings.keep')} onPress={goBack} />
          </View>
        ) : undefined
      }
    >
      {isPending ? <SkeletonList rows={3} /> : null}

      {/* A failed reload behind a page already drawn keeps the page. */}
      {isError && !pot ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={refetch}
        />
      ) : null}

      {pot ? (
        <>
          <PotHeroCard
            label={t(pot.kind === 'month' ? 'savings.pot.leftOver' : 'savings.pot.added')}
            amount={pot.amount}
            status={potPill(pot)}
            caption={heroCaption(pot)}
          />
          {pot.kind === 'month' ? (
            <>
              <MonthFiguresCard
                variant="detail"
                earned={pot.earned ?? 0}
                spent={pot.spent ?? 0}
                last={pot.leftOver}
              />
              <WhereItWentCard earned={pot.earned ?? 0} spent={pot.spent ?? 0} />
            </>
          ) : null}
          {potState(pot) ? <PotStateCard state={potState(pot)!} /> : null}
          {pot.note ? (
            <View
              testID="pot-note"
              className="mb-2 mt-4 w-full rounded-[20px] border border-line bg-card px-[20px] py-[16px]"
            >
              <Text
                className="font-app text-[13px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {t('savings.entry.note')}
              </Text>
              <Text
                className="mt-[4px] font-app text-[15px] leading-[21px] text-body"
                maxFontSizeMultiplier={TEXT_CAP.reading}
              >
                {pot.note}
              </Text>
            </View>
          ) : null}
          {pot.kind === 'month' && pot.month && update ? (
            <>
              <MonthUpdateCard
                month={monthInSentence(pot.month)}
                earnedChange={update.earnedChange}
                spentChange={update.spentChange}
                amount={update.amount}
                capped={update.capped}
                replaces={handSet ? pot.amount : null}
                busy={takeUpdate.isPending}
                onUpdate={acceptUpdate}
              />
              {updateError ? (
                <Text
                  testID="update-error"
                  className="mt-2 w-full text-center font-app text-[13px] text-danger"
                  maxFontSizeMultiplier={TEXT_CAP.reading}
                >
                  {updateError}
                </Text>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
