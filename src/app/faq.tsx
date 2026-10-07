import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, Text, UIManager, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { FieldLabel, Subtitle } from '@/components/ui/typography';
import { useColors } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Entry = { question: string; answer: string };

/** Bundled with the app, not fetched: works offline and is versioned with the code it explains. */
const GROUPS: { title: string; entries: Entry[] }[] = [
  {
    title: 'Getting started',
    entries: [
      {
        question: 'Why doesn’t Skip connect to my bank?',
        answer:
          'On purpose. Skip never asks for bank credentials, so there is no login to leak and no third party reading your transactions. You tell Skip what happened — by scanning a receipt, or typing a bill once — and everything it knows stays between you and your own account. Your bank never knows Skip exists.',
      },
      {
        question: 'Can I get the Getting started card back?',
        answer:
          'Yes — Settings → Getting started puts it back on Home. It only stays while there is something left to do; once all five steps are done it leaves on its own.',
      },
      {
        question: 'What should I set up first?',
        answer:
          'Your pay, under Cards → Salary. Left this month, savings and Insights all start from what comes in. The Getting Started card on Home walks you through the rest — a credit card, a bank account, your bills and subscriptions.',
      },
    ],
  },
  {
    title: 'Your money',
    entries: [
      {
        question: 'How does “Left this month” work?',
        answer:
          'Your pay for a month, minus the bills and subscriptions due in it. It is a forecast — what the month looks like from here. What you actually kept shows up in Savings once the month is over.',
      },
      {
        question: 'How do savings months work?',
        answer:
          'When a month ends, Skip adds up what came in and everything recorded going out — bills, subscriptions, receipts — and whatever is left becomes that month’s saving. A month that overspent counts against the total, because pretending it saved zero would make the total a lie.',
      },
      {
        question: 'Why can I correct a savings month?',
        answer:
          'Skip only knows what it was told. If you paid a plumber in cash or never scanned a receipt, the month looks better than it was — so you can put in the real figure, with a note, and Skip keeps both numbers so you can always see why they differ.',
      },
      {
        question: 'Why don’t my credit card balances update by themselves?',
        answer:
          'Because Skip is not connected to your bank. A card’s balance starts from the figure you gave it and moves with what you record — bills, subscriptions and receipts paid with that card.',
      },
    ],
  },
  {
    title: 'Receipts',
    entries: [
      {
        question: 'Does my receipt leave my phone?',
        answer:
          'No. The photo is read on the device itself, and only the text Skip understood — the store, the date, the total — is saved to your account. The picture is thrown away.',
      },
      {
        question: 'The scan got something wrong.',
        answer:
          'Tap the receipt and fix the field. Skip fills in what it could read and leaves the rest to you — a wrong guess corrected once does not come back.',
      },
    ],
  },
  {
    title: 'Loans',
    entries: [
      {
        question: 'Why does Skip’s loan figure match my bank when other calculators don’t?',
        answer:
          'Most calculators charge a twelfth of a year’s interest every month. Real lenders charge by the day, so a 31-day month costs more than February. Skip charges by the day too, which is why its payoff matches your statement to the cent.',
      },
    ],
  },
  {
    title: 'Reminders',
    entries: [
      {
        question: 'Why didn’t I get a reminder?',
        answer:
          'Check notifications are on for Skip in the iPhone’s Settings, and that the reminder’s time hasn’t already passed today. Reminders send at the time you chose, in your own time zone.',
      },
    ],
  },
  {
    title: 'Skip Pro and billing',
    entries: [
      {
        question: 'What does Pro include?',
        answer:
          'Unlimited credit cards, accounts and incomes, unlimited receipt scanning, the loan calculator, Insights, early access to new features and first-in-line support. $1.99 a month or $19.99 a year, billed by Apple.',
      },
      {
        question: 'What happens to my things if I cancel?',
        answer:
          'Nothing is locked or deleted — ever. Every credit card, account and figure keeps working exactly as it was; you just cannot add past the free allowance until Pro returns.',
      },
      {
        question: 'How do I cancel?',
        answer:
          'In your Apple subscriptions — Settings → your name → Subscriptions on the iPhone, or from the Skip Pro page in the app. Skip never bills you itself, so cancelling is entirely between you and Apple.',
      },
    ],
  },
  {
    title: 'Privacy and your data',
    entries: [
      {
        question: 'What leaves my phone?',
        answer:
          'Only what you save: the bills, receipts and cards on your account, stored so your own devices agree with each other. No bank connection, no receipt photos, no contact list, no tracking of what you do in the app to sell.',
      },
      {
        question: 'How do I delete my account?',
        answer:
          'Settings → Account → Delete account. Everything that is yours goes with it immediately — there is no grace copy kept.',
      },
    ],
  },
];

export default function FaqScreen() {
  return (
    <Screen title="Common questions" showBack>
      <Subtitle className="mt-3 w-full text-left">
        Short answers to the things people ask. If yours is not here, message us — a person reads
        every one.
      </Subtitle>

      {GROUPS.map((group) => (
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
          label="Still stuck? Message us"
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
      accessibilityHint={open ? 'Collapses the answer' : 'Shows the answer'}
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
