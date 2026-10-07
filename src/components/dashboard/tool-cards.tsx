import type { Href } from 'expo-router';
import { ChevronRight, Landmark } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { shadows } from '@/theme/shadows';
import { useColors } from '@/providers/theme-provider';

type Tool = {
  id: string;
  label: string;
  icon: LucideIcon;
  href: Href;
};

/** The loan calculator: a tool rather than spending, so a card rather than a list row. */
const TOOLS: Tool[] = [
  { id: 'loan-calculator', label: 'Loan Calculator', icon: Landmark, href: '/loan-calculator' },
];

type ToolCardsProps = {
  pro: boolean;
  onPress: (href: Href) => void;
};

/**
 * A raised card: shadow and no border (an outline would flatten the lift).
 * A locked tool keeps its card with a PRO badge, since a hidden feature sells nothing and the
 * destination screen still does the refusing.
 */
export function ToolCards({ pro, onPress }: ToolCardsProps) {
  const colors = useColors();

  return (
    <View className="w-full flex-row gap-3">
      {TOOLS.map((tool) => (
        <Pressable
          key={tool.id}
          accessibilityRole="button"
          accessibilityLabel={`${tool.label}.${pro ? '' : ' Pro feature.'} Opens the tool.`}
          onPress={() => onPress(tool.href)}
          style={shadows.raised}
          className="min-w-0 flex-1 items-center rounded-[16px] bg-card px-3 pb-4 pt-5 active:opacity-60"
        >
          {pro ? null : (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="absolute right-3 top-3 rounded-full bg-accent px-2 py-0.5"
            >
              <Text allowFontScaling={false} className="font-app-bold text-[9px] text-on-control">
                PRO
              </Text>
            </View>
          )}

          {/* The same accent circle as the "Where it goes" rows above. */}
          <View className="h-[44px] w-[44px] items-center justify-center rounded-full bg-accent/10">
            <tool.icon size={20} color={colors.accentInk} strokeWidth={1.8} />
          </View>

          <View className="mt-3 w-full flex-row items-center justify-center gap-0.5">
            <Text
              className="shrink text-center font-app-medium text-[14px] text-ink"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {tool.label}
            </Text>
            <ChevronRight size={16} color={colors.muted} strokeWidth={2} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}
