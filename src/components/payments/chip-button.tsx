import { ChevronDown } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/cn';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

export type ChipButtonProps = {
  /** "Oct 2026", "This year". */
  label: string;
  /** What it shows and what a tap does: "Showing Oct 2026. Choose another month". */
  accessibilityLabel: string;
  onPress: () => void;
  /** `accent` sits on the plum card; `page` sits on the page. */
  tone?: 'accent' | 'page';
  testID?: string;
};

/**
 * The month or year a page shows, with the arrow that says a tap picks another. A long label wraps
 * inside the pill at large text rather than being cut. On the plum card the fill is a tenth of
 * white, no more, so the white label keeps its 4.5:1.
 */
export function ChipButton({
  label,
  accessibilityLabel,
  onPress,
  tone = 'page',
  testID,
}: ChipButtonProps) {
  const colors = useColors();
  const onAccent = tone === 'accent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={withTap(onPress)}
      // 32pt drawn, 44pt to the finger.
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      testID={testID}
      className={cn(
        'min-h-[32px] max-w-full flex-row items-center gap-[4px] rounded-full py-[6px] pl-[12px] pr-[10px]',
        onAccent
          ? 'bg-on-control/10 active:bg-on-control/20'
          : 'border border-line bg-card active:bg-ink/5',
      )}
    >
      <Text
        className={cn(
          'shrink font-app-semibold text-[13px]',
          onAccent ? 'text-on-control' : 'text-ink',
        )}
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {label}
      </Text>
      <ChevronDown size={15} color={onAccent ? colors.onControl : colors.ink} strokeWidth={2.2} />
    </Pressable>
  );
}
