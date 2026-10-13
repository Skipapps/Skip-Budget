import { ChevronDown } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { t } from '@/i18n';
import { selection } from '@/lib/haptics';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

export type PeriodMode = 'month' | 'year';

/**
 * Month or Year, side by side on one track. The chosen side is the accent and names what it shows
 * ("Oct 2026 ▾", "2026 ▾"): a tap there opens Choose month or Choose year. The other side only
 * says Month or Year, and a tap there switches to it. Both sides wrap at large text rather than
 * cutting a word.
 */
export function PeriodSwitch({
  mode,
  shown,
  shownA11y,
  onChoose,
  onMode,
  testID = 'insights-period',
}: {
  mode: PeriodMode;
  /** On the chosen side: "Oct 2026", "2026". */
  shown: string;
  /** What the chosen side shows and what a tap does: "Showing October 2026. Choose another month". */
  shownA11y: string;
  /** Opens Choose month or Choose year. */
  onChoose: () => void;
  onMode: (mode: PeriodMode) => void;
  testID?: string;
}) {
  const colors = useColors();
  const other: PeriodMode = mode === 'month' ? 'year' : 'month';

  const chosen = (
    <Pressable
      key="chosen"
      accessibilityRole="button"
      accessibilityLabel={shownA11y}
      accessibilityState={{ selected: true }}
      onPress={withTap(onChoose)}
      testID={`${testID}-${mode}`}
      className="min-h-[40px] flex-1 flex-row items-center justify-center gap-[6px] rounded-[12px] bg-accent px-[10px] py-[8px] active:bg-control-pressed"
    >
      <Text
        className="shrink text-center font-app-semibold text-[15px] text-on-control"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {shown}
      </Text>
      <ChevronDown size={16} color={colors.onControl} strokeWidth={2.4} />
    </Pressable>
  );

  const switcher = (
    <Pressable
      key="other"
      accessibilityRole="button"
      accessibilityLabel={t(
        other === 'year' ? 'insights.period.byYearA11y' : 'insights.period.byMonthA11y',
      )}
      accessibilityState={{ selected: false }}
      onPress={() => {
        selection();
        onMode(other);
      }}
      testID={`${testID}-${other}`}
      className="min-h-[40px] flex-1 items-center justify-center rounded-[12px] px-[10px] py-[8px] active:bg-ink/5"
    >
      <Text
        className="text-center font-app-medium text-[15px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {t(other === 'year' ? 'insights.period.year' : 'insights.period.month')}
      </Text>
    </Pressable>
  );

  return (
    <View
      testID={testID}
      className="w-full flex-row items-stretch gap-[4px] rounded-[16px] bg-ink/5 p-[4px]"
    >
      {mode === 'month' ? [chosen, switcher] : [switcher, chosen]}
    </View>
  );
}
