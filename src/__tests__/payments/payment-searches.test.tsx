import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  RECENT_CAP,
  RECENT_SHOWN,
  forgetQuery,
  forgetRecentSearches,
  readRecentSearches,
  rememberQuery,
  useRecentSearches,
} from '@/api/payment-searches';

/**
 * Recent payment searches, kept on the phone per person: newest first, one entry per spelling
 * (case and spaces aside), capped, × removes one. Storage that refuses, is missing or holds
 * something unreadable reads as no recent searches, and nothing ever throws at the screen.
 */

const mockStore = new Map<string, string>();
/** Which storage calls refuse, as a full or broken store does. */
const mockRefuse = { get: false, set: false, remove: false };
/** While set, reads wait for it: storage that has not answered yet. */
let mockGate: Promise<void> | null = null;

jest.mock('@react-native-async-storage/async-storage', () => {
  const area = {
    getItem: jest.fn(async (key: string) => {
      if (mockGate) await mockGate;
      if (mockRefuse.get) throw new Error('refused');
      return mockStore.get(key) ?? null;
    }),
    setItem: jest.fn(async (key: string, value: string) => {
      if (mockRefuse.set) throw new Error('full');
      mockStore.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      if (mockRefuse.remove) throw new Error('refused');
      mockStore.delete(key);
    }),
  };
  return { __esModule: true, default: area, ...area };
});

let mockUserId: string | null = 'user-1';
jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));

const KEY = 'skip.paymentSearches.user-1';
const KEY_2 = 'skip.paymentSearches.user-2';

const stored = (key = KEY): unknown => JSON.parse(mockStore.get(key) ?? 'null');

const put = (value: unknown, key = KEY) => mockStore.set(key, JSON.stringify(value));

/** Lets every queued storage call land. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  mockStore.clear();
  mockRefuse.get = false;
  mockRefuse.set = false;
  mockRefuse.remove = false;
  mockGate = null;
  mockUserId = 'user-1';
  jest.clearAllMocks();
});

describe('rememberQuery', () => {
  it('puts the newest first, trimmed', () => {
    expect(rememberQuery(['AEP', 'Rent'], '  Car loan ')).toEqual(['Car loan', 'AEP', 'Rent']);
  });

  it('keeps one entry per spelling, the latest typing winning', () => {
    expect(rememberQuery(['AEP', 'netflix', 'Rent'], '  NETFLIX ')).toEqual([
      'NETFLIX',
      'AEP',
      'Rent',
    ]);
    expect(rememberQuery(['car   loan'], 'Car loan')).toEqual(['Car loan']);
  });

  it(`keeps the newest ${RECENT_CAP}`, () => {
    const full = Array.from({ length: RECENT_CAP }, (_, i) => `q${i}`);
    const next = rememberQuery(full, 'new');
    expect(next).toHaveLength(RECENT_CAP);
    expect(next[0]).toBe('new');
    expect(next).not.toContain(`q${RECENT_CAP - 1}`);
  });

  it('changes nothing for a blank query', () => {
    expect(rememberQuery(['AEP'], '   ')).toEqual(['AEP']);
    expect(rememberQuery(['AEP'], '')).toEqual(['AEP']);
  });
});

describe('forgetQuery', () => {
  it('removes a search in any spelling of it', () => {
    expect(forgetQuery(['Car loan', 'AEP', 'Rent'], ' aep ')).toEqual(['Car loan', 'Rent']);
  });

  it('leaves the list as it was when the search is not in it', () => {
    expect(forgetQuery(['Car loan'], 'Rent')).toEqual(['Car loan']);
  });
});

describe('readRecentSearches', () => {
  it('reads what was kept for that person only', async () => {
    put(['Car loan', 'AEP']);
    put(['Gym'], KEY_2);

    await expect(readRecentSearches('user-1')).resolves.toEqual(['Car loan', 'AEP']);
    await expect(readRecentSearches('user-2')).resolves.toEqual(['Gym']);
    await expect(readRecentSearches('user-3')).resolves.toEqual([]);
  });

  it('drops what is not a search, repeats and anything past the cap', async () => {
    const many = Array.from({ length: RECENT_CAP + 3 }, (_, i) => `q${i}`);
    put(['Rent', 42, null, '  ', { q: 'x' }, ' rent ', '  AEP  ', ...many]);

    const read = await readRecentSearches('user-1');
    expect(read.slice(0, 3)).toEqual(['Rent', 'AEP', 'q0']);
    expect(read).toHaveLength(RECENT_CAP);
  });

  it.each(['not json', '{"a":1}', '"Rent"', 'null', '42', ''])('reads %j as none', async (raw) => {
    mockStore.set(KEY, raw);
    await expect(readRecentSearches('user-1')).resolves.toEqual([]);
  });

  it('reads storage that refuses as none', async () => {
    put(['Rent']);
    mockRefuse.get = true;
    await expect(readRecentSearches('user-1')).resolves.toEqual([]);
  });
});

describe('useRecentSearches', () => {
  it(`shows the newest ${RECENT_SHOWN} kept`, async () => {
    put(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    const { result } = await renderHook(() => useRecentSearches());

    await waitFor(() => expect(result.current.recent).toEqual(['a', 'b', 'c', 'd', 'e']));
  });

  it('remembers a search at the top at once, and keeps it', async () => {
    put(['AEP', 'Rent']);
    const { result } = await renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.recent).toEqual(['AEP', 'Rent']));

    await act(async () => {
      result.current.remember(' Car loan ');
    });
    expect(result.current.recent).toEqual(['Car loan', 'AEP', 'Rent']);
    await settle();
    expect(stored()).toEqual(['Car loan', 'AEP', 'Rent']);
  });

  it('moves a search made again to the top, not twice', async () => {
    put(['AEP', 'Rent', 'Car loan']);
    const { result } = await renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.recent).toHaveLength(3));

    await act(async () => {
      result.current.remember('car LOAN');
    });
    await settle();
    expect(result.current.recent).toEqual(['car LOAN', 'AEP', 'Rent']);
    expect(stored()).toEqual(['car LOAN', 'AEP', 'Rent']);
  });

  it('removes one with ×, and the next older one takes its place', async () => {
    put(['a', 'b', 'c', 'd', 'e', 'f']);
    const { result } = await renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.recent).toHaveLength(RECENT_SHOWN));

    await act(async () => {
      result.current.forget('C');
    });
    await settle();
    expect(result.current.recent).toEqual(['a', 'b', 'd', 'e', 'f']);
    expect(stored()).toEqual(['a', 'b', 'd', 'e', 'f']);
  });

  it('ignores a blank search', async () => {
    const { result } = await renderHook(() => useRecentSearches());
    await settle();

    await act(async () => {
      result.current.remember('   ');
    });
    await settle();
    expect(result.current.recent).toEqual([]);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('writes quick changes in the order they were made', async () => {
    const { result } = await renderHook(() => useRecentSearches());
    await settle();

    await act(async () => {
      result.current.remember('one');
      result.current.remember('two');
      result.current.forget('one');
      result.current.remember('three');
    });
    await settle();
    expect(result.current.recent).toEqual(['three', 'two']);
    expect(stored()).toEqual(['three', 'two']);
  });

  it('keeps changes made before storage answered, on top of what it held', async () => {
    put(['AEP', 'Rent']);
    let answer: () => void = () => {};
    mockGate = new Promise<void>((resolve) => {
      answer = resolve;
    });
    const { result } = await renderHook(() => useRecentSearches());

    await act(async () => {
      result.current.remember('Car loan');
      result.current.forget('Rent');
    });
    expect(result.current.recent).toEqual(['Car loan']);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    await act(async () => {
      answer();
    });
    await settle();
    expect(result.current.recent).toEqual(['Car loan', 'AEP']);
    expect(stored()).toEqual(['Car loan', 'AEP']);
  });

  it('keeps each person’s own, and shows and keeps none signed out', async () => {
    put(['Rent']);
    put(['Gym'], KEY_2);
    const { result, rerender } = await renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.recent).toEqual(['Rent']));

    mockUserId = 'user-2';
    await rerender({});
    await waitFor(() => expect(result.current.recent).toEqual(['Gym']));

    await act(async () => {
      result.current.remember('Pool');
    });
    await settle();
    expect(stored(KEY_2)).toEqual(['Pool', 'Gym']);
    expect(stored()).toEqual(['Rent']);

    mockUserId = null;
    await rerender({});
    expect(result.current.recent).toEqual([]);
    await act(async () => {
      result.current.remember('Nobody');
    });
    await settle();
    expect(result.current.recent).toEqual([]);
    expect([...mockStore.keys()].sort()).toEqual([KEY, KEY_2]);
  });

  it('shows none, without a throw, when storage refuses to read', async () => {
    put(['Rent']);
    mockRefuse.get = true;
    const { result } = await renderHook(() => useRecentSearches());
    await settle();

    expect(result.current.recent).toEqual([]);
  });

  it('still shows a search when storage refuses to write, without a throw', async () => {
    mockRefuse.set = true;
    const { result } = await renderHook(() => useRecentSearches());
    await settle();

    await act(async () => {
      result.current.remember('Rent');
      result.current.remember('AEP');
    });
    await settle();
    expect(result.current.recent).toEqual(['AEP', 'Rent']);
    expect(stored()).toBeNull();

    // A refused write does not jam the ones after it.
    mockRefuse.set = false;
    await act(async () => {
      result.current.remember('Gym');
    });
    await settle();
    expect(stored()).toEqual(['Gym', 'AEP', 'Rent']);
  });

  it('hands back the same list and functions until something changes', async () => {
    put(['Rent']);
    const { result, rerender } = await renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.recent).toEqual(['Rent']));
    const first = result.current;

    await rerender({});
    expect(result.current.recent).toBe(first.recent);
    expect(result.current.remember).toBe(first.remember);
    expect(result.current.forget).toBe(first.forget);
  });
});

describe('forgetRecentSearches', () => {
  it('forgets that person’s searches only', async () => {
    put(['Rent']);
    put(['Gym'], KEY_2);

    await forgetRecentSearches('user-1');
    expect(mockStore.has(KEY)).toBe(false);
    expect(stored(KEY_2)).toEqual(['Gym']);
  });

  it('runs after a write still on its way, so nothing comes back', async () => {
    const { result } = await renderHook(() => useRecentSearches());
    await settle();

    await act(async () => {
      result.current.remember('Rent');
      await forgetRecentSearches('user-1');
    });
    await settle();
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(mockStore.has(KEY)).toBe(false);
  });

  it('does nothing without a person', async () => {
    await expect(forgetRecentSearches(null)).resolves.toBeUndefined();
    await expect(forgetRecentSearches(undefined)).resolves.toBeUndefined();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it('never throws when storage refuses', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    put(['Rent']);
    mockRefuse.remove = true;

    await expect(forgetRecentSearches('user-1')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();

    // Nor does the refusal jam what comes after it.
    mockRefuse.remove = false;
    await forgetRecentSearches('user-1');
    expect(mockStore.has(KEY)).toBe(false);
  });
});

describe('without the storage module', () => {
  it('reads and forgets nothing, without a throw or a warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@react-native-async-storage/async-storage', () => {
        throw new Error('[@RNC/AsyncStorage]: NativeModule: AsyncStorage is null.');
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('@/api/payment-searches') as typeof import('@/api/payment-searches');

      await expect(fresh.readRecentSearches('user-1')).resolves.toEqual([]);
      await expect(fresh.forgetRecentSearches('user-1')).resolves.toBeUndefined();
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
