import { Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The search page's field, focused on open, ringed in the accent while it has the keyboard, with
 * Cancel beside it. The keyboard's Search key submits.
 */
export function SearchInput({
  value,
  onChangeText,
  onSubmit,
  onCancel,
  autoFocus = true,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const colors = useColors();
  const [focused, setFocused] = useState(autoFocus);
  const placeholder = t('payments.search.placeholder');

  return (
    <View className="min-h-[52px] w-full flex-row items-center gap-3">
      <View
        testID="search-field"
        className={cn(
          'min-h-12 min-w-0 flex-1 flex-row items-center gap-2 rounded-[14px] bg-card px-3',
          focused ? 'border-[1.5px] border-accent-ink' : 'border-[1.5px] border-line',
        )}
      >
        <Search size={18} color={colors.muted} strokeWidth={2} />
        <TextInput
          testID="search-input"
          accessibilityRole="search"
          accessibilityLabel={placeholder}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          className="min-w-0 flex-1 py-3 font-app text-[15px] text-ink"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          maxFontSizeMultiplier={TEXT_CAP.row}
        />
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ui.search.clear')}
            hitSlop={8}
            onPress={() => onChangeText('')}
            className="h-7 w-7 items-center justify-center rounded-full active:bg-ink/5"
          >
            <X size={16} color={colors.muted} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('payments.search.cancel')}
        onPress={withTap(onCancel)}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        testID="search-cancel"
        className="shrink-0 py-2 active:opacity-60"
      >
        <Text
          className="font-app-semibold text-[15px] text-accent-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('payments.search.cancel')}
        </Text>
      </Pressable>
    </View>
  );
}
