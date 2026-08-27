import { Camera, Scan } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

type DashboardHeaderProps = {
  name: string;
  onAvatarPress?: () => void;
  onScanPress?: () => void;
};

/** Avatar, account name, and the scan shortcut. */
export function DashboardHeader({ name, onAvatarPress, onScanPress }: DashboardHeaderProps) {
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
        accessibilityLabel="Scan a receipt"
        onPress={onScanPress}
        className="h-11 w-11 items-center justify-center rounded-[10px] active:bg-black/5"
      >
        <Scan size={22} color={colors.ink} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}
