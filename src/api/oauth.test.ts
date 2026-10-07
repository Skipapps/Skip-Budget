import { signInWithApple } from '@/api/oauth';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** What a refused Sign in with Apple says, in the language on screen. */

let mockAvailable = true;
let mockSignIn: () => Promise<unknown> = async () => ({ identityToken: 'token' });

jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  isAvailableAsync: async () => mockAvailable,
  signInAsync: () => mockSignIn(),
}));
jest.mock('expo-linking', () => ({ createURL: () => 'skipbudget://auth-callback' }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithIdToken: async () => ({ error: null }) } },
}));

beforeEach(() => {
  resetLocaleForTests();
  mockAvailable = true;
  mockSignIn = async () => ({ identityToken: 'token' });
});

afterAll(() => resetLocaleForTests());

describe('signInWithApple', () => {
  it('keeps the English refusals', async () => {
    mockAvailable = false;
    await expect(signInWithApple()).resolves.toEqual({
      error: 'Sign in with Apple is not available on this device.',
    });
  });

  it('refuses in Spanish', async () => {
    setLanguage('es');
    mockAvailable = false;
    await expect(signInWithApple()).resolves.toEqual({
      error: 'Iniciar sesión con Apple no está disponible en este dispositivo.',
    });

    mockAvailable = true;
    mockSignIn = async () => {
      throw Object.assign(new Error('unknown'), { code: 'ERR_REQUEST_UNKNOWN' });
    };
    await expect(signInWithApple()).resolves.toEqual({
      error:
        'Primero inicia sesión con un ID de Apple en este dispositivo y luego inténtalo de nuevo.',
    });
  });

  it('refuses in French, and says the failure line in French', async () => {
    setLanguage('fr');
    mockSignIn = async () => {
      throw Object.assign(new Error('unknown'), { code: 'ERR_REQUEST_UNKNOWN' });
    };
    await expect(signInWithApple()).resolves.toEqual({
      error: 'Connecte-toi d’abord à un identifiant Apple sur cet appareil, puis réessaie.',
    });

    mockSignIn = async () => ({ identityToken: null });
    await expect(signInWithApple()).resolves.toEqual({
      error: 'Une erreur est survenue. Réessaie.',
    });
  });

  it('stays quiet when the sheet is dismissed, in any language', async () => {
    setLanguage('fr');
    mockSignIn = async () => {
      throw Object.assign(new Error('cancelled'), { code: 'ERR_REQUEST_CANCELED' });
    };
    await expect(signInWithApple()).resolves.toEqual({ error: null, cancelled: true });
  });
});
