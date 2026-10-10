import type { FC } from 'react';
import { useMemo } from 'react';
import type { SvgProps } from 'react-native-svg';

import type { BookIconId } from '@/data/receipt-books';
import { useTheme } from '@/providers/theme-provider';

// Relative paths rather than @/assets: Jest maps @/ to src/ only, and a test resolves these files.
import Car from '../../assets/gradient-icons/book-car.svg';
import CarDark from '../../assets/gradient-icons/book-car-dark.svg';
import Charity from '../../assets/gradient-icons/book-charity.svg';
import CharityDark from '../../assets/gradient-icons/book-charity-dark.svg';
import Entertainment from '../../assets/gradient-icons/book-entertainment.svg';
import EntertainmentDark from '../../assets/gradient-icons/book-entertainment-dark.svg';
import Fitness from '../../assets/gradient-icons/book-fitness.svg';
import FitnessDark from '../../assets/gradient-icons/book-fitness-dark.svg';
import Food from '../../assets/gradient-icons/book-food.svg';
import FoodDark from '../../assets/gradient-icons/book-food-dark.svg';
import Garden from '../../assets/gradient-icons/book-garden.svg';
import GardenDark from '../../assets/gradient-icons/book-garden-dark.svg';
import General from '../../assets/gradient-icons/book-general.svg';
import GeneralDark from '../../assets/gradient-icons/book-general-dark.svg';
import Gifts from '../../assets/gradient-icons/book-gifts.svg';
import GiftsDark from '../../assets/gradient-icons/book-gifts-dark.svg';
import Groceries from '../../assets/gradient-icons/book-groceries.svg';
import GroceriesDark from '../../assets/gradient-icons/book-groceries-dark.svg';
import Health from '../../assets/gradient-icons/book-health.svg';
import HealthDark from '../../assets/gradient-icons/book-health-dark.svg';
import Hobbies from '../../assets/gradient-icons/book-hobbies.svg';
import HobbiesDark from '../../assets/gradient-icons/book-hobbies-dark.svg';
import Home from '../../assets/gradient-icons/book-home.svg';
import HomeDark from '../../assets/gradient-icons/book-home-dark.svg';
import HomeRepairs from '../../assets/gradient-icons/book-home-repairs.svg';
import HomeRepairsDark from '../../assets/gradient-icons/book-home-repairs-dark.svg';
import KidsFamily from '../../assets/gradient-icons/book-kids-family.svg';
import KidsFamilyDark from '../../assets/gradient-icons/book-kids-family-dark.svg';
import Moving from '../../assets/gradient-icons/book-moving.svg';
import MovingDark from '../../assets/gradient-icons/book-moving-dark.svg';
import Party from '../../assets/gradient-icons/book-party.svg';
import PartyDark from '../../assets/gradient-icons/book-party-dark.svg';
import Pets from '../../assets/gradient-icons/book-pets.svg';
import PetsDark from '../../assets/gradient-icons/book-pets-dark.svg';
import RoadTrip from '../../assets/gradient-icons/book-road-trip.svg';
import RoadTripDark from '../../assets/gradient-icons/book-road-trip-dark.svg';
import School from '../../assets/gradient-icons/book-school.svg';
import SchoolDark from '../../assets/gradient-icons/book-school-dark.svg';
import Shopping from '../../assets/gradient-icons/book-shopping.svg';
import ShoppingDark from '../../assets/gradient-icons/book-shopping-dark.svg';
import Taxes from '../../assets/gradient-icons/book-taxes.svg';
import TaxesDark from '../../assets/gradient-icons/book-taxes-dark.svg';
import Trip from '../../assets/gradient-icons/book-trip.svg';
import TripDark from '../../assets/gradient-icons/book-trip-dark.svg';
import Wedding from '../../assets/gradient-icons/book-wedding.svg';
import WeddingDark from '../../assets/gradient-icons/book-wedding-dark.svg';
import Work from '../../assets/gradient-icons/book-work.svg';
import WorkDark from '../../assets/gradient-icons/book-work-dark.svg';

type Pair = { light: FC<SvgProps>; dark: FC<SvgProps> };

/** One gradient icon per receipt book icon id. The dark drawings lift the navy for a dark card. */
const ICONS = {
  general: { light: General, dark: GeneralDark },
  trip: { light: Trip, dark: TripDark },
  'road-trip': { light: RoadTrip, dark: RoadTripDark },
  'kids-family': { light: KidsFamily, dark: KidsFamilyDark },
  home: { light: Home, dark: HomeDark },
  work: { light: Work, dark: WorkDark },
  pets: { light: Pets, dark: PetsDark },
  health: { light: Health, dark: HealthDark },
  car: { light: Car, dark: CarDark },
  gifts: { light: Gifts, dark: GiftsDark },
  wedding: { light: Wedding, dark: WeddingDark },
  groceries: { light: Groceries, dark: GroceriesDark },
  shopping: { light: Shopping, dark: ShoppingDark },
  food: { light: Food, dark: FoodDark },
  entertainment: { light: Entertainment, dark: EntertainmentDark },
  fitness: { light: Fitness, dark: FitnessDark },
  hobbies: { light: Hobbies, dark: HobbiesDark },
  school: { light: School, dark: SchoolDark },
  'home-repairs': { light: HomeRepairs, dark: HomeRepairsDark },
  garden: { light: Garden, dark: GardenDark },
  moving: { light: Moving, dark: MovingDark },
  party: { light: Party, dark: PartyDark },
  charity: { light: Charity, dark: CharityDark },
  taxes: { light: Taxes, dark: TaxesDark },
} satisfies Record<BookIconId, Pair>;

/** Every book icon for the mode in force: the app's Light/Dark/System choice, not the phone's. */
export function useBookIcons(): Record<BookIconId, FC<SvgProps>> {
  const { scheme } = useTheme();
  return useMemo(() => {
    const resolved = {} as Record<BookIconId, FC<SvgProps>>;
    for (const [name, pair] of Object.entries(ICONS) as [BookIconId, Pair][]) {
      resolved[name] = pair[scheme];
    }
    return resolved;
  }, [scheme]);
}
