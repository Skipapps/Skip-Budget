import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View className="mt-8 w-full">
      <Text className="font-poppins-bold text-[20px] text-ink" maxFontSizeMultiplier={1.3}>
        {title}
      </Text>
      <View className="mt-2 w-full">{children}</View>
    </View>
  );
}
