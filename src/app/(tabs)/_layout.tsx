import { Tabs } from 'expo-router';
import { Dimensions } from 'react-native';

import { SkipTabBar } from '@/components/navigation/skip-tab-bar';

const { width } = Dimensions.get('window');

export default function TabsLayout() {
  return (
    <Tabs
      // Never detach an off-screen tab. Detachment races the slide animation:
      // a scene detached mid-transition could come back with its transform
      // stuck a full width off-screen, which read as a blank page. Four tabs
      // held mounted is a price worth a Settings page that always shows up.
      detachInactiveScreens={false}
      // The bar is fully custom, so screenOptions only needs to stay out of its way.
      screenOptions={{
        headerShown: false,
        // Tab switches push like pages do: a tab to the right slides in from
        // the right while the old one leaves to the left, and coming back runs
        // the same move the other way. The interpolator widens the built-in
        // shift to the full screen; progress is -1/0/+1 by tab position, so
        // multiplying by the width is the whole sum.
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
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="cards" options={{ title: 'Cards' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
