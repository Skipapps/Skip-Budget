// src/app/add-member.tsx — adding somebody to a group, whether or not they use
// Skip. Sam's group is Lake house; Priya is already in it, so only Diego and
// Maya are left to offer.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, divider, flexSpacer } = C;

export const section = 'Splits';
export const order = 53;

const CODE = '7QK4M2';

/**
 * The name field on this screen passes `label=""`. An empty Text takes no
 * height in RN but keeps its `mb-2`, so the box sits 8pt under the heading —
 * the kit's TextField would draw a full empty label row instead. Everything
 * else is text-field.tsx: rounded-[12px], border-line, min-h-14, px-5.
 */
const BareTextField = (placeholder) =>
  hstack({ mt: 8, minH: 56, radius: 12, stroke: 'line', pad: [0, 20], align: 'center', name: 'TextField/unlabelled' }, [
    text(placeholder, { size: 16, weight: 400, lineHeight: 24, color: 'muted' }, { flex: 1, nowrap: true }),
  ]);

/** A friend who can be added: the shared Person row and a 36pt tick target. */
const FriendRow = (name) =>
  hstack({ gap: 12, align: 'center', justify: 'between', pad: [14, 0], name: `FriendRow/${name}` }, [
    C.Person(name, { avatar: true }),
    box({ w: 36, h: 36, radius: 'full', fill: 'ink/5', justify: 'center', align: 'center' }, [icon('Check', { size: 16, color: 'muted', stroke: 2.2, hug: true })]),
  ]);

const Invite = () =>
  vstack({ mt: 32, name: 'Invite' }, [
    C.FieldLabel('Invite a friend', { mb: 12 }),
    C.Button('Share the group link', { leading: icon('Share2', { size: 17, color: 'onControl', stroke: 1.9 }) }),
    text(`Anyone with the code joins this group directly, whether or not they already have Skip. Your code is ${CODE}.`, { size: 12, weight: 400, lineHeight: 18, color: 'muted' }, { mt: 10 }),
    hstack({ mt: 12 }, [C.ActionPill('Add a friend by code', { iconName: 'UserPlus' })]),
  ]);

const ByName = () =>
  vstack({ mt: 36, name: 'ByName' }, [
    C.FieldLabel('Somebody not on Skip', { mb: 8 }),
    BareTextField('Their name'),
    C.Button('Add by name', { variant: 'outline', mt: 12 }),
  ]);

const Done = () => vstack({ pad: { t: 40, b: 32 } }, [C.Button('Done')]);

const Head = () => [
  C.Title('Add to Lake house'),
  C.Subtitle('Friends join properly and see the group on their own phone. Anyone else can be a name for now and claim it later.', { mt: 12 }),
];

export default [
  screen({
    id: 'add-member',
    name: 'Add member',
    back: true,
    children: [
      ...Head(),
      Invite(),
      vstack({ mt: 36, name: 'Friends' }, [
        C.FieldLabel('Your friends', { mb: 8 }),
        divider({ color: 'line' }),
        FriendRow('Diego Marín'),
        FriendRow('Maya Okafor'),
      ]),
      ByName(),
      flexSpacer(),
      Done(),
    ],
  }),

  screen({
    id: 'add-member-no-friends',
    name: 'Add member / nobody on Skip yet',
    back: true,
    children: [
      ...Head(),
      Invite(),
      vstack({ mt: 36, name: 'Friends' }, [
        C.FieldLabel('No friends left to add', { mb: 8 }),
        divider({ color: 'line' }),
        text('You have not added anyone on Skip yet. Share your code from the Friends screen, or add a name below.', { size: 14, weight: 400, lineHeight: 20, color: 'muted' }, { pad: [20, 0] }),
      ]),
      ByName(),
      flexSpacer(),
      Done(),
    ],
  }),

  screen({
    id: 'add-member-all-in',
    name: 'Add member / everyone already in',
    back: true,
    children: [
      ...Head(),
      Invite(),
      vstack({ mt: 36, name: 'Friends' }, [
        C.FieldLabel('No friends left to add', { mb: 8 }),
        divider({ color: 'line' }),
        text('Everyone you know on Skip is already in this group.', { size: 14, weight: 400, lineHeight: 20, color: 'muted' }, { pad: [20, 0] }),
      ]),
      ByName(),
      flexSpacer(),
      Done(),
    ],
  }),

  screen({
    id: 'add-member-error',
    name: 'Add member / could not add',
    back: true,
    children: [
      ...Head(),
      Invite(),
      vstack({ mt: 36, name: 'Friends' }, [
        C.FieldLabel('Your friends', { mb: 8 }),
        divider({ color: 'line' }),
        FriendRow('Diego Marín'),
        FriendRow('Maya Okafor'),
      ]),
      ByName(),
      text('Could not add them to the group.', { size: 13, weight: 400, lineHeight: 18, color: 'danger' }, { mt: 20 }),
      flexSpacer(),
      Done(),
    ],
  }),
];
