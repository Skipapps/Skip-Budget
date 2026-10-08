import { Pressable, View } from 'react-native';

import { billCategoryHint, billCategoryLabel } from '@/components/bills/bill-row';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { BILL_CATEGORIES, type BillCategory } from '@/data/bill-categories';
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
 *
 * A word cannot wrap, and "Transportation" is wider than a two-up tile at large text on most
 * iPhones, so the labels shrink together, and so do the hints; one column once either would have to
 * go under its default size.
 */
export function CategoryPicker({ onSelect, selectedId }: CategoryPickerProps) {
  const colors = useColors();
  const labels = useFitGroup({ mode: 'shrink' });
  const hints = useFitGroup({ mode: 'shrink' });
  const twoUp = labels.fits && hints.fits;

  return (
    <FitGroup group={labels} className="w-full" testID="category-picker">
      <FitGroup group={hints} className="w-full flex-row flex-wrap gap-3">
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
              style={{ width: twoUp ? '47.5%' : '100%' }}
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

              <FitText
                group={labels}
                id={`${category.id}-label`}
                role="control"
                size={14}
                lineHeight={19}
                className="font-app-medium text-ink"
                slotClassName="mt-3 w-full"
              >
                {label}
              </FitText>
              <FitText
                group={hints}
                id={`${category.id}-hint`}
                role="control"
                size={11}
                lineHeight={15}
                className="font-app text-muted"
                slotClassName="mt-1 w-full"
              >
                {hint}
              </FitText>
            </Pressable>
          );
        })}
      </FitGroup>
    </FitGroup>
  );
}
