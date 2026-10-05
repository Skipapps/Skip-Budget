import { applyAliases, learnAlias, normaliseHeard, type AliasPair } from './aliases';

describe('normaliseHeard', () => {
  it('reads a phrase the way the parser reads text', () => {
    expect(normaliseHeard('  Spot-a-Fly! ')).toBe('spot a fly');
    expect(normaliseHeard('Um, like, Joe’s')).toBe("joe's");
    expect(normaliseHeard('7-Eleven')).toBe('7 eleven');
  });
});

describe('learnAlias', () => {
  it('appends a new pair at the newest end, normalising what was heard', () => {
    const pairs: AliasPair[] = [['come cast', 'Xfinity']];
    expect(learnAlias(pairs, 'Spot a Fly', 'Spotify')).toEqual([
      ['come cast', 'Xfinity'],
      ['spot a fly', 'Spotify'],
    ]);
  });

  it('never changes the array it was given', () => {
    const pairs: AliasPair[] = [['come cast', 'Xfinity']];
    learnAlias(pairs, 'spot a fly', 'Spotify');
    expect(pairs).toEqual([['come cast', 'Xfinity']]);
  });

  it('moves a pair learned again to the newest end, with the new name', () => {
    const pairs: AliasPair[] = [
      ['spot a fly', 'Spotify'],
      ['come cast', 'Xfinity'],
    ];
    expect(learnAlias(pairs, 'SPOT A FLY', 'Spotify Family')).toEqual([
      ['come cast', 'Xfinity'],
      ['spot a fly', 'Spotify Family'],
    ]);
  });

  it('evicts oldest first at the cap, integer-like phrases included', () => {
    // An object would list "711" and "24" first whatever their age.
    let pairs: AliasPair[] = [];
    pairs = learnAlias(pairs, 'joes', "Joe's Diner", 3);
    pairs = learnAlias(pairs, '711', '7-Eleven', 3);
    pairs = learnAlias(pairs, 'spot a fly', 'Spotify', 3);
    pairs = learnAlias(pairs, '24', '24 Hour Fitness', 3);
    expect(pairs).toEqual([
      ['711', '7-Eleven'],
      ['spot a fly', 'Spotify'],
      ['24', '24 Hour Fitness'],
    ]);
    pairs = learnAlias(pairs, 'come cast', 'Xfinity', 3);
    expect(pairs.map(([heard]) => heard)).toEqual(['spot a fly', '24', 'come cast']);
  });

  it('keeps at most 200 pairs by default', () => {
    let pairs: AliasPair[] = [];
    for (let i = 0; i < 205; i += 1) pairs = learnAlias(pairs, `shop number ${i}`, `Shop ${i}`);
    expect(pairs).toHaveLength(200);
    expect(pairs[0]).toEqual(['shop number 5', 'Shop 5']);
    expect(pairs[199]).toEqual(['shop number 204', 'Shop 204']);
  });

  it('returns the same array when there is nothing to learn', () => {
    const pairs: AliasPair[] = [['come cast', 'Xfinity']];
    expect(learnAlias(pairs, '', 'Spotify')).toBe(pairs);
    expect(learnAlias(pairs, 'um', 'Spotify')).toBe(pairs);
    expect(learnAlias(pairs, 'spot a fly', '   ')).toBe(pairs);
    expect(learnAlias(pairs, 'spotify', 'Spotify')).toBe(pairs);
    expect(learnAlias(pairs, 'Spot-a-Fly', 'spot a fly')).toBe(pairs);
  });

  it('un-learns when corrected back to the heard words themselves (review B1)', () => {
    const pairs: AliasPair[] = [
      ['come cast', 'Xfinity'],
      ['target', 'Walmart'],
      ['spot a fly', 'Spotify'],
    ];
    expect(learnAlias(pairs, 'Target', 'Target')).toEqual([
      ['come cast', 'Xfinity'],
      ['spot a fly', 'Spotify'],
    ]);
    expect(learnAlias(pairs, 'spot a fly', 'Spot A Fly')).toEqual([
      ['come cast', 'Xfinity'],
      ['target', 'Walmart'],
    ]);
    // Found with spaces ignored, as the parser matches them.
    expect(learnAlias([['spotafly', 'Spotify']], 'spot a fly', 'Spot A Fly')).toEqual([]);
  });

  it('learns a name that differs only in how it is written', () => {
    expect(learnAlias([], 'joes diner', "Joe's Diner")).toEqual([['joes diner', "Joe's Diner"]]);
    expect(learnAlias([], 'star bucks', 'Starbucks')).toEqual([['star bucks', 'Starbucks']]);
  });

  it('drops corrupt entries and honours a zero cap', () => {
    const corrupt = [['ok', 'Fine'], ['bad'], [1, 2], 'nope', null] as unknown as AliasPair[];
    expect(learnAlias(corrupt, 'spot a fly', 'Spotify')).toEqual([
      ['ok', 'Fine'],
      ['spot a fly', 'Spotify'],
    ]);
    expect(learnAlias([], 'spot a fly', 'Spotify', 0)).toEqual([]);
  });
});

describe('applyAliases', () => {
  it('swaps a learned phrase for its name in the cleaned text', () => {
    expect(applyAliases('Paid 9.99 for spot a fly', { 'spot a fly': 'Spotify' })).toBe(
      'paid 9.99 for Spotify',
    );
  });

  it('matches with or without the spaces, longest phrase first', () => {
    const aliases = { 'spot a fly': 'Spotify', spot: 'Spot Pet Insurance' };
    expect(applyAliases('spotafly 9.99', aliases)).toBe('Spotify 9.99');
    expect(applyAliases('spot a fly 9.99', aliases)).toBe('Spotify 9.99');
  });

  it('matches whole words only', () => {
    expect(applyAliases('spotless 9.99', { spot: 'Spot Pet Insurance' })).toBe('spotless 9.99');
  });

  it('leaves text alone with no aliases, or broken ones', () => {
    expect(applyAliases('Um, Netflix 15.99', {})).toBe('netflix 15.99');
    expect(applyAliases('netflix 15.99', null as never)).toBe('netflix 15.99');
    expect(applyAliases('netflix 15.99', { netflix: 5 } as never)).toBe('netflix 15.99');
  });
});
