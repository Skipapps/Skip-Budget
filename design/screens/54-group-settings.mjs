// src/app/group-settings.tsx — the parts of a group that are not money.
// Owner and member both draw: only the owner gets the icon picker, the live
// switch, the remove targets and "Close this group".
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, divider, wrap, flexSpacer } = C;

export const section = 'Splits';
export const order = 54;

const CODE = '7QK4M2';

// src/data/group-icons.ts GROUP_ICON_CHOICES, paired with the nearest lucide
// glyph the kit ships (the app draws its own SVGs from @/assets/bill-icons).
const GROUP_ICON_CHOICES = [
  ['housing', 'House'], ['travel', 'Plane'], ['coffee', 'Coffee'], ['shopping', 'ShoppingBag'],
  ['transport', 'Bus'], ['family', 'Baby'], ['pets', 'PawPrint'], ['energy', 'Zap'],
  ['water', 'Droplets'], ['internet', 'Wifi'], ['mobile', 'Smartphone'], ['tv', 'Tv'],
  ['music', 'Music'], ['software', 'Monitor'], ['health', 'HeartPulse'], ['education', 'GraduationCap'],
  ['insurance', 'Shield'], ['loans', 'Landmark'], ['waste', 'Trash2'], ['other', 'Tag'],
];

/** src/components/splits/group-icon-picker.tsx — 48pt tiles, gap-2.5. */
const GroupIconPicker = (value, p = {}) =>
  wrap({ gap: 10, name: 'GroupIconPicker', ...p }, GROUP_ICON_CHOICES.map(([id, glyph]) => {
    const selected = id === value;
    return box(
      { w: 48, h: 48, radius: 12, justify: 'center', align: 'center', fill: selected ? 'control' : 'card', stroke: selected ? 'control' : 'line', name: `GroupIcon/${id}` },
      [icon(glyph, { size: 21, color: selected ? 'onControl' : 'body', hug: true })],
    );
  }));

/** The simplify card: bordered here, unlike the filled one in the add flow. */
const SimplifyCard = () =>
  hstack({ mt: 28, gap: 16, align: 'center', radius: 16, stroke: 'line', pad: [16, 16], name: 'Simplify' }, [
    vstack({ flex: 1 }, [
      text('Simplify who pays whom', C.TYPE.rowTitle),
      text('Fewer payments, but it can pair you with somebody you never ate with.', { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 4 }),
    ]),
    C.Switch(true),
  ]);

/**
 * One member: the shared Person row, with the balance said the way
 * group-settings.tsx words it — "owed $12.10" / "owes $12.10" / "settled up".
 */
const MemberRow = (name, balance, { removable = false } = {}) => {
  const square = Math.abs(balance) < 0.005;
  return hstack({ gap: 12, align: 'center', pad: [14, 0], name: `MemberRow/${name}` }, [
    C.Person(name, { avatar: true, subtitle: square ? 'settled up' : `${balance > 0 ? 'owed' : 'owes'} ${C.fmt(Math.abs(balance))}` }),
    removable ? box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, [icon('UserMinus', { size: 18, color: 'muted', stroke: 1.9, hug: true })]) : null,
  ]);
};

const Members = ({ owner = true } = {}) =>
  vstack({ mt: 36, name: 'Members' }, [
    C.FieldLabel('Members', { mb: 12 }),
    C.Button('Add someone', { variant: 'outline', leading: icon('UserPlus', { size: 17, color: 'ink', stroke: 1.9 }) }),
    divider({ color: 'line', mt: 20 }),
    MemberRow('Sam (you)', 12.1),
    MemberRow('Priya Raman', -12.1, { removable: owner }),
    hstack({ mt: 12 }, [C.ActionPill(`Share code ${CODE}`, { iconName: 'Share2' })]),
  ]);

const NameField = () => vstack({ mt: 32 }, [C.TextField('Name', { value: 'Lake house' })]);

const Footer = ({ owner = true } = {}) =>
  vstack({ gap: 12, pad: { t: 40, b: 40 }, name: 'Danger' }, [
    C.Button('Leave group', { variant: 'outline', leading: icon('LogOut', { size: 17, color: 'ink', stroke: 1.9 }) }),
    owner ? C.Button('Close this group', { variant: 'outline' }) : null,
  ]);

const ownerBody = () => [
  C.Title('Group settings'),
  NameField(),
  vstack({ mt: 28 }, [C.FieldLabel('Icon', { mb: 12 }), GroupIconPicker('housing')]),
  SimplifyCard(),
  Members({ owner: true }),
  flexSpacer(),
  Footer({ owner: true }),
];

export default [
  screen({ id: 'group-settings', name: 'Group settings', back: true, children: ownerBody() }),

  screen({
    id: 'group-settings-member',
    name: 'Group settings / not the owner',
    back: true,
    children: [
      C.Title('Group settings'),
      NameField(),
      SimplifyCard(),
      text('Only the group owner can change the name or how it settles.', { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 12 }),
      Members({ owner: false }),
      flexSpacer(),
      Footer({ owner: false }),
    ],
  }),

  screen({
    id: 'group-settings-leave',
    name: 'Group settings / leave',
    back: true,
    overlay: C.ConfirmDialog('Leave Lake house?', 'You will stop seeing it. What you already paid stays in everyone else’s history.', {
      actions: [{ label: 'Leave', destructive: true }],
    }),
    children: ownerBody(),
  }),

  screen({
    id: 'group-settings-close',
    name: 'Group settings / close the group',
    back: true,
    overlay: C.ConfirmDialog('Close Lake house?', 'It comes off everyone’s list. Nothing is deleted — the expenses stay exactly as they are.', {
      actions: [{ label: 'Close group', destructive: true }],
    }),
    children: ownerBody(),
  }),

  screen({
    id: 'group-settings-remove',
    name: 'Group settings / remove a member',
    back: true,
    overlay: C.ConfirmDialog('Remove Priya Raman?', 'Their share of past expenses stays in the history.', {
      actions: [{ label: 'Remove', destructive: true }],
    }),
    children: ownerBody(),
  }),

  screen({
    id: 'group-settings-loading',
    name: 'Group settings / loading',
    back: true,
    children: [
      C.Title('Group settings'),
      vstack({ mt: 32, gap: 24, name: 'Loading' }, [
        box({ h: 56, radius: 12, fill: 'line', opacity: 0.7 }),
        box({ h: 80, radius: 16, fill: 'line', opacity: 0.7 }),
        box({ h: 48, radius: 'full', fill: 'line', opacity: 0.7 }),
      ]),
    ],
  }),

  screen({
    id: 'group-settings-error',
    name: 'Group settings / could not open',
    back: true,
    children: [
      C.PageState('state-error', 'Could not open these settings', 'Check your connection and try again. Nothing about the group has changed.', {
        action: 'Try again',
        secondary: 'Back to splits',
      }),
    ],
  }),

  screen({
    id: 'group-settings-missing',
    name: 'Group settings / not here',
    back: true,
    children: [
      C.PageState('state-error', 'That group is not here', 'It may have been closed, or you may no longer be a member.', { action: 'Back to splits' }),
    ],
  }),
];
