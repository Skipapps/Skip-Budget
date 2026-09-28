import { matchesSearch } from '@/lib/search';

describe('matchesSearch', () => {
  it('matches letter-for-letter, ignoring case and surrounding text', () => {
    expect(matchesSearch('Walmart', 'wal')).toBe(true);
    expect(matchesSearch('Walmart', 'MART')).toBe(true);
    expect(matchesSearch('Trader Joe’s', 'joe')).toBe(true);
    expect(matchesSearch('Walmart', 'target')).toBe(false);
  });

  it('matches everything on an empty or blank query', () => {
    expect(matchesSearch('Walmart', '')).toBe(true);
    expect(matchesSearch('Walmart', '   ')).toBe(true);
  });

  it('forgives a letter mistake once the query is four letters or longer', () => {
    // Doubled letter, wrong letter, missing letter, swapped pair.
    expect(matchesSearch('Walmart', 'wallmart')).toBe(true);
    expect(matchesSearch('Walmart', 'welmart')).toBe(true);
    expect(matchesSearch('Spotify', 'sptify')).toBe(true);
    expect(matchesSearch('Netflix', 'netlfix')).toBe(true);
  });

  it('forgives two mistakes from seven letters up, but not everything', () => {
    expect(matchesSearch('Electricity', 'electrisety')).toBe(true);
    expect(matchesSearch('Starbucks', 'starbux')).toBe(true);
    expect(matchesSearch('Starbucks', 'subway')).toBe(false);
    expect(matchesSearch('Equinox', 'iCloud+')).toBe(false);
  });

  it('stays exact for three letters or fewer', () => {
    expect(matchesSearch('Uber', 'ubr')).toBe(false);
    expect(matchesSearch('Uber', 'ube')).toBe(true);
  });
});
