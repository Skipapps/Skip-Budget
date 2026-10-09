import { Check, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { ToastContext, type ShowToast, type ToastTone } from '@/providers/toast-context';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type Toast = { id: number; message: string; tone: ToastTone };

/** Long enough to read two words twice; short enough not to sit over the next tap. */
const VISIBLE_MS = 2200;

/** Clears the tab bar and a pinned Save button, so the toast never covers the next thing to tap. */
const ABOVE_BOTTOM = 92;

const ICON_TONE: Record<ToastTone, string> = { done: '#2FA46B', deleted: '#E5484D' };

/**
 * A short confirmation at the bottom of the screen after anything is saved or removed ("Card
 * added", "Bill deleted"). Mounted at the root, so it outlives the page that closes as it appears.
 * One at a time: a newer one replaces the last.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const next = useRef(0);

  const show = useCallback<ShowToast>((key, tone = 'done') => {
    const message = t(key);
    next.current += 1;
    setToast({ id: next.current, message, tone });
    // VoiceOver users hear it: nothing on screen moves focus to it.
    AccessibilityInfo.announceForAccessibility(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), VISIBLE_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastPill key={toast.id} message={toast.message} tone={toast.tone} /> : null}
    </ToastContext.Provider>
  );
}

function ToastPill({ message, tone }: { message: string; tone: ToastTone }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const Icon = tone === 'deleted' ? X : Check;

  return (
    <View
      pointerEvents="none"
      className="absolute left-0 right-0 items-center px-6"
      style={{ bottom: insets.bottom + ABOVE_BOTTOM }}
    >
      <Animated.View
        entering={FadeInDown.duration(220)}
        exiting={FadeOutDown.duration(180)}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        // The theme's own ink, so it is black on the light theme and off-white on the dark one.
        style={{ backgroundColor: colors.ink }}
        className="max-w-full flex-row items-center gap-2.5 rounded-full py-2.5 pl-2.5 pr-5 shadow-lg"
      >
        <View
          style={{ backgroundColor: ICON_TONE[tone] }}
          className="h-6 w-6 items-center justify-center rounded-full"
        >
          <Icon size={14} color="#FFFFFF" strokeWidth={3} />
        </View>
        <Text
          style={{ color: colors.surface }}
          className="shrink font-app-semibold text-[15px]"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}
