import { Search, X } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchField({ value, onChangeText, placeholder, className }: SearchFieldProps) {
  return (
    <View
      className={cn(
        'min-h-12 flex-1 flex-row items-center gap-2 rounded-[10px] border border-line px-3',
        className,
      )}
    >
      <Search size={18} color={colors.muted} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        className="flex-1 py-3 font-poppins text-[15px] text-ink"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        maxFontSizeMultiplier={1.4}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          onPress={() => onChangeText('')}
          className="h-7 w-7 items-center justify-center rounded-full active:bg-black/5"
        >
          <X size={16} color={colors.muted} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}
