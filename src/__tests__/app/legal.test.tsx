import { render } from '@testing-library/react-native';

import PrivacyScreen from '@/app/privacy';
import TermsScreen from '@/app/terms';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The privacy policy and the terms in all three languages: the same sections in the same order,
 * every address and date intact, and a notice that the translation yields to the English.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333', line: '#DDDDDD' }),
}));

const RAW_KEY = /^[a-z]+\.[a-zA-Z]+\./;
const LEFTOVER_PARAM = /\{\w+\}/;
const NUMBERED_HEADING = /^\d+\. /;

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

/** The numbered headings, in the order they are drawn. */
function headingsOf(screen: Awaited<ReturnType<typeof render>>): string[] {
  return screen.getAllByText(NUMBERED_HEADING).map((node) => [node.props.children].flat().join(''));
}

describe('Privacy policy', () => {
  it('reads as written in English, with no translation notice', async () => {
    const screen = await render(<PrivacyScreen />);

    expect(screen.getByText('Privacy policy')).toBeTruthy();
    expect(screen.getByText('Last updated 28 August 2026')).toBeTruthy();
    expect(screen.queryByText(/courtesy translation/)).toBeNull();
    expect(headingsOf(screen)).toEqual([
      '1. Who we are',
      '2. What Skip stores about you',
      '3. What never leaves your phone',
      '4. Adding things by voice',
      '5. Who else sees it',
      '6. How long it is kept',
      '7. Deleting your account',
      '8. Your rights over your data',
      '9. Children',
      '10. Changes to this policy',
    ]);
  });

  it('is in Mexican Spanish, section for section, with the notice on top', async () => {
    setLanguage('es');
    const screen = await render(<PrivacyScreen />);

    expect(screen.getByText('Política de privacidad')).toBeTruthy();
    expect(screen.getByText('Última actualización: 28 de agosto de 2026')).toBeTruthy();
    expect(
      screen.getByText(
        'Esta es una traducción de cortesía. Si hay alguna diferencia, prevalece la versión en inglés.',
      ),
    ).toBeTruthy();
    expect(headingsOf(screen)).toEqual([
      '1. Quiénes somos',
      '2. Qué guarda Skip sobre ti',
      '3. Lo que nunca sale de tu teléfono',
      '4. Agregar cosas por voz',
      '5. Quién más tiene acceso',
      '6. Cuánto tiempo se conserva',
      '7. Eliminar tu cuenta',
      '8. Tus derechos sobre tus datos',
      '9. Menores de edad',
      '10. Cambios a esta política',
    ]);
    expect(screen.getByText(/Puedes escribirnos a admin@skipapps\.net/)).toBeTruthy();
    expect(screen.getByText(/se conserva durante siete años/)).toBeTruthy();
    expect(screen.queryAllByText(RAW_KEY)).toEqual([]);
    expect(screen.queryAllByText(LEFTOVER_PARAM)).toEqual([]);
  });

  it('is in Canadian French, section for section, with the notice on top', async () => {
    setLanguage('fr');
    const screen = await render(<PrivacyScreen />);

    expect(screen.getByText('Politique de confidentialité')).toBeTruthy();
    expect(screen.getByText('Dernière mise à jour : 28 août 2026')).toBeTruthy();
    expect(
      screen.getByText(
        'Ceci est une traduction de courtoisie. En cas de divergence, la version anglaise prévaut.',
      ),
    ).toBeTruthy();
    expect(headingsOf(screen)).toEqual([
      '1. Qui nous sommes',
      '2. Ce que Skip conserve à ton sujet',
      '3. Ce qui ne quitte jamais ton téléphone',
      '4. Ajouter des éléments par la voix',
      '5. Qui d’autre y a accès',
      '6. Combien de temps les données sont conservées',
      '7. Supprimer ton compte',
      '8. Tes droits sur tes données',
      '9. Enfants',
      '10. Modifications de cette politique',
    ]);
    expect(screen.getByText(/Tu peux nous joindre à admin@skipapps\.net/)).toBeTruthy();
    expect(screen.getByText(/conservé pendant sept ans/)).toBeTruthy();
    expect(screen.queryAllByText(RAW_KEY)).toEqual([]);
    expect(screen.queryAllByText(LEFTOVER_PARAM)).toEqual([]);
  });
});

describe('Terms of service', () => {
  it('reads as written in English, with no translation notice', async () => {
    const screen = await render(<TermsScreen />);

    expect(screen.getByText('Terms of service')).toBeTruthy();
    expect(screen.getByText('Last updated 28 August 2026')).toBeTruthy();
    expect(screen.queryByText(/courtesy translation/)).toBeNull();
    expect(headingsOf(screen)).toEqual([
      '1. Agreeing to these terms',
      '2. What Skip is, and what it is not',
      '3. Your account',
      '4. Using Skip properly',
      '5. What you put in stays yours',
      '6. The app will change',
      '7. Money',
      '8. No warranty',
      '9. Limits on liability',
      '10. Ending it',
      '11. Changes to these terms',
      '12. Law and contact',
    ]);
  });

  it('is in Mexican Spanish, section for section, with the notice on top', async () => {
    setLanguage('es');
    const screen = await render(<TermsScreen />);

    expect(screen.getByText('Términos del servicio')).toBeTruthy();
    expect(screen.getByText('Última actualización: 28 de agosto de 2026')).toBeTruthy();
    expect(screen.getByText(/^Esta es una traducción de cortesía\./)).toBeTruthy();
    expect(headingsOf(screen)).toEqual([
      '1. Aceptación de estos términos',
      '2. Qué es Skip y qué no es',
      '3. Tu cuenta',
      '4. Uso adecuado de Skip',
      '5. Lo que ingresas sigue siendo tuyo',
      '6. La aplicación cambiará',
      '7. Dinero',
      '8. Sin garantía',
      '9. Límites de responsabilidad',
      '10. Terminación',
      '11. Cambios a estos términos',
      '12. Ley aplicable y contacto',
    ]);
    expect(
      screen.getByText(/En la medida en que la ley lo permita, no somos responsables/),
    ).toBeTruthy();
    expect(screen.queryAllByText(RAW_KEY)).toEqual([]);
    expect(screen.queryAllByText(LEFTOVER_PARAM)).toEqual([]);
  });

  it('is in Canadian French, section for section, with the notice on top', async () => {
    setLanguage('fr');
    const screen = await render(<TermsScreen />);

    expect(screen.getByText('Conditions d’utilisation')).toBeTruthy();
    expect(screen.getByText('Dernière mise à jour : 28 août 2026')).toBeTruthy();
    expect(screen.getByText(/^Ceci est une traduction de courtoisie\./)).toBeTruthy();
    expect(headingsOf(screen)).toEqual([
      '1. Acceptation de ces conditions',
      '2. Ce qu’est Skip, et ce qu’elle n’est pas',
      '3. Ton compte',
      '4. Utilisation correcte de Skip',
      '5. Ce que tu saisis reste à toi',
      '6. L’application évoluera',
      '7. Argent',
      '8. Aucune garantie',
      '9. Limites de responsabilité',
      '10. Résiliation',
      '11. Modifications de ces conditions',
      '12. Droit applicable et contact',
    ]);
    expect(
      screen.getByText(/Dans la mesure permise par la loi, nous ne sommes pas responsables/),
    ).toBeTruthy();
    expect(screen.queryAllByText(RAW_KEY)).toEqual([]);
    expect(screen.queryAllByText(LEFTOVER_PARAM)).toEqual([]);
  });
});
