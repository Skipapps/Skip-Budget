import { ChevronRight, TrendingUp } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { t } from '@/i18n';
import { shadows } from '@/theme/shadows';
import { TEXT_CAP } from '@/theme/text-scale';
import { useColors } from '@/providers/theme-provider';

type InsightBannerProps = {
  /** Hides the PRO badge once they have it — the card itself stays. */
  pro?: boolean;
  onPress?: () => void;
};

/**
 * Full-width dashboard card with no figure: the list above reports numbers, this points at the
 * story behind them. Raised on a shadow with no border, like the tool cards (an outline and a
 * shadow together flatten each other). It dresses as a link only when it has somewhere to go: a
 * chevron and button role on a banner that does nothing is a promise the screen cannot keep.
 */
export function InsightBanner({ pro = true, onPress }: InsightBannerProps) {
  const colors = useColors();
  const Container = onPress ? Pressable : View;

  return (
    <Container
      {...(onPress
        ? {
            accessibilityRole: 'button' as const,
            accessibilityLabel: t(pro ? 'home.insights.label' : 'home.insights.labelLocked'),
            onPress,
          }
        : {})}
      style={shadows.raised}
      className={`w-full flex-row items-center gap-3 rounded-[16px] bg-card px-4 py-3.5 ${
        onPress ? 'active:opacity-60' : ''
      }`}
    >
      {/* The same accent circle as the "Where it goes" rows above. */}
      <View className="h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-accent/10">
        <TrendingUp size={20} color={colors.accentInk} strokeWidth={1.8} />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="font-app-medium text-[15px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
          {t('home.insights.title')}
        </Text>
        <Text
          className="mt-0.5 font-app text-[12px] leading-[17px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('home.insights.detail')}
        </Text>
      </View>

      {pro ? null : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="shrink-0 rounded-full bg-accent px-2 py-0.5"
        >
          <Text allowFontScaling={false} className="font-app-bold text-[9px] text-on-control">
            PRO
          </Text>
        </View>
      )}

      {/* A row child rather than an absolute corner pin, so items-center centres it and it keeps
          its distance from the text when the label wraps at large type. */}
      {onPress ? (
        <View className="shrink-0 pl-1">
          <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
        </View>
      ) : null}
    </Container>
  );
}
