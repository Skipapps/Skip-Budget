/**
 * The point of these tests is the Release guarantee.
 *
 * The bypass is only ever as safe as `__DEV__`, so the first block sets
 * `__DEV__` to false — what every non-Debug bundle compiles it to — and proves
 * that the env var, the stored key and the setter are all inert: no read, no
 * write, no "yes". The second block is the mirror, so a passing suite means the
 * switch still works where it is supposed to.
 */

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStorage.delete(key);
      return Promise.resolve();
    }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AsyncStorage = require('@react-native-async-storage/async-storage').default as jest.Mocked<{
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}>;

type Bypass = typeof import('./pro-bypass');

const devFlag = globalThis as unknown as { __DEV__: boolean };
const realDev = devFlag.__DEV__;
const realEnv = process.env.EXPO_PUBLIC_PRO_BYPASS;

/** Loads a fresh copy of the module under a chosen `__DEV__` and env value. */
function load(options: { dev: boolean; env?: string }): Bypass {
  devFlag.__DEV__ = options.dev;
  if (options.env === undefined) delete process.env.EXPO_PUBLIC_PRO_BYPASS;
  else process.env.EXPO_PUBLIC_PRO_BYPASS = options.env;

  let loaded: Bypass;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('./pro-bypass') as Bypass;
  });
  return loaded!;
}

beforeEach(() => {
  mockStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  devFlag.__DEV__ = realDev;
  if (realEnv === undefined) delete process.env.EXPO_PUBLIC_PRO_BYPASS;
  else process.env.EXPO_PUBLIC_PRO_BYPASS = realEnv;
});

describe('with __DEV__ false — a Release bundle', () => {
  it('ignores EXPO_PUBLIC_PRO_BYPASS=1', () => {
    const bypass = load({ dev: false, env: '1' });
    expect(bypass.proBypassActive()).toBe(false);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('ignores the stored toggle, and never even reads it', async () => {
    mockStorage.set('skip.dev.proBypass', 'true');
    const bypass = load({ dev: false, env: '1' });

    bypass.hydrateProBypass();
    await Promise.resolve();

    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(bypass.proBypassActive()).toBe(false);
  });

  it('makes the setter a no-op — nothing turns on and nothing is written', async () => {
    const bypass = load({ dev: false });

    bypass.setProBypass(true);
    await Promise.resolve();

    expect(bypass.proBypassActive()).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('stays off even when the switch was flipped before the flag went false', () => {
    const bypass = load({ dev: true });
    bypass.setProBypass(true);
    expect(bypass.proBypassActive()).toBe(true);

    // Same module instance, same remembered state: only the build changed.
    devFlag.__DEV__ = false;
    expect(bypass.proBypassActive()).toBe(false);
  });
});

describe('with __DEV__ true — a development build', () => {
  it('stays off until somebody opts in', () => {
    const bypass = load({ dev: true });
    expect(bypass.proBypassActive()).toBe(false);
  });

  it('turns on for EXPO_PUBLIC_PRO_BYPASS=1, and says so loudly', () => {
    const bypass = load({ dev: true, env: '1' });
    expect(bypass.proBypassActive()).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('PRO BYPASS IS ON'));
  });

  it('ignores any other value of the env var', () => {
    expect(load({ dev: true, env: '0' }).proBypassActive()).toBe(false);
    expect(load({ dev: true, env: 'true' }).proBypassActive()).toBe(false);
  });

  it('turns on from the switch, persists it, and clears it again', async () => {
    const bypass = load({ dev: true });

    bypass.setProBypass(true);
    expect(bypass.proBypassActive()).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('skip.dev.proBypass', 'true');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('PRO BYPASS IS ON'));

    bypass.setProBypass(false);
    expect(bypass.proBypassActive()).toBe(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('skip.dev.proBypass');
  });

  it('reads the switch back on the next launch', async () => {
    mockStorage.set('skip.dev.proBypass', 'true');
    const bypass = load({ dev: true });

    bypass.hydrateProBypass();
    await Promise.resolve();
    await Promise.resolve();

    expect(bypass.proBypassActive()).toBe(true);
  });
});
