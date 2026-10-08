import type { Href } from 'expo-router';
import { ChevronRight, Landmark } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t, type MessageKey } from '@/i18n';
import { cn } from '@/lib/cn';
import { shadows } from '@/theme/shadows';
import { useColors } from '@/providers/theme-provider';

type Tool = {
  id: string;
  label: MessageKey;
  icon: LucideIcon;
  href: Href;
};

/** The loan calculator: a tool rather than spending, so a card rather than a list row. */
const TOOLS: Tool[] = [
  {
    id: 'loan-calculator',
    label: 'home.tool.loanCalculator',
    icon: Landmark,
    href: '/loan-calculator',
  },
];

type ToolCardsProps = {
  onPress: (href: Href) => void;
};

/** The chevron after the label: 16pt and the 2pt gap before it. */
const CHEVRON_ROOM = 18;

/**
 * A raised card: shadow and no border (an outline would flatten the lift). Side by side, the tool
 * names share one size; cards that cannot hold it stack.
 */
export function ToolCards({ onPress }: ToolCardsProps) {
  const colors = useColors();
  const names = useFitGroup({ mode: 'shrink' });

  return (
    <FitGroup group={names} className={names.fits ? 'w-full flex-row gap-3' : 'w-full gap-3'}>
      {TOOLS.map((tool) => (
        <Pressable
          key={tool.id}
          accessibilityRole="button"
          accessibilityLabel={t('home.tool.opens', { label: t(tool.label) })}
          onPress={() => onPress(tool.href)}
          style={shadows.raised}
          className={cn(
            'items-center rounded-[16px] bg-card px-3 pb-4 pt-5 active:opacity-60',
            names.fits ? 'min-w-0 flex-1' : 'w-full',
          )}
        >
          {/* The same accent circle as the "Where it goes" rows above. */}
          <View className="h-[44px] w-[44px] items-center justify-center rounded-full bg-accent/10">
            <tool.icon size={20} color={colors.accentInk} strokeWidth={1.8} />
          </View>

          <FitText
            id={tool.id}
            role="control"
            size={14}
            className="text-center font-app-medium text-ink"
            slotClassName="mt-3 w-full flex-row items-center justify-center gap-0.5"
            after={<ChevronRight size={16} color={colors.muted} strokeWidth={2} />}
            reserve={CHEVRON_ROOM}
          >
            {t(tool.label)}
          </FitText>
        </Pressable>
      ))}
    </FitGroup>
  );
}
