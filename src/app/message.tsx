import { router } from 'expo-router';
import { Eye, Lock, SlidersHorizontal } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** Why Skip: the last page before the account. */
export default function MessageScreen() {
  return (
    <Screen
      showBack
      footer={
        <View className="w-full gap-5">
          <Text
            className="w-full text-center font-app text-[14px] leading-[21px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {t('support.why.know')}
            {'\n'}
            <Text className="font-app-semibold text-ink">{t('support.why.decide')}</Text>
          </Text>
          <Button label={t('support.why.go')} onPress={() => router.push('/auth')} />
        </View>
      }
    >
      <View className="w-full flex-1 items-center justify-center py-6">
        <Text
          className="font-app-semibold text-[12px] uppercase tracking-[2px] text-accent-ink"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {t('support.why.eyebrow')}
        </Text>
        <Text
          accessibilityRole="header"
          className="mt-4 w-full text-center font-app-bold text-[28px] leading-[34px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.heading}
        >
          {t('support.why.headline')}
          {'\n'}
          <Text className="text-accent-ink">{t('support.why.headlineAccent')}</Text>
        </Text>

        <View className="mt-9 w-full flex-row">
          <Pillar
            icon={Eye}
            title={t('support.why.awareness')}
            line={t('support.why.awarenessLine')}
          />
          <View className="w-px self-stretch bg-line" />
          <Pillar
            icon={Lock}
            title={t('support.why.privacy')}
            line={t('support.why.privacyLine')}
          />
          <View className="w-px self-stretch bg-line" />
          <Pillar
            icon={SlidersHorizontal}
            title={t('support.why.control')}
            line={t('support.why.controlLine')}
          />
        </View>

        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="mt-10 font-app-bold text-[44px] leading-[44px] text-accent-ink opacity-50"
          maxFontSizeMultiplier={TEXT_CAP.figure}
        >
          “
        </Text>
        <Text
          className="w-full text-center font-app text-[16px] leading-[25px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('support.why.quote')}
        </Text>
      </View>
    </Screen>
  );
}

function Pillar({ icon: Icon, title, line }: { icon: LucideIcon; title: string; line: string }) {
  const colors = useColors();
  return (
    <View className="min-w-0 flex-1 items-center px-2">
      <Icon size={24} color={colors.accentInk} strokeWidth={1.6} />
      <Text
        className="mt-3 text-center font-app-semibold text-[15px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {title}
      </Text>
      <Text
        className="mt-1 text-center font-app text-[12px] leading-[17px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {line}
      </Text>
    </View>
  );
}
