/**
 * Signing out must delete this phone's push row *before* the session is cleared (device_tokens is
 * guarded by `auth.uid() = user_id`, so a later delete matches nothing), and a failed tidy-up must
 * never block signing out.
 */

// babel-plugin-jest-hoist lifts the jest.mock() calls below above this import.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { deleteAccount, signInWithEmail, signOut, updatePassword, verifyOtp } from './auth';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import type { VoiceDraft } from '@/lib/voice';
import { putVoiceDraft, readVoiceDraft } from '@/lib/voice-draft';

const HEARD: VoiceDraft = {
  kind: 'receipt',
  kindSure: true,
  amount: 12.5,
  amountChoices: [],
  merchant: null,
  merchantHeard: null,
  merchantSource: null,
  date: null,
  cycle: null,
  billCategoryId: null,
  multiple: false,
  score: 50,
  confidence: 'medium',
  missing: ['merchant'],
  transcript: 'twelve fifty at the corner shop',
};

const order: string[] = [];

let mockSession: { user: { id: string } } | null = { user: { id: 'user-A' } };
let mockSessionError: Error | null = null;
let mockSignOutError: { message: string } | null = null;
let mockAuthError: { message: string; code?: string } | null = null;

const mockForgetDevice = jest.fn(async (_userId: string) => {
  order.push('forget');
});

const mockAuthSignOut = jest.fn(async (_options?: { scope?: 'global' | 'local' | 'others' }) => {
  order.push('signOut');
  return { error: mockSignOutError };
});

const mockUpdateUser = jest.fn(async (_attributes: { password?: string }) => ({
  error: mockAuthError,
}));

const mockGetSession = jest.fn(async () => {
  if (mockSessionError) throw mockSessionError;
  return { data: { session: mockSession } };
});

// The real SDK starts a cleanup interval that holds Jest open.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

jest.mock('@/api/push', () => ({
  forgetDevice: (userId: string) => mockForgetDevice(userId),
}));

const mockForgetVoice = jest.fn(async (_userId: string | null | undefined) => {});
jest.mock('@/api/voice-aliases', () => ({
  forgetVoiceAliases: (userId: string | null | undefined) => mockForgetVoice(userId),
}));

const mockForgetStores = jest.fn(async (_userId: string | null | undefined) => {});
jest.mock('@/api/known-stores', () => ({
  forgetKnownStores: (userId: string | null | undefined) => mockForgetStores(userId),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  );
  // However it is loaded (import, import(), require), `default` is the same storage.
  storage.default = storage;
  return storage;
});

const SEARCHES_A = 'skip.paymentSearches.user-A';
const SEARCHES_B = 'skip.paymentSearches.user-B';

/** The real forgetting, over the storage above: what each test starts from. */
const forgetRealSearches = (userId: string | null | undefined) =>
  jest
    .requireActual<typeof import('@/api/payment-searches')>('@/api/payment-searches')
    .forgetRecentSearches(userId);

const mockForgetSearches = jest.fn(async (_userId: string | null | undefined) => {});
jest.mock('@/api/payment-searches', () => ({
  forgetRecentSearches: (userId: string | null | undefined) => mockForgetSearches(userId),
}));

// Not added to `order`: the sequence tests above are about the session, and this cancel has no
// session to outlive.
const mockCancelWrapUp = jest.fn(async () => {});
jest.mock('@/api/wrap-up-notification', () => ({
  cancelWrapUpNotification: () => mockCancelWrapUp(),
}));

let mockRpcError: { message: string } | null = null;
let mockLiveUser: { id: string } | null = null;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signOut: (options?: { scope?: 'global' | 'local' | 'others' }) => mockAuthSignOut(options),
      updateUser: (attributes: { password?: string }) => mockUpdateUser(attributes),
      signInWithPassword: async () => ({ error: mockAuthError }),
      verifyOtp: async () => ({ error: mockAuthError }),
      getUser: async () => ({ data: { user: mockLiveUser } }),
    },
    rpc: async () => ({ error: mockRpcError }),
  },
}));

const REAL_STORAGE_KEY = 'skip-test-auth';

const base64Url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/**
 * The real supabase-js client, holding user-A's unexpired session, with `answer` as its server. It
 * proves what the SDK does with the options and errors the mocks above only pass along.
 */
function realClient(answer: (url: string) => Promise<Response>) {
  const { createClient } =
    jest.requireActual<typeof import('@supabase/supabase-js')>('@supabase/supabase-js');
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const accessToken = [
    base64Url({ alg: 'HS256', typ: 'JWT' }),
    base64Url({ sub: 'user-A', aud: 'authenticated', role: 'authenticated', exp: expiresAt }),
    'signature',
  ].join('.');
  const stored = new Map<string, string>([
    [
      REAL_STORAGE_KEY,
      JSON.stringify({
        access_token: accessToken,
        refresh_token: 'refresh-A',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expiresAt,
        user: {
          id: 'user-A',
          aud: 'authenticated',
          app_metadata: {},
          user_metadata: {},
          created_at: '2026-01-01T00:00:00Z',
        },
      }),
    ],
  ]);
  const requests: string[] = [];
  const client = createClient('https://skip-test.supabase.co', 'publishable-key', {
    global: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push(`${init?.method ?? 'GET'} ${url}`);
        return answer(url);
      },
    },
    auth: {
      storage: {
        getItem: async (key: string) => stored.get(key) ?? null,
        setItem: async (key: string, value: string) => void stored.set(key, value),
        removeItem: async (key: string) => void stored.delete(key),
      },
      storageKey: REAL_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const events: string[] = [];
  client.auth.onAuthStateChange((event, session) => {
    events.push(`${event}:${session ? 'session' : 'none'}`);
  });
  return { client, requests, stored, events };
}

/** An answer from the auth server in the shape it sends since API version 2024-01-01. */
const serverRefusal = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ code, message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' },
  });

describe('signOut', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    order.length = 0;
    mockForgetDevice.mockClear();
    mockAuthSignOut.mockClear();
    mockGetSession.mockClear();
    mockSession = { user: { id: 'user-A' } };
    mockSessionError = null;
    mockSignOutError = null;
    mockForgetDevice.mockImplementation(async () => {
      order.push('forget');
    });
    mockForgetVoice.mockReset();
    mockForgetVoice.mockImplementation(async () => {});
    mockForgetStores.mockReset();
    mockForgetStores.mockImplementation(async () => {});
    mockForgetSearches.mockReset();
    mockForgetSearches.mockImplementation(forgetRealSearches);
  });

  it("deletes this device's push row before the session is cleared", async () => {
    const result = await signOut();

    expect(mockForgetDevice).toHaveBeenCalledWith('user-A');
    expect(order).toEqual(['forget', 'signOut']);
    expect(result.error).toBeNull();
  });

  it("signs out this phone only, once its push row, the person's voice, stores and searches and the wrap-up notice are gone", async () => {
    mockForgetVoice.mockImplementation(async () => {
      order.push('voice');
    });
    mockForgetStores.mockImplementation(async () => {
      order.push('stores');
    });
    mockForgetSearches.mockImplementation(async (userId) => {
      order.push('searches');
      await forgetRealSearches(userId);
    });
    mockCancelWrapUp.mockClear();
    mockCancelWrapUp.mockImplementationOnce(async () => {
      order.push('wrapUp');
    });

    const result = await signOut();

    expect(mockAuthSignOut).toHaveBeenCalledTimes(1);
    expect(mockAuthSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockForgetDevice).toHaveBeenCalledWith('user-A');
    expect(mockForgetVoice).toHaveBeenCalledWith('user-A');
    expect(mockForgetStores).toHaveBeenCalledWith('user-A');
    expect(mockForgetSearches).toHaveBeenCalledWith('user-A');
    expect(order).toEqual(['forget', 'voice', 'stores', 'searches', 'wrapUp', 'signOut']);
    expect(result.error).toBeNull();
  });

  it("asks the server to end only this phone's session, and the app still hears SIGNED_OUT", async () => {
    const real = realClient(async () => new Response(null, { status: 204 }));
    mockAuthSignOut.mockImplementationOnce((options) => real.client.auth.signOut(options));

    const result = await signOut();

    expect(result.error).toBeNull();
    expect(real.requests).toEqual([
      'POST https://skip-test.supabase.co/auth/v1/logout?scope=local',
    ]);
    // The session provider sets what this event carries, so every user-keyed query and the
    // realtime channel drop with it.
    expect(real.events.at(-1)).toBe('SIGNED_OUT:none');
    expect(real.stored.has(REAL_STORAGE_KEY)).toBe(false);
  });

  it('still signs this phone out when the server cannot be reached, and says it failed', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const real = realClient(async () => {
      throw new TypeError('Network request failed');
    });
    mockAuthSignOut.mockImplementationOnce((options) => real.client.auth.signOut(options));

    const result = await signOut();

    expect(result.error).toBe(FAILURE_MESSAGE);
    expect(real.requests).toEqual([
      'POST https://skip-test.supabase.co/auth/v1/logout?scope=local',
    ]);
    expect(real.events.at(-1)).toBe('SIGNED_OUT:none');
    expect(real.stored.has(REAL_STORAGE_KEY)).toBe(false);
    log.mockRestore();
  });

  it('signs out anyway when the row cannot be deleted', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockForgetDevice.mockImplementation(async () => {
      order.push('forget');
      throw new Error('Network request failed');
    });

    const result = await signOut();

    expect(order).toEqual(['forget', 'signOut']);
    expect(result.error).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('signs out anyway when the session cannot be read', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockSessionError = new Error('storage unavailable');

    const result = await signOut();

    expect(mockForgetDevice).not.toHaveBeenCalled();
    expect(order).toEqual(['signOut']);
    expect(result.error).toBeNull();
    warn.mockRestore();
  });

  it('does not try to delete a row when there is no session to own it', async () => {
    mockSession = null;

    const result = await signOut();

    expect(mockForgetDevice).not.toHaveBeenCalled();
    expect(order).toEqual(['signOut']);
    expect(result.error).toBeNull();
  });

  it('still reports a failed sign-out', async () => {
    mockSignOutError = { message: 'network error' };

    const result = await signOut();

    expect(order).toEqual(['forget', 'signOut']);
    expect(result.error).toBe(FAILURE_MESSAGE);
  });

  it("forgets this person's learned voice corrections while the session can still name them", async () => {
    mockForgetVoice.mockImplementation(async () => {
      order.push('voice');
    });

    const result = await signOut();

    expect(mockForgetVoice).toHaveBeenCalledWith('user-A');
    expect(order).toEqual(['forget', 'voice', 'signOut']);
    expect(result.error).toBeNull();
  });

  it('forgets the stores this person added, by their id, once the voice corrections are gone', async () => {
    mockForgetVoice.mockImplementation(async () => {
      order.push('voice');
    });
    mockForgetStores.mockImplementation(async () => {
      order.push('stores');
    });

    const result = await signOut();

    expect(mockForgetStores).toHaveBeenCalledTimes(1);
    expect(mockForgetStores).toHaveBeenCalledWith('user-A');
    expect(order).toEqual(['forget', 'voice', 'stores', 'signOut']);
    expect(result.error).toBeNull();
  });

  it('cannot name whose stores to forget when the session cannot be read, and signs out anyway', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockSessionError = new Error('storage unavailable');

    const result = await signOut();

    expect(mockForgetStores).not.toHaveBeenCalled();
    expect(mockForgetSearches).not.toHaveBeenCalled();
    expect(mockAuthSignOut).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
    warn.mockRestore();
  });

  it('signs out anyway when the remembered stores cannot be cleared', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockForgetStores.mockImplementation(async () => {
      throw new Error('storage unavailable');
    });

    const result = await signOut();

    expect(order).toEqual(['forget', 'signOut']);
    expect(result.error).toBeNull();
    warn.mockRestore();
  });

  it("forgets the signed-out person's recent payment searches, and nobody else's", async () => {
    await AsyncStorage.setItem(SEARCHES_A, JSON.stringify(['Rent', 'Netflix']));
    await AsyncStorage.setItem(SEARCHES_B, JSON.stringify(['Gym']));
    mockForgetVoice.mockImplementation(async () => {
      order.push('voice');
    });
    mockForgetStores.mockImplementation(async () => {
      order.push('stores');
    });
    mockForgetSearches.mockImplementation(async (userId) => {
      order.push('searches');
      await forgetRealSearches(userId);
    });

    const result = await signOut();

    expect(mockForgetSearches).toHaveBeenCalledTimes(1);
    expect(mockForgetSearches).toHaveBeenCalledWith('user-A');
    expect(await AsyncStorage.getItem(SEARCHES_A)).toBeNull();
    expect(await AsyncStorage.getItem(SEARCHES_B)).toBe('["Gym"]');
    expect(order).toEqual(['forget', 'voice', 'stores', 'searches', 'signOut']);
    expect(result.error).toBeNull();
  });

  it('signs out anyway when the phone refuses to clear the recent searches', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await AsyncStorage.setItem(SEARCHES_A, JSON.stringify(['Rent']));
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('storage full'));

    const result = await signOut();

    expect(mockForgetSearches).toHaveBeenCalledWith('user-A');
    expect(warn).toHaveBeenCalledWith('Could not clear recent searches', expect.any(Error));
    expect(mockAuthSignOut).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
    warn.mockRestore();
  });

  it('signs out anyway when forgetting the recent searches fails outright', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockForgetSearches.mockImplementation(async () => {
      throw new Error('storage unavailable');
    });

    const result = await signOut();

    expect(order).toEqual(['forget', 'signOut']);
    expect(result.error).toBeNull();
    warn.mockRestore();
  });

  it('forgets an unsaved voice draft, even when the session cannot be read', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const first = putVoiceDraft(HEARD);
    await signOut();
    expect(readVoiceDraft(first)).toBeNull();

    mockSessionError = new Error('storage unavailable');
    const second = putVoiceDraft(HEARD);
    const result = await signOut();
    expect(readVoiceDraft(second)).toBeNull();
    expect(result.error).toBeNull();
    warn.mockRestore();
  });

  it('takes the pending wrap-up notice off the phone before the session goes', async () => {
    mockCancelWrapUp.mockClear();
    mockCancelWrapUp.mockImplementationOnce(async () => {
      // Still signed in at this point.
      expect(mockAuthSignOut).not.toHaveBeenCalled();
    });

    const result = await signOut();

    expect(mockCancelWrapUp).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
  });

  it('takes the wrap-up notice away even when the session cannot be read', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockCancelWrapUp.mockClear();
    mockSessionError = new Error('storage unavailable');

    await signOut();

    expect(mockCancelWrapUp).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('signs out anyway when the voice corrections cannot be cleared', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockForgetVoice.mockImplementation(async () => {
      throw new Error('storage unavailable');
    });

    const result = await signOut();

    expect(order).toEqual(['forget', 'signOut']);
    expect(result.error).toBeNull();
    warn.mockRestore();
  });
});

describe('deleteAccount', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    order.length = 0;
    mockAuthSignOut.mockClear();
    mockSession = { user: { id: 'user-A' } };
    mockSessionError = null;
    mockSignOutError = null;
    mockRpcError = null;
    mockLiveUser = null;
    mockForgetVoice.mockReset();
    mockForgetVoice.mockImplementation(async () => {
      order.push('voice');
    });
    mockForgetStores.mockReset();
    mockForgetStores.mockImplementation(async () => {});
    mockForgetSearches.mockReset();
    mockForgetSearches.mockImplementation(forgetRealSearches);
  });

  it("forgets the person's voice corrections once the account is really gone", async () => {
    const id = putVoiceDraft(HEARD);
    const result = await deleteAccount();

    expect(readVoiceDraft(id)).toBeNull();

    expect(result.error).toBeNull();
    expect(mockForgetVoice).toHaveBeenCalledWith('user-A');
    expect(order).toEqual(['voice', 'signOut']);
  });

  it('forgets the stores they added too, by their id, before signing out', async () => {
    mockForgetStores.mockImplementation(async () => {
      order.push('stores');
    });

    const result = await deleteAccount();

    expect(result.error).toBeNull();
    expect(mockForgetStores).toHaveBeenCalledTimes(1);
    expect(mockForgetStores).toHaveBeenCalledWith('user-A');
    expect(order).toEqual(['voice', 'stores', 'signOut']);
  });

  it('forgets their recent payment searches too, before signing out', async () => {
    await AsyncStorage.setItem(SEARCHES_A, JSON.stringify(['Rent']));
    mockForgetSearches.mockImplementation(async (userId) => {
      order.push('searches');
      await forgetRealSearches(userId);
    });

    const result = await deleteAccount();

    expect(result.error).toBeNull();
    expect(mockForgetSearches).toHaveBeenCalledWith('user-A');
    expect(await AsyncStorage.getItem(SEARCHES_A)).toBeNull();
    expect(order).toEqual(['voice', 'searches', 'signOut']);
  });

  it('signs only this phone out of the deleted account', async () => {
    const result = await deleteAccount();

    expect(result.error).toBeNull();
    expect(mockAuthSignOut).toHaveBeenCalledTimes(1);
    expect(mockAuthSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it("clears this phone's copy of the deleted account's session, though the server no longer knows it", async () => {
    const real = realClient(async () =>
      serverRefusal(403, 'user_not_found', 'User from sub claim in JWT does not exist'),
    );
    mockAuthSignOut.mockImplementationOnce((options) => real.client.auth.signOut(options));

    const result = await deleteAccount();

    expect(result.error).toBeNull();
    expect(real.requests).toEqual([
      'POST https://skip-test.supabase.co/auth/v1/logout?scope=local',
    ]);
    expect(real.events.at(-1)).toBe('SIGNED_OUT:none');
    expect(real.stored.has(REAL_STORAGE_KEY)).toBe(false);
  });

  it('takes the pending wrap-up notice off the phone once the account is gone', async () => {
    mockCancelWrapUp.mockClear();

    const result = await deleteAccount();

    expect(result.error).toBeNull();
    expect(mockCancelWrapUp).toHaveBeenCalledTimes(1);
  });

  it('keeps them while the account is still there', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCancelWrapUp.mockClear();
    const id = putVoiceDraft(HEARD);
    mockRpcError = { message: 'boom' };
    expect((await deleteAccount()).error).toBe(FAILURE_MESSAGE);

    mockRpcError = null;
    mockLiveUser = { id: 'user-A' };
    expect((await deleteAccount()).error).toBe(FAILURE_MESSAGE);

    expect(mockForgetVoice).not.toHaveBeenCalled();
    expect(mockForgetStores).not.toHaveBeenCalled();
    expect(mockForgetSearches).not.toHaveBeenCalled();
    expect(mockCancelWrapUp).not.toHaveBeenCalled();
    expect(mockAuthSignOut).not.toHaveBeenCalled();
    expect(readVoiceDraft(id)).not.toBeNull();
    jest.restoreAllMocks();
  });

  it('still signs out of a deleted account when the remembered stores cannot be cleared', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockForgetStores.mockImplementation(async () => {
      throw new Error('storage unavailable');
    });

    const result = await deleteAccount();

    expect(result.error).toBeNull();
    expect(mockAuthSignOut).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('still signs out of a deleted account when they cannot be cleared', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockForgetVoice.mockImplementation(async () => {
      throw new Error('storage unavailable');
    });

    const result = await deleteAccount();

    expect(result.error).toBeNull();
    expect(mockAuthSignOut).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('sign-in wording', () => {
  beforeEach(() => {
    mockAuthError = null;
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('names a wrong password', async () => {
    mockAuthError = { message: 'Invalid login credentials' };
    const result = await signInWithEmail('sam@example.com', 'nope');
    expect(result.error).toBe('That email and password do not match.');
  });

  it('names an expired code', async () => {
    mockAuthError = { message: 'Token has expired or is invalid' };
    const result = await verifyOtp('sam@example.com', '123456', 'signup');
    expect(result.error).toBe('That code has expired. Send a new one.');
  });

  it('names too many attempts', async () => {
    mockAuthError = { message: 'Email rate limit exceeded' };
    const result = await signInWithEmail('sam@example.com', 'nope');
    expect(result.error).toBe('Too many attempts. Wait a minute and try again.');
  });

  it('says the one failure line for anything it does not recognise', async () => {
    mockAuthError = { message: 'Network request failed' };
    const result = await signInWithEmail('sam@example.com', 'nope');
    expect(result.error).toBe(FAILURE_MESSAGE);
  });
});

describe('sign-in wording in Spanish and French', () => {
  beforeEach(() => {
    resetLocaleForTests();
    mockAuthError = null;
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => resetLocaleForTests());

  it('names each refusal in Spanish', async () => {
    setLanguage('es');
    mockAuthError = { message: 'Invalid login credentials' };
    expect((await signInWithEmail('sam@example.com', 'nope')).error).toBe(
      'Ese correo y esa contraseña no coinciden.',
    );
    mockAuthError = { message: 'Token has expired or is invalid' };
    expect((await verifyOtp('sam@example.com', '123456', 'signup')).error).toBe(
      'Ese código ya expiró. Pide uno nuevo.',
    );
    mockAuthError = { message: 'Network request failed' };
    expect((await signInWithEmail('sam@example.com', 'nope')).error).toBe(
      'Algo salió mal. Inténtalo de nuevo.',
    );
  });

  it('names each refusal in French', async () => {
    setLanguage('fr');
    mockAuthError = { message: 'Email rate limit exceeded' };
    expect((await signInWithEmail('sam@example.com', 'nope')).error).toBe(
      'Trop de tentatives. Attends une minute et réessaie.',
    );
    mockAuthError = { message: 'User already registered' };
    expect((await signInWithEmail('sam@example.com', 'nope')).error).toBe(
      'Ce courriel a déjà un compte.',
    );
    mockAuthError = { message: 'Invalid token' };
    expect((await verifyOtp('sam@example.com', '123456', 'recovery')).error).toBe(
      'Ce code n’est pas le bon. Vérifie-le et réessaie.',
    );
  });

  it('says the failure line in French when the account is still there after deleting', async () => {
    setLanguage('fr');
    mockRpcError = null;
    mockLiveUser = { id: 'user-A' };
    expect((await deleteAccount()).error).toBe('Une erreur est survenue. Réessaie.');
    mockLiveUser = null;
  });
});

describe('new password wording', () => {
  const SAME = 'That’s your current password. Choose a new one.';
  const SHORT = 'Password must be at least 6 characters.';
  // The auth server's words when the new password is the current one.
  const SAME_WORDS = 'New password should be different from the old password.';

  beforeEach(() => {
    resetLocaleForTests();
    mockAuthError = null;
    mockUpdateUser.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => resetLocaleForTests());

  it('names a new password that is the current one, not a short one', async () => {
    mockAuthError = { code: 'same_password', message: SAME_WORDS };
    expect((await updatePassword('hunter22')).error).toBe(SAME);
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'hunter22' });
  });

  it('knows it by its code alone, even when the words read like a short password', async () => {
    mockAuthError = { code: 'same_password', message: 'Password should be new.' };
    expect((await updatePassword('hunter22')).error).toBe(SAME);
  });

  it('knows it by the words alone when no code comes with them', async () => {
    mockAuthError = { message: SAME_WORDS };
    expect((await updatePassword('hunter22')).error).toBe(SAME);
  });

  it('still says a short password is too short', async () => {
    mockAuthError = { code: 'weak_password', message: 'Password should be at least 6 characters.' };
    expect((await updatePassword('abc12')).error).toBe(SHORT);
    mockAuthError = { message: 'Password should be at least 6 characters' };
    expect((await updatePassword('abc12')).error).toBe(SHORT);
  });

  it('says the one failure line for anything it does not recognise', async () => {
    mockAuthError = { message: 'Network request failed' };
    expect((await updatePassword('hunter22')).error).toBe(FAILURE_MESSAGE);
    mockAuthError = { code: 'unexpected_failure', message: 'Unexpected failure' };
    expect((await updatePassword('hunter22')).error).toBe(FAILURE_MESSAGE);
  });

  it('says it in Spanish and French', async () => {
    mockAuthError = { code: 'same_password', message: SAME_WORDS };
    setLanguage('es');
    expect((await updatePassword('hunter22')).error).toBe(
      'Esa es tu contraseña actual. Elige una nueva.',
    );
    setLanguage('fr');
    expect((await updatePassword('hunter22')).error).toBe(
      'C’est ton mot de passe actuel. Choisis-en un nouveau.',
    );
  });

  it('reads the error the real auth client builds from either shape of the server answer', async () => {
    const answers = [
      () => serverRefusal(422, 'same_password', SAME_WORDS),
      // Before API version 2024-01-01 the code came as error_code, beside a numeric code.
      () =>
        new Response(JSON.stringify({ code: 422, error_code: 'same_password', msg: SAME_WORDS }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }),
    ];
    for (const answer of answers) {
      const real = realClient(async () => answer());
      mockUpdateUser.mockImplementationOnce((attributes) =>
        real.client.auth.updateUser(attributes),
      );
      expect((await updatePassword('hunter22')).error).toBe(SAME);
      expect(real.requests).toEqual(['PUT https://skip-test.supabase.co/auth/v1/user']);
    }

    const real = realClient(async () =>
      serverRefusal(422, 'weak_password', 'Password should be at least 6 characters.'),
    );
    mockUpdateUser.mockImplementationOnce((attributes) => real.client.auth.updateUser(attributes));
    expect((await updatePassword('abc12')).error).toBe(SHORT);
  });
});
