import { Pressable, View } from 'react-native';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { LOAN_TYPES, loanTypeLabelKey, type LoanType } from '@/data/loan-types';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import { useLoanTypeIcons } from '@/theme/loan-icons';

/**
 * Pick one of the eight loan types, four to a row. The names shrink together, never below their
 * design size; when a word still cannot fit its tile, the grid goes to two wider columns instead.
 */
export function LoanTypeGrid({
  value,
  onChange,
}: {
  value: LoanType;
  onChange: (type: LoanType) => void;
}) {
  const icons = useLoanTypeIcons();
  const names = useFitGroup({ mode: 'shrink' });
  const columns = names.fits ? 4 : 2;

  const rows: LoanType[][] = [];
  for (let at = 0; at < LOAN_TYPES.length; at += columns) {
    rows.push(LOAN_TYPES.slice(at, at + columns));
  }

  return (
    <FitGroup group={names} className="w-full" testID="loan-type-grid">
      <View accessibilityRole="radiogroup" className="w-full gap-[8px]">
        {rows.map((row) => (
          <View key={row[0]} className="w-full flex-row gap-[8px]">
            {row.map((type) => {
              const Icon = icons[type];
              const selected = type === value;
              const label = t(loanTypeLabelKey(type));
              return (
                <Pressable
                  key={type}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  accessibilityLabel={label}
                  onPress={() => {
                    selection();
                    onChange(type);
                  }}
                  className={cn(
                    'min-w-0 flex-1 items-center rounded-[14px]',
                    // The thicker chosen border takes its extra point from the padding, so nothing moves.
                    selected
                      ? 'border-2 border-accent bg-accent/10 px-[5px] pb-[9px] pt-[11px]'
                      : 'border border-line bg-card px-[6px] pb-[10px] pt-[12px] active:bg-ink/5',
                  )}
                >
                  <View
                    className="h-[34px] w-[34px]"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    <Icon width="100%" height="100%" />
                  </View>
                  <FitText
                    id={`type-${type}`}
                    role="control"
                    size={12}
                    className={cn(
                      'text-center font-app-medium',
                      selected ? 'text-accent-ink' : 'text-body',
                    )}
                    slotClassName="mt-[6px] w-full"
                  >
                    {label}
                  </FitText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </FitGroup>
  );
}
