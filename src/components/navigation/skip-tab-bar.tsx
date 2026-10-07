import { Tabs } from 'expo-router';
import { Bolt, House, Receipt, Wallet, type LucideIcon } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PILL_GAP,
  PILL_PADDING,
  ROW_HEIGHT,
  TAB_HEIGHT,
  TAB_ICON,
  tabLayout,
} from '@/components/navigation/tab-layout';
import { VoiceFab } from '@/components/voice/voice-fab';
import { useLocale } from '@/i18n';
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
 * Widths come from the window width (tabLayout), never from the label: the selected pill and the
 * icon tabs have fixed sizes that fit the bar, and a label too long for its pill shrinks its font
 * rather than truncating or pushing the pill out. Every tab gets the same style keys whether it
 * is selected or not, so a switch only changes values.
 *
 * The outer view is bigger than the pill (8pt above, the home indicator's inset below, the gutter
 * either side, all painted in the page colour). That band is not part of the control, so `box-none`
 * lets touches through to whatever is behind it.
 */
export function SkipTabBar({ state, descriptors, navigation }: SkipTabBarProps) {
  // The bar and the Voice button live outside every screen's remount boundary.
  useLocale();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const layout = tabLayout(width, state.routes.length);
  const iconSlop = { top: 0, bottom: 0, left: layout.slop, right: layout.slop };

  return (
    <View
      className="bg-surface px-4 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      pointerEvents="box-none"
    >
      <View className="flex-row items-center gap-[14px]" pointerEvents="box-none">
        <View
          style={[shadows.floating, { height: ROW_HEIGHT }]}
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
                hitSlop={focused ? undefined : iconSlop}
                className={cn(
                  'flex-row items-center justify-center rounded-full active:opacity-60',
                  focused && 'bg-control',
                )}
                style={{
                  height: TAB_HEIGHT,
                  width: focused ? layout.pill : layout.icon,
                  flexShrink: 0,
                  paddingHorizontal: focused ? PILL_PADDING : 0,
                  gap: focused ? PILL_GAP : 0,
                }}
              >
                {Icon ? (
                  <Icon
                    size={TAB_ICON}
                    // Same foreground as the label beside it, rather than hardcoded white.
                    color={focused ? colors.onControl : colors.muted}
                    strokeWidth={2}
                    absoluteStrokeWidth
                  />
                ) : null}
                {focused ? (
                  <Text
                    className="font-app-semibold text-[15px] text-on-control"
                    // A ceiling, not a share of free space: the label's room is fixed per window.
                    style={{ maxWidth: layout.label }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    // Read on Android; iOS shrinks as far as the width needs.
                    minimumFontScale={0.6}
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
