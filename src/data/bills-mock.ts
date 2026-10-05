import { FALLBACK_GLYPH, GLYPHS, glyphFor, type Glyph } from '@/data/glyphs';

export type BillIcon = Glyph;

export type BillCategory = {
  id: string;
  label: string;
  /** What the category covers — shown under the label on the picker. */
  hint: string;
  icon: BillIcon;
};

export const BILL_CATEGORIES: BillCategory[] = [
  { id: 'housing', label: 'Housing', hint: 'Rent, mortgage, HOA fees', icon: GLYPHS.housing },
  {
    id: 'energy',
    label: 'Electricity & Gas',
    hint: 'Power, heating, cooking gas',
    icon: GLYPHS.energy,
  },
  { id: 'water', label: 'Water & Waste', hint: 'Water, sewer, garbage', icon: GLYPHS.water },
  { id: 'internet', label: 'Internet', hint: 'Home broadband and Wi-Fi', icon: GLYPHS.internet },
  {
    id: 'mobile',
    label: 'Mobile Phone',
    hint: 'Phone plans, device payments',
    icon: GLYPHS.mobile,
  },
  { id: 'insurance', label: 'Insurance', hint: 'Car, health, home, life', icon: GLYPHS.insurance },
  {
    id: 'loans',
    label: 'Loans & Credit',
    hint: 'Cards, student, auto, personal',
    icon: GLYPHS.loans,
  },
  {
    id: 'transport',
    label: 'Transportation',
    hint: 'Car, transit, parking, tolls',
    icon: GLYPHS.transport,
  },
  {
    id: 'family',
    label: 'Family & Healthcare',
    hint: 'Childcare, tuition, medical',
    icon: GLYPHS.family,
  },
  { id: 'other', label: 'Other bill', hint: 'Name it and pick an icon', icon: GLYPHS.other },
];

/** Extra icons offered when someone builds their own bill. */
export const BILL_ICON_CHOICES: { id: string; icon: BillIcon }[] = [
  'other',
  'education',
  'pets',
  'tv',
  'shopping',
  'travel',
  'coffee',
  'music',
  'waste',
  'software',
  'health',
].map((id) => ({ id, icon: GLYPHS[id] }));

export const RECURRENCES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly' },
] as const;

/** `period` runs only between two dates: not a filter chip, but the database can hold it. */
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
  /** The issuer's domain, when the bill has one. Its logo replaces the icon. */
  domain?: string | null;
  /** Card or bank account it is paid from. */
  sourceId: string;
};

const CATEGORY_BY_ID = new Map(BILL_CATEGORIES.map((category) => [category.id, category]));

export function getBillCategory(id: string): BillCategory | undefined {
  return CATEGORY_BY_ID.get(id);
}

/**
 * The glyph for a bill with no logo: the one picked, else its category's, else the neutral bill.
 * 'other' is the icon picker's starting value, so it counts as "nothing picked"; otherwise it would
 * beat the category glyph on every bill saved with it. The category may be a spending one: receipts
 * and subscriptions without a logo share this mark.
 */
export function getBillIcon(bill: Pick<Bill, 'categoryId' | 'iconId'>): BillIcon {
  const picked = bill.iconId === 'other' ? undefined : glyphFor(bill.iconId);
  return picked ?? glyphFor(bill.categoryId) ?? FALLBACK_GLYPH;
}
