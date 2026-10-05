import * as Device from 'expo-device';
import { getLocales } from 'expo-localization';
import { requireOptionalNativeModule } from 'expo-modules-core';
// Types only. The package's own entry calls `requireNativeModule` the moment
// it is imported, which throws in any build without the pod (Jest, web, an
// install made before voice shipped). Nothing here may import it as a value.
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
 * Speech to text for voice entry: Apple's recogniser, behind one hook.
 *
 * Built for hold-to-talk. The page reads `permissionGranted`, calls
 * `requestPermission()` when it is not yet granted (the iOS prompts interrupt
 * a press, so the person holds again afterwards), then calls `start()` on
 * press and `stop()` on release, with `continuous: true` so a pause does not
 * end the sentence. `start()` itself never prompts.
 *
 * Everything that can go wrong — a build without the module, the Simulator, a
 * refused permission, Dictation turned off, a phone call mid-sentence —
 * arrives as a status, never as a thrown error and never as the engine's own
 * wording. The page shows `FAILURE_MESSAGE` for `error`.
 *
 * Reading the result: `idle` with alternatives means something was heard;
 * `idle` with none after a `start()` means nothing was (silence, a release
 * before the microphone opened, or the cap ran out with no words). An
 * interruption (a call, Siri, an alarm) is not an error: it ends the session
 * as `idle` with whatever was said before it. `error` is kept for real
 * failures.
 */
export type SpeechStatus = 'idle' | 'asking' | 'listening' | 'denied' | 'unavailable' | 'error';

export type SpeechOptions = {
  /** Merchant and brand names the recogniser should favour. Capped at 100. */
  contextualStrings: string[];
  /**
   * Keep listening through pauses until `stop()`, the listening limit or an
   * error. For hold-to-talk. Default false: iOS ends the session at the first
   * pause (after about three seconds of silence before iOS 18).
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
  /**
   * How loud the microphone is, 0–1, smoothed, about ten updates a second
   * while listening; 0 otherwise. For the pulse, not for logic.
   */
  level: number;
  /**
   * Whether both the microphone and speech recognition are allowed. Read on
   * mount and by `refreshPermission()`, `requestPermission()` and `start()`,
   * never by prompting. Null until the first read, and when there is no module.
   */
  permissionGranted: boolean | null;
  /**
   * Starts listening. Never prompts: without permission it ends in `denied`
   * (`unavailable` with no module or on the Simulator). A `stop()` or
   * `cancel()` that arrives before the microphone is open drops the session
   * quietly: `idle`, no alternatives.
   */
  start: () => Promise<void>;
  /** Asks for the final result. `listening` holds until it arrives. */
  stop: () => void;
  /** Drops the session, nothing kept. */
  cancel: () => void;
  /**
   * Re-reads permission without ever prompting, for the page to call when the
   * app comes back from Settings. Moves `denied` to `idle` once both the
   * microphone and speech recognition are allowed; otherwise changes nothing
   * but `permissionGranted`. Never throws.
   */
  refreshPermission: () => Promise<void>;
  /**
   * Shows the iOS prompts if iOS can still ask (`asking` meanwhile), and
   * resolves true once both are allowed. Never starts listening. Never throws.
   * Outside a session it also moves the status to `idle` (granted) or `denied`
   * (refused, or refused before), and to `unavailable` with no module.
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

/** Engine language. USD only, US English only (brief, correction 8). */
const LANG = 'en-US';
const MAX_ALTERNATIVES = 3;
/** Apple's guidance for `contextualStrings` is "up to 100 phrases". */
const MAX_CONTEXTUAL_STRINGS = 100;
/** However long someone talks, the microphone closes after this. */
export const LISTEN_LIMIT_MS = 15_000;
/**
 * After a stop, a cancel or an outcome, how long to wait for the engine's
 * `end` before letting go of it anyway. `end` normally lands within
 * milliseconds; this only matters if the native side misbehaves.
 */
export const SETTLE_LIMIT_MS = 4_000;
/** Meter updates; the engine's own default on iOS. */
const LEVEL_INTERVAL_MS = 100;
/** Share of the gap closed per update: up quickly, down slowly. */
const LEVEL_ATTACK = 0.6;
const LEVEL_RELEASE = 0.25;
/** Smaller moves than this are not worth a render. */
const LEVEL_STEP = 0.02;

// iOS only until release (brief, correction 10). Resolved once, the same way
// modules/receipt-scanner does it: `requireOptionalNativeModule` answers null
// instead of throwing when the module is not in the build.
const native: SpeechModule | null = (() => {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireOptionalNativeModule<SpeechModule>('ExpoSpeechRecognition');
  } catch {
    return null;
  }
})();

/**
 * Whether this build can do voice at all. False on web, in Jest, and in any
 * install made before the module shipped. Never throws.
 *
 * Deliberately says nothing about the phone's settings: Dictation switched
 * off or a refused permission come back from `start()` as `unavailable` or
 * `denied`, so the page can explain instead of the mic silently vanishing.
 * The iOS Simulator is the same: true here, `unavailable` from `start()`.
 */
export function isSpeechAvailable(): boolean {
  return native != null;
}

/**
 * Whether a session started now would stay on the phone, for the privacy line
 * the page shows before anyone speaks. Null when it cannot be known (no
 * module, or the question throws). Never throws.
 *
 * True only when the phone can recognise on-device *and* its first language is
 * US English (see `phoneSpeaksUsEnglish`), which is the same rule `onDevice`
 * reports after a session, so the line before and the answer after agree.
 * Builds a recogniser to answer, so ask once per page, not on every render.
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
 * `isRecognitionAvailable()` and `supportsOnDeviceRecognition()` ask about the
 * recogniser for the phone's own language, while every session runs in US
 * English. Their answers only describe this session when the two match, so
 * they are trusted only then. Anywhere else the engine's own en-US checks
 * decide, and the page says "Apple's servers" even if the words stayed on the
 * device — the safe direction for a privacy statement.
 */
function phoneSpeaksUsEnglish(): boolean {
  try {
    return getLocales()[0]?.languageTag?.toLowerCase() === LANG.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Whether this run may open the microphone at all. False only on the iOS
 * Simulator, unless a developer opts in.
 *
 * The Simulator's microphone goes through the Mac's own audio server. The
 * first time any simulated app opens it, macOS asks "Simulator would like to
 * access the microphone", and the server holds the input until someone
 * answers. The Simulator's audio stack gives up after about nine seconds and
 * Core Audio calls `abort()` inside `AVAudioEngine.inputNode`. No JS or Swift
 * handler can catch that. It is what crashed the app on 2026-10-01 (the macOS
 * log shows the prompt at 16:44:15, the abort at 16:44:24 and the answer at
 * 16:45:01). Every public report of the same stack found so far is a Simulator
 * or a CI virtual Mac. Phones do not route through macOS and are unaffected.
 *
 * So on the Simulator `start()` says `unavailable` without touching audio. A
 * developer whose Mac has already answered that prompt can set
 * `EXPO_PUBLIC_SIMULATOR_VOICE=1` in `.env.local` to try voice there anyway.
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
 * Hand the audio session back.
 *
 * The recogniser switches the app to play-and-record and activates it, and
 * never undoes either: music or a podcast the person was playing stays
 * interrupted and the app keeps the session. Putting the old category back and
 * deactivating with `notifyOthersOnDeactivation` tells the other app it may
 * resume.
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
  /** Listening through pauses until `stop()` (hold-to-talk). */
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
  /** Listeners gone, timers cleared, audio handed back. */
  closed: boolean;
  /** Alternatives for the words iOS has already finalised, best first. */
  committed: string[];
  /** Words still in flux, and whether they follow `committed` or replace it. */
  pending: string;
  pendingFollows: boolean;
  /** Smoothed microphone level, and the last value put on screen. */
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

/**
 * Give the engine a moment to say `end`, then let go regardless.
 *
 * Without this a native session that never ends would hold the microphone and
 * keep the page on "listening" forever.
 */
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

/** Everything heard so far, as alternatives, best first. */
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
 * Whether new words carry on from the ones already final.
 *
 * In continuous mode iOS 18 closes a segment at each pause and marks it final;
 * the engine then sends later words alone, with a leading space. Earlier iOS
 * sends the whole sentence every time and one final at the end. A segment
 * that turns out to repeat the words already final is treated as a
 * replacement, so nothing is said twice.
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
      // A final result is the end of the sentence; iOS tears the task down
      // right after it.
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

  // Continuous: nothing settles here. The session ends at `end`, after
  // `stop()`, the listening limit or an error.
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
      // A phone call, Siri or an alarm took the microphone. Not a failure: the
      // session just ends, keeping whatever was said before it, so a full
      // sentence still reaches review. Nothing is reported, including the
      // audio hand-back, which can fail while the call holds the session.
      session.quiet = true;
      settle(session, { status: 'idle', alternatives: salvage(session) });
      return;
    default:
      report(new Error(`Speech recognition failed (${event?.error}): ${event?.message}`));
      settle(session, { status: 'error', alternatives: [] });
  }
}

/**
 * The engine's meter, turned into a calm 0–1.
 *
 * iOS sends -2 to 10, where anything at or below 0 is inaudible (about -50 dB);
 * 10 is full scale. Rises quickly, falls slowly, and only re-renders the page
 * when the value moves enough to see.
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
 * The engine says the microphone is open. A session that was dropped while it
 * was opening (a quick tap) is aborted now, when an abort can no longer be
 * overtaken by the start still on its way.
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
      // In continuous mode iOS can say this between segments; the session
      // carries on until `stop()`.
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

/**
 * Drop the session without an outcome: cancel, a release before the
 * microphone opened, or the page going away.
 */
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
    // The engine is already winding down and its `end` is on the way (the
    // settle timer is armed). Aborting now would send a second `end`, which
    // could land on the next session and close it before it began.
    return;
  }
  if (!session.live) {
    // The microphone is still opening. An abort sent now can be overtaken by
    // the start already queued in the engine, which would leave the
    // microphone on with nobody listening. `onLive` aborts when the engine
    // says `start`; the settle timer covers an engine that never does.
    armSettleTimer(session);
    return;
  }
  try {
    session.module.abort();
  } catch {
    closeSession(session);
    return;
  }
  // The engine answers with `end`, which closes the session and hands the
  // audio back; the timer covers an engine that never does.
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
 * One voice capture at a time, owned by the page that calls it.
 *
 * Hold-to-talk: `start()` on press, `stop()` on release, `continuous: true`.
 * `start()` never prompts; `requestPermission()` does, before the press.
 * `cancel()` and unmounting drop the session without a result and hand the
 * audio session back.
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
      // What the page should offer before anyone presses: read, never asked.
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
      // No module, or the Simulator (see `microphoneAllowedHere`): explain,
      // never reach the audio engine.
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
        // Let the last session's `end` land first. The engine resets itself on
        // start, and a late `end` would otherwise close this session.
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
        // Never prompts here: a prompt would interrupt the press. The page
        // asks first with `requestPermission()`.
        settle(session, { status: 'denied', alternatives: [] });
        return;
      }

      const local = ask(() => module.supportsOnDeviceRecognition());
      const request: ExpoSpeechRecognitionOptions = {
        lang: LANG,
        interimResults: true,
        maxAlternatives: MAX_ALTERNATIVES,
        continuous,
        // On the phone whenever it can; Apple's servers otherwise (Founder,
        // 2026-10-01). The engine applies this only when the en-US recogniser
        // itself supports it.
        requiresOnDeviceRecognition: local,
        addsPunctuation: false,
        contextualStrings: cleanContext(contextualStrings),
        // Closest to the keyboard's own dictation, which is how people will talk.
        iosTaskHint: 'dictation',
        // The engine's default, spelled out: other audio pauses (rather than
        // ducking into the microphone) and resumes when `restoreAudio` lets go.
        iosCategory: {
          category: 'playAndRecord',
          categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
          mode: 'measurement',
        },
        // Feeds `level`. A separate tap on its own mixer, off the path the
        // recogniser listens to.
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
      // Reads only; `requestPermissionsAsync` is never called from here.
      const permission = await module.getPermissionsAsync();
      granted = permission.granted === true;
    } catch (thrown) {
      report(thrown);
      return;
    }
    if (!mounted.current) return;
    // Only a page showing `denied` moves; a session that started meanwhile is
    // past `denied` already and is left alone.
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
