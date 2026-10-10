import { Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
import { useLoanIcons } from '@/theme/loan-icons';
import { TEXT_CAP } from '@/theme/text-scale';

type PaymentHeadlineProps = {
  payment: number;
  /** What the figure is; "Monthly payment" unless it is the bank's own. */
  label?: string;
  /** Points at the default text setting. */
  size: number;
  /** Drawn after the figure, lighter: "/ month". */
  suffix?: string;
  /** Opens the page to type the lender's own payment; without it the figure is plain text. */
  onEdit?: () => void;
};

/**
 * The loan's monthly payment beside the hand-and-coin icon, as every loan page opens. The figure is
 * a group of one: smaller only when its line is too narrow, never under 11pt, always whole.
 */
export function PaymentHeadline({
  payment,
  label = t('loan.monthlyPayment'),
  size,
  suffix,
  onEdit,
}: PaymentHeadlineProps) {
  const colors = useColors();
  const { result: Icon } = useLoanIcons();
  const figure = useFitGroup({ mode: 'shrink' });
  // The suffix's own width, which the figure's line has to leave free.
  const [suffixWidth, setSuffixWidth] = useState(0);
  const amount = formatCurrency(payment);

  const body = (
    <View className="min-w-0 flex-1">
      <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={TEXT_CAP.control}>
        {label}
      </Text>
      <FitGroup group={figure} className="mt-0.5 w-full" testID="fit-figure-payment">
        <FitText
          id="payment"
          role="figure"
          size={size}
          className="font-app-bold text-ink"
          slotClassName="w-full flex-row items-baseline"
          reserve={suffix ? suffixWidth : 0}
          scrollWhenTooWide
          after={
            suffix ? (
              <Text
                onLayout={(event) => setSuffixWidth(Math.ceil(event.nativeEvent.layout.width))}
                className="shrink-0 pl-1.5 font-app text-[15px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {suffix}
              </Text>
            ) : undefined
          }
        >
          {amount}
        </FitText>
      </FitGroup>
    </View>
  );

  const icon = (
    <View
      className="h-[52px] w-[52px]"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon width="100%" height="100%" />
    </View>
  );

  if (!onEdit) {
    return (
      <View className="w-full flex-row items-center gap-[14px]">
        {icon}
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('loan.sliderRow.edit', { label, value: amount })}
      onPress={onEdit}
      className="w-full flex-row items-center gap-[14px] rounded-[14px] active:opacity-60"
    >
      {icon}
      {body}
      <Pencil size={18} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}
