import { LegalDocument, type Section } from '@/components/ui/legal-document';

/**
 * A developer's draft, not legal advice.
 *
 * The parts that describe the software are accurate. The parts that describe
 * the business — who is contracting, under which country's law, and what
 * happens in a dispute — are marked and need a lawyer's eye and the owner's
 * decision before this is relied on.
 */

const SECTIONS: Section[] = [
  {
    heading: 'Agreeing to these terms',
    blocks: [
      {
        kind: 'text',
        text: 'By creating an account or using Skip you agree to these terms. If you do not agree with them, do not use the app. If you are using Skip on behalf of somebody else, you confirm you are allowed to agree on their behalf.',
      },
    ],
  },
  {
    heading: 'What Skip is, and what it is not',
    blocks: [
      {
        kind: 'text',
        text: 'Skip is a tool for writing down and looking at your own money. It records what you tell it and does arithmetic on it.',
      },
      {
        kind: 'note',
        text: 'Skip is not a bank, a payment service, an accountant or a financial adviser. Nothing in the app is financial, tax or legal advice. Every figure comes from something you entered, and Skip cannot know whether it is right.',
      },
      {
        kind: 'text',
        text: 'Skip has no connection to your bank and cannot move, hold, send or receive money. Projections of future bills and paydays are estimates based on the schedules you set, not statements about what will happen.',
      },
    ],
  },
  {
    heading: 'Your account',
    blocks: [
      {
        kind: 'bullets',
        items: [
          'Give accurate details when you sign up, and keep your sign-in method secure.',
          'An account is for one person. You are responsible for what happens under yours.',
          'Tell us at admin@skipapps.net if you think somebody else has got into it.',
        ],
      },
    ],
  },
  {
    heading: 'Using Skip properly',
    blocks: [
      {
        kind: 'text',
        text: 'You agree not to break the law with Skip, not to try to reach other people’s data, not to attack or overload the service, and not to pull it apart to rebuild or resell it.',
      },
    ],
  },
  {
    heading: 'What you put in stays yours',
    blocks: [
      {
        kind: 'text',
        text: 'Everything you enter belongs to you. You give us only the permission needed to run the app for you — to store it, back it up and show it back to you on your devices. That permission ends when you delete the data or your account.',
      },
    ],
  },
  {
    heading: 'The app will change',
    blocks: [
      {
        kind: 'text',
        text: 'Skip is under active development. Features may be added, altered or withdrawn, and the app may be unavailable at times for maintenance or for reasons outside our control. We do not promise any particular level of availability.',
      },
    ],
  },
  {
    heading: 'Money',
    blocks: [
      {
        kind: 'text',
        text: 'Skip is currently free to use and has no in-app purchases or subscriptions. The “Buy a coffee for team” link is an entirely voluntary tip handled by Buy Me a Coffee under their own terms; it buys no feature and no obligation. If paid features are ever introduced, the terms and the price will be shown before you are asked to pay for anything.',
      },
    ],
  },
  {
    heading: 'No warranty',
    blocks: [
      {
        kind: 'text',
        text: 'Skip is provided as it is. To the extent the law allows, we make no warranty that it will be uninterrupted, error-free, or that its calculations will suit any particular purpose. You are responsible for the financial decisions you make.',
      },
    ],
  },
  {
    heading: 'Limits on liability',
    blocks: [
      {
        kind: 'text',
        text: 'To the extent the law allows, we are not liable for indirect or consequential loss, for lost profits or savings, or for any loss arising from decisions you made using Skip. Nothing here limits liability that cannot lawfully be limited — including for death or personal injury caused by negligence, or for fraud.',
      },
    ],
  },
  {
    heading: 'Ending it',
    blocks: [
      {
        kind: 'text',
        text: 'You can stop using Skip and delete your account at any time from Settings, which removes your data permanently. We may suspend or close an account that breaks these terms, and will say why where we can.',
      },
    ],
  },
  {
    heading: 'Changes to these terms',
    blocks: [
      {
        kind: 'text',
        text: 'If these terms change materially, the date at the top changes and you will be told in the app before the change takes effect. Continuing to use Skip after that means you accept the new terms.',
      },
    ],
  },
  {
    heading: 'Law and contact',
    blocks: [
      {
        kind: 'text',
        text: 'Questions about these terms go to admin@skipapps.net.',
      },
      {
        kind: 'note',
        text: 'The governing law and the courts that would hear a dispute are set by where the Weknd team legally operates, and are to be confirmed before release.',
      },
    ],
  },
];

export default function TermsScreen() {
  return (
    <LegalDocument
      title="Terms of service"
      updated="28 August 2026"
      summary="The agreement between you and the Weknd team for using Skip. In short: it is a tool for tracking your own money, it is not financial advice, what you enter stays yours, and you can delete all of it whenever you like."
      sections={SECTIONS}
    />
  );
}
