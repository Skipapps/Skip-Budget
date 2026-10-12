import type { FC } from 'react';
import { useMemo } from 'react';
import type { SvgProps } from 'react-native-svg';

import type { GoalType } from '@/data/goal-types';
import { useTheme } from '@/providers/theme-provider';

// Relative paths rather than @/assets: Jest maps @/ to src/ only, and a test resolves these files.
// Ten of the twelve types wear a drawing the app already has, file for file.
import Education from '../../assets/gradient-icons/bill-education.svg';
import EducationDark from '../../assets/gradient-icons/bill-education-dark.svg';
import Health from '../../assets/gradient-icons/bill-health.svg';
import HealthDark from '../../assets/gradient-icons/bill-health-dark.svg';
import Phone from '../../assets/gradient-icons/bill-mobile.svg';
import PhoneDark from '../../assets/gradient-icons/bill-mobile-dark.svg';
import Gifts from '../../assets/gradient-icons/book-gifts.svg';
import GiftsDark from '../../assets/gradient-icons/book-gifts-dark.svg';
import Family from '../../assets/gradient-icons/book-kids-family.svg';
import FamilyDark from '../../assets/gradient-icons/book-kids-family-dark.svg';
import Pets from '../../assets/gradient-icons/book-pets.svg';
import PetsDark from '../../assets/gradient-icons/book-pets-dark.svg';
import Wedding from '../../assets/gradient-icons/book-wedding.svg';
import WeddingDark from '../../assets/gradient-icons/book-wedding-dark.svg';
import Emergency from '../../assets/gradient-icons/goal-emergency.svg';
import EmergencyDark from '../../assets/gradient-icons/goal-emergency-dark.svg';
import Trip from '../../assets/gradient-icons/goal-trip.svg';
import TripDark from '../../assets/gradient-icons/goal-trip-dark.svg';
import Other from '../../assets/gradient-icons/goals.svg';
import OtherDark from '../../assets/gradient-icons/goals-dark.svg';
import Car from '../../assets/gradient-icons/loan-type-car.svg';
import CarDark from '../../assets/gradient-icons/loan-type-car-dark.svg';
import Home from '../../assets/gradient-icons/loan-type-home.svg';
import HomeDark from '../../assets/gradient-icons/loan-type-home-dark.svg';
import Medal from '../../assets/gradient-icons/medal.svg';
import MedalDark from '../../assets/gradient-icons/medal-dark.svg';

type Pair = { light: FC<SvgProps>; dark: FC<SvgProps> };

/**
 * One gradient icon per goal type, keyed by the id a goal stores. The dark drawings lift the navy so
 * it reads on a dark card.
 */
const TYPE_ICONS = {
  trip: { light: Trip, dark: TripDark },
  emergency: { light: Emergency, dark: EmergencyDark },
  home: { light: Home, dark: HomeDark },
  car: { light: Car, dark: CarDark },
  education: { light: Education, dark: EducationDark },
  wedding: { light: Wedding, dark: WeddingDark },
  phone: { light: Phone, dark: PhoneDark },
  gifts: { light: Gifts, dark: GiftsDark },
  health: { light: Health, dark: HealthDark },
  family: { light: Family, dark: FamilyDark },
  pets: { light: Pets, dark: PetsDark },
  other: { light: Other, dark: OtherDark },
} satisfies Record<GoalType, Pair>;

/** The medal on the wrap-up and on a goal that has been reached. */
const ICONS = {
  medal: { light: Medal, dark: MedalDark },
} satisfies Record<string, Pair>;

export type SavingsIconName = keyof typeof ICONS;

function forScheme<Name extends string>(
  pairs: Record<Name, Pair>,
  scheme: 'light' | 'dark',
): Record<Name, FC<SvgProps>> {
  const resolved = {} as Record<Name, FC<SvgProps>>;
  for (const [name, pair] of Object.entries(pairs) as [Name, Pair][]) resolved[name] = pair[scheme];
  return resolved;
}

/** One icon per goal type for the mode in force: the app's Light/Dark/System choice, not the phone's. */
export function useGoalTypeIcons(): Record<GoalType, FC<SvgProps>> {
  const { scheme } = useTheme();
  return useMemo(() => forScheme(TYPE_ICONS, scheme), [scheme]);
}

/** The savings screens' own icons for the mode in force. */
export function useSavingsIcons(): Record<SavingsIconName, FC<SvgProps>> {
  const { scheme } = useTheme();
  return useMemo(() => forScheme(ICONS, scheme), [scheme]);
}
