import { Bell, Camera } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/providers/theme-provider';

type DashboardHeaderProps = {
  name: string;
  onAvatarPress?: () => void;
  onNotificationsPress?: () => void;
};

/** Avatar, account name, and the way through to what the app has been doing. */
export function DashboardHeader({
  name,
  onAvatarPress,
  onNotificationsPress,
}: DashboardHeaderProps) {
  const colors = useColors();
  return (
    <View className="w-full flex-row items-center justify-between">
      <View className="flex-1 flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          onPress={onAvatarPress}
          className="h-12 w-12 items-center justify-center rounded-full border border-line active:opacity-70"
        >
          <Camera size={20} color={colors.muted} strokeWidth={1.8} />
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
        accessibilityLabel="Notifications"
        onPress={onNotificationsPress}
        className="h-11 w-11 items-center justify-center rounded-[10px] active:bg-ink/5"
      >
        <Bell size={22} color={colors.ink} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}
