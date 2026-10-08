import { LockKeyhole } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus, Pressable, Text, View } from 'react-native';

import { t, useLocale } from '@/i18n';
import { authenticate } from '@/lib/app-lock';
import { usePreferences } from '@/providers/preferences-provider';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Face ID between the app and whoever holds the phone: locks on a cold start and on every return
 * from the background. A failed scan leaves the lock up with a retry button instead of looping.
 */
export function AppLockGate({ children }: { children: ReactNode }) {
  const { appLock, ready } = usePreferences();
  const colors = useColors();
  // Above every screen's remount boundary, so it follows the language itself.
  useLocale();

  // Holds whether this session has been let through; the gate is derived from it, so turning the
  // preference off cannot leave a stale lock on screen.
  const [passed, setPassed] = useState(false);
  const [checking, setChecking] = useState(false);

  // Armed only once the stored preference is read, or a cold start would flash the app uncovered.
  const armed = ready && appLock;
  const locked = armed && !passed;

  const prompt = useCallback(async () => {
    setChecking(true);
    const ok = await authenticate();
    setChecking(false);
    if (ok) setPassed(true);
  }, []);

  // Ask as soon as the lock is armed. The result is recorded when it lands rather than flagging
  // "waiting": the system sheet already fills the screen.
  useEffect(() => {
    if (!armed) return;

    let cancelled = false;
    authenticate().then((ok) => {
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
      // Only a real return from the background re-prompts: `inactive` is the Face ID sheet, the app
      // switcher and system alerts, and asking there would fight our own prompt.
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
        <Text
          className="text-center font-app-bold text-[22px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.heading}
        >
          {t('nav.locked.title')}
        </Text>
        <Text
          className="text-center font-app text-[14px] leading-[21px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('nav.locked.body')}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('nav.locked.unlockLabel')}
        disabled={checking}
        onPress={() => void prompt()}
        className="max-w-full rounded-full bg-control px-7 py-3.5 active:bg-control-pressed"
      >
        <Text
          className="text-center font-app-medium text-[15px] text-on-control"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {checking ? t('nav.locked.waiting') : t('nav.locked.unlock')}
        </Text>
      </Pressable>
    </View>
  );
}
