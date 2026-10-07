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

/** How narrow a plain icon tab may get; ICON_TAB_SLOP either side makes it a 44pt target. */
const ICON_TAB_MIN = 36;
const ICON_TAB_SLOP = { left: 4, right: 4 };

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
 * It cannot overflow, whatever the width or text size: the plain icons give way first (down to
 * ICON_TAB_MIN, with hit slop keeping a 44pt target), then the selected pill shrinks and its label
 * ends in an ellipsis. On a 375pt-wide screen every label still fits whole at the largest text
 * size it allows, so the ellipsis only shows on narrower layouts.
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
                hitSlop={focused ? undefined : ICON_TAB_SLOP}
                // Plain icons have no basis of their own (flex-1), so they only fill what the pill
                // leaves, up to 48pt; when space runs out they stop at ICON_TAB_MIN and the pill,
                // the only thing left that can, shrinks.
                className={cn(
                  'h-[48px] flex-row items-center justify-center rounded-full',
                  focused
                    ? 'min-w-0 shrink gap-[6px] bg-control px-[12px]'
                    : 'max-w-[48px] flex-1 active:opacity-60',
                )}
                style={focused ? undefined : { minWidth: ICON_TAB_MIN }}
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
                    className="min-w-0 shrink font-poppins-semibold text-[15px] text-on-control"
                    numberOfLines={1}
                    ellipsizeMode="tail"
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
