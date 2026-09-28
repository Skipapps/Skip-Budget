import * as C from '../kit/components.mjs';

const { screen, vstack, hstack, box, text, icon, art, spacer } = C;

export const section = 'Settings';
export const order = 47;

/*
 * src/app/(tabs)/settings.tsx — every section and row, with Sam's real values.
 *
 * Counts come from the same records the rest of the kit uses: 2 cards
 * (Chase ••4421, Amex ••1002), 1 bank account (Chase Checking ••1180),
 * 4 recurring bills, 3 subscriptions, 1 salary source. Version is app.json's
 * 0.1.0. The Developer section exists only where __DEV__ is true, so it has a
 * frame of its own rather than sitting on the shipping one.
 */

const SaveNamePill = (label = 'Save') =>
  hstack({ hug: true, self: 'end', minH: 40, radius: 'full', fill: 'control', pad: [0, 16], align: 'center', mt: 12 }, [
    text(label, { size: 14, weight: 500, lineHeight: 20, color: 'onControl' }, { nowrap: true }),
  ]);

const profileSection = ({ name, dirty, saving }) =>
  vstack({ mt: 32, name: 'SettingsSection/Profile' }, [
    C.SectionHeading('Profile'),
    vstack({ mt: 8 }, [
      C.SettingsRow('Profile picture', {
        artwork: C.ProfileAvatar({ size: 34, avatar: true, label: 'S' }),
        subtitle: 'Bearded Male Hipster',
        last: true,
      }),
      vstack({ mt: 16 }, [
        C.TextField('Display name', {
          value: name,
          placeholder: 'Your name',
          trailing: dirty ? null : icon('Check', { size: 20, color: 'moneyIn', stroke: 2.6 }),
        }),
        dirty ? SaveNamePill(saving ? 'Saving…' : 'Save') : null,
      ]),
    ]),
  ]);

const page = ({ pro = false, dev = false, name = 'Sam', dirty = false, saving = false } = {}) => [
  C.Title('Settings'),

  C.SettingsSection('Skip Pro', [
    C.SettingsRow(pro ? 'Skip Pro — active' : 'Skip Pro', {
      iconName: 'Crown',
      subtitle: pro ? 'Everything unlocked · manage in the App Store' : 'Unlimited everything, $1.99/mo or $19.99/yr',
      last: true,
    }),
  ]),

  dev
    ? C.SettingsSection('Developer', [
        C.SettingsRow('Fake Pro', {
          iconName: 'FlaskConical',
          subtitle: pro ? 'On — Pro screens unlocked, nothing purchased' : 'Unlock Pro screens for testing, without buying',
          toggle: pro,
          last: true,
        }),
      ])
    : null,

  profileSection({ name, dirty, saving }),

  C.SettingsSection('Preferences', [
    C.SettingsRow('Appearance', { iconName: 'Palette', subtitle: 'System · Apricot' }),
    C.SettingsRow('Haptics', { iconName: 'Vibrate', subtitle: 'A tap when you press something', toggle: true }),
    C.SettingsRow('App lock', { iconName: 'ScanFace', subtitle: 'Face ID before Skip opens', toggle: false }),
    C.SettingsRow('Reminders', { iconName: 'Bell', subtitle: 'Before a renewal, a bill or payday' }),
    C.SettingsRow('Dashboard order', { iconName: 'LayoutGrid', subtitle: 'The order of “Where it goes”', last: true }),
  ]),

  C.SettingsSection('Your money', [
    C.SettingsRow('Bills', { iconName: 'ReceiptText', subtitle: '4 recurring bills' }),
    C.SettingsRow('Subscriptions', { iconName: 'Repeat', subtitle: '3 tracked' }),
    C.SettingsRow('Cards and accounts', { iconName: 'CreditCard', subtitle: '2 cards · 1 bank account' }),
    C.SettingsRow('Payday', { iconName: 'CalendarDays', subtitle: '1 salary source', last: true }),
  ]),

  C.SettingsSection('About', [
    C.SettingsRow('Privacy policy', { iconName: 'Shield', subtitle: 'What is stored, and who else can see it' }),
    C.SettingsRow('Terms of service', { iconName: 'FileText' }),
    // No onPress, so no chevron — just the number.
    C.SettingsRow('Version', { iconName: 'ScrollText', value: '0.1.0', last: true }),
  ]),

  C.SettingsSection('Support and feedback', [
    C.SettingsRow('Getting started', { iconName: 'ListChecks', subtitle: 'Put the setup steps back on Home' }),
    // The app uses lucide's CircleHelp; the kit's icon sheet has no glyph for
    // it (lucide 1.x renamed the file to circle-question-mark), so Info stands
    // in here. Flagged in my report.
    C.SettingsRow('Common questions', { iconName: 'CircleHelp', subtitle: 'Short answers, no waiting' }),
    C.SettingsRow('What Skip can do', { iconName: 'Compass', subtitle: 'The six things, each a tap away' }),
    C.SettingsRow('Email support', { iconName: 'Mail', subtitle: 'Something is wrong or unclear' }),
    C.SettingsRow('Share an idea', { iconName: 'Lightbulb', subtitle: 'What should Skip do next?' }),
    C.SettingsRow('Buy a coffee for team', {
      // Their mark, in their colours — never tinted to match the row.
      artwork: box({ w: 40, h: 40, justify: 'center', align: 'center' }, art('buy-me-a-coffee', { w: 22, h: 22 })),
      subtitle: 'Keep Skip brewing',
      last: true,
    }),
  ]),

  C.SettingsSection('Account', [
    C.SettingsRow('Sign out', { iconName: 'LogOut' }),
    C.SettingsRow('Delete account', {
      iconName: 'Trash2',
      subtitle: 'Permanent, and it cannot be undone',
      destructive: true,
      last: true,
    }),
  ]),

  spacer(96),
];

export default [
  screen({ id: 'settings', name: 'Settings', tab: 'settings', children: page() }),
  screen({ id: 'settings-pro', name: 'Settings / with Skip Pro', tab: 'settings', children: page({ pro: true }) }),
  screen({ id: 'settings-dev', name: 'Settings / development build', tab: 'settings', children: page({ pro: true, dev: true }) }),
  screen({
    id: 'settings-name-dirty',
    name: 'Settings / name not saved yet',
    tab: 'settings',
    children: page({ name: 'Sam C.', dirty: true }),
  }),
  screen({
    id: 'settings-delete-account',
    name: 'Settings / delete account, first ask',
    tab: 'settings',
    children: page(),
    overlay: C.ConfirmDialog(
      'Delete your account?',
      'This removes 2 cards, 1 bank account, 4 bills, 3 subscriptions, 12 receipts, 6 recorded charges, 1 salary source — everything Skip holds for you. It cannot be undone.',
      { actions: [{ label: 'Continue', destructive: true }], cancel: 'Keep my account' },
    ),
  }),
  screen({
    id: 'settings-delete-final',
    name: 'Settings / delete account, point of no return',
    tab: 'settings',
    children: page(),
    overlay: C.ConfirmDialog(
      'Delete everything, for good?',
      'There is no way back from here, and no copy kept.',
      { actions: [{ label: 'Delete everything', destructive: true }], cancel: 'Keep my account' },
    ),
  }),
];
