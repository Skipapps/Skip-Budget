import { X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The second way out under a page's button, in the accent as drawn ("Keep it in savings", "Maybe
 * later", "View goals"), or in red for a removal at the end of a form.
 */
export function QuietAction({
  label,
  onPress,
  tone = 'accent',
  disabled = false,
  className,
  testID,
}: {
  label: string;
  onPress: () => void;
  tone?: 'accent' | 'danger';
  disabled?: boolean;
  className?: string;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={withTap(onPress)}
      testID={testID}
      className={cn(
        'min-h-[44px] w-full items-center justify-center px-4 py-3 active:opacity-60',
        disabled && 'opacity-50',
        className,
      )}
    >
      <Text
        className={cn(
          'text-center font-app-semibold text-[16px]',
          tone === 'danger' ? 'text-danger' : 'text-accent-ink',
        )}
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A page that is closed rather than gone back from: the round X top right, as the wrap-up has. */
export function CloseHeader({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  return (
    <View className="w-full flex-row justify-end pt-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        onPress={withTap(onClose)}
        hitSlop={2}
        testID="close-page"
        className="h-[40px] w-[40px] items-center justify-center rounded-full border border-line bg-card active:bg-ink/5"
      >
        <X size={18} color={colors.ink} strokeWidth={2} />
      </Pressable>
    </View>
  );
}
