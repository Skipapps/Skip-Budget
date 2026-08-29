import { Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Title } from '@/components/ui/typography';

/**
 * The house style for a document somebody has to actually read.
 *
 * Legal copy fails on phones for layout reasons more than legal ones: solid
 * blocks of justified small print, no hierarchy, nothing to scan. Numbered
 * sections, real headings and a line length that stops well short of the
 * screen edge cost nothing and are the difference between a policy that is
 * published and one that is read.
 */

export type Block =
  | { kind: 'text'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'note'; text: string };

export type Section = {
  heading: string;
  blocks: Block[];
};

type LegalDocumentProps = {
  title: string;
  /** Shown under the title. The date the wording last changed. */
  updated: string;
  summary: string;
  sections: Section[];
};

export function LegalDocument({ title, updated, summary, sections }: LegalDocumentProps) {
  return (
    <Screen showBack>
      <Title align="left" className="mt-1 w-full">
        {title}
      </Title>

      <Text className="mt-2 w-full font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.4}>
        Last updated {updated}
      </Text>

      <Text
        className="mt-5 w-full font-poppins text-[15px] leading-[24px] text-body"
        maxFontSizeMultiplier={1.4}
      >
        {summary}
      </Text>

      {sections.map((section, index) => (
        <View key={section.heading} className="mt-8 w-full">
          <Text
            className="w-full font-poppins-bold text-[17px] text-ink"
            maxFontSizeMultiplier={1.3}
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
                        className="font-poppins text-[15px] leading-[23px] text-muted"
                        maxFontSizeMultiplier={1.4}
                      >
                        •
                      </Text>
                      <Text
                        className="flex-1 font-poppins text-[15px] leading-[23px] text-body"
                        maxFontSizeMultiplier={1.4}
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
                    className="font-poppins text-[14px] leading-[21px] text-body"
                    maxFontSizeMultiplier={1.4}
                  >
                    {block.text}
                  </Text>
                </View>
              );
            }

            return (
              <Text
                key={blockIndex}
                className="mt-3 w-full font-poppins text-[15px] leading-[23px] text-body"
                maxFontSizeMultiplier={1.4}
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
