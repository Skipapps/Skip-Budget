import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useGoals } from '@/api/goals';
import { savingsRefusal, useSavingsCore, useSendToGoals } from '@/api/savings';
import { GoalInviteCard } from '@/components/savings/goal-cards';
import { GoalSendCard, SendFromCard, SendTotals } from '@/components/savings/goal-send-card';
import { potName } from '@/components/savings/pot-words';
import { QuietAction } from '@/components/savings/quiet-action';
import { refusalLine } from '@/components/savings/refusal-words';
import { shortMoney } from '@/components/savings/savings-words';
import { AmountPad } from '@/components/ui/amount-pad';
import { goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { RefreshNote } from '@/components/ui/refresh-note';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { SectionHeading } from '@/components/ui/typography';
import { t } from '@/i18n';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { clampSend, splitEvenly, type GoalView } from '@/lib/goals';
import { selection, success, warn } from '@/lib/haptics';
import { fromCents, toCents } from '@/lib/money';
import type { PotView } from '@/lib/savings';
import { useToast } from '@/providers/toast-context';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

const STEP = 10;
const CHIP = 50;

/**
 * Sends savings to goals: how much each goal gets, by the stepper, "+$50", Fill goal or typed, never
 * more than is ready or than a goal still needs. `?goal=` puts that goal first, already filled as
 * far as savings go; `?pot=` (a month's page) sends that month's money first.
 */
export default function SendToGoalsScreen() {
  const { goal: first, pot } = useLocalSearchParams<{ goal?: string; pot?: string }>();
  const artwork = useArtwork();
  const savings = useSavingsCore();
  const goals = useGoals();
  const refresh = () => {
    savings.refetch();
    goals.refetch();
  };

  if (savings.isPending || goals.isPending) {
    return (
      <Screen title={t('savings.sendPage.title')} showBack>
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  // Only when a read has nothing to show: a failed reload behind the page keeps it, and what was
  // typed. Ready to send worked out without the moves would offer money already in goals.
  const unread =
    (savings.isError && !savings.refreshFailed) || (goals.isError && !goals.refreshFailed);
  if (unread) {
    return (
      <Screen title={t('savings.sendPage.title')} showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={refresh}
        />
      </Screen>
    );
  }

  const active = goals.summary.active;
  const ordered = first
    ? [...active.filter((goal) => goal.id === first), ...active.filter((goal) => goal.id !== first)]
    : active;

  return (
    <SendForm
      available={savings.summary.readyToUse}
      pots={savings.summary.withMoneyLeft}
      goals={ordered}
      fillFirst={Boolean(first) && ordered[0]?.id === first}
      preferPotId={pot ?? null}
      onGone={refresh}
      refreshFailed={savings.refreshFailed || goals.refreshFailed}
    />
  );
}

function SendForm({
  available,
  pots,
  goals,
  fillFirst,
  preferPotId,
  onGone,
  refreshFailed,
}: {
  available: number;
  pots: readonly PotView[];
  goals: readonly GoalView[];
  fillFirst: boolean;
  preferPotId: string | null;
  /** A goal or pot went on another phone: read again, and the page drops it. */
  onGone: () => void;
  refreshFailed: boolean;
}) {
  const toast = useToast();
  const send = useSendToGoals();
  const needs = goals.map((goal) => goal.need);
  // By goal id, so a list refreshed under the page (a goal reached on another phone) cannot shift
  // one goal's amount onto another.
  const [byGoal, setByGoal] = useState<Record<string, number>>(() => {
    if (!fillFirst || goals.length === 0) return {};
    const next = clampSend({
      available,
      amounts: goals.map(() => 0),
      needs,
      index: 0,
      next: needs[0],
    });
    return { [goals[0].id]: next };
  });
  const amounts = goals.map((goal) => byGoal[goal.id] ?? 0);
  // One per visit: sending again after a lost answer is answered by the server, not sent twice.
  const [batchId] = useState(() => randomUUID());
  const [typing, setTyping] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = fromCents(amounts.reduce((sum, amount) => sum + toCents(amount), 0));
  const stays = fromCents(Math.max(0, toCents(available) - toCents(total)));
  const fit = (index: number, next: number) =>
    clampSend({ available, amounts, needs, index, next });
  const set = (index: number, next: number) => {
    setError(null);
    setByGoal((current) => ({ ...current, [goals[index].id]: fit(index, next) }));
  };

  const handleSend = async () => {
    if (send.isPending) return;
    setError(null);
    const items = goals
      .map((goal, index) => ({ goalId: goal.id, amount: amounts[index] }))
      .filter((item) => toCents(item.amount) > 0);
    if (items.length === 0) {
      warn();
      setError(t('savings.sendPage.nothing'));
      return;
    }
    try {
      const result = await send.mutateAsync({ items, preferPotId, batchId });
      success();
      toast('toast.goals.sent');
      // The Sent page takes this one's place, so Done and Back both return to where it began. It
      // gets the send's own answer, in this page's order, in case the reload behind it is late.
      router.replace({
        pathname: '/goals-sent',
        params: {
          batch: result.batchId,
          sent: result.goals.map((line) => `${line.goalId}:${line.amount}:${line.after}`).join(','),
          stays: String(stays),
        },
      });
    } catch (thrown) {
      const refusal = savingsRefusal(thrown);
      if (refusal?.kind === 'gone') {
        onGone();
        return;
      }
      warn();
      const named = goals.find((goal) => goal.id === refusal?.id)?.name;
      setError(refusalLine(refusal, named) ?? failureMessage(thrown));
    }
  };

  if (goals.length === 0) {
    return (
      <Screen
        title={t('savings.sendPage.title')}
        showBack
        footer={
          <View className="w-full items-center gap-1">
            <Button
              label={t('goals.new')}
              onPress={() =>
                router.push({ pathname: '/goal-calculator', params: { from: 'send' } })
              }
            />
            <QuietAction label={t('savings.keep')} onPress={goBack} />
          </View>
        }
      >
        <SendFromCard
          available={available}
          pots={pots.map((pot) => ({ name: potName(pot), amount: pot.left }))}
        />
        <RefreshNote show={refreshFailed} />
        <GoalInviteCard on="send" />
      </Screen>
    );
  }

  const typed = typing === null ? null : goals[typing];

  return (
    <Screen
      title={t('savings.sendPage.title')}
      showBack
      footer={
        <View className="w-full">
          <SendTotals toGoals={total} stays={stays} />
          {error ? (
            <Text
              testID="send-error"
              className="mb-3 text-center font-app text-[13px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {error}
            </Text>
          ) : null}
          <Button
            label={
              send.isPending
                ? t('savings.sendPage.sending')
                : t('savings.sendPage.button', { amount: shortMoney(total) })
            }
            onPress={handleSend}
            disabled={send.isPending}
          />
        </View>
      }
    >
      <SendFromCard
        available={available}
        pots={pots.map((pot) => ({ name: potName(pot), amount: pot.left }))}
      />
      <RefreshNote show={refreshFailed} />

      <View className="mb-3 mt-6 w-full flex-row flex-wrap items-baseline justify-between gap-x-3 px-1">
        <View className="min-w-0 shrink">
          <SectionHeading>{t('savings.sendPage.yourGoals')}</SectionHeading>
        </View>
        {goals.length > 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('savings.sendPage.splitEvenly')}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            onPress={() => {
              selection();
              setError(null);
              const shares = splitEvenly(available, needs);
              setByGoal(Object.fromEntries(goals.map((goal, index) => [goal.id, shares[index]])));
            }}
            testID="split-evenly"
            className="active:opacity-60"
          >
            <Text
              className="font-app-medium text-[14px] text-accent-ink"
              maxFontSizeMultiplier={TEXT_CAP.heading}
            >
              {t('savings.sendPage.splitEvenly')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mb-4 w-full gap-3">
        {goals.map((goal, index) => {
          const amount = amounts[index];
          const grows = (next: number) => toCents(fit(index, next)) > toCents(amount);
          return (
            <GoalSendCard
              key={goal.id}
              id={goal.id}
              name={goal.name}
              iconId={goal.icon_id}
              targetDate={goal.target_date}
              saved={goal.saved}
              target={goal.target}
              percent={goal.percent}
              amount={amount}
              step={STEP}
              chip={CHIP}
              onLess={() => set(index, amount - STEP)}
              onMore={() => set(index, amount + STEP)}
              onType={() => setTyping(index)}
              onChip={() => set(index, amount + CHIP)}
              onFill={() => set(index, needs[index])}
              canLess={toCents(amount) > 0}
              canMore={grows(amount + STEP)}
              canChip={grows(amount + CHIP)}
              canFill={grows(needs[index])}
            />
          );
        })}
      </View>

      {typed !== null && typing !== null ? (
        <AmountPad
          title={t('savings.sendPage.typeTitle', { name: typed.name })}
          caption={t('savings.sendPage.upTo', {
            amount: formatCurrency(fit(typing, typed.need)),
          })}
          value={toCents(amounts[typing]) > 0 ? String(amounts[typing]) : ''}
          onCancel={() => setTyping(null)}
          check={(draft) => {
            const next = Number(draft) || 0;
            if (toCents(next) > toCents(typed.need)) {
              return t('savings.sendPage.needs', {
                name: typed.name,
                amount: formatCurrency(typed.need),
              });
            }
            if (toCents(fit(typing, next)) < toCents(next)) {
              return t('savings.sendPage.room', { amount: formatCurrency(fit(typing, next)) });
            }
            return null;
          }}
          onConfirm={(draft) => {
            set(typing, Number(draft) || 0);
            setTyping(null);
          }}
        />
      ) : null}
    </Screen>
  );
}
