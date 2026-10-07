import { Pressable, Text, View } from 'react-native';

import { BILL_CATEGORIES, type BillCategory } from '@/data/bills-mock';
import { GLYPH_STROKE } from '@/data/glyphs';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type CategoryPickerProps = {
  onSelect: (category: BillCategory) => void;
  selectedId?: string;
};

/** Grid of the common recurring bills, two-up so label and hint have room. */
export function CategoryPicker({ onSelect, selectedId }: CategoryPickerProps) {
  const colors = useColors();
  return (
    <View className="w-full flex-row flex-wrap gap-3">
      {BILL_CATEGORIES.map((category) => {
        const Icon = category.icon;
        const selected = category.id === selectedId;

        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${category.label}. ${category.hint}`}
            onPress={() => onSelect(category)}
            style={{ width: '47.5%' }}
            className={cn(
              'rounded-[10px] border p-3.5 active:opacity-80',
              selected ? 'border-control bg-ink/[0.03]' : 'border-line bg-card',
            )}
          >
            <View
              className={cn(
                'h-11 w-11 items-center justify-center rounded-[10px]',
                selected ? 'bg-control' : 'bg-ink/5',
              )}
            >
              <Icon
                size={22}
                strokeWidth={GLYPH_STROKE}
                color={selected ? colors.onControl : colors.body}
              />
            </View>

            <Text
              className="mt-3 font-app-medium text-[14px] leading-[19px] text-ink"
              numberOfLines={2}
              maxFontSizeMultiplier={1.3}
            >
              {category.label}
            </Text>
            <Text
              className="mt-1 font-app text-[11px] leading-[15px] text-muted"
              numberOfLines={2}
              maxFontSizeMultiplier={1.2}
            >
              {category.hint}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
