import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { authenticate, lockCapability, unavailableMessage } from '@/lib/app-lock';

/** What the app lock says, and what it hands the system prompt, in the language on screen. */

const mockAuthenticateAsync = jest.fn(async (_options: Record<string, unknown>) => ({
  success: true,
}));
let mockTypes: number[] = [];

jest.mock('expo-local-authentication', () => ({
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2 },
  hasHardwareAsync: async () => true,
  isEnrolledAsync: async () => true,
  supportedAuthenticationTypesAsync: async () => mockTypes,
  authenticateAsync: (options: Record<string, unknown>) => mockAuthenticateAsync(options),
}));

beforeEach(() => {
  resetLocaleForTests();
  mockAuthenticateAsync.mockClear();
  mockTypes = [];
});

afterAll(() => resetLocaleForTests());

describe('why the lock cannot be turned on', () => {
  it('keeps the English lines', () => {
    expect(unavailableMessage('no-hardware')).toBe('This phone has no Face ID or Touch ID.');
    expect(unavailableMessage('unsupported')).toBe(
      'App lock is not available in this build of Skip.',
    );
  });

  it('says it in Spanish and French', () => {
    setLanguage('es');
    expect(unavailableMessage('no-hardware')).toBe('Este teléfono no tiene Face ID ni Touch ID.');
    expect(unavailableMessage('not-enrolled')).toBe(
      'Primero configura Face ID o Touch ID en los ajustes de tu teléfono y luego vuelve.',
    );

    setLanguage('fr');
    expect(unavailableMessage('unsupported')).toBe(
      'Le verrouillage de l’app n’est pas disponible dans cette version de Skip.',
    );
  });
});

describe('the unlock prompt', () => {
  it('names the passcode in the language on screen, and never Face ID or Touch ID', async () => {
    await expect(lockCapability()).resolves.toEqual({ available: true, label: 'your passcode' });

    setLanguage('es');
    await expect(lockCapability()).resolves.toEqual({ available: true, label: 'tu código' });

    setLanguage('fr');
    mockTypes = [2];
    await expect(lockCapability()).resolves.toEqual({ available: true, label: 'Face ID' });
  });

  it('asks and offers Cancel in the language on screen', async () => {
    await authenticate();
    expect(mockAuthenticateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ promptMessage: 'Unlock Skip', cancelLabel: 'Cancel' }),
    );

    setLanguage('es');
    await authenticate();
    expect(mockAuthenticateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ promptMessage: 'Desbloquear Skip', cancelLabel: 'Cancelar' }),
    );

    setLanguage('fr');
    await authenticate();
    expect(mockAuthenticateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ promptMessage: 'Déverrouiller Skip', cancelLabel: 'Annuler' }),
    );
  });
});
