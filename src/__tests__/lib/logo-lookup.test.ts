import { logoCategory, logoHints, websiteHost } from '@/lib/logo-lookup';

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
