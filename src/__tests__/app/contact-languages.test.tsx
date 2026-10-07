import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ContactScreen from '@/app/contact';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The contact form in each language: the topic's own words, the field labels, the "write something
 * first" hint, and the thank-you that names the address the reply goes to.
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

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/providers/session-provider', () => ({ useUserEmail: () => 'sam@example.com' }));
jest.mock('@/api/queries', () => ({ useProfile: () => ({ data: { display_name: 'Sam' } }) }));

const mockSend = jest.fn();
jest.mock('@/api/contact', () => ({
  useSendMessage: () => ({ mutateAsync: mockSend, isPending: false }),
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
  jest.clearAllMocks();
  resetLocaleForTests();
  mockParams = { topic: 'support' };
  mockSend.mockResolvedValue(undefined);
});

it('keeps the English as it was', async () => {
  const screen = await render(<ContactScreen />);

  expect(screen.getByText('Email support')).toBeTruthy();
  expect(screen.getByText('Tell us what went wrong and we will look into it.')).toBeTruthy();
  expect(screen.getByText('Your name')).toBeTruthy();
  expect(screen.getByPlaceholderText('What should we call you?')).toBeTruthy();
  expect(screen.getByText('We reply to the address you signed in with.')).toBeTruthy();

  await fireEvent.changeText(
    screen.getByPlaceholderText('What happened, and what were you doing when it did?'),
    'It froze',
  );
  await fireEvent.press(screen.getByText('Send'));

  await waitFor(() => expect(screen.getByText('Sent')).toBeTruthy());
  expect(
    screen.getByText(
      'Thanks — we read every one. If it needs an answer it will come to sam@example.com.',
    ),
  ).toBeTruthy();
});

it('asks for support in Spanish, and thanks the person in Spanish', async () => {
  setLanguage('es');
  const screen = await render(<ContactScreen />);

  expect(screen.getByText('Escribir a soporte')).toBeTruthy();
  expect(screen.getByText('Cuéntanos qué salió mal y lo revisaremos.')).toBeTruthy();
  expect(screen.getByText('Tu nombre')).toBeTruthy();
  expect(screen.getByPlaceholderText('¿Cómo te llamamos?')).toBeTruthy();
  expect(screen.getByText('Tu correo')).toBeTruthy();
  expect(screen.getByText('Respondemos al correo con el que iniciaste sesión.')).toBeTruthy();
  expect(screen.getByText('Mensaje')).toBeTruthy();
  expectAllWorded(screen);

  await fireEvent.press(screen.getByText('Enviar'));
  expect(screen.getByText('Primero escribe un mensaje.')).toBeTruthy();
  expect(mockSend).not.toHaveBeenCalled();

  await fireEvent.changeText(
    screen.getByPlaceholderText('¿Qué pasó y qué estabas haciendo cuando ocurrió?'),
    'Se congeló',
  );
  await fireEvent.press(screen.getByText('Enviar'));

  await waitFor(() => expect(screen.getByText('Enviado')).toBeTruthy());
  expect(
    screen.getByText(
      'Gracias, leemos todos los mensajes. Si necesita respuesta, llegará a sam@example.com.',
    ),
  ).toBeTruthy();
  expect(screen.getByText('Listo')).toBeTruthy();
  // The topic sent is the stored value, never the words on screen.
  expect(mockSend).toHaveBeenCalledWith({ topic: 'support', name: 'Sam', message: 'Se congeló' });
});

it('shares an idea in French', async () => {
  setLanguage('fr');
  mockParams = { topic: 'idea' };
  const screen = await render(<ContactScreen />);

  expect(screen.getByText('Partage une idée')).toBeTruthy();
  expect(screen.getByText('Que devrait faire Skip ensuite ?')).toBeTruthy();
  expect(screen.getByText('Ton nom')).toBeTruthy();
  expect(screen.getByText('Ton courriel')).toBeTruthy();
  expect(screen.getByText('Nous répondons à l’adresse utilisée pour te connecter.')).toBeTruthy();
  expect(screen.getByText('Envoyer')).toBeTruthy();
  expectAllWorded(screen);

  await fireEvent.changeText(
    screen.getByPlaceholderText('Décris ce que tu aimerais que Skip puisse faire.'),
    'Un mode sombre',
  );
  await fireEvent.press(screen.getByText('Envoyer'));

  await waitFor(() => expect(screen.getByText('Envoyé')).toBeTruthy());
  expect(
    screen.getByText(
      'Merci — nous les lisons tous. Si une réponse est nécessaire, elle arrivera à sam@example.com.',
    ),
  ).toBeTruthy();
  expect(mockSend).toHaveBeenCalledWith({ topic: 'idea', name: 'Sam', message: 'Un mode sombre' });
});
