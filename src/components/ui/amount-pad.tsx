import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountFigure } from '@/components/flow/amount-figure';
import { AmountKeypad, applyAmountKey } from '@/components/flow/amount-keypad';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type AmountPadProps = {
  title: string;
  caption: string;
  value: string;
  unit?: 'currency' | 'percent';
  onCancel: () => void;
  onConfirm: (value: string) => void;
  /**
   * Why a draft cannot be used, or null. Done then stays on the pad and says so, rather than the
   * screen behind quietly changing the figure.
   */
  check?: (value: string) => string | null;
};

/**
 * Full-screen amount entry with its own keypad, for the secondary amounts (a share, expected income,
 * a rate) where a modal is the right weight. Same figure and keys as step 1.
 *
 * The figure and keys scroll above a pinned Done: at large text a wrapped caption on a small phone
 * would otherwise push the keys into the button.
 */
export function AmountPad({
  title,
  caption,
  value,
  unit = 'currency',
  onCancel,
  onConfirm,
  check,
}: AmountPadProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [problem, setProblem] = useState<string | null>(null);

  const done = () => {
    const reason = check?.(draft) ?? null;
    if (reason) {
      setProblem(reason);
      AccessibilityInfo.announceForAccessibility(reason);
      return;
    }
    onConfirm(draft);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View
        className="flex-1 bg-surface"
        style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
            onPress={onCancel}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
          >
            <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Text
            className="flex-1 pr-11 text-center font-app-semibold text-[17px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.heading}
          >
            {title}
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center px-6 py-4">
            <AmountFigure value={draft} unit={unit} />
            <Text
              className="mt-2 w-full text-center font-app text-[15px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {caption}
            </Text>
            {problem ? (
              <Text
                className="mt-3 w-full text-center font-app text-[14px] text-danger"
                maxFontSizeMultiplier={TEXT_CAP.reading}
              >
                {problem}
              </Text>
            ) : null}
          </View>

          <View className="px-6">
            <AmountKeypad
              onKey={(key) => {
                setProblem(null);
                setDraft((current) => applyAmountKey(current, key));
              }}
            />
          </View>
        </ScrollView>

        <View className="px-6 pt-5">
          <Button label={t('common.done')} onPress={done} />
        </View>
      </View>
    </Modal>
  );
}
