import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { Screen } from '@/components/ui/screen';
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';

type Entry = { question: string; answer: string };

/**
 * Answers that ship with the release they describe.
 *
 * In the app rather than on a server, on purpose: it works offline, it opens
 * instantly, and the copy is versioned with the code it explains — an FAQ that
 * can drift ahead of the app is one that lies about it. The trade is that a
 * fix needs a release, which is the right trade while the answers are few.
 */
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
          'Your pay, under Cards → Salary. Left this month, savings and Insights all start from what comes in. The Getting Started card on Home walks you through the rest — a card, a bill, a scanned receipt, reminders.',
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
        question: 'Why don’t my card balances update by themselves?',
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
    title: 'Splitting with friends',
    entries: [
      {
        question: 'How do friends find me?',
        answer:
          'Only by your code, on the Friends screen. There is no search by name or email, so nobody can find out you use Skip unless you hand them your code yourself.',
      },
      {
        question: 'Does settling up move real money?',
        answer:
          'No. Skip never touches your money. Settling up writes down that a payment happened somewhere else — cash, a bank transfer, a round of drinks — so the group’s ledger stays honest.',
      },
      {
        question: 'What does “simplify who pays whom” do?',
        answer:
          'It collapses chains: if A owes B and B owes C, it suggests A pays C directly, so fewer payments settle the group. The trade is that you may be asked to pay somebody you never ate with — which is why it is a switch on the group, not a rule.',
      },
      {
        question: 'Can I split with somebody who doesn’t have Skip?',
        answer:
          'Yes. Add them to a group by name — they can owe and be owed like anyone else. When they join Skip with the group’s code, they claim their name and their whole history comes with it.',
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
    title: 'Privacy and your data',
    entries: [
      {
        question: 'What leaves my phone?',
        answer:
          'Only what you save: the bills, receipts and groups on your account, stored so your own devices agree with each other. No bank connection, no receipt photos, no contact list, no tracking of what you do in the app to sell.',
      },
      {
        question: 'How do I delete my account?',
        answer:
          'Settings → Account → Delete account. Everything that is yours goes with it immediately — there is no grace copy kept. The one exception is shared groups: bills you were part of stay in your groupmates’ ledgers under just your name, because their history belongs to them too.',
      },
    ],
  },
];

export default function FaqScreen() {
  return (
    <Screen showBack>
      <Title align="left" className="mt-2">
        Common questions
      </Title>
      <Subtitle className="mt-3 w-full text-left">
        Short answers to the things people ask. If yours is not here, message us — a person reads
        every one.
      </Subtitle>

      {GROUPS.map((group) => (
        <View key={group.title} className="mt-8 w-full">
          <FieldLabel className="mb-3">{group.title}</FieldLabel>
          <View className="w-full gap-2.5">
            {group.entries.map((entry) => (
              <CollapsibleSection key={entry.question} title={entry.question}>
                <Text
                  className="font-poppins text-[14px] leading-[21px] text-body"
                  maxFontSizeMultiplier={1.5}
                >
                  {entry.answer}
                </Text>
              </CollapsibleSection>
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
