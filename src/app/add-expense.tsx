import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronDown, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  memberName,
  useDeleteExpense,
  useGroup,
  useGroupExpenses,
  useGroupMembers,
  useRecordExpense,
  useUpdateExpense,
} from '@/api/splits';
import { AmountPad } from '@/components/ui/amount-pad';
import { AmountStep } from '@/components/flow/amount-step';
import { InlineCalendar } from '@/components/flow/inline-calendar';
import { StepFlow } from '@/components/flow/step-flow';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { useProGate } from '@/components/pro/pro-gate';
import { SelectField } from '@/components/ui/select-field';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { success, warn } from '@/lib/haptics';
import { saveErrorMessage } from '@/lib/save-error';
import { equalShares, exactRemainder } from '@/lib/split';
import { useConfirm } from '@/providers/dialog-provider';
import { useUserId } from '@/providers/session-provider';
import { useColors } from '@/providers/theme-provider';

type Mode = 'equal' | 'exact';

/**
 * Adding what somebody paid, and who it was for.
 *
 * Three steps over one piece of state: how much, what and who, then when.
 * Nothing is remounted between them, so going back keeps everything typed.
 *
 * The split has to add up to the total exactly — the database refuses anything
 * else, because shares that do not sum make every balance downstream wrong.
 * So the remainder is shown live while typing rather than saved up for an
 * error on submit: "$4.20 left to assign" while you work is help, and the same
 * fact after a failed save is a telling-off.
 */
export default function AddExpenseScreen() {
  // A wrapper, not an inline return: the screen below runs its own
  // hooks, and an early return above them would change the hook count
  // the moment the entitlement answer arrives — which React forbids.
  const gate = useProGate('splits');
  if (gate) return gate;
  return <AddExpenseScreenInner />;
}

/**
 * Waits for the group before the form exists, then seeds it by remount.
 *
 * Both queries matter. Without the expenses, an edit opens as a blank "add"
 * and would save a second expense rather than change the one you came for.
 * Without the members, a new expense starts with nobody ticked, when the whole
 * group is the default. The key remounts the form once the row lands, which is
 * how state gets seeded from data without an effect writing state during
 * render and fighting the first thing you type.
 */
function AddExpenseScreenInner() {
  const { group: groupId, id } = useLocalSearchParams<{ group?: string; id?: string }>();

  const { data: group } = useGroup(groupId);
  const members = useGroupMembers(groupId);
  const expenses = useGroupExpenses(groupId);

  const waiting = members.isLoading || (Boolean(id) && expenses.isLoading);

  // The shell with skeletons, never a $0 figure: a placeholder amount on an
  // expense that is still loading is a wrong number about somebody's money.
  if (waiting) {
    return (
      <StepFlow
        title={id ? 'Edit expense' : 'Add an expense'}
        steps={3}
        current={id ? 1 : 0}
        onBack={() => router.back()}
        primaryLabel="Continue"
        primaryDisabled
        onPrimary={() => {}}
      >
        <View className="w-full gap-6">
          <Skeleton className="h-14 w-full rounded-[12px]" />
          <Skeleton className="h-14 w-full rounded-full" />
          <Skeleton className="h-10 w-2/3 rounded-full" />
        </View>
      </StepFlow>
    );
  }

  const editing = (expenses.data ?? []).find((expense) => expense.id === id);

  return (
    <ExpenseForm
      key={editing?.id ?? 'new'}
      groupId={groupId}
      groupName={group?.name ?? null}
      members={members.data ?? []}
      editing={editing ?? null}
    />
  );
}

type ExpenseRecord = NonNullable<ReturnType<typeof useGroupExpenses>['data']>[number];
type MemberRecord = NonNullable<ReturnType<typeof useGroupMembers>['data']>[number];

function ExpenseForm({
  groupId,
  groupName,
  members,
  editing,
}: {
  groupId?: string;
  groupName: string | null;
  members: readonly MemberRecord[];
  editing: ExpenseRecord | null;
}) {
  const colors = useColors();
  const confirm = useConfirm();
  const userId = useUserId();

  const me = members.find((member) => member.user_id === userId);

  const [description, setDescription] = useState(editing?.description ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [paidBy, setPaidBy] = useState(editing?.paid_by ?? me?.id ?? '');
  const [spentOn, setSpentOn] = useState(
    editing ? new Date(`${editing.spent_on}T00:00:00`) : new Date(),
  );
  const [mode, setMode] = useState<Mode>(editing?.split_mode ?? 'equal');

  const [involved, setInvolved] = useState<string[]>(
    editing ? editing.splits.map((split) => split.member_id) : members.map((member) => member.id),
  );
  const [exact, setExact] = useState<Record<string, string>>(
    editing
      ? Object.fromEntries(editing.splits.map((split) => [split.member_id, String(split.share)]))
      : {},
  );

  // Editing opens on the details, not the keypad: somebody who came to change
  // a name should not have to re-type an amount that was already right.
  const [step, setStep] = useState(editing ? 1 : 0);
  const [padTarget, setPadTarget] = useState<string | null>(null);
  const [payerOpen, setPayerOpen] = useState(false);
  const [error, setError] = useState<{ message: string; step: number } | null>(null);

  const recordExpense = useRecordExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const total = Number(amount) || 0;

  const shares = useMemo(() => {
    if (mode === 'equal') return equalShares(involved, total);
    return involved.map((memberId) => ({ memberId, share: Number(exact[memberId]) || 0 }));
  }, [mode, involved, total, exact]);

  const remainder = mode === 'exact' ? exactRemainder(shares, total) : 0;
  const balanced = Math.abs(remainder) < 0.005;

  const toggle = (memberId: string) => {
    setInvolved((current) =>
      current.includes(memberId)
        ? current.filter((entry) => entry !== memberId)
        : [...current, memberId],
    );
  };

  /**
   * A check that belongs to an earlier step sends you back to it. Being told
   * about a field you cannot see is the same as not being told.
   */
  const fail = (message: string, atStep: number) => {
    warn();
    setError({ message, step: atStep });
    setStep(atStep);
  };

  const handleSave = async () => {
    setError(null);

    if (!groupId) return;
    if (!description.trim()) {
      fail('What was it for?', 1);
      return;
    }
    if (total <= 0) {
      fail('Enter how much it came to.', 0);
      return;
    }
    if (involved.length === 0) {
      fail('Pick at least one person to split it between.', 1);
      return;
    }
    if (!paidBy) {
      fail('Say who paid.', 1);
      return;
    }
    if (mode === 'exact' && !balanced) {
      fail(
        remainder > 0
          ? `${formatCurrency(remainder)} is still unassigned.`
          : `The shares come to ${formatCurrency(Math.abs(remainder))} more than the total.`,
        1,
      );
      return;
    }

    const values = {
      groupId,
      paidBy,
      amount: total,
      description: description.trim(),
      shares,
      spentOn: toIsoDate(spentOn),
      splitMode: mode,
    };

    try {
      if (editing) await updateExpense.mutateAsync({ ...values, id: editing.id });
      else await recordExpense.mutateAsync(values);
      success();
      router.back();
    } catch (thrown) {
      warn();
      setError({ message: saveErrorMessage(thrown, 'Could not save that expense.'), step: 2 });
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    const ok = await confirm({
      title: 'Delete this expense?',
      message: 'Everyone’s balance in the group will change to match.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteExpense.mutateAsync(editing.id);
      router.back();
    } catch (thrown) {
      setError({ message: saveErrorMessage(thrown, 'Could not delete that expense.'), step });
    }
  };

  const busy = recordExpense.isPending || updateExpense.isPending;

  const detailsReady = Boolean(description.trim()) && involved.length > 0 && Boolean(paidBy);
  const stepValid = step === 0 ? total > 0 : step === 1 ? detailsReady : !busy;

  const question = step === 0 ? 'How much did you spend?' : step === 2 ? 'When was it?' : undefined;

  const primaryLabel =
    step < 2 ? 'Continue' : busy ? 'Saving…' : editing ? 'Save changes' : 'Save expense';

  const stepError = error && error.step === step ? error.message : null;

  return (
    <StepFlow
      title={editing ? 'Edit expense' : 'Add an expense'}
      steps={3}
      current={step}
      onBack={() => {
        setError(null);
        if (step === 0) router.back();
        else setStep((current) => current - 1);
      }}
      question={question}
      primaryLabel={primaryLabel}
      primaryDisabled={!stepValid}
      onPrimary={() => {
        if (step < 2) {
          setError(null);
          setStep((current) => current + 1);
          return;
        }
        void handleSave();
      }}
      // Step 1 and 3 carry the message next to the field it belongs to; only
      // the keypad and the save error have nowhere else to put it.
      error={step === 1 ? null : stepError}
      avoidKeyboard={step === 1}
      footerSlot={
        editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete this expense"
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text
              className="font-poppins-medium text-[15px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
              Delete expense
            </Text>
          </Pressable>
        ) : null
      }
    >
      {step === 0 ? <AmountStep value={amount} onChange={setAmount} /> : null}

      {step === 1 ? (
        <View className="w-full gap-6">
          <TextField
            label="What for"
            value={description}
            onChangeText={setDescription}
            placeholder="Dinner, taxi, the weekly shop"
            maxLength={120}
            autoCapitalize="sentences"
          />

          <View className="w-full">
            <SelectField
              label="Paid by"
              variant="pill"
              value={memberName(members.find((member) => member.id === paidBy))}
              placeholder="Say who paid"
              icon={ChevronDown}
              onPress={() => setPayerOpen((open) => !open)}
            />

            {payerOpen ? (
              <View className="mt-2 w-full overflow-hidden rounded-[16px] bg-ink/5">
                {members.map((member) => (
                  <Pressable
                    key={member.id}
                    accessibilityRole="button"
                    accessibilityLabel={memberName(member)}
                    accessibilityState={{ selected: member.id === paidBy }}
                    onPress={() => {
                      setPaidBy(member.id);
                      setPayerOpen(false);
                    }}
                    className="min-h-12 w-full flex-row items-center justify-between gap-3 px-4 py-3 active:bg-ink/10"
                  >
                    <Text className="font-poppins text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
                      {memberName(member)}
                    </Text>
                    {member.id === paidBy ? (
                      <Check size={18} color={colors.ink} strokeWidth={2.4} />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View className="w-full">
            <FieldLabel className="mb-2">Split</FieldLabel>
            <ChoiceChips
              options={[
                { value: 'equal', label: 'Equally' },
                { value: 'exact', label: 'Exact amounts' },
              ]}
              value={mode}
              onChange={(next) => setMode(next as Mode)}
            />
          </View>

          <View className="w-full">
            <FieldLabel className="mb-2">
              {mode === 'equal' ? 'Between' : 'Who owes what'}
            </FieldLabel>
            <View className="h-px w-full bg-line" />

            {members.map((member) => {
              const included = involved.includes(member.id);
              const share = shares.find((entry) => entry.memberId === member.id)?.share ?? 0;

              return (
                <View key={member.id} className="w-full flex-row items-center gap-3 py-2">
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: included }}
                    accessibilityLabel={`Include ${memberName(member)}`}
                    onPress={() => toggle(member.id)}
                    className="min-h-11 min-w-0 flex-1 flex-row items-center gap-3 active:opacity-70"
                  >
                    <View
                      className={
                        included
                          ? 'h-5 w-5 items-center justify-center rounded-[5px] bg-accent'
                          : 'h-5 w-5 rounded-[6px] border border-line'
                      }
                    >
                      {included ? (
                        <Check size={13} color={colors.onControl} strokeWidth={3} />
                      ) : null}
                    </View>
                    <Text
                      className="min-w-0 flex-1 font-poppins text-[15px] text-ink"
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.3}
                    >
                      {memberName(member)}
                    </Text>
                  </Pressable>

                  {included && mode === 'exact' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${memberName(member)}'s share, ${formatCurrency(share)}`}
                      onPress={() => setPadTarget(member.id)}
                      className="min-h-11 min-w-[88px] items-end justify-center rounded-full bg-ink/5 px-4 active:bg-ink/10"
                    >
                      <Text
                        className="font-poppins-medium text-[14px] text-ink"
                        maxFontSizeMultiplier={1.3}
                      >
                        {formatCurrency(share)}
                      </Text>
                    </Pressable>
                  ) : included ? (
                    <Text
                      className="font-poppins-medium text-[14px] text-muted"
                      maxFontSizeMultiplier={1.3}
                    >
                      {formatCurrency(share)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Live, because it is guidance while typing rather than a verdict on
              what was typed. */}
          {mode === 'exact' && total > 0 ? (
            <Text
              className={
                balanced
                  ? 'w-full font-poppins text-[13px] text-accent-ink'
                  : 'w-full font-poppins text-[13px] text-ink'
              }
              maxFontSizeMultiplier={1.4}
            >
              {balanced
                ? 'The shares add up.'
                : remainder > 0
                  ? `${formatCurrency(remainder)} left to assign.`
                  : `${formatCurrency(Math.abs(remainder))} over the total.`}
            </Text>
          ) : null}

          {stepError ? (
            <Text
              className="w-full font-poppins text-[13px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
              {stepError}
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === 2 ? (
        <View className="w-full">
          <InlineCalendar value={spentOn} onChange={setSpentOn} />
          {groupName ? (
            <Text
              className="mt-6 w-full text-center font-poppins text-[13px] text-muted"
              maxFontSizeMultiplier={1.3}
            >
              Adding to {groupName}.
            </Text>
          ) : null}
        </View>
      ) : null}

      {padTarget ? (
        <AmountPad
          title={memberName(members.find((m) => m.id === padTarget))}
          caption="Their share"
          value={exact[padTarget] ?? ''}
          onCancel={() => setPadTarget(null)}
          onConfirm={(next) => {
            setExact((current) => ({ ...current, [padTarget]: next }));
            setPadTarget(null);
          }}
        />
      ) : null}
    </StepFlow>
  );
}
