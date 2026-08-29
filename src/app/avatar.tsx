import { router } from 'expo-router';
import { Check, UserRound } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';

import { useUpdateProfile } from '@/api/mutations';
import { useProfile } from '@/api/queries';
import { Screen } from '@/components/ui/screen';
import { Subtitle, Title } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { success, tap } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';
import { AVATARS } from '@/theme/avatars';

/**
 * Choosing a face for the account.
 *
 * One tap and it is done — chosen, saved, and back to where you came from.
 * There is no Save button because there is nothing to compose: the choice is
 * the whole interaction, it is visible everywhere the moment it lands, and
 * changing your mind is the same single tap again.
 *
 * "No picture" is first rather than buried at the end, because the person most
 * likely to want it is the one who already set one and would otherwise have to
 * hunt for the way back out.
 */
export default function AvatarScreen() {
  const colors = useColors();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();

  const chosen = profile.data?.avatar_id ?? null;

  const choose = (avatarId: string | null) => {
    tap();
    updateProfile.mutate(
      { avatar_id: avatarId },
      {
        onSuccess: () => {
          success();
          router.back();
        },
      },
    );
  };

  return (
    <Screen showBack>
      <Title align="left" className="mt-1 w-full">
        Profile picture
      </Title>
      <Subtitle className="mt-2 w-full text-left">
        Pick one and it appears on your dashboard. Nothing is uploaded — these ship with the app.
      </Subtitle>

      <View className="mt-7 w-full flex-row flex-wrap">
        <Cell
          selected={chosen === null}
          label="No picture"
          onPress={() => choose(null)}
          accessibilityLabel="No picture"
        >
          <UserRound size={30} color={colors.muted} strokeWidth={1.6} />
        </Cell>

        {AVATARS.map((avatar) => (
          <Cell
            key={avatar.id}
            selected={chosen === avatar.id}
            label={avatar.label}
            onPress={() => choose(avatar.id)}
            accessibilityLabel={avatar.label}
          >
            <Image
              source={avatar.source}
              style={{ width: 68, height: 68 }}
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
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
};

function Cell({ selected, label, accessibilityLabel, onPress, children }: CellProps) {
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

      {/* The tick sits under the ring rather than on the face, which is small
          enough already without a badge covering a third of it. */}
      <View className="mt-1.5 h-4 flex-row items-center justify-center">
        {selected ? <Check size={15} color={colors.accentInk} strokeWidth={3} /> : null}
      </View>

      <Text
        className="mt-0.5 px-1 text-center font-poppins text-[11px] leading-[14px] text-muted"
        numberOfLines={2}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </View>
  );
}
