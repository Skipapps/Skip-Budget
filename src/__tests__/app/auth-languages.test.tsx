import { fireEvent, render } from '@testing-library/react-native';

import AuthScreen from '@/app/auth';
import ForgotPasswordScreen from '@/app/forgot-password';
import LoginScreen from '@/app/login';
import ResetPasswordScreen from '@/app/reset-password';
import SignUpScreen from '@/app/signup';
import VerifyOtpScreen from '@/app/verify-otp';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** The sign-in, sign-up, code and password pages, read in Spanish and in French. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ email: 'sam@example.com', purpose: 'signup' }),
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

jest.mock('@/api/oauth', () => ({
  signInWithGoogle: async () => ({ error: null }),
  signInWithApple: async () => ({ error: null }),
}));

jest.mock('@/api/auth', () => ({
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null, signedIn: true }),
  sendPasswordReset: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null }),
  resendOtp: async () => ({ error: null }),
}));

type Screen = Awaited<ReturnType<typeof render>>;
type Json = ReturnType<Screen['toJSON']>;

/** Every string drawn or read out, so a raw key or an unfilled {param} cannot hide anywhere. */
function wordsOn(screen: Screen): string[] {
  const found: string[] = [];
  const walk = (node: Json | string | Json[]) => {
    if (node === null) return;
    if (typeof node === 'string') return void found.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    for (const prop of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      const value = node.props[prop];
      if (typeof value === 'string') found.push(value);
    }
    node.children?.forEach(walk);
  };
  walk(screen.toJSON());
  return found;
}

function expectNoRawText(screen: Screen) {
  const words = wordsOn(screen);
  expect(words.length).toBeGreaterThan(0);
  expect(words.filter((word) => /^[a-z]+\.[a-zA-Z]+\./.test(word))).toEqual([]);
  expect(words.filter((word) => /\{\w+\}/.test(word))).toEqual([]);
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
});
afterAll(() => resetLocaleForTests());

describe('the sign-in pages in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('offers Apple, Google and email', async () => {
    const screen = await render(<AuthScreen />);
    expect(screen.getByText('Configura tu inicio de sesión')).toBeTruthy();
    expect(screen.getByText('Continuar con Google')).toBeTruthy();
    expect(screen.getByText('Continuar con Apple')).toBeTruthy();
    expect(screen.getByText('Continuar con correo')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('logs in, with the agreement as one sentence around its two links', async () => {
    const screen = await render(<LoginScreen />);
    expect(screen.getByText('Qué gusto verte de nuevo. Sigue donde te quedaste.')).toBeTruthy();
    expect(screen.getByText('Correo')).toBeTruthy();
    expect(screen.getByText('Contraseña')).toBeTruthy();
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeTruthy();
    expect(screen.getByText('Al continuar, aceptas los')).toBeTruthy();
    expect(screen.getByText('Términos del servicio')).toBeTruthy();
    expect(screen.getByText('y el')).toBeTruthy();
    expect(screen.getByText('Aviso de privacidad')).toBeTruthy();

    // The title and the button say the same thing; the button is the last one.
    const buttons = screen.getAllByText('Iniciar sesión');
    await fireEvent.press(buttons[buttons.length - 1]);
    expect(screen.getByText('Ingresa tu correo y tu contraseña.')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('creates an account, refusing a short password and a mismatch in Spanish', async () => {
    const screen = await render(<SignUpScreen />);
    expect(screen.getByText('Crea tu cuenta')).toBeTruthy();
    expect(screen.getByText('Confirma la contraseña')).toBeTruthy();
    expect(screen.getByText('Ya tengo una cuenta')).toBeTruthy();

    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(screen.getByText('Ingresa un correo y una contraseña.')).toBeTruthy();

    const [email, password, confirm] = screen.getAllByDisplayValue('');
    await fireEvent.changeText(email, 'sam@example.com');
    await fireEvent.changeText(password, '123');
    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(screen.getByText('La contraseña debe tener al menos 6 caracteres.')).toBeTruthy();

    await fireEvent.changeText(password, 'secret12');
    await fireEvent.changeText(confirm, 'secret13');
    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('sends a code for a forgotten password', async () => {
    const screen = await render(<ForgotPasswordScreen />);
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeTruthy();
    expect(
      screen.getByText('Ingresa tu correo y te enviaremos un código de verificación de 6 dígitos.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('Continuar'));
    expect(screen.getByText('Ingresa el correo de tu cuenta.')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('sets a new password', async () => {
    const screen = await render(<ResetPasswordScreen />);
    expect(screen.getByText('Crea una contraseña nueva')).toBeTruthy();
    expect(screen.getByText('Contraseña nueva')).toBeTruthy();
    expect(screen.getByText('Confirma la contraseña nueva')).toBeTruthy();
    await fireEvent.press(screen.getByText('Continuar'));
    expect(screen.getByText('La contraseña debe tener al menos 6 caracteres.')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('asks for the code, with the address in bold inside the sentence', async () => {
    const screen = await render(<VerifyOtpScreen />);
    expect(screen.getByText('Ingresa el código')).toBeTruthy();
    expect(screen.getByText('Enviamos un código de 6 dígitos a sam@example.com.')).toBeTruthy();
    expect(screen.getByText('sam@example.com')).toBeTruthy();

    await fireEvent.press(screen.getByText('Continuar'));
    expect(screen.getByText('Ingresa los 6 dígitos.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Reenviar código'));
    expect(screen.getByText('Ya va en camino un código nuevo.')).toBeTruthy();
    expectNoRawText(screen);
  });
});

describe('the sign-in pages in French', () => {
  beforeEach(() => setLanguage('fr'));

  it('offers Apple, Google and email', async () => {
    const screen = await render(<AuthScreen />);
    expect(screen.getByText('Configure ta connexion')).toBeTruthy();
    expect(screen.getByText('Continuer avec Google')).toBeTruthy();
    expect(screen.getByText('Continuer avec ton courriel')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('logs in, with the agreement as one sentence around its two links', async () => {
    const screen = await render(<LoginScreen />);
    expect(screen.getByText('Courriel')).toBeTruthy();
    expect(screen.getByText('Mot de passe')).toBeTruthy();
    // A no-break space before the question mark, as French sets it.
    expect(screen.getByText('Mot de passe oublié\u00a0?')).toBeTruthy();
    expect(screen.getByText('En continuant, tu acceptes les')).toBeTruthy();
    expect(screen.getByText('Conditions d’utilisation')).toBeTruthy();
    expect(screen.getByText('et la')).toBeTruthy();
    expect(screen.getByText('Politique de confidentialité')).toBeTruthy();

    const buttons = screen.getAllByText('Se connecter');
    await fireEvent.press(buttons[buttons.length - 1]);
    expect(screen.getByText('Indique ton courriel et ton mot de passe.')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('creates an account and refuses a mismatch', async () => {
    const screen = await render(<SignUpScreen />);
    expect(screen.getByText('Crée ton compte')).toBeTruthy();
    expect(screen.getByText('J’ai déjà un compte')).toBeTruthy();

    const [email, password, confirm] = screen.getAllByDisplayValue('');
    await fireEvent.changeText(email, 'sam@example.com');
    await fireEvent.changeText(password, 'secret12');
    await fireEvent.changeText(confirm, 'secret13');
    await fireEvent.press(screen.getByText('Créer un compte'));
    expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('sends a code for a forgotten password', async () => {
    const screen = await render(<ForgotPasswordScreen />);
    await fireEvent.press(screen.getByText('Continuer'));
    expect(screen.getByText('Indique le courriel de ton compte.')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('sets a new password', async () => {
    const screen = await render(<ResetPasswordScreen />);
    expect(screen.getByText('Choisis un nouveau mot de passe')).toBeTruthy();
    expect(screen.getByText('Confirme le nouveau mot de passe')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('asks for the code, with the address in bold inside the sentence', async () => {
    const screen = await render(<VerifyOtpScreen />);
    expect(
      screen.getByText('Nous avons envoyé un code à 6 chiffres à sam@example.com.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('Continuer'));
    expect(screen.getByText('Indique les 6 chiffres.')).toBeTruthy();
    expect(screen.getByText('Renvoyer le code')).toBeTruthy();
    expectNoRawText(screen);
  });
});
