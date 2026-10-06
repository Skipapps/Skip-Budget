import { logoDomainOf } from '@/lib/logo-domain';

const NETFLIX = { domain: 'netflix.com' };

describe('logoDomainOf', () => {
  it('uses the catalog brand when nothing was chosen on the row', () => {
    expect(logoDomainOf({ brands: NETFLIX })).toBe('netflix.com');
    expect(logoDomainOf({ logo_domain: null, logo_hidden: false, brands: NETFLIX })).toBe(
      'netflix.com',
    );
  });

  it("lets the row's own choice beat the catalog brand", () => {
    expect(logoDomainOf({ logo_domain: 'hulu.com', brands: NETFLIX })).toBe('hulu.com');
  });

  it('gives a custom store, with no catalog brand, its chosen logo', () => {
    expect(logoDomainOf({ logo_domain: 'planetfitness.com', brands: null })).toBe(
      'planetfitness.com',
    );
  });

  it('draws letters when the owner hid the logo, whatever else is set', () => {
    expect(logoDomainOf({ logo_hidden: true, brands: NETFLIX })).toBeNull();
    expect(
      logoDomainOf({ logo_hidden: true, logo_domain: 'hulu.com', brands: NETFLIX }),
    ).toBeNull();
  });

  it('draws letters when there is nothing to go on', () => {
    expect(logoDomainOf({})).toBeNull();
    expect(logoDomainOf({ brands: null })).toBeNull();
    expect(logoDomainOf({ brands: { domain: null } })).toBeNull();
    expect(logoDomainOf({ logo_hidden: null, logo_domain: null, brands: null })).toBeNull();
  });

  it('answers in the one spelling the logo store keys by', () => {
    expect(logoDomainOf({ logo_domain: ' Hulu.COM ', brands: NETFLIX })).toBe('hulu.com');
    expect(logoDomainOf({ brands: { domain: 'Netflix.com' } })).toBe('netflix.com');
  });

  it('treats an empty or blank choice as no choice', () => {
    expect(logoDomainOf({ logo_domain: '', brands: NETFLIX })).toBe('netflix.com');
    expect(logoDomainOf({ logo_domain: '   ', brands: NETFLIX })).toBe('netflix.com');
    expect(logoDomainOf({ logo_domain: '', brands: { domain: '' } })).toBeNull();
  });

  it('accepts the rows the list queries return, which carry more than the logo fields', () => {
    const row = {
      id: 'bill-1',
      name: 'Electric',
      logo_domain: null,
      logo_hidden: false,
      brands: { domain: 'aep.com' },
    };
    expect(logoDomainOf(row)).toBe('aep.com');
  });
});
