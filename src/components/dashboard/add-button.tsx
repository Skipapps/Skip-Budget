import { Plus } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

type AddButtonProps = {
  onPress?: () => void;
};

/** Floating action button for logging a new transaction. */
export function AddButton({ onPress }: AddButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add a transaction"
      onPress={withTap(onPress)}
      style={shadows.floating}
      className="h-16 w-16 items-center justify-center rounded-full bg-control active:opacity-90"
    >
      {/* The control's own foreground, not the page's. On eleven of the
          twelve accents `surface` is the wrong end of the ramp in at least one
          mode, which left a white plus on a butter disc. */}
      <Plus size={28} color={colors.onControl} strokeWidth={2} />
    </Pressable>
  );
}
