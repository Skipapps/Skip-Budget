import { ChevronDown, Info } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { LayoutAnimation, Platform, Pressable, Text, UIManager, View } from 'react-native';

import { InfoDialog } from '@/components/ui/info-dialog';
import { colors } from '@/theme/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type CollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Text for a pill beside the title, e.g. "Recommended". */
  badgeLabel?: string;
  /** Shown when the pill's info icon is tapped. Requires badgeLabel. */
  infoTitle?: string;
  infoMessage?: string;
};

/** Disclosure used to keep optional form fields out of the way until wanted. */
export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  badgeLabel,
  infoTitle,
  infoMessage,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [infoOpen, setInfoOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((previous) => !previous);
  };

  return (
    <View className="w-full">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={toggle}
        className="w-full flex-row items-center justify-between gap-3 py-2 active:opacity-60"
      >
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="font-poppins-medium text-[17px] text-ink" maxFontSizeMultiplier={1.3}>
            {title}
          </Text>

          {badgeLabel ? (
            <View className="flex-row items-center gap-1 rounded-full bg-accent/15 py-1 pl-2.5 pr-1.5">
              <Text
                className="font-poppins-medium text-[11px] text-ink"
                maxFontSizeMultiplier={1.2}
              >
                {badgeLabel}
              </Text>

              {infoMessage ? (
                // Nested Pressable so tapping the icon explains rather than toggles.
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`About ${badgeLabel.toLowerCase()} details`}
                  hitSlop={8}
                  onPress={() => setInfoOpen(true)}
                  className="active:opacity-60"
                >
                  <Info size={14} color={colors.body} strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown size={20} color={colors.muted} strokeWidth={2} />
        </View>
      </Pressable>

      {open ? <View className="w-full pt-3">{children}</View> : null}

      {infoOpen && infoMessage ? (
        <InfoDialog
          title={infoTitle ?? 'Why add these?'}
          message={infoMessage}
          onClose={() => setInfoOpen(false)}
        />
      ) : null}
    </View>
  );
}
