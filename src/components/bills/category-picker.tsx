import { Pressable, Text, View } from 'react-native';

import { billCategoryHint, billCategoryLabel } from '@/components/bills/bill-row';
import { BILL_CATEGORIES, type BillCategory } from '@/data/bills-mock';
import { GLYPH_STROKE } from '@/data/glyphs';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type CategoryPickerProps = {
  /** Hands back the category itself, English label included: a new bill is named after it. */
  onSelect: (category: BillCategory) => void;
  selectedId?: string;
};

/**
 * Grid of the common recurring bills, two-up so label and hint have room. Neither line is capped:
 * Spanish and French hints run longer, and a taller tile beats a cut one.
 */
export function CategoryPicker({ onSelect, selectedId }: CategoryPickerProps) {
  const colors = useColors();
  return (
    <View className="w-full flex-row flex-wrap gap-3">
      {BILL_CATEGORIES.map((category) => {
        const Icon = category.icon;
        const selected = category.id === selectedId;
        const label = billCategoryLabel(category.id, category.label);
        const hint = billCategoryHint(category.id, category.hint);

        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${label}. ${hint}`}
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
              maxFontSizeMultiplier={1.3}
            >
              {label}
            </Text>
            <Text
              className="mt-1 font-app text-[11px] leading-[15px] text-muted"
              maxFontSizeMultiplier={1.2}
            >
              {hint}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
