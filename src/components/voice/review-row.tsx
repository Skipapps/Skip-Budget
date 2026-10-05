import { ChevronRight, Plus, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GLYPH_STROKE } from '@/data/glyphs';
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
 * One line of what Skip heard: label above value, a chevron to change it.
 *
 * Not SettingsRow, which puts the value first and has no way to say "this is
 * still needed". A missing required field gets an accent well with a plus and
 * the words "Tap to add" — and no red, because nothing has gone wrong yet.
 *
 * The words are ink, not accent ink. Accent ink is made legible against the
 * page, and on a card in dark mode it fell under 4.5:1 for four accents —
 * plum, the default, at 3.82:1. The well keeps the colour; the words keep the
 * contrast.
 */
export function ReviewRow({ label, value, required, leading, onPress }: ReviewRowProps) {
  const colors = useColors();
  const missing = value === null;
  const gap = missing && required;

  const spokenValue = !missing ? value : required ? 'not heard' : 'not set, optional';
  const shownLabel = missing && !required ? `${label} · optional` : label;
  const hint = gap
    ? `Needed to save. Opens ${label.toLowerCase()} to add it.`
    : `Opens ${label.toLowerCase()} to change it.`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${spokenValue}`}
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
        <Text className="font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {shownLabel}
        </Text>
        <Text
          className={cn(
            'mt-0.5 text-[15px]',
            gap
              ? 'font-poppins-medium text-ink'
              : missing
                ? 'font-poppins text-muted'
                : 'font-poppins-medium text-ink',
          )}
          numberOfLines={2}
          maxFontSizeMultiplier={1.4}
        >
          {gap ? 'Tap to add' : missing ? 'Not set' : value}
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
