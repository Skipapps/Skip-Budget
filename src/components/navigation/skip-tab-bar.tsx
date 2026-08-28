import { Tabs } from 'expo-router';
import { Bolt, CreditCard, House, ReceiptText, type LucideIcon } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

/**
 * Derived from expo-router's public Tabs API. `@react-navigation/bottom-tabs`
 * is vendored inside expo-router rather than installed, so deep-importing its
 * types would break on any internal reshuffle.
 */
type SkipTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TAB_ICONS: Record<string, LucideIcon> = {
  home: House,
  cards: CreditCard,
  transactions: ReceiptText,
  settings: Bolt,
};

/**
 * Floating pill tab bar.
 *
 * The selected destination expands into a filled charcoal pill carrying its
 * label; the rest stay as plain icons so the bar reads quietly. Filled rather
 * than outlined because an outline is the same weight as the bar's own edge —
 * it says "here is a shape" where a solid says "you are here", and it is the
 * same charcoal as the add button and the dashboard cards.
 */
export function SkipTabBar({ state, descriptors, navigation }: SkipTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-white px-4 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <View
        style={shadows.floating}
        className="flex-row items-center justify-around rounded-full border border-line bg-white px-3 py-4"
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const Icon = TAB_ICONS[route.name];
          const label = options.title ?? route.name;

          const handlePress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={handlePress}
              className={cn(
                'flex-row items-center justify-center rounded-full',
                focused ? 'gap-2 bg-control px-5 py-3.5' : 'h-[52px] w-[52px] active:opacity-60',
              )}
            >
              {Icon ? (
                <Icon
                  size={22}
                  color={focused ? '#FFFFFF' : colors.muted}
                  strokeWidth={2}
                  absoluteStrokeWidth
                />
              ) : null}
              {focused ? (
                <Text
                  className="font-poppins-medium text-[13px] text-white"
                  maxFontSizeMultiplier={1.2}
                >
                  {label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
