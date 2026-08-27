import { Pressable, Text, View } from 'react-native';

import { BILL_CATEGORIES, type BillCategory } from '@/data/bills-mock';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';

type CategoryPickerProps = {
  onSelect: (category: BillCategory) => void;
  selectedId?: string;
};

/**
 * Grid of the common recurring bills. Two-up so the label and its hint have
 * room to read — a four-up grid would truncate "Memberships & Services".
 */
export function CategoryPicker({ onSelect, selectedId }: CategoryPickerProps) {
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
              selected ? 'border-control bg-black/[0.03]' : 'border-line bg-white',
            )}
          >
            <View
              className={cn(
                'h-11 w-11 items-center justify-center rounded-[10px]',
                selected ? 'bg-control' : 'bg-black/5',
              )}
            >
              <Icon width={22} height={22} color={selected ? colors.surface : colors.body} />
            </View>

            <Text
              className="mt-3 font-poppins-medium text-[14px] leading-[19px] text-ink"
              numberOfLines={2}
              maxFontSizeMultiplier={1.3}
            >
              {category.label}
            </Text>
            <Text
              className="mt-1 font-poppins text-[11px] leading-[15px] text-muted"
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
