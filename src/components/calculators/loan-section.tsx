import { ChevronRight } from 'lucide-react-native';
import type { FC, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { FitText, useGroupFits } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** A section of the calculator: its gradient icon and name. */
export function LoanSectionHeading({
  icon: Icon,
  className,
  children,
}: {
  icon: FC<SvgProps>;
  className?: string;
  children: string;
}) {
  return (
    <View className={cn('w-full flex-row items-center gap-[10px]', className)}>
      <View
        className="h-[26px] w-[26px]"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon width="100%" height="100%" />
      </View>
      <Text
        accessibilityRole="header"
        className="shrink font-app-semibold text-[17px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {children}
      </Text>
    </View>
  );
}

/** The white card a section's rows sit in. */
export function LoanCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <View
      className={cn('w-full overflow-hidden rounded-[20px] border border-line bg-card', className)}
    >
      {children}
    </View>
  );
}

/**
 * One tappable line of a card: a label, its value and a chevron. Put a card's rows in one FitRows:
 * while every label's widest word fits beside its value they share a line, and once one cannot,
 * every row puts its value under its label.
 */
export function LoanCardRow({
  id,
  label,
  value,
  unset = false,
  first = false,
  onPress,
}: {
  /** Names the fit slots; unique in its card. */
  id: string;
  label: string;
  value: string;
  /** The value is a "nothing set" word rather than a figure. */
  unset?: boolean;
  /** No rule above it. */
  first?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const stacked = !useGroupFits();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('loan.sliderRow.edit', { label, value })}
      onPress={onPress}
      className={cn(
        'w-full flex-row items-center gap-2 px-[18px] py-[16px] active:bg-ink/5',
        first ? undefined : 'border-t border-line',
      )}
    >
      <View
        className={cn(
          'min-w-0 flex-1',
          stacked ? 'items-start' : 'flex-row items-center justify-between gap-3',
        )}
      >
        <FitText
          id={`${id}-label`}
          role="row"
          size={14}
          className="font-app text-muted"
          slotClassName={stacked ? 'w-full' : 'min-w-0 flex-1'}
        >
          {label}
        </FitText>
        <FitText
          id={`${id}-value`}
          hug
          role="row"
          size={15}
          className={unset ? 'font-app text-muted' : 'font-app-semibold text-ink'}
          slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
        >
          {value}
        </FitText>
      </View>
      <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}
