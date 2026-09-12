import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useUpdateProfile } from '@/api/mutations';
import { useProfile } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';
import { useArtwork } from '@/theme/artwork';
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
 *
 * That shortcut only works while the profile can actually be read, so a failed
 * read gets its own state rather than falling through to the question.
 */
export default function HelloScreen() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const artwork = useArtwork();

  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState<string | null>(null);

  // Nothing is asked until the profile is in. Rendering the form first and
  // navigating away a frame later showed returning accounts a question they
  // had already answered.
  if (profile.isLoading) {
    return (
      <Screen>
        <View className="mt-10 w-full gap-4" accessibilityLabel="Loading">
          <Skeleton className="h-8 w-3/4 rounded-[12px]" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="mt-4 h-14 w-full rounded-[12px]" />
        </View>
      </Screen>
    );
  }

  // A failed read is not an empty profile. Without this, a returning account
  // whose fetch dropped is asked its name again — and answering would write
  // over the name already on the record. Retry instead of guessing.
  if (profile.isError) {
    return (
      <Screen>
        <PageState
          art={artwork.error}
          title="Could not load your profile"
          message="Check your connection and try again. Your account is safe."
          actionLabel="Try again"
          onAction={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  // A returning account has answered already. Declared as a redirect rather
  // than navigating during render, which React does not allow.
  if (profile.data && (profile.data.display_name ?? '').trim()) {
    return <Redirect href="/home" />;
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
      <Title align="left">What should friends call you?</Title>
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
        {/* A link, not a pill: "Skip for now" sits under the primary action and
            a second pill there would read as a second thing to do. */}
        <TextLink label="Skip for now" variant="subtle" onPress={() => router.replace('/home')} />
      </View>
    </Screen>
  );
}
