import { router } from 'expo-router';
import { ChevronRight, History } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Where a free list stops at 90 days: says the older rows are kept, not gone, and opens what Pro
 * shows. Drawn only when something older actually exists.
 */
export function HistoryNotice({ className }: { className?: string }) {
  const colors = useColors();
  const title = t('pro.history.notice.title');
  const detail = t('pro.history.notice.detail');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={() => router.push({ pathname: '/pro-feature', params: { id: 'history' } })}
      className={cn(
        'w-full flex-row items-center gap-3 rounded-[16px] border border-line bg-card px-4 py-3.5 active:bg-ink/5',
        className,
      )}
    >
      <History size={18} color={colors.muted} strokeWidth={1.8} />
      <View className="min-w-0 flex-1">
        <Text className="font-app-medium text-[14px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
          {title}
        </Text>
        <Text
          className="mt-0.5 font-app text-[12px] leading-[17px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {detail}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.muted} strokeWidth={1.8} />
    </Pressable>
  );
}
