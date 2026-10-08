import { Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Title } from '@/components/ui/typography';
import { t, useLocale } from '@/i18n';
import { TEXT_CAP } from '@/theme/text-scale';

type Block =
  | { kind: 'text'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'note'; text: string };

export type Section = {
  heading: string;
  blocks: Block[];
};

type LegalDocumentProps = {
  title: string;
  /** The date the wording last changed, already written in the language on screen. */
  updated: string;
  summary: string;
  sections: Section[];
};

export function LegalDocument({ title, updated, summary, sections }: LegalDocumentProps) {
  const { language } = useLocale();

  return (
    <Screen showBack>
      <Title align="left" className="w-full">
        {title}
      </Title>

      <Text
        className="mt-2 w-full font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('legal.lastUpdated', { date: updated })}
      </Text>

      {/* The English is the original; every other language is a courtesy translation of it. */}
      {language !== 'en' ? (
        <View className="mt-4 w-full rounded-[12px] bg-ink/[0.04] px-4 py-3">
          <Text
            className="font-app text-[14px] leading-[21px] text-body"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {t('legal.translationNotice')}
          </Text>
        </View>
      ) : null}

      <Text
        className="mt-5 w-full font-app text-[15px] leading-[24px] text-body"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {summary}
      </Text>

      {sections.map((section, index) => (
        <View key={section.heading} className="mt-8 w-full">
          <Text
            className="w-full font-app-bold text-[17px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.heading}
          >
            {index + 1}. {section.heading}
          </Text>

          {section.blocks.map((block, blockIndex) => {
            if (block.kind === 'bullets') {
              return (
                <View key={blockIndex} className="mt-3 w-full gap-2">
                  {block.items.map((item) => (
                    <View key={item} className="w-full flex-row gap-2.5">
                      <Text
                        className="font-app text-[15px] leading-[23px] text-muted"
                        maxFontSizeMultiplier={TEXT_CAP.reading}
                      >
                        •
                      </Text>
                      <Text
                        className="flex-1 font-app text-[15px] leading-[23px] text-body"
                        maxFontSizeMultiplier={TEXT_CAP.reading}
                      >
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            }

            if (block.kind === 'note') {
              return (
                <View
                  key={blockIndex}
                  className="mt-3 w-full rounded-[12px] bg-ink/[0.04] px-4 py-3"
                >
                  <Text
                    className="font-app text-[14px] leading-[21px] text-body"
                    maxFontSizeMultiplier={TEXT_CAP.reading}
                  >
                    {block.text}
                  </Text>
                </View>
              );
            }

            return (
              <Text
                key={blockIndex}
                className="mt-3 w-full font-app text-[15px] leading-[23px] text-body"
                maxFontSizeMultiplier={TEXT_CAP.reading}
              >
                {block.text}
              </Text>
            );
          })}
        </View>
      ))}

      <View className="h-20 w-full" />
    </Screen>
  );
}
