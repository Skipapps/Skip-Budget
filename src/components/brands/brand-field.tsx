import { Plus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { guessCategory, useBrandSearch, type BrandRow } from '@/api/brands';
import { BrandLogo } from '@/components/brands/brand-logo';
import { FieldLabel } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';

export type BrandSelection = {
  /** Null for a store the catalog does not know. */
  brandId: string | null;
  name: string;
  domain: string | null;
  categoryId: string;
};

type BrandFieldProps = {
  label: string;
  value: BrandSelection | null;
  onChange: (value: BrandSelection | null) => void;
  placeholder?: string;
  error?: string;
  className?: string;
};

/** Keystrokes are cheap; round trips are not. */
function useDebounced(value: string, delay = 220): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

/**
 * The store field. Types like a text input, answers like a picker.
 *
 * Results render inline below the field rather than as a floating dropdown:
 * an absolutely positioned overlay inside a ScrollView clips at the wrong
 * boundary on Android and fights the keyboard on both platforms.
 *
 * Adding a store the catalog has never heard of is always the last row, never
 * a mode the user has to find first — most receipts are chains, but the local
 * corner shop has to be one tap away rather than a dead end.
 */
export function BrandField({
  label,
  value,
  onChange,
  placeholder = 'Search for a store',
  error,
  className,
}: BrandFieldProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const debounced = useDebounced(query);
  const { data: results = [], isFetching } = useBrandSearch(debounced);

  const typed = query.trim();
  const searching = focused && typed.length >= 2;
  // Hide the exact-name row when the catalog already offers that name, so the
  // list never shows "Walmart" twice.
  const alreadyListed = results.some((brand) => brand.name.toLowerCase() === typed.toLowerCase());

  const choose = (brand: BrandRow) => {
    onChange({
      brandId: brand.id,
      name: brand.name,
      domain: brand.domain,
      categoryId: brand.category_id,
    });
    setQuery('');
    setFocused(false);
  };

  const clear = () => {
    onChange(null);
    setQuery('');
  };

  if (value) {
    return (
      <View className={cn('w-full', className)}>
        <FieldLabel className="mb-2">{label}</FieldLabel>
        <View className="min-h-14 w-full flex-row items-center rounded-[10px] border border-line px-4">
          <BrandLogo name={value.name} domain={value.domain} size={32} />
          <Text
            className="ml-3 flex-1 py-4 font-poppins text-[16px] text-ink"
            numberOfLines={1}
            maxFontSizeMultiplier={1.5}
          >
            {value.name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change store, currently ${value.name}`}
            hitSlop={10}
            onPress={clear}
            className="-mr-1 h-10 w-10 items-center justify-center rounded-[8px] active:bg-black/10"
          >
            <X size={18} color={colors.muted} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className={cn('w-full', className)}>
      <FieldLabel className="mb-2">{label}</FieldLabel>

      <View
        className={cn(
          'min-h-14 w-full flex-row items-center rounded-[10px] border px-5',
          error ? 'border-red-500' : focused ? 'border-control' : 'border-line',
        )}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          onFocus={() => setFocused(true)}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          className="flex-1 py-4 font-poppins text-[16px] text-ink"
          maxFontSizeMultiplier={1.5}
        />
        {searching && isFetching ? <ActivityIndicator size="small" color={colors.muted} /> : null}
      </View>

      {searching ? (
        <View className="mt-2 w-full overflow-hidden rounded-[10px] border border-line">
          {results.map((brand, index) => (
            <Pressable
              key={brand.id}
              accessibilityRole="button"
              accessibilityLabel={brand.name}
              onPress={() => choose(brand)}
              className={cn(
                'min-h-14 flex-row items-center px-4 py-3 active:bg-black/5',
                index > 0 && 'border-t border-line',
              )}
            >
              <BrandLogo
                name={brand.name}
                domain={brand.domain}
                logoPath={brand.logo_path}
                size={32}
              />
              <Text
                className="ml-3 flex-1 font-poppins text-[15px] text-ink"
                numberOfLines={1}
                maxFontSizeMultiplier={1.4}
              >
                {brand.name}
              </Text>
            </Pressable>
          ))}

          {alreadyListed ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add ${typed} as a new store`}
              onPress={() =>
                // Keyword guess, so a custom store still files itself.
                onChange({
                  brandId: null,
                  name: typed,
                  domain: null,
                  categoryId: guessCategory(typed),
                })
              }
              className={cn(
                'min-h-14 flex-row items-center px-4 py-3 active:bg-black/5',
                results.length > 0 && 'border-t border-line',
              )}
            >
              <View className="h-8 w-8 items-center justify-center rounded-full border border-dashed border-line">
                <Plus size={16} color={colors.muted} strokeWidth={2} />
              </View>
              <Text
                className="ml-3 flex-1 font-poppins text-[15px] text-body"
                numberOfLines={1}
                maxFontSizeMultiplier={1.4}
              >
                Add &ldquo;{typed}&rdquo;
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {error ? (
        <Text
          className="ml-5 mt-1.5 font-poppins text-[13px] text-red-600"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
