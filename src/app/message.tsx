import { router } from 'expo-router';
import { Eye, Lock, SlidersHorizontal } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Strong, Subtitle } from '@/components/ui/typography';
import { useColors } from '@/providers/theme-provider';

export default function MessageScreen() {
  return (
    <Screen
      title="Why Skip is different"
      showBack
      footer={<Button label="Let's go" onPress={() => router.push('/auth')} />}
    >
      <Subtitle className="mt-3 w-full">
        Built for people who want to truly understand their money — not automate it and forget it.
      </Subtitle>

      <View className="mt-8 w-full gap-3">
        <Pillar
          icon={Eye}
          title="Awareness"
          line="Recording your spending helps you notice where your money goes."
        />
        <Pillar
          icon={Lock}
          title="Privacy"
          line="No bank logins, no imports. Your records stay yours."
        />
        <Pillar
          icon={SlidersHorizontal}
          title="Control"
          line="You decide what counts — not an algorithm."
        />
      </View>

      <View className="mt-6 w-full rounded-[16px] bg-accent/10 px-5 py-4">
        <QuoteLine>
          “People once recorded every penny in a ledger. Skip brings that same financial awareness
          into modern life — without the paperwork.”
        </QuoteLine>
      </View>

      <Text
        className="mt-6 w-full text-center font-poppins text-[14px] leading-5 text-body"
        maxFontSizeMultiplier={1.4}
      >
        Know where your money goes. <Strong>Decide where it goes next.</Strong>
      </Text>
    </Screen>
  );
}

function Pillar({ icon: Icon, title, line }: { icon: LucideIcon; title: string; line: string }) {
  const colors = useColors();
  return (
    <View className="w-full flex-row items-start gap-3 rounded-[16px] bg-ink/[0.035] px-4 py-3.5">
      <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
        <Icon size={19} color={colors.accentInk} strokeWidth={1.8} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
        <Text
          className="mt-0.5 font-poppins text-[13px] leading-[19px] text-body"
          maxFontSizeMultiplier={1.4}
        >
          {line}
        </Text>
      </View>
    </View>
  );
}

function QuoteLine({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Text
      className="font-poppins text-[14px] italic leading-[22px]"
      style={{ color: colors.accentInk }}
      maxFontSizeMultiplier={1.4}
    >
      {children}
    </Text>
  );
}
