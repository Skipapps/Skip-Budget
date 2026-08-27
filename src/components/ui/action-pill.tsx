import { Plus } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

type ActionPillProps = {
  label: string;
  onPress: () => void;
  className?: string;
};

/** The "+ New card" / "+ Add bill" header action, shared across list pages. */
export function ActionPill({ label, onPress, className }: ActionPillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={shadows.card}
      className={cn(
        'flex-row items-center gap-1.5 rounded-full border border-line bg-white py-2.5 pl-3 pr-4 active:bg-black/5',
        className,
      )}
    >
      <Plus size={18} color={colors.ink} strokeWidth={2.2} />
      <Text className="font-poppins-medium text-[14px] text-ink" maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Pressable>
  );
}
