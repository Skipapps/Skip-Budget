import { Tabs } from 'expo-router';
import { Dimensions } from 'react-native';

import { SkipTabBar } from '@/components/navigation/skip-tab-bar';
import { t, useLocale } from '@/i18n';
import { localeScreenLayout } from '@/i18n/locale-provider';

const { width } = Dimensions.get('window');

export default function TabsLayout() {
  // This layout sits above the tab screens' remount boundary, so it re-renders itself for the titles.
  useLocale();

  return (
    <Tabs
      screenLayout={localeScreenLayout}
      // Never detach an off-screen tab: a scene detached mid-slide could come back with its
      // transform stuck a full width off-screen, which reads as a blank page.
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        // Tabs slide like pages. The interpolator widens the built-in shift to the full screen;
        // progress is -1/0/+1 by tab position.
        animation: 'shift',
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-width, 0, width],
                }),
              },
            ],
          },
        }),
      }}
      tabBar={(props) => <SkipTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: t('nav.home') }} />
      <Tabs.Screen name="cards" options={{ title: t('nav.cards') }} />
      {/* "Activity": "Transactions" does not fit the selected pill beside the Voice button. */}
      <Tabs.Screen name="transactions" options={{ title: t('nav.activity') }} />
      <Tabs.Screen name="settings" options={{ title: t('nav.settings') }} />
    </Tabs>
  );
}
