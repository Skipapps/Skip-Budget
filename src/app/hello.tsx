import { router } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { resetTo } from '@/lib/nav';
import { useUpdateProfile } from '@/api/mutations';
import { useProfile } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { Title } from '@/components/ui/typography';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * One question, right after signup: what should we call you?
 *
 * Asked now because the answer matters most to other people. A friend request
 * from "Someone on Skip" is one nobody can place, and by the time the split
 * manager nags about it the bad first impression has already been made.
 *
 * Kept to the one question (Founder's call, 2026-09-28): a name field and a
 * face. The pen opens the full picker — the same screen Settings uses, which
 * saves on tap and lands straight back here — instead of a grid that asked
 * for a decision before the screen's actual question.
 *
 * Skippable, and it skips itself: somebody signing back in through Apple or
 * Google lands here too, and if their profile already has a name there is
 * nothing to ask — straight through to setup.
 *
 * That shortcut only works while the profile can actually be read, so a failed
 * read gets its own state rather than falling through to the question.
 */
export default function HelloScreen() {
  const colors = useColors();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const artwork = useArtwork();

  const [name, setName] = useState('');

  // A returning account has answered already. A reset rather than a
  // redirect: a Redirect swaps only this screen and leaves onboarding
  // stacked beneath the app, and the back swipe then walked out of Home
  // into the pitch. An effect, because navigation cannot run mid-render.
  const named = Boolean(profile.data && (profile.data.display_name ?? '').trim());
  useEffect(() => {
    if (named) resetTo('/setup');
  }, [named]);

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
          title={FAILURE_MESSAGE}
          actionLabel="Try again"
          onAction={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  if (named) return null;

  const handleContinue = () => {
    const trimmed = name.trim();
    // The picture is already saved — the picker writes it on tap — so the
    // only thing Continue has left to carry is the name.
    if (trimmed) updateProfile.mutate({ display_name: trimmed });
    resetTo('/setup');
  };

  return (
    <Screen
      avoidKeyboard
      footer={
        <View className="w-full gap-3">
          <Button label="Continue" onPress={handleContinue} />
          {/* A link, not a pill: "Skip for now" sits under the primary action
              and a second pill there would read as a second thing to do. */}
          <TextLink label="Skip for now" variant="subtle" onPress={() => resetTo('/setup')} />
        </View>
      }
    >
      <Title>What should we call you?</Title>

      <View className="mt-10 w-full items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose a profile picture"
          onPress={() => router.push('/avatar')}
          className="active:opacity-80"
        >
          <ProfileAvatar avatarId={profile.data?.avatar_id} size={132} />
          <View className="absolute -bottom-1 -right-1 h-10 w-10 items-center justify-center rounded-full border-2 border-surface bg-accent">
            <Pencil size={17} color={colors.onControl} strokeWidth={2} />
          </View>
        </Pressable>
      </View>

      <View className="mt-9 w-full">
        <TextField
          label="Your name"
          value={name}
          onChangeText={setName}
          maxLength={80}
          autoCapitalize="words"
        />
      </View>
    </Screen>
  );
}
