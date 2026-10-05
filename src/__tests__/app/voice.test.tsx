import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo, AppState, Linking, type AppStateStatus } from 'react-native';

import VoiceScreen from '@/app/voice';
import { sentenceText, VOICE_EXAMPLES } from '@/data/voice-examples';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { toggle, warn } from '@/lib/haptics';
import { parseVoice } from '@/lib/voice';
import { readVoiceDraft } from '@/lib/voice-draft';

/**
 * "Record a transaction": hold the mic, talk, let go.
 *
 * The speech hook is replaced by a fake whose status the test moves, the same
 * statuses Dilip's hook publishes. The parser is a spy, so what is asserted is
 * what the page hands it, not how well it parses.
 */

// Reanimated's worklets need the native runtime, which Jest does not have.
// The ring and the grow are decoration; a still View stands in.
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
    // Focused while mounted; unmounting is the blur.
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

const mockDirectory = [
  { id: 'b1', name: 'Starbucks', domain: 'starbucks.com', category_id: 'dining', logo_path: null },
];
jest.mock('@/api/brands', () => ({ useBrandDirectory: () => ({ data: mockDirectory }) }));
jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ data: [{ merchant: 'Corner Deli' }] }),
  useBills: () => ({ data: [{ name: 'Rent' }] }),
  useSubscriptions: () => ({ data: [{ name: 'Netflix' }] }),
}));
const mockAliases = { 'spot a fly': 'Spotify' };
jest.mock('@/api/voice-aliases', () => ({
  useVoiceAliases: () => ({ aliases: mockAliases, ready: true }),
}));

const mockDraft = {
  kind: 'receipt' as const,
  kindSure: true,
  amount: 12.5,
  amountChoices: [],
  merchant: { brandId: 'b1', name: 'Starbucks', domain: 'starbucks.com', categoryId: 'dining' },
  merchantHeard: 'starbucks',
  merchantSource: 'catalog' as const,
  multiple: false,
  date: '2026-10-01',
  cycle: null,
  billCategoryId: null,
  score: 9,
  confidence: 'high' as const,
  missing: [],
  transcript: 'Spent $12.50 at Starbucks today',
};
jest.mock('@/lib/voice', () => ({
  parseVoice: jest.fn(() => mockDraft),
  voiceVocabulary: jest.fn((_directory: unknown, own: string[]) => own),
}));

// --- A speech hook the test drives -------------------------------------------

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
const mockOptions = jest.fn();
const mockRerenders = new Set<() => void>();
const mockStart = jest.fn(async () => {});
const mockStop = jest.fn();
// The real hook drops back to idle on cancel, keeping what it knows of the phone.
const mockCancel = jest.fn(() => {
  mockSpeech = { ...mockIdle, permissionGranted: mockSpeech.permissionGranted };
});
const mockRefreshPermission = jest.fn(async () => {});
let mockGrantOnRequest = true;
const mockRequestPermission = jest.fn(async () => {
  // As the hook does outside a session: idle when granted, denied when not.
  mockSpeech = {
    ...mockSpeech,
    permissionGranted: mockGrantOnRequest,
    status: mockGrantOnRequest ? 'idle' : 'denied',
  };
  return mockGrantOnRequest;
});

jest.mock('@/lib/speech', () => {
  const React = jest.requireActual('react');
  return {
    isSpeechAvailable: () => true,
    useSpeechCapture: (options: unknown) => {
      mockOptions(options);
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

/** What the hook publishes next, as a native event would deliver it. */
async function speak(patch: Partial<FakeState>) {
  await act(async () => {
    mockSpeech = { ...mockSpeech, ...patch };
    mockRerenders.forEach((rerender) => rerender());
  });
}

type Screen = Awaited<ReturnType<typeof render>>;

/** A touch event on the mic, with everything it sets in motion settled. */
async function onMic(screen: Screen, event: 'pressIn' | 'pressOut' | 'press') {
  await act(async () => {
    fireEvent(screen.getByLabelText('Record'), event);
  });
}

async function press(screen: Screen, label: string) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label));
  });
}

const HINTS = VOICE_EXAMPLES.map((example) => sentenceText(example.parts));

// --- The phone around the page -------------------------------------------------

let mockScreenReader = false;
let mockAppState: ((state: AppStateStatus) => void)[] = [];
let mockFinished: (() => void)[] = [];

async function appBecomes(state: AppStateStatus) {
  await act(async () => {
    mockAppState.forEach((listener) => listener(state));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSpeech = mockIdle;
  mockGrantOnRequest = true;
  mockScreenReader = false;
  mockAppState = [];
  mockFinished = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((type, listener) => {
    if (type === 'change') mockAppState.push(listener as (state: AppStateStatus) => void);
    return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
  });
  jest
    .spyOn(AccessibilityInfo, 'isScreenReaderEnabled')
    .mockImplementation(() => Promise.resolve(mockScreenReader));
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((event, handler) => {
    if (event === 'announcementFinished') mockFinished.push(handler as () => void);
    return { remove: () => {} } as ReturnType<typeof AccessibilityInfo.addEventListener>;
  });
  // VoiceOver finishes every line at once.
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {
    mockFinished.splice(0).forEach((finish) => finish());
  });
  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('/voice — hold to talk', () => {
  it('opens idle with the title, four hints and the mic, and listens to nothing', async () => {
    const screen = await render(<VoiceScreen />);

    const title = screen.getByText('Record a transaction');
    expect(title.props.className).toContain('text-center');
    expect(title.props.className).not.toContain('text-left');

    // One per kind Skip can add; nothing salary-like.
    expect(HINTS).toEqual([
      'Spent $12.50 at Starbucks today',
      'Electric bill $85, due on the 15th',
      'Netflix $15.99 every month',
    ]);
    HINTS.forEach((hint) => {
      // Quiet text, not cards: ink at 40%.
      expect(screen.getByText(hint).props.className).toContain('text-ink/40');
    });

    // Nothing above the hints until the mic is held: "Listening…" belongs to
    // the hold, not to the page (Founder, 2026-10-03).
    expect(screen.queryByText('Listening…', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('Hold to talk', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText('Record').props.accessibilityHint).toBe(
      'Hold while you talk, then let go.',
    );
    expect(screen.queryByText('Ready when you are')).toBeNull();
    expect(screen.queryByText('Try saying')).toBeNull();
    expect(mockStart).not.toHaveBeenCalled();
    expect(mockOptions).toHaveBeenLastCalledWith(expect.objectContaining({ continuous: true }));
  });

  it('shows the words while held, and goes to review once on release', async () => {
    const screen = await render(<VoiceScreen />);

    await onMic(screen, 'pressIn');
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenCalledTimes(1);
    // Held, no words yet: "Listening…" at 20%, kept from VoiceOver, which
    // already hears "Listening" announced as the hold starts.
    const placeholder = screen.getByText('Listening…', { includeHiddenElements: true });
    expect(placeholder.props.className).toContain('text-ink/20');
    expect(screen.queryByText('Listening…')).toBeNull();
    expect(
      screen.getByText('Release when you’re done', { includeHiddenElements: true }),
    ).toBeTruthy();
    // The hints step aside while someone talks, without moving the mic.
    expect(screen.queryByText(HINTS[0])).toBeNull();
    expect(screen.getByText(HINTS[0], { includeHiddenElements: true })).toBeTruthy();

    await speak({ status: 'listening' });
    await speak({ interim: 'Spent twelve fifty at' });
    // The first word takes the placeholder's place, in full ink.
    expect(screen.getByText('Spent twelve fifty at').props.className).toContain('text-ink');
    expect(screen.queryByText('Listening…', { includeHiddenElements: true })).toBeNull();

    await onMic(screen, 'pressOut');
    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Spent twelve fifty at')).toBeTruthy();
    expect(screen.getByText('Hold to talk', { includeHiddenElements: true })).toBeTruthy();

    const words = ['Spent $12.50 at Starbucks today', 'Spent $12.50 at Star bucks today'];
    await speak({ status: 'idle', alternatives: words, interim: words[0] });
    // A late re-render must not send it twice.
    await speak({ interim: words[0] });

    expect(parseVoice).toHaveBeenCalledTimes(1);
    expect(parseVoice).toHaveBeenCalledWith(words, {
      today: '2026-10-01',
      directory: mockDirectory,
      aliases: mockAliases,
    });
    expect(router.push).toHaveBeenCalledTimes(1);
    const pushed = (router.push as jest.Mock).mock.calls[0][0];
    expect(pushed.pathname).toBe('/voice-review');
    expect(readVoiceDraft(pushed.params.draft)?.transcript).toBe(mockDraft.transcript);
  });

  it('asks for one at a time when it heard more than one, and pushes nothing', async () => {
    (parseVoice as jest.Mock).mockImplementationOnce(() => ({ ...mockDraft, multiple: true }));
    const screen = await render(<VoiceScreen />);

    await onMic(screen, 'pressIn');
    await speak({ status: 'listening', interim: 'Netflix 15.99 and Spotify' });
    await onMic(screen, 'pressOut');
    const said = 'Netflix $15.99 and Spotify $11.99';
    await speak({ status: 'idle', alternatives: [said], interim: said });
    await speak({ interim: said });

    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByText('Looks like more than one. Add them one at a time.')).toBeTruthy();
    // What was heard stays on screen, in full ink.
    expect(screen.getByText(said).props.className).not.toContain('text-ink/20');
    expect(warn).toHaveBeenCalledTimes(1);
    // Back to idle: hints, and a mic ready for the next hold.
    HINTS.forEach((hint) => expect(screen.getByText(hint)).toBeTruthy());
    expect(screen.getByText('Hold to talk', { includeHiddenElements: true })).toBeTruthy();

    await onMic(screen, 'pressIn');
    expect(mockStart).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Looks like more than one. Add them one at a time.')).toBeNull();
    expect(screen.queryByText(said)).toBeNull();
  });

  it('says how it works when let go before the mic was open', async () => {
    const screen = await render(<VoiceScreen />);

    await onMic(screen, 'pressIn');
    await onMic(screen, 'pressOut');

    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Hold the button while you talk.')).toBeTruthy();
    // A status line replaces the placeholder.
    expect(screen.queryByText('Listening…', { includeHiddenElements: true })).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    // The hook ends it quietly as idle: still not a second outcome.
    await speak({ status: 'idle', alternatives: [] });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
    HINTS.forEach((hint) => expect(screen.getByText(hint)).toBeTruthy());
  });

  it('says the same when a hold heard nothing', async () => {
    const screen = await render(<VoiceScreen />);
    await onMic(screen, 'pressIn');
    await speak({ status: 'listening' });
    await onMic(screen, 'pressOut');
    await speak({ status: 'idle', alternatives: [] });

    expect(screen.getByText('Hold the button while you talk.')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('takes the words to review when the 15-second cap or a call ends a hold', async () => {
    const screen = await render(<VoiceScreen />);
    await onMic(screen, 'pressIn');
    await speak({ status: 'listening', interim: 'Netflix fifteen ninety nine' });

    // Still held; the session ends on its own, keeping what was heard.
    await speak({ status: 'idle', alternatives: ['Netflix $15.99'], interim: 'Netflix $15.99' });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    // Letting go afterwards changes nothing.
    await onMic(screen, 'pressOut');
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('closes a mic that opened after the person let go', async () => {
    const screen = await render(<VoiceScreen />);
    await onMic(screen, 'pressIn');
    await onMic(screen, 'pressOut');
    mockCancel.mockClear();

    await speak({ status: 'listening' });
    expect(mockCancel).toHaveBeenCalled();
  });
});

describe('/voice — permission', () => {
  it('asks on the first press, starts nothing, and says when it is set', async () => {
    mockSpeech = { ...mockIdle, permissionGranted: null };
    const screen = await render(<VoiceScreen />);

    await onMic(screen, 'pressIn');
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockStart).not.toHaveBeenCalled();
    // The prompt took the touch; the release that follows starts and stops nothing.
    await onMic(screen, 'pressOut');
    expect(mockStop).not.toHaveBeenCalled();
    await speak({});
    expect(screen.getByText('You’re all set. Hold to talk.')).toBeTruthy();

    await onMic(screen, 'pressIn');
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('explains a refusal, with a way to Settings', async () => {
    mockSpeech = { ...mockIdle, permissionGranted: false };
    mockGrantOnRequest = false;
    const screen = await render(<VoiceScreen />);

    await onMic(screen, 'pressIn');
    await speak({});

    expect(
      screen.getByText('Turn on Microphone and Speech Recognition for Skip Budget in Settings.'),
    ).toBeTruthy();
    expect(mockStart).not.toHaveBeenCalled();
    await press(screen, 'Open Settings');
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  it('reads the permission again on the way back from Settings', async () => {
    const screen = await render(<VoiceScreen />);
    await appBecomes('active');
    expect(mockRefreshPermission).not.toHaveBeenCalled();

    await speak({ status: 'denied', permissionGranted: false });
    expect(screen.getByLabelText('Open Settings')).toBeTruthy();

    await appBecomes('background');
    await appBecomes('active');
    expect(mockRefreshPermission).toHaveBeenCalledTimes(1);
    expect(mockCancel).not.toHaveBeenCalled();
  });
});

describe('/voice — when it cannot listen', () => {
  it('offers the forms by hand when voice is unavailable', async () => {
    const screen = await render(<VoiceScreen />);
    await onMic(screen, 'pressIn');
    await speak({ status: 'unavailable' });

    expect(screen.getByText('Voice isn’t available on this iPhone right now.')).toBeTruthy();
    await press(screen, 'Bill');
    expect(router.replace).toHaveBeenCalledWith('/add-bill');
  });

  it('shows the one failure line when the engine fails', async () => {
    const screen = await render(<VoiceScreen />);
    await onMic(screen, 'pressIn');
    await speak({ status: 'listening' });
    await speak({ status: 'error' });

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
  });

  it('stops the mic when the app goes to the background', async () => {
    const screen = await render(<VoiceScreen />);
    await onMic(screen, 'pressIn');
    await speak({ status: 'listening', interim: 'Rent' });

    await appBecomes('background');
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByText('Hold to talk', { includeHiddenElements: true })).toBeTruthy();
  });

  it('stops the mic when the page goes away', async () => {
    const screen = await render(<VoiceScreen />);
    await onMic(screen, 'pressIn');
    await speak({ status: 'listening' });

    await act(async () => {
      screen.unmount();
    });
    expect(mockCancel).toHaveBeenCalled();
  });
});

describe('/voice — with VoiceOver', () => {
  it('starts with a double-tap after saying so, and stops with another', async () => {
    mockScreenReader = true;
    const screen = await render(<VoiceScreen />);
    await act(async () => {});

    const mic = screen.getByLabelText('Record');
    expect(mic.props.accessibilityHint).toBe(
      'Double-tap to start talking, and again when you’re done.',
    );

    await onMic(screen, 'press');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Listening');
    expect(mockStart).toHaveBeenCalledTimes(1);
    await speak({ status: 'listening' });
    expect(screen.getByLabelText('Record').props.accessibilityHint).toBe('Double-tap to stop.');

    await onMic(screen, 'press');
    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Stopped');
  });
});

describe('/voice — dev builds', () => {
  it('offers a typed sentence down the same road as speech', async () => {
    const screen = await render(<VoiceScreen />);
    expect(screen.getByText('Test sentence (dev only)')).toBeTruthy();

    const input = screen.getByPlaceholderText('Netflix $15.99 every month');
    // Typed words reach the parser exactly as typed: no autocorrect, no caps.
    expect(input.props.autoCorrect).toBe(false);
    expect(input.props.autoCapitalize).toBe('none');

    await act(async () => {
      fireEvent.changeText(input, '  Hulu $99.99 a year ');
    });
    const use = screen.getByLabelText('Use this sentence');
    await act(async () => {
      fireEvent.press(use);
      fireEvent.press(use);
    });

    expect(mockStart).not.toHaveBeenCalled();
    expect(parseVoice).toHaveBeenCalledTimes(1);
    expect(parseVoice).toHaveBeenCalledWith(['Hulu $99.99 a year'], {
      today: '2026-10-01',
      directory: mockDirectory,
      aliases: mockAliases,
    });
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});
