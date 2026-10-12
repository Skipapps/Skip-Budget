import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useDeleteGoal, useGoal, useSaveGoal } from '@/api/goals';
import { savingsRefusal } from '@/api/savings';
import { GoalPlanCard } from '@/components/savings/goal-detail-parts';
import { GoalFigures } from '@/components/savings/goal-figures';
import { GoalTypeGrid } from '@/components/savings/goal-type-grid';
import { QuietAction } from '@/components/savings/quiet-action';
import { refusalLine } from '@/components/savings/refusal-words';
import { lastDayOfMonth } from '@/components/savings/savings-words';
import { goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { goalIconOf, type GoalType } from '@/data/goal-types';
import { t } from '@/i18n';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { goalPlan, type GoalView } from '@/lib/goals';
import { success, warn } from '@/lib/haptics';
import { fromCents, toCents } from '@/lib/money';
import { finishFlowOn } from '@/lib/nav';
import { useToday } from '@/lib/use-today';
import { useConfirm, useDialog } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

const NAME_MAX = 40;

type Figures = { target: number; month: string | null; saved: number };

/** A number from a route param, or the fallback when it is not one. */
const numberParam = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Names a goal and picks its type: a new one from the calculator's figures (`?target=&date=&saved=`),
 * which lands on Goals, or back on the Send page it was started from (`&from=send`); or a saved one
 * (`?id=`), with its figures here too and Delete at the end.
 */
export default function SaveGoalScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    target?: string;
    date?: string;
    saved?: string;
    from?: string;
  }>();
  const artwork = useArtwork();
  const existing = useGoal(params.id);
  const focused = useIsFocused();

  // The goal as last read: Delete reloads goals before this page leaves, and the form stays drawn
  // until it does, rather than flash the failure page.
  const [kept, setKept] = useState<GoalView | null>(null);
  if (existing.goal && existing.goal !== kept) setKept(existing.goal);
  const goal = existing.goal ?? kept;

  // An id that matches no open goal (gone on another phone before this opened): leave quietly.
  const missing = Boolean(params.id) && !existing.isPending && !existing.isError && !goal;
  useEffect(() => {
    if (missing && focused) goBack();
  }, [missing, focused]);

  if (!params.id) {
    const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : null;
    return (
      <GoalForm
        goal={null}
        fromSend={params.from === 'send'}
        initial={{
          target: numberParam(params.target, 0),
          month: date ? date.slice(0, 7) : null,
          saved: numberParam(params.saved, 0),
        }}
      />
    );
  }

  if (goal) {
    // Keyed, so the form seeds from the goal once it is read.
    return (
      <GoalForm
        key={goal.id}
        goal={goal}
        fromSend={false}
        initial={{
          target: goal.target,
          month: goal.target_date ? goal.target_date.slice(0, 7) : null,
          saved: goal.start_amount,
        }}
      />
    );
  }

  return (
    <Screen title={t('goals.detail.edit')} showBack>
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

function GoalForm({
  goal,
  initial,
  fromSend,
}: {
  goal: GoalView | null;
  initial: Figures;
  /** Started from the Send page with no goals: it goes back there, with this goal on it. */
  fromSend: boolean;
}) {
  const { today } = useToday();
  const toast = useToast();
  const confirm = useConfirm();
  const ask = useDialog();
  const save = useSaveGoal();
  const remove = useDeleteGoal();

  const [name, setName] = useState(goal?.name ?? '');
  // No type until the person picks one, as on the app's other final pages.
  const [type, setType] = useState<GoalType | null>(goal ? goalIconOf(goal.icon_id) : null);
  const [target, setTarget] = useState(initial.target);
  const [month, setMonth] = useState(initial.month);
  const [saved, setSaved] = useState(initial.saved);
  const [error, setError] = useState<string | null>(null);

  const targetDate = month ? lastDayOfMonth(month) : null;
  // What a saved goal holds with the starting amount as now typed: the sends stay as they were.
  const holds = goal
    ? fromCents(toCents(goal.saved) - toCents(goal.start_amount) + toCents(saved))
    : saved;
  const plan = goalPlan({ target, alreadySaved: holds, targetDate, today });
  const thisMonth = today.slice(0, 7);
  // A saved goal may keep a month already behind it; only a new date has to be ahead.
  const from = initial.month && initial.month < thisMonth ? initial.month : thisMonth;

  const fail = (line: string) => {
    warn();
    setError(line);
  };

  const handleSave = async () => {
    if (save.isPending) return;
    setError(null);
    const missing = [
      !name.trim() && t('goals.save.name'),
      !type && t('goals.save.type'),
      toCents(target) <= 0 && t('goals.calculator.targetLabel'),
    ].filter((field): field is string => Boolean(field));
    if (missing.length > 0 || !type) {
      fail(t('goals.save.missing', { fields: missing.join(', ') }));
      return;
    }
    try {
      await save.mutateAsync({
        id: goal?.id ?? null,
        values: {
          name: name.trim(),
          icon_id: type,
          target,
          target_date: targetDate,
          start_amount: saved,
        },
      });
      success();
      if (goal) {
        toast('toast.goal.updated');
        goBack();
      } else {
        toast('toast.goal.added');
        if (fromSend) {
          // The calculator and this page go; the Send page under them now lists the new goal.
          router.dismiss(2);
        } else {
          // Every step of the flow goes, so Back from Goals never reopens it.
          finishFlowOn('/goals');
        }
      }
    } catch (thrown) {
      const refusal = savingsRefusal(thrown);
      // Deleted or closed on another phone while this was open: done, with nothing to say.
      if (goal && refusal?.kind === 'gone') {
        router.dismissTo('/goals');
        return;
      }
      fail(refusalLine(refusal, name.trim()) ?? failureMessage(thrown));
    }
  };

  const handleDelete = async () => {
    if (!goal || remove.isPending) return;
    setError(null);
    const title = t('goals.detail.deleteTitle', { name: goal.name });
    let returnMoney = true;
    if (toCents(goal.fromSavings) > 0) {
      const amount = formatCurrency(goal.fromSavings);
      const choice = await ask({
        title,
        message: t('goals.detail.deleteMoney', { amount }),
        actions: [
          { id: 'back', label: t('goals.detail.putBack', { amount }) },
          { id: 'spent', label: t('goals.detail.spentIt') },
        ],
      });
      if (!choice) return;
      returnMoney = choice === 'back';
    } else {
      const ok = await confirm({
        title,
        message: t('goals.detail.deleteEmpty'),
        confirmLabel: t('goals.detail.delete'),
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await remove.mutateAsync({ id: goal.id, returnMoney });
      toast('toast.goal.deleted', 'deleted');
      // Its own page is gone with it.
      router.dismissTo('/goals');
    } catch (thrown) {
      const refusal = savingsRefusal(thrown);
      if (refusal?.kind === 'gone') {
        router.dismissTo('/goals');
        return;
      }
      fail(refusalLine(refusal, goal.name) ?? failureMessage(thrown));
    }
  };

  return (
    <Screen
      title={goal ? t('goals.detail.edit') : t('goals.save.title')}
      showBack
      avoidKeyboard
      footer={
        <View className="w-full">
          {error ? (
            <Text
              testID="goal-error"
              className="mb-3 text-center font-app text-[13px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {error}
            </Text>
          ) : null}
          <Button
            label={
              save.isPending
                ? t('goals.save.saving')
                : goal
                  ? t('goals.save.saveChanges')
                  : t('goals.save.saveToGoals')
            }
            onPress={handleSave}
            disabled={save.isPending}
          />
        </View>
      }
    >
      {!goal ? (
        <Text
          className="mt-1 w-full text-center font-app text-[14px] leading-5 text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('goals.save.subtitle')}
        </Text>
      ) : null}

      <View className="mt-3 w-full">
        <GoalPlanCard
          target={target}
          targetDate={targetDate}
          weekly={plan.weekly}
          monthly={plan.monthly}
          alreadyThere={toCents(holds) >= toCents(target)}
        />
      </View>

      <TextField
        className="mt-6"
        filled
        label={t('goals.save.name')}
        value={name}
        onChangeText={(next) => {
          setError(null);
          setName(next.slice(0, NAME_MAX));
        }}
        placeholder={t('goals.save.namePlaceholder')}
        autoCapitalize="sentences"
        returnKeyType="done"
      />

      <View className="mt-6 w-full">
        <FieldLabel className="mb-2">{t('goals.save.type')}</FieldLabel>
        <GoalTypeGrid
          value={type}
          onChange={(next) => {
            setError(null);
            setType(next);
          }}
        />
      </View>

      {goal ? (
        <>
          <GoalFigures
            target={target}
            onTarget={(next) => {
              setError(null);
              setTarget(next);
            }}
            month={month}
            onMonth={setMonth}
            saved={saved}
            onSaved={setSaved}
            from={from}
          />
          <QuietAction
            className="mb-4 mt-4"
            tone="danger"
            label={t('goals.detail.delete')}
            onPress={handleDelete}
            disabled={remove.isPending}
            testID="goal-delete"
          />
        </>
      ) : (
        <View className="mb-4" />
      )}
    </Screen>
  );
}
