import { View } from 'react-native';

import { LoanTypeIcon } from '@/components/calculators/loan-type-icon';
import type { BillIconCategory, BillIconChoice } from '@/data/bill-categories';
import { useBillIcons } from '@/theme/bill-icons';

function CategoryIcon({ id, size }: { id: BillIconCategory; size: number }) {
  const Icon = useBillIcons()[id];
  return <Icon width={size} height={size} />;
}

/** A bill's gradient icon, as `billIconOf` chose it: its loan's type or its category's. Decorative. */
export function BillIcon({ choice, size }: { choice: BillIconChoice; size: number }) {
  return choice.kind === 'loan' ? (
    <LoanTypeIcon type={choice.type} size={size} />
  ) : (
    <CategoryIcon id={choice.id} size={size} />
  );
}

/** A category's icon in the 40pt well the review pages draw beside each line. */
export function BillIconWell({ choice }: { choice: BillIconChoice }) {
  return (
    <View
      className="h-10 w-10 items-center justify-center rounded-[12px] bg-ink/5"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <BillIcon choice={choice} size={26} />
    </View>
  );
}
