import { Clock, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { SectionCard } from '@/components/payments/section-card';
import { t } from '@/i18n';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The searches kept on the phone, newest first: a tap searches again, × forgets one. Drawn only when
 * there is one.
 */
export function RecentSearches({
  recent,
  onPick,
  onForget,
}: {
  recent: readonly string[];
  onPick: (query: string) => void;
  onForget: (query: string) => void;
}) {
  const colors = useColors();
  if (recent.length === 0) return null;

  return (
    <SectionCard
      testID="recent-searches"
      className="mt-5"
      title={t('payments.search.recent')}
      titleTone="label"
    >
      {recent.map((query) => (
        <View key={query} className="w-full flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={query}
            onPress={withTap(() => onPick(query))}
            testID={`recent-${query}`}
            className="min-h-[48px] min-w-0 flex-1 flex-row items-center gap-3 py-3 pl-[16px] active:bg-ink/5"
          >
            <Clock size={16} color={colors.muted} strokeWidth={2} />
            <Text
              className="min-w-0 flex-1 font-app text-[15px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {query}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('payments.search.removeRecent', { query })}
            onPress={() => onForget(query)}
            hitSlop={8}
            testID={`forget-${query}`}
            className="h-11 w-11 items-center justify-center active:opacity-60"
          >
            <X size={16} color={colors.muted} strokeWidth={2.2} />
          </Pressable>
        </View>
      ))}
    </SectionCard>
  );
}
