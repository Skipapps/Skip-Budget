import * as C from '../kit/components.mjs';
const { screen, vstack, box, text, wrap, flexSpacer } = C;

export const section = 'Onboarding & auth';
export const order = 11;

/**
 * src/app/hello.tsx — the one question after signup, plus its loading and
 * error states. The redirect a returning account gets (`<Redirect href="/home" />`)
 * draws nothing, so it has no frame.
 */

// The screen's Subtitle is left-aligned (`className="mt-3 w-full text-left"`);
// the kit's Subtitle is centred, so the style is restated here.
const SubtitleLeft = (str, p = {}) => text(str, { ...C.TYPE.subtitle, align: 'left' }, p);

// AVATARS.slice(0, 8) from src/theme/avatars.ts, as initials on the kit's
// bundled-image placeholder (the real faces are PNGs).
const FIRST_EIGHT = [
  ['afro-hair-sunglasses', 'AH'],
  ['athlete-character-headband', 'AC'],
  ['basketball-player-sport', 'BP'],
  ['bearded-male-hipster', 'BM'],
  ['blonde-hair-sunglasses', 'BH'],
  ['doctor-medical', 'DM'],
  ['edgy-male-youth', 'EM'],
  ['elegant-female-performer', 'EF'],
];

// The Pressable is a 2pt ring around a 64pt avatar: accent when selected,
// transparent when not, so the grid does not move on selection.
const avatarCell = (label, selected) =>
  box(
    {
      w: 68,
      h: 68,
      radius: 'full',
      stroke: selected ? 'accent' : undefined,
      strokeWidth: 2,
      justify: 'center',
      align: 'center',
      name: `Avatar/${selected ? 'selected' : 'default'}`,
    },
    C.ProfileAvatar({ size: 64, avatar: true, label }),
  );

const avatarGrid = (chosen) =>
  wrap(
    { gap: 12, mt: 0, name: 'AvatarGrid' },
    FIRST_EIGHT.map(([id, initials]) => avatarCell(initials, id === chosen)),
  );

const form = ({ id, name, value, chosen }) =>
  screen({
    id,
    name,
    children: [
      C.Title('What should friends call you?', { align: 'left' }),
      SubtitleLeft(
        'Your name and picture are what people see when you split a bill with them. Nothing is uploaded — the pictures ship with the app.',
        { mt: 12 },
      ),

      C.TextField('Your name', {
        value,
        placeholder: 'How friends know you',
        focused: Boolean(value),
        mt: 32,
      }),

      C.FieldLabel('Pick a picture', { mt: 28, mb: 12 }),
      avatarGrid(chosen),
      C.Small('More pictures live in Settings, along with everything else about your profile.', {
        mt: 12,
      }),

      // <View className="mt-auto w-full gap-3 pb-8 pt-10">
      flexSpacer(),
      vstack({ gap: 12, pad: { t: 40, b: 32 }, name: 'Actions' }, [
        C.Button('Continue'),
        C.TextLink('Skip for now', { variant: 'subtle' }),
      ]),
    ],
  });

export default [
  form({ id: 'hello', name: 'Hello' }),
  form({
    id: 'hello-filled',
    name: 'Hello — name and picture chosen',
    value: 'Sam',
    chosen: 'bearded-male-hipster',
  }),

  // profile.isLoading — three Skeletons, no question asked yet.
  screen({
    id: 'hello-loading',
    name: 'Hello — loading',
    children: [
      vstack({ mt: 40, gap: 16, name: 'Loading' }, [
        box({ h: 32, w: 256, radius: 12, fill: 'line', opacity: 0.7 }),
        box({ h: 20, radius: 6, fill: 'line', opacity: 0.7 }),
        box({ h: 56, radius: 12, fill: 'line', opacity: 0.7, mt: 16 }),
      ]),
    ],
  }),

  // profile.isError — a failed read is not an empty profile.
  screen({
    id: 'hello-error',
    name: 'Hello — could not load profile',
    children: [
      C.PageState(
        'state-error',
        'Could not load your profile',
        'Check your connection and try again. Your account is safe.',
        { action: 'Try again' },
      ),
    ],
  }),
];
