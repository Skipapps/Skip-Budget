import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { ChipButton, type ChipButtonProps } from '@/components/payments/chip-button';
import { FitFigure } from '@/components/ui/fit-group';
import { useTheme } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';
import { TEXT_CAP } from '@/theme/text-scale';

type PlumCardProps = {
  /** "Due in October", "Paid in 2026", "Paid since 2020". */
  label: string;
  /** Already formatted. */
  figure: string;
  /** Everything on the card but the chip, read by VoiceOver as one stop. */
  accessibilityLabel: string;
  /** Under the figure: "4 bills · 2 paid · 2 coming up". */
  caption?: string | null;
  /** The month the card shows, top right. */
  chip?: Omit<ChipButtonProps, 'tone'> | null;
  /** Under a rule at the bottom: "Next: AEP · 22 Oct". */
  footer?: string | null;
  /** More under the caption, such as the history's stats and bars. */
  children?: ReactNode;
  testID?: string;
};

/** 90% white: 4.92:1 on the accent, where 80% would fall to 4.27. */
const SOFT = 'text-on-control/90';

/**
 * The accent card at the top of the bills, subscriptions and payment pages: a label, the figure,
 * what it is made of. The accent and its white type are the same in light and dark (5.6:1), so only
 * the shadow, which a dark page swallows, is light-only.
 *
 * The chip is drawn over a hidden copy of itself that holds its room beside the label. That keeps
 * it out of the card's single VoiceOver stop, as a button of its own read after the card, while the
 * label still wraps in whatever room it leaves.
 */
export function PlumCard({
  label,
  figure,
  accessibilityLabel,
  caption,
  chip,
  footer,
  children,
  testID = 'plum-card',
}: PlumCardProps) {
  const { scheme } = useTheme();

  return (
    <View
      testID={testID}
      className="w-full rounded-[22px] bg-accent p-[20px]"
      style={scheme === 'light' ? shadows.card : undefined}
    >
      <View accessible accessibilityLabel={accessibilityLabel} testID={`${testID}-summary`}>
        <View className="w-full flex-row">
          <Text
            className={`min-w-0 flex-1 self-center font-app text-[15px] ${SOFT}`}
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {label}
          </Text>
          {chip ? (
            <View
              testID={`${testID}-chip-room`}
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              className="ml-[12px] self-start opacity-0"
            >
              <ChipButton
                label={chip.label}
                accessibilityLabel={chip.accessibilityLabel}
                onPress={() => {}}
                tone="accent"
              />
            </View>
          ) : null}
        </View>

        <FitFigure
          id={`${testID}-figure`}
          size={36}
          className="font-app-bold text-on-control"
          boxClassName="mt-[4px]"
        >
          {figure}
        </FitFigure>

        {caption ? (
          <Text
            className={`mt-[2px] font-app text-[13px] ${SOFT}`}
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {caption}
          </Text>
        ) : null}

        {children}

        {footer ? (
          <>
            <View className="mt-[14px] h-px w-full bg-on-control/20" />
            <Text
              className="mt-[12px] font-app-semibold text-[14px] text-on-control"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {footer}
            </Text>
          </>
        ) : null}
      </View>

      {chip ? (
        <View className="absolute right-[20px] top-[20px]">
          <ChipButton {...chip} tone="accent" />
        </View>
      ) : null}
    </View>
  );
}
