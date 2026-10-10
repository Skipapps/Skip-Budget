import type { FC } from 'react';
import { useMemo } from 'react';
import type { SvgProps } from 'react-native-svg';

import type { BillIconCategory } from '@/data/bill-categories';
import { useTheme } from '@/providers/theme-provider';

// Relative paths rather than @/assets: Jest maps @/ to src/ only, and a test resolves these files.
import Education from '../../assets/gradient-icons/bill-education.svg';
import EducationDark from '../../assets/gradient-icons/bill-education-dark.svg';
import Energy from '../../assets/gradient-icons/bill-energy.svg';
import EnergyDark from '../../assets/gradient-icons/bill-energy-dark.svg';
import Health from '../../assets/gradient-icons/bill-health.svg';
import HealthDark from '../../assets/gradient-icons/bill-health-dark.svg';
import Housing from '../../assets/gradient-icons/bill-housing.svg';
import HousingDark from '../../assets/gradient-icons/bill-housing-dark.svg';
import Insurance from '../../assets/gradient-icons/bill-insurance.svg';
import InsuranceDark from '../../assets/gradient-icons/bill-insurance-dark.svg';
import Internet from '../../assets/gradient-icons/bill-internet.svg';
import InternetDark from '../../assets/gradient-icons/bill-internet-dark.svg';
import Mobile from '../../assets/gradient-icons/bill-mobile.svg';
import MobileDark from '../../assets/gradient-icons/bill-mobile-dark.svg';
import Other from '../../assets/gradient-icons/bill-other.svg';
import OtherDark from '../../assets/gradient-icons/bill-other-dark.svg';
import Transport from '../../assets/gradient-icons/bill-transport.svg';
import TransportDark from '../../assets/gradient-icons/bill-transport-dark.svg';
import Water from '../../assets/gradient-icons/bill-water.svg';
import WaterDark from '../../assets/gradient-icons/bill-water-dark.svg';

type Pair = { light: FC<SvgProps>; dark: FC<SvgProps> };

/**
 * One gradient icon per bill category, keyed by the category id a bill stores. The dark drawings
 * lift the navy so it reads on a dark card.
 */
const ICONS = {
  housing: { light: Housing, dark: HousingDark },
  energy: { light: Energy, dark: EnergyDark },
  water: { light: Water, dark: WaterDark },
  internet: { light: Internet, dark: InternetDark },
  mobile: { light: Mobile, dark: MobileDark },
  insurance: { light: Insurance, dark: InsuranceDark },
  transport: { light: Transport, dark: TransportDark },
  health: { light: Health, dark: HealthDark },
  education: { light: Education, dark: EducationDark },
  other: { light: Other, dark: OtherDark },
} satisfies Record<BillIconCategory, Pair>;

/** Every bill category's icon for the mode in force: the app's Light/Dark/System choice. */
export function useBillIcons(): Record<BillIconCategory, FC<SvgProps>> {
  const { scheme } = useTheme();
  return useMemo(() => {
    const resolved = {} as Record<BillIconCategory, FC<SvgProps>>;
    for (const [name, pair] of Object.entries(ICONS) as [BillIconCategory, Pair][]) {
      resolved[name] = pair[scheme];
    }
    return resolved;
  }, [scheme]);
}
