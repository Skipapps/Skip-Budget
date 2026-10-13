import fs from 'node:fs';
import path from 'node:path';

import { fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { AskSamChat } from '@/components/ask-sam/ask-sam-chat';
import { SCREENS } from '@/components/ask-sam/screens';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { ALL_INTENTS } from '@/lib/ask-sam';

/**
 * The Ask Sam page: the welcome questions open their answers, an answer links to its screen by
 * that screen's name, and all of it reads in the app's language.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479', body: '#333333' }),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true },
}));

// Each test indexes a whole language's library, which can take seconds on a busy machine.
jest.setTimeout(30_000);

const RAW_KEY = /^[a-z]+\.[a-zA-Z]+\./;
/** Pages that need a year, a month or one row to work on; opened bare they have nothing to show. */
const NOT_LINKED = ['/payment-year', '/payment-month', '/change-logo'];

const onOpenRoute = jest.fn();
const onSendContact = jest.fn();

function chat() {
  return render(
    <AskSamChat
      prices={{ proMonthly: '$4.99', proYearly: '$39.99' }}
      email="sam@example.com"
      onOpenRoute={onOpenRoute}
      onSendContact={onSendContact}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  // Answers then arrive whole, without the word-by-word writing out, so the test needn't wait.
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
});

it('opens a welcome question’s answer, with a link to its screen', async () => {
  const screen = await chat();
  expect(screen.getByText('Hi, I’m Sam. How can I help?')).toBeTruthy();
  for (const label of [
    'How do I add a bill?',
    'How is my loan interest calculated?',
    'How do I move money to goals?',
    'Can I see past years?',
    'How do I export payments?',
    'See all topics',
  ])
    expect(screen.getByText(label)).toBeTruthy();

  await fireEvent.press(screen.getByText('How do I add a bill?'));
  const link = await screen.findByText('Open Add bill ›', {}, { timeout: 20_000 });
  expect(screen.queryByText('Hi, I’m Sam. How can I help?')).toBeNull();
  expect(screen.getByText('Was this helpful?')).toBeTruthy();
  expect(screen.getByText('Related')).toBeTruthy();

  await fireEvent.press(link);
  expect(onOpenRoute).toHaveBeenCalledWith('/add-bill');
});

it('answers a typed question in Spanish, in Spanish', async () => {
  setLanguage('es');
  const screen = await chat();
  expect(screen.getByText('¿Cómo agrego una factura?')).toBeTruthy();

  await fireEvent.changeText(
    screen.getByLabelText('Pregunta lo que quieras sobre Skip'),
    'como agrego una factura',
  );
  await fireEvent.press(screen.getByLabelText('Enviar'));
  expect(await screen.findByText('Abrir Agregar factura ›', {}, { timeout: 20_000 })).toBeTruthy();
  expect(screen.getByText('¿Te sirvió?')).toBeTruthy();

  const lines = screen.getAllByText(/./).map((node) => String(node.props.children));
  for (const line of lines) {
    expect(line).not.toMatch(RAW_KEY);
    expect(line).not.toMatch(/\{\w+\}/);
  }
});

it('names every screen an answer can open, and each is a real page', () => {
  const routes = new Set(ALL_INTENTS.flatMap((intent) => (intent.route ? [intent.route] : [])));
  for (const route of routes) {
    if (!NOT_LINKED.includes(route)) expect(SCREENS[route]).toBeDefined();
  }
  const app = path.join(__dirname, '..', '..', 'app');
  for (const route of Object.keys(SCREENS)) {
    const page = route.slice(1);
    const exists = [
      `${page}.tsx`,
      `${page}/index.tsx`,
      `(tabs)/${page}.tsx`,
      `(tabs)/${page}/index.tsx`,
    ].some((file) => fs.existsSync(path.join(app, file)));
    expect({ route, exists }).toEqual({ route, exists: true });
  }
});
