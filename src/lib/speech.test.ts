/**
 * The speech wrapper, with Apple's recogniser replaced by a fake engine. Pins the promise the voice
 * pages build on: importing `src/lib/speech.ts` never throws, every failure comes back as a status,
 * a session always lets go of its listeners and the audio session, and the alternatives are tidy,
 * distinct, best first and at most three.
 *
 * `native` is resolved once, on first import, so every test re-imports in an isolated registry;
 * React and the testing library are imported in the same registry so the hook and the renderer
 * share one React. The `/pure` entry does not register its own afterEach, which would be illegal
 * inside a test.
 */

type Speech = typeof import('./speech');
type Rtl = typeof import('@testing-library/react-native/pure');

const mockRequireOptionalNativeModule = jest.fn();
const mockFailureMessage = jest.fn();
let mockLanguageTag = 'en-US';

// Spread the real module: jest-expo's own setup reaches for other exports.
jest.mock('expo-modules-core', () => ({
  ...jest.requireActual('expo-modules-core'),
  requireOptionalNativeModule: (...args: unknown[]) => mockRequireOptionalNativeModule(...args),
}));

jest.mock('@/lib/failure', () => ({
  FAILURE_MESSAGE: 'Something went wrong. Please try again.',
  failureMessage: (...args: unknown[]) => mockFailureMessage(...args),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

// A phone unless a test says otherwise; a getter so each test can flip it.
let mockIsDevice = true;
jest.mock('expo-device', () => ({
  get isDevice() {
    return mockIsDevice;
  },
}));

type Handler = (event?: unknown) => void;

type Permission = {
  status: string;
  granted: boolean;
  canAskAgain: boolean;
  expires: string;
  restricted?: boolean;
};

const GRANTED: Permission = {
  status: 'granted',
  granted: true,
  canAskAgain: true,
  expires: 'never',
};
const UNDETERMINED: Permission = {
  status: 'undetermined',
  granted: false,
  canAskAgain: true,
  expires: 'never',
};
const DENIED: Permission = {
  status: 'denied',
  granted: false,
  canAskAgain: false,
  expires: 'never',
};
const BEFORE = { category: 'soloAmbient', categoryOptions: [], mode: 'default' };

function fakeEngine() {
  const handlers = new Map<string, Set<Handler>>();
  const module = {
    addListener: jest.fn((name: string, handler: Handler) => {
      const set = handlers.get(name) ?? new Set<Handler>();
      handlers.set(name, set);
      set.add(handler);
      return { remove: () => set.delete(handler) };
    }),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    getPermissionsAsync: jest.fn(async (): Promise<Permission> => GRANTED),
    requestPermissionsAsync: jest.fn(async (): Promise<Permission> => GRANTED),
    isRecognitionAvailable: jest.fn(() => true),
    supportsOnDeviceRecognition: jest.fn(() => true),
    getAudioSessionCategoryAndOptionsIOS: jest.fn(() => BEFORE),
    setCategoryIOS: jest.fn(),
    setAudioSessionActiveIOS: jest.fn(),
  };
  return {
    module,
    /** Sends a native event to whoever is listening. */
    emit(name: string, event?: unknown) {
      for (const handler of [...(handlers.get(name) ?? [])]) handler(event);
    },
    /** How many listeners are still attached, across every event. */
    listeners() {
      let count = 0;
      for (const set of handlers.values()) count += set.size;
      return count;
    },
  };
}

type Engine = ReturnType<typeof fakeEngine>;

function load(): { speech: Speech; rtl: Rtl } {
  let speech!: Speech;
  let rtl!: Rtl;
  jest.isolateModules(() => {
    // Re-evaluating the module is the point, which `import` cannot do.
    /* eslint-disable @typescript-eslint/no-require-imports */
    speech = require('./speech') as Speech;
    rtl = require('@testing-library/react-native/pure') as Rtl;
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
  return { speech, rtl };
}

async function mount(
  engine: Engine | null,
  contextualStrings: string[] = ['Netflix'],
  continuous?: boolean,
) {
  mockRequireOptionalNativeModule.mockReturnValue(engine ? engine.module : null);
  const { speech, rtl } = load();
  const hook = await rtl.renderHook(() =>
    speech.useSpeechCapture({ contextualStrings, continuous }),
  );
  const emit = (name: string, event?: unknown) => rtl.act(() => engine?.emit(name, event));
  /** The press alone: `start()`, before the engine reports the microphone open. */
  const press = () => rtl.act(() => hook.result.current.start());
  /** `start()`, then the engine's own `start` event if it was asked to listen. */
  const start = async () => {
    const before = engine ? engine.module.start.mock.calls.length : 0;
    await press();
    if (engine && engine.module.start.mock.calls.length > before) await emit('start');
  };
  return { speech, rtl, hook, start, press, emit };
}

function final(...transcripts: string[]) {
  return { isFinal: true, results: transcripts.map((transcript) => ({ transcript })) };
}

function partial(transcript: string) {
  return { isFinal: false, results: [{ transcript }] };
}

// Fake timers throughout, so a session a test leaves open (its settle timer
// still waiting for an `end` the fake never sends) cannot outlive the test.
beforeEach(() => {
  jest.useFakeTimers();
  mockRequireOptionalNativeModule.mockReset();
  mockFailureMessage.mockReset();
  mockLanguageTag = 'en-US';
  mockIsDevice = true;
  delete process.env.EXPO_PUBLIC_SIMULATOR_VOICE;
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('a build without the native module', () => {
  it('asks for the module by the name the pod registers', () => {
    mockRequireOptionalNativeModule.mockReturnValue(null);
    load();
    expect(mockRequireOptionalNativeModule).toHaveBeenCalledWith('ExpoSpeechRecognition');
  });

  it('is what Jest itself gives: the real lookup finds nothing, and nothing throws', () => {
    const actual = jest.requireActual('expo-modules-core') as {
      requireOptionalNativeModule: (name: string) => unknown;
    };
    mockRequireOptionalNativeModule.mockImplementation((name: string) =>
      actual.requireOptionalNativeModule(name),
    );
    const { speech } = load();
    expect(speech.isSpeechAvailable()).toBe(false);
  });

  it('would throw if the package were imported directly, which is why the wrapper never does', () => {
    expect(() => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('expo-speech-recognition');
      });
    }).toThrow(/ExpoSpeechRecognition/);
  });

  it('says unavailable from start() instead of throwing', async () => {
    const { speech, hook, start } = await mount(null);
    expect(speech.isSpeechAvailable()).toBe(false);
    // Awaited directly (a throw fails the test): `expect(act(...)).resolves`
    // settles before act has flushed the state update.
    await start();
    expect(hook.result.current.status).toBe('unavailable');
    expect(hook.result.current.alternatives).toEqual([]);
    await hook.unmount();
  });
});

describe('the iOS Simulator', () => {
  // On the Simulator the first microphone use waits on a macOS permission dialog and Core Audio
  // aborts the app if nobody answers in ~9s, so voice never reaches the audio engine there unless
  // a developer opts in.
  it('says unavailable without asking for permission or touching the engine', async () => {
    mockIsDevice = false;
    const engine = fakeEngine();
    const { speech, hook, start } = await mount(engine);
    expect(speech.isSpeechAvailable()).toBe(true);
    await start();
    expect(hook.result.current.status).toBe('unavailable');
    // Reading permission on mount touches no audio; prompting would, and does not happen.
    expect(engine.module.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(engine.module.start).not.toHaveBeenCalled();
    expect(engine.module.addListener).not.toHaveBeenCalled();
    expect(engine.module.setAudioSessionActiveIOS).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('listens when a developer opts in with EXPO_PUBLIC_SIMULATOR_VOICE=1', async () => {
    mockIsDevice = false;
    process.env.EXPO_PUBLIC_SIMULATOR_VOICE = '1';
    const engine = fakeEngine();
    const { hook, start } = await mount(engine);
    await start();
    expect(engine.module.start).toHaveBeenCalledTimes(1);
    expect(hook.result.current.status).toBe('listening');
    await hook.unmount();
  });

  it('is unaffected on a phone', async () => {
    const engine = fakeEngine();
    const { hook, start } = await mount(engine);
    await start();
    expect(engine.module.start).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });
});

describe('permissions', () => {
  it('reads permission on mount without prompting', async () => {
    const engine = fakeEngine();
    const { hook } = await mount(engine);
    expect(hook.result.current.permissionGranted).toBe(true);
    expect(engine.module.requestPermissionsAsync).not.toHaveBeenCalled();
    await hook.unmount();

    const refused = fakeEngine();
    refused.module.getPermissionsAsync.mockResolvedValue(UNDETERMINED);
    const second = await mount(refused);
    expect(second.hook.result.current.permissionGranted).toBe(false);
    expect(second.hook.result.current.status).toBe('idle');
    expect(refused.module.requestPermissionsAsync).not.toHaveBeenCalled();
    await second.hook.unmount();
  });

  it('is null with no module', async () => {
    const { hook } = await mount(null);
    expect(hook.result.current.permissionGranted).toBeNull();
    await hook.unmount();
  });

  it('start() never prompts: without permission it says denied and never listens', async () => {
    const engine = fakeEngine();
    engine.module.getPermissionsAsync.mockResolvedValue(UNDETERMINED);
    const { hook, start } = await mount(engine);
    await start();
    expect(engine.module.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(engine.module.start).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe('denied');
    expect(hook.result.current.permissionGranted).toBe(false);
    expect(engine.listeners()).toBe(0);
    // The microphone was never touched, so there is no audio session to hand back.
    expect(engine.module.setAudioSessionActiveIOS).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('says denied when Screen Time or a work profile restricts speech', async () => {
    const engine = fakeEngine();
    engine.module.getPermissionsAsync.mockResolvedValue({ ...UNDETERMINED, restricted: true });
    const { hook, start } = await mount(engine);
    await start();
    expect(engine.module.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe('denied');
    await hook.unmount();
  });

  it('listens straight away once granted', async () => {
    const engine = fakeEngine();
    const { hook, start } = await mount(engine);
    await start();
    expect(engine.module.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe('listening');
    await hook.unmount();
  });
});

describe('requestPermission, before the first hold', () => {
  it('prompts when iOS can still ask, shows asking meanwhile, and never listens', async () => {
    const engine = fakeEngine();
    let answer!: (value: Permission) => void;
    engine.module.getPermissionsAsync.mockResolvedValue(UNDETERMINED);
    engine.module.requestPermissionsAsync.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const { rtl, hook } = await mount(engine);

    let asking!: Promise<boolean>;
    await rtl.act(async () => {
      asking = hook.result.current.requestPermission();
    });
    expect(hook.result.current.status).toBe('asking');

    let granted: boolean | undefined;
    await rtl.act(async () => {
      answer(GRANTED);
      granted = await asking;
    });
    expect(granted).toBe(true);
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.permissionGranted).toBe(true);
    expect(engine.module.start).not.toHaveBeenCalled();
    expect(engine.module.addListener).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('resolves false and says denied when refused', async () => {
    const engine = fakeEngine();
    engine.module.getPermissionsAsync.mockResolvedValue(UNDETERMINED);
    engine.module.requestPermissionsAsync.mockResolvedValue(DENIED);
    const { rtl, hook } = await mount(engine);
    let granted: boolean | undefined;
    await rtl.act(async () => {
      granted = await hook.result.current.requestPermission();
    });
    expect(granted).toBe(false);
    expect(hook.result.current.status).toBe('denied');
    expect(hook.result.current.permissionGranted).toBe(false);
    await hook.unmount();
  });

  it('does not prompt when iOS can no longer ask, or when speech is restricted', async () => {
    for (const answer of [DENIED, { ...UNDETERMINED, restricted: true }]) {
      const engine = fakeEngine();
      engine.module.getPermissionsAsync.mockResolvedValue(answer);
      const { rtl, hook } = await mount(engine);
      let granted: boolean | undefined;
      await rtl.act(async () => {
        granted = await hook.result.current.requestPermission();
      });
      expect(granted).toBe(false);
      expect(engine.module.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(hook.result.current.status).toBe('denied');
      await hook.unmount();
    }
  });

  it('resolves true at once, without a prompt, when already granted', async () => {
    const engine = fakeEngine();
    const { rtl, hook } = await mount(engine);
    let granted: boolean | undefined;
    await rtl.act(async () => {
      granted = await hook.result.current.requestPermission();
    });
    expect(granted).toBe(true);
    expect(engine.module.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe('idle');
    await hook.unmount();
  });

  it('never throws: no module, or a prompt that rejects', async () => {
    const absent = await mount(null);
    let granted: boolean | undefined;
    await absent.rtl.act(async () => {
      granted = await absent.hook.result.current.requestPermission();
    });
    expect(granted).toBe(false);
    expect(absent.hook.result.current.status).toBe('unavailable');
    expect(absent.hook.result.current.permissionGranted).toBeNull();
    await absent.hook.unmount();

    const engine = fakeEngine();
    engine.module.getPermissionsAsync.mockResolvedValue(UNDETERMINED);
    engine.module.requestPermissionsAsync.mockRejectedValue(new Error('PermissionsModuleNotFound'));
    const { rtl, hook } = await mount(engine);
    await rtl.act(async () => {
      granted = await hook.result.current.requestPermission();
    });
    expect(granted).toBe(false);
    expect(hook.result.current.status).toBe('idle');
    expect(mockFailureMessage).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });

  it('leaves a live session alone', async () => {
    const engine = fakeEngine();
    const { rtl, hook, start } = await mount(engine);
    await start();
    await rtl.act(async () => {
      await hook.result.current.requestPermission();
    });
    expect(hook.result.current.status).toBe('listening');
    await hook.unmount();
  });
});

describe('refreshPermission, for coming back from Settings', () => {
  it('moves denied to idle once both are allowed, without prompting', async () => {
    const engine = fakeEngine();
    engine.module.getPermissionsAsync.mockResolvedValue(DENIED);
    const { rtl, hook, start } = await mount(engine);
    await start();
    expect(hook.result.current.status).toBe('denied');

    engine.module.getPermissionsAsync.mockResolvedValue(GRANTED);
    await rtl.act(() => hook.result.current.refreshPermission());
    expect(hook.result.current.status).toBe('idle');
    expect(engine.module.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(engine.module.start).not.toHaveBeenCalled();

    await start();
    expect(hook.result.current.status).toBe('listening');
    await hook.unmount();
  });

  it('stays denied while either switch is still off, and never prompts', async () => {
    const engine = fakeEngine();
    engine.module.getPermissionsAsync.mockResolvedValue(DENIED);
    const { rtl, hook, start } = await mount(engine);
    await start();

    // Microphone on, speech recognition still off: the combined answer is no.
    engine.module.getPermissionsAsync.mockResolvedValue({ ...DENIED, canAskAgain: true });
    await rtl.act(() => hook.result.current.refreshPermission());
    expect(hook.result.current.status).toBe('denied');
    expect(engine.module.requestPermissionsAsync).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('leaves every other state alone', async () => {
    const engine = fakeEngine();
    const { rtl, hook, start } = await mount(engine);
    await rtl.act(() => hook.result.current.refreshPermission());
    expect(hook.result.current.status).toBe('idle');

    await start();
    await rtl.act(() => hook.result.current.refreshPermission());
    expect(hook.result.current.status).toBe('listening');
    expect(engine.module.requestPermissionsAsync).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('never throws: no module, or a permission read that rejects', async () => {
    const absent = await mount(null);
    await absent.rtl.act(() => absent.hook.result.current.refreshPermission());
    expect(absent.hook.result.current.status).toBe('idle');
    await absent.hook.unmount();

    const engine = fakeEngine();
    engine.module.getPermissionsAsync.mockResolvedValue(DENIED);
    const { rtl, hook, start } = await mount(engine);
    await start();
    engine.module.getPermissionsAsync.mockRejectedValue(new Error('PermissionsModuleNotFound'));
    await rtl.act(() => hook.result.current.refreshPermission());
    expect(hook.result.current.status).toBe('denied');
    expect(mockFailureMessage).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });
});

describe('listening', () => {
  it('starts the engine the way the brief asks', async () => {
    const engine = fakeEngine();
    const strings = [
      'Netflix',
      ' netflix ',
      '',
      'Comcast',
      ...Array.from({ length: 150 }, (_, i) => `Shop ${i}`),
    ];
    const { hook, start } = await mount(engine, strings);
    await start();

    expect(engine.module.start).toHaveBeenCalledTimes(1);
    const request = engine.module.start.mock.calls[0][0];
    expect(request).toMatchObject({
      lang: 'en-US',
      interimResults: true,
      maxAlternatives: 3,
      continuous: false,
      requiresOnDeviceRecognition: true,
      iosTaskHint: 'dictation',
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
    });
    expect(request.contextualStrings).toHaveLength(100);
    expect(request.contextualStrings.slice(0, 3)).toEqual(['Netflix', 'Comcast', 'Shop 0']);
    expect(hook.result.current.status).toBe('listening');
    expect(hook.result.current.onDevice).toBe(true);
    await hook.unmount();
  });

  it('shows live words, then hands over distinct alternatives, best first, at most three', async () => {
    const engine = fakeEngine();
    const { hook, start, emit } = await mount(engine);
    await start();

    await emit('result', partial('Netflix fifteen'));
    expect(hook.result.current.interim).toBe('Netflix fifteen');
    expect(hook.result.current.alternatives).toEqual([]);

    await emit(
      'result',
      final(
        ' Netflix $15.99 ',
        'netflix  $15.99',
        '',
        'Netflix 1599',
        'Netflix 15 99',
        'Netflix 15.90',
      ),
    );
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.alternatives).toEqual([
      'Netflix $15.99',
      'Netflix 1599',
      'Netflix 15 99',
    ]);
    expect(hook.result.current.interim).toBe('Netflix $15.99');

    await emit('end');
    expect(engine.listeners()).toBe(0);
    expect(engine.module.setCategoryIOS).toHaveBeenCalledWith(BEFORE);
    expect(engine.module.setAudioSessionActiveIOS).toHaveBeenCalledWith(false, {
      notifyOthersOnDeactivation: true,
    });
    expect(mockFailureMessage).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('keeps the words it heard when iOS ends without a final result', async () => {
    const engine = fakeEngine();
    const { hook, start, emit } = await mount(engine);
    await start();
    await emit('result', partial('rent 1800'));
    await emit('error', { error: 'no-speech', message: 'No speech was detected.' });
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.alternatives).toEqual(['rent 1800']);
    expect(mockFailureMessage).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('comes back idle and empty when nothing was said', async () => {
    const engine = fakeEngine();
    const { hook, start, emit } = await mount(engine);
    await start();
    await emit('nomatch');
    await emit('end');
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.alternatives).toEqual([]);
    expect(engine.listeners()).toBe(0);
    await hook.unmount();
  });

  it('runs one session at a time', async () => {
    const engine = fakeEngine();
    const { hook, start } = await mount(engine);
    await start();
    await start();
    expect(engine.module.start).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });

  it('closes the microphone at the listening limit', async () => {
    const engine = fakeEngine();
    const { speech, rtl, hook, start, emit } = await mount(engine);
    await start();

    await rtl.act(() => jest.advanceTimersByTime(speech.LISTEN_LIMIT_MS - 1));
    expect(engine.module.stop).not.toHaveBeenCalled();
    await rtl.act(() => jest.advanceTimersByTime(1));
    expect(engine.module.stop).toHaveBeenCalledTimes(1);

    await emit('result', final('Spotify 11.99 monthly'));
    expect(hook.result.current.alternatives).toEqual(['Spotify 11.99 monthly']);
    await hook.unmount();
  });

  it('lets go of an engine that never says end', async () => {
    const engine = fakeEngine();
    const { speech, rtl, hook, start, emit } = await mount(engine);
    await start();
    await emit('result', partial('gas 45'));
    await rtl.act(() => hook.result.current.stop());
    expect(hook.result.current.status).toBe('listening');

    await rtl.act(() => jest.advanceTimersByTime(speech.SETTLE_LIMIT_MS));
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.alternatives).toEqual(['gas 45']);
    expect(engine.module.abort).toHaveBeenCalledTimes(1);
    expect(engine.listeners()).toBe(0);
    expect(engine.module.setAudioSessionActiveIOS).toHaveBeenCalledWith(false, {
      notifyOthersOnDeactivation: true,
    });
    await hook.unmount();
  });
});

describe('on-device or Apple servers', () => {
  it('uses Apple servers, and says so, when the phone cannot listen locally', async () => {
    const engine = fakeEngine();
    engine.module.supportsOnDeviceRecognition.mockReturnValue(false);
    const { hook, start } = await mount(engine);
    await start();
    expect(engine.module.start.mock.calls[0][0].requiresOnDeviceRecognition).toBe(false);
    expect(hook.result.current.onDevice).toBe(false);
    await hook.unmount();
  });

  it('still asks for on-device, but never claims it, when the phone is not in US English', async () => {
    mockLanguageTag = 'es-US';
    const engine = fakeEngine();
    const { hook, start } = await mount(engine);
    await start();
    expect(engine.module.start.mock.calls[0][0].requiresOnDeviceRecognition).toBe(true);
    expect(hook.result.current.onDevice).toBe(false);
    await hook.unmount();
  });
});

describe('supportsOnDevice, for the privacy line before anyone speaks', () => {
  it('is null without the module', () => {
    mockRequireOptionalNativeModule.mockReturnValue(null);
    expect(load().speech.supportsOnDevice()).toBeNull();
  });

  it('is null when the question throws', () => {
    const engine = fakeEngine();
    engine.module.supportsOnDeviceRecognition.mockImplementation(() => {
      throw new Error('no recognizer');
    });
    mockRequireOptionalNativeModule.mockReturnValue(engine.module);
    expect(load().speech.supportsOnDevice()).toBeNull();
  });

  it('answers the phone, and agrees with what the session later reports', async () => {
    for (const [supports, tag, expected] of [
      [true, 'en-US', true],
      [false, 'en-US', false],
      [true, 'es-US', false],
    ] as const) {
      mockLanguageTag = tag;
      const engine = fakeEngine();
      engine.module.supportsOnDeviceRecognition.mockReturnValue(supports);
      const { speech, hook, start } = await mount(engine);
      expect(speech.supportsOnDevice()).toBe(expected);
      await start();
      expect(hook.result.current.onDevice).toBe(expected);
      await hook.unmount();
    }
  });
});

describe('level, for the pulse', () => {
  it('rises with the voice, falls back slowly, and stays within 0–1', async () => {
    const engine = fakeEngine();
    const { hook, start, emit } = await mount(engine);
    await start();
    expect(hook.result.current.level).toBe(0);

    await emit('volumechange', { value: 8 });
    const first = hook.result.current.level;
    expect(first).toBeGreaterThan(0.4);
    expect(first).toBeLessThanOrEqual(0.8);

    await emit('volumechange', { value: 25 }); // out of range: clamped to 1
    expect(hook.result.current.level).toBeGreaterThan(first);
    expect(hook.result.current.level).toBeLessThanOrEqual(1);

    const loud = hook.result.current.level;
    await emit('volumechange', { value: -2 }); // inaudible
    expect(hook.result.current.level).toBeLessThan(loud);
    expect(hook.result.current.level).toBeGreaterThan(0);

    await emit('volumechange', { value: Number.NaN });
    expect(Number.isFinite(hook.result.current.level)).toBe(true);
    await hook.unmount();
  });

  it('does not re-render for a change too small to see', async () => {
    const engine = fakeEngine();
    let renders = 0;
    mockRequireOptionalNativeModule.mockReturnValue(engine.module);
    const { speech, rtl } = load();
    const hook = await rtl.renderHook(() => {
      renders += 1;
      return speech.useSpeechCapture({ contextualStrings: [] });
    });
    await rtl.act(() => hook.result.current.start());
    const before = renders;
    await rtl.act(() => engine.emit('volumechange', { value: 0.1 }));
    expect(renders).toBe(before);
    await hook.unmount();
  });

  it('drops to 0 when the session ends', async () => {
    const engine = fakeEngine();
    const { hook, start, emit } = await mount(engine);
    await start();
    await emit('volumechange', { value: 9 });
    expect(hook.result.current.level).toBeGreaterThan(0);
    await emit('result', final('electric bill 120'));
    expect(hook.result.current.level).toBe(0);
    await emit('volumechange', { value: 9 });
    expect(hook.result.current.level).toBe(0);
    await hook.unmount();
  });
});

describe('continuous, for hold-to-talk', () => {
  /** A result as the engine sends it: raw transcripts, untrimmed. */
  function heard(isFinal: boolean, ...transcripts: string[]) {
    return { isFinal, results: transcripts.map((transcript) => ({ transcript })) };
  }

  it('asks the engine to keep going through pauses, and is off by default', async () => {
    const engine = fakeEngine();
    const held = await mount(engine, ['Netflix'], true);
    await held.start();
    expect(engine.module.start.mock.calls[0][0].continuous).toBe(true);
    await held.hook.unmount();

    const other = fakeEngine();
    const tapped = await mount(other);
    await tapped.start();
    expect(other.module.start.mock.calls[0][0].continuous).toBe(false);
    await tapped.hook.unmount();
  });

  it('iOS 18: carries on past a pause and joins the segments, best readings first', async () => {
    const engine = fakeEngine();
    const { rtl, hook, start, emit } = await mount(engine, ['Netflix'], true);
    await start();

    await emit('result', heard(false, 'Netflix'));
    // iOS 18 marks the segment final at the pause; the session must not end.
    await emit('result', heard(true, 'Netflix', 'Net flicks'));
    expect(hook.result.current.status).toBe('listening');
    expect(hook.result.current.alternatives).toEqual([]);

    // Later words arrive alone, with a leading space.
    await emit('result', heard(false, ' fifteen'));
    expect(hook.result.current.interim).toBe('Netflix fifteen');
    await emit('nomatch');
    expect(hook.result.current.status).toBe('listening');
    await emit('result', heard(true, ' $15.99', ' 15.99'));
    expect(hook.result.current.interim).toBe('Netflix $15.99');

    await rtl.act(() => hook.result.current.stop());
    expect(engine.module.stop).toHaveBeenCalledTimes(1);
    expect(hook.result.current.status).toBe('listening');
    await emit('result', heard(true));
    await emit('end');

    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.alternatives).toEqual([
      'Netflix $15.99',
      'Netflix 15.99',
      'Net flicks $15.99',
    ]);
    expect(engine.listeners()).toBe(0);
    expect(mockFailureMessage).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('earlier iOS: the whole sentence each time, one final at the end', async () => {
    const engine = fakeEngine();
    const { rtl, hook, start, emit } = await mount(engine, ['Netflix'], true);
    await start();
    await emit('result', heard(false, 'Netflix'));
    await emit('result', heard(false, 'Netflix 15.99'));
    expect(hook.result.current.interim).toBe('Netflix 15.99');
    await rtl.act(() => hook.result.current.stop());
    await emit('result', heard(true, 'Netflix $15.99', 'Netflix 15.99'));
    expect(hook.result.current.status).toBe('listening');
    await emit('end');
    expect(hook.result.current.alternatives).toEqual(['Netflix $15.99', 'Netflix 15.99']);
    await hook.unmount();
  });

  it('keeps words still in flux when the session ends without their final', async () => {
    const engine = fakeEngine();
    const { rtl, hook, start, emit } = await mount(engine, ['Comcast'], true);
    await start();
    await emit('result', heard(true, 'Comcast'));
    await emit('result', heard(false, ' 89 a month'));
    await rtl.act(() => hook.result.current.stop());
    await emit('end');
    expect(hook.result.current.alternatives).toEqual(['Comcast 89 a month']);
    await hook.unmount();
  });

  it('does not say anything twice when a segment repeats what was already final', async () => {
    const engine = fakeEngine();
    const { hook, start, emit } = await mount(engine, ['rent'], true);
    await start();
    await emit('result', heard(true, 'rent'));
    await emit('result', heard(true, ' rent 1800'));
    await emit('end');
    expect(hook.result.current.alternatives).toEqual(['rent 1800']);
    await hook.unmount();
  });

  it('still ends at the listening limit, with everything heard', async () => {
    const engine = fakeEngine();
    const { speech, rtl, hook, start, emit } = await mount(engine, ['Spotify'], true);
    await start();
    await emit('result', heard(true, 'Spotify'));
    await rtl.act(() => jest.advanceTimersByTime(speech.LISTEN_LIMIT_MS));
    expect(engine.module.stop).toHaveBeenCalledTimes(1);
    await emit('end');
    expect(hook.result.current.alternatives).toEqual(['Spotify']);
    await hook.unmount();
  });
});

describe('a release before the microphone opens (a quick tap)', () => {
  it('during the permission read: idle, nothing heard, the engine never starts', async () => {
    const engine = fakeEngine();
    let answer!: (value: Permission) => void;
    const { rtl, hook } = await mount(engine, [], true);
    engine.module.getPermissionsAsync.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    let starting!: Promise<void>;
    await rtl.act(async () => {
      starting = hook.result.current.start();
    });
    await rtl.act(() => hook.result.current.stop());
    expect(hook.result.current.status).toBe('idle');
    await rtl.act(async () => {
      answer(GRANTED);
      await starting;
    });
    expect(engine.module.start).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.alternatives).toEqual([]);
    expect(engine.listeners()).toBe(0);
    expect(mockFailureMessage).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('after start, before the engine says start: aborts only once it does, and leaves no mic on', async () => {
    const engine = fakeEngine();
    const { rtl, hook, press, emit } = await mount(engine, [], true);
    await press();
    expect(engine.module.start).toHaveBeenCalledTimes(1);

    await rtl.act(() => hook.result.current.stop());
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.alternatives).toEqual([]);
    // Not yet: an abort now could be overtaken by the start already queued.
    expect(engine.module.abort).not.toHaveBeenCalled();
    expect(engine.module.stop).not.toHaveBeenCalled();

    // The engine opens the microphone; the dropped session shuts it at once.
    await emit('start');
    expect(engine.module.abort).toHaveBeenCalledTimes(1);
    await emit('result', heard(false, 'late words'));
    await emit('error', { error: 'aborted', message: 'Speech recognition aborted.' });
    await emit('end');

    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.interim).toBe('');
    expect(hook.result.current.alternatives).toEqual([]);
    expect(engine.listeners()).toBe(0);
    expect(engine.module.setAudioSessionActiveIOS).toHaveBeenCalledWith(false, {
      notifyOthersOnDeactivation: true,
    });
    expect(mockFailureMessage).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('lets go after the settle limit if the engine never says start', async () => {
    const engine = fakeEngine();
    const { speech, rtl, hook, press } = await mount(engine, [], true);
    await press();
    await rtl.act(() => hook.result.current.stop());
    await rtl.act(() => jest.advanceTimersByTime(speech.SETTLE_LIMIT_MS));
    expect(engine.module.abort).toHaveBeenCalledTimes(1);
    expect(engine.listeners()).toBe(0);
    expect(hook.result.current.status).toBe('idle');
    expect(mockFailureMessage).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('cancel in the same window behaves the same', async () => {
    const engine = fakeEngine();
    const { rtl, hook, press, emit } = await mount(engine, [], true);
    await press();
    await rtl.act(() => hook.result.current.cancel());
    expect(hook.result.current.status).toBe('idle');
    expect(engine.module.abort).not.toHaveBeenCalled();
    await emit('start');
    expect(engine.module.abort).toHaveBeenCalledTimes(1);
    await emit('end');
    expect(engine.listeners()).toBe(0);
    await hook.unmount();
  });

  it('a release once the microphone is open asks for the final as usual', async () => {
    const engine = fakeEngine();
    const { rtl, hook, start } = await mount(engine, [], true);
    await start();
    await rtl.act(() => hook.result.current.stop());
    expect(engine.module.stop).toHaveBeenCalledTimes(1);
    expect(engine.module.abort).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe('listening');
    await hook.unmount();
  });

  /** A result as the engine sends it. */
  function heard(isFinal: boolean, ...transcripts: string[]) {
    return { isFinal, results: transcripts.map((transcript) => ({ transcript })) };
  }
});

describe('cancel and unmount', () => {
  it('cancel aborts, ignores anything late, and cleans up on end', async () => {
    const engine = fakeEngine();
    const { rtl, hook, start, emit } = await mount(engine);
    await start();
    await emit('result', partial('Comcast forty'));

    await rtl.act(() => hook.result.current.cancel());
    expect(engine.module.abort).toHaveBeenCalledTimes(1);
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.interim).toBe('');
    expect(hook.result.current.alternatives).toEqual([]);

    // What the engine sends after an abort changes nothing on screen.
    await emit('result', final('Comcast fifty'));
    await emit('error', { error: 'aborted', message: 'Speech recognition aborted.' });
    expect(hook.result.current.alternatives).toEqual([]);
    expect(hook.result.current.status).toBe('idle');

    await emit('end');
    expect(engine.listeners()).toBe(0);
    expect(engine.module.setAudioSessionActiveIOS).toHaveBeenCalledWith(false, {
      notifyOthersOnDeactivation: true,
    });
    expect(mockFailureMessage).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('cancel while start() is still reading permission never starts the engine', async () => {
    const engine = fakeEngine();
    let answer!: (value: Permission) => void;
    const { rtl, hook } = await mount(engine);
    engine.module.getPermissionsAsync.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    let starting!: Promise<void>;
    await rtl.act(async () => {
      starting = hook.result.current.start();
    });
    await rtl.act(() => hook.result.current.cancel());
    await rtl.act(async () => {
      answer(GRANTED);
      await starting;
    });
    expect(engine.module.start).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe('idle');
    expect(engine.listeners()).toBe(0);
    await hook.unmount();
  });

  it('does not abort a session that already finished, so a second end cannot reach the next one', async () => {
    const engine = fakeEngine();
    const { rtl, hook, start, emit } = await mount(engine);
    await start();
    await emit('result', final('water bill 60'));
    await rtl.act(() => hook.result.current.cancel());
    expect(engine.module.abort).not.toHaveBeenCalled();
    await emit('end');
    expect(engine.listeners()).toBe(0);

    await start();
    expect(engine.module.start).toHaveBeenCalledTimes(2);
    expect(hook.result.current.status).toBe('listening');
    await hook.unmount();
  });

  it('unmounting mid-sentence aborts and hands the audio back', async () => {
    const engine = fakeEngine();
    const { rtl, hook, start } = await mount(engine);
    await start();
    await hook.unmount();
    expect(engine.module.abort).toHaveBeenCalledTimes(1);
    await rtl.act(() => engine.emit('end'));
    expect(engine.listeners()).toBe(0);
    expect(engine.module.setAudioSessionActiveIOS).toHaveBeenCalledWith(false, {
      notifyOthersOnDeactivation: true,
    });
  });
});

describe('interruptions (a call, Siri, an alarm)', () => {
  it('end the session quietly as idle, keeping the words already said', async () => {
    const engine = fakeEngine();
    // While a call holds the audio session, handing it back can fail.
    engine.module.setAudioSessionActiveIOS.mockImplementation(() => {
      throw new Error('Session deactivation failed');
    });
    const { hook, start, emit } = await mount(engine);
    await start();
    await emit('result', partial('Netflix 15.99 a month'));
    await emit('error', { error: 'interrupted', message: 'Audio session was interrupted' });

    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.alternatives).toEqual(['Netflix 15.99 a month']);
    expect(hook.result.current.interim).toBe('Netflix 15.99 a month');

    await emit('end');
    expect(engine.listeners()).toBe(0);
    expect(engine.module.setAudioSessionActiveIOS).toHaveBeenCalled();
    expect(mockFailureMessage).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('before any words, come back idle and empty, which reads as nothing heard', async () => {
    const engine = fakeEngine();
    const { hook, start, emit } = await mount(engine);
    await start();
    await emit('error', { error: 'interrupted', message: 'Audio session was interrupted' });
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.alternatives).toEqual([]);
    await emit('end');
    expect(engine.listeners()).toBe(0);
    expect(mockFailureMessage).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('keep their silence to themselves: an ordinary session still reports a failed hand-back', async () => {
    const engine = fakeEngine();
    engine.module.setAudioSessionActiveIOS.mockImplementation(() => {
      throw new Error('Session deactivation failed');
    });
    const { hook, start, emit } = await mount(engine);
    await start();
    await emit('result', final('rent 1800'));
    await emit('end');
    expect(mockFailureMessage).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });
});

describe('failures come back as a status, never as a throw', () => {
  it.each([
    ['not-allowed', 'denied'],
    ['service-not-allowed', 'unavailable'],
    ['language-not-supported', 'unavailable'],
    ['network', 'error'],
    ['audio-capture', 'error'],
    ['busy', 'error'],
  ])('maps the engine error %s to %s', async (code, status) => {
    const engine = fakeEngine();
    const { hook, start, emit } = await mount(engine);
    await start();
    await emit('error', { error: code, message: 'raw engine wording' });
    expect(hook.result.current.status).toBe(status);
    expect(hook.result.current.alternatives).toEqual([]);
    await emit('end');
    expect(engine.listeners()).toBe(0);
    await hook.unmount();
  });

  it('reports real engine failures, and not a refusal or a phone call', async () => {
    const engine = fakeEngine();
    const { hook, start, emit } = await mount(engine);
    await start();
    await emit('error', {
      error: 'network',
      message: 'Connection to speech process was invalidated.',
    });
    expect(mockFailureMessage).toHaveBeenCalledTimes(1);
    expect(mockFailureMessage.mock.calls[0][0]).toBeInstanceOf(Error);
    await hook.unmount();

    mockFailureMessage.mockReset();
    for (const code of ['not-allowed', 'interrupted', 'no-speech', 'service-not-allowed']) {
      const other = fakeEngine();
      const run = await mount(other);
      await run.start();
      await run.emit('error', { error: code, message: '' });
      await run.hook.unmount();
    }
    expect(mockFailureMessage).not.toHaveBeenCalled();
  });

  it('says unavailable, without a prompt, when Dictation is off', async () => {
    const engine = fakeEngine();
    engine.module.isRecognitionAvailable.mockReturnValue(false);
    const { hook, start } = await mount(engine);
    await start();
    expect(hook.result.current.status).toBe('unavailable');
    expect(engine.module.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(engine.module.start).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('survives the engine throwing on start', async () => {
    const engine = fakeEngine();
    engine.module.start.mockImplementation(() => {
      throw new Error('Argument of an incorrect type');
    });
    const { hook, press, emit } = await mount(engine);
    // A start that throws never opens the microphone, so no `start` event.
    await press();
    expect(hook.result.current.status).toBe('error');
    expect(mockFailureMessage).toHaveBeenCalledTimes(1);
    expect(engine.module.abort).toHaveBeenCalledTimes(1);
    await emit('end');
    expect(engine.listeners()).toBe(0);
    await hook.unmount();
  });

  it('survives the permission check rejecting', async () => {
    const engine = fakeEngine();
    engine.module.getPermissionsAsync.mockRejectedValue(new Error('PermissionsModuleNotFound'));
    const { hook, start } = await mount(engine);
    await start();
    expect(hook.result.current.status).toBe('error');
    // Reported twice: the read on mount, and the read in start().
    expect(mockFailureMessage).toHaveBeenCalledTimes(2);
    expect(mockFailureMessage.mock.calls[1][0]).toBeInstanceOf(Error);
    expect(engine.listeners()).toBe(0);
    await hook.unmount();
  });
});
