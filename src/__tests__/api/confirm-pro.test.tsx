import { act, renderHook } from '@testing-library/react-native';

import {
  APP_CATCH_UP_MS,
  SERVER_WAIT_MS,
  confirmPro,
  serverSaysPro,
  storeSaysPro,
  useProWrite,
  type ConfirmProDeps,
  type ProAnswer,
} from '@/api/confirm-pro';

/**
 * After the database refuses a Pro write that the app allowed, the store and the database are
 * asked again before anything is said. The database's yes means one more try; the store's no means
 * the explainer, once the app has caught up; anything else leaves the write's own failure.
 */

let mockPro = { pro: true, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));

const mockGetSession = jest.fn();
const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
    rpc: (name: string, args: unknown) => mockRpc(name, args),
  },
}));

const mockStore = {
  isConfigured: jest.fn(),
  invalidateCustomerInfoCache: jest.fn(),
  getCustomerInfo: jest.fn(),
};
jest.mock('react-native-purchases', () => ({ __esModule: true, default: mockStore }));

const REFUSAL = { code: 'P0001', message: 'Tracking spending habits is part of Skip Pro.' };

/** A clock that only moves when the code under test waits. */
function fakeDeps(overrides: Partial<ConfirmProDeps> = {}) {
  let clock = 0;
  const waits: number[] = [];
  const deps: ConfirmProDeps = {
    storeSaysPro: jest.fn(async () => true),
    serverSaysPro: jest.fn(async () => false),
    appSaysPro: jest.fn(() => true),
    sleep: jest.fn(async (ms: number) => {
      waits.push(ms);
      clock += ms;
    }),
    now: () => clock,
    ...overrides,
  };
  return { deps, waits, elapsed: () => clock };
}

describe('confirmPro', () => {
  it('answers pro at once, asking the store nothing, when the database already agrees', async () => {
    const { deps, waits } = fakeDeps({ serverSaysPro: jest.fn(async () => true) });
    await expect(confirmPro(deps)).resolves.toBe('pro');
    expect(deps.storeSaysPro).not.toHaveBeenCalled();
    expect(waits).toEqual([]);
  });

  it('keeps asking the database while the store says Pro, and answers pro once it agrees', async () => {
    const answers = [false, false, false, true];
    const { deps, elapsed } = fakeDeps({ serverSaysPro: jest.fn(async () => answers.shift()!) });
    await expect(confirmPro(deps)).resolves.toBe('pro');
    expect(deps.serverSaysPro).toHaveBeenCalledTimes(4);
    expect(elapsed()).toBe(3_000);
  });

  it.each([
    ['says Pro', true],
    ['cannot say', null],
  ])(
    'gives up after about ten seconds when the store %s and the database never agrees',
    async (_, store) => {
      const { deps, elapsed } = fakeDeps({ storeSaysPro: jest.fn(async () => store) });
      await expect(confirmPro(deps)).resolves.toBe('unknown');
      // About ten seconds: long enough for the webhook, short enough to wait on a button.
      expect(elapsed()).toBe(10_000);
      expect(SERVER_WAIT_MS).toBe(10_000);
      // The first ask, then one a second.
      expect(deps.serverSaysPro).toHaveBeenCalledTimes(11);
    },
  );

  it('counts a check that fails as not yet, and goes on asking', async () => {
    const answers: (boolean | Error)[] = [new Error('offline'), new Error('offline'), true];
    const { deps } = fakeDeps({
      serverSaysPro: jest.fn(async () => {
        const next = answers.shift()!;
        if (next instanceof Error) throw next;
        return next;
      }),
    });
    await expect(confirmPro(deps)).resolves.toBe('pro');
  });

  it('answers free once the store says free and the app shows it', async () => {
    const shown = [true, true, false];
    const { deps, elapsed } = fakeDeps({
      storeSaysPro: jest.fn(async () => false),
      appSaysPro: jest.fn(() => shown.shift() ?? false),
    });
    await expect(confirmPro(deps)).resolves.toBe('free');
    // It waited for the app, not for the database.
    expect(elapsed()).toBeLessThan(APP_CATCH_UP_MS);
    expect(deps.serverSaysPro).toHaveBeenCalledTimes(1);
  });

  it('answers unknown when the store says free but the app never shows it: the explainer would turn back', async () => {
    const { deps, elapsed } = fakeDeps({ storeSaysPro: jest.fn(async () => false) });
    await expect(confirmPro(deps)).resolves.toBe('unknown');
    expect(elapsed()).toBe(APP_CATCH_UP_MS);
    expect(APP_CATCH_UP_MS).toBe(3_000);
  });
});

describe('the database, asked', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockRpc.mockReset();
  });

  it('asks is_pro for the account signed in', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mockRpc.mockResolvedValue({ data: true, error: null });
    await expect(serverSaysPro()).resolves.toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('is_pro', { p_user: 'user-1' });
  });

  it('reads anything but true as no', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(serverSaysPro()).resolves.toBe(false);
  });

  it('asks nothing with nobody signed in', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(serverSaysPro()).resolves.toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('passes on a refusal to answer', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    const refused = { code: '42501', message: 'permission denied' };
    mockRpc.mockResolvedValue({ data: null, error: refused });
    await expect(serverSaysPro()).rejects.toBe(refused);
  });
});

describe('the store, asked', () => {
  const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  beforeEach(() => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mockStore.isConfigured.mockResolvedValue(true);
    mockStore.invalidateCustomerInfoCache.mockResolvedValue(undefined);
    mockStore.getCustomerInfo.mockReset();
  });
  afterAll(() => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = key;
  });

  it.each([
    ['skip_budget_pro', true],
    ['pro', true],
    ['something_else', false],
  ])('reads an active %s entitlement as %p, past the cache', async (id, expected) => {
    const order: string[] = [];
    mockStore.invalidateCustomerInfoCache.mockImplementation(async () => void order.push('clear'));
    mockStore.getCustomerInfo.mockImplementation(async () => {
      order.push('read');
      return {
        originalAppUserId: 'user-1',
        entitlements: { active: { [id]: { identifier: id } } },
      };
    });
    await expect(storeSaysPro()).resolves.toBe(expected);
    expect(order).toEqual(['clear', 'read']);
  });

  it('cannot say when the answer is another account’s, Pro or not', async () => {
    mockStore.getCustomerInfo.mockResolvedValue({
      originalAppUserId: 'user-before',
      entitlements: { active: { skip_budget_pro: { identifier: 'skip_budget_pro' } } },
    });
    await expect(storeSaysPro()).resolves.toBeNull();
  });

  it('cannot say with nobody signed in', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(storeSaysPro()).resolves.toBeNull();
    expect(mockStore.getCustomerInfo).not.toHaveBeenCalled();
  });

  it('cannot say with no store key', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = '';
    await expect(storeSaysPro()).resolves.toBeNull();
    expect(mockStore.getCustomerInfo).not.toHaveBeenCalled();
  });

  it('cannot say before the store is set up', async () => {
    mockStore.isConfigured.mockResolvedValue(false);
    await expect(storeSaysPro()).resolves.toBeNull();
    expect(mockStore.getCustomerInfo).not.toHaveBeenCalled();
  });

  it('cannot say when the store fails', async () => {
    mockStore.getCustomerInfo.mockRejectedValue(new Error('offline'));
    await expect(storeSaysPro()).resolves.toBeNull();
  });
});

describe('useProWrite', () => {
  beforeEach(() => {
    mockPro = { pro: true, ready: true };
  });

  const setup = async (answer: () => Promise<ProAnswer> = async () => 'unknown') => {
    const confirm = jest.fn(answer);
    const hook = await renderHook(() => useProWrite(confirm));
    return { confirm, ...hook };
  };

  it('hands back what the write saved, asking nothing', async () => {
    const { result, confirm } = await setup();
    const write = jest.fn(async () => 'row-1');
    await expect(result.current.run(write)).resolves.toEqual({ status: 'saved', value: 'row-1' });
    expect(write).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('rejects with any other failure as it came, asking nothing', async () => {
    const { result, confirm } = await setup();
    const offline = new Error('Network request failed');
    await expect(result.current.run(() => Promise.reject(offline))).rejects.toBe(offline);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('answers free at once for someone the app shows as free', async () => {
    mockPro = { pro: false, ready: true };
    const { result, confirm } = await setup();
    const write = jest.fn(() => Promise.reject(REFUSAL));
    await expect(result.current.run(write)).resolves.toEqual({ status: 'free' });
    expect(write).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('is checking while it asks, then writes once more when the database agrees', async () => {
    let agree: (answer: ProAnswer) => void = () => {};
    const { result, confirm } = await setup(() => new Promise((resolve) => (agree = resolve)));
    const write = jest.fn().mockRejectedValueOnce(REFUSAL).mockResolvedValueOnce('row-2');

    let outcome: Promise<unknown> = Promise.resolve();
    await act(async () => {
      outcome = result.current.run(write);
    });
    expect(result.current.checking).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);

    await act(async () => agree('pro'));
    await expect(outcome).resolves.toEqual({ status: 'saved', value: 'row-2' });
    expect(result.current.checking).toBe(false);
    expect(write).toHaveBeenCalledTimes(2);
  });

  it('answers free when the store says free after all, writing nothing more', async () => {
    const { result } = await setup(async () => 'free');
    const write = jest.fn(() => Promise.reject(REFUSAL));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.run(write);
    });
    expect(outcome).toEqual({ status: 'free' });
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('rejects with the refusal when the two never agree, writing nothing more', async () => {
    const { result } = await setup(async () => 'unknown');
    const write = jest.fn(() => Promise.reject(REFUSAL));
    let thrown: unknown;
    await act(async () => {
      thrown = await result.current.run(write).catch((error: unknown) => error);
    });
    expect(thrown).toBe(REFUSAL);
    expect(write).toHaveBeenCalledTimes(1);
    expect(result.current.checking).toBe(false);
  });

  it('rejects with the second refusal when the database refuses the try it agreed to', async () => {
    const again = { ...REFUSAL, message: 'Tracking spending habits is part of Skip Pro. (again)' };
    const { result } = await setup(async () => 'pro');
    const write = jest.fn().mockRejectedValueOnce(REFUSAL).mockRejectedValueOnce(again);
    let thrown: unknown;
    await act(async () => {
      thrown = await result.current.run(write).catch((error: unknown) => error);
    });
    expect(thrown).toBe(again);
    expect(write).toHaveBeenCalledTimes(2);
  });

  it('opens no explainer for a page already left when the refusal arrives', async () => {
    mockPro = { pro: false, ready: true };
    let refuse: (thrown: unknown) => void = () => {};
    const { result, confirm, unmount } = await setup();
    const write = jest.fn(() => new Promise((_, reject) => (refuse = reject)));

    let outcome: Promise<unknown> = Promise.resolve();
    await act(async () => {
      outcome = result.current.run(write);
    });
    await unmount();
    refuse(REFUSAL);

    await expect(outcome).resolves.toEqual({ status: 'left' });
    expect(confirm).not.toHaveBeenCalled();
  });

  it('writes nothing more once the page is left while it asks', async () => {
    let agree: (answer: ProAnswer) => void = () => {};
    const { result, unmount } = await setup(() => new Promise((resolve) => (agree = resolve)));
    const write = jest.fn().mockRejectedValueOnce(REFUSAL).mockResolvedValueOnce('row-2');

    let outcome: Promise<unknown> = Promise.resolve();
    await act(async () => {
      outcome = result.current.run(write);
    });
    await unmount();
    agree('pro');

    await expect(outcome).resolves.toEqual({ status: 'left' });
    expect(write).toHaveBeenCalledTimes(1);
  });
});
