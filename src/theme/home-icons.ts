import type { FC } from 'react';
import { useMemo } from 'react';
import type { SvgProps } from 'react-native-svg';

import { useTheme } from '@/providers/theme-provider';

// Relative paths rather than @/assets: Jest maps @/ to src/ only, and a test resolves these files.
import Bill from '../../assets/gradient-icons/home-bill.svg';
import BillDark from '../../assets/gradient-icons/home-bill-dark.svg';
import Insights from '../../assets/gradient-icons/home-insights.svg';
import InsightsDark from '../../assets/gradient-icons/home-insights-dark.svg';
import Receipt from '../../assets/gradient-icons/home-receipt.svg';
import ReceiptDark from '../../assets/gradient-icons/home-receipt-dark.svg';
import SpendingHabits from '../../assets/gradient-icons/home-spending-habits.svg';
import SpendingHabitsDark from '../../assets/gradient-icons/home-spending-habits-dark.svg';
import Subscription from '../../assets/gradient-icons/home-subscription.svg';
import SubscriptionDark from '../../assets/gradient-icons/home-subscription-dark.svg';
// The designer drew these two exactly as the Cards tab's Loans and Salary tiles, so Home reads the
// same files rather than a second copy of each.
import Loans from '../../assets/gradient-icons/loans.svg';
import LoansDark from '../../assets/gradient-icons/loans-dark.svg';
import Salary from '../../assets/gradient-icons/salary.svg';
import SalaryDark from '../../assets/gradient-icons/salary-dark.svg';

/**
 * Home's gradient icons, each gradient written out in full because react-native-svg does not follow
 * one gradient's href to another. The dark drawings lift the navy so it reads on a dark card.
 */
const ICONS = {
  receipt: { light: Receipt, dark: ReceiptDark },
  bill: { light: Bill, dark: BillDark },
  subscription: { light: Subscription, dark: SubscriptionDark },
  salary: { light: Salary, dark: SalaryDark },
  loanCalculator: { light: Loans, dark: LoansDark },
  spendingHabits: { light: SpendingHabits, dark: SpendingHabitsDark },
  insights: { light: Insights, dark: InsightsDark },
} satisfies Record<string, { light: FC<SvgProps>; dark: FC<SvgProps> }>;

export type HomeIconName = keyof typeof ICONS;

/** Every Home icon for the mode in force: the app's Light/Dark/System choice, not the phone's. */
export function useHomeIcons(): Record<HomeIconName, FC<SvgProps>> {
  const { scheme } = useTheme();
  return useMemo(() => {
    const resolved = {} as Record<HomeIconName, FC<SvgProps>>;
    for (const [name, pair] of Object.entries(ICONS) as [
      HomeIconName,
      (typeof ICONS)['receipt'],
    ][]) {
      resolved[name] = pair[scheme];
    }
    return resolved;
  }, [scheme]);
}
