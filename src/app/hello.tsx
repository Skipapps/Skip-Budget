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
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';

/**
 * One question right after signup: what should we call you? The pen opens the avatar picker (the
 * Settings one, which saves on tap). Skips itself for a returning sign-in whose profile already has
 * a name.
 */
export default function HelloScreen() {
  const colors = useColors();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const artwork = useArtwork();

  const [name, setName] = useState('');

  // resetTo, not Redirect: a Redirect leaves onboarding stacked beneath the app and the back swipe
  // walks out of Home into the pitch. An effect, because navigation cannot run mid-render.
  const named = Boolean(profile.data && (profile.data.display_name ?? '').trim());
  useEffect(() => {
    if (named) resetTo('/setup');
  }, [named]);

  // Hold the form until the profile is in, or returning accounts see the question flash.
  if (profile.isLoading) {
    return (
      <Screen>
        <View className="mt-10 w-full gap-4" accessibilityLabel={t('onboarding.hello.loading')}>
          <Skeleton className="h-8 w-3/4 rounded-[12px]" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="mt-4 h-14 w-full rounded-[12px]" />
        </View>
      </Screen>
    );
  }

  // A failed read is not an empty profile: answering would overwrite the name already on record.
  if (profile.isError) {
    return (
      <Screen>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  if (named) return null;

  const handleContinue = () => {
    const trimmed = name.trim();
    // The picture is already saved by the picker; only the name is left.
    if (trimmed) updateProfile.mutate({ display_name: trimmed });
    resetTo('/setup');
  };

  return (
    <Screen
      avoidKeyboard
      footer={
        <View className="w-full gap-3">
          <Button label={t('common.continue')} onPress={handleContinue} />
          <TextLink
            label={t('onboarding.skipForNow')}
            variant="subtle"
            onPress={() => resetTo('/setup')}
          />
        </View>
      }
    >
      <Title>{t('onboarding.hello.title')}</Title>

      <View className="mt-10 w-full items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.hello.pickPicture')}
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
          label={t('onboarding.hello.name')}
          value={name}
          onChangeText={setName}
          maxLength={80}
          autoCapitalize="words"
        />
      </View>
    </Screen>
  );
}
