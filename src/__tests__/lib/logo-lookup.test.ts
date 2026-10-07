import type { LogoMatch } from '@/api/logos';
import { isSureMatch, logoCategory, logoHints, websiteHost } from '@/lib/logo-lookup';

/**
 * What the app tells the logo service. Categories are translated into the service's own names,
 * since it ignores any other; a typed website is reduced to its bare host, since the service
 * matches hosts exactly.
 */

describe('logoCategory', () => {
  it.each([
    ['mobile', 'telecom'],
    ['internet', 'telecom'],
    ['telecom', 'telecom'],
    ['loans', 'banking'],
    ['finance', 'banking'],
    ['energy', 'energy'],
    ['utilities', 'energy'],
    ['insurance', 'insurance'],
    ['transport', 'transport'],
    ['groceries', 'groceries'],
    ['fitness', 'fitness'],
    ['entertainment', 'entertainment'],
  ])('sends the app’s %s as the service’s %s', (app, service) => {
    expect(logoCategory(app)).toBe(service);
  });

  it.each(['housing', 'water', 'family', 'other', '', 'made-up'])(
    'sends nothing for %p, which has no honest match',
    (app) => {
      expect(logoCategory(app)).toBeUndefined();
    },
  );

  it('sends nothing without a category', () => {
    expect(logoCategory(null)).toBeUndefined();
    expect(logoCategory(undefined)).toBeUndefined();
  });

  it('only ever sends a name the service knows', () => {
    const SERVICE = new Set([
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
      'energy',
      'telecom',
      'insurance',
      'banking',
    ]);
    const APP = [
      // Spend categories.
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
      'other',
      // Bill categories.
      'housing',
      'energy',
      'water',
      'internet',
      'mobile',
      'loans',
      'family',
    ];
    for (const id of APP) {
      const sent = logoCategory(id);
      if (sent !== undefined) expect(SERVICE).toContain(sent);
    }
  });

  it('builds the hints from it', () => {
    expect(logoHints('mobile')).toEqual({ category: 'telecom' });
    expect(logoHints('housing')).toEqual({});
    expect(logoHints(undefined)).toEqual({});
  });
});

describe('websiteHost', () => {
  it.each([
    ['https://www.PlanetFitness.com/gyms?x=1', 'planetfitness.com'],
    ['  planetfitness.com  ', 'planetfitness.com'],
    ['http://planetfitness.com', 'planetfitness.com'],
    ['www.planetfitness.com', 'planetfitness.com'],
    ['PLANETFITNESS.COM/', 'planetfitness.com'],
    ['planetfitness.com#top', 'planetfitness.com'],
    ['planetfitness.com?ref=app', 'planetfitness.com'],
    ['https://shop.example.co.uk/basket', 'shop.example.co.uk'],
    ['example.com:8080/x', 'example.com'],
    ['example.com.', 'example.com'],
  ])('reads %p as %p', (typed, host) => {
    expect(websiteHost(typed)).toBe(host);
  });

  it.each([
    '',
    '   ',
    'planet fitness',
    'planetfitness',
    'https://',
    'www.',
    '.com',
    'planet_fitness.com',
    '-planet.com',
    'planet-.com',
    'planet..com',
    'planetfitness.c',
    'planetfitness.123',
    'me@planetfitness.com',
    'ftp://planetfitness.com',
  ])('refuses %p, which cannot be a website', (typed) => {
    expect(websiteHost(typed)).toBeNull();
  });
});

/**
 * When the add forms stop asking "is this the right logo?". Only the service's exact answers count
 * (a name or website in its own list), at high confidence, with no other brand nearly as good: a
 * wrong logo is worse than a question.
 */
describe('isSureMatch', () => {
  const sure = (over: Partial<LogoMatch> = {}): LogoMatch => ({
    matched: true,
    name: 'Walmart',
    domain: 'walmart.com',
    confidence: 0.98,
    margin: 0.4,
    kind: 'alias',
    candidates: [{ domain: 'walmart.com', name: 'Walmart', confidence: 0.98 }],
    ...over,
  });

  it.each([
    ['an exact name (alias) at high confidence', sure()],
    ['an exact website (domain)', sure({ kind: 'domain', confidence: 1 })],
    ['exactly the confidence floor', sure({ confidence: 0.95 })],
    ['no candidates at all', sure({ candidates: [] })],
    [
      'a runner-up that is a little unlikely',
      sure({
        candidates: [
          { domain: 'walmart.com', name: 'Walmart', confidence: 0.98 },
          { domain: 'walmart.ca', name: 'Walmart Canada', confidence: 0.79 },
        ],
      }),
    ],
    [
      'the same brand listed again on its own domain ("walmart supercenter")',
      sure({
        margin: 0.1,
        candidates: [
          { domain: 'walmart.com', name: 'Walmart', confidence: 0.98 },
          { domain: 'walmart.com', name: 'Walmart Supercenter', confidence: 0.97 },
        ],
      }),
    ],
  ])('is sure of %s', (_, match) => {
    expect(isSureMatch(match)).toBe(true);
  });

  it.each([
    ['a close spelling (fuzzy), however confident', sure({ kind: 'fuzzy', confidence: 0.85 })],
    ['a fuzzy match at full confidence', sure({ kind: 'fuzzy', confidence: 1 })],
    ['an exact name below the floor', sure({ confidence: 0.9 })],
    ['just below the floor', sure({ confidence: 0.949 })],
    ['an answer that never said how it was found', sure({ kind: undefined })],
    ['a null kind', sure({ kind: null })],
    ['a kind it does not know', sure({ kind: 'guess' })],
    ['an empty kind', sure({ kind: '' })],
    ['"none"', sure({ kind: 'none' })],
    ['an answer that did not match', sure({ matched: false })],
    ['a match with no domain', sure({ domain: null })],
    ['a match with an empty domain', sure({ domain: '' })],
    [
      'two plausible brands ("Delta")',
      sure({
        name: 'Delta Air Lines',
        domain: 'delta.com',
        candidates: [
          { domain: 'delta.com', name: 'Delta Air Lines', confidence: 0.96 },
          { domain: 'deltafaucet.com', name: 'Delta Faucet', confidence: 0.8 },
        ],
      }),
    ],
    [
      'a runner-up on another domain even when it is listed first',
      sure({
        candidates: [
          { domain: 'walmart.ca', name: 'Walmart Canada', confidence: 0.9 },
          { domain: 'walmart.com', name: 'Walmart', confidence: 0.98 },
        ],
      }),
    ],
  ])('is not sure of %s', (_, match) => {
    expect(isSureMatch(match)).toBe(false);
  });

  it('is not sure of no answer at all', () => {
    expect(isSureMatch(null)).toBe(false);
    expect(isSureMatch(undefined)).toBe(false);
  });

  it('does not let a same-domain runner-up hide a second brand behind it', () => {
    const match = sure({
      candidates: [
        { domain: 'walmart.com', name: 'Walmart Supercenter', confidence: 0.97 },
        { domain: 'walmartone.com', name: 'Walmart One', confidence: 0.85 },
      ],
    });
    expect(isSureMatch(match)).toBe(false);
  });
});
