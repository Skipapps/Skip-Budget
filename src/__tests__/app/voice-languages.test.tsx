import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo, AppState } from 'react-native';

import VoiceScreen from '@/app/voice';
import { sentenceText, VOICE_EXAMPLES } from '@/data/voice-examples';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * /voice in Spanish and French: the page's own words follow the language, while what a person is
 * told to say stays English, the only language the recogniser and the parser understand, with a
 * line saying so. The speech hook is a fake whose status the test moves, as in voice.test.tsx.
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
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      dismissTo: jest.fn(),
      canGoBack: () => true,
    },
    useFocusEffect: (effect: () => undefined | (() => void)) => React.useEffect(effect, [effect]),
  };
});

jest.mock('@/providers/theme-provider', () => {
  const colors = {
    ink: '#000000',
    body: '#333333',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    control: '#6E3E5C',
    onControl: '#FFFFFF',
    accentInk: '#5B3A6B',
  };
  return { useColors: () => colors, useTheme: () => ({ colors, scheme: 'light' }) };
});

jest.mock('@/components/pro/pro-gate', () => ({ useProGate: () => null }));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  warn: jest.fn(),
  success: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-01', todayDate: new Date('2026-10-01T00:00:00') }),
}));
jest.mock('@/api/brands', () => ({ useBrandDirectory: () => ({ data: [] }) }));
jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ data: [] }),
  useBills: () => ({ data: [] }),
  useSubscriptions: () => ({ data: [] }),
}));
jest.mock('@/api/voice-aliases', () => ({
  useVoiceAliases: () => ({ aliases: {}, ready: true }),
}));

let mockMultiple = false;
jest.mock('@/lib/voice', () => ({
  parseVoice: jest.fn(() => ({
    kind: 'subscription',
    kindSure: true,
    amount: 15.99,
    amountChoices: [],
    merchant: null,
    merchantHeard: null,
    merchantSource: null,
    multiple: mockMultiple,
    date: null,
    cycle: 'monthly',
    billCategoryId: null,
    score: 5,
    confidence: 'high',
    missing: [],
    transcript: 'Netflix $15.99 and Spotify $11.99',
  })),
  voiceVocabulary: jest.fn(() => []),
}));

type FakeState = {
  status: 'idle' | 'asking' | 'listening' | 'denied' | 'unavailable' | 'error';
  interim: string;
  alternatives: string[];
  onDevice: boolean;
  level: number;
  permissionGranted: boolean | null;
};

const mockIdle: FakeState = {
  status: 'idle',
  interim: '',
  alternatives: [],
  onDevice: false,
  level: 0,
  permissionGranted: true,
};
let mockSpeech: FakeState = mockIdle;
const mockRerenders = new Set<() => void>();
const mockStart = jest.fn(async () => {});
const mockStop = jest.fn();
// The real hook's functions are stable; new ones each render would re-run the page's focus effect.
const mockCancel = jest.fn(() => {
  mockSpeech = { ...mockIdle, permissionGranted: mockSpeech.permissionGranted };
});
const mockRefreshPermission = jest.fn(async () => {});
const mockRequestPermission = jest.fn(async () => true);

jest.mock('@/lib/speech', () => {
  const React = jest.requireActual('react');
  return {
    isSpeechAvailable: () => true,
    useSpeechCapture: () => {
      const [, rerender] = React.useReducer((count: number) => count + 1, 0);
      React.useEffect(() => {
        mockRerenders.add(rerender);
        return () => {
          mockRerenders.delete(rerender);
        };
      }, []);
      return {
        ...mockSpeech,
        start: mockStart,
        stop: mockStop,
        cancel: mockCancel,
        refreshPermission: mockRefreshPermission,
        requestPermission: mockRequestPermission,
      };
    },
  };
});

async function speak(patch: Partial<FakeState>) {
  await act(async () => {
    mockSpeech = { ...mockSpeech, ...patch };
    mockRerenders.forEach((rerender) => rerender());
  });
}

type Screen = Awaited<ReturnType<typeof render>>;

async function onMic(screen: Screen, label: string, event: 'pressIn' | 'pressOut' | 'press') {
  await act(async () => {
    fireEvent(screen.getByLabelText(label), event);
  });
}

/** Every string a person can read or hear: text, and the labels, hints and placeholders. */
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
  for (const line of everyLine(screen)) {
    expect(line).not.toMatch(/^[a-z]+\.[a-zA-Z]+\./);
    expect(line).not.toMatch(/\{\w+\}/);
  }
}

const HINTS = VOICE_EXAMPLES.map((example) => sentenceText(example.parts));

let mockScreenReader = false;
let mockFinished: (() => void)[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockSpeech = mockIdle;
  mockMultiple = false;
  mockScreenReader = false;
  mockFinished = [];
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation(
      () => ({ remove: () => {} }) as unknown as ReturnType<typeof AppState.addEventListener>,
    );
  jest
    .spyOn(AccessibilityInfo, 'isScreenReaderEnabled')
    .mockImplementation(() => Promise.resolve(mockScreenReader));
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((event, handler) => {
    if (event === 'announcementFinished') mockFinished.push(handler as () => void);
    return { remove: () => {} } as ReturnType<typeof AccessibilityInfo.addEventListener>;
  });
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {
    mockFinished.splice(0).forEach((finish) => finish());
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  resetLocaleForTests();
});

describe('/voice in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('translates the page and keeps the English sentences to say, with a note', async () => {
    const screen = await render(<VoiceScreen />);

    expect(screen.getByText('Registrar un movimiento')).toBeTruthy();
    expect(screen.getByText('Por ahora, Skip solo entiende inglés hablado.')).toBeTruthy();
    // Word for word as the parser's catalog test reads them.
    HINTS.forEach((hint) => expect(screen.getByText(hint)).toBeTruthy());
    expect(
      screen.getByText('Mantén presionado para hablar', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByLabelText('Grabar').props.accessibilityHint).toBe(
      'Mantén presionado mientras hablas y luego suelta.',
    );
    expect(screen.queryByText('Record a transaction')).toBeNull();
    expectNoRawKeys(screen);
  });

  it('says how it works after a tap, and while held says it is listening', async () => {
    const screen = await render(<VoiceScreen />);
    await onMic(screen, 'Grabar', 'pressIn');
    expect(screen.getByText('Escuchando…', { includeHiddenElements: true })).toBeTruthy();
    expect(
      screen.getByText('Suelta cuando termines', { includeHiddenElements: true }),
    ).toBeTruthy();

    await onMic(screen, 'Grabar', 'pressOut');
    expect(screen.getByText('Mantén presionado el botón mientras hablas.')).toBeTruthy();
    expectNoRawKeys(screen);
  });

  it('asks for one at a time when it heard two', async () => {
    mockMultiple = true;
    const screen = await render(<VoiceScreen />);
    await onMic(screen, 'Grabar', 'pressIn');
    await speak({ status: 'listening', interim: 'Netflix' });
    await onMic(screen, 'Grabar', 'pressOut');
    const said = 'Netflix $15.99 and Spotify $11.99';
    await speak({ status: 'idle', alternatives: [said], interim: said });

    expect(screen.getByText('Parece que es más de uno. Agrégalos uno por uno.')).toBeTruthy();
    // The live words are what was heard, untouched.
    expect(screen.getByText(said)).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('offers the forms by hand, in Spanish, when voice is unavailable', async () => {
    const screen = await render(<VoiceScreen />);
    await onMic(screen, 'Grabar', 'pressIn');
    await speak({ status: 'unavailable' });

    expect(screen.getByText('Voz no está disponible en este iPhone en este momento.')).toBeTruthy();
    expect(screen.getByText('Agrégalo a mano')).toBeTruthy();
    expect(screen.getByLabelText('Recibo')).toBeTruthy();
    expect(screen.getByLabelText('Suscripción')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Factura'));
    });
    expect(router.replace).toHaveBeenCalledWith('/add-bill');
    expectNoRawKeys(screen);
  });

  it('points to the phone’s Settings when the permission is off', async () => {
    const screen = await render(<VoiceScreen />);
    await speak({ status: 'denied', permissionGranted: false });

    expect(
      screen.getByText(
        'Activa Micrófono y Reconocimiento de voz para Skip Budget en Configuración.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Abrir Configuración')).toBeTruthy();
  });

  it('shows the one failure line in Spanish when the engine fails', async () => {
    const screen = await render(<VoiceScreen />);
    await onMic(screen, 'Grabar', 'pressIn');
    await speak({ status: 'listening' });
    await speak({ status: 'error' });

    expect(screen.getByText('Algo salió mal. Inténtalo de nuevo.')).toBeTruthy();
  });
});

describe('/voice in French', () => {
  beforeEach(() => setLanguage('fr'));

  it('translates the page and keeps the English sentences to say, with a note', async () => {
    const screen = await render(<VoiceScreen />);

    expect(screen.getByText('Enregistrer une transaction')).toBeTruthy();
    expect(screen.getByText('Pour l’instant, Skip ne comprend que l’anglais parlé.')).toBeTruthy();
    HINTS.forEach((hint) => expect(screen.getByText(hint)).toBeTruthy());
    expect(screen.getByText('Maintiens pour parler', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText('Dicter')).toBeTruthy();
    expectNoRawKeys(screen);
  });

  it('speaks to VoiceOver in French, naming the button by its French label', async () => {
    mockScreenReader = true;
    const screen = await render(<VoiceScreen />);
    await act(async () => {});

    expect(screen.getByLabelText('Dicter').props.accessibilityHint).toBe(
      'Touche deux fois pour commencer à parler, puis encore une fois quand tu as fini.',
    );
    await onMic(screen, 'Dicter', 'press');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('J’écoute');
    expect(mockStart).toHaveBeenCalledTimes(1);

    await onMic(screen, 'Dicter', 'press');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Arrêté');
    await speak({ status: 'idle', alternatives: [] });
    expect(
      screen.getByText('Skip n’a rien entendu. Touche deux fois Dicter, puis parle.'),
    ).toBeTruthy();
    expectNoRawKeys(screen);
  });

  it('offers the forms by hand, in French, when voice is unavailable', async () => {
    const screen = await render(<VoiceScreen />);
    await onMic(screen, 'Dicter', 'pressIn');
    await speak({ status: 'unavailable' });

    expect(
      screen.getByText('Voix n’est pas disponible sur cet iPhone pour le moment.'),
    ).toBeTruthy();
    expect(screen.getByText('Ajoute-le à la main')).toBeTruthy();
    expect(screen.getByLabelText('Reçu')).toBeTruthy();
    expect(screen.getByLabelText('Facture')).toBeTruthy();
    expect(screen.getByLabelText('Abonnement')).toBeTruthy();
    expectNoRawKeys(screen);
  });
});

describe('/voice in English', () => {
  it('has no note about English', async () => {
    const screen = await render(<VoiceScreen />);
    expect(screen.queryByText('For now, Skip understands spoken English only.')).toBeNull();
    expect(screen.getByText('Record a transaction')).toBeTruthy();
  });
});
