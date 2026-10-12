import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { GoalFigures } from '@/components/savings/goal-figures';
import { GoalPlanCard } from '@/components/savings/goal-detail-parts';
import { lastDayOfMonth, monthsAfter } from '@/components/savings/savings-words';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { goalPlan } from '@/lib/goals';
import { toCents } from '@/lib/money';
import { useToday } from '@/lib/use-today';

/**
 * A new goal's figures, as the loan calculator works a loan: how much, by when, and what is already
 * put aside, with what that asks for a week and a month. Continue names it on the save page;
 * `?from=send` carries on to it, so the new goal lands back on the Send page.
 */
export default function GoalCalculatorScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { today } = useToday();
  const thisMonth = today.slice(0, 7);
  const [target, setTarget] = useState(1_000);
  const [month, setMonth] = useState<string | null>(() => monthsAfter(thisMonth, 6));
  const [saved, setSaved] = useState(0);

  const targetDate = month ? lastDayOfMonth(month) : null;
  const plan = goalPlan({ target, alreadySaved: saved, targetDate, today });

  return (
    <Screen
      title={t('goals.calculator.title')}
      showBack
      footer={
        <Button
          label={t('common.continue')}
          onPress={() =>
            router.push({
              pathname: '/save-goal',
              params: {
                target: String(target),
                date: targetDate ?? '',
                saved: String(saved),
                // Started from the Send page with no goals: the save page returns there.
                ...(from === 'send' ? { from } : {}),
              },
            })
          }
        />
      }
    >
      <View className="w-full">
        <GoalPlanCard
          target={target}
          targetDate={targetDate}
          weekly={plan.weekly}
          monthly={plan.monthly}
          alreadyThere={toCents(saved) >= toCents(target)}
        />
      </View>
      <GoalFigures
        target={target}
        onTarget={setTarget}
        month={month}
        onMonth={setMonth}
        saved={saved}
        onSaved={setSaved}
        from={thisMonth}
      />
    </Screen>
  );
}
