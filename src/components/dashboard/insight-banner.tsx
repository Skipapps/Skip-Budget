import { ChevronRight, TrendingUp } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { shadows } from '@/theme/shadows';
import { useColors } from '@/providers/theme-provider';

type InsightBannerProps = {
  /** Hides the PRO badge once they have it — the card itself stays. */
  pro?: boolean;
  onPress?: () => void;
};

/**
 * Full-width dashboard card. Deliberately carries no figure — the list above
 * already reports numbers, and this points at the story behind them.
 *
 * Raised on a shadow with no border, like the tool cards beside it: it is
 * meant to be pressed, and an outline and a shadow together flatten each
 * other out.
 *
 * Only dresses itself as a link when it has somewhere to go. A chevron and a
 * button role on a banner that does nothing is a promise the screen cannot
 * keep: it reads as tappable, announces itself as tappable to a screen reader,
 * and then swallows the tap. Without a destination it is simply a card.
 */
export function InsightBanner({ pro = true, onPress }: InsightBannerProps) {
  const colors = useColors();
  const Container = onPress ? Pressable : View;

  return (
    <Container
      {...(onPress
        ? {
            accessibilityRole: 'button' as const,
            accessibilityLabel: `Insights.${pro ? '' : ' Pro feature.'} See the story behind your spending.`,
            onPress,
          }
        : {})}
      style={shadows.raised}
      className={`w-full flex-row items-center gap-3 rounded-[16px] bg-card px-4 py-3.5 ${
        onPress ? 'active:opacity-60' : ''
      }`}
    >
      {/* A 76pt drawing at 55% opacity was the biggest thing on the dashboard
          and said nothing the two lines beside it did not. The glyph is the
          same size as every other leading mark on the screen, so this reads as
          a peer of the tool cards rather than an advert wedged between two. */}
      <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/5">
        <TrendingUp size={20} color={colors.body} strokeWidth={1.8} />
      </View>

      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          Insights
        </Text>
        <Text
          className="mt-0.5 font-poppins text-[12px] leading-[17px] text-muted"
          numberOfLines={2}
          maxFontSizeMultiplier={1.3}
        >
          See the story behind your spending
        </Text>
      </View>

      {pro ? null : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="shrink-0 rounded-full bg-accent px-2 py-0.5"
        >
          <Text allowFontScaling={false} className="font-poppins-bold text-[9px] text-on-control">
            PRO
          </Text>
        </View>
      )}

      {/* A row child rather than an absolute corner pin, so the row's own
          items-center does the vertical centring — and the chevron keeps its
          distance from the text instead of overlapping it when the label wraps
          to a second line at large type sizes. */}
      {onPress ? (
        <View className="shrink-0 pl-1">
          <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
        </View>
      ) : null}
    </Container>
  );
}
