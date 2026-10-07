import { ChevronRight, Plus, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GLYPH_STROKE } from '@/data/glyphs';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type ReviewRowProps = {
  /** "Store", "Due on", "Category". */
  label: string;
  /** What Skip has for it, or null when nothing was heard or set. */
  value: string | null;
  /**
   * Whether Save needs it. A missing required field is drawn as a gap to fill
   * ("Tap to add"); a missing optional one is simply "Not set".
   */
  required: boolean;
  /** The 40pt mark: a logo, a bill mark, or a glyph in a well (`GlyphWell`). */
  leading: ReactNode;
  onPress: () => void;
};

/**
 * One line of what Skip heard: label above value, a chevron to change it. Unlike SettingsRow it can
 * say "this is still needed": a missing required field gets an accent well with a plus and "Tap to
 * add", and no red, because nothing has gone wrong yet.
 *
 * The words are ink, not accent ink: accent ink is made legible against the page, but on a card in
 * dark mode it falls under 4.5:1. The well keeps the colour; the words keep the contrast.
 */
export function ReviewRow({ label, value, required, leading, onPress }: ReviewRowProps) {
  const colors = useColors();
  const missing = value === null;
  const gap = missing && required;

  const spokenValue = !missing
    ? value
    : required
      ? t('voice.row.notHeard')
      : t('voice.row.notSetOptional');
  const shownLabel = missing && !required ? t('voice.row.optionalLabel', { label }) : label;
  const field = label.toLowerCase();
  const hint = gap
    ? t('voice.row.neededHint', { label: field })
    : t('voice.row.changeHint', { label: field });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('voice.row.spoken', { label, value: spokenValue })}
      accessibilityHint={hint}
      onPress={onPress}
      className="min-h-14 w-full flex-row items-center gap-3 px-4 py-3 active:opacity-60"
    >
      {gap ? (
        <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-accent/10">
          <Plus size={20} color={colors.accentInk} strokeWidth={GLYPH_STROKE} />
        </View>
      ) : (
        leading
      )}

      <View className="min-w-0 flex-1">
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {shownLabel}
        </Text>
        <Text
          className={cn(
            'mt-0.5 text-[15px]',
            gap
              ? 'font-app-medium text-ink'
              : missing
                ? 'font-app text-muted'
                : 'font-app-medium text-ink',
          )}
          numberOfLines={2}
          maxFontSizeMultiplier={1.4}
        >
          {gap ? t('voice.row.tapToAdd') : missing ? t('voice.row.notSet') : value}
        </Text>
      </View>

      <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}

/** A glyph in the house's tonal well, for rows with no logo of their own. */
export function GlyphWell({ icon: Icon }: { icon: LucideIcon }) {
  const colors = useColors();
  return (
    <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-ink/5">
      <Icon size={20} color={colors.body} strokeWidth={GLYPH_STROKE} />
    </View>
  );
}
