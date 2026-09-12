import type { ReactNode } from 'react';
import { View } from 'react-native';

import { SectionHeading } from '@/components/ui/typography';

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View className="mt-8 w-full">
      <SectionHeading>{title}</SectionHeading>
      <View className="mt-2 w-full">{children}</View>
    </View>
  );
}
