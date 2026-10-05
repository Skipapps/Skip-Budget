import { LegalDocument, type Section } from '@/components/ui/legal-document';

/** A developer's draft, not legal advice. Factual claims follow what the code actually does. */

const SECTIONS: Section[] = [
  {
    heading: 'Who we are',
    blocks: [
      {
        kind: 'text',
        text: 'Skip is a personal budgeting app published by the Weknd team. Wherever this policy says “we”, it means the team that operates Skip and the servers it talks to.',
      },
      {
        kind: 'text',
        text: 'You can reach us about anything in this policy at admin@skipapps.net.',
      },
    ],
  },
  {
    heading: 'What Skip stores about you',
    blocks: [
      {
        kind: 'text',
        text: 'Skip only holds what you put into it, plus what is needed to keep you signed in. Specifically:',
      },
      {
        kind: 'bullets',
        items: [
          'Your account: the email address you signed up with, or the identifier Apple or Google gives us when you sign in with them.',
          'Your profile: the display name you choose, and nothing else.',
          'Your money: the bills, subscriptions, receipts, loans, salary sources, savings and card payments you enter, and the record of what your bills and subscriptions have charged.',
          'Your credit cards and accounts: the name you give them, the network or bank, a colour, a balance you type, a due day, and at most the last four digits.',
        ],
      },
      {
        kind: 'note',
        text: 'Skip never asks for and never stores a full card number, an expiry date, a security code, or any banking login. Skip does not connect to your bank and cannot move money.',
      },
    ],
  },
  {
    heading: 'What never leaves your phone',
    blocks: [
      {
        kind: 'bullets',
        items: [
          'Scanning a receipt. The text is read on your device by Apple’s own on-device recognition. The photo is not uploaded, and Skip saves only the fields you confirm — the shop, the amount, the date.',
          'Your appearance, haptics and app lock settings, which are stored on the device itself.',
        ],
      },
    ],
  },
  {
    heading: 'Adding things by voice',
    blocks: [
      {
        kind: 'text',
        text: 'Tap the microphone and say something like “Netflix $15.99 every month” to add a receipt, bill or subscription without typing. Here is exactly what happens to what you say.',
      },
      {
        kind: 'bullets',
        items: [
          'Your words are turned into text by Apple’s speech recognition, built into your iPhone. Skip does not use any third-party speech or transcription service, and has no speech server of its own.',
          'When your iPhone can run speech recognition on the device, your voice never leaves it. When it can’t, Apple’s speech recognition service processes the audio instead, under Apple’s own privacy terms rather than this one.',
          'Skip never records or keeps the audio itself, on your phone or on our servers. Only the text you review and confirm becomes a receipt, bill or subscription — stored exactly like one you type in by hand.',
          'If you correct what Skip heard (for example, turning “spot a fly” into Spotify), Skip remembers that correction on your phone only, so it recognises it next time. These corrections are never uploaded.',
        ],
      },
      {
        kind: 'note',
        text: 'Skip asks for microphone and speech recognition access the first time you use voice input. You can turn either off at any time in iOS Settings → Skip Budget — typing still works exactly as before.',
      },
    ],
  },
  {
    heading: 'Who else sees it',
    blocks: [
      {
        kind: 'text',
        text: 'Skip uses a small number of services to run. They process data on our behalf and are not permitted to use it for their own purposes.',
      },
      {
        kind: 'bullets',
        items: [
          'Supabase — hosts the database your data lives in, and handles sign-in.',
          'Apple and Google — only if you choose to sign in with them, and only to confirm it is you.',
          'Sentry — receives crash and error reports so faults can be fixed. These describe what the app was doing, not what your budget contains.',
          'Apple Push Notification service — delivers reminders, if you turn them on.',
          'Apple’s speech recognition — if your iPhone can’t run speech recognition on the device, what you say when you use voice input is sent to Apple’s speech service to turn it into text, under Apple’s own privacy terms. Skip never receives the audio itself, only the text it returns.',
        ],
      },
      {
        kind: 'text',
        text: 'Skip does not sell your data, does not share it for advertising, and carries no advertising or third-party analytics beyond the crash reporting described above.',
      },
    ],
  },
  {
    heading: 'How long it is kept',
    blocks: [
      {
        kind: 'bullets',
        items: [
          'Things that happened — recorded charges, receipts and card payments — are kept for seven years and then deleted automatically, a day at a time as each one passes the boundary.',
          'Things that are still running — bills, subscriptions, credit cards, accounts and salary sources — are kept until you delete them, because a standing order set up years ago is still a standing order.',
        ],
      },
    ],
  },
  {
    heading: 'Deleting your account',
    blocks: [
      {
        kind: 'text',
        text: 'Settings → Delete account removes your account and everything listed above. Skip shows you a count of exactly what will go before it does anything, and asks twice.',
      },
      {
        kind: 'note',
        text: 'Deletion is immediate and permanent. There is no grace period and no backup copy kept for you to restore from.',
      },
    ],
  },
  {
    heading: 'Your rights over your data',
    blocks: [
      {
        kind: 'text',
        text: 'You can see everything Skip holds about you inside the app, correct any of it by editing it, and delete all of it from Settings. Depending on where you live you may also have a right to a copy of your data in a portable form, or to object to some processing. Write to admin@skipapps.net and we will action it.',
      },
    ],
  },
  {
    heading: 'Children',
    blocks: [
      {
        kind: 'text',
        text: 'Skip is not intended for children, and we do not knowingly collect data from anyone under the age required to consent where they live. If you believe a child has created an account, write to us and we will remove it.',
      },
    ],
  },
  {
    heading: 'Changes to this policy',
    blocks: [
      {
        kind: 'text',
        text: 'If this policy changes in a way that affects what is collected or who it is shared with, the date at the top changes and you will be told in the app before the change takes effect.',
      },
    ],
  },
];

export default function PrivacyScreen() {
  return (
    <LegalDocument
      title="Privacy policy"
      updated="28 August 2026"
      summary="Skip is a budgeting app, so almost everything in it is something you typed. This explains what is stored, what stays on your phone, who else is involved, and how to get rid of all of it."
      sections={SECTIONS}
    />
  );
}
