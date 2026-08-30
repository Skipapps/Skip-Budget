import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAddGroupMember, useFriends, useGroup, useGroupMembers } from '@/api/splits';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';
import { useColors } from '@/providers/theme-provider';

/**
 * Adding somebody to a group, whether or not they use Skip.
 *
 * The second half is the one that makes the app usable. You add your flatmate
 * tonight and they install it on Thursday — so a member does not have to be an
 * account, and a name is enough to owe and be owed. When they do join, they
 * claim the name and every share already attached to it comes with them.
 */
export default function AddMemberScreen() {
  const colors = useColors();
  const { group: groupId } = useLocalSearchParams<{ group?: string }>();

  const { data: group } = useGroup(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const { data: friends = [] } = useFriends();

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addMember = useAddGroupMember();
  const alreadyIn = new Set(members.map((member) => member.user_id).filter(Boolean));
  const available = friends.filter((friend) => !alreadyIn.has(friend.id));

  const addFriend = async (userId: string) => {
    if (!groupId) return;
    setError(null);
    try {
      await addMember.mutateAsync({ groupId, userId });
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  const addPlaceholder = async () => {
    if (!groupId) return;
    setError(null);
    if (!name.trim()) {
      setError('Give them a name so everyone knows who it is.');
      return;
    }
    try {
      await addMember.mutateAsync({ groupId, displayName: name.trim() });
      setName('');
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  return (
    <Screen showBack avoidKeyboard>
      <Title className="mt-2">Add to {group?.name ?? 'group'}</Title>
      <Subtitle className="mt-3">
        Friends join properly and see the group on their own phone. Anyone else can be a name for
        now and claim it later.
      </Subtitle>

      <View className="mt-8 w-full">
        <FieldLabel className="mb-2">
          {available.length > 0 ? 'Your friends' : 'No friends left to add'}
        </FieldLabel>
        <View className="h-px w-full bg-line" />

        {available.length === 0 ? (
          <Text
            className="w-full py-5 font-poppins text-[14px] leading-[20px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            {friends.length === 0
              ? 'You have not added anyone on Skip yet. Share your code from the Friends screen, or add a name below.'
              : 'Everyone you know on Skip is already in this group.'}
          </Text>
        ) : null}

        {available.map((friend) => (
          <Pressable
            key={friend.id}
            accessibilityRole="button"
            accessibilityLabel={`Add ${friend.display_name || 'this friend'} to the group`}
            onPress={() => addFriend(friend.id)}
            disabled={addMember.isPending}
            className="w-full flex-row items-center justify-between gap-3 py-3.5 active:bg-ink/5"
          >
            <Text
              className="min-w-0 flex-1 font-poppins-medium text-[15px] text-ink"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {friend.display_name || 'Someone on Skip'}
            </Text>
            <View className="h-9 w-9 items-center justify-center rounded-full border border-line">
              <Check size={16} color={colors.muted} strokeWidth={2.2} />
            </View>
          </Pressable>
        ))}
      </View>

      <View className="mt-9 w-full">
        <FieldLabel className="mb-2">Somebody not on Skip</FieldLabel>
        <TextField
          label=""
          value={name}
          onChangeText={setName}
          placeholder="Their name"
          maxLength={60}
          autoCapitalize="words"
        />
        <Button
          label={addMember.isPending ? 'Adding…' : 'Add by name'}
          variant="outline"
          className="mt-3"
          onPress={addPlaceholder}
          disabled={addMember.isPending}
        />
      </View>

      {error ? (
        <Text
          className="mt-5 w-full font-poppins text-[13px] text-red-600"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      <View className="mt-auto w-full pb-8 pt-10">
        <Button label="Done" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
