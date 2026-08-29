import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { useColors } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

type InsightBannerProps = {
  onPress?: () => void;
};

/**
 * Full-width dashboard banner. Deliberately carries no figure — the spending
 * tiles above already report numbers, and this points at the story behind them.
 *
 * Only dresses itself as a link when it has somewhere to go. A chevron and a
 * button role on a banner that does nothing is a promise the screen cannot
 * keep: it reads as tappable, announces itself as tappable to a screen reader,
 * and then swallows the tap. Without a destination it is simply a card.
 */
export function InsightBanner({ onPress }: InsightBannerProps) {
  const artwork = useArtwork();
  const colors = useColors();
  const Container = onPress ? Pressable : View;

  return (
    <Container
      {...(onPress
        ? {
            accessibilityRole: 'button' as const,
            accessibilityLabel: 'Insights. See the story behind your spending.',
            onPress,
          }
        : {})}
      style={shadows.raised}
      className={`w-full flex-row items-center gap-3 rounded-[16px] bg-card p-4 ${
        onPress ? 'active:opacity-80' : ''
      }`}
    >
      <View className="h-[76px] w-[76px] shrink-0">
        <artwork.insights width="100%" height="100%" />
      </View>

      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins-semibold text-[17px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          Insights
        </Text>
        <Text
          className="mt-1 font-poppins text-[13px] leading-[18px] text-muted"
          numberOfLines={2}
          maxFontSizeMultiplier={1.3}
        >
          See the story behind your spending
        </Text>
      </View>

      {onPress ? <ChevronRight size={20} color={colors.muted} strokeWidth={2} /> : null}
    </Container>
  );
}
