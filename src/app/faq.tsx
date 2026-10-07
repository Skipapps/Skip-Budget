import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, Text, UIManager, View } from 'react-native';

import { useProPrices } from '@/api/pro';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { FieldLabel, Subtitle } from '@/components/ui/typography';
import { t } from '@/i18n';
import { proMonthlyLabel, proYearlyLabel } from '@/lib/wall';
import { useColors } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Entry = { question: string; answer: string };
type Group = { title: string; entries: Entry[] };

/** "$1.99/mo" without its "/mo": the answer words the period itself. */
function amountOf(label: string, period: 'pro.price.monthly' | 'pro.price.yearly'): string {
  const suffix = t(period, { price: '' });
  return label.endsWith(suffix) ? label.slice(0, label.length - suffix.length) : label;
}

/**
 * Bundled with the app, not fetched: works offline and is versioned with the code it explains.
 * Built on render so it reads in the language on screen.
 */
function faqGroups(prices: { monthly: string; yearly: string }): Group[] {
  return [
    {
      title: t('faq.start.title'),
      entries: [
        { question: t('faq.start.bank.q'), answer: t('faq.start.bank.a') },
        { question: t('faq.start.card.q'), answer: t('faq.start.card.a') },
        { question: t('faq.start.first.q'), answer: t('faq.start.first.a') },
      ],
    },
    {
      title: t('faq.money.title'),
      entries: [
        { question: t('faq.money.left.q'), answer: t('faq.money.left.a') },
        { question: t('faq.money.savings.q'), answer: t('faq.money.savings.a') },
        { question: t('faq.money.correct.q'), answer: t('faq.money.correct.a') },
        { question: t('faq.money.balances.q'), answer: t('faq.money.balances.a') },
      ],
    },
    {
      title: t('faq.receipts.title'),
      entries: [
        { question: t('faq.receipts.leave.q'), answer: t('faq.receipts.leave.a') },
        { question: t('faq.receipts.wrong.q'), answer: t('faq.receipts.wrong.a') },
      ],
    },
    {
      title: t('faq.loans.title'),
      entries: [{ question: t('faq.loans.match.q'), answer: t('faq.loans.match.a') }],
    },
    {
      title: t('faq.reminders.title'),
      entries: [{ question: t('faq.reminders.missing.q'), answer: t('faq.reminders.missing.a') }],
    },
    {
      title: t('faq.pro.title'),
      entries: [
        { question: t('faq.pro.include.q'), answer: t('faq.pro.include.a', prices) },
        { question: t('faq.pro.cancelled.q'), answer: t('faq.pro.cancelled.a') },
        { question: t('faq.pro.cancel.q'), answer: t('faq.pro.cancel.a') },
      ],
    },
    {
      title: t('faq.privacy.title'),
      entries: [
        { question: t('faq.privacy.leaves.q'), answer: t('faq.privacy.leaves.a') },
        { question: t('faq.privacy.delete.q'), answer: t('faq.privacy.delete.a') },
      ],
    },
  ];
}

export default function FaqScreen() {
  // The store's own prices, so each storefront reads its own currency; the US-dollar fallback
  // only shows while the store has not answered.
  const store = useProPrices().data;
  const groups = faqGroups({
    monthly:
      store?.monthly?.product.priceString ?? amountOf(proMonthlyLabel(), 'pro.price.monthly'),
    yearly: store?.yearly?.product.priceString ?? amountOf(proYearlyLabel(), 'pro.price.yearly'),
  });

  return (
    <Screen title={t('faq.title')} showBack>
      <Subtitle className="mt-3 w-full text-left">{t('faq.intro')}</Subtitle>

      {groups.map((group) => (
        <View key={group.title} className="mt-8 w-full">
          <FieldLabel className="mb-3">{group.title}</FieldLabel>
          <View className="w-full gap-3">
            {group.entries.map((entry) => (
              <QuestionCard key={entry.question} question={entry.question} answer={entry.answer} />
            ))}
          </View>
        </View>
      ))}

      <View className="mb-10 mt-9 w-full">
        <Button
          label={t('faq.stuck')}
          variant="outline"
          onPress={() => router.push('/contact?topic=support')}
        />
      </View>
    </Screen>
  );
}

/** One question as a card. The whole card is the tap target, not just the chevron. */
function QuestionCard({ question, answer }: Entry) {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((current) => !current);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={question}
      accessibilityHint={open ? t('faq.hint.hide') : t('faq.hint.show')}
      onPress={toggle}
      style={shadows.card}
      className="w-full rounded-[14px] border border-line bg-card px-5 py-4 active:bg-ink/5"
    >
      <View className="w-full flex-row items-center gap-3">
        <Text
          className="min-w-0 flex-1 font-app-semibold text-[15px] leading-[21px] text-ink"
          maxFontSizeMultiplier={1.4}
        >
          {question}
        </Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown size={18} color={colors.muted} strokeWidth={2} />
        </View>
      </View>

      {open ? (
        <Text
          className="mt-3 font-app text-[14px] leading-[21px] text-body"
          maxFontSizeMultiplier={1.5}
        >
          {answer}
        </Text>
      ) : null}
    </Pressable>
  );
}
