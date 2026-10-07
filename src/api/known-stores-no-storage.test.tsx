import { act, renderHook } from '@testing-library/react-native';

import {
  forgetKnownStores,
  readKnownStores,
  useKnownStores,
  useRememberStore,
} from '@/api/known-stores';

/**
 * A build without the native storage module (or a test) is simply a build that remembers nothing:
 * the module is loaded on use, and its absence is never an error for the form around it.
 */

jest.mock('@react-native-async-storage/async-storage', () => {
  throw new Error('[@RNC/AsyncStorage]: NativeModule: AsyncStorage is null.');
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

const answer = {
  name: 'Vercel',
  categoryId: 'software',
  logoDomain: 'vercel.com',
  logoHidden: false,
};

describe('without the storage module', () => {
  it('reads nothing', async () => {
    await expect(readKnownStores('user-1')).resolves.toEqual([]);
  });

  it('shows nothing remembered', async () => {
    const { result } = await renderHook(() => useKnownStores());
    await act(async () => {});
    expect(result.current).toEqual([]);
  });

  it('remembers nothing, without a rejection', async () => {
    const { result } = await renderHook(() => useRememberStore());
    await expect(result.current(answer)).resolves.toBeUndefined();
  });

  it('forgets nothing, without a throw or a console warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(forgetKnownStores('user-1')).resolves.toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
