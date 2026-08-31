import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Plus, Settings2, Share2, UserPlus } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import {
  memberAvatar,
  memberName,
  useGroup,
  useGroupBalances,
  useGroupExpenses,
  useGroupMembers,
  useGroupSettlements,
  type GroupMemberRow,
} from '@/api/splits';
import { GroupIcon } from '@/components/splits/group-icon';
import { Person } from '@/components/splits/person';
import { useRefreshAll } from '@/api/refresh';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';
import { formatFullDate } from '@/lib/date';
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

  const handleShare = async () => {
    if (!group?.invite_code) return;
    await Share.share({
      message: `Join "${group.name}" on Skip with the code ${group.invite_code} — we can keep track of who paid for what.`,
    });
  };

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
          <GroupIcon iconId={group.icon_id} size={24} color={colors.ink} />
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

      <View className="mt-9 w-full">
        <View className="w-full flex-row items-center justify-between gap-3">
          <FieldLabel>Who is in</FieldLabel>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add someone to this group"
            onPress={() => router.push(`/add-member?group=${group.id}`)}
            className="min-h-11 flex-row items-center gap-1.5 rounded-full px-2 active:bg-ink/5"
          >
            <UserPlus size={16} color={colors.ink} strokeWidth={1.9} />
            <Text className="font-poppins-medium text-[13px] text-ink" maxFontSizeMultiplier={1.3}>
              Add
            </Text>
          </Pressable>
        </View>
        <View className="h-px w-full bg-line" />

        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            balance={Number(balances.find((row) => row.member_id === member.id)?.balance ?? 0)}
            isYou={member.user_id === userId}
          />
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share the group code"
          onPress={handleShare}
          className="mt-3 min-h-12 w-full flex-row items-center justify-center gap-2 rounded-[10px] border border-line active:bg-ink/5"
        >
          <Share2 size={16} color={colors.ink} strokeWidth={1.9} />
          <Text className="font-poppins-medium text-[14px] text-ink" maxFontSizeMultiplier={1.3}>
            Share code {group.invite_code}
          </Text>
        </Pressable>
      </View>

      <View className="mb-10 mt-9 w-full">
        <FieldLabel className="mb-2">History</FieldLabel>
        <View className="h-px w-full bg-line" />

        {expenses.length === 0 && settlements.length === 0 ? (
          <Text
            className="w-full py-5 font-poppins text-[14px] leading-[20px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            Nothing yet. Add the first expense and everyone in the group will see where they stand.
          </Text>
        ) : null}

        {expenses.map((expense) => {
          const payer = byId.get(expense.paid_by);
          const yours = expense.splits.find(
            (split) => byId.get(split.member_id)?.user_id === userId,
          );
          return (
            <Pressable
              key={expense.id}
              accessibilityRole="button"
              accessibilityLabel={`${expense.description}, ${formatCurrency(expense.amount)}, paid by ${memberName(payer)} on ${formatFullDate(new Date(`${expense.spent_on}T00:00:00`))}. Your share ${formatCurrency(yours?.share ?? 0)}.`}
              onPress={() => router.push(`/add-expense?group=${group.id}&id=${expense.id}`)}
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
                  {memberName(payer)} paid ·{' '}
                  {formatFullDate(new Date(`${expense.spent_on}T00:00:00`))}
                </Text>
              </View>
              <View className="items-end">
                <Text
                  className="font-poppins-semibold text-[15px] text-ink"
                  maxFontSizeMultiplier={1.3}
                >
                  {formatCurrency(expense.amount)}
                </Text>
                <Text
                  className="mt-0.5 font-poppins text-[12px] text-muted"
                  maxFontSizeMultiplier={1.3}
                >
                  you {formatCurrency(yours?.share ?? 0)}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {settlements.map((settlement) => (
          <View
            key={settlement.id}
            className="w-full flex-row items-center gap-3 py-3.5"
            accessible
            accessibilityLabel={`${memberName(byId.get(settlement.from_member))} paid ${memberName(byId.get(settlement.to_member))} ${formatCurrency(settlement.amount)}`}
          >
            <View className="min-w-0 flex-1">
              <Text
                className="font-poppins-medium text-[15px] text-ink"
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {memberName(byId.get(settlement.from_member))} paid{' '}
                {memberName(byId.get(settlement.to_member))}
              </Text>
              <Text
                className="mt-0.5 font-poppins text-[12px] text-muted"
                maxFontSizeMultiplier={1.3}
              >
                Settled up · {formatFullDate(new Date(`${settlement.settled_on}T00:00:00`))}
              </Text>
            </View>
            <Text
              className="font-poppins-semibold text-[15px] text-accent-ink"
              maxFontSizeMultiplier={1.3}
            >
              {formatCurrency(settlement.amount)}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function MemberRow({
  member,
  balance,
  isYou,
}: {
  member: GroupMemberRow;
  balance: number;
  isYou: boolean;
}) {
  const settled = Math.abs(balance) < 0.005;
  const name = memberName(member);
  // A placeholder is somebody who has not joined yet, and saying so is what
  // stops it looking like an account that is quietly broken.
  const pending = member.user_id === null;

  return (
    <View
      className="w-full flex-row items-center gap-3 py-3"
      accessible
      accessibilityLabel={
        settled
          ? `${name}${isYou ? ', you' : ''}. Settled up.`
          : `${name}${isYou ? ', you' : ''}. ${balance > 0 ? 'Owed' : 'Owes'} ${formatCurrency(Math.abs(balance))}.`
      }
    >
      <Person
        name={`${name}${isYou ? ' (you)' : ''}`}
        avatarId={memberAvatar(member)}
        subtitle={pending ? 'Not on Skip yet' : null}
      />
      <Text
        className={
          settled
            ? 'font-poppins text-[13px] text-muted'
            : balance > 0
              ? 'font-poppins-semibold text-[14px] text-accent-ink'
              : 'font-poppins-semibold text-[14px] text-ink'
        }
        maxFontSizeMultiplier={1.3}
      >
        {settled
          ? 'settled'
          : `${balance > 0 ? 'owed' : 'owes'} ${formatCurrency(Math.abs(balance))}`}
      </Text>
    </View>
  );
}
