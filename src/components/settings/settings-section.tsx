import type { ReactNode } from 'react';
import { View } from 'react-native';

import { SectionHeading } from '@/components/ui/typography';

type SettingsSectionProps = {
  /** Left out for a group whose rows name themselves, such as the rows that open Settings' pages. */
  title?: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View className="mt-8 w-full">
      {title ? <SectionHeading>{title}</SectionHeading> : null}
      <View className={title ? 'mt-2 w-full' : 'w-full'}>{children}</View>
    </View>
  );
}
