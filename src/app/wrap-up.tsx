import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useMarkWrapUpSeen, useSavingsCore } from '@/api/savings';
import { MonthFiguresCard } from '@/components/savings/pot-detail-parts';
import { CloseHeader, QuietAction } from '@/components/savings/quiet-action';
import {
  capitalised,
  monthInSentence,
  monthName,
  shortMoney,
} from '@/components/savings/savings-words';
import { noteWrapUpShown } from '@/components/savings/use-wrap-up-auto-show';
import { WrapUpHero } from '@/components/savings/wrap-up-hero';
import { goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { toCents } from '@/lib/money';
import { movesToSavingsOn } from '@/lib/savings';
import { useUserId } from '@/providers/session-provider';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** How often to look again for a month still being closed, and when to stop looking. */
const POLL_MS = 4_000;
const GIVE_UP_MS = 30_000;

/**
 * The month wrap-up (`?month=yyyy-mm`): what came in, what went out, and what moved to savings.
 * Opened once on its own after the month closes, or from the 9:00 notification, which can arrive
 * before the close has run: then it waits, calmly, and goes back if the month never comes.
 */
export default function WrapUpScreen() {
  const params = useLocalSearchParams<{ month?: string }>();
  const month = typeof params.month === 'string' && MONTH.test(params.month) ? params.month : null;
  const colors = useColors();
  const savings = useSavingsCore();
  const { mutateAsync: markSeen } = useMarkWrapUpSeen();
  const marked = useRef(false);

  const pot =
    savings.summary.pots.find(
      (view) => view.kind === 'month' && view.month?.startsWith(month ?? '-'),
    ) ?? null;

  const userId = useUserId();
  useEffect(() => {
    if (month) noteWrapUpShown(userId, month);
    else goBack();
  }, [month, userId]);

  // Seen once shown, so neither the auto-show nor a later open brings it back by itself.
  useEffect(() => {
    if (!pot || !month || marked.current || pot.wrap_up_seen_at) return;
    marked.current = true;
    markSeen(month).catch(() => {
      marked.current = false;
    });
  }, [pot, month, markSeen]);

  // A ref: the hook hands back a new refetch on every render, which would restart the clock.
  const refetch = useRef(savings.refetch);
  useEffect(() => {
    refetch.current = savings.refetch;
  });
  const waiting = Boolean(month) && !pot;
  useEffect(() => {
    if (!waiting) return;
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started >= GIVE_UP_MS) {
        clearInterval(timer);
        goBack();
      } else {
        refetch.current();
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [waiting]);

  const monthWord = month ? monthInSentence(`${month}-01`) : '';

  if (!pot) {
    return (
      <Screen header={<CloseHeader onClose={goBack} />}>
        <View testID="wrap-up-waiting" className="w-full flex-1 items-center justify-center py-16">
          <ActivityIndicator color={colors.muted} />
          <Text
            className="mt-4 text-center font-app text-[15px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {month ? t('savings.wrapUp.getting', { month: monthWord }) : ''}
          </Text>
        </View>
      </Screen>
    );
  }

  const celebrate = toCents(pot.amount) > 0;
  const short = toCents(pot.leftOver) < 0;
  const title = celebrate
    ? t('savings.wrapUp.saved', { amount: shortMoney(pot.amount) })
    : short
      ? t('savings.pot.overspent', { amount: formatCurrency(-pot.leftOver) })
      : t('savings.status.nothing');
  const subtitle = celebrate
    ? t('savings.wrapUp.howWent', { month: monthWord })
    : t('savings.wrapUp.freshStart', { month: monthName(movesToSavingsOn(pot.month!)) });

  return (
    <Screen
      header={<CloseHeader onClose={goBack} />}
      footer={
        celebrate ? (
          <View className="w-full items-center gap-1">
            <Button
              label={t('savings.send')}
              // In the wrap-up's place, so Done on the Sent page goes back to where this was opened.
              onPress={() =>
                router.replace({ pathname: '/send-to-goals', params: { pot: pot.id } })
              }
            />
            <QuietAction label={t('savings.wrapUp.later')} onPress={goBack} />
          </View>
        ) : (
          <Button label={t('savings.wrapUp.gotIt')} onPress={goBack} />
        )
      }
    >
      <WrapUpHero
        celebrate={celebrate}
        kicker={capitalised(t('savings.wrapUp.kicker', { month: monthWord }))}
        title={title}
        subtitle={subtitle}
      />
      <MonthFiguresCard
        variant="wrapUp"
        earned={pot.earned ?? 0}
        spent={pot.spent ?? 0}
        last={pot.amount}
      />
      {celebrate ? (
        <Text
          className="mb-4 mt-[20px] w-full px-4 text-center font-app text-[14px] leading-5 text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('savings.wrapUp.waiting')}
        </Text>
      ) : null}
    </Screen>
  );
}
