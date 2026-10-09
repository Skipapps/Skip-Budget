import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type FlowSummaryProps = {
  icon: LucideIcon;
  title: string;
  caption?: string;
};

/** What a step's answer amounts to, read back in a sentence ("Due every month on the 22nd"). */
export function FlowSummary({ icon: Icon, title, caption }: FlowSummaryProps) {
  const colors = useColors();
  return (
    <View
      accessible
      className="w-full flex-row items-center gap-[12px] rounded-[16px] border border-line bg-card p-[14px]"
    >
      <View className="h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-accent/10">
        <Icon size={18} color={colors.accentInk} strokeWidth={1.8} />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className="font-app-semibold text-[15px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {title}
        </Text>
        {caption ? (
          <Text
            className="mt-0.5 font-app text-[12px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
