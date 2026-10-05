import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  forgetVoiceAliases,
  readVoiceAliasPairs,
  useLearnVoiceAlias,
  useVoiceAliases,
} from '@/api/voice-aliases';

/**
 * Learned voice corrections, kept on the phone per person: isolated by user,
 * capped oldest-first (integer-like names included), unreadable storage read
 * as nothing, and no failure anywhere ever thrown at a caller.
 */

const mockStorage = new Map<string, string>();
const mockFail = { get: false, set: false, remove: false };

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) =>
      mockFail.get
        ? Promise.reject(new Error('disk'))
        : Promise.resolve(mockStorage.get(key) ?? null),
    ),
    setItem: jest.fn((key: string, value: string) => {
      if (mockFail.set) return Promise.reject(new Error('disk full'));
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      if (mockFail.remove) return Promise.reject(new Error('disk'));
      mockStorage.delete(key);
      return Promise.resolve();
    }),
  },
}));

let mockUserId: string | null = 'user-1';
jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));

const KEY = 'skip.voice.aliases.user-1';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** The aliases hook and the learner, side by side under one client. */
const useBoth = () => ({ read: useVoiceAliases(), learn: useLearnVoiceAlias() });

beforeEach(() => {
  mockStorage.clear();
  mockFail.get = false;
  mockFail.set = false;
  mockFail.remove = false;
  mockUserId = 'user-1';
});

describe('useVoiceAliases', () => {
  it('reads what this person taught, and is ready once read', async () => {
    mockStorage.set(KEY, JSON.stringify([['spot a fly', 'Spotify']]));
    const { result } = await renderHook(() => useVoiceAliases(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.aliases).toEqual({ 'spot a fly': 'Spotify' });
  });

  it("never sees another person's corrections", async () => {
    mockStorage.set('skip.voice.aliases.user-2', JSON.stringify([['spot a fly', 'Spotify']]));
    const { result } = await renderHook(() => useVoiceAliases(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.aliases).toEqual({});
  });

  it.each([
    ['not json', '{oops'],
    ['an object', JSON.stringify({ 'spot a fly': 'Spotify' })],
    ['a number', '42'],
  ])('reads %s as nothing learned', async (_label, stored) => {
    mockStorage.set(KEY, stored);
    const { result } = await renderHook(() => useVoiceAliases(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.aliases).toEqual({});
  });

  it('keeps the good pairs from a half-broken list', async () => {
    mockStorage.set(KEY, JSON.stringify([['spot a fly', 'Spotify'], ['x'], [1, 2], 'y']));
    expect(await readVoiceAliasPairs('user-1')).toEqual([['spot a fly', 'Spotify']]);
  });

  it('reads storage that refuses as nothing learned, and is still ready', async () => {
    mockFail.get = true;
    const { result } = await renderHook(() => useVoiceAliases(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.aliases).toEqual({});
  });

  it('is ready with nothing when nobody is signed in', async () => {
    mockUserId = null;
    const { result } = await renderHook(() => useVoiceAliases(), { wrapper });
    expect(result.current).toEqual({ aliases: {}, ready: true });
  });
});

describe('useLearnVoiceAlias', () => {
  it('stores a correction as ordered pairs and shows it straight away', async () => {
    const { result } = await renderHook(useBoth, { wrapper });
    await waitFor(() => expect(result.current.read.ready).toBe(true));

    await act(() => result.current.learn('Spot a fly', 'Spotify'));

    expect(JSON.parse(mockStorage.get(KEY)!)).toEqual([['spot a fly', 'Spotify']]);
    await waitFor(() => expect(result.current.read.aliases).toEqual({ 'spot a fly': 'Spotify' }));
  });

  it('keeps two quick corrections, one after the other', async () => {
    const { result } = await renderHook(useBoth, { wrapper });
    await act(() =>
      Promise.all([
        result.current.learn('spot a fly', 'Spotify'),
        result.current.learn('wall greens', 'Walgreens'),
      ]).then(() => undefined),
    );
    expect(JSON.parse(mockStorage.get(KEY)!)).toEqual([
      ['spot a fly', 'Spotify'],
      ['wall greens', 'Walgreens'],
    ]);
  });

  it('writes nothing when there is nothing new to learn', async () => {
    const { result } = await renderHook(useBoth, { wrapper });
    await act(() => result.current.learn('Spotify', 'Spotify'));
    await act(() => result.current.learn('', 'Spotify'));
    expect(mockStorage.has(KEY)).toBe(false);
  });

  it('caps at 200, dropping the oldest, integer-like names included', async () => {
    const pairs = [
      ['seven eleven', '711'],
      ['twenty four', '24'],
      ...Array.from({ length: 198 }, (_, index) => [`shop number ${index}`, `Shop ${index}`]),
    ];
    mockStorage.set(KEY, JSON.stringify(pairs));
    const { result } = await renderHook(useBoth, { wrapper });

    await act(() => result.current.learn('spot a fly', 'Spotify'));

    const stored: [string, string][] = JSON.parse(mockStorage.get(KEY)!);
    expect(stored).toHaveLength(200);
    expect(stored[0]).toEqual(['twenty four', '24']);
    expect(stored[199]).toEqual(['spot a fly', 'Spotify']);
    expect(stored.some(([heard]) => heard === 'seven eleven')).toBe(false);
  });

  it('never throws when storage refuses the write', async () => {
    mockFail.set = true;
    const { result } = await renderHook(useBoth, { wrapper });
    await expect(result.current.learn('spot a fly', 'Spotify')).resolves.toBeUndefined();
    expect(mockStorage.has(KEY)).toBe(false);
  });

  it('does nothing with nobody signed in', async () => {
    mockUserId = null;
    const { result } = await renderHook(useBoth, { wrapper });
    await act(() => result.current.learn('spot a fly', 'Spotify'));
    expect(mockStorage.size).toBe(0);
  });
});

describe('forgetVoiceAliases', () => {
  it("clears only that person's corrections", async () => {
    mockStorage.set(KEY, '[]');
    mockStorage.set('skip.voice.aliases.user-2', '[]');
    await forgetVoiceAliases('user-1');
    expect(mockStorage.has(KEY)).toBe(false);
    expect(mockStorage.has('skip.voice.aliases.user-2')).toBe(true);
  });

  it('never throws, with no user or with storage refusing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockFail.remove = true;
    await expect(forgetVoiceAliases('user-1')).resolves.toBeUndefined();
    await expect(forgetVoiceAliases(null)).resolves.toBeUndefined();
    await expect(forgetVoiceAliases(undefined)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
