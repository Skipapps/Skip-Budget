import { Bell } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { useColors } from '@/providers/theme-provider';

type DashboardHeaderProps = {
  name: string;
  /** Which bundled avatar was chosen; null shows the empty slot. */
  avatarId?: string | null;
  onAvatarPress?: () => void;
  onNotificationsPress?: () => void;
  /** News from Skip nobody has opened yet: a dot on the bell. */
  unread?: boolean;
};

/** Avatar, account name, and the way through to news from Skip. */
export function DashboardHeader({
  name,
  avatarId,
  onAvatarPress,
  onNotificationsPress,
  unread = false,
}: DashboardHeaderProps) {
  const colors = useColors();
  return (
    <View className="w-full flex-row items-center justify-between">
      <View className="flex-1 flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={avatarId ? 'Change your profile picture' : 'Add a profile picture'}
          onPress={onAvatarPress}
          className="rounded-full active:opacity-70"
        >
          <ProfileAvatar avatarId={avatarId} size={48} />
        </Pressable>
        <Text
          className="flex-1 font-poppins-semibold text-[20px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {name}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread ? 'Notifications, new' : 'Notifications'}
        onPress={onNotificationsPress}
        className="h-11 w-11 items-center justify-center rounded-[12px] active:bg-ink/5"
      >
        <Bell size={22} color={colors.ink} strokeWidth={1.8} />
        {unread ? (
          // Ringed in the page colour so it reads as sitting on the bell, not
          // as a stray mark beside it, in both themes.
          <View
            pointerEvents="none"
            className="absolute right-[9px] top-[9px] h-3 w-3 rounded-full border-2 border-surface bg-accent"
          />
        ) : null}
      </Pressable>
    </View>
  );
}
