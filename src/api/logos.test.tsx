import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  deviceCountry,
  logoImageUrl,
  reportWrongLogo,
  resolveLogo,
  useLogoMatch,
} from '@/api/logos';

/**
 * The Skip Logos client. Every network path is a mocked fetch: what is asked (URL, key header,
 * body), and that every failure comes back as null or false rather than a throw.
 */

const API = 'https://logos-api.test';
const CDN = 'https://cdn.test/logos';
const KEY = 'app-key-123';

/** The device's Region setting; null (none) unless a test sets one. */
let mockRegion: string | null;
let mockLocalesFail: boolean;

jest.mock('expo-localization', () => ({
  getLocales: () => {
    if (mockLocalesFail) throw new Error('native module missing');
    return [{ languageTag: 'en', regionCode: mockRegion }];
  },
}));

const ENV = ['EXPO_PUBLIC_LOGO_API_URL', 'EXPO_PUBLIC_LOGO_API_KEY', 'EXPO_PUBLIC_LOGO_CDN_URL'];
const saved: Record<string, string | undefined> = {};
const realFetch = global.fetch;

type Call = { url: string; init: RequestInit };
let calls: Call[];
let answer: (call: Call) => Promise<Response>;

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );

const PLANET = {
  query: 'Planet Fitness',
  matched: true,
  name: 'Planet Fitness',
  domain: 'planetfitness.com',
  confidence: 0.98,
  margin: 0.31,
  logo: { url: 'https://x/v1/logo/planetfitness.com?v=1', width: 152, height: 152 },
  candidates: [
    { domain: 'planetfitness.com', name: 'Planet Fitness', confidence: 0.98, reason: 'name' },
    { domain: 'planet.com', name: 'Planet Labs', confidence: 0.67, reason: 'name' },
  ],
};

beforeEach(() => {
  for (const name of ENV) saved[name] = process.env[name];
  process.env.EXPO_PUBLIC_LOGO_API_URL = API;
  process.env.EXPO_PUBLIC_LOGO_API_KEY = KEY;
  process.env.EXPO_PUBLIC_LOGO_CDN_URL = '';
  mockRegion = null;
  mockLocalesFail = false;
  calls = [];
  answer = () => json(PLANET);
  global.fetch = jest.fn((url: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(url), init: init ?? {} };
    calls.push(call);
    return answer(call);
  }) as typeof fetch;
});

afterEach(() => {
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
  global.fetch = realFetch;
  jest.useRealTimers();
});

const headersOf = (call: Call) => (call.init.headers ?? {}) as Record<string, string>;

describe('resolveLogo', () => {
  it('asks the resolve route with the name and both hints, and sends the app key', async () => {
    const match = await resolveLogo('Planet Fitness', { country: 'US', category: 'fitness' });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${API}/v1/resolve?q=Planet%20Fitness&country=US&category=fitness`);
    expect(headersOf(calls[0])['x-app-key']).toBe(KEY);
    expect(calls[0].init.method ?? 'GET').toBe('GET');
    expect(match).toEqual({
      matched: true,
      name: 'Planet Fitness',
      domain: 'planetfitness.com',
      confidence: 0.98,
      margin: 0.31,
      candidates: [
        { domain: 'planetfitness.com', name: 'Planet Fitness', confidence: 0.98 },
        { domain: 'planet.com', name: 'Planet Labs', confidence: 0.67 },
      ],
      // This answer says nothing of how it was found.
      kind: null,
      pending: false,
      hasLogo: true,
    });
  });

  it('leaves out hints it was not given, and encodes what a name can contain', async () => {
    await resolveLogo("  Trader Joe's & Co  ", {});
    expect(calls[0].url).toBe(`${API}/v1/resolve?q=Trader%20Joe's%20%26%20Co`);

    await resolveLogo('Delta', { country: ' ', category: 'transport' });
    expect(calls[1].url).toBe(`${API}/v1/resolve?q=Delta&category=transport`);
  });

  it('copes with a trailing slash on the configured address', async () => {
    process.env.EXPO_PUBLIC_LOGO_API_URL = `${API}/`;
    await resolveLogo('Netflix', {});
    expect(calls[0].url).toBe(`${API}/v1/resolve?q=Netflix`);
  });

  it('sends no key header when no key is configured', async () => {
    process.env.EXPO_PUBLIC_LOGO_API_KEY = '';
    await resolveLogo('Netflix', {});
    expect(headersOf(calls[0])).not.toHaveProperty('x-app-key');
  });

  it('passes on an honest "not sure" as an answer, with its candidates', async () => {
    answer = () =>
      json({
        matched: false,
        name: null,
        domain: null,
        confidence: 0.41,
        margin: 0.02,
        logo: null,
        candidates: [{ domain: 'calm.com', name: 'Calm', confidence: 0.41 }],
      });
    await expect(resolveLogo('Calm', {})).resolves.toEqual({
      matched: false,
      name: null,
      domain: null,
      confidence: 0.41,
      margin: 0.02,
      candidates: [{ domain: 'calm.com', name: 'Calm', confidence: 0.41 }],
      kind: null,
      pending: false,
      hasLogo: false,
    });
  });

  it('says when the service is still finding the logo', async () => {
    answer = () =>
      json({
        matched: true,
        name: 'elonmanagement.com',
        domain: 'elonmanagement.com',
        confidence: 1,
        margin: 1,
        logo: null,
        candidates: [],
        match: 'domain',
        pending: true,
      });
    await expect(resolveLogo('elonmanagement.com', {})).resolves.toMatchObject({
      matched: true,
      pending: true,
      hasLogo: false,
    });
  });

  it('answers null without a request for a blank name', async () => {
    await expect(resolveLogo('   ', {})).resolves.toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('answers null without a request when the service is not configured', async () => {
    process.env.EXPO_PUBLIC_LOGO_API_URL = '';
    await expect(resolveLogo('Netflix', {})).resolves.toBeNull();
    delete process.env.EXPO_PUBLIC_LOGO_API_URL;
    await expect(resolveLogo('Netflix', {})).resolves.toBeNull();
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['refused (wrong key)', () => json({ error: 'missing or wrong x-app-key' }, 401)],
    ['a server error', () => json({ error: 'boom' }, 500)],
    ['offline', () => Promise.reject(new TypeError('Network request failed'))],
    ['not JSON', () => Promise.resolve(new Response('<html>', { status: 200 }))],
    ['JSON of the wrong shape', () => json({ matched: 'yes', domain: 'netflix.com' })],
    ['JSON that is not an object', () => json(['netflix.com'])],
  ])('answers null, never throws, when the service is %s', async (_, reply) => {
    answer = reply;
    await expect(resolveLogo('Netflix', {})).resolves.toBeNull();
  });

  it('gives up after its deadline instead of waiting forever', async () => {
    jest.useFakeTimers();
    answer = ({ init }) =>
      new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });

    const pending = resolveLogo('Netflix', {});
    jest.advanceTimersByTime(9_999);
    expect(calls[0].init.signal?.aborted).toBe(false);
    jest.advanceTimersByTime(1);
    await expect(pending).resolves.toBeNull();
  });

  it('keeps the deadline while the answer is still arriving, not only until the headers', async () => {
    jest.useFakeTimers();
    answer = ({ init }) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          new Promise((_, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      } as unknown as Response);

    const pending = resolveLogo('Netflix', {});
    await Promise.resolve();
    jest.advanceTimersByTime(10_000);
    await expect(pending).resolves.toBeNull();
  });

  it('does not call a match a match without a usable domain', async () => {
    answer = () => json({ ...PLANET, domain: 'https://planetfitness.com/join' });
    const match = await resolveLogo('Planet Fitness', {});
    expect(match).toMatchObject({ matched: false, name: null, domain: null });
  });

  it('cleans what it passes on: lower-case domains, bad candidates dropped, scores in 0..1', async () => {
    answer = () =>
      json({
        matched: true,
        name: ' Netflix ',
        domain: 'Netflix.COM',
        confidence: 1.7,
        margin: -3,
        candidates: [
          { domain: 'NETFLIX.com', name: 'Netflix', confidence: 0.9 },
          { domain: 'not a domain', name: 'Broken', confidence: 0.5 },
          { domain: 'hulu.com', confidence: 0.4 },
          'hulu.com',
          { domain: 'max.com', name: 'Max', confidence: 'high' },
        ],
      });
    await expect(resolveLogo('netflix', {})).resolves.toEqual({
      matched: true,
      name: 'Netflix',
      domain: 'netflix.com',
      confidence: 1,
      margin: 0,
      candidates: [
        { domain: 'netflix.com', name: 'Netflix', confidence: 0.9 },
        { domain: 'max.com', name: 'Max', confidence: 0 },
      ],
      kind: null,
      pending: false,
      hasLogo: false,
    });
  });

  describe('how the service found the brand', () => {
    it('reads the match field of an exact name, as the kind', async () => {
      answer = () => json({ ...PLANET, match: 'alias' });
      await expect(resolveLogo('Planet Fitness', {})).resolves.toEqual({
        matched: true,
        name: 'Planet Fitness',
        domain: 'planetfitness.com',
        confidence: 0.98,
        margin: 0.31,
        candidates: [
          { domain: 'planetfitness.com', name: 'Planet Fitness', confidence: 0.98 },
          { domain: 'planet.com', name: 'Planet Labs', confidence: 0.67 },
        ],
        kind: 'alias',
        pending: false,
        hasLogo: true,
      });
    });

    it.each(['alias', 'domain', 'fuzzy', 'none'])('passes on %p as it is', async (found) => {
      answer = () => json({ ...PLANET, match: found });
      await expect(resolveLogo('Planet Fitness', {})).resolves.toMatchObject({ kind: found });
    });

    it('trims it, and keeps at most 20 characters of it', async () => {
      answer = () => json({ ...PLANET, match: '  domain  ' });
      await expect(resolveLogo('Planet Fitness', {})).resolves.toMatchObject({ kind: 'domain' });

      answer = () => json({ ...PLANET, match: 'a'.repeat(30) });
      await expect(resolveLogo('Planet Fitness', {})).resolves.toMatchObject({
        kind: 'a'.repeat(20),
      });
    });

    it.each([
      ['missing', undefined],
      ['empty', ''],
      ['only spaces', '   '],
      ['a number', 3],
      ['a boolean', true],
      ['an object', { kind: 'alias' }],
      ['null', null],
    ])('is null when the match field is %s', async (_, found) => {
      answer = () => json({ ...PLANET, match: found });
      await expect(resolveLogo('Planet Fitness', {})).resolves.toMatchObject({ kind: null });
    });

    it('is read from an answer that found nothing too', async () => {
      answer = () =>
        json({ matched: false, name: null, domain: null, confidence: 0, margin: 0, match: 'none' });
      await expect(resolveLogo('Zed Zed', {})).resolves.toMatchObject({
        matched: false,
        kind: 'none',
      });
    });
  });

  it('never writes the app key to the console', async () => {
    const spies = (['log', 'warn', 'error', 'info', 'debug'] as const).map((method) =>
      jest.spyOn(console, method).mockImplementation(() => undefined),
    );
    try {
      for (const reply of [
        () => json(PLANET),
        () => json({}, 401),
        () => Promise.reject(new Error('offline')),
      ]) {
        answer = reply;
        await resolveLogo('Netflix', {});
        await reportWrongLogo({ domain: 'netflix.com', query: 'Netflix' });
      }
      const printed = spies.flatMap((spy) => spy.mock.calls.flat()).map(String);
      expect(printed.filter((line) => line.includes(KEY))).toEqual([]);
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });
});

describe('useLogoMatch', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  });

  afterEach(() => client.clear());

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  it('does not ask for fewer than two characters', async () => {
    const { result } = await renderHook(() => useLogoMatch(' P ', { country: 'US' }), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(calls).toHaveLength(0);
  });

  it('answers with the match for a settled name', async () => {
    const { result } = await renderHook(
      () => useLogoMatch('Planet Fitness', { country: 'US', category: 'fitness' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.domain).toBe('planetfitness.com');
    expect(calls[0].url).toContain('country=US&category=fitness');
  });

  it('keys by the hints too, since they change the answer', async () => {
    const transport = await renderHook(() => useLogoMatch('Delta', { category: 'transport' }), {
      wrapper,
    });
    await waitFor(() => expect(transport.result.current.isSuccess).toBe(true));
    const home = await renderHook(() => useLogoMatch('Delta', { category: 'home' }), { wrapper });
    await waitFor(() => expect(home.result.current.isSuccess).toBe(true));

    expect(calls.map((call) => call.url)).toEqual([
      `${API}/v1/resolve?q=Delta&category=transport`,
      `${API}/v1/resolve?q=Delta&category=home`,
    ]);
  });

  it('keeps a real answer: a second screen asking the same thing does not ask again', async () => {
    const first = await renderHook(() => useLogoMatch('Netflix', {}), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    await first.unmount();

    const second = await renderHook(() => useLogoMatch('  netflix ', {}), { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    expect(calls).toHaveLength(1);
  });

  it('tries a failed lookup once, then again only when a screen asks afresh', async () => {
    answer = () => Promise.reject(new Error('offline'));
    const first = await renderHook(() => useLogoMatch('Netflix', {}), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(first.result.current.data).toBeNull();
    expect(calls).toHaveLength(1);
    await first.unmount();

    answer = () => json(PLANET);
    const second = await renderHook(() => useLogoMatch('Netflix', {}), { wrapper });
    await waitFor(() => expect(second.result.current.data?.domain).toBe('planetfitness.com'));
    expect(calls).toHaveLength(2);
  });

  it("sends the device's region when the caller gives no country", async () => {
    mockRegion = 'GB';
    const { result } = await renderHook(() => useLogoMatch('Boots', { category: 'pharmacy' }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls[0].url).toBe(`${API}/v1/resolve?q=Boots&country=GB&category=pharmacy`);
  });

  it("lets the caller's country beat the device's", async () => {
    mockRegion = 'GB';
    const { result } = await renderHook(() => useLogoMatch('Boots', { country: 'US' }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls[0].url).toBe(`${API}/v1/resolve?q=Boots&country=US`);
  });

  it.each([
    ['no region', null],
    ['a lower-case region', 'gb'],
    ['a code that is not two letters', '419'],
  ])('sends no country for %s', async (_, region) => {
    mockRegion = region;
    const { result } = await renderHook(() => useLogoMatch('Boots', {}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls[0].url).toBe(`${API}/v1/resolve?q=Boots`);
  });

  it('keys the cache by the country actually sent, so a new region asks again', async () => {
    mockRegion = 'GB';
    const inBritain = await renderHook(() => useLogoMatch('Delta', {}), { wrapper });
    await waitFor(() => expect(inBritain.result.current.isSuccess).toBe(true));
    await inBritain.unmount();

    mockRegion = 'US';
    const inAmerica = await renderHook(() => useLogoMatch('Delta', {}), { wrapper });
    await waitFor(() => expect(inAmerica.result.current.isSuccess).toBe(true));

    expect(calls.map((call) => call.url)).toEqual([
      `${API}/v1/resolve?q=Delta&country=GB`,
      `${API}/v1/resolve?q=Delta&country=US`,
    ]);
    expect(client.getQueryData(['logo-match', 'delta', 'GB', null])).toBeTruthy();
    expect(client.getQueryData(['logo-match', 'delta', 'US', null])).toBeTruthy();
  });
});

describe('deviceCountry', () => {
  it('is the Region setting when it is a two-letter code', () => {
    mockRegion = 'US';
    expect(deviceCountry()).toBe('US');
  });

  it.each([
    ['there is no region', null],
    ['it is lower-case', 'us'],
    ['it is longer', 'USA'],
    ['it is a UN area code', '419'],
    ['it is empty', ''],
  ])('is undefined when %s', (_, region) => {
    mockRegion = region;
    expect(deviceCountry()).toBeUndefined();
  });

  it('is undefined, not a crash, when the locale cannot be read', () => {
    mockLocalesFail = true;
    expect(deviceCountry()).toBeUndefined();
  });
});

describe('reportWrongLogo', () => {
  it('posts the domain, what was typed and why, with the app key', async () => {
    answer = () => json({ ok: true });

    await expect(reportWrongLogo({ domain: 'calmair.com', query: 'Calm' })).resolves.toBe(true);

    expect(calls[0].url).toBe(`${API}/v1/report`);
    expect(calls[0].init.method).toBe('POST');
    expect(headersOf(calls[0])).toMatchObject({
      'content-type': 'application/json',
      'x-app-key': KEY,
    });
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      domain: 'calmair.com',
      query: 'Calm',
      reason: 'wrong logo (app)',
    });
  });

  it('leaves the query out when there is none', async () => {
    answer = () => json({ ok: true });
    await reportWrongLogo({ domain: 'netflix.com' });
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      domain: 'netflix.com',
      reason: 'wrong logo (app)',
    });
  });

  it.each([
    ['refused', () => json({ error: 'domain required' }, 400)],
    ['down', () => json({}, 503)],
    ['offline', () => Promise.reject(new TypeError('Network request failed'))],
  ])('says false, never throws, when the service is %s', async (_, reply) => {
    answer = reply;
    await expect(reportWrongLogo({ domain: 'netflix.com' })).resolves.toBe(false);
  });

  it('sends nothing for something that is not a domain, or with no service', async () => {
    await expect(reportWrongLogo({ domain: 'not a domain' })).resolves.toBe(false);
    process.env.EXPO_PUBLIC_LOGO_API_URL = '';
    await expect(reportWrongLogo({ domain: 'netflix.com' })).resolves.toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe('logoImageUrl', () => {
  it('loads from the CDN when one is configured', () => {
    process.env.EXPO_PUBLIC_LOGO_CDN_URL = CDN;
    expect(logoImageUrl('netflix.com')).toBe(`${CDN}/netflix.com`);
  });

  it('ignores a trailing slash on the CDN address', () => {
    process.env.EXPO_PUBLIC_LOGO_CDN_URL = `${CDN}/`;
    expect(logoImageUrl('netflix.com')).toBe(`${CDN}/netflix.com`);
  });

  it("falls back to the service's own image route without a CDN", () => {
    expect(logoImageUrl('netflix.com')).toBe(`${API}/v1/logo/netflix.com`);
    delete process.env.EXPO_PUBLIC_LOGO_CDN_URL;
    expect(logoImageUrl('netflix.com')).toBe(`${API}/v1/logo/netflix.com`);
  });

  it('asks for the lower-case name, the only spelling the store keeps', () => {
    process.env.EXPO_PUBLIC_LOGO_CDN_URL = CDN;
    expect(logoImageUrl(' Netflix.COM ')).toBe(`${CDN}/netflix.com`);
  });

  it('keeps anything odd inside one path segment', () => {
    process.env.EXPO_PUBLIC_LOGO_CDN_URL = CDN;
    expect(logoImageUrl('a/b?c')).toBe(`${CDN}/a%2Fb%3Fc`);
  });

  it('is null with no domain, or nowhere to load from', () => {
    expect(logoImageUrl(null)).toBeNull();
    expect(logoImageUrl(undefined)).toBeNull();
    expect(logoImageUrl('  ')).toBeNull();
    process.env.EXPO_PUBLIC_LOGO_API_URL = '';
    expect(logoImageUrl('netflix.com')).toBeNull();
  });
});
