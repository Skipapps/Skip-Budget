import { Tabs } from 'expo-router';
import { Bolt, House, Receipt, Wallet, type LucideIcon } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VOICE_FAB_SIZE, VoiceFab } from '@/components/voice/voice-fab';
import { withTap } from '@/lib/press';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

/**
 * Derived from expo-router's public Tabs API: `@react-navigation/bottom-tabs` is vendored inside
 * it, so deep-importing its types would break on any internal reshuffle.
 */
type SkipTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TAB_ICONS: Record<string, LucideIcon> = {
  home: House,
  cards: Wallet,
  transactions: Receipt,
  settings: Bolt,
};

/**
 * Floating pill tab bar with the round Voice button beside it, the same height so they read as one
 * row. The selected tab expands into a filled accent pill carrying its label.
 *
 * The outer view is bigger than the pill (8pt above, the home indicator's inset below, the gutter
 * either side, all painted in the page colour). That band is not part of the control, so `box-none`
 * lets touches through to whatever is behind it.
 */
export function SkipTabBar({ state, descriptors, navigation }: SkipTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-surface px-4 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      pointerEvents="box-none"
    >
      <View className="flex-row items-center gap-[14px]" pointerEvents="box-none">
        <View
          style={[shadows.floating, { height: VOICE_FAB_SIZE }]}
          className="flex-1 flex-row items-center justify-between rounded-full border border-line bg-card px-[7px]"
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
                onPress={withTap(handlePress)}
                // The selected pill keeps its full width; plain icons give way around it (48pt down
                // to 40) so a 375pt phone fits the row without clipping a label.
                className={cn(
                  'h-[48px] flex-row items-center justify-center rounded-full',
                  focused
                    ? 'shrink-0 gap-2 bg-control px-[16px]'
                    : 'min-w-[40px] max-w-[48px] flex-1 active:opacity-60',
                )}
              >
                {Icon ? (
                  <Icon
                    size={22}
                    // Same foreground as the label beside it, rather than hardcoded white.
                    color={focused ? colors.onControl : colors.muted}
                    strokeWidth={2}
                    absoluteStrokeWidth
                  />
                ) : null}
                {focused ? (
                  <Text
                    className="font-poppins-semibold text-[15px] text-on-control"
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    {label}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <VoiceFab />
      </View>
    </View>
  );
}
