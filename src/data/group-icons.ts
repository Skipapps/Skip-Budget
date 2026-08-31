import CoffeeIcon from '@/assets/bill-icons/coffee.svg';
import EducationIcon from '@/assets/bill-icons/education.svg';
import EnergyIcon from '@/assets/bill-icons/energy.svg';
import FamilyIcon from '@/assets/bill-icons/family.svg';
import HealthIcon from '@/assets/bill-icons/health.svg';
import HousingIcon from '@/assets/bill-icons/housing.svg';
import InsuranceIcon from '@/assets/bill-icons/insurance.svg';
import InternetIcon from '@/assets/bill-icons/internet.svg';
import LoansIcon from '@/assets/bill-icons/loans.svg';
import MobileIcon from '@/assets/bill-icons/mobile.svg';
import MusicIcon from '@/assets/bill-icons/music.svg';
import OtherIcon from '@/assets/bill-icons/other.svg';
import PetsIcon from '@/assets/bill-icons/pets.svg';
import ShoppingIcon from '@/assets/bill-icons/shopping.svg';
import SoftwareIcon from '@/assets/bill-icons/software.svg';
import TransportIcon from '@/assets/bill-icons/transport.svg';
import TravelIcon from '@/assets/bill-icons/travel.svg';
import TvIcon from '@/assets/bill-icons/tv.svg';
import WasteIcon from '@/assets/bill-icons/waste.svg';
import WaterIcon from '@/assets/bill-icons/water.svg';
import type { BillIcon } from '@/data/bills-mock';

/**
 * Every glyph the app ships, offered for a group.
 *
 * Bills use a shorter list because a bill is filed under a category that
 * already implies its icon. A group is named by the person making it — a
 * flat, a holiday, a car — so it gets the whole set, ordered roughly by how
 * likely a group is to be about that thing.
 */
export const GROUP_ICON_CHOICES: { id: string; icon: BillIcon }[] = [
  { id: 'housing', icon: HousingIcon },
  { id: 'travel', icon: TravelIcon },
  { id: 'coffee', icon: CoffeeIcon },
  { id: 'shopping', icon: ShoppingIcon },
  { id: 'transport', icon: TransportIcon },
  { id: 'family', icon: FamilyIcon },
  { id: 'pets', icon: PetsIcon },
  { id: 'energy', icon: EnergyIcon },
  { id: 'water', icon: WaterIcon },
  { id: 'internet', icon: InternetIcon },
  { id: 'mobile', icon: MobileIcon },
  { id: 'tv', icon: TvIcon },
  { id: 'music', icon: MusicIcon },
  { id: 'software', icon: SoftwareIcon },
  { id: 'health', icon: HealthIcon },
  { id: 'education', icon: EducationIcon },
  { id: 'insurance', icon: InsuranceIcon },
  { id: 'loans', icon: LoansIcon },
  { id: 'waste', icon: WasteIcon },
  { id: 'other', icon: OtherIcon },
];

const BY_ID = new Map(GROUP_ICON_CHOICES.map((choice) => [choice.id, choice.icon]));

/** The neutral glyph, and what a retired id falls back to. */
export const FALLBACK_GROUP_ICON = OtherIcon;

export function groupIconFor(iconId: string | null | undefined): BillIcon {
  return (iconId ? BY_ID.get(iconId) : undefined) ?? FALLBACK_GROUP_ICON;
}

/**
 * Tints for the well an icon sits in.
 *
 * Mid-tone hues rather than the card palette's own values, because these have
 * to carry a glyph on both a white and a near-black surface. The background is
 * the same hue at low alpha, so it tints whatever is behind it instead of
 * painting over it — which is what keeps one set working in both themes.
 */
export const GROUP_TINTS = [
  { bg: 'rgba(244,121,90,0.16)', fg: '#E2643F' },
  { bg: 'rgba(79,168,232,0.16)', fg: '#3E8FCC' },
  { bg: 'rgba(139,123,245,0.16)', fg: '#7B6AE0' },
  { bg: 'rgba(156,194,46,0.18)', fg: '#7C9C1F' },
  { bg: 'rgba(62,140,116,0.16)', fg: '#37836B' },
  { bg: 'rgba(232,145,59,0.16)', fg: '#CE7A26' },
  { bg: 'rgba(232,106,155,0.16)', fg: '#D65A8B' },
  { bg: 'rgba(201,162,78,0.18)', fg: '#A9843A' },
] as const;

/**
 * A stable tint for a group.
 *
 * Keyed off the group's id rather than its icon, so two flats with the same
 * house glyph still look like different groups — which is the whole reason the
 * colour is there. Being derived rather than stored also means no column, no
 * picker, and no group that was created before colours existed looking wrong.
 */
export function groupTint(groupId: string | null | undefined) {
  if (!groupId) return GROUP_TINTS[0];

  let hash = 0;
  for (let index = 0; index < groupId.length; index += 1) {
    hash = (hash * 31 + groupId.charCodeAt(index)) >>> 0;
  }
  return GROUP_TINTS[hash % GROUP_TINTS.length];
}
