import { router } from 'expo-router';
import { Bell, Calculator, PiggyBank, ScanLine, ShieldCheck } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { t, type MessageKey } from '@/i18n';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** One line each. Nothing navigates: there is no account yet. */
const CAN_DO: { icon: LucideIcon; title: MessageKey; detail: MessageKey }[] = [
  {
    icon: ShieldCheck,
    title: 'onboarding.canDo.bank.title',
    detail: 'onboarding.canDo.bank.detail',
  },
  {
    icon: ScanLine,
    title: 'onboarding.canDo.receipts.title',
    detail: 'onboarding.canDo.receipts.detail',
  },
  {
    icon: Calculator,
    title: 'onboarding.canDo.loans.title',
    detail: 'onboarding.canDo.loans.detail',
  },
  {
    icon: PiggyBank,
    title: 'onboarding.canDo.savings.title',
    detail: 'onboarding.canDo.savings.detail',
  },
  {
    icon: Bell,
    title: 'onboarding.canDo.reminders.title',
    detail: 'onboarding.canDo.reminders.detail',
  },
];

export default function WhatSkipCanDoScreen() {
  const colors = useColors();

  return (
    <Screen
      title={t('onboarding.canDo.title')}
      showBack
      // The last page before the account.
      footer={<Button label={t('onboarding.canDo.go')} onPress={() => router.push('/auth')} />}
    >
      <Text
        className="mt-3 w-full text-center font-app text-[15px] leading-[21px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('onboarding.canDo.subtitle')}
      </Text>

      <View className="mb-6 mt-9 w-full gap-8">
        {CAN_DO.map(({ icon: Icon, title, detail }) => (
          <View
            key={title}
            accessible
            accessibilityLabel={`${t(title)}. ${t(detail)}`}
            className="w-full flex-row items-center gap-4"
          >
            <View className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10">
              <Icon size={20} color={colors.accentInk} strokeWidth={1.6} />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className="font-app-semibold text-[16px] text-ink"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {t(title)}
              </Text>
              <Text
                className="mt-0.5 font-app text-[13px] leading-[18px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.reading}
              >
                {t(detail)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}
