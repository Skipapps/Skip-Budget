import { FALLBACK_GLYPH, glyphFor, type Glyph } from '@/data/glyphs';
import { loanTypeOf, type LoanType } from '@/data/loan-types';

export type BillIcon = Glyph;

export type BillCategory = {
  id: string;
  label: string;
  /** What the category covers — shown under the label on the picker. */
  hint: string;
};

/** The categories a new bill is offered, each drawn with its own gradient icon. */
export type BillIconCategory =
  | 'housing'
  | 'energy'
  | 'water'
  | 'internet'
  | 'mobile'
  | 'insurance'
  | 'transport'
  | 'health'
  | 'education'
  | 'other';

/** What a new bill can be filed under, in the picker's order. */
export const BILL_CATEGORIES: (BillCategory & { id: BillIconCategory })[] = [
  { id: 'housing', label: 'Housing', hint: 'Rent, mortgage, HOA' },
  { id: 'energy', label: 'Electricity & Gas', hint: 'Power, heating, gas' },
  { id: 'water', label: 'Water & Waste', hint: 'Water, sewer, trash' },
  { id: 'internet', label: 'Internet', hint: 'Broadband and Wi-Fi' },
  { id: 'mobile', label: 'Mobile Phone', hint: 'Plans and devices' },
  { id: 'insurance', label: 'Insurance', hint: 'Car, health, home, life' },
  { id: 'transport', label: 'Transportation', hint: 'Fuel, transit, tolls' },
  { id: 'health', label: 'Health & Medical', hint: 'Doctor, dental, meds' },
  { id: 'education', label: 'Education', hint: 'Tuition and courses' },
  { id: 'other', label: 'Other', hint: 'Anything else' },
];

/**
 * Loans & Credit is never offered for a new bill (a loan's bill comes from the Loans page), but
 * loans and older bills still carry it, so it still reads and filters.
 */
const LOANS: BillCategory = {
  id: 'loans',
  label: 'Loans & Credit',
  hint: 'Cards, student, auto, personal',
};

/** Every category a bill can be listed under: the picker's, then Loans & Credit. */
export const LISTED_BILL_CATEGORIES: BillCategory[] = [...BILL_CATEGORIES, LOANS];

/** Bills filed under a category that was folded into another read as the one it became. */
const FOLDED: Record<string, string> = { family: 'health' };

export function hasBillIcon(id: string): id is BillIconCategory {
  return BILL_CATEGORIES.some((category) => category.id === id);
}

/** The category a bill is shown under: its own, or the one its old category became. */
export function shownCategoryId(id: string): string {
  return FOLDED[id] ?? id;
}

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

const CATEGORY_BY_ID = new Map(LISTED_BILL_CATEGORIES.map((category) => [category.id, category]));

/** A bill's category by its stored id, a folded one included (Family & Healthcare is Health). */
export function getBillCategory(id: string): BillCategory | undefined {
  return CATEGORY_BY_ID.get(shownCategoryId(id));
}

/**
 * What a bill without a logo wears: its loan's type, else its category's gradient icon, else (a
 * spending category, or one this build does not know) null, and the caller draws `getBillIcon`'s
 * glyph. A loan saved before loan types reads as the Other type.
 */
export type BillIconChoice =
  { kind: 'loan'; type: LoanType } | { kind: 'category'; id: BillIconCategory };

export function billIconOf(
  bill: Pick<Bill, 'categoryId'> & { iconId?: string | null },
): BillIconChoice | null {
  const loan = loanTypeOf(bill.iconId);
  if (loan) return { kind: 'loan', type: loan };
  if (bill.categoryId === 'loans') return { kind: 'loan', type: 'other' };
  const id = shownCategoryId(bill.categoryId);
  return hasBillIcon(id) ? { kind: 'category', id } : null;
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
