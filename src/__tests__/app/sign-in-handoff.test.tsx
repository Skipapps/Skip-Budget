import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import AuthScreen from '@/app/auth';
import LoginScreen from '@/app/login';
import SignupScreen from '@/app/signup';
import { resetTo } from '@/lib/nav';

/**
 * Signing in is a one-way door: every way in uses resetTo, not router.replace (which swaps only the
 * top screen), so the iOS edge swipe cannot walk a signed-in person back into the welcome pitch.
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

jest.mock('@/components/icons/apple-icon', () => ({ AppleIcon: () => null }));
jest.mock('@/components/icons/google-icon', () => ({ GoogleIcon: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
}));

const mockApple = jest.fn(async () => ({ error: null as string | null, cancelled: false }));
jest.mock('@/api/oauth', () => ({
  signInWithGoogle: async () => ({ error: null }),
  signInWithApple: () => mockApple(),
}));

jest.mock('@/api/auth', () => ({
  signUpWithEmail: async () => ({ error: null, signedIn: true }),
  signInWithEmail: async () => ({ error: null }),
  resendOtp: async () => ({ error: null }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

it('lands a Google sign-in on the name page with nothing behind it', async () => {
  const screen = await render(<AuthScreen />);

  await fireEvent.press(screen.getByText('Continue with Google'));

  expect(resetTo).toHaveBeenCalledWith('/hello');
  expect(router.replace).not.toHaveBeenCalled();
});

it('lands an email sign-up on the name page with nothing behind it', async () => {
  const screen = await render(<SignupScreen />);
  const [email, password, confirm] = screen.getAllByDisplayValue('');

  await fireEvent.changeText(email, 'sam@example.com');
  await fireEvent.changeText(password, 'secret12');
  await fireEvent.changeText(confirm, 'secret12');
  await fireEvent.press(screen.getByText('Create account'));

  expect(resetTo).toHaveBeenCalledWith('/hello');
  expect(router.replace).not.toHaveBeenCalled();
});

it('offers Google and Apple on the log-in page too, landing them the same way', async () => {
  const screen = await render(<LoginScreen />);

  expect(screen.getByText('or')).toBeTruthy();
  await fireEvent.press(screen.getByText('Continue with Google'));
  expect(resetTo).toHaveBeenCalledWith('/hello');

  await fireEvent.press(screen.getByText('Continue with Apple'));
  expect(resetTo).toHaveBeenCalledTimes(2);
  expect(router.replace).not.toHaveBeenCalled();
});

it('stays on the log-in page when the Apple sheet is dismissed, and says why when it fails', async () => {
  const screen = await render(<LoginScreen />);

  mockApple.mockResolvedValueOnce({ error: null, cancelled: true });
  await fireEvent.press(screen.getByText('Continue with Apple'));
  expect(resetTo).not.toHaveBeenCalled();

  mockApple.mockResolvedValueOnce({
    error: 'No Apple ID is signed in on this phone.',
    cancelled: false,
  });
  await fireEvent.press(screen.getByText('Continue with Apple'));
  expect(resetTo).not.toHaveBeenCalled();
  expect(screen.getByText('No Apple ID is signed in on this phone.')).toBeTruthy();
});
