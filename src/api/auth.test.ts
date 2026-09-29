/**
 * Signing out has to end the session *and* take this phone off the push list.
 *
 * The order is the whole test. device_tokens is guarded by
 * `auth.uid() = user_id`, so a delete attempted after the session is cleared
 * matches nothing and the row survives forever — the scheduler then keeps
 * pushing this account's reminders at a phone nobody is signed in on. The
 * other half is that tidying up is allowed to fail: a simulator, a dead
 * network or a refused delete must not leave somebody signed in to an account
 * they asked to leave.
 */

// babel-plugin-jest-hoist lifts the jest.mock() calls below above this import,
// so auth.ts loads against them.
import { signInWithEmail, signOut, verifyOtp } from './auth';
import { FAILURE_MESSAGE } from '@/lib/failure';

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

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signOut: () => mockAuthSignOut(),
      signInWithPassword: async () => ({ error: mockAuthError }),
      verifyOtp: async () => ({ error: mockAuthError }),
    },
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
});

/**
 * A refused sign-in says what to do about it; only what nobody can act on
 * falls back to the one failure line (the Founder's call, 2026-09-28).
 */
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
