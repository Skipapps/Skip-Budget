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

import { BILL_CATEGORIES, getBillIcon } from '@/data/bill-categories';
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

describe('the glyph set', () => {
  it('gives every bill category but Other a glyph of its own', () => {
    const named = BILL_CATEGORIES.filter((category) => category.id !== 'other');
    for (const category of named) expect(category.icon).not.toBe(FALLBACK_GLYPH);
    expect(new Set(named.map((category) => category.icon)).size).toBe(named.length);
  });

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
