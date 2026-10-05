import { BILL_CATEGORIES } from '@/data/bills-mock';

import { BILL_CATEGORY_IDS, categoryFromBrand } from './bill-category';

// Lucide ships untransformed ESM; the icons are irrelevant here (same mock as
// src/data/bill-icons.test.ts). The parser itself never imports bills-mock.
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, name) => name }));

describe('BILL_CATEGORY_IDS', () => {
  it('is exactly the ids of BILL_CATEGORIES, in order', () => {
    expect([...BILL_CATEGORY_IDS]).toEqual(BILL_CATEGORIES.map((category) => category.id));
  });
});

describe('categoryFromBrand', () => {
  const brand = (id: string, category_id: string) => ({ id, category_id });

  it('suggests the one obvious category for a known biller', () => {
    expect(categoryFromBrand(brand('xfinity', 'telecom'))).toBe('internet');
    expect(categoryFromBrand(brand('t-mobile', 'telecom'))).toBe('mobile');
    expect(categoryFromBrand(brand('duke-energy', 'utilities'))).toBe('energy');
    expect(categoryFromBrand(brand('waste-management', 'utilities'))).toBe('water');
    expect(categoryFromBrand(brand('geico', 'insurance'))).toBe('insurance');
    expect(categoryFromBrand(brand('chase', 'finance'))).toBe('loans');
  });

  it('suggests nothing for a company that bills for more than one thing, or a shop', () => {
    expect(categoryFromBrand(brand('verizon', 'telecom'))).toBeNull();
    expect(categoryFromBrand(brand('at-and-t', 'telecom'))).toBeNull();
    expect(categoryFromBrand(brand('some-new-telco', 'telecom'))).toBeNull();
    expect(categoryFromBrand(brand('netflix', 'entertainment'))).toBeNull();
    expect(categoryFromBrand(null)).toBeNull();
  });

  it('only ever returns a real bill category id', () => {
    const ids = new Set<string>(BILL_CATEGORY_IDS);
    for (const [id, category] of [
      ['xfinity', 'telecom'],
      ['visible', 'telecom'],
      ['american-water', 'utilities'],
      ['aep', 'utilities'],
      ['usaa', 'insurance'],
      ['navient', 'finance'],
    ]) {
      expect(ids.has(categoryFromBrand(brand(id, category)) as string)).toBe(true);
    }
  });
});
