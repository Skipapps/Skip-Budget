import { Tabs } from 'expo-router';

import { SkipTabBar } from '@/components/navigation/skip-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      // The bar is fully custom, so screenOptions only needs to stay out of its way.
      tabBar={(props) => <SkipTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="cards" options={{ title: 'Cards' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
