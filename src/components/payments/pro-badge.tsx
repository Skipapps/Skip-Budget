import { Text, View } from 'react-native';

import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The small "Pro" beside a year only Pro lists in full. Silent to VoiceOver: the row it sits in says
 * it in its own label, so it is never read twice.
 */
export function ProBadge({ className }: { className?: string }) {
  return (
    <View
      testID="pro-badge"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('self-center rounded-[6px] bg-tint px-[7px] py-[2px]', className)}
    >
      <Text
        className="font-app-semibold text-[11px] text-tint-ink"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {t('payments.pro.badge')}
      </Text>
    </View>
  );
}
