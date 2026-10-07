import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/ui/screen';

type SettingsPageProps = {
  title: string;
  children: ReactNode;
};

/**
 * A page one of Settings' rows opens. The page's name is the heading, so its rows sit straight
 * under it with no section title repeating that name.
 */
export function SettingsPage({ title, children }: SettingsPageProps) {
  return (
    <Screen title={title} showBack>
      <View className="mt-2 w-full">{children}</View>
    </Screen>
  );
}
