import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, Check, Trash2, Wallet } from 'lucide-react-native';
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
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Title } from '@/components/ui/typography';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { equalShares, exactRemainder } from '@/lib/split';
import { useConfirm } from '@/providers/dialog-provider';
import { useUserId } from '@/providers/session-provider';
import { useColors } from '@/providers/theme-provider';

type Mode = 'equal' | 'exact';

/**
 * Adding what somebody paid, and who it was for.
 *
 * The split has to add up to the total exactly — the database refuses anything
 * else, because shares that do not sum make every balance downstream wrong.
 * So the remainder is shown live while typing rather than saved up for an
 * error on submit: "$4.20 left to assign" while you work is help, and the same
 * fact after a failed save is a telling-off.
 */
export default function AddExpenseScreen() {
  const colors = useColors();
  const confirm = useConfirm();
  const userId = useUserId();
  const { group: groupId, id } = useLocalSearchParams<{ group?: string; id?: string }>();

  const { data: group } = useGroup(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const { data: expenses = [] } = useGroupExpenses(groupId);

  const editing = expenses.find((expense) => expense.id === id);
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

  const [padTarget, setPadTarget] = useState<'total' | string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [payerOpen, setPayerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSave = async () => {
    setError(null);

    if (!groupId) return;
    if (!description.trim()) {
      setError('What was it for?');
      return;
    }
    if (total <= 0) {
      setError('Enter how much it came to.');
      return;
    }
    if (involved.length === 0) {
      setError('Pick at least one person to split it between.');
      return;
    }
    if (!paidBy) {
      setError('Say who paid.');
      return;
    }
    if (mode === 'exact' && !balanced) {
      setError(
        remainder > 0
          ? `${formatCurrency(remainder)} is still unassigned.`
          : `The shares come to ${formatCurrency(Math.abs(remainder))} more than the total.`,
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
      router.back();
    } catch (thrown) {
      setError((thrown as Error).message);
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
      setError((thrown as Error).message);
    }
  };

  const busy = recordExpense.isPending || updateExpense.isPending;

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">{editing ? 'Edit expense' : 'Add expense'}</Title>

      <View className="mt-7 w-full gap-6">
        <TextField
          label="What for"
          value={description}
          onChangeText={setDescription}
          placeholder="Dinner, taxi, the weekly shop"
          maxLength={120}
          autoCapitalize="sentences"
        />

        <SelectField
          label="Amount"
          value={total > 0 ? formatCurrency(total) : ''}
          placeholder="Enter an amount"
          icon={Wallet}
          onPress={() => setPadTarget('total')}
        />

        <SelectField
          label="Paid by"
          value={memberName(members.find((member) => member.id === paidBy))}
          onPress={() => setPayerOpen((open) => !open)}
        />

        {payerOpen ? (
          <View className="w-full rounded-[10px] border border-line">
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
                className="min-h-12 w-full flex-row items-center justify-between gap-3 px-4 py-3 active:bg-ink/5"
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

        <SelectField
          label="When"
          value={formatFullDate(spentOn)}
          icon={Calendar}
          onPress={() => setDateOpen(true)}
        />

        <View className="w-full">
          <FieldLabel className="mb-2">Split</FieldLabel>
          <SegmentedControl
            options={[
              { value: 'equal', label: 'Equally' },
              { value: 'exact', label: 'Exact amounts' },
            ]}
            value={mode}
            onChange={(next) => setMode(next as Mode)}
          />
        </View>

        <View className="w-full">
          <FieldLabel className="mb-2">{mode === 'equal' ? 'Between' : 'Who owes what'}</FieldLabel>
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
                        : 'border-line-strong h-5 w-5 rounded-[5px] border'
                    }
                  >
                    {included ? <Check size={13} color={colors.onControl} strokeWidth={3} /> : null}
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
                    className="min-h-11 min-w-[88px] items-end justify-center rounded-[8px] border border-line px-3 active:bg-ink/5"
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

        {error ? (
          <Text
            className="w-full font-poppins text-[13px] text-red-600"
            maxFontSizeMultiplier={1.4}
          >
            {error}
          </Text>
        ) : null}
      </View>

      <View className="mt-auto w-full gap-3 pb-8 pt-10">
        <Button
          label={busy ? 'Saving…' : editing ? 'Save changes' : `Add to ${group?.name ?? 'group'}`}
          onPress={handleSave}
          disabled={busy}
        />
        {editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete this expense"
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-[10px] active:bg-ink/5"
          >
            <Trash2 size={17} color="#DC2626" strokeWidth={1.9} />
            <Text
              className="font-poppins-medium text-[15px] text-red-600"
              maxFontSizeMultiplier={1.4}
            >
              Delete expense
            </Text>
          </Pressable>
        ) : null}
      </View>

      {dateOpen ? (
        <DatePicker
          value={spentOn}
          onCancel={() => setDateOpen(false)}
          onConfirm={(next) => {
            setSpentOn(next);
            setDateOpen(false);
          }}
        />
      ) : null}

      {padTarget ? (
        <AmountPad
          title={
            padTarget === 'total' ? 'Amount' : memberName(members.find((m) => m.id === padTarget))
          }
          caption={padTarget === 'total' ? description || 'What it came to' : 'Their share'}
          value={padTarget === 'total' ? amount : (exact[padTarget] ?? '')}
          onCancel={() => setPadTarget(null)}
          onConfirm={(next) => {
            if (padTarget === 'total') setAmount(next);
            else setExact((current) => ({ ...current, [padTarget]: next }));
            setPadTarget(null);
          }}
        />
      ) : null}
    </Screen>
  );
}
