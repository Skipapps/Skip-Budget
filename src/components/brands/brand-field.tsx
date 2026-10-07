import { Plus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { guessCategory, useBrandSearch, type BrandRow } from '@/api/brands';
import { BrandLogo } from '@/components/brands/brand-logo';
import { LOGO_COPY, LogoConfirm, type NoLogo } from '@/components/brands/logo-choices';
import { TextLink } from '@/components/ui/text-link';
import { FieldLabel } from '@/components/ui/typography';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { selectionLogo } from '@/lib/logo-columns';
import { logoHints } from '@/lib/logo-lookup';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

export type BrandSelection = {
  /** Null for a store the catalog does not know. */
  brandId: string | null;
  name: string;
  /** The catalog brand's website; on a store opened for editing, the logo the row shows now. */
  domain: string | null;
  categoryId: string;
  /**
   * The logo the person chose for this store in the field. Both stay undefined when nothing was
   * chosen here, so saving an edit leaves the row's own choice (made on Change logo) alone.
   */
  logoDomain?: string | null;
  logoHidden?: boolean;
};

type BrandFieldProps = {
  label: string;
  value: BrandSelection | null;
  onChange: (value: BrandSelection | null) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  /** Pre-filled search, e.g. a store a voice entry could not match, so results show at once. */
  initialQuery?: string;
  autoFocus?: boolean;
  /** The form's own category, which tells same-named brands apart; else a guess from the name. */
  category?: string;
  /** What "no logo" draws where this store shows: letters, or a bill's category icon. */
  noLogo?: NoLogo;
  /**
   * Offer the logo check for a new store. Off where the choice could not be kept (the voice
   * draft carries no logo).
   */
  suggestLogos?: boolean;
  /** Opens Change logo for the saved row this store belongs to. */
  onChangeLogo?: () => void;
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
 * The store field: types like a text input, answers like a picker. Results render inline, not as a
 * dropdown (an absolutely positioned overlay in a ScrollView clips wrongly on Android and fights
 * the keyboard). Adding an unknown store is always the last row, never a mode.
 */
export function BrandField({
  label,
  value,
  onChange,
  placeholder = t('settings.store.search'),
  error,
  className,
  initialQuery = '',
  autoFocus = false,
  category,
  noLogo = 'letters',
  suggestLogos = true,
  onChangeLogo,
}: BrandFieldProps) {
  const colors = useColors();
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(autoFocus);
  // Only a store added here is checked; one that arrived filled in (an edit, a scan) was not typed.
  const [confirming, setConfirming] = useState(false);
  const debounced = useDebounced(query);
  const { data: results = [], isFetching } = useBrandSearch(debounced);

  const typed = query.trim();
  const searching = focused && typed.length >= 2;
  // Hide the exact-name row when the catalog already offers that name ("Walmart" twice).
  const alreadyListed = results.some((brand) => brand.name.toLowerCase() === typed.toLowerCase());

  const choose = (brand: BrandRow) => {
    onChange({
      brandId: brand.id,
      name: brand.name,
      domain: brand.domain,
      categoryId: brand.category_id,
      // Picking a catalog brand drops any earlier choice: its own logo is the right one.
      logoDomain: null,
      logoHidden: false,
    });
    setQuery('');
    setFocused(false);
    setConfirming(false);
  };

  const addCustom = () => {
    onChange({
      brandId: null,
      name: typed,
      domain: null,
      // Keyword guess, so a custom store still files itself.
      categoryId: guessCategory(typed),
      logoDomain: null,
      logoHidden: false,
    });
    setConfirming(true);
  };

  const clear = () => {
    onChange(null);
    setQuery('');
    setConfirming(false);
  };

  if (value) {
    return (
      <View className={cn('w-full', className)}>
        <FieldLabel className="mb-2">{label}</FieldLabel>
        <View className="min-h-14 w-full flex-row items-center rounded-[10px] border border-line px-4">
          <BrandLogo name={value.name} domain={selectionLogo(value)} size={32} />
          <Text
            className="ml-3 min-w-0 flex-1 py-4 font-app text-[16px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {value.name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.store.change', { name: value.name })}
            hitSlop={10}
            onPress={clear}
            className="-mr-1 h-10 w-10 items-center justify-center rounded-[8px] active:bg-ink/10"
          >
            <X size={18} color={colors.muted} strokeWidth={2} />
          </Pressable>
        </View>

        {confirming && suggestLogos && value.brandId === null ? (
          <LogoConfirm
            key={value.name}
            name={value.name}
            hints={logoHints(category ?? value.categoryId)}
            noLogo={noLogo}
            onChoose={(choice) => onChange({ ...value, ...choice })}
          />
        ) : onChangeLogo ? (
          <TextLink
            label={LOGO_COPY.changeLogo}
            variant="subtle"
            onPress={onChangeLogo}
            className="mt-1 self-start"
          />
        ) : null}
      </View>
    );
  }

  return (
    <View className={cn('w-full', className)}>
      <FieldLabel className="mb-2">{label}</FieldLabel>

      <View
        className={cn(
          'min-h-14 w-full flex-row items-center rounded-[10px] border px-5',
          error ? 'border-danger' : focused ? 'border-control' : 'border-line',
        )}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          onFocus={() => setFocused(true)}
          autoFocus={autoFocus}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          className="flex-1 py-4 font-app text-[16px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
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
                'min-h-14 flex-row items-center px-4 py-3 active:bg-ink/5',
                index > 0 && 'border-t border-line',
              )}
            >
              <BrandLogo name={brand.name} domain={brand.domain} size={32} />
              <Text
                className="ml-3 min-w-0 flex-1 font-app text-[15px] text-ink"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {brand.name}
              </Text>
            </Pressable>
          ))}

          {alreadyListed ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settings.store.addAs', { name: typed })}
              onPress={addCustom}
              className={cn(
                'min-h-14 flex-row items-center px-4 py-3 active:bg-ink/5',
                results.length > 0 && 'border-t border-line',
              )}
            >
              <View className="h-8 w-8 items-center justify-center rounded-full border border-dashed border-line">
                <Plus size={16} color={colors.muted} strokeWidth={2} />
              </View>
              <Text
                className="ml-3 min-w-0 flex-1 font-app text-[15px] text-body"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {t('settings.store.add', { name: typed })}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {error ? (
        <Text
          className="ml-5 mt-1.5 font-app text-[13px] text-danger"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
