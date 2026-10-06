import { logoColumns, selectionLogo } from '@/lib/logo-columns';

/**
 * What the add and edit forms write for a store's logo. Nothing unless the store field made a
 * choice, and nothing when the choice is what the row already holds: a save that names the
 * columns fails on a database without them, and an edit must never undo a Change logo choice.
 */

const STORE = { brandId: null, name: 'Planet Fitness', domain: null, categoryId: 'fitness' };

describe('logoColumns', () => {
  it('writes nothing for a store the field made no choice about', () => {
    expect(logoColumns(null)).toEqual({});
    expect(logoColumns(STORE)).toEqual({});
    expect(logoColumns(STORE, { logo_domain: 'old.com', logo_hidden: true })).toEqual({});
  });

  it('writes a new store’s choice only when it is not the default', () => {
    expect(logoColumns({ ...STORE, logoDomain: null, logoHidden: false })).toEqual({});
    expect(logoColumns({ ...STORE, logoDomain: 'planetfitness.com', logoHidden: false })).toEqual({
      logo_domain: 'planetfitness.com',
      logo_hidden: false,
    });
    expect(logoColumns({ ...STORE, logoDomain: null, logoHidden: true })).toEqual({
      logo_domain: null,
      logo_hidden: true,
    });
  });

  it('writes an edit’s choice only when it changes what the row holds', () => {
    const row = { logo_domain: 'planetfitness.com', logo_hidden: false };

    expect(logoColumns({ logoDomain: 'planetfitness.com', logoHidden: false }, row)).toEqual({});
    expect(logoColumns({ logoDomain: null, logoHidden: false }, row)).toEqual({
      logo_domain: null,
      logo_hidden: false,
    });
    expect(
      logoColumns(
        { logoDomain: null, logoHidden: false },
        { logo_domain: null, logo_hidden: true },
      ),
    ).toEqual({ logo_domain: null, logo_hidden: false });
  });

  it('fills in whichever half of a choice is missing', () => {
    expect(logoColumns({ logoDomain: 'a.com' })).toEqual({
      logo_domain: 'a.com',
      logo_hidden: false,
    });
    expect(logoColumns({ logoHidden: true })).toEqual({ logo_domain: null, logo_hidden: true });
  });
});

describe('selectionLogo', () => {
  it('shows a choice over the catalog, and letters over both', () => {
    const catalog = { ...STORE, brandId: 'b-1', domain: 'catalog.com' };

    expect(selectionLogo(catalog)).toBe('catalog.com');
    expect(selectionLogo({ ...catalog, logoDomain: 'chosen.com' })).toBe('chosen.com');
    expect(selectionLogo({ ...catalog, logoDomain: 'chosen.com', logoHidden: true })).toBeNull();
    expect(selectionLogo(STORE)).toBeNull();
  });
});
