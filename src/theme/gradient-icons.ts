import type { FC } from 'react';
import { useMemo } from 'react';
import type { SvgProps } from 'react-native-svg';

import { useTheme } from '@/providers/theme-provider';

// Relative paths rather than @/assets: Jest maps @/ to src/ only, and a test resolves these files.
import Bell from '../../assets/gradient-icons/reminder.svg';
import BellDark from '../../assets/gradient-icons/reminder-dark.svg';
import Goals from '../../assets/gradient-icons/goals.svg';
import GoalsDark from '../../assets/gradient-icons/goals-dark.svg';
import Loans from '../../assets/gradient-icons/loans.svg';
import LoansDark from '../../assets/gradient-icons/loans-dark.svg';
import Salary from '../../assets/gradient-icons/salary.svg';
import SalaryDark from '../../assets/gradient-icons/salary-dark.svg';
import Savings from '../../assets/gradient-icons/savings.svg';
import SavingsDark from '../../assets/gradient-icons/savings-dark.svg';

/**
 * The designer's gradient icons, copied with every gradient written out in full: react-native-svg
 * does not follow one gradient's href to another. The dark ones lift the navy so it reads on a dark
 * card.
 */
const ICONS = {
  salary: { light: Salary, dark: SalaryDark },
  savings: { light: Savings, dark: SavingsDark },
  loans: { light: Loans, dark: LoansDark },
  goals: { light: Goals, dark: GoalsDark },
  bell: { light: Bell, dark: BellDark },
} satisfies Record<string, { light: FC<SvgProps>; dark: FC<SvgProps> }>;

export type GradientIconName = keyof typeof ICONS;

/** Every icon for the mode in force, which is the app's Light/Dark/System choice, not the phone's. */
export function useGradientIcons(): Record<GradientIconName, FC<SvgProps>> {
  const { scheme } = useTheme();
  return useMemo(() => {
    const resolved = {} as Record<GradientIconName, FC<SvgProps>>;
    for (const [name, pair] of Object.entries(ICONS) as [
      GradientIconName,
      (typeof ICONS)['bell'],
    ][]) {
      resolved[name] = pair[scheme];
    }
    return resolved;
  }, [scheme]);
}
