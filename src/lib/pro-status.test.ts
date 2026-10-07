import { act, renderHook } from '@testing-library/react-native';

import {
  proStatus,
  publishProStatus,
  resetProStatusForTests,
  useProStatus,
} from '@/lib/pro-status';

beforeEach(() => resetProStatusForTests());

describe('the shared Pro answer', () => {
  it('starts unknown, never as Pro', () => {
    expect(proStatus()).toEqual({ pro: false, ready: false });
  });

  it('keeps the same object for the same answer, so readers do not re-render', () => {
    publishProStatus({ pro: true, ready: true });
    const first = proStatus();
    publishProStatus({ pro: true, ready: true });
    expect(proStatus()).toBe(first);
  });

  it('tells every reader about a change', async () => {
    const one = await renderHook(() => useProStatus());
    const two = await renderHook(() => useProStatus());
    expect(one.result.current.pro).toBe(false);

    await act(async () => publishProStatus({ pro: true, ready: true }));
    expect(one.result.current).toEqual({ pro: true, ready: true });
    expect(two.result.current).toEqual({ pro: true, ready: true });

    await act(async () => publishProStatus({ pro: false, ready: true }));
    expect(one.result.current).toEqual({ pro: false, ready: true });
  });
});
