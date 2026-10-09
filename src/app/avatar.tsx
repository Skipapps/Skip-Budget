import { router } from 'expo-router';
import { Check, UserRound } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';

import { useUpdateProfile } from '@/api/mutations';
import { useProfile } from '@/api/queries';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { success, tap } from '@/lib/haptics';
import { useToast } from '@/providers/toast-context';
import { useColors } from '@/providers/theme-provider';
import { AVATARS } from '@/theme/avatars';

/**
 * One tap saves the choice and goes back, so there is no Save button. "No picture" sits alone at
 * the top because the person most likely to want it has already set one.
 */
export default function AvatarScreen() {
  const colors = useColors();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const toast = useToast();

  const chosen = profile.data?.avatar_id ?? null;

  const choose = (avatarId: string | null) => {
    tap();
    updateProfile.mutate(
      { avatar_id: avatarId },
      {
        onSuccess: () => {
          success();
          toast('toast.profile.updated');
          router.back();
        },
      },
    );
  };

  return (
    <Screen title={t('onboarding.avatar.title')} showBack>
      <View className="mt-4 w-full items-center">
        <Cell
          selected={chosen === null}
          onPress={() => choose(null)}
          accessibilityLabel={t('onboarding.avatar.noneLabel')}
          label={t('onboarding.avatar.none')}
        >
          <UserRound size={30} color={colors.muted} strokeWidth={1.6} />
        </Cell>
      </View>

      <View className="mt-2 w-full flex-row flex-wrap">
        {AVATARS.map((avatar, index) => (
          <Cell
            key={avatar.id}
            selected={chosen === avatar.id}
            onPress={() => choose(avatar.id)}
            accessibilityLabel={t('onboarding.avatar.number', { number: index + 1 })}
          >
            <Image
              source={avatar.source}
              style={{ width: 72, height: 72 }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </Cell>
        ))}
      </View>

      <View className="h-16 w-full" />
    </Screen>
  );
}

type CellProps = {
  selected: boolean;
  accessibilityLabel: string;
  /** Words under the circle. Only the empty choice has any; the faces speak for themselves. */
  label?: string;
  onPress: () => void;
  children: React.ReactNode;
};

function Cell({ selected, accessibilityLabel, label, onPress, children }: CellProps) {
  const colors = useColors();

  return (
    <View className="w-1/3 items-center pb-5">
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className={cn(
          'h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full border-2',
          selected ? 'border-control bg-accent/10' : 'border-line bg-ink/5 active:bg-ink/10',
        )}
      >
        {children}
      </Pressable>

      {label ? (
        // Inside the button's own label already, so VoiceOver hears it once.
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="mt-2 text-center font-app-medium text-[13px] text-body"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
      ) : null}

      <View className="mt-1.5 h-4 flex-row items-center justify-center">
        {selected ? <Check size={15} color={colors.accentInk} strokeWidth={3} /> : null}
      </View>
    </View>
  );
}
