import {
  Car,
  House,
  Landmark,
  PawPrint,
  ReceiptText,
  ShoppingCart,
  Smartphone,
  Utensils,
  Wifi,
} from 'lucide-react-native';

import {
  BILL_CATEGORIES,
  LISTED_BILL_CATEGORIES,
  billIconOf,
  getBillCategory,
  getBillIcon,
} from '@/data/bill-categories';
import { FALLBACK_GLYPH, GLYPHS } from '@/data/glyphs';

// Lucide ships untransformed ESM; each icon stands in as its own name.
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, name) => name }));

/**
 * 'other' is the icon picker's starting value, not a pick: bills saved with it (those rows still
 * exist) must draw their category glyph.
 */
describe('getBillIcon', () => {
  it.each([
    ['housing', House],
    ['internet', Wifi],
    ['mobile', Smartphone],
    ['loans', Landmark],
  ])('draws the %s glyph for a bill saved with the old "other" icon', (categoryId, glyph) => {
    expect(getBillIcon({ categoryId, iconId: 'other' })).toBe(glyph);
  });

  it('draws the category glyph when nothing was picked', () => {
    expect(getBillIcon({ categoryId: 'transport' })).toBe(Car);
  });

  it('keeps an icon somebody actually picked', () => {
    expect(getBillIcon({ categoryId: 'other', iconId: 'pets' })).toBe(PawPrint);
  });

  it('draws the neutral bill for a self-named bill left on the default', () => {
    expect(getBillIcon({ categoryId: 'other', iconId: 'other' })).toBe(ReceiptText);
  });

  it('draws spending categories too — receipts and subscriptions share the mark', () => {
    expect(getBillIcon({ categoryId: 'groceries' })).toBe(ShoppingCart);
    expect(getBillIcon({ categoryId: 'dining' })).toBe(Utensils);
  });

  it('falls back to the neutral bill for a category it does not know', () => {
    expect(getBillIcon({ categoryId: 'retired-category' })).toBe(FALLBACK_GLYPH);
  });
});

describe('the bill categories', () => {
  it('offers the ten the Founder chose, in the picker’s order, with their words', () => {
    expect(BILL_CATEGORIES.map(({ id, label, hint }) => [id, label, hint])).toEqual([
      ['housing', 'Housing', 'Rent, mortgage, HOA'],
      ['energy', 'Electricity & Gas', 'Power, heating, gas'],
      ['water', 'Water & Waste', 'Water, sewer, trash'],
      ['internet', 'Internet', 'Broadband and Wi-Fi'],
      ['mobile', 'Mobile Phone', 'Plans and devices'],
      ['insurance', 'Insurance', 'Car, health, home, life'],
      ['transport', 'Transportation', 'Fuel, transit, tolls'],
      ['health', 'Health & Medical', 'Doctor, dental, meds'],
      ['education', 'Education', 'Tuition and courses'],
      ['other', 'Other', 'Anything else'],
    ]);
  });

  it('never offers Loans & Credit or Family & Healthcare, and still reads both', () => {
    const offered = BILL_CATEGORIES.map((category) => category.id);
    expect(offered).not.toContain('loans');
    expect(offered).not.toContain('family');
    expect(getBillCategory('loans')?.label).toBe('Loans & Credit');
    // Folded into Health & Medical.
    expect(getBillCategory('family')?.id).toBe('health');
    expect(LISTED_BILL_CATEGORIES.map((category) => category.id)).toEqual([...offered, 'loans']);
    expect(getBillCategory('retired-category')).toBeUndefined();
  });
});

describe('billIconOf', () => {
  it.each(BILL_CATEGORIES.map((category) => category.id))(
    'gives the %s category its gradient icon',
    (id) => {
      expect(billIconOf({ categoryId: id })).toEqual({ kind: 'category', id });
    },
  );

  it('draws a Family & Healthcare bill as Health & Medical', () => {
    expect(billIconOf({ categoryId: 'family' })).toEqual({ kind: 'category', id: 'health' });
  });

  it('keeps a loan’s type wherever its bill is filed, and Other for a loan saved before types', () => {
    expect(billIconOf({ categoryId: 'loans', iconId: 'loan-car' })).toEqual({
      kind: 'loan',
      type: 'car',
    });
    expect(billIconOf({ categoryId: 'housing', iconId: 'loan-home' })).toEqual({
      kind: 'loan',
      type: 'home',
    });
    expect(billIconOf({ categoryId: 'loans', iconId: 'other' })).toEqual({
      kind: 'loan',
      type: 'other',
    });
    expect(billIconOf({ categoryId: 'loans' })).toEqual({ kind: 'loan', type: 'other' });
  });

  it('wears the category’s icon whatever icon an older picker left on the bill', () => {
    expect(billIconOf({ categoryId: 'other', iconId: 'pets' })).toEqual({
      kind: 'category',
      id: 'other',
    });
  });

  it('leaves spending categories and unknown ids to the glyph', () => {
    expect(billIconOf({ categoryId: 'groceries' })).toBeNull();
    expect(billIconOf({ categoryId: 'retired-category' })).toBeNull();
  });
});

describe('the glyph set', () => {
  // The seeded spend_categories ids (migrations 20260827100008, 20260829100004).
  it.each([
    'groceries',
    'dining',
    'fuel',
    'pharmacy',
    'shopping',
    'clothing',
    'electronics',
    'home',
    'beauty',
    'pets',
    'entertainment',
    'software',
    'fitness',
    'news',
    'meals',
    'memberships',
    'transport',
    'utilities',
    'telecom',
    'insurance',
    'finance',
  ])('has a glyph for the %s spending category', (id) => {
    expect(GLYPHS[id]).toBeDefined();
  });
});
