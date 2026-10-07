import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  forgetKnownStores,
  matchKnownStores,
  readKnownStores,
  rememberIn,
  storeKey,
  useKnownStores,
  useRememberStore,
  type KnownStore,
} from '@/api/known-stores';

/**
 * The stores a person added themselves and settled the logo for, kept on the phone per person: one
 * entry per name with the latest answer winning, newest first, capped, isolated by user, unreadable
 * storage read as nothing, and no failure anywhere thrown at a caller.
 */

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  );
  // However it is loaded (import, import(), require), `default` is the same storage.
  storage.default = storage;
  return storage;
});

let mockUserId: string | null = 'user-1';
jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));

const KEY = 'skip.stores.user-1';

const store = (name: string, over: Partial<KnownStore> = {}): KnownStore => ({
  name,
  categoryId: 'other',
  logoDomain: `${name.toLowerCase().replace(/\W+/g, '')}.com`,
  logoHidden: false,
  ...over,
});

const stored = async (key = KEY): Promise<KnownStore[]> =>
  JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');

const put = (stores: unknown, key = KEY) => AsyncStorage.setItem(key, JSON.stringify(stores));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockUserId = 'user-1';
});

describe('storeKey', () => {
  it.each([
    ['Vercel', 'vercel'],
    ['  Vercel ', 'vercel'],
    ['planet   FITNESS', 'planet fitness'],
    ['Planet\tFitness', 'planet fitness'],
    ["Trader Joe's", "trader joe's"],
  ])('spells %p as %p', (typed, key) => {
    expect(storeKey(typed)).toBe(key);
  });

  it('gives two typings of one store the same key', () => {
    expect(storeKey('  CORNER   deli')).toBe(storeKey('corner deli '));
  });
});

describe('rememberIn', () => {
  it('puts the newest first', () => {
    const next = rememberIn([store('Alpha'), store('Beta')], store('Gamma'));
    expect(next.map((entry) => entry.name)).toEqual(['Gamma', 'Alpha', 'Beta']);
  });

  it('keeps one entry per name, and the latest answer wins', () => {
    const before = [store('Alpha'), store('Vercel', { logoDomain: 'old.com' }), store('Beta')];

    const next = rememberIn(before, store('  vercel ', { logoDomain: 'vercel.com' }));

    expect(next.map((entry) => entry.name)).toEqual(['  vercel ', 'Alpha', 'Beta']);
    expect(next[0].logoDomain).toBe('vercel.com');
  });

  it('lets letters replace a logo, and a logo replace letters', () => {
    const letters = store('Vercel', { logoDomain: null, logoHidden: true });
    expect(rememberIn([store('Vercel')], letters)[0]).toEqual(letters);
    expect(rememberIn([letters], store('Vercel'))[0].logoHidden).toBe(false);
  });

  it('caps the list at 100, dropping the oldest', () => {
    const full = Array.from({ length: 100 }, (_, index) => store(`Shop ${index}`));

    const next = rememberIn(full, store('Newest'));

    expect(next).toHaveLength(100);
    expect(next[0].name).toBe('Newest');
    expect(next[99].name).toBe('Shop 98');
    expect(next.some((entry) => entry.name === 'Shop 99')).toBe(false);
  });

  it('does not grow the list for a name it already has', () => {
    const full = Array.from({ length: 100 }, (_, index) => store(`Shop ${index}`));

    const next = rememberIn(full, store('shop 40'));

    expect(next).toHaveLength(100);
    expect(next[0].name).toBe('shop 40');
    expect(next.filter((entry) => storeKey(entry.name) === 'shop 40')).toHaveLength(1);
  });

  it('leaves the list it was given alone', () => {
    const before = [store('Alpha')];
    rememberIn(before, store('Beta'));
    expect(before.map((entry) => entry.name)).toEqual(['Alpha']);
  });
});

describe('matchKnownStores', () => {
  const stores = [
    store('Corner Deli'),
    store('The Deli Counter'),
    store('Deli Delite'),
    store('Planet Fitness'),
    store('Deliveroo Plus'),
  ];

  it('lists the names that start with what was typed before the ones that contain it', () => {
    expect(matchKnownStores(stores, 'deli').map((entry) => entry.name)).toEqual([
      'Deli Delite',
      'Deliveroo Plus',
      'Corner Deli',
    ]);
  });

  it('keeps the remembered order within each group', () => {
    const many = [store('Cafe Zed'), store('Cafe Alpha'), store('Big Cafe'), store('Cafe Beta')];
    expect(matchKnownStores(many, 'caf', 10).map((entry) => entry.name)).toEqual([
      'Cafe Zed',
      'Cafe Alpha',
      'Cafe Beta',
      'Big Cafe',
    ]);
  });

  it('offers three at most by default, and as many as asked', () => {
    expect(matchKnownStores(stores, 'deli')).toHaveLength(3);
    expect(matchKnownStores(stores, 'deli', 4).map((entry) => entry.name)).toEqual([
      'Deli Delite',
      'Deliveroo Plus',
      'Corner Deli',
      'The Deli Counter',
    ]);
    expect(matchKnownStores(stores, 'deli', 1)).toHaveLength(1);
  });

  it('ignores case and stray spaces in what was typed', () => {
    expect(matchKnownStores(stores, '  PLANET   fit ').map((entry) => entry.name)).toEqual([
      'Planet Fitness',
    ]);
  });

  it.each(['', ' ', 'd', ' d ', 'P'])('offers nothing for %p, under two characters', (typed) => {
    expect(matchKnownStores(stores, typed)).toEqual([]);
  });

  it('offers nothing when nothing matches, or nothing is remembered', () => {
    expect(matchKnownStores(stores, 'zzz')).toEqual([]);
    expect(matchKnownStores([], 'deli')).toEqual([]);
  });

  it('hands back the remembered entries themselves, answers and all', () => {
    const letters = store('Planet Fitness', { logoDomain: null, logoHidden: true });
    expect(matchKnownStores([letters], 'planet')).toEqual([letters]);
  });
});

describe('readKnownStores', () => {
  it('reads what was remembered, newest first as it was written', async () => {
    await put([store('Beta'), store('Alpha', { categoryId: 'dining' })]);

    expect(await readKnownStores('user-1')).toEqual([
      store('Beta'),
      store('Alpha', { categoryId: 'dining' }),
    ]);
  });

  it('reads an answer of letters', async () => {
    const letters = store('Vercel', { logoDomain: null, logoHidden: true });
    await put([letters]);
    expect(await readKnownStores('user-1')).toEqual([letters]);
  });

  it('keeps one entry per name when the stored list repeats one, the newest', async () => {
    await put([
      store('Vercel', { logoDomain: 'vercel.com' }),
      store('  vercel ', { logoDomain: 'old.example.com' }),
      store('Alpha'),
    ]);

    expect(await readKnownStores('user-1')).toEqual([
      store('Vercel', { logoDomain: 'vercel.com' }),
      store('Alpha'),
    ]);
  });

  it("never sees another person's stores", async () => {
    await put([store('Alpha')], 'skip.stores.user-2');
    expect(await readKnownStores('user-1')).toEqual([]);
    expect(await readKnownStores('user-2')).toEqual([store('Alpha')]);
  });

  it('is nothing when nothing was ever remembered', async () => {
    expect(await readKnownStores('user-1')).toEqual([]);
  });

  it.each([
    ['not json', '{oops'],
    ['an object', JSON.stringify({ name: 'Alpha' })],
    ['a number', '42'],
    ['a string', JSON.stringify('Alpha')],
    ['null', 'null'],
  ])('reads %s as nothing remembered', async (_, text) => {
    await AsyncStorage.setItem(KEY, text);
    expect(await readKnownStores('user-1')).toEqual([]);
  });

  it('drops entries that are malformed and keeps the good ones around them', async () => {
    await put([
      store('Alpha'),
      null,
      'Beta',
      42,
      { name: 'No category', logoDomain: 'x.com', logoHidden: false },
      { name: '', categoryId: 'other', logoDomain: 'x.com', logoHidden: false },
      { name: '   ', categoryId: 'other', logoDomain: 'x.com', logoHidden: false },
      { name: 5, categoryId: 'other', logoDomain: 'x.com', logoHidden: false },
      { name: 'Bad domain', categoryId: 'other', logoDomain: 7, logoHidden: false },
      { name: 'Bad hidden', categoryId: 'other', logoDomain: 'x.com', logoHidden: 'yes' },
      { name: 'No hidden', categoryId: 'other', logoDomain: 'x.com' },
      { name: 'No domain', categoryId: 'other', logoHidden: false },
      store('Gamma'),
    ]);

    expect((await readKnownStores('user-1')).map((entry) => entry.name)).toEqual([
      'Alpha',
      'Gamma',
    ]);
  });

  it('drops an entry that holds no answer: no logo chosen and not letters', async () => {
    await put([
      store('Answered'),
      store('Neither', { logoDomain: null, logoHidden: false }),
      store('Empty domain', { logoDomain: '', logoHidden: false }),
      store('Letters', { logoDomain: null, logoHidden: true }),
    ]);

    expect((await readKnownStores('user-1')).map((entry) => entry.name)).toEqual([
      'Answered',
      'Letters',
    ]);
  });

  it('keeps only the first 100 of a longer list', async () => {
    await put(Array.from({ length: 130 }, (_, index) => store(`Shop ${index}`)));

    const read = await readKnownStores('user-1');

    expect(read).toHaveLength(100);
    expect(read[0].name).toBe('Shop 0');
    expect(read[99].name).toBe('Shop 99');
  });

  it('reads storage that refuses as nothing remembered', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
    expect(await readKnownStores('user-1')).toEqual([]);
  });
});

describe('useKnownStores', () => {
  it('is nothing until the stores are read, then what was remembered', async () => {
    await put([store('Alpha'), store('Beta')]);
    let finish: (value: string | null) => void = () => {};
    jest
      .mocked(AsyncStorage.getItem)
      .mockImplementationOnce(() => new Promise<string | null>((resolve) => (finish = resolve)));

    const { result } = await renderHook(() => useKnownStores());
    expect(result.current).toEqual([]);

    await act(async () => finish(JSON.stringify([store('Alpha'), store('Beta')])));
    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current.map((entry) => entry.name)).toEqual(['Alpha', 'Beta']);
  });

  it('is nothing, and reads nothing, with nobody signed in', async () => {
    mockUserId = null;
    await put([store('Alpha')]);

    const { result } = await renderHook(() => useKnownStores());
    await act(async () => {});

    expect(result.current).toEqual([]);
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it("never shows another person's stores", async () => {
    await put([store('Alpha')], 'skip.stores.user-2');

    const { result } = await renderHook(() => useKnownStores());
    await act(async () => {});

    expect(result.current).toEqual([]);
  });

  it('stays nothing when storage refuses', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));

    const { result } = await renderHook(() => useKnownStores());
    await act(async () => {});

    expect(result.current).toEqual([]);
  });

  it('drops them when the person signs out, and reads the next person’s on sign-in', async () => {
    await put([store('Alpha')]);
    await put([store('Zed')], 'skip.stores.user-2');
    const { result, rerender } = await renderHook(() => useKnownStores());
    await waitFor(() => expect(result.current).toHaveLength(1));

    mockUserId = null;
    await rerender({});
    expect(result.current).toEqual([]);

    mockUserId = 'user-2';
    await rerender({});
    await waitFor(() => expect(result.current.map((entry) => entry.name)).toEqual(['Zed']));
  });
});

describe('useRememberStore', () => {
  it('writes the answer under this person’s key', async () => {
    const { result } = await renderHook(() => useRememberStore());

    await act(() => result.current(store('Vercel', { categoryId: 'software' })));

    expect(await stored()).toEqual([store('Vercel', { categoryId: 'software' })]);
  });

  it('puts the newest first and replaces an earlier answer for the same name', async () => {
    const { result } = await renderHook(() => useRememberStore());

    await act(() => result.current(store('Vercel', { logoDomain: 'old.com' })));
    await act(() => result.current(store('Alpha')));
    await act(() => result.current(store('vercel ', { logoDomain: 'vercel.com' })));

    const list = await stored();
    expect(list.map((entry) => entry.name)).toEqual(['vercel ', 'Alpha']);
    expect(list[0].logoDomain).toBe('vercel.com');
  });

  it('remembers letters as an answer', async () => {
    const { result } = await renderHook(() => useRememberStore());

    await act(() => result.current(store('Vercel', { logoDomain: null, logoHidden: true })));

    expect(await stored()).toEqual([store('Vercel', { logoDomain: null, logoHidden: true })]);
  });

  it('keeps two quick answers, one after the other', async () => {
    const { result } = await renderHook(() => useRememberStore());

    await act(async () => {
      await Promise.all([result.current(store('Alpha')), result.current(store('Beta'))]);
    });

    expect((await stored()).map((entry) => entry.name)).toEqual(['Beta', 'Alpha']);
  });

  it('adds to what is already remembered, and trims to 100', async () => {
    await put(Array.from({ length: 100 }, (_, index) => store(`Shop ${index}`)));
    const { result } = await renderHook(() => useRememberStore());

    await act(() => result.current(store('Newest')));

    const list = await stored();
    expect(list).toHaveLength(100);
    expect(list[0].name).toBe('Newest');
    expect(list.some((entry) => entry.name === 'Shop 99')).toBe(false);
  });

  it('writes nothing for a store with no answer', async () => {
    const { result } = await renderHook(() => useRememberStore());

    await act(() => result.current(store('Vercel', { logoDomain: null, logoHidden: false })));
    await act(() => result.current(store('Vercel', { logoDomain: '', logoHidden: false })));
    await act(() => result.current(store('   ', { logoDomain: 'x.com' })));

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(await stored()).toBeNull();
  });

  it('writes nothing with nobody signed in', async () => {
    mockUserId = null;
    const { result } = await renderHook(() => useRememberStore());

    await act(() => result.current(store('Vercel')));

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('never rejects when storage refuses the write, and the next answer still lands', async () => {
    const { result } = await renderHook(() => useRememberStore());
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));

    await expect(result.current(store('Alpha'))).resolves.toBeUndefined();
    expect(await stored()).toBeNull();

    await act(() => result.current(store('Beta')));
    expect((await stored()).map((entry) => entry.name)).toEqual(['Beta']);
  });

  it('never rejects when storage refuses the read before the write', async () => {
    const { result } = await renderHook(() => useRememberStore());
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));

    await expect(result.current(store('Alpha'))).resolves.toBeUndefined();
    // Unreadable reads as nothing remembered, so the answer is stored on its own.
    expect((await stored()).map((entry) => entry.name)).toEqual(['Alpha']);
  });

  it('is read by a store field mounted afterwards', async () => {
    const remember = await renderHook(() => useRememberStore());
    await act(() => remember.result.current(store('Vercel')));

    const read = await renderHook(() => useKnownStores());

    await waitFor(() => expect(read.result.current.map((entry) => entry.name)).toEqual(['Vercel']));
  });
});

describe('forgetKnownStores', () => {
  it('forgets everything remembered for that person, and no one else’s', async () => {
    await put([store('Alpha')]);
    await put([store('Zed')], 'skip.stores.user-2');

    await forgetKnownStores('user-1');

    expect(await stored()).toBeNull();
    expect((await stored('skip.stores.user-2')).map((entry) => entry.name)).toEqual(['Zed']);
  });

  it.each([null, undefined, ''])('does nothing without a person (%p)', async (userId) => {
    await put([store('Alpha')]);

    await forgetKnownStores(userId);

    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    expect(await stored()).toHaveLength(1);
  });

  it('never throws when storage refuses, and says so on the console', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.mocked(AsyncStorage.removeItem).mockRejectedValueOnce(new Error('disk'));

    await expect(forgetKnownStores('user-1')).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('leaves a list nobody remembered alone', async () => {
    await expect(forgetKnownStores('user-9')).resolves.toBeUndefined();
  });
});
