import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { SwitchControl } from '@/components/ui/switch-control';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { withTap } from '@/lib/press';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type SettingsRowProps = {
  icon: LucideIcon;
  /**
   * Replaces the icon, for a row carrying somebody else's mark: a brand logo has its own colours
   * and cannot be tinted to match the row without misrepresenting it.
   */
  artwork?: ReactNode;
  title: string;
  subtitle?: string;
  /** Right-hand static value, e.g. a version number. */
  value?: string;
  onPress?: () => void;
  /** Renders a switch instead of a chevron. */
  toggle?: { value: boolean; onChange: (next: boolean) => void };
  destructive?: boolean;
  /** Hides the divider on the last row of a group. */
  last?: boolean;
  /** A control under the row, lined up with the text, e.g. pick-one chips. */
  children?: ReactNode;
};

/**
 * One line of Settings. Title and subtitle wrap between words and the row grows; a value sits beside
 * them while their widest word still fits, and moves under the title once it does not.
 */
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
  children,
}: SettingsRowProps) {
  const colors = useColors();
  const words = useFitGroup({ mode: 'switch' });
  const tint = destructive ? colors.danger : colors.body;
  const isInteractive = Boolean(onPress) && !toggle;
  const shownValue = toggle ? undefined : value;
  const stacked = Boolean(shownValue) && !words.fits;

  const valueText = shownValue ? (
    <FitText
      id="value"
      hug
      role="row"
      size={14}
      className="font-app text-muted"
      slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
    >
      {shownValue}
    </FitText>
  ) : null;

  const body = (
    <FitGroup group={words} className="w-full">
      <View className="w-full flex-row items-center gap-3 py-3.5">
        {/* A 40pt leading slot either way, so every row's text starts on the same column and the
            divider can be inset to meet it. */}
        {artwork ? (
          <View className="h-10 w-10 items-center justify-center">{artwork}</View>
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-ink/5">
            <Icon size={20} color={tint} strokeWidth={1.8} />
          </View>
        )}

        <View className="min-w-0 flex-1 items-start">
          <FitText
            id="title"
            role="row"
            size={15}
            className={cn('font-app-medium', destructive ? 'text-danger' : 'text-ink')}
            slotClassName="w-full"
          >
            {title}
          </FitText>
          {stacked ? valueText : null}
          {subtitle ? (
            <FitText
              id="subtitle"
              role="row"
              size={12}
              className="font-app text-muted"
              slotClassName="mt-0.5 w-full"
            >
              {subtitle}
            </FitText>
          ) : null}
        </View>

        {toggle ? (
          <SwitchControl
            value={toggle.value}
            onValueChange={toggle.onChange}
            accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
          />
        ) : shownValue ? (
          stacked ? null : (
            valueText
          )
        ) : isInteractive ? (
          <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
        ) : null}
      </View>
    </FitGroup>
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

      {children ? <View className="-mt-1 ml-[52px] pb-3.5">{children}</View> : null}

      {/* Inset to line up under the text, not the icon: the same 52pt every other list uses. */}
      {last ? null : <View className="ml-[52px] h-px bg-line/60" />}
    </View>
  );
}
