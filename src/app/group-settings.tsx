import { router, useLocalSearchParams } from 'expo-router';
import { LogOut, UserMinus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import {
  memberName,
  useArchiveGroup,
  useGroup,
  useGroupBalances,
  useGroupMembers,
  useRemoveGroupMember,
  useUpdateGroup,
} from '@/api/splits';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Title } from '@/components/ui/typography';
import { formatCurrency } from '@/lib/format';
import { useConfirm } from '@/providers/dialog-provider';
import { useUserId } from '@/providers/session-provider';
import { useColors } from '@/providers/theme-provider';

/**
 * The parts of a group that are not money.
 *
 * Leaving and removing both refuse while somebody is not square, and the
 * refusal names the amount — "settle up $42.50 first" is something a person
 * can act on, where "cannot leave group" is a wall. That check lives in the
 * database; this screen only has to show what comes back.
 */
export default function GroupSettingsScreen() {
  const colors = useColors();
  const confirm = useConfirm();
  const userId = useUserId();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: group } = useGroup(id);
  const { data: members = [] } = useGroupMembers(id);
  const { data: balances = [] } = useGroupBalances(id);

  const [name, setName] = useState(group?.name ?? '');
  const [error, setError] = useState<string | null>(null);

  const updateGroup = useUpdateGroup();
  const archiveGroup = useArchiveGroup();
  const removeMember = useRemoveGroupMember();

  const me = members.find((member) => member.user_id === userId);
  const isOwner = me?.role === 'owner';

  const balanceOf = (memberId: string) =>
    Number(balances.find((row) => row.member_id === memberId)?.balance ?? 0);

  const handleRename = async () => {
    if (!id || !name.trim() || name.trim() === group?.name) return;
    setError(null);
    try {
      await updateGroup.mutateAsync({ id, name: name.trim() });
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  const handleRemove = async (memberId: string, label: string) => {
    setError(null);
    const ok = await confirm({
      title: `Remove ${label}?`,
      message: 'Their share of past expenses stays in the history.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;

    try {
      await removeMember.mutateAsync(memberId);
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  const handleLeave = async () => {
    if (!me) return;
    setError(null);
    const ok = await confirm({
      title: `Leave ${group?.name ?? 'this group'}?`,
      message: 'You will stop seeing it. What you already paid stays in everyone else’s history.',
      confirmLabel: 'Leave',
      destructive: true,
    });
    if (!ok) return;

    try {
      await removeMember.mutateAsync(me.id);
      router.replace('/splits');
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    setError(null);
    const ok = await confirm({
      title: `Close ${group?.name ?? 'this group'}?`,
      message:
        'It comes off everyone’s list. Nothing is deleted — the expenses stay exactly as they are.',
      confirmLabel: 'Close group',
      destructive: true,
    });
    if (!ok) return;

    try {
      await archiveGroup.mutateAsync(id);
      router.replace('/splits');
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">Group settings</Title>

      <View className="mt-8 w-full">
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          onBlur={handleRename}
          placeholder={group?.name ?? 'Group name'}
          maxLength={60}
          autoCapitalize="sentences"
        />
      </View>

      <View className="mt-7 w-full flex-row items-center gap-4 rounded-[10px] border border-line px-4 py-4">
        <View className="min-w-0 flex-1">
          <Text className="font-poppins-medium text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
            Simplify who pays whom
          </Text>
          <Text
            className="mt-1 font-poppins text-[12px] leading-[17px] text-muted"
            maxFontSizeMultiplier={1.3}
          >
            Fewer payments, but it can pair you with somebody you never ate with.
          </Text>
        </View>
        <Switch
          value={group?.simplify_debts ?? true}
          onValueChange={(next) =>
            id ? updateGroup.mutate({ id, simplifyDebts: next }) : undefined
          }
          disabled={!isOwner}
          trackColor={{ false: colors.line, true: colors.control }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.line}
        />
      </View>

      {!isOwner ? (
        <Text
          className="mt-3 w-full font-poppins text-[12px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          Only the group owner can change the name or how it settles.
        </Text>
      ) : null}

      <View className="mt-9 w-full">
        <FieldLabel className="mb-2">Members</FieldLabel>
        <View className="h-px w-full bg-line" />

        {members.map((member) => {
          const balance = balanceOf(member.id);
          const square = Math.abs(balance) < 0.005;
          const label = memberName(member);
          const isMe = member.user_id === userId;

          return (
            <View key={member.id} className="w-full flex-row items-center gap-3 py-3.5">
              <View className="min-w-0 flex-1">
                <Text
                  className="font-poppins-medium text-[15px] text-ink"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {label}
                  {isMe ? ' (you)' : ''}
                </Text>
                <Text
                  className="mt-0.5 font-poppins text-[12px] text-muted"
                  maxFontSizeMultiplier={1.3}
                >
                  {square
                    ? 'settled up'
                    : `${balance > 0 ? 'owed' : 'owes'} ${formatCurrency(Math.abs(balance))}`}
                </Text>
              </View>

              {isOwner && !isMe ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${label}`}
                  onPress={() => handleRemove(member.id, label)}
                  className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
                >
                  <UserMinus size={18} color={colors.muted} strokeWidth={1.9} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      {error ? (
        <Text
          className="mt-5 w-full font-poppins text-[13px] text-red-600"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      <View className="mb-10 mt-auto w-full gap-3 pt-10">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave this group"
          onPress={handleLeave}
          className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-[10px] border border-line active:bg-ink/5"
        >
          <LogOut size={17} color={colors.ink} strokeWidth={1.9} />
          <Text className="font-poppins-medium text-[15px] text-ink" maxFontSizeMultiplier={1.4}>
            Leave group
          </Text>
        </Pressable>

        {isOwner ? (
          <Button label="Close this group" variant="outline" onPress={handleArchive} />
        ) : null}
      </View>
    </Screen>
  );
}
