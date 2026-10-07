import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import type { LogoMatch } from '@/api/logos';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { BrandLogo } from '@/components/brands/brand-logo';
import { ChangeLogoButton } from '@/components/brands/change-logo-button';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The store field, the add-store logo check, a logo's spoken name and the Change logo button, in
 * Spanish and French. What a choice writes on the row is the same in every language.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479' }),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-image', () => {
  const { View: Stub } = jest.requireActual('react-native');
  return { Image: (props: object) => <Stub testID="logo" {...props} /> };
});

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/brands', () => ({
  ...jest.requireActual('@/api/brands'),
  useBrandSearch: () => ({ data: [], isFetching: false }),
}));

const PLANET: LogoMatch = {
  matched: true,
  name: 'Planet Fitness',
  domain: 'planetfitness.com',
  confidence: 0.98,
  margin: 0.3,
  candidates: [{ domain: 'planetfitness.com', name: 'Planet Fitness', confidence: 0.98 }],
};
jest.mock('@/api/logos', () => ({
  ...jest.requireActual('@/api/logos'),
  useLogoMatch: (query: string) => ({
    data: query.trim().length < 2 ? undefined : PLANET,
    isLoading: false,
    isFetching: false,
  }),
}));

const onValue = jest.fn();

function Harness() {
  const [value, setValue] = useState<BrandSelection | null>(null);
  return (
    <View>
      <BrandField
        label="Tienda"
        value={value}
        onChange={(next) => {
          setValue(next);
          onValue(next);
        }}
      />
    </View>
  );
}

type Screen = Awaited<ReturnType<typeof render>>;

async function typeStore(screen: Screen, placeholder: string, name: string) {
  const input = screen.getByPlaceholderText(placeholder);
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, name);
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

const RAW_KEY = /^[a-z]+\.[a-zA-Z]+\./;

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

const lastValue = () => onValue.mock.calls[onValue.mock.calls.length - 1][0] as BrandSelection;

const savedApi = process.env.EXPO_PUBLIC_LOGO_API_URL;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  resetLocaleForTests();
  process.env.EXPO_PUBLIC_LOGO_API_URL = 'https://logos.test';
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  if (savedApi === undefined) delete process.env.EXPO_PUBLIC_LOGO_API_URL;
  else process.env.EXPO_PUBLIC_LOGO_API_URL = savedApi;
});

describe('the store field', () => {
  it('adds a new store and checks its logo, in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<Harness />);

    await typeStore(screen, 'Busca una tienda', 'Planet Fitness');
    expect(screen.getByText('Agregar “Planet Fitness”')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Agregar Planet Fitness como tienda nueva'));

    expect(screen.getByText('Parece que es Planet Fitness')).toBeTruthy();
    expect(screen.getByLabelText('Cambiar tienda, ahora es Planet Fitness')).toBeTruthy();
    for (const label of [
      'Sí, es ese',
      'No es este',
      'Usar el sitio web',
      'Sin logo, usar letras',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expectAllWorded(screen);

    await fireEvent.press(screen.getByLabelText('Sí, es ese'));
    expect(lastValue()).toMatchObject({ logoDomain: 'planetfitness.com', logoHidden: false });
    expect(screen.getByLabelText('Cambiar logo')).toBeTruthy();
  });

  it('adds a new store and checks its logo, in French', async () => {
    setLanguage('fr');
    const screen = await render(<Harness />);

    await typeStore(screen, 'Cherche un magasin', 'Planet Fitness');
    // The matcher's normalizer turns the no-break spaces inside « » into plain ones.
    expect(screen.getByText(/^Ajouter «\sPlanet Fitness\s»$/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Ajouter Planet Fitness comme nouveau magasin'));

    expect(screen.getByText('On dirait Planet Fitness')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Pas celui-ci'));
    expect(screen.getByText(/^Lequel est-ce\s\?$/)).toBeTruthy();
    expect(screen.getByText('Rien d’autre n’est ressorti.')).toBeTruthy();
    expectAllWorded(screen);

    await fireEvent.press(screen.getByLabelText('Pas de logo, utiliser les lettres'));
    expect(lastValue()).toMatchObject({ logoDomain: null, logoHidden: true });
    expect(screen.getByLabelText('Changer le logo')).toBeTruthy();
  });
});

describe('a logo', () => {
  it.each([
    ['en', 'Netflix logo'],
    ['es', 'Logo de Netflix'],
    ['fr', 'Logo de Netflix'],
  ] as const)('is read aloud by name in %s', async (language, label) => {
    setLanguage(language);
    const screen = await render(<BrandLogo name="Netflix" domain="netflix.com" />);

    expect(screen.getByTestId('logo').props.accessibilityLabel).toBe(label);
  });
});

describe('the Change logo button', () => {
  it.each([
    ['es', 'Cambiar logo', 'Elige el logo que se muestra para Calm'],
    ['fr', 'Changer le logo', 'Choisis le logo affiché pour Calm'],
  ] as const)('says what it opens in %s, and opens it', async (language, label, hint) => {
    setLanguage(language);
    const screen = await render(
      <ChangeLogoButton kind="subscription" id="s1" name="Calm">
        <Text>logo</Text>
      </ChangeLogoButton>,
    );

    const button = screen.getByLabelText(label);
    expect(button.props.accessibilityHint).toBe(hint);
    await fireEvent.press(button);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/change-logo',
      params: { kind: 'subscription', id: 's1', name: 'Calm' },
    });
  });
});
