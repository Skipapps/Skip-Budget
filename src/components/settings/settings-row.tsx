import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { toggle as toggleFeedback } from '@/lib/haptics';
import { withTap } from '@/lib/press';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type SettingsRowProps = {
  icon: LucideIcon;
  /**
   * Replaces the icon entirely, for a row that carries somebody else's mark.
   *
   * A brand logo is not a glyph: it has its own colours and cannot be tinted
   * to match the row without misrepresenting it.
   */
  artwork?: ReactNode;
  title: string;
  subtitle?: string;
  /** Right-hand static value, e.g. a version number. */
  value?: string;
  onPress?: () => void;
  /** Renders a switch instead of a chevron. */
  toggle?: { value: boolean; onChange: (next: boolean) => void };
  /** Red treatment for destructive actions. */
  destructive?: boolean;
  /** Hides the divider on the last row of a group. */
  last?: boolean;
};

export function SettingsRow({
  icon: Icon,
  artwork,
  title,
  subtitle,
  value,
  onPress,
  toggle,
  destructive = false,
  last = false,
}: SettingsRowProps) {
  const colors = useColors();
  const tint = destructive ? '#DC2626' : colors.body;
  const isInteractive = Boolean(onPress) && !toggle;

  const body = (
    <View className="w-full flex-row items-center gap-3 py-3.5">
      {artwork ?? <Icon size={20} color={tint} strokeWidth={1.8} />}

      <View className="min-w-0 flex-1">
        <Text
          className={cn(
            'font-poppins-medium text-[15px]',
            destructive ? 'text-[#DC2626]' : 'text-ink',
          )}
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="mt-0.5 font-poppins text-[12px] text-muted"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {toggle ? (
        <Switch
          value={toggle.value}
          // A switch is a press too, and a firmer one: it changed something
          // rather than opening something.
          onValueChange={(next) => {
            toggleFeedback();
            toggle.onChange(next);
          }}
          trackColor={{ false: colors.line, true: colors.control }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.line}
        />
      ) : value ? (
        <Text className="font-poppins text-[14px] text-muted" maxFontSizeMultiplier={1.3}>
          {value}
        </Text>
      ) : isInteractive ? (
        <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
      ) : null}
    </View>
  );

  return (
    <View className="w-full">
      {isInteractive ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
          onPress={withTap(onPress)}
          className="w-full active:opacity-60"
        >
          {body}
        </Pressable>
      ) : (
        body
      )}

      {/* Inset to line up under the text, not the icon. */}
      {last ? null : <View className="ml-8 h-px bg-line/70" />}
    </View>
  );
}
