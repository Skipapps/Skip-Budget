import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import InsightsArt from '@/assets/illustrations/insights.svg';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

type InsightBannerProps = {
  onPress?: () => void;
};

/**
 * Full-width dashboard banner. Deliberately carries no figure — the spending
 * tiles above already report numbers, and this points at the story behind them.
 */
export function InsightBanner({ onPress }: InsightBannerProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Insights. See the story behind your spending."
      onPress={onPress}
      style={shadows.card}
      className="w-full flex-row items-center gap-3 rounded-[10px] border border-line bg-white p-4 active:opacity-80"
    >
      <View className="h-[76px] w-[76px] shrink-0">
        <InsightsArt width="100%" height="100%" />
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

      <ChevronRight size={20} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}
