import { ChevronDown, ChevronUp } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { LoanCard } from '@/components/calculators/loan-section';
import { t } from '@/i18n';
import { useColors } from '@/providers/theme-provider';
import { useLoanIcons } from '@/theme/loan-icons';
import { TEXT_CAP } from '@/theme/text-scale';

/** Extra payments, fees and the interest convention, folded away until asked for, then opened in place. */
export function MoreOptionsCard({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const colors = useColors();
  const { moreOptions: Icon } = useLoanIcons();
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <LoanCard>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('loan.calculator.moreOptions')}
        accessibilityHint={t('loan.calculator.moreOptionsHint')}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        className="w-full flex-row items-center gap-[14px] px-[18px] py-[16px] active:bg-ink/5"
      >
        <View
          className="h-[38px] w-[38px]"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Icon width="100%" height="100%" />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="font-app-semibold text-[15px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('loan.calculator.moreOptions')}
          </Text>
          <Text
            className="mt-0.5 font-app text-[12px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('loan.calculator.moreOptionsHint')}
          </Text>
        </View>
        <View className="shrink-0 flex-row items-center gap-1.5">
          <Text
            className="font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {t('common.optional')}
          </Text>
          <Chevron size={18} color={colors.muted} strokeWidth={2} />
        </View>
      </Pressable>

      {open ? (
        <View className="w-full border-t border-line" testID="loan-more-options">
          {children}
        </View>
      ) : null}
    </LoanCard>
  );
}
