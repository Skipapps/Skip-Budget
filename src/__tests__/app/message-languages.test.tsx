import { render } from '@testing-library/react-native';

import MessageScreen from '@/app/message';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** "Why Skip is different", the page before sign-up, in each language. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479', body: '#333333' }),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true },
}));

const RAW_KEY = /^[a-z]+\.[a-zA-Z]+\./;

type Screen = Awaited<ReturnType<typeof render>>;
function expectAllWorded(screen: Screen) {
  const lines = [
    ...screen.getAllByText(/./).map((node) => String(node.props.children)),
    ...screen.queryAllByLabelText(/./).map((node) => String(node.props.accessibilityLabel)),
  ];
  for (const line of lines) {
    expect(line).not.toMatch(RAW_KEY);
    expect(line).not.toMatch(/\{\w+\}/);
  }
}

beforeEach(() => {
  resetLocaleForTests();
});

it('keeps the English as it was', async () => {
  const screen = await render(<MessageScreen />);

  expect(screen.getByText('Why Skip is different')).toBeTruthy();
  expect(
    screen.getByText(
      '“People once recorded every penny in a ledger. Skip brings that same financial awareness into modern life — without the paperwork.”',
    ),
  ).toBeTruthy();
  expect(screen.getByText('Know where your money goes. Decide where it goes next.')).toBeTruthy();
  expect(screen.getByText("Let's go")).toBeTruthy();
});

it('reads in Spanish', async () => {
  setLanguage('es');
  const screen = await render(<MessageScreen />);

  for (const line of [
    'Por qué Skip es diferente',
    'Hecho para quienes quieren entender de verdad su dinero, no automatizarlo y olvidarse de él.',
    'Conciencia',
    'Privacidad',
    'Control',
    'Tú decides qué cuenta, no un algoritmo.',
    'Sabe a dónde va tu dinero. Decide a dónde irá después.',
    '¡Vamos!',
  ]) {
    expect(screen.getByText(line)).toBeTruthy();
  }
  expectAllWorded(screen);
});

it('reads in French, with its own quotation marks', async () => {
  setLanguage('fr');
  const screen = await render(<MessageScreen />);

  for (const line of [
    'Pourquoi Skip est différent',
    'Conscience',
    'Confidentialité',
    'Contrôle',
    'Pas de connexion bancaire, pas d’importation. Tes données restent à toi.',
    'Sache où va ton argent. Décide où il ira ensuite.',
    'C’est parti !',
  ]) {
    expect(screen.getByText(line)).toBeTruthy();
  }
  // The matcher's normalizer turns the no-break spaces inside « » into plain ones.
  expect(screen.getByText(/^«\sAutrefois.*paperasse\.\s»$/)).toBeTruthy();
  expectAllWorded(screen);
});
