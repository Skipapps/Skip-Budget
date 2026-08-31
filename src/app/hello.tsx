import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useUpdateProfile } from '@/api/mutations';
import { useProfile } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';
import { AVATARS } from '@/theme/avatars';

/**
 * One question, right after signup: what should friends call you?
 *
 * Asked now because the answer matters most to other people. A friend request
 * from "Someone on Skip" is one nobody can place, and by the time the split
 * manager nags about it the bad first impression has already been made.
 *
 * Skippable, and it skips itself: somebody signing back in through Apple or
 * Google lands here too, and if their profile already has a name there is
 * nothing to ask — straight through to Home.
 */
export default function HelloScreen() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState<string | null>(null);

  // A returning account has answered already. Waiting for the row costs one
  // spinner frame; guessing costs asking somebody their name twice.
  if (profile.data && (profile.data.display_name ?? '').trim()) {
    router.replace('/home');
    return null;
  }

  const handleContinue = () => {
    const trimmed = name.trim();
    if (trimmed || avatarId) {
      updateProfile.mutate({
        ...(trimmed ? { display_name: trimmed } : {}),
        ...(avatarId ? { avatar_id: avatarId } : {}),
      });
    }
    router.replace('/home');
  };

  return (
    <Screen avoidKeyboard>
      <Title align="left" className="mt-10">
        What should friends call you?
      </Title>
      <Subtitle className="mt-3 w-full text-left">
        Your name and picture are what people see when you split a bill with them. Nothing is
        uploaded — the pictures ship with the app.
      </Subtitle>

      <View className="mt-8 w-full">
        <TextField
          label="Your name"
          value={name}
          onChangeText={setName}
          placeholder="How friends know you"
          maxLength={80}
          autoCapitalize="words"
        />
      </View>

      <FieldLabel className="mb-3 mt-7">Pick a picture</FieldLabel>
      <View className="w-full flex-row flex-wrap gap-3">
        {AVATARS.slice(0, 8).map((avatar) => (
          <Pressable
            key={avatar.id}
            accessibilityRole="button"
            accessibilityLabel={avatar.label}
            accessibilityState={{ selected: avatarId === avatar.id }}
            onPress={() => setAvatarId(avatarId === avatar.id ? null : avatar.id)}
            className={
              avatarId === avatar.id
                ? 'rounded-full border-2 border-accent'
                : 'rounded-full border-2 border-transparent active:opacity-70'
            }
          >
            <ProfileAvatar avatarId={avatar.id} size={64} />
          </Pressable>
        ))}
      </View>
      <Text className="mt-3 w-full font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.4}>
        More pictures live in Settings, along with everything else about your profile.
      </Text>

      <View className="mt-auto w-full gap-3 pb-8 pt-10">
        <Button label="Continue" onPress={handleContinue} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip for now"
          onPress={() => router.replace('/home')}
          className="min-h-11 w-full items-center justify-center rounded-[10px] active:bg-ink/5"
        >
          <Text className="font-poppins text-[14px] text-muted" maxFontSizeMultiplier={1.4}>
            Skip for now
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
