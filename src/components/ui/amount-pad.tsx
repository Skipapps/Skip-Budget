import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountFigure } from '@/components/flow/amount-figure';
import { AmountKeypad, applyAmountKey } from '@/components/flow/amount-keypad';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { useColors } from '@/providers/theme-provider';

type AmountPadProps = {
  title: string;
  caption: string;
  value: string;
  unit?: 'currency' | 'percent';
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

/**
 * Full-screen amount entry with its own keypad, for the secondary amounts (a share, expected income,
 * a rate) where a modal is the right weight. Same figure and keys as step 1.
 */
export function AmountPad({
  title,
  caption,
  value,
  unit = 'currency',
  onCancel,
  onConfirm,
}: AmountPadProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);

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
            maxFontSizeMultiplier={1.3}
          >
            {title}
          </Text>
        </View>

        <View className="flex-1 justify-center px-6">
          <AmountFigure value={draft} unit={unit} />
          <Text
            className="mt-2 w-full text-center font-app text-[15px] text-muted"
            maxFontSizeMultiplier={1.2}
          >
            {caption}
          </Text>
        </View>

        <View className="px-6">
          <AmountKeypad onKey={(key) => setDraft((current) => applyAmountKey(current, key))} />
        </View>

        <View className="px-6 pt-5">
          <Button label={t('common.done')} onPress={() => onConfirm(draft)} />
        </View>
      </View>
    </Modal>
  );
}
