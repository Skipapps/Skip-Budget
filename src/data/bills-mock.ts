/**
 * Bill categories, icon choices, and placeholder bills.
 *
 * The ten categories cover the recurring bills most households have; anything
 * unusual goes under "Other", where people name it themselves and pick an icon.
 */
import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

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

export type BillIcon = FC<SvgProps>;

export type BillCategory = {
  id: string;
  label: string;
  /** What the category covers — shown under the label on the picker. */
  hint: string;
  icon: BillIcon;
};

export const BILL_CATEGORIES: BillCategory[] = [
  { id: 'housing', label: 'Housing', hint: 'Rent, mortgage, HOA fees', icon: HousingIcon },
  {
    id: 'energy',
    label: 'Electricity & Gas',
    hint: 'Power, heating, cooking gas',
    icon: EnergyIcon,
  },
  { id: 'water', label: 'Water & Waste', hint: 'Water, sewer, garbage', icon: WaterIcon },
  { id: 'internet', label: 'Internet', hint: 'Home broadband and Wi-Fi', icon: InternetIcon },
  { id: 'mobile', label: 'Mobile Phone', hint: 'Phone plans, device payments', icon: MobileIcon },
  { id: 'insurance', label: 'Insurance', hint: 'Car, health, home, life', icon: InsuranceIcon },
  { id: 'loans', label: 'Loans & Credit', hint: 'Cards, student, auto, personal', icon: LoansIcon },
  {
    id: 'transport',
    label: 'Transportation',
    hint: 'Car, transit, parking, tolls',
    icon: TransportIcon,
  },
  {
    id: 'family',
    label: 'Family & Healthcare',
    hint: 'Childcare, tuition, medical',
    icon: FamilyIcon,
  },
  { id: 'other', label: 'Other bill', hint: 'Name it and pick an icon', icon: OtherIcon },
];

/** Extra icons offered when someone builds their own bill. */
export const BILL_ICON_CHOICES: { id: string; icon: BillIcon }[] = [
  { id: 'other', icon: OtherIcon },
  { id: 'education', icon: EducationIcon },
  { id: 'pets', icon: PetsIcon },
  { id: 'tv', icon: TvIcon },
  { id: 'shopping', icon: ShoppingIcon },
  { id: 'travel', icon: TravelIcon },
  { id: 'coffee', icon: CoffeeIcon },
  { id: 'music', icon: MusicIcon },
  { id: 'waste', icon: WasteIcon },
  { id: 'software', icon: SoftwareIcon },
  { id: 'health', icon: HealthIcon },
];

export const RECURRENCES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly' },
] as const;

/**
 * `period` is a bill that runs only between two dates. It is not offered as a
 * filter chip, but the database can hold it, so the type must allow it.
 */
export type Recurrence = (typeof RECURRENCES)[number]['value'] | 'period';

export type Bill = {
  id: string;
  name: string;
  amount: number;
  /** ISO yyyy-mm-dd of the next due date. */
  dueDate: string;
  recurrence: Recurrence;
  categoryId: string;
  /** Overrides the category icon when someone picked their own. */
  iconId?: string;
  /** Card or bank account it is paid from. */
  sourceId: string;
};

export const bills: Bill[] = [
  {
    id: 'b1',
    name: 'Rent',
    amount: -1450,
    dueDate: '2026-09-01',
    recurrence: 'monthly',
    categoryId: 'housing',
    sourceId: 'acct-1',
  },
  {
    id: 'b2',
    name: 'Electricity',
    amount: -128.4,
    dueDate: '2026-09-04',
    recurrence: 'monthly',
    categoryId: 'energy',
    sourceId: 'acct-1',
  },
  {
    id: 'b3',
    name: 'Water',
    amount: -41.8,
    dueDate: '2026-09-06',
    recurrence: 'quarterly',
    categoryId: 'water',
    sourceId: 'acct-2',
  },
  {
    id: 'b4',
    name: 'Broadband',
    amount: -59,
    dueDate: '2026-09-08',
    recurrence: 'monthly',
    categoryId: 'internet',
    sourceId: 'acct-1',
  },
  {
    id: 'b5',
    name: 'Phone plan',
    amount: -45.5,
    dueDate: '2026-09-12',
    recurrence: 'monthly',
    categoryId: 'mobile',
    sourceId: 'card-1',
  },
  {
    id: 'b6',
    name: 'Car insurance',
    amount: -96,
    dueDate: '2026-09-15',
    recurrence: 'monthly',
    categoryId: 'insurance',
    sourceId: 'card-2',
  },
  {
    id: 'b7',
    name: 'Car loan',
    amount: -412,
    dueDate: '2026-09-18',
    recurrence: 'monthly',
    categoryId: 'loans',
    sourceId: 'acct-1',
  },
  {
    id: 'b8',
    name: 'Transit pass',
    amount: -78,
    dueDate: '2026-09-20',
    recurrence: 'monthly',
    categoryId: 'transport',
    sourceId: 'card-2',
  },
];

const CATEGORY_BY_ID = new Map(BILL_CATEGORIES.map((category) => [category.id, category]));
const ICON_BY_ID = new Map(BILL_ICON_CHOICES.map((choice) => [choice.id, choice.icon]));

export function getBillCategory(id: string): BillCategory | undefined {
  return CATEGORY_BY_ID.get(id);
}

/** A custom icon wins over the category's default. */
export function getBillIcon(bill: Pick<Bill, 'categoryId' | 'iconId'>): BillIcon {
  if (bill.iconId) {
    const custom = ICON_BY_ID.get(bill.iconId);
    if (custom) return custom;
  }
  return CATEGORY_BY_ID.get(bill.categoryId)?.icon ?? OtherIcon;
}
