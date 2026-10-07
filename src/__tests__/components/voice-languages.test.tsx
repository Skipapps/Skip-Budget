import { act, render } from '@testing-library/react-native';

import { MicButton } from '@/components/voice/mic-button';
import { ReviewRow } from '@/components/voice/review-row';
import { StaleDraft } from '@/components/voice/stale-draft';
import { VoiceFab } from '@/components/voice/voice-fab';
import { VoiceHints } from '@/components/voice/voice-hints';
import { sentenceText, VOICE_EXAMPLES } from '@/data/voice-examples';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The voice components in Spanish and French. The Voice button lives in the tab bar, outside the
 * screens that remount on a language change, so it must follow a change while mounted.
 */

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true },
    useFocusEffect: (effect: () => unknown) => React.useEffect(effect, [effect]),
  };
});

jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));

jest.mock('@/providers/theme-provider', () => {
  const colors = {
    ink: '#000000',
    body: '#333333',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    control: '#905479',
    onControl: '#FFFFFF',
    accentInk: '#5B3A6B',
  };
  return { useColors: () => colors, useTheme: () => ({ colors, scheme: 'light' }) };
});
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

let mockPro = { pro: true, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));
jest.mock('@/lib/speech', () => ({ isSpeechAvailable: () => true }));

const NBSP = ' ';
const HINTS = VOICE_EXAMPLES.map((example) => sentenceText(example.parts));

type Screen = Awaited<ReturnType<typeof render>>;

function everyLine(screen: Screen): string[] {
  const lines: string[] = [];
  const walk = (node: unknown) => {
    if (node == null) return;
    if (typeof node === 'string') {
      lines.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const { props, children } = node as { props?: Record<string, unknown>; children?: unknown[] };
    for (const name of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      if (typeof props?.[name] === 'string') lines.push(props[name] as string);
    }
    (children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return lines;
}

function expectNoRawKeys(screen: Screen) {
  const lines = everyLine(screen);
  expect(lines.length).toBeGreaterThan(0);
  for (const line of lines) {
    expect(line).not.toMatch(/^[a-z]+\.[a-zA-Z]+\./);
    expect(line).not.toMatch(/\{\w+\}/);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockPro = { pro: true, ready: true };
});

afterAll(() => resetLocaleForTests());

describe('VoiceFab', () => {
  it('follows a language change while it stays mounted', async () => {
    const screen = await render(<VoiceFab />);
    expect(screen.getByLabelText('Add by voice')).toBeTruthy();

    await act(async () => setLanguage('es'));
    expect(screen.getByLabelText('Agregar por voz').props.accessibilityHint).toBe(
      'Di un recibo, una factura o una suscripción. Lo revisas antes de guardarlo.',
    );

    await act(async () => setLanguage('fr'));
    expect(screen.getByLabelText('Ajouter par la voix').props.accessibilityHint).toBe(
      'Dis un reçu, une facture ou un abonnement. Tu le vérifies avant qu’il soit enregistré.',
    );
    expectNoRawKeys(screen);
  });

  it('keeps the PRO badge as it is and explains Pro in Spanish', async () => {
    mockPro = { pro: false, ready: true };
    setLanguage('es');
    const screen = await render(<VoiceFab />);

    expect(screen.getByLabelText('Agregar por voz').props.accessibilityHint).toBe(
      'Parte de Skip Pro. Muestra lo que puedes hacer al agregar por voz.',
    );
    expect(screen.getByText('PRO', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('MicButton', () => {
  it.each([
    ['es', 'Grabar'],
    ['fr', 'Dicter'],
  ] as const)('is named in %s', async (language, name) => {
    setLanguage(language);
    const screen = await render(
      <MicButton
        held={false}
        live={false}
        level={0}
        toggleMode={false}
        onStart={() => {}}
        onStop={() => {}}
        accessibilityHint="hint"
      />,
    );
    expect(screen.getByLabelText(name)).toBeTruthy();
  });
});

describe('ReviewRow', () => {
  const row = (props: { label: string; value: string | null; required: boolean }) => (
    <ReviewRow {...props} leading={null} onPress={() => {}} />
  );

  it('says what is missing in Spanish', async () => {
    setLanguage('es');
    const screen = await render(row({ label: 'Tienda', value: null, required: true }));
    expect(screen.getByText('Toca para agregar')).toBeTruthy();
    expect(screen.getByLabelText('Tienda, no se escuchó').props.accessibilityHint).toBe(
      'Hace falta para guardar. Abre «tienda» para agregarlo.',
    );
    expectNoRawKeys(screen);
  });

  it('says what is optional in Spanish', async () => {
    setLanguage('es');
    const screen = await render(
      row({ label: 'Fecha de renovación', value: null, required: false }),
    );
    expect(screen.getByText('Fecha de renovación · opcional')).toBeTruthy();
    expect(screen.getByText('Sin definir')).toBeTruthy();
    expect(screen.getByLabelText('Fecha de renovación, sin definir, opcional')).toBeTruthy();
  });

  it('says what is set, and how to change it, in French', async () => {
    setLanguage('fr');
    const screen = await render(row({ label: 'Magasin', value: 'Starbucks', required: true }));
    expect(screen.getByLabelText('Magasin, Starbucks').props.accessibilityHint).toBe(
      `Ouvre «${NBSP}magasin${NBSP}» pour le modifier.`,
    );
    expectNoRawKeys(screen);
  });

  it('reads exactly as before in English', async () => {
    const screen = await render(row({ label: 'Due on', value: null, required: true }));
    expect(screen.getByLabelText('Due on, not heard').props.accessibilityHint).toBe(
      'Needed to save. Opens due on to add it.',
    );
  });
});

describe('StaleDraft', () => {
  it.each([
    ['es', 'Aún no hay nada que revisar', 'Empezar de nuevo'],
    ['fr', 'Rien à vérifier pour l’instant', 'Recommencer'],
  ] as const)('says there is nothing to check, in %s', async (language, title, action) => {
    setLanguage(language);
    const screen = await render(<StaleDraft />);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(action)).toBeTruthy();
    expectNoRawKeys(screen);
  });
});

describe('VoiceHints', () => {
  it.each([
    ['es', 'Por ahora, Skip solo entiende inglés hablado.'],
    ['fr', 'Pour l’instant, Skip ne comprend que l’anglais parlé.'],
  ] as const)(
    'keeps the sentences to say in English and says so, in %s',
    async (language, note) => {
      setLanguage(language);
      const screen = await render(<VoiceHints hidden={false} />);
      expect(screen.getByText(note)).toBeTruthy();
      HINTS.forEach((hint) => expect(screen.getByText(hint)).toBeTruthy());
      expectNoRawKeys(screen);
    },
  );

  it('fades the note with the sentences while someone talks', async () => {
    setLanguage('es');
    const screen = await render(<VoiceHints hidden />);
    expect(screen.queryByText('Por ahora, Skip solo entiende inglés hablado.')).toBeNull();
    expect(
      screen.getByText('Por ahora, Skip solo entiende inglés hablado.', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
  });

  it('has no note in English', async () => {
    const screen = await render(<VoiceHints hidden={false} />);
    expect(screen.queryByText('For now, Skip understands spoken English only.')).toBeNull();
    HINTS.forEach((hint) => expect(screen.getByText(hint)).toBeTruthy());
  });
});
