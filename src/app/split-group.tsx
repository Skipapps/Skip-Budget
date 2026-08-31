import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Plus, Settings2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  memberName,
  useGroup,
  useGroupBalances,
  useGroupExpenses,
  useGroupMembers,
  useGroupSettlements,
  type ExpenseRow as ExpenseRowType,
} from '@/api/splits';
import { GroupIcon } from '@/components/splits/group-icon';
import { useRefreshAll } from '@/api/refresh';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { useProGate } from '@/components/pro/pro-gate';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';
import { toIsoDate } from '@/lib/date';
import { groupByDate } from '@/lib/group';
import { formatCurrency } from '@/lib/format';
import { simplifyDebts } from '@/lib/split';
import { useUserId } from '@/providers/session-provider';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

/**
 * One group: where everyone stands, and everything that put them there.
 *
 * Your own position leads, because it is the question people open this screen
 * to ask. The suggested payments come next — a balance tells you the size of
 * the problem, and only the payment list tells you what to do about it.
 */
export default function SplitGroupScreen() {
  // A wrapper, not an inline return: the screen below runs its own
  // hooks, and an early return above them would change the hook count
  // the moment the entitlement answer arrives — which React forbids.
  const gate = useProGate('splits');
  if (gate) return gate;
  return <SplitGroupScreenInner />;
}

function SplitGroupScreenInner() {
  const colors = useColors();
  const artwork = useArtwork();
  const userId = useUserId();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: group, isLoading, isError } = useGroup(id);
  const { data: members = [] } = useGroupMembers(id);
  const { data: balances = [] } = useGroupBalances(id);
  const { data: expenses = [] } = useGroupExpenses(id);
  const { data: settlements = [] } = useGroupSettlements(id);
  const { refresh, refreshing } = useRefreshAll();

  const byId = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const mine = balances.find((row) => row.user_id === userId);
  const myBalance = mine?.balance ?? 0;
  const settled = Math.abs(myBalance) < 0.005;

  // The minimum set of payments that clears everybody. Shown only when the
  // group asked for it — otherwise people settle their own pairs.
  const payments = useMemo(
    () =>
      group?.simplify_debts
        ? simplifyDebts(
            balances.map((row) => ({ id: row.member_id, balance: Number(row.balance) })),
          )
        : [],
    [balances, group?.simplify_debts],
  );

  // One list, both kinds. They are the same story — money moved — and reading
  // them in separate lists means holding two orderings in your head to work out
  // what happened when.
  const timeline = useMemo(() => {
    type Entry =
      | { kind: 'expense'; id: string; date: string; expense: (typeof expenses)[number] }
      | { kind: 'settlement'; id: string; date: string; settlement: (typeof settlements)[number] };

    const entries: Entry[] = [
      ...expenses.map((expense) => ({
        kind: 'expense' as const,
        id: expense.id,
        date: expense.spent_on,
        expense,
      })),
      ...settlements.map((settlement) => ({
        kind: 'settlement' as const,
        id: settlement.id,
        date: settlement.settled_on,
        settlement,
      })),
    ];

    return groupByDate(entries, (entry) => entry.date, {
      // Only expenses count towards a day's total. A settlement is money
      // moving between two people who are both already in the group.
      amountOf: (entry) => (entry.kind === 'expense' ? -Math.abs(entry.expense.amount) : 0),
      direction: 'desc',
    });
  }, [expenses, settlements]);

  const today = toIsoDate(new Date());

  if (isLoading) {
    return (
      <Screen showBack>
        <Title className="mt-2">Group</Title>
        <SkeletonList rows={5} />
      </Screen>
    );
  }

  if (isError || !group) {
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title="Could not open that group"
          message="It may have been archived, or you may no longer be a member."
          actionLabel="Back to splits"
          onAction={() => router.replace('/splits')}
        />
      </Screen>
    );
  }

  return (
    <Screen showBack onRefresh={refresh} refreshing={refreshing}>
      <View className="mt-2 w-full flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <GroupIcon iconId={group.icon_id} groupId={group.id} size={22} />
          <View className="min-w-0 flex-1">
            <Title align="left">{group.name}</Title>
            <Subtitle className="mt-1">
              {members.length} {members.length === 1 ? 'person' : 'people'}
            </Subtitle>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Group settings"
          onPress={() => router.push(`/group-settings?id=${group.id}`)}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
        >
          <Settings2 size={20} color={colors.muted} strokeWidth={1.9} />
        </Pressable>
      </View>

      {/* Where you stand, said in words rather than left to a minus sign. */}
      <View className="mt-6 w-full items-center rounded-[10px] border border-line bg-card px-5 py-6">
        <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
          {settled ? 'Nothing outstanding' : myBalance > 0 ? 'You are owed' : 'You owe'}
        </Text>
        <Text
          className="mt-1 font-poppins-bold text-[38px] text-ink"
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {formatCurrency(Math.abs(myBalance))}
        </Text>
        {settled ? (
          <Text
            className="mt-1 text-center font-poppins text-[13px] text-muted"
            maxFontSizeMultiplier={1.3}
          >
            All settled up
          </Text>
        ) : null}
      </View>

      <View className="mt-4 w-full flex-row gap-3">
        <Button
          label="Add expense"
          className="flex-1"
          icon={<Plus size={17} color={colors.onControl} strokeWidth={2.2} />}
          onPress={() => router.push(`/add-expense?group=${group.id}`)}
        />
        <Button
          label="Settle up"
          variant="outline"
          className="flex-1"
          onPress={() => router.push(`/settle-up?group=${group.id}`)}
        />
      </View>

      {payments.length > 0 ? (
        <View className="mt-9 w-full">
          <FieldLabel className="mb-2">Suggested payments</FieldLabel>
          <View className="h-px w-full bg-line" />
          {payments.map((payment, index) => (
            <View
              key={`${payment.from}-${payment.to}-${index}`}
              className="w-full flex-row items-center gap-2 py-3.5"
              accessible
              accessibilityLabel={`${memberName(byId.get(payment.from))} pays ${memberName(byId.get(payment.to))} ${formatCurrency(payment.amount)}`}
            >
              <Text
                className="min-w-0 flex-1 font-poppins-medium text-[14px] text-ink"
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {memberName(byId.get(payment.from))}
              </Text>
              <ArrowRight size={15} color={colors.muted} strokeWidth={2} />
              <Text
                className="min-w-0 flex-1 font-poppins-medium text-[14px] text-ink"
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {memberName(byId.get(payment.to))}
              </Text>
              <Text
                className="font-poppins-semibold text-[14px] text-accent-ink"
                maxFontSizeMultiplier={1.3}
              >
                {formatCurrency(payment.amount)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mb-10 mt-9 w-full">
        <FieldLabel className="mb-2">History</FieldLabel>

        {timeline.length === 0 ? (
          <>
            <View className="h-px w-full bg-line" />
            <Text
              className="w-full py-5 font-poppins text-[14px] leading-[20px] text-muted"
              maxFontSizeMultiplier={1.4}
            >
              Nothing yet. Add the first expense and everyone in the group will see where they
              stand.
            </Text>
          </>
        ) : null}

        {/* Grouped by day, with the day's spend on the heading. A flat list
            answers "what happened"; this answers "what did Saturday cost",
            which is the question people actually arrive with. Settlements are
            left out of the day total — money moving between two people in the
            group is not the group spending anything. */}
        {timeline.map((day) => (
          <View key={day.date || 'undated'} className="w-full">
            <DateGroupHeader date={day.date} today={today} total={day.total} />

            {day.items.map((entry) =>
              entry.kind === 'expense' ? (
                <ExpenseRow
                  key={entry.id}
                  expense={entry.expense}
                  payerName={memberName(byId.get(entry.expense.paid_by))}
                  yourShare={
                    entry.expense.splits.find(
                      (split) => byId.get(split.member_id)?.user_id === userId,
                    )?.share ?? 0
                  }
                  onPress={() =>
                    router.push(`/add-expense?group=${group.id}&id=${entry.expense.id}`)
                  }
                />
              ) : (
                <SettlementRow
                  key={entry.id}
                  from={memberName(byId.get(entry.settlement.from_member))}
                  to={memberName(byId.get(entry.settlement.to_member))}
                  amount={entry.settlement.amount}
                />
              ),
            )}
          </View>
        ))}
      </View>
    </Screen>
  );
}

function ExpenseRow({
  expense,
  payerName,
  yourShare,
  onPress,
}: {
  expense: ExpenseRowType;
  payerName: string;
  yourShare: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${expense.description}, ${formatCurrency(expense.amount)}, paid by ${payerName}. Your share ${formatCurrency(yourShare)}.`}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-3.5 active:bg-ink/5"
    >
      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {expense.description}
        </Text>
        <Text
          className="mt-0.5 font-poppins text-[12px] text-muted"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {payerName} paid
        </Text>
      </View>
      <View className="items-end">
        <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          {formatCurrency(expense.amount)}
        </Text>
        <Text className="mt-0.5 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          you {formatCurrency(yourShare)}
        </Text>
      </View>
    </Pressable>
  );
}

function SettlementRow({ from, to, amount }: { from: string; to: string; amount: number }) {
  return (
    <View
      className="w-full flex-row items-center gap-3 py-3.5"
      accessible
      accessibilityLabel={`${from} paid ${to} ${formatCurrency(amount)}`}
    >
      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {from} paid {to}
        </Text>
        <Text className="mt-0.5 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          Settled up
        </Text>
      </View>
      <Text
        className="font-poppins-semibold text-[15px] text-accent-ink"
        maxFontSizeMultiplier={1.3}
      >
        {formatCurrency(amount)}
      </Text>
    </View>
  );
}
