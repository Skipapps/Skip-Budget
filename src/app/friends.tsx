import { router } from 'expo-router';
import { Check, Share2, UserMinus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';

import {
  useAddFriendByCode,
  useFriendRequests,
  useFriends,
  useMyInviteCode,
  useRemoveFriend,
  useRespondToFriendRequest,
  type FriendRow,
} from '@/api/splits';
import { useProfile } from '@/api/queries';
import { useRefreshAll } from '@/api/refresh';
import { Person } from '@/components/splits/person';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';
import { useConfirm } from '@/providers/dialog-provider';
import { useColors } from '@/providers/theme-provider';

/**
 * Making friends inside Skip, without publishing who has an account.
 *
 * The whole system runs on codes rather than a search box, and that is a
 * privacy decision before it is a design one. Looking people up by email means
 * anyone can test addresses against the user list one at a time and learn who
 * is registered. A code only works if its owner chose to hand it over, so
 * there is no lookup to abuse.
 */
export default function FriendsScreen() {
  const colors = useColors();
  const confirm = useConfirm();

  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: mine } = useMyInviteCode();
  const { data: profile } = useProfile();

  // What everyone else sees is your display name, and it starts empty. Worth
  // saying here rather than on the settings screen, because this is where the
  // consequence lands: a friend request from "Someone on Skip" is one nobody
  // can place, and the person sending it has no way to know that is how they
  // appear.
  const unnamed = !(profile?.display_name ?? '').trim();
  const { data: friends = [], isLoading } = useFriends();
  const { data: requests } = useFriendRequests();

  const addFriend = useAddFriendByCode();
  const respond = useRespondToFriendRequest();
  const removeFriend = useRemoveFriend();
  const { refresh, refreshing } = useRefreshAll();

  const handleAdd = async () => {
    setError(null);
    setMessage(null);
    if (!code.trim()) {
      setError('Enter the code your friend shared with you.');
      return;
    }

    try {
      const rows = await addFriend.mutateAsync(code.trim());
      const result = Array.isArray(rows) ? rows[0] : rows;
      const name = result?.display_name || 'They';
      setCode('');
      setMessage(
        result?.outcome === 'accepted'
          ? `You and ${name} are now friends — they had already asked.`
          : result?.outcome === 'already_friends'
            ? `${name} is already a friend.`
            : `Asked ${name}. They will see it next time they open Skip.`,
      );
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  const handleShare = async () => {
    if (!mine?.code) return;
    await Share.share({
      message: `Add me on Skip with my code ${mine.code} — we can split bills and keep track of who owes what.`,
    });
  };

  const handleRemove = async (friend: FriendRow) => {
    const ok = await confirm({
      title: `Remove ${friend.display_name || 'this friend'}?`,
      message:
        'You will both drop off each other’s list. Groups you already share stay exactly as they are.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;

    try {
      await removeFriend.mutateAsync(friend.id);
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  const incoming = requests?.incoming ?? [];
  const outgoing = requests?.outgoing ?? [];

  return (
    <Screen showBack avoidKeyboard onRefresh={refresh} refreshing={refreshing}>
      <Title className="mt-2">Friends</Title>
      <Subtitle className="mt-3">
        Share your code with someone and they can add you. Nobody can find you without it.
      </Subtitle>

      {/* The code is the product here, so it is set like one: large, spaced, and
          unambiguous to read aloud down a phone. */}
      <View className="mt-7 w-full items-center rounded-[10px] border border-line bg-card px-5 py-6">
        <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
          Your code
        </Text>
        <Text
          className="mt-2 font-poppins-bold text-[34px] tracking-[6px] text-ink"
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={
            mine?.code ? `Your code is ${mine.code.split('').join(' ')}` : 'Loading your code'
          }
        >
          {mine?.code ?? '······'}
        </Text>
        <Button
          label="Share my code"
          variant="outline"
          className="mt-5"
          icon={<Share2 size={17} color={colors.ink} strokeWidth={1.9} />}
          onPress={handleShare}
          disabled={!mine?.code}
        />
      </View>

      {unnamed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Set your name in settings, so friends can recognise you"
          onPress={() => router.push('/(tabs)/settings')}
          className="mt-4 w-full rounded-[10px] border border-line px-4 py-3.5 active:bg-ink/5"
        >
          <Text className="font-poppins-medium text-[14px] text-ink" maxFontSizeMultiplier={1.4}>
            Add your name first
          </Text>
          <Text
            className="mt-1 font-poppins text-[12px] leading-[17px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            Without one you show up as “Someone on Skip”, and a request from that is hard to place.
            Set it in Settings, along with a picture.
          </Text>
        </Pressable>
      ) : null}

      <View className="mt-7 w-full">
        <TextField
          label="Add someone by code"
          value={code}
          onChangeText={(next) => setCode(next.toUpperCase())}
          placeholder="7QK4M2"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
        />
        <Button
          label={addFriend.isPending ? 'Asking…' : 'Send request'}
          className="mt-3"
          onPress={handleAdd}
          disabled={addFriend.isPending}
        />
      </View>

      {message ? (
        <Text
          className="mt-4 w-full font-poppins text-[13px] text-accent-ink"
          maxFontSizeMultiplier={1.4}
        >
          {message}
        </Text>
      ) : null}

      {error ? (
        <Text
          className="mt-4 w-full font-poppins text-[13px] text-red-600"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      {incoming.length > 0 ? (
        <View className="mt-9 w-full">
          <FieldLabel className="mb-2">Waiting for you</FieldLabel>
          <View className="h-px w-full bg-line" />
          {incoming.map((request) => (
            <View key={request.id} className="w-full flex-row items-center gap-3 py-3.5">
              <Person
                name={request.profile?.display_name || 'Someone on Skip'}
                avatarId={request.profile?.avatar_id}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Decline ${request.profile?.display_name || 'this request'}`}
                onPress={() => respond.mutate({ id: request.id, accept: false })}
                className="h-11 w-11 items-center justify-center rounded-full border border-line active:bg-ink/5"
              >
                <X size={18} color={colors.muted} strokeWidth={2.2} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Accept ${request.profile?.display_name || 'this request'}`}
                onPress={() => respond.mutate({ id: request.id, accept: true })}
                className="h-11 w-11 items-center justify-center rounded-full bg-accent active:opacity-80"
              >
                <Check size={18} color={colors.onControl} strokeWidth={2.4} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {outgoing.length > 0 ? (
        <View className="mt-9 w-full">
          <FieldLabel className="mb-2">Asked, not answered</FieldLabel>
          <View className="h-px w-full bg-line" />
          {outgoing.map((request) => (
            <View key={request.id} className="w-full flex-row items-center py-3.5">
              <Person
                name={request.profile?.display_name || 'Someone on Skip'}
                avatarId={request.profile?.avatar_id}
                subtitle="Waiting for them"
              />
            </View>
          ))}
        </View>
      ) : null}

      <View className="mb-10 mt-9 w-full">
        <FieldLabel className="mb-2">
          {friends.length === 0 ? 'No friends yet' : `${friends.length} friends`}
        </FieldLabel>
        <View className="h-px w-full bg-line" />

        {isLoading ? (
          <View className="w-full items-center py-8">
            <ActivityIndicator size="small" color={colors.muted} />
          </View>
        ) : null}

        {!isLoading && friends.length === 0 ? (
          <Text
            className="w-full py-5 font-poppins text-[14px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            Send someone your code and they will show up here. You need at least one friend before
            you can add them to a group.
          </Text>
        ) : null}

        {friends.map((friend) => (
          <View key={friend.id} className="w-full flex-row items-center gap-3 py-3.5">
            <Person name={friend.display_name || 'Someone on Skip'} avatarId={friend.avatar_id} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${friend.display_name || 'this friend'}`}
              onPress={() => handleRemove(friend)}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
            >
              <UserMinus size={18} color={colors.muted} strokeWidth={1.9} />
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}
