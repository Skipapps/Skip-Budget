import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import MessageScreen from '@/app/message';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** "Why Skip", the page before sign-up, in each language. */

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

it('reads as designed in English', async () => {
  const screen = await render(<MessageScreen />);

  for (const line of [
    'Why Skip',
    'Understand your money. Don’t just automate it.',
    'Awareness',
    'Every dollar, accounted for.',
    'No bank logins. Ever.',
    'You decide, not an algorithm.',
    'People once tracked every penny in a ledger. Skip brings that habit into modern life, without the paperwork.',
    'Know where your money goes. Decide where it goes next.',
    "Let's go",
  ]) {
    expect(screen.getByText(line)).toBeTruthy();
  }
  expectAllWorded(screen);
});

it('reads in Spanish', async () => {
  setLanguage('es');
  const screen = await render(<MessageScreen />);

  for (const line of [
    'Por qué Skip',
    'Entiende tu dinero. No solo lo automatices.',
    'Conciencia',
    'Privacidad',
    'Control',
    'Decides tú, no un algoritmo.',
    'Sabe a dónde va tu dinero. Decide a dónde irá después.',
    '¡Vamos!',
  ]) {
    expect(screen.getByText(line)).toBeTruthy();
  }
  expectAllWorded(screen);
});

it('reads in French', async () => {
  setLanguage('fr');
  const screen = await render(<MessageScreen />);

  for (const line of [
    'Pourquoi Skip',
    'Comprends ton argent. Ne te contente pas de l’automatiser.',
    'Conscience',
    'Confidentialité',
    'Contrôle',
    'Aucun identifiant bancaire. Jamais.',
    'Sache où va ton argent. Décide où il ira ensuite.',
    'C’est parti !',
  ]) {
    expect(screen.getByText(line)).toBeTruthy();
  }
  expectAllWorded(screen);
});

it('goes on to what Skip can do, the page after it', async () => {
  const screen = await render(<MessageScreen />);

  await fireEvent.press(screen.getByText("Let's go"));

  expect(router.push).toHaveBeenCalledWith('/what-skip-can-do');
});
