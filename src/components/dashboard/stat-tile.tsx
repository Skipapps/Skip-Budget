import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';

type StatTone = 'positive' | 'negative';

type StatTileProps = {
  label: string;
  amount: number;
  icon: LucideIcon;
  /** Drives the icon tint: money in vs money out. */
  tone: StatTone;
  className?: string;
};

const badge: Record<StatTone, string> = {
  positive: 'bg-emerald-50',
  negative: 'bg-accent/15',
};

const iconColor: Record<StatTone, string> = {
  positive: '#059669',
  negative: '#FA8F6F',
};

/** Compact figure that sits under the total balance (payday, expenses). */
export function StatTile({ label, amount, icon: Icon, tone, className }: StatTileProps) {
  return (
    <View
      className={cn(
        'flex-1 flex-row items-center gap-2.5 rounded-[10px] border border-line px-3 py-2.5',
        className,
      )}
    >
      <View className={cn('h-8 w-8 items-center justify-center rounded-full', badge[tone])}>
        <Icon size={16} color={iconColor[tone]} strokeWidth={2.2} />
      </View>

      <View className="flex-1">
        <Text className="font-poppins text-[11px] text-muted" maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
        <Text
          className="font-poppins-semibold text-[14px] text-ink"
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {formatCurrency(amount)}
        </Text>
      </View>
    </View>
  );
}
