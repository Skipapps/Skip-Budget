import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { t } from '@/i18n';
import { TEXT_CAP } from '@/theme/text-scale';
import { useColors } from '@/providers/theme-provider';
import { useHomeIcons } from '@/theme/home-icons';

type InsightBannerProps = {
  /** Hides the PRO badge once they have it — the card itself stays. */
  pro?: boolean;
  onPress?: () => void;
};

/**
 * Full-width card under the two tools, with no figure: the list above reports numbers, this points
 * at the story behind them. It dresses as a link only when it has somewhere to go: a chevron and
 * button role on a banner that does nothing is a promise the screen cannot keep.
 */
export function InsightBanner({ pro = true, onPress }: InsightBannerProps) {
  const colors = useColors();
  const { insights: Icon } = useHomeIcons();
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
      testID="insight-banner"
      className={`w-full flex-row items-center gap-[12px] rounded-[20px] border border-line bg-card p-[16px] ${
        onPress ? 'active:opacity-80' : ''
      }`}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-[42px] w-[42px] shrink-0"
      >
        <Icon width="100%" height="100%" />
      </View>

      <View className="min-w-0 flex-1">
        <Text
          className="font-app-semibold text-[15px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('home.insights.title')}
        </Text>
        <Text
          className="mt-[4px] font-app text-[12px] text-muted"
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
          its distance from the text when the words wrap at large type. */}
      {onPress ? (
        <View className="shrink-0" style={{ opacity: 0.55 }}>
          <ChevronRight size={20} color={colors.muted} strokeWidth={2} />
        </View>
      ) : null}
    </Container>
  );
}
