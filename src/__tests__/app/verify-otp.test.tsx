import { act, fireEvent, render } from '@testing-library/react-native';

import VerifyOtpScreen from '@/app/verify-otp';

/**
 * Skip's mail comes from a new sender, so codes can land in spam: the page says so once the code
 * has had time to arrive, and again whenever a new one is sent.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ email: 'sam@example.com', purpose: 'signup' }),
}));

jest.mock('@/lib/nav', () => ({ resetTo: jest.fn() }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
}));

jest.mock('@/api/auth', () => ({
  verifyOtp: async () => ({ error: null }),
  resendOtp: async () => ({ error: null }),
}));

jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });

const SPAM_HINT =
  'No code yet? Please check your spam folder. Emails from new apps sometimes land there.';
const RESENT = 'New code sent. If you don’t see it soon, please check your spam folder.';

describe('Enter the code', () => {
  it('points to the spam folder only after 15 seconds of waiting', async () => {
    const screen = await render(<VerifyOtpScreen />);

    await act(() => jest.advanceTimersByTime(14_999));
    expect(screen.queryByText(SPAM_HINT)).toBeNull();

    await act(() => jest.advanceTimersByTime(1));
    expect(screen.getByText(SPAM_HINT)).toBeTruthy();
  });

  it('points to the spam folder when a new code is sent, in place of the waiting hint', async () => {
    const screen = await render(<VerifyOtpScreen />);
    await act(() => jest.advanceTimersByTime(15_000));

    await fireEvent.press(screen.getByText('Resend code'));

    expect(screen.getByText(RESENT)).toBeTruthy();
    expect(screen.queryByText(SPAM_HINT)).toBeNull();
  });
});
