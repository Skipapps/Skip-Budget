import { View } from 'react-native';

import { bookIconId } from '@/data/receipt-books';
import { useBookIcons } from '@/theme/book-icons';

/** A book's gradient drawing. Decorative: the pill or row beside it says which book. */
export function BookIcon({ iconId, size }: { iconId: string | null | undefined; size: number }) {
  const Icon = useBookIcons()[bookIconId(iconId)];
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon width={size} height={size} />
    </View>
  );
}
