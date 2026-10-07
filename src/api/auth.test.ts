/**
 * Signing out must delete this phone's push row *before* the session is cleared (device_tokens is
 * guarded by `auth.uid() = user_id`, so a later delete matches nothing), and a failed tidy-up must
 * never block signing out.
 */

// babel-plugin-jest-hoist lifts the jest.mock() calls below above this import.
import { deleteAccount, signInWithEmail, signOut, verifyOtp } from './auth';
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
let mockAuthError: { message: string } | null = null;

const mockForgetDevice = jest.fn(async (_userId: string) => {
  order.push('forget');
});

const mockAuthSignOut = jest.fn(async () => {
  order.push('signOut');
  return { error: mockSignOutError };
});

const mockGetSession = jest.fn(async () => {
  if (mockSessionError) throw mockSessionError;
  return { data: { session: mockSession } };
});

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

let mockRpcError: { message: string } | null = null;
let mockLiveUser: { id: string } | null = null;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signOut: () => mockAuthSignOut(),
      signInWithPassword: async () => ({ error: mockAuthError }),
      verifyOtp: async () => ({ error: mockAuthError }),
      getUser: async () => ({ data: { user: mockLiveUser } }),
    },
    rpc: async () => ({ error: mockRpcError }),
  },
}));

describe('signOut', () => {
  beforeEach(() => {
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
  });

  it("deletes this device's push row before the session is cleared", async () => {
    const result = await signOut();

    expect(mockForgetDevice).toHaveBeenCalledWith('user-A');
    expect(order).toEqual(['forget', 'signOut']);
    expect(result.error).toBeNull();
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
  beforeEach(() => {
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

  it('keeps them while the account is still there', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const id = putVoiceDraft(HEARD);
    mockRpcError = { message: 'boom' };
    expect((await deleteAccount()).error).toBe(FAILURE_MESSAGE);

    mockRpcError = null;
    mockLiveUser = { id: 'user-A' };
    expect((await deleteAccount()).error).toBe(FAILURE_MESSAGE);

    expect(mockForgetVoice).not.toHaveBeenCalled();
    expect(mockForgetStores).not.toHaveBeenCalled();
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
