// src/app/splits.tsx — the Split manager list, plus the friend-request popup
// that src/components/splits/friend-request-popup.tsx draws over any route.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, divider } = C;

export const section = 'Splits';
export const order = 50;

/**
 * src/data/group-icons.ts GROUP_TINTS — the mid-tone wells a group glyph sits
 * in. Copied verbatim; groupTint() picks one from a hash of the group's id.
 */
const TINTS = [
  { bg: 'rgba(244,121,90,0.16)', fg: '#E2643F' },
  { bg: 'rgba(79,168,232,0.16)', fg: '#3E8FCC' },
  { bg: 'rgba(139,123,245,0.16)', fg: '#7B6AE0' },
  { bg: 'rgba(156,194,46,0.18)', fg: '#7C9C1F' },
  { bg: 'rgba(62,140,116,0.16)', fg: '#37836B' },
  { bg: 'rgba(232,145,59,0.16)', fg: '#CE7A26' },
  { bg: 'rgba(232,106,155,0.16)', fg: '#D65A8B' },
  { bg: 'rgba(201,162,78,0.18)', fg: '#A9843A' },
];

/**
 * src/components/splits/group-icon.tsx — the glyph in its tinted well
 * (well = round(size × 1.85), 14px corners).
 *
 * Composed rather than C.GroupIcon: the kit's renderer gives an `icon()` the
 * full width of the box it sits in, so `align: 'center'` leaves it hugging the
 * left edge and a 26pt glyph lands 22pt off-centre in a 48pt well. Passing
 * `hug: true` — the documented way to make a child take its own width — puts it
 * where the app draws it. Same fix would suit the kit's IconWell/BillMark.
 */
const GroupIcon = (glyph, { size = 26, tint = 0, ...p } = {}) => {
  const well = Math.round(size * 1.85);
  return box({ w: well, h: well, radius: 14, fill: TINTS[tint].bg, justify: 'center', align: 'center', name: 'GroupIcon', ...p }, [
    icon(glyph, { size, color: TINTS[tint].fg, hug: true }),
  ]);
};

/** The screen heading row: Title flush/left beside the "New group" pill. */
const Heading = () =>
  hstack({ mt: 8, gap: 12, align: 'center', justify: 'between', name: 'Heading' }, [
    C.Title('Split manager', { align: 'left', flush: true, flex: 1, nowrap: true }),
    C.ActionPill('New group'),
  ]);

/**
 * The Friends row. Composed here: it is a one-off Pressable in splits.tsx, not
 * a component — border-line, rounded-[16px], px-4 py-3.5, a 40pt ink/5 well,
 * and either the waiting-count badge or a chevron.
 */
const FriendsRow = ({ friends = 3, waiting = 0 } = {}) =>
  hstack({ mt: 24, gap: 12, align: 'center', radius: 16, stroke: 'line', pad: [14, 16], name: 'FriendsRow' }, [
    box({ w: 40, h: 40, radius: 'full', fill: 'ink/5', justify: 'center', align: 'center' }, [icon('Users', { size: 20, color: 'body', hug: true })]),
    vstack({ flex: 1 }, [
      text('Friends', C.TYPE.rowTitle, { nowrap: true }),
      text(friends === 0 ? 'Share your code to start splitting with people' : `${friends} on Skip`, C.TYPE.rowSub, { mt: 2 }),
    ]),
    waiting > 0
      ? box({ hug: true, h: 24, minW: 24, radius: 'full', fill: 'accent', pad: [0, 6], justify: 'center', align: 'center' }, [
          text(String(waiting), { size: 12, weight: 500, lineHeight: 17, color: 'onControl' }, { nowrap: true, hug: true }),
        ])
      : icon('ChevronRight', { size: 20, color: 'muted', stroke: 2 }),
  ]);

/**
 * GroupCard, from splits.tsx: p-4 card, gap-4, the glyph well, name at 17/24
 * semibold, then the direction in words with the figure beside it — accent-ink
 * when you are owed, ink when you owe, and a chevron when it is settled.
 */
const GroupCard = (name, iconName, tint, balance) => {
  const settled = Math.abs(balance) < 0.005;
  const owed = balance > 0;
  return hstack({ radius: 16, stroke: 'line', fill: 'card', pad: 16, gap: 16, align: 'center', name: `GroupCard/${name}` }, [
    GroupIcon(iconName, { tint }),
    vstack({ flex: 1 }, [
      text(name, { size: 17, weight: 600, lineHeight: 24, color: 'ink' }, { nowrap: true }),
      text(settled ? 'All settled up' : owed ? 'you are owed' : 'you owe', C.TYPE.caption, { mt: 4, nowrap: true }),
    ]),
    settled
      ? icon('ChevronRight', { size: 20, color: 'muted', stroke: 2 })
      : text(C.fmt(Math.abs(balance)), { size: 20, weight: 600, lineHeight: 28, color: owed ? 'accentInk' : 'ink' }, { nowrap: true }),
  ]);
};

const GROUPS = [
  GroupCard('Lake house', 'Users', 1, 12.1),
  GroupCard('Barcelona', 'Plane', 5, -64.3),
  GroupCard('Flat 3', 'House', 4, 0),
];

/**
 * The friend-request popup, composed from primitives: the kit has no modal
 * card of this shape. Measurements from friend-request-popup.tsx — max-w-340,
 * rounded-[10px], px-5 pb-4 pt-6, a 64pt avatar, then Decline/Accept side by
 * side and a quiet "Not now" underneath.
 */
const FriendRequestPopup = (name) =>
  vstack({ w: 326, radius: 10, fill: 'card', shadow: 'floating', clip: true, pad: { t: 24, b: 16, x: 20 }, align: 'center', name: 'FriendRequestPopup' }, [
    C.ProfileAvatar({ size: 64, avatar: true, label: name.slice(0, 1) }),
    text(name, { size: 18, weight: 600, lineHeight: 24, color: 'ink', align: 'center' }, { mt: 16, maxLines: 2 }),
    text('wants to split bills with you on Skip.', { size: 14, weight: 400, lineHeight: 20, color: 'body', align: 'center' }, { mt: 6 }),
    hstack({ mt: 20, gap: 8 }, [
      box({ flex: 1, minH: 48, radius: 10, stroke: 'line', justify: 'center', align: 'center' }, [
        text('Decline', { size: 15, weight: 500, lineHeight: 22, color: 'ink', align: 'center' }, { nowrap: true, hug: true }),
      ]),
      box({ flex: 1, minH: 48, radius: 10, fill: 'control', justify: 'center', align: 'center' }, [
        text('Accept', { size: 15, weight: 500, lineHeight: 22, color: 'onControl', align: 'center' }, { nowrap: true, hug: true }),
      ]),
    ]),
    box({ mt: 4, minH: 44, radius: 10, justify: 'center', align: 'center' }, [
      text('Not now', { size: 13, weight: 400, lineHeight: 18, color: 'muted', align: 'center' }, { nowrap: true, hug: true }),
    ]),
  ]);

export default [
  screen({
    id: 'splits',
    name: 'Splits',
    back: true,
    children: [
      Heading(),
      FriendsRow({ friends: 3 }),
      vstack({ mt: 36 }, [C.SectionHeading('Groups'), vstack({ mt: 16, gap: 12 }, GROUPS)]),
    ],
  }),

  screen({
    id: 'splits-empty',
    name: 'Splits / no groups',
    back: true,
    children: [
      Heading(),
      FriendsRow({ friends: 0 }),
      C.PageState(
        'tile-split-calculator',
        'No groups yet',
        'A group is for the flat, the trip, the thing that keeps going. Everyone in it sees the same running total.',
        { action: 'Create a group' },
      ),
    ],
  }),

  screen({
    id: 'splits-loading',
    name: 'Splits / loading',
    back: true,
    children: [Heading(), FriendsRow({ friends: 0 }), vstack({}, [C.SkeletonRow(), C.SkeletonRow(), C.SkeletonRow()])],
  }),

  screen({
    id: 'splits-error',
    name: 'Splits / could not load',
    back: true,
    children: [
      Heading(),
      FriendsRow({ friends: 3 }),
      C.PageState('state-error', 'Could not load your groups', 'Check your connection and try again. Nothing has been lost.', { action: 'Try again' }),
    ],
  }),

  screen({
    id: 'splits-friend-request',
    name: 'Splits / friend request',
    back: true,
    overlay: FriendRequestPopup('Maya Okafor'),
    children: [
      Heading(),
      FriendsRow({ friends: 3, waiting: 1 }),
      vstack({ mt: 36 }, [C.SectionHeading('Groups'), vstack({ mt: 16, gap: 12 }, GROUPS)]),
    ],
  }),
];
