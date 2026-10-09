import type { Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { HomeTile, type HomeTileGroups } from '@/components/dashboard/home-tile';
import { FitGroup, useFitGroup } from '@/components/ui/fit-group';
import { t, type MessageKey } from '@/i18n';
import { useColors } from '@/providers/theme-provider';
import { useHomeIcons } from '@/theme/home-icons';

type Tool = {
  id: 'loanCalculator' | 'spendingHabits';
  label: MessageKey;
  note: MessageKey;
  href: Href;
  /** Where it goes, and what it says, while it carries the PRO pill. */
  locked?: { href: Href; label: MessageKey };
};

/** Tools rather than spending, so tiles rather than list rows. */
const TOOLS: Tool[] = [
  {
    id: 'loanCalculator',
    label: 'home.tool.loanCalculator',
    note: 'home.tool.loanCalculatorNote',
    href: '/loan-calculator',
  },
  {
    id: 'spendingHabits',
    label: 'home.tool.spendingHabits',
    note: 'home.tool.spendingHabitsNote',
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

/**
 * The two tools side by side, names at one size and notes at another. If either would have to go
 * under its design size to fit, the two stack, each the full width.
 */
export function ToolCards({ onPress, habitsLocked = false }: ToolCardsProps) {
  const colors = useColors();
  const icons = useHomeIcons();
  const groups: HomeTileGroups = {
    names: useFitGroup({ mode: 'shrink' }),
    notes: useFitGroup({ mode: 'shrink' }),
  };
  const sideBySide = groups.names.fits && groups.notes.fits;

  return (
    <FitGroup group={groups.names} className="w-full" testID="go-further">
      <FitGroup
        group={groups.notes}
        className={sideBySide ? 'w-full flex-row gap-[12px]' : 'w-full gap-[12px]'}
        testID="go-further-tools"
      >
        {TOOLS.map((tool) => {
          const locked = habitsLocked ? tool.locked : undefined;
          return (
            <HomeTile
              key={tool.id}
              id={tool.id}
              icon={icons[tool.id]}
              mark={
                <View className="flex-row items-center gap-[6px]">
                  {locked ? (
                    // A sticker: its word is in the tile's label.
                    <View className="rounded-full bg-accent px-2 py-0.5">
                      <Text
                        allowFontScaling={false}
                        className="font-app-bold text-[9px] text-on-control"
                      >
                        PRO
                      </Text>
                    </View>
                  ) : null}
                  {/* Lighter than the type, as drawn: the whole tile is the button. */}
                  <View style={{ opacity: 0.55 }}>
                    <ChevronRight size={20} color={colors.muted} strokeWidth={2} />
                  </View>
                </View>
              }
              name={t(tool.label)}
              note={t(tool.note)}
              groups={groups}
              accessibilityLabel={
                locked ? t(locked.label) : t('home.tool.opens', { label: t(tool.label) })
              }
              onPress={() => onPress(locked ? locked.href : tool.href)}
              className={sideBySide ? 'min-w-0 flex-1' : 'w-full'}
            />
          );
        })}
      </FitGroup>
    </FitGroup>
  );
}
