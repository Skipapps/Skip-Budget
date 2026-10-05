import * as Device from 'expo-device';
import { getLocales } from 'expo-localization';
import { requireOptionalNativeModule } from 'expo-modules-core';
// Types only: the package's own entry calls `requireNativeModule` on import, which throws in any
// build without the pod (Jest, web). Nothing here may import it as a value.
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { failureMessage } from '@/lib/failure';

/**
 * Speech to text for voice entry: Apple's recogniser, behind one hook, built for hold-to-talk.
 * Everything that can go wrong (no module, the Simulator, a refused permission, Dictation off, a
 * call mid-sentence) arrives as a status, never a thrown error or the engine's own wording.
 *
 * `idle` with alternatives means something was heard; `idle` with none means nothing was. An
 * interruption (a call, Siri, an alarm) is not an error: it ends as `idle` with what was said.
 */
export type SpeechStatus = 'idle' | 'asking' | 'listening' | 'denied' | 'unavailable' | 'error';

export type SpeechOptions = {
  /** Merchant and brand names the recogniser should favour. Capped at 100. */
  contextualStrings: string[];
  /**
   * Keep listening through pauses until `stop()`, the listening limit or an error (hold-to-talk).
   * Default false: iOS ends the session at the first pause (after about three seconds of silence
   * before iOS 18).
   */
  continuous?: boolean;
};

export type SpeechCapture = {
  /** `asking` only while `requestPermission()` has the iOS prompt up. */
  status: SpeechStatus;
  /** Live words while listening, every segment so far. */
  interim: string;
  /** Final alternatives, best first, at most 3. Empty until the session ends. */
  alternatives: string[];
  /** Whether the finished session ran on-device (false = Apple's servers). */
  onDevice: boolean;
  /** How loud the microphone is, 0–1, smoothed; 0 when not listening. For the pulse only. */
  level: number;
  /**
   * Whether both the microphone and speech recognition are allowed. Read without prompting; null
   * until the first read, and when there is no module.
   */
  permissionGranted: boolean | null;
  /**
   * Starts listening. Never prompts: without permission it ends in `denied` (`unavailable` with no
   * module or on the Simulator). A `stop()` or `cancel()` before the microphone is open ends
   * quietly as `idle` with no alternatives.
   */
  start: () => Promise<void>;
  /** Asks for the final result. `listening` holds until it arrives. */
  stop: () => void;
  /** Drops the session, nothing kept. */
  cancel: () => void;
  /** Re-reads permission without prompting (for when the app returns from Settings). */
  refreshPermission: () => Promise<void>;
  /**
   * Shows the iOS prompts if iOS can still ask (`asking` meanwhile) and resolves true once both are
   * allowed. Never starts listening.
   */
  requestPermission: () => Promise<boolean>;
};

/** Only what this file calls, checked against the package's own declaration. */
type SpeechModule = Pick<
  typeof ExpoSpeechRecognitionModule,
  | 'addListener'
  | 'start'
  | 'stop'
  | 'abort'
  | 'getPermissionsAsync'
  | 'requestPermissionsAsync'
  | 'isRecognitionAvailable'
  | 'supportsOnDeviceRecognition'
  | 'getAudioSessionCategoryAndOptionsIOS'
  | 'setCategoryIOS'
  | 'setAudioSessionActiveIOS'
>;

type AudioSnapshot = ReturnType<SpeechModule['getAudioSessionCategoryAndOptionsIOS']>;

/** Engine language: US English only. */
const LANG = 'en-US';
const MAX_ALTERNATIVES = 3;
const MAX_CONTEXTUAL_STRINGS = 100;
/** However long someone talks, the microphone closes after this. */
export const LISTEN_LIMIT_MS = 15_000;
/** How long to wait for the engine's `end` after a stop, cancel or outcome before letting go. */
export const SETTLE_LIMIT_MS = 4_000;
/** Meter updates; the engine's own default on iOS. */
const LEVEL_INTERVAL_MS = 100;
/** Share of the gap closed per update: up quickly, down slowly. */
const LEVEL_ATTACK = 0.6;
const LEVEL_RELEASE = 0.25;
const LEVEL_STEP = 0.02;

// iOS only until release. Resolved once: `requireOptionalNativeModule` answers null instead of
// throwing when the module is not in the build.
const native: SpeechModule | null = (() => {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireOptionalNativeModule<SpeechModule>('ExpoSpeechRecognition');
  } catch {
    return null;
  }
})();

/**
 * Whether this build can do voice at all. False on web, in Jest, and in any build without the
 * module. Says nothing about the phone's settings: Dictation off, a refused permission or the
 * Simulator come back from `start()` as `unavailable` or `denied`, so the page can explain.
 */
export function isSpeechAvailable(): boolean {
  return native != null;
}

/**
 * Whether a session started now would stay on the phone, for the privacy line shown before anyone
 * speaks. Null when unknown. True only when the phone can recognise on-device and its first
 * language is US English, the same rule `onDevice` reports afterwards. Ask once per page.
 */
export function supportsOnDevice(): boolean | null {
  if (!native) return null;
  try {
    return native.supportsOnDeviceRecognition() === true && phoneSpeaksUsEnglish();
  } catch {
    return null;
  }
}

function tidy(text: unknown): string {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
}

/** Trimmed, blank-free, first spelling wins (case-insensitive), capped. */
function distinct(texts: readonly unknown[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of texts) {
    const text = tidy(raw);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length === limit) break;
  }
  return out;
}

/**
 * Whether the phone's first language is US English.
 *
 * `isRecognitionAvailable()` and `supportsOnDeviceRecognition()` answer for the phone's own
 * language, but every session runs in en-US, so they are trusted only when the two match. Otherwise
 * the engine's own en-US checks decide and the page says "Apple's servers" even if the words stayed
 * on the device, the safe direction for a privacy statement.
 */
function phoneSpeaksUsEnglish(): boolean {
  try {
    return getLocales()[0]?.languageTag?.toLowerCase() === LANG.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Whether this run may open the microphone. False only on the iOS Simulator, unless
 * `EXPO_PUBLIC_SIMULATOR_VOICE=1` is set in `.env.local`.
 *
 * The Simulator routes the microphone through macOS, which prompts on first use and holds the input
 * until answered; its audio stack gives up after about nine seconds and Core Audio calls
 * `abort()` inside `AVAudioEngine.inputNode`, which no JS or Swift handler can catch. Phones do not
 * route through macOS and are unaffected.
 */
function microphoneAllowedHere(): boolean {
  if (Device.isDevice) return true;
  return process.env.EXPO_PUBLIC_SIMULATOR_VOICE === '1';
}

function ask(question: () => boolean): boolean {
  try {
    return question();
  } catch {
    return false;
  }
}

function report(thrown: unknown) {
  // The development log in dev, Sentry in a release build.
  failureMessage(thrown);
}

/** The audio session the app had before the microphone took it over. */
function snapshotAudio(module: SpeechModule): AudioSnapshot | null {
  try {
    return module.getAudioSessionCategoryAndOptionsIOS();
  } catch {
    return null;
  }
}

/**
 * Hand the audio session back. The recogniser switches the app to play-and-record and never undoes
 * it, so other apps' audio stays interrupted until the session is deactivated with
 * `notifyOthersOnDeactivation`.
 */
function restoreAudio(module: SpeechModule, snapshot: AudioSnapshot | null, quiet: boolean) {
  if (snapshot) {
    try {
      module.setCategoryIOS({
        category: snapshot.category,
        categoryOptions: snapshot.categoryOptions,
        mode: snapshot.mode,
      });
    } catch (thrown) {
      if (!quiet) report(thrown);
    }
  }
  try {
    module.setAudioSessionActiveIOS(false, { notifyOthersOnDeactivation: true });
  } catch (thrown) {
    if (!quiet) report(thrown);
  }
}

type Outcome = { status: SpeechStatus; alternatives: string[] };

type CaptureState = Omit<
  SpeechCapture,
  'start' | 'stop' | 'cancel' | 'refreshPermission' | 'requestPermission'
>;

const IDLE: CaptureState = {
  status: 'idle',
  interim: '',
  alternatives: [],
  onDevice: false,
  level: 0,
  permissionGranted: null,
};

/** Back to rest, keeping what is known about the phone. */
function rest(current: CaptureState, status: SpeechStatus = 'idle'): CaptureState {
  return { ...current, status, interim: '', alternatives: [], level: 0 };
}

type Session = {
  module: SpeechModule;
  /** Writes to the hook's state while this is still the page's session. */
  publish: (patch: Partial<CaptureState>) => void;
  continuous: boolean;
  /** `start()` has been called on the engine. */
  started: boolean;
  /** The engine said `start`: the microphone is open. */
  live: boolean;
  /** `stop()` has been asked for; waiting on the final result. */
  stopping: boolean;
  /** The outcome is on screen. Later events are ignored. */
  settled: boolean;
  /** Cancelled, released early, or unmounted. Nothing more is published. */
  cancelled: boolean;
  /** Ended by an interruption: nothing about it is reported. */
  quiet: boolean;
  closed: boolean;
  /** Alternatives for the words iOS has already finalised, best first. */
  committed: string[];
  /** Words still in flux, and whether they follow `committed` or replace it. */
  pending: string;
  pendingFollows: boolean;
  level: number;
  shownLevel: number;
  subscriptions: { remove: () => void }[];
  limitTimer: ReturnType<typeof setTimeout> | null;
  settleTimer: ReturnType<typeof setTimeout> | null;
  audio: AudioSnapshot | null;
  /** Resolves once closed, so the next session never overlaps this one. */
  done: Promise<void>;
  resolveDone: () => void;
};

function openSession(
  module: SpeechModule,
  continuous: boolean,
  publish: Session['publish'],
): Session {
  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  return {
    module,
    publish,
    continuous,
    started: false,
    live: false,
    stopping: false,
    settled: false,
    cancelled: false,
    quiet: false,
    closed: false,
    committed: [],
    pending: '',
    pendingFollows: false,
    level: 0,
    shownLevel: 0,
    subscriptions: [],
    limitTimer: null,
    settleTimer: null,
    audio: null,
    done,
    resolveDone,
  };
}

function closeSession(session: Session) {
  if (session.closed) return;
  session.closed = true;
  if (session.limitTimer) clearTimeout(session.limitTimer);
  if (session.settleTimer) clearTimeout(session.settleTimer);
  session.limitTimer = null;
  session.settleTimer = null;
  for (const subscription of session.subscriptions) {
    try {
      subscription.remove();
    } catch {
      // A listener that will not detach can no longer reach a closed session.
    }
  }
  session.subscriptions = [];
  if (session.started) restoreAudio(session.module, session.audio, session.quiet);
  session.resolveDone();
}

/** Give the engine a moment to say `end`, then let go: a session that never ends holds the mic. */
function armSettleTimer(session: Session) {
  if (session.closed || session.settleTimer) return;
  session.settleTimer = setTimeout(() => {
    session.settleTimer = null;
    settle(session, { status: 'idle', alternatives: salvage(session) });
    if (session.closed) return;
    try {
      session.module.abort();
    } catch {
      // Already gone, which is what was wanted.
    }
    closeSession(session);
  }, SETTLE_LIMIT_MS);
}

/**
 * Every reading of what came before, joined to every reading of the newest
 * words: best combinations first (lowest summed rank), distinct, at most 3.
 */
function joinSegments(before: string[], after: string[]): string[] {
  if (!before.length) return distinct(after, MAX_ALTERNATIVES);
  if (!after.length) return before;
  const ranked: { rank: number; text: string }[] = [];
  before.forEach((first, i) => {
    after.forEach((next, j) => ranked.push({ rank: i + j, text: `${first} ${next}` }));
  });
  ranked.sort((a, b) => a.rank - b.rank);
  return distinct(
    ranked.map((entry) => entry.text),
    MAX_ALTERNATIVES,
  );
}

function spokenSoFar(session: Session): string[] {
  if (!session.pending) return session.committed;
  if (session.pendingFollows) return joinSegments(session.committed, [session.pending]);
  return [session.pending];
}

/** What the session ends with when the engine never gave a final result. */
function salvage(session: Session): string[] {
  return spokenSoFar(session);
}

function heardSoFar(session: Session): string {
  return spokenSoFar(session)[0] ?? '';
}

function settle(session: Session, outcome: Outcome) {
  if (session.settled || session.cancelled) return;
  session.settled = true;
  if (session.limitTimer) clearTimeout(session.limitTimer);
  session.limitTimer = null;
  session.publish({
    status: outcome.status,
    alternatives: outcome.alternatives,
    interim: outcome.status === 'idle' ? (outcome.alternatives[0] ?? heardSoFar(session)) : '',
    level: 0,
  });
  if (session.started) armSettleTimer(session);
  else closeSession(session);
}

/**
 * Whether new words carry on from the ones already final. In continuous mode iOS 18 closes a
 * segment at each pause and sends later words alone, with a leading space; earlier iOS resends the
 * whole sentence. A segment that repeats the words already final is a replacement.
 */
function carriesOn(session: Session, raw: unknown, text: string | undefined): boolean {
  const before = session.committed[0];
  if (!before || !text || typeof raw !== 'string' || !/^\s/.test(raw)) return false;
  return !text.toLowerCase().startsWith(before.toLowerCase());
}

function onResult(session: Session, event: ExpoSpeechRecognitionResultEvent) {
  if (session.settled || session.cancelled) return;
  const results = event?.results ?? [];
  const texts = distinct(
    results.map((result) => result?.transcript),
    MAX_ALTERNATIVES,
  );

  if (!session.continuous) {
    if (event?.isFinal) {
      // A final result ends the sentence; iOS tears the task down right after it.
      settle(session, { status: 'idle', alternatives: texts.length ? texts : salvage(session) });
      return;
    }
    if (texts[0]) {
      session.pending = texts[0];
      session.pendingFollows = false;
      session.publish({ interim: texts[0] });
    }
    return;
  }

  // Continuous: nothing settles here. The session ends at `end`, after `stop()`, the listening
  // limit or an error.
  const follows = carriesOn(session, results[0]?.transcript, texts[0]);
  if (event?.isFinal) {
    if (texts.length) session.committed = follows ? joinSegments(session.committed, texts) : texts;
    session.pending = '';
    session.pendingFollows = false;
  } else if (texts[0]) {
    session.pending = texts[0];
    session.pendingFollows = follows;
  } else {
    return;
  }
  const heard = heardSoFar(session);
  if (heard) session.publish({ interim: heard });
}

function onError(session: Session, event: ExpoSpeechRecognitionErrorEvent) {
  if (session.settled || session.cancelled) return;
  switch (event?.error) {
    case 'aborted':
      // Only this file aborts, and every abort follows a cancel or a settle.
      return;
    case 'not-allowed':
      session.publish({ permissionGranted: false });
      settle(session, { status: 'denied', alternatives: [] });
      return;
    case 'service-not-allowed':
    case 'language-not-supported':
      // Siri & Dictation off, assets missing, or no recogniser for en-US.
      settle(session, { status: 'unavailable', alternatives: [] });
      return;
    case 'no-speech':
      // iOS can say this even after partial words; keep them if there were any.
      settle(session, { status: 'idle', alternatives: salvage(session) });
      return;
    case 'interrupted':
      // A call, Siri or an alarm took the microphone. Not a failure: keep what was said. Nothing is
      // reported, including the audio hand-back, which can fail while the call holds the session.
      session.quiet = true;
      settle(session, { status: 'idle', alternatives: salvage(session) });
      return;
    default:
      report(new Error(`Speech recognition failed (${event?.error}): ${event?.message}`));
      settle(session, { status: 'error', alternatives: [] });
  }
}

/**
 * The engine's meter as a calm 0–1: iOS sends -2 to 10 (at or below 0 is inaudible). Rises quickly,
 * falls slowly, and re-renders only when the value moves enough to see.
 */
function onVolume(session: Session, event: { value: number }) {
  if (session.settled || session.cancelled) return;
  const raw = typeof event?.value === 'number' && Number.isFinite(event.value) ? event.value : 0;
  const target = Math.min(1, Math.max(0, raw / 10));
  const rate = target > session.level ? LEVEL_ATTACK : LEVEL_RELEASE;
  session.level += (target - session.level) * rate;
  if (Math.abs(session.level - session.shownLevel) < LEVEL_STEP) return;
  session.shownLevel = Math.round(session.level * 100) / 100;
  session.publish({ level: session.shownLevel });
}

/**
 * The engine says the microphone is open. A session dropped while opening (a quick tap) is aborted
 * now, when the abort can no longer be overtaken by the start still on its way.
 */
function onLive(session: Session) {
  session.live = true;
  if (session.closed || (!session.cancelled && !session.settled)) return;
  try {
    session.module.abort();
  } catch {
    // Nothing left to stop.
  }
  // Wait for this abort's `end`, measured from now.
  if (session.settleTimer) clearTimeout(session.settleTimer);
  session.settleTimer = null;
  armSettleTimer(session);
}

function listen(session: Session) {
  const { module } = session;
  session.subscriptions = [
    module.addListener('start', () => onLive(session)),
    module.addListener('result', (event) => onResult(session, event)),
    module.addListener('error', (event) => onError(session, event)),
    module.addListener('volumechange', (event) => onVolume(session, event)),
    module.addListener('nomatch', () => {
      // In continuous mode iOS can say this between segments; carry on until `stop()`.
      if (session.continuous) return;
      settle(session, { status: 'idle', alternatives: salvage(session) });
    }),
    module.addListener('end', () => {
      settle(session, { status: 'idle', alternatives: salvage(session) });
      closeSession(session);
    }),
  ];
}

/** Ask for the final result; the release and the listening limit land here. */
function finishListening(session: Session) {
  if (!session.live || session.stopping || session.settled || session.cancelled) return;
  session.stopping = true;
  if (session.limitTimer) clearTimeout(session.limitTimer);
  session.limitTimer = null;
  try {
    session.module.stop();
  } catch (thrown) {
    report(thrown);
    settle(session, { status: 'error', alternatives: [] });
    try {
      // Do not leave the microphone open on an engine that would not stop.
      session.module.abort();
    } catch {
      // The settle timer closes the session either way.
    }
    return;
  }
  armSettleTimer(session);
}

/** The listening limit: the final result if the microphone is open, else let go. */
function onLimit(session: Session) {
  if (session.live) finishListening(session);
  else settle(session, { status: 'idle', alternatives: salvage(session) });
}

/** Drop the session without an outcome: cancel, a release before the mic opened, or unmount. */
function abandon(session: Session) {
  if (session.cancelled || session.closed) return;
  session.cancelled = true;
  if (session.limitTimer) clearTimeout(session.limitTimer);
  session.limitTimer = null;
  if (!session.started) {
    // Not handed to the engine yet; `start()` sees the flag when it resumes.
    closeSession(session);
    return;
  }
  if (session.settled) {
    // The engine is already winding down and its `end` is on the way. Aborting now would send a
    // second `end`, which could land on the next session and close it before it began.
    return;
  }
  if (!session.live) {
    // The microphone is still opening. An abort sent now can be overtaken by the start already
    // queued in the engine, leaving the microphone on with nobody listening. `onLive` aborts when
    // the engine says `start`; the settle timer covers an engine that never does.
    armSettleTimer(session);
    return;
  }
  try {
    session.module.abort();
  } catch {
    closeSession(session);
    return;
  }
  // The engine answers with `end`, which closes the session; the timer covers one that never does.
  armSettleTimer(session);
}

function cleanContext(strings: readonly string[]): string[] {
  return distinct(strings, MAX_CONTEXTUAL_STRINGS);
}

/** Whether a session is between `start()` and its outcome. */
function inSession(session: Session | null): boolean {
  return !!session && !session.closed && !session.settled && !session.cancelled;
}

/**
 * One voice capture at a time, owned by the page that calls it. For hold-to-talk:
 * `requestPermission()` first (the iOS prompts interrupt a press), then `start()` on press and
 * `stop()` on release. `cancel()` and unmounting drop the session and hand the audio back.
 */
export function useSpeechCapture(options: SpeechOptions): SpeechCapture {
  const { contextualStrings, continuous = false } = options;
  const [state, setState] = useState<CaptureState>(IDLE);
  // Sessions are driven by native events, outside render, so they live in refs.
  const live = useRef<Session | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const module = native;
    if (module) {
      void (async () => {
        try {
          const permission = await module.getPermissionsAsync();
          if (!mounted.current) return;
          const granted = permission.granted === true;
          setState((current) =>
            current.permissionGranted === null
              ? { ...current, permissionGranted: granted }
              : current,
          );
        } catch (thrown) {
          report(thrown);
        }
      })();
    }
    return () => {
      mounted.current = false;
      if (live.current) abandon(live.current);
    };
  }, []);

  const start = useCallback(async () => {
    const module = native;
    if (!module || !microphoneAllowedHere()) {
      // No module, or the Simulator (see `microphoneAllowedHere`): explain, never touch audio.
      setState((current) => rest(current, 'unavailable'));
      return;
    }

    const previous = live.current;
    // One at a time: a second press while starting or listening does nothing.
    if (inSession(previous)) return;

    const session = openSession(module, continuous, (patch) => {
      if (!mounted.current || live.current !== session || session.cancelled) return;
      setState((current) => ({ ...current, ...patch }));
    });
    live.current = session;
    setState((current) => ({ ...rest(current), onDevice: false }));

    // Released, cancelled or unmounted while this was waiting.
    const stale = () => session.cancelled || !mounted.current;

    try {
      if (previous && !previous.closed) {
        // Let the last session's `end` land first: a late `end` would otherwise close this session.
        await previous.done;
      }
      if (stale()) {
        closeSession(session);
        return;
      }

      const usEnglish = phoneSpeaksUsEnglish();
      if (usEnglish && !ask(() => module.isRecognitionAvailable())) {
        // Siri & Dictation off, or offline on a phone that cannot listen locally.
        settle(session, { status: 'unavailable', alternatives: [] });
        return;
      }

      const permission = await module.getPermissionsAsync();
      if (stale()) {
        closeSession(session);
        return;
      }
      const granted = permission.granted === true;
      session.publish({ permissionGranted: granted });
      if (!granted) {
        // Never prompts here: a prompt would interrupt the press. The page asks first.
        settle(session, { status: 'denied', alternatives: [] });
        return;
      }

      const local = ask(() => module.supportsOnDeviceRecognition());
      const request: ExpoSpeechRecognitionOptions = {
        lang: LANG,
        interimResults: true,
        maxAlternatives: MAX_ALTERNATIVES,
        continuous,
        // On the phone whenever it can; Apple's servers otherwise. The engine applies this only
        // when the en-US recogniser itself supports it.
        requiresOnDeviceRecognition: local,
        addsPunctuation: false,
        contextualStrings: cleanContext(contextualStrings),
        // Closest to the keyboard's own dictation, which is how people will talk.
        iosTaskHint: 'dictation',
        // The engine's default, spelled out: other audio pauses (rather than ducking into the
        // microphone) and resumes when `restoreAudio` lets go.
        iosCategory: {
          category: 'playAndRecord',
          categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
          mode: 'measurement',
        },
        // Feeds `level`: a separate tap on its own mixer, off the path the recogniser listens to.
        volumeChangeEventOptions: { enabled: true, intervalMillis: LEVEL_INTERVAL_MS },
      };

      session.audio = snapshotAudio(module);
      listen(session);
      session.started = true;
      module.start(request);
      // The same rule as `supportsOnDevice()`, so the page's line and this agree.
      session.publish({ status: 'listening', onDevice: local && usEnglish });
      session.limitTimer = setTimeout(() => onLimit(session), LISTEN_LIMIT_MS);
    } catch (thrown) {
      report(thrown);
      // Closes at once if the engine never started; otherwise waits for `end`.
      settle(session, { status: 'error', alternatives: [] });
      if (session.started) {
        try {
          module.abort();
        } catch {
          // Nothing left to stop; the settle timer closes the session.
        }
      }
    }
  }, [contextualStrings, continuous]);

  const stop = useCallback(() => {
    const session = live.current;
    if (!inSession(session) || !session) return;
    if (session.live) {
      finishListening(session);
      return;
    }
    // Released before the microphone opened (a quick tap): drop it quietly.
    abandon(session);
    if (mounted.current) setState((current) => rest(current));
  }, []);

  const cancel = useCallback(() => {
    if (live.current) abandon(live.current);
    setState((current) => rest(current));
  }, []);

  const refreshPermission = useCallback(async () => {
    const module = native;
    if (!module) return;
    let granted = false;
    try {
      const permission = await module.getPermissionsAsync();
      granted = permission.granted === true;
    } catch (thrown) {
      report(thrown);
      return;
    }
    if (!mounted.current) return;
    // Only a page showing `denied` moves; a session that started meanwhile is past it already.
    setState((current) => ({
      ...(current.status === 'denied' && granted ? rest(current) : current),
      permissionGranted: granted,
    }));
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const module = native;
    // Status changes only outside a session; a live one keeps its own.
    const show = (status: SpeechStatus) => {
      if (mounted.current && !inSession(live.current)) {
        setState((current) => rest(current, status));
      }
    };
    if (!module) {
      show('unavailable');
      return false;
    }
    try {
      let permission = await module.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain && !permission.restricted) {
        show('asking');
        // Speech recognition first, then the microphone (one call, two prompts).
        permission = await module.requestPermissionsAsync();
      }
      const granted = permission.granted === true;
      if (mounted.current) {
        setState((current) => ({
          ...(inSession(live.current) ? current : rest(current, granted ? 'idle' : 'denied')),
          permissionGranted: granted,
        }));
      }
      return granted;
    } catch (thrown) {
      report(thrown);
      if (mounted.current) {
        setState((current) => (current.status === 'asking' ? rest(current) : current));
      }
      return false;
    }
  }, []);

  return { ...state, start, stop, cancel, refreshPermission, requestPermission };
}
