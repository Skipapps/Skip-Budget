import type { FC } from 'react';
import { useMemo } from 'react';
import type { SvgProps } from 'react-native-svg';

import type { LoanType } from '@/data/loan-types';
import { useTheme } from '@/providers/theme-provider';

// Relative paths rather than @/assets: Jest maps @/ to src/ only, and a test resolves these files.
import Business from '../../assets/gradient-icons/loan-type-business.svg';
import BusinessDark from '../../assets/gradient-icons/loan-type-business-dark.svg';
import Car from '../../assets/gradient-icons/loan-type-car.svg';
import CarDark from '../../assets/gradient-icons/loan-type-car-dark.svg';
import CreditCard from '../../assets/gradient-icons/loan-type-credit-card.svg';
import CreditCardDark from '../../assets/gradient-icons/loan-type-credit-card-dark.svg';
import Dates from '../../assets/gradient-icons/loan-dates.svg';
import DatesDark from '../../assets/gradient-icons/loan-dates-dark.svg';
import Details from '../../assets/gradient-icons/loan-details.svg';
import DetailsDark from '../../assets/gradient-icons/loan-details-dark.svg';
import Home from '../../assets/gradient-icons/loan-type-home.svg';
import HomeDark from '../../assets/gradient-icons/loan-type-home-dark.svg';
import Medical from '../../assets/gradient-icons/loan-type-medical.svg';
import MedicalDark from '../../assets/gradient-icons/loan-type-medical-dark.svg';
import MoreOptions from '../../assets/gradient-icons/loan-more-options.svg';
import MoreOptionsDark from '../../assets/gradient-icons/loan-more-options-dark.svg';
import Other from '../../assets/gradient-icons/loan-type-other.svg';
import OtherDark from '../../assets/gradient-icons/loan-type-other-dark.svg';
import Result from '../../assets/gradient-icons/loan-result.svg';
import ResultDark from '../../assets/gradient-icons/loan-result-dark.svg';
import Schedule from '../../assets/gradient-icons/loan-payment-schedule.svg';
import ScheduleDark from '../../assets/gradient-icons/loan-payment-schedule-dark.svg';
import Student from '../../assets/gradient-icons/loan-type-student.svg';
import StudentDark from '../../assets/gradient-icons/loan-type-student-dark.svg';

type Pair = { light: FC<SvgProps>; dark: FC<SvgProps> };

/**
 * The loan screens' gradient icons, each gradient written out in full because react-native-svg does
 * not follow one gradient's href to another. The dark drawings lift the navy so it reads on a dark
 * card.
 */
const ICONS = {
  result: { light: Result, dark: ResultDark },
  details: { light: Details, dark: DetailsDark },
  dates: { light: Dates, dark: DatesDark },
  moreOptions: { light: MoreOptions, dark: MoreOptionsDark },
  schedule: { light: Schedule, dark: ScheduleDark },
} satisfies Record<string, Pair>;

const TYPE_ICONS: Record<LoanType, Pair> = {
  // The designer drew Personal exactly as the result card's hand and coin, file for file.
  personal: { light: Result, dark: ResultDark },
  car: { light: Car, dark: CarDark },
  student: { light: Student, dark: StudentDark },
  home: { light: Home, dark: HomeDark },
  business: { light: Business, dark: BusinessDark },
  medical: { light: Medical, dark: MedicalDark },
  'credit-card': { light: CreditCard, dark: CreditCardDark },
  other: { light: Other, dark: OtherDark },
};

export type LoanIconName = keyof typeof ICONS;

function forScheme<Name extends string>(
  pairs: Record<Name, Pair>,
  scheme: 'light' | 'dark',
): Record<Name, FC<SvgProps>> {
  const resolved = {} as Record<Name, FC<SvgProps>>;
  for (const [name, pair] of Object.entries(pairs) as [Name, Pair][]) resolved[name] = pair[scheme];
  return resolved;
}

/** The loan screens' icons for the mode in force: the app's Light/Dark/System choice, not the phone's. */
export function useLoanIcons(): Record<LoanIconName, FC<SvgProps>> {
  const { scheme } = useTheme();
  return useMemo(() => forScheme(ICONS, scheme), [scheme]);
}

/** One icon per loan type, for the mode in force. */
export function useLoanTypeIcons(): Record<LoanType, FC<SvgProps>> {
  const { scheme } = useTheme();
  return useMemo(() => forScheme(TYPE_ICONS, scheme), [scheme]);
}
