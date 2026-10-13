import { Text, View } from 'react-native';

import { CARD, MARK, StandRow } from '@/components/insights/rows';
import { HIDDEN, Section, type SectionState } from '@/components/insights/section';
import { FitRows } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { isLightColor } from '@/lib/color';
import { contrast } from '@/lib/tone';
import { useColors } from '@/providers/theme-provider';
import { colors as fixedTones } from '@/theme/colors';
import { TEXT_CAP } from '@/theme/text-scale';

/** One card's debt. */
export type OweRow = {
  id: string;
  /** "Chase Sapphire 1004". */
  label: string;
  /** Whose initial the avatar carries. */
  holder: string;
  /** The card's face colour. */
  color: string;
  /** What it owes now, never below 0: a card in credit owes nothing. */
  owed: number;
};

/**
 * The card's face colour with its holder's initial, in the type that reads on that colour. A face
 * the colour of the card under it gets a hairline so it does not vanish.
 */
function CardAvatar({ holder, color }: { holder: string; color: string }) {
  const colors = useColors();
  const initial = holder.trim().charAt(0).toLocaleUpperCase();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width: MARK, height: MARK, backgroundColor: color },
        contrast(color, colors.card) < 1.5 && { borderWidth: 1, borderColor: colors.line },
      ]}
      className="items-center justify-center rounded-full"
    >
      <Text
        // The fixed ink, not the theme's: the face keeps its colour in dark mode.
        style={{ color: isLightColor(color) ? fixedTones.ink : '#FFFFFF' }}
        className="font-app-semibold text-[15px]"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {initial}
      </Text>
    </View>
  );
}

/**
 * What you owe on cards: each card's balance where it owes, to the cent. The walked balance wins
 * over the one typed when the card was added, which is never shown in its place: a balance that
 * failed to read fails the section. With no card the section is left off.
 */
export function OweSection({ state, rows }: { state: SectionState; rows: readonly OweRow[] }) {
  const shown = state.kind === 'ready' && rows.length === 0 ? HIDDEN : state;

  return (
    <Section
      id="owe"
      title={t('insights.owe.heading')}
      subtitle={t('insights.owe.subtitle')}
      seeAll="/cards"
      state={shown}
    >
      <FitRows className={`${CARD} gap-[12px]`} testID="insights-cards">
        {rows.map((card) => (
          <StandRow
            key={card.id}
            id={card.id}
            mark={<CardAvatar holder={card.holder} color={card.color} />}
            label={card.label}
            value={-card.owed}
            plain
          />
        ))}
      </FitRows>
    </Section>
  );
}
