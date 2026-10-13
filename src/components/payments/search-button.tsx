import { Search } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Looks like a search field and opens the search page, where the real field takes the keyboard: the
 * list under it stays put rather than filtering as a person types.
 */
export function SearchButton({
  onPress,
  label,
  className,
  testID = 'search-button',
}: {
  onPress: () => void;
  /** The field's placeholder, and what VoiceOver reads; "Search payments" when left out. */
  label?: string;
  className?: string;
  testID?: string;
}) {
  const colors = useColors();
  const words = label ?? t('payments.search.placeholder');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={words}
      onPress={withTap(onPress)}
      testID={testID}
      className={cn(
        'min-h-[48px] w-full flex-row items-center gap-[10px] rounded-[14px] border border-line bg-card px-[14px] py-[12px] active:bg-ink/5',
        className,
      )}
    >
      <Search size={18} color={colors.muted} strokeWidth={2} />
      <Text className="shrink font-app text-[15px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
        {words}
      </Text>
    </Pressable>
  );
}
