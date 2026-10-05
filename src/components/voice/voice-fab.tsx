import { router, useFocusEffect } from 'expo-router';
import { AudioLines } from 'lucide-react-native';
import { useCallback, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { usePro } from '@/api/pro';
import { tap } from '@/lib/haptics';
import { isSpeechAvailable } from '@/lib/speech';
import { contrast } from '@/lib/tone';
import { useTheme } from '@/providers/theme-provider';

/** As tall as the tab bar's pill beside it, so the two sit on one line. */
export const VOICE_FAB_SIZE = 64;

/**
 * The round Voice button at the end of the tab bar: the fastest way to put something in, from any
 * tab. The glyph says "voice", not "recording": the mic belongs to the voice page.
 *
 * Absent in a build with no speech module. Until Pro is known it is drawn but does not answer, so
 * the bar never changes width under someone's thumb and somebody who has paid is never sent to the
 * explainer by a tap that landed too early. A refused permission does not hide it: the voice page
 * says what to do. On a dark page the accent sits too close to the surface to have an edge and a
 * shadow does not show on near-black, so there it gets a hairline ring.
 */
export function VoiceFab() {
  const { colors, scheme } = useTheme();
  const { pro, ready } = usePro();
  const ringed = scheme === 'dark' && contrast(colors.control, colors.surface) < 3;

  // One page per press: a quick double tap would otherwise stack two voice
  // pages (or two explainers). The tabs coming back into focus opens it again.
  const opened = useRef(false);
  useFocusEffect(
    useCallback(() => {
      opened.current = false;
    }, []),
  );

  if (!isSpeechAvailable()) return null;

  const open = () => {
    if (!ready || opened.current) return;
    opened.current = true;
    // The press's tap, felt only when the press does something.
    tap();
    if (pro) router.push('/voice');
    else router.push({ pathname: '/pro-feature', params: { id: 'voice' } });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add by voice"
      accessibilityHint={
        !ready || pro
          ? 'Say a receipt, bill or subscription. You check it before it’s saved.'
          : 'Part of Skip Pro. Shows what adding by voice can do.'
      }
      onPress={open}
      style={[
        {
          width: VOICE_FAB_SIZE,
          height: VOICE_FAB_SIZE,
          shadowColor: colors.control,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 14,
          elevation: 8,
        },
        ringed ? { borderWidth: 1, borderColor: colors.muted } : null,
      ]}
      className="items-center justify-center rounded-full bg-control active:bg-control-pressed"
    >
      <AudioLines size={28} color={colors.onControl} strokeWidth={2} absoluteStrokeWidth />

      {ready && !pro ? (
        // The dashboard's corner PRO pill, same fill, type and padding. Its fill is the button's
        // own colour, so a ring in the page colour cuts it out of the button.
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          className="absolute -right-1 -top-1 rounded-full border-2 border-surface bg-accent px-2 py-0.5"
        >
          <Text allowFontScaling={false} className="font-poppins-bold text-[9px] text-on-control">
            PRO
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
