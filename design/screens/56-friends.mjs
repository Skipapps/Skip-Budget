// src/app/friends.tsx — making friends inside Skip by code, never by search.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, divider } = C;

export const section = 'Splits';
export const order = 56;

const Head = () => [
  C.Title('Friends'),
  C.Subtitle('Share your code with someone and they can add you. Nobody can find you without it.', { mt: 12 }),
];

/** The code is the product here, so it is set like one: 34px, 6pt tracking. */
const CodeCard = (code) =>
  vstack({ mt: 28, radius: 16, stroke: 'line', fill: 'card', pad: { t: 24, b: 24, x: 20 }, align: 'center', name: 'CodeCard' }, [
    text('Your code', C.TYPE.caption, { nowrap: true, hug: true }),
    text(code, { size: 34, weight: 700, lineHeight: 44, color: 'ink', letterSpacing: 6, align: 'center' }, { mt: 8, nowrap: true, hug: true }),
    C.Button('Share my code', { variant: 'outline', mt: 20, leading: icon('Share2', { size: 17, color: 'ink', stroke: 1.9 }) }),
  ]);

/** Shown while the profile has no display name — a request from "Someone on
 *  Skip" is one nobody can place. */
const NameNudge = () =>
  vstack({ mt: 16, radius: 16, stroke: 'line', pad: [14, 16], name: 'NameNudge' }, [
    text('Add your name first', { size: 14, weight: 500, lineHeight: 20, color: 'ink' }),
    text('Without one you show up as “Someone on Skip”, and a request from that is hard to place. Set it in Settings, along with a picture.', { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 4 }),
  ]);

const AddByCode = ({ value = '' } = {}) =>
  vstack({ mt: 28, name: 'AddByCode' }, [
    C.TextField('Add someone by code', { value, placeholder: '7QK4M2' }),
    C.Button('Send request', { mt: 12 }),
  ]);

const round = (glyph, { fill = 'ink/5', color = 'muted', stroke = 2.2 } = {}) =>
  box({ w: 44, h: 44, radius: 'full', fill, justify: 'center', align: 'center' }, [icon(glyph, { size: 18, color, stroke, hug: true })]);

const RequestRow = (name) =>
  hstack({ gap: 12, align: 'center', pad: [14, 0], name: `Request/${name}` }, [
    C.Person(name, { avatar: true }),
    round('X'),
    round('Check', { fill: 'accent', color: 'onControl', stroke: 2.4 }),
  ]);

const AskedRow = (name) =>
  hstack({ align: 'center', pad: [14, 0], name: `Asked/${name}` }, [C.Person(name, { avatar: true, subtitle: 'Waiting for them' })]);

const FriendRow = (name) =>
  hstack({ gap: 12, align: 'center', pad: [14, 0], name: `Friend/${name}` }, [
    C.Person(name, { avatar: true }),
    box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, [icon('UserMinus', { size: 18, color: 'muted', stroke: 1.9, hug: true })]),
  ]);

const Section = (label, rows, p = {}) =>
  vstack({ mt: 36, name: `Section/${label}`, ...p }, [C.FieldLabel(label, { mb: 8 }), divider({ color: 'line' }), ...rows]);

const FRIENDS = [FriendRow('Priya Raman'), FriendRow('Diego Marín'), FriendRow('Maya Okafor')];

export default [
  screen({
    id: 'friends',
    name: 'Friends',
    back: true,
    children: [...Head(), CodeCard('M4TK9B'), AddByCode(), Section('3 friends', FRIENDS, { pad: { b: 40 } })],
  }),

  screen({
    id: 'friends-empty',
    name: 'Friends / nobody yet',
    back: true,
    children: [
      ...Head(),
      CodeCard('M4TK9B'),
      NameNudge(),
      AddByCode(),
      Section('No friends yet', [
        text('Send someone your code and they will show up here. You need at least one friend before you can add them to a group.', { size: 14, weight: 400, lineHeight: 20, color: 'muted' }, { pad: [20, 0] }),
      ], { pad: { b: 40 } }),
    ],
  }),

  screen({
    id: 'friends-requests',
    name: 'Friends / requests waiting',
    back: true,
    children: [
      ...Head(),
      CodeCard('M4TK9B'),
      AddByCode(),
      Section('Waiting for you', [RequestRow('Maya Okafor')]),
      Section('Asked, not answered', [AskedRow('Tomás Ruiz')]),
      Section('2 friends', [FriendRow('Priya Raman'), FriendRow('Diego Marín')], { pad: { b: 40 } }),
    ],
  }),

  screen({
    id: 'friends-added',
    name: 'Friends / request sent',
    back: true,
    children: [
      ...Head(),
      CodeCard('M4TK9B'),
      AddByCode(),
      text('Asked Maya Okafor. They will see it next time they open Skip.', { size: 13, weight: 400, lineHeight: 18, color: 'accentInk' }, { mt: 16 }),
      Section('3 friends', FRIENDS, { pad: { b: 40 } }),
    ],
  }),

  screen({
    id: 'friends-error',
    name: 'Friends / code not recognised',
    back: true,
    children: [
      ...Head(),
      CodeCard('M4TK9B'),
      AddByCode(),
      text('Enter the code your friend shared with you.', { size: 13, weight: 400, lineHeight: 18, color: 'danger' }, { mt: 16 }),
      Section('3 friends', FRIENDS, { pad: { b: 40 } }),
    ],
  }),

  screen({
    id: 'friends-loading',
    name: 'Friends / loading the list',
    back: true,
    children: [
      ...Head(),
      CodeCard('M4TK9B'),
      AddByCode(),
      // The list alone spins: friends.tsx uses an ActivityIndicator here, not a
      // skeleton. Drawn as the ring it resolves to, since an SVG cannot spin.
      Section('No friends yet', [
        vstack({ pad: [32, 0], align: 'center' }, [box({ w: 20, h: 20, radius: 'full', stroke: 'muted', strokeWidth: 2, opacity: 0.35 })]),
      ], { pad: { b: 40 } }),
    ],
  }),
];
