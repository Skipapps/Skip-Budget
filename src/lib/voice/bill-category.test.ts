import { getBillCategory } from '@/data/bill-categories';

import { BILL_CATEGORY_IDS, categoryFromBrand } from './bill-category';

// Lucide ships untransformed ESM; the icons are irrelevant here.
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, name) => name }));

describe('BILL_CATEGORY_IDS', () => {
  it('is the add-a-bill picker, in its order: never loans or family', () => {
    expect([...BILL_CATEGORY_IDS]).toEqual([
      'housing',
      'energy',
      'water',
      'internet',
      'mobile',
      'insurance',
      'transport',
      'health',
      'education',
      'other',
    ]);
  });

  it('names only categories the app can draw', () => {
    for (const id of BILL_CATEGORY_IDS)
      expect([id, Boolean(getBillCategory(id))]).toEqual([id, true]);
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
  });

  it('suggests nothing for a lender: loans are started from the Loans page', () => {
    expect(categoryFromBrand(brand('chase', 'finance'))).toBeNull();
    expect(categoryFromBrand(brand('navient', 'finance'))).toBeNull();
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
    ]) {
      expect(ids.has(categoryFromBrand(brand(id, category)) as string)).toBe(true);
    }
  });
});
