import * as C from '../kit/components.mjs';
const { screen, vstack, box, text, wrap, icon } = C;

export const section = 'Onboarding & auth';
export const order = 19;

/**
 * src/app/avatar.tsx — the whole picture grid, 34 bundled faces plus "No
 * picture", three to a row. One tap chooses and saves, so there is no button
 * and no other state than which cell is selected.
 *
 * The faces are PNGs that a vector kit cannot embed, so each is the kit's
 * bundled-image placeholder carrying the avatar's initials.
 */
const AVATARS = [
  ['afro-hair-sunglasses', 'Afro Hair Sunglasses'],
  ['athlete-character-headband', 'Athlete Character Headband'],
  ['basketball-player-sport', 'Basketball Player Sport'],
  ['bearded-male-hipster', 'Bearded Male Hipster'],
  ['blonde-hair-sunglasses', 'Blonde Hair Sunglasses'],
  ['doctor-medical', 'Doctor Medical'],
  ['edgy-male-youth', 'Edgy Male Youth'],
  ['elegant-female-performer', 'Elegant Female Performer'],
  ['emo-style-hair', 'Emo Style Hair'],
  ['female-call-center-agent', 'Female Call Center Agent'],
  ['female-medical-professional', 'Female Medical Professional'],
  ['female-police-officer', 'Female Police Officer'],
  ['firefighter-service-professional', 'Firefighter Service Professional'],
  ['geeky-male-student', 'Geeky Male Student'],
  ['geeky-professional-office', 'Geeky Professional Office'],
  ['gentleman-bowler-hat', 'Gentleman Bowler Hat'],
  ['gentleman-dapper-bow-tie', 'Gentleman Dapper Bow Tie'],
  ['hipster-man', 'Hipster Man'],
  ['male-call-center-agent', 'Male Call Center Agent'],
  ['male-doctor-professional', 'Male Doctor Professional'],
  ['nautical-sailor-professional', 'Nautical Sailor Professional'],
  ['professional-airline-pilot', 'Professional Airline Pilot'],
  ['professional-chef-cook', 'Professional Chef Cook'],
  ['racing-driver-professional', 'Racing Driver Professional'],
  ['rasta-hat-character', 'Rasta Hat Character'],
  ['religious-christian-priest', 'Religious Christian Priest'],
  ['scuba-diver-adventure', 'Scuba Diver Adventure'],
  ['star-hat-character', 'Star Hat Character'],
  ['stealth-ninja-character', 'Stealth Ninja Character'],
  ['tall-red-hat', 'Tall Red Hat'],
  ['tired-office-worker', 'Tired Office Worker'],
  ['tourist-photographer-hobby', 'Tourist Photographer Hobby'],
  ['traditional-cultural-man', 'Traditional Cultural Man'],
  ['traditional-indian-male', 'Traditional Indian Male'],
];

const initials = (label) =>
  label
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('');

// <View className="w-1/3 items-center pb-5"> with the 76pt ring, the tick slot
// under it (mt-1.5, h-4) and a two-line 11px label.
const cell = (label, selected, content) =>
  vstack({ w: 114, align: 'center', pad: { b: 20 }, name: `Cell/${label}` }, [
    box(
      {
        w: 76,
        h: 76,
        radius: 'full',
        strokeWidth: 2,
        stroke: selected ? 'control' : 'line',
        fill: selected ? 'accent/10' : 'ink/5',
        justify: 'center',
        align: 'center',
      },
      content,
    ),
    box({ h: 16, mt: 6, justify: 'center', align: 'center' }, selected ? icon('Check', { size: 15, color: 'accentInk', stroke: 3, hug: true }) : undefined),
    text(label, { size: 11, weight: 400, lineHeight: 14, color: 'muted', align: 'center' }, { mt: 2, maxLines: 2, pad: { x: 4 } }),
  ]);

const grid = (chosen) =>
  wrap({ mt: 28, gap: 0, name: 'AvatarGrid' }, [
    cell('No picture', chosen === null, icon('UserRound', { size: 30, color: 'muted', stroke: 1.6, hug: true })),
    ...AVATARS.map(([id, label]) =>
      cell(label, chosen === id, C.ProfileAvatar({ size: 68, avatar: true, label: initials(label) })),
    ),
  ]);

const avatar = ({ id, name, chosen }) =>
  screen({
    id,
    name,
    back: true,
    children: [
      C.Title('Profile picture', { align: 'left' }),
      text(
        'Pick one and it appears on your dashboard. Nothing is uploaded — these ship with the app.',
        { ...C.TYPE.subtitle, align: 'left' },
        { mt: 8 },
      ),
      grid(chosen),
      // <View className="h-16 w-full" />
      box({ h: 64 }),
    ],
  });

export default [
  avatar({ id: 'avatar', name: 'Profile picture — no picture set', chosen: null }),
  avatar({ id: 'avatar-chosen', name: 'Profile picture — chosen', chosen: 'bearded-male-hipster' }),
];
