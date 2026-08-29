import { Check, Moon, Monitor, Sun } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { SettingsSection } from '@/components/settings/settings-section';
import { Title } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { useColors, useTheme } from '@/providers/theme-provider';
import { ACCENTS, MODES, onColor, type AccentId, type ModeKey } from '@/theme/palette';

/**
 * Choosing what the app looks like.
 *
 * Two different commitments, so two different interactions. Mode applies the
 * moment it is tapped, because seeing it is the only way to judge it and going
 * back is one more tap. Colour is staged behind a save: the swatches are how
 * you compare them, and repainting the entire app twelve times while somebody
 * makes their mind up is not comparison, it is a strobe.
 */

const MODE_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

export default function AppearanceScreen() {
  const colors = useColors();
  const { mode, accentId, setMode, setAccent } = useTheme();

  // Null until a swatch is touched, so the stored choice shows through.
  const [draft, setDraft] = useState<AccentId | null>(null);
  const chosen = draft ?? accentId;
  const dirty = draft !== null && draft !== accentId;

  const chosenLabel = ACCENTS.find((accent) => accent.id === chosen)?.label ?? '';

  return (
    <Screen showBack>
      <Title align="left" className="mt-1 w-full">
        Appearance
      </Title>

      <SettingsSection title="Mode">
        {MODES.map((option) => {
          const Icon = MODE_ICONS[option.id as ModeKey];
          const selected = mode === option.id;

          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label}. ${option.caption}`}
              onPress={() => setMode(option.id as ModeKey)}
              className={cn(
                'mb-2.5 w-full flex-row items-center gap-3.5 rounded-[16px] border px-4 py-3.5',
                selected ? 'border-accent bg-accent/10' : 'border-line bg-card active:bg-ink/5',
              )}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                <Icon size={20} color={colors.accentInk} strokeWidth={2} />
              </View>

              <View className="flex-1">
                <Text
                  className="font-poppins-semibold text-[16px] text-ink"
                  maxFontSizeMultiplier={1.3}
                >
                  {option.label}
                </Text>
                <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
                  {option.caption}
                </Text>
              </View>

              {selected ? <Check size={22} color={colors.accentInk} strokeWidth={2.6} /> : null}
            </Pressable>
          );
        })}
      </SettingsSection>

      <SettingsSection title="Colour">
        <Text
          className="mb-4 font-poppins text-[14px] leading-[21px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          Used for buttons, the tab bar, charts and every highlight in the app.
          {dirty ? ` Choosing ${chosenLabel.toLowerCase()} — applies when you save.` : ''}
        </Text>

        <View className="w-full flex-row flex-wrap">
          {ACCENTS.map((accent) => {
            const selected = accent.id === chosen;

            return (
              <View key={accent.id} className="w-1/4 items-center pb-5">
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={accent.label}
                  onPress={() => setDraft(accent.id)}
                  style={{
                    backgroundColor: accent.value,
                    // The ring sits outside the swatch, so a pale colour is
                    // still visibly chosen rather than merging into the page.
                    borderColor: selected ? colors.ink : 'transparent',
                    borderWidth: 3,
                  }}
                  className="h-[58px] w-[58px] items-center justify-center rounded-full active:opacity-80"
                >
                  {selected ? (
                    <Check size={24} color={onColor(accent.value)} strokeWidth={3} />
                  ) : null}
                </Pressable>

                <Text
                  className="mt-2 text-center font-poppins text-[12px] text-body"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {accent.label}
                </Text>
              </View>
            );
          })}
        </View>

        {dirty ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Use ${chosenLabel}`}
            onPress={() => {
              setAccent(chosen);
              setDraft(null);
            }}
            className="mt-1 self-end rounded-full bg-control px-6 py-3 active:bg-control-pressed"
          >
            <Text
              className="font-poppins-medium text-[14px] text-on-control"
              maxFontSizeMultiplier={1.2}
            >
              Save
            </Text>
          </Pressable>
        ) : null}
      </SettingsSection>

      <View className="h-16 w-full" />
    </Screen>
  );
}
