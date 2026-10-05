import { router, useFocusEffect } from 'expo-router';
import { CalendarPlus, ReceiptText, Repeat, Settings } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, AppState, Linking, Text, View } from 'react-native';

import { useBrandDirectory } from '@/api/brands';
import { useBills, useReceipts, useSubscriptions } from '@/api/queries';
import { useVoiceAliases } from '@/api/voice-aliases';
import { useProGate } from '@/components/pro/pro-gate';
import { ActionPill } from '@/components/ui/action-pill';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel } from '@/components/ui/typography';
import { MicButton } from '@/components/voice/mic-button';
import { ownMerchants } from '@/components/voice/own-merchants';
import { VoiceHints } from '@/components/voice/voice-hints';
import { FAILURE_MESSAGE, failureMessage } from '@/lib/failure';
import { toggle, warn } from '@/lib/haptics';
import { useSpeechCapture, type SpeechStatus } from '@/lib/speech';
import { useToday } from '@/lib/use-today';
import { parseVoice, voiceVocabulary, type VoiceDraft } from '@/lib/voice';
import { putVoiceDraft } from '@/lib/voice-draft';
import { useColors } from '@/providers/theme-provider';

/**
 * What the page is showing. `checking` is let go, waiting on the final words; `nothing` is a
 * session that ended with no words; `granted` is the first press that only asked for permission.
 */
type Shown =
  | 'idle'
  | 'listening'
  | 'checking'
  | 'nothing'
  | 'multiple'
  | 'granted'
  | 'error'
  | 'denied'
  | 'unavailable';

/**
 * One hold, from press to outcome. `live` is set once the mic is actually on: the hook passes
 * through `idle` on its way there, which is not an answer.
 */
type Session = {
  id: number;
  active: boolean;
  live: boolean;
  /** Let go: waiting on the final words. */
  stopping: boolean;
  outcome: null | 'heard' | 'nothing';
  words: string[];
};

const RESTING: Session = {
  id: 0,
  active: false,
  live: false,
  stopping: false,
  outcome: null,
  words: [],
};

/** Where a session goes when the hook's status moves. Pure, so it runs in render. */
function advance(session: Session, status: SpeechStatus, alternatives: string[]): Session {
  if (!session.active) return session;
  if (status === 'listening') return session.live ? session : { ...session, live: true };
  if (status === 'asking') return session;
  if (status !== 'idle') {
    // Denied, unavailable or an error: the page explains, and that is the end.
    return { ...session, active: false, stopping: false };
  }
  if (!session.live) return session;
  // Idle after listening: let go, the 15-second cap, or a call. All the same: the words heard so
  // far, if any, are the answer.
  const words = alternatives.filter((text) => text.trim());
  return {
    ...session,
    active: false,
    stopping: false,
    outcome: words.length ? 'heard' : 'nothing',
    words,
  };
}

/** Said before the mic opens, and only then: once it is open it would be transcribed. */
const START_ANNOUNCEMENT = 'Listening';

/**
 * Speaks a line and waits until VoiceOver has finished saying it: the mic must not open while
 * VoiceOver is talking, or its words become the entry. The timer covers a VoiceOver that never
 * says it is done.
 */
function announceAndWait(text: string): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const subscription = AccessibilityInfo.addEventListener('announcementFinished', () => finish());
    const timer = setTimeout(() => finish(), 4000);
    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.remove();
      resolve();
    }
    AccessibilityInfo.announceForAccessibility(text);
  });
}

/**
 * The newest words of a long transcript. iOS only head-truncates the last line of multi-line text,
 * which would cut the middle out, so the string is trimmed at a word before it is rendered.
 */
function latestWords(text: string, limit = 140): string {
  const tidy = text.replace(/\s+/g, ' ').trim();
  if (tidy.length <= limit) return tidy;
  const tail = tidy.slice(-limit);
  const space = tail.indexOf(' ');
  return `…${space > 0 && space < limit / 2 ? tail.slice(space + 1) : tail}`;
}

/** Whether the parser heard two or more separate entries ("Netflix 15.99 and Spotify 11.99"). */
function heardMoreThanOne(draft: VoiceDraft): boolean {
  return draft.multiple === true;
}

const MULTIPLE_LINE = 'Looks like more than one. Add them one at a time.';

/**
 * "Record a transaction": hold the mic, say it, let go. The words appear as they are heard; letting
 * go sends them to the review page, once. Nothing is saved here, and the mic never opens by itself
 * (not on arrival, not from a link, not on coming back).
 */
export default function VoiceScreen() {
  const gate = useProGate('voice');
  if (gate) return gate;
  return <VoiceScreenInner />;
}

function VoiceScreenInner() {
  const colors = useColors();
  const { today } = useToday();

  // Loaded while the person is speaking. Whatever has arrived is what the parser gets: a directory
  // that failed means unmatched stores, not a dead mic.
  const directory = useBrandDirectory();
  const { aliases } = useVoiceAliases();
  const receipts = useReceipts();
  const bills = useBills();
  const subscriptions = useSubscriptions();

  const own = useMemo(
    () => ownMerchants(receipts.data, bills.data, subscriptions.data),
    [receipts.data, bills.data, subscriptions.data],
  );
  const contextualStrings = useMemo(
    () => voiceVocabulary(directory.data ?? [], own),
    [directory.data, own],
  );

  // Continuous: a hold is one sentence however long the pauses in it; letting go ends it.
  const speech = useSpeechCapture({ contextualStrings, continuous: true });

  const [session, setSession] = useState<Session>(RESTING);
  // The hook's status, as last seen. When it moves, the session moves with it here in render
  // rather than in an effect, so the page never paints a state the session has already left.
  const [seen, setSeen] = useState({ status: speech.status, alternatives: speech.alternatives });
  if (seen.status !== speech.status || seen.alternatives !== speech.alternatives) {
    setSeen({ status: speech.status, alternatives: speech.alternatives });
    const next = advance(session, speech.status, speech.alternatives);
    if (next !== session) setSession(next);
  }

  /** Held down, or switched on with VoiceOver. */
  const [held, setHeld] = useState(false);
  /** What the last permission-only press found. */
  const [notice, setNotice] = useState<null | 'granted' | 'refused'>(null);

  /** Bumped by every start and every cancel; a start that waited checks it. */
  const generation = useRef(0);
  /** What the current press did: started a hold, or only asked for permission. */
  const press = useRef<'none' | 'hold' | 'permission'>('none');
  const asking = useRef(false);
  const focused = useRef(false);
  /** The session that has already gone to review: one push each, however often effects run. */
  const pushedFor = useRef(0);

  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => {
        if (alive) setScreenReader(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  // The hook's own functions are stable; `speech` is a new object every render, and depending on
  // it would re-run the focus effect below and cancel the mic every time a word arrived.
  const stopSpeech = speech.cancel;
  const cancel = useCallback(() => {
    generation.current += 1;
    press.current = 'none';
    stopSpeech();
    setSession(RESTING);
    setHeld(false);
  }, [stopSpeech]);

  const startHold = async () => {
    // A hold still finishing, or a permission prompt already up.
    if (session.active || asking.current) return;

    // The first press asks, and only asks: the iOS prompt takes the touch
    // anyway, and a mic that opened behind it would hear nothing useful.
    if (speech.permissionGranted !== true) {
      press.current = 'permission';
      asking.current = true;
      try {
        const granted = await speech.requestPermission();
        setNotice(granted ? 'granted' : 'refused');
      } finally {
        asking.current = false;
      }
      return;
    }

    press.current = 'hold';
    generation.current += 1;
    const mine = generation.current;
    setNotice(null);
    setHeld(true);
    setSession({ ...RESTING, id: mine, active: true });
    toggle();
    if (screenReader) {
      await announceAndWait(START_ANNOUNCEMENT);
      // Stopped, or left, while VoiceOver was talking: no mic after all.
      if (!focused.current || generation.current !== mine) return;
    }
    await speech.start();
  };

  const endHold = () => {
    const was = press.current;
    press.current = 'none';
    if (was !== 'hold') return;
    setHeld(false);
    // Let go before the mic was even open: a tap, not a hold. The hook ends
    // that session quietly; the page says how it works.
    setSession((current) =>
      !current.active
        ? current
        : current.live
          ? { ...current, stopping: true }
          : { ...current, active: false, outcome: 'nothing' },
    );
    speech.stop();
    if (screenReader) AccessibilityInfo.announceForAccessibility('Stopped');
  };

  // A mic that opened after the person had already let go is closed again.
  useEffect(() => {
    if (speech.status === 'listening' && !session.active) stopSpeech();
  }, [speech.status, session.active, stopSpeech]);

  useEffect(() => {
    if (session.outcome === 'nothing') warn();
  }, [session.id, session.outcome]);

  // Dev builds only (see DevTestSentence). The typed sentence becomes a session that heard exactly
  // those words, so it takes the same road as speech.
  const runTestSentence = useCallback(
    (text: string) => {
      if (!__DEV__) return;
      const words = text.trim();
      if (!words) return;
      cancel();
      generation.current += 1;
      setSession({ ...RESTING, id: generation.current, outcome: 'heard', words: [words] });
    },
    [cancel],
  );

  // Words in: parsed here in render, because parsing is pure and quick, and a parse that fails
  // shows as the page's error instead of a spinner that never ends. The parser promises never to
  // throw; this is the backstop.
  const parsed = useMemo(() => {
    if (session.outcome !== 'heard') return null;
    try {
      return {
        draft: parseVoice(session.words, {
          today,
          directory: directory.data ?? [],
          aliases,
        }),
        thrown: null,
      };
    } catch (thrown) {
      return { draft: null, thrown };
    }
  }, [session.outcome, session.words, today, directory.data, aliases]);

  // Park the draft and go to review — once a session, however often this runs.
  useEffect(() => {
    if (!parsed || pushedFor.current === session.id) return;
    pushedFor.current = session.id;
    if (!parsed.draft) {
      failureMessage(parsed.thrown);
      warn();
      return;
    }
    // Two entries in one breath: one review page cannot hold them, so nothing
    // is parked and nothing is pushed. The page says so, once.
    if (heardMoreThanOne(parsed.draft)) {
      warn();
      return;
    }
    try {
      // The words travel with the draft, so changing the kind on review can
      // read them again for the new kind.
      const id = putVoiceDraft(parsed.draft, session.words);
      router.push({ pathname: '/voice-review', params: { draft: id } });
    } catch (thrown) {
      failureMessage(thrown);
    }
  }, [parsed, session.id, session.words]);

  const shown: Shown = (() => {
    if (speech.status === 'denied') return 'denied';
    if (speech.status === 'unavailable') return 'unavailable';
    if (speech.status === 'error') return 'error';
    if (parsed && !parsed.draft) return 'error';
    if (parsed?.draft && heardMoreThanOne(parsed.draft)) return 'multiple';
    if (speech.status === 'listening') {
      if (!session.active) return 'idle';
      return session.stopping ? 'checking' : 'listening';
    }
    if (session.outcome === 'heard') return 'checking';
    if (session.outcome === 'nothing') return 'nothing';
    if (session.active) return session.stopping ? 'checking' : 'listening';
    if (notice === 'refused' && speech.permissionGranted !== true) return 'denied';
    if (notice === 'granted') return 'granted';
    return 'idle';
  })();

  // Leaving the page in any way stops the mic at once (back, swipe, the push to review).
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
        cancel();
        setNotice(null);
      };
    }, [cancel]),
  );

  // To the background mid-sentence (the home screen, the lock button): stop and forget. Back to the
  // app while refused, most likely from Settings: read the permission again, so the page is ready
  // for a hold if both are now on. Neither opens the mic.
  const statusRef = useRef(speech.status);
  const shownRef = useRef(shown);
  const refreshRef = useRef(speech.refreshPermission);
  useEffect(() => {
    statusRef.current = speech.status;
    shownRef.current = shown;
    refreshRef.current = speech.refreshPermission;
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const status = statusRef.current;
      if (next === 'background' && (status === 'asking' || status === 'listening')) cancel();
      if (next === 'active' && shownRef.current === 'denied') void refreshRef.current();
    });
    return () => subscription.remove();
  }, [cancel]);

  const nothingLine = screenReader
    ? 'Skip didn’t hear anything. Double-tap Record, then talk.'
    : 'Hold the button while you talk.';

  // VoiceOver hears what changed, never the live words.
  const announced = useRef(shown);
  useEffect(() => {
    if (announced.current === shown) return;
    announced.current = shown;
    if (!screenReader) return;
    const line =
      shown === 'nothing'
        ? nothingLine
        : shown === 'multiple'
          ? MULTIPLE_LINE
          : shown === 'granted'
            ? 'You’re all set.'
            : shown === 'error'
              ? FAILURE_MESSAGE
              : shown === 'denied'
                ? 'Microphone or speech recognition is off.'
                : shown === 'unavailable'
                  ? 'Voice isn’t available right now.'
                  : null;
    if (line) AccessibilityInfo.announceForAccessibility(line);
  }, [shown, screenReader, nothingLine]);

  const hintsShown =
    shown === 'idle' ||
    shown === 'nothing' ||
    shown === 'multiple' ||
    shown === 'granted' ||
    shown === 'error';
  const recording = held && session.active;

  const caption = screenReader
    ? recording
      ? 'Tap when you’re done'
      : 'Tap to talk'
    : recording
      ? 'Release when you’re done'
      : 'Hold to talk';
  const hint = screenReader
    ? recording
      ? 'Double-tap to stop.'
      : 'Double-tap to start talking, and again when you’re done.'
    : 'Hold while you talk, then let go.';

  const footer = (
    <View className="w-full items-center">
      <VoiceHints hidden={!hintsShown} />
      <View className="mt-4 items-center">
        <MicButton
          held={recording}
          live={shown === 'listening' && speech.status === 'listening'}
          level={speech.level}
          toggleMode={screenReader}
          onStart={() => void startHold()}
          onStop={endHold}
          accessibilityHint={hint}
        />
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="font-poppins text-[14px] text-muted"
          maxFontSizeMultiplier={1.3}
        >
          {caption}
        </Text>
      </View>
    </View>
  );

  return (
    // Keyboard-aware in dev only, for the test sentence; a Release build has no field on this page.
    <Screen title="Record a transaction" showBack footer={footer} avoidKeyboard={__DEV__}>
      <View className="mt-6 w-full flex-1 items-center">
        {shown === 'idle' ? null : shown === 'listening' ? (
          // "Listening…" until the first word, then the words. Only this hold's words: until its
          // mic is live, whatever the hook still holds is the last session's.
          speech.interim && session.live ? (
            <LiveWords text={speech.interim} />
          ) : (
            <Placeholder />
          )
        ) : shown === 'checking' ? (
          <View className="w-full items-center">
            {/* Let go: the mic is closed, so it no longer says Listening. */}
            {speech.interim ? <LiveWords text={speech.interim} /> : null}
            <View className="mt-3">
              <ActivityIndicator size="small" color={colors.muted} />
            </View>
          </View>
        ) : shown === 'multiple' ? (
          <View className="w-full items-center">
            <LiveWords text={session.words[0] ?? ''} />
            <View className="mt-4 w-full">
              <StatusLine text={MULTIPLE_LINE} />
            </View>
          </View>
        ) : shown === 'nothing' ? (
          <StatusLine text={nothingLine} />
        ) : shown === 'granted' ? (
          <StatusLine text="You’re all set. Hold to talk." />
        ) : shown === 'error' ? (
          <StatusLine text={FAILURE_MESSAGE} />
        ) : shown === 'denied' ? (
          <View className="w-full">
            <StatusLine text="Turn on Microphone and Speech Recognition for Skip Budget in Settings." />
            <View className="mt-4 w-full flex-row justify-center">
              <ActionPill
                icon={Settings}
                label="Open Settings"
                onPress={() => void Linking.openSettings()}
              />
            </View>
          </View>
        ) : shown === 'unavailable' ? (
          <View className="w-full">
            <StatusLine text="Voice isn’t available on this iPhone right now." />
            <FieldLabel className="mt-6 text-center">Add it by hand</FieldLabel>
            {/* The form takes this page's place, so back or save from it
                returns to Home rather than to a mic that cannot work. */}
            <View className="mt-3 w-full flex-row flex-wrap justify-center gap-2">
              <ActionPill
                icon={ReceiptText}
                label="Receipt"
                onPress={() => router.replace('/add-receipt')}
              />
              <ActionPill
                icon={CalendarPlus}
                label="Bill"
                onPress={() => router.replace('/add-bill')}
              />
              <ActionPill
                icon={Repeat}
                label="Subscription"
                onPress={() => router.replace('/add-subscription')}
              />
            </View>
          </View>
        ) : null}
      </View>

      {__DEV__ && DevTestSentence ? (
        <DevTestSentence onRun={runTestSentence} disabled={shown === 'checking'} />
      ) : null}
    </Screen>
  );
}

/** The words as they are heard: big, ink, the newest kept. Never a live region. */
function LiveWords({ text }: { text: string }) {
  return (
    <Text
      className="w-full text-center font-poppins-medium text-[24px] leading-8 text-ink"
      maxFontSizeMultiplier={1.3}
    >
      {latestWords(text)}
    </Text>
  );
}

/**
 * "Listening…" in the words' own type, ink at 20%, marking where the words will appear. Hidden
 * from VoiceOver, which already hears "Listening" announced when the hold starts.
 */
function Placeholder() {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      className="w-full text-center font-poppins-medium text-[24px] leading-8 text-ink/20"
      maxFontSizeMultiplier={1.3}
    >
      Listening…
    </Text>
  );
}

/** One short line in place of copy: what happened, and what to do. */
function StatusLine({ text }: { text: string }) {
  return (
    <Text
      className="w-full text-center font-poppins text-[16px] leading-6 text-body"
      maxFontSizeMultiplier={1.4}
    >
      {text}
    </Text>
  );
}

/**
 * Dev builds only: type what you would have said, for the Simulator, which has no microphone. The
 * typed sentence takes exactly the road real speech takes. `__DEV__` is false in Release, so the
 * component, its handler and its place on the page fold away. It sits at the foot of the scrolling
 * area, not the pinned footer, so the keyboard can scroll it into view.
 */
const DevTestSentence = __DEV__
  ? function DevTestSentence({
      onRun,
      disabled,
    }: {
      onRun: (text: string) => void;
      disabled: boolean;
    }) {
      const [text, setText] = useState('');
      return (
        <View className="mt-8 w-full gap-3 pb-4">
          <TextField
            label="Test sentence (dev only)"
            value={text}
            onChangeText={setText}
            placeholder="Netflix $15.99 every month"
            // Exactly as typed: autocorrect would rewrite words before the parser sees them, and on
            // iOS spell-check follows autoCorrect.
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={() => {
              if (!disabled) onRun(text);
            }}
          />
          <Button
            label="Use this sentence"
            variant="outline"
            onPress={() => onRun(text)}
            disabled={disabled || !text.trim()}
          />
        </View>
      );
    }
  : null;
