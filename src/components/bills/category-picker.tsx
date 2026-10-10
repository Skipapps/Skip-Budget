import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { BillIcon } from '@/components/bills/bill-icon';
import { billCategoryHint, billCategoryLabel } from '@/components/bills/bill-row';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { BILL_CATEGORIES, type BillCategory } from '@/data/bill-categories';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type CategoryPickerProps = {
  /** Hands back the category itself, English label included: a new bill is named after it. */
  onSelect: (category: BillCategory) => void;
  selectedId?: string;
};

/**
 * The bill categories, two to a row: each tile its gradient icon, name and what it covers. Neither
 * line is capped: Spanish and French hints run longer, and a taller tile beats a cut one.
 *
 * A word cannot wrap, and "Transportation" is wider than a two-up tile at large text on most
 * iPhones, so the names shrink together, and so do the hints; one column once either would have to
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
                'rounded-[18px]',
                // The chosen border is half a point wider, taken from the padding, so nothing moves.
                selected
                  ? 'border-[1.5px] border-accent-ink bg-accent/10 p-[15.5px]'
                  : 'border border-line bg-card p-[16px] active:bg-ink/5',
              )}
            >
              <View
                className="h-[40px] w-[40px]"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <BillIcon choice={{ kind: 'category', id: category.id }} size={40} />
              </View>

              {selected ? (
                <View
                  testID={`category-check-${category.id}`}
                  className="absolute right-[12px] top-[12px] h-[22px] w-[22px] items-center justify-center rounded-full bg-accent-ink"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <Check size={14} color={colors.card} strokeWidth={3} />
                </View>
              ) : null}

              <FitText
                group={labels}
                id={`${category.id}-label`}
                role="control"
                size={15}
                lineHeight={20}
                className="font-app-semibold text-ink"
                slotClassName="mt-[14px] w-full"
              >
                {label}
              </FitText>
              <FitText
                group={hints}
                id={`${category.id}-hint`}
                role="control"
                size={12}
                lineHeight={16}
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
