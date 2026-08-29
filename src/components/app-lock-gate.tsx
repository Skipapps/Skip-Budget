import { LockKeyhole } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus, Pressable, Text, View } from 'react-native';

import { authenticate } from '@/lib/app-lock';
import { usePreferences } from '@/providers/preferences-provider';
import { useColors } from '@/providers/theme-provider';

/**
 * Face ID between the app and the person holding the phone.
 *
 * Locks on a cold start and on every return from the background — but not from
 * `inactive`, which is the state iOS passes through while it draws the Face ID
 * sheet, the app switcher preview and any system alert. Re-locking on inactive
 * would fight its own prompt and never settle.
 *
 * A failed or cancelled scan leaves the lock up with a button rather than
 * retrying forever. Somebody who cannot get in should be looking at a way to
 * try again, not at an unexplained dark screen.
 */
export function AppLockGate({ children }: { children: ReactNode }) {
  const { appLock, ready } = usePreferences();
  const colors = useColors();

  // What is stored is whether this session has been let through; whether the
  // gate is up is worked out from that. Keeping it derived rather than held
  // means turning the preference off cannot leave a stale lock on screen.
  const [passed, setPassed] = useState(false);
  const [checking, setChecking] = useState(false);

  // Only armed once the stored preference has been read, or a cold start would
  // flash the app before deciding it should have been covered.
  const armed = ready && appLock;
  const locked = armed && !passed;

  /** The manual retry behind the button, which reports that it is waiting. */
  const prompt = useCallback(async () => {
    setChecking(true);
    const ok = await authenticate('Unlock Skip');
    setChecking(false);
    if (ok) setPassed(true);
  }, []);

  // Ask as soon as the lock is armed, which is a moment after launch. The
  // scan is started here and the result is recorded when it lands, rather
  // than flagging "waiting" on the way in — the system sheet is already the
  // whole screen, so there is nothing behind it for a label to tell anyone.
  useEffect(() => {
    if (!armed) return;

    let cancelled = false;
    authenticate('Unlock Skip').then((ok) => {
      if (!cancelled && ok) setPassed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [armed]);

  const wasBackgrounded = useRef(false);

  useEffect(() => {
    if (!armed) return;

    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'background') {
        wasBackgrounded.current = true;
        setPassed(false);
        return;
      }
      // Only a real return from the background re-prompts. `inactive` is the
      // Face ID sheet itself, the app switcher and every system alert; asking
      // again there would fight our own prompt and never settle.
      if (status === 'active' && wasBackgrounded.current) {
        wasBackgrounded.current = false;
        void prompt();
      }
    });

    return () => subscription.remove();
  }, [armed, prompt]);

  if (!locked) return <>{children}</>;

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-surface px-10">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-accent/15">
        <LockKeyhole size={34} color={colors.accentInk} strokeWidth={1.8} />
      </View>

      <View className="items-center gap-2">
        <Text className="font-poppins-bold text-[22px] text-ink" maxFontSizeMultiplier={1.3}>
          Skip is locked
        </Text>
        <Text
          className="text-center font-poppins text-[14px] leading-[21px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          Your budget is behind Face ID on this phone.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Unlock Skip"
        disabled={checking}
        onPress={() => void prompt()}
        className="rounded-full bg-control px-7 py-3.5 active:bg-control-pressed"
      >
        <Text
          className="font-poppins-medium text-[15px] text-on-control"
          maxFontSizeMultiplier={1.2}
        >
          {checking ? 'Waiting…' : 'Unlock'}
        </Text>
      </Pressable>
    </View>
  );
}
