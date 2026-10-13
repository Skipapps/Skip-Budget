import { render, screen } from '@testing-library/react-native';

import HelloScreen from '@/app/hello';
import { resetLocaleForTests } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { resetTo } from '@/lib/nav';

/**
 * Hello after a reload of the profile failed behind an answer already read: it keeps asking for
 * the name the last answer lacked, or moves on for one that had it, rather than taking the page for
 * the failure. With nothing read it is the failure, so a name on record is never written over.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/lib/nav', () => ({ resetTo: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));
jest.mock('@/providers/toast-context', () => ({ useToast: () => jest.fn() }));
jest.mock('@/components/ui/profile-avatar', () => ({ ProfileAvatar: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
// The real SDK starts a cleanup interval on import that keeps Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

let mockProfile: { data?: unknown; isLoading: boolean; isError: boolean };
jest.mock('@/api/queries', () => ({
  useProfile: () => ({ ...mockProfile, refetch: jest.fn() }),
}));
jest.mock('@/api/mutations', () => ({ useUpdateProfile: () => ({ mutate: jest.fn() }) }));

const ASK = 'What should we call you?';

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
});

describe('Hello after a failed reload of the profile', () => {
  it('keeps asking for the name the last answer lacked, not the failure', async () => {
    mockProfile = { data: { display_name: '', avatar_id: null }, isLoading: false, isError: true };
    await render(<HelloScreen />);

    expect(screen.getByText(ASK)).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });

  it('moves on for a profile whose last answer had a name', async () => {
    mockProfile = {
      data: { display_name: 'Sam', avatar_id: null },
      isLoading: false,
      isError: true,
    };
    await render(<HelloScreen />);

    expect(resetTo).toHaveBeenCalledWith('/setup');
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });
});

describe('Hello when the profile was never read', () => {
  it('is the failure, never a blank question', async () => {
    mockProfile = { isLoading: false, isError: true };
    await render(<HelloScreen />);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(ASK)).toBeNull();
    expect(resetTo).not.toHaveBeenCalled();
  });
});
