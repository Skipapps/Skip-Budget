import type { Href } from 'expo-router';
import { CalendarCheck, ChevronRight, Landmark } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

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
  /** Where it goes, and what it says, while it carries the PRO pill. */
  locked?: { href: Href; label: MessageKey };
};

/** Tools rather than spending, so cards rather than list rows. */
const TOOLS: Tool[] = [
  {
    id: 'loan-calculator',
    label: 'home.tool.loanCalculator',
    icon: Landmark,
    href: '/loan-calculator',
  },
  {
    id: 'spending-habits',
    label: 'home.tool.spendingHabits',
    icon: CalendarCheck,
    href: '/habits',
    locked: {
      href: { pathname: '/pro-feature', params: { id: 'habits' } },
      label: 'home.tool.habitsLocked',
    },
  },
];

type ToolCardsProps = {
  onPress: (href: Href) => void;
  /**
   * Spending habits wears the PRO pill and opens the explainer. Only for an account known to be
   * free with no habits known to exist: a lapsed account keeps using the habits it has.
   */
  habitsLocked?: boolean;
};

/** The chevron after the label: 16pt and the 2pt gap before it. */
const CHEVRON_ROOM = 18;

/**
 * A raised card: shadow and no border (an outline would flatten the lift). Side by side, the tool
 * names share one size; cards that cannot hold it stack.
 */
export function ToolCards({ onPress, habitsLocked = false }: ToolCardsProps) {
  const colors = useColors();
  const names = useFitGroup({ mode: 'shrink' });

  return (
    <FitGroup group={names} className={names.fits ? 'w-full flex-row gap-3' : 'w-full gap-3'}>
      {TOOLS.map((tool) => {
        const locked = habitsLocked ? tool.locked : undefined;
        return (
          <Pressable
            key={tool.id}
            accessibilityRole="button"
            accessibilityLabel={
              locked ? t(locked.label) : t('home.tool.opens', { label: t(tool.label) })
            }
            onPress={() => onPress(locked ? locked.href : tool.href)}
            style={shadows.raised}
            className={cn(
              'items-center rounded-[16px] bg-card px-3 pb-4 pt-5 active:opacity-60',
              names.fits ? 'min-w-0 flex-1' : 'w-full',
            )}
          >
            {locked ? (
              // The Insights card's pill; its words are in the card's label.
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                className="absolute right-2.5 top-2.5 rounded-full bg-accent px-2 py-0.5"
              >
                <Text allowFontScaling={false} className="font-app-bold text-[9px] text-on-control">
                  PRO
                </Text>
              </View>
            ) : null}

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
        );
      })}
    </FitGroup>
  );
}
