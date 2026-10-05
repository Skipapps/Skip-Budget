import { router } from 'expo-router';

import { resetTo } from '@/lib/nav';

jest.mock('expo-router', () => ({
  router: {
    canDismiss: jest.fn(),
    canGoBack: jest.fn(() => true),
    dismissAll: jest.fn(),
    replace: jest.fn(),
  },
}));

const mocked = router as jest.Mocked<typeof router>;

beforeEach(() => jest.clearAllMocks());

describe('resetTo', () => {
  it('pops the stack first when there are screens to pop', () => {
    mocked.canDismiss.mockReturnValue(true);

    resetTo('/welcome');

    expect(mocked.dismissAll).toHaveBeenCalledTimes(1);
    expect(mocked.replace).toHaveBeenCalledWith('/welcome');
  });

  it('does not pop from a tab with nothing stacked above it', () => {
    // Signing out from Settings: the tab bar can go back to Home, so
    // canGoBack says yes, but no stack has a screen to pop.
    mocked.canDismiss.mockReturnValue(false);

    resetTo('/welcome');

    expect(mocked.dismissAll).not.toHaveBeenCalled();
    expect(mocked.replace).toHaveBeenCalledWith('/welcome');
  });
});
